import OpenAI from "openai";

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
// USD/token for the spend circuit-breaker. Defaults to GPT-5.4 pricing
// ($1.25 in / $7.50 out per 1M); override via env if the model changes.
const PRICE_IN = Number(process.env.OPENAI_PRICE_IN_PER_1M ?? 1.25) / 1_000_000;
const PRICE_OUT = Number(process.env.OPENAI_PRICE_OUT_PER_1M ?? 7.5) / 1_000_000;

let _client: OpenAI | null = null;
function client() {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

export type Ingredient = {
  name_vi: string;
  name_en: string;
  confidence: number;
  amount?: "low" | "medium" | "high";
  expiring?: boolean;
};

export type Macros = { kcal: number; protein_g: number; carbs_g: number; fat_g: number };
export type Dish = {
  title_vi: string;
  title_en: string;
  cook_time_min: number;
  difficulty: "easy" | "medium" | "hard";
  uses_ingredients: string[];
  missing_ingredients: string[]; // Vietnamese — also used by the server staple ranking
  missing_ingredients_en: string[];
  why_vi: string;
  why_en: string;
  steps_vi: string[];
  steps_en: string[];
  approx_macros: Macros;
};

const VISION_SYSTEM =
  "Bạn là trợ lý nhận diện nguyên liệu cho app nấu ăn Việt Nam. Nhìn ảnh tủ lạnh/bếp và liệt kê MỌI nguyên liệu thực phẩm ăn được nhìn thấy (rau củ, thịt cá, trứng, gia vị, đồ khô). " +
  "Quy tắc: (1) chỉ liệt kê thứ thực sự nhìn thấy, không đoán thứ không có; (2) mỗi món cho name_vi (tên tiếng Việt thông dụng) và name_en; (3) confidence là độ chắc chắn 0..1; " +
  "(4) bỏ qua đồ không ăn được, bao bì, chữ/logo; gộp các món trùng lặp; (5) nếu ảnh không đọc được hoặc không có thực phẩm, trả mảng rỗng; " +
  "(6) amount là ước lượng số lượng THÔ nhìn thấy: 'low' (ít, một chút), 'medium' (vừa đủ một bữa), 'high' (nhiều, dư). TUYỆT ĐỐI không đoán số gram cụ thể — chỉ 3 mức này.";

const RECIPE_SYSTEM =
  "Bạn là công cụ gợi món ăn gia đình Việt Nam. Bạn nhận một JSON pantry (các nguyên liệu user ĐÃ xác nhận, mỗi món có thể có expiring:true) và prefs tùy chọn. " +
  "QUY TẮC: (1) chỉ gợi món Việt CÓ THẬT, phổ biến mà người Việt thực sự nấu (vd: trứng chiên cà chua, thịt kho tàu, canh chua cá, rau muống xào tỏi, đậu phụ sốt cà, thịt băm xào...). TUYỆT ĐỐI KHÔNG bịa món lạ hoặc ghép nguyên liệu kỳ quặc (KHÔNG 'salad cam đậu phụ', 'canh dừa thịt băm'...) — thà gợi ít món CHUẨN còn hơn nhiều món vô lý; (2) ưu tiên món nấu được NGAY chỉ dùng pantry + tối đa 2 gia vị cơ bản (muối, dầu ăn, nước mắm, đường, tiêu, nước) — liệt kê gia vị vào missing_ingredients. LUÔN cố gắng thêm 2-3 món 'gần nấu được' chỉ thiếu 1-2 nguyên liệu thường gặp (rau, thịt, trứng, gia vị phụ — ghi vào missing_ingredients) để user có nhiều lựa chọn; KHÔNG món nào thiếu quá 2 thứ ngoài gia vị; " +
  "(3) nếu có nguyên liệu expiring:true thì ƯU TIÊN món dùng nó và nói rõ trong 'why'; (4) trả CÀNG NHIỀU món HỢP LÝ càng tốt — 5 tới 10 món nếu pantry phong phú (nhiều nguyên liệu), ít hơn nếu pantry nghèo; chỉ KHÔNG bịa món vô lý để đủ số; xếp món nấu-ngay (không thiếu gì ngoài gia vị) lên trước, món gần-nấu-được xuống sau; trong đó ƯU TIÊN món chính có thịt/cá/trứng (món mặn) lên trên, món rau/chay xuống dưới; (5) SONG NGỮ BẮT BUỘC cho mỗi món: title_vi + title_en (tên món); why_vi + why_en (lý do gợi, 1 câu ngắn); steps_vi + steps_en (các bước nấu ngắn gọn, dịch tương ứng nhau); missing_ingredients (tiếng Việt) + missing_ingredients_en (tiếng Anh, CÙNG thứ tự) — bản tiếng Anh phải dịch sát bản tiếng Việt, không bỏ trống; (6) nếu KHÔNG có món Việt nào hợp lý thì trả mảng dishes rỗng (không bịa); " +
  "(7) prefs (nếu có): TUYỆT ĐỐI không gợi món chứa thứ trong allergies hoặc never_suggest; cố gắng hợp dietary_pref (none|keto|eat_clean|muscle_gain), spice_pref (mild|medium|hot) và cook_time_pref (5min|15min|30min_plus — ưu tiên món nấu trong khoảng thời gian đó); " +
  "(8) approx_macros: ước lượng dinh dưỡng THÔ cho MỘT phần ăn (kcal, protein_g, carbs_g, fat_g — số nguyên), không cần chính xác tuyệt đối.";

const INGREDIENTS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["ingredients"],
  properties: {
    ingredients: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name_vi", "name_en", "confidence", "amount"],
        properties: {
          name_vi: { type: "string" },
          name_en: { type: "string" },
          confidence: { type: "number" },
          amount: { type: "string", enum: ["low", "medium", "high"] },
        },
      },
    },
  },
} as const;

const DISHES_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["dishes"],
  properties: {
    dishes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "title_vi",
          "title_en",
          "cook_time_min",
          "difficulty",
          "uses_ingredients",
          "missing_ingredients",
          "missing_ingredients_en",
          "why_vi",
          "why_en",
          "steps_vi",
          "steps_en",
          "approx_macros",
        ],
        properties: {
          title_vi: { type: "string" },
          title_en: { type: "string" },
          cook_time_min: { type: "integer" },
          difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
          uses_ingredients: { type: "array", items: { type: "string" } },
          missing_ingredients: { type: "array", items: { type: "string" } },
          missing_ingredients_en: { type: "array", items: { type: "string" } },
          why_vi: { type: "string" },
          why_en: { type: "string" },
          steps_vi: { type: "array", items: { type: "string" } },
          steps_en: { type: "array", items: { type: "string" } },
          approx_macros: {
            type: "object",
            additionalProperties: false,
            required: ["kcal", "protein_g", "carbs_g", "fat_g"],
            properties: {
              kcal: { type: "integer" },
              protein_g: { type: "integer" },
              carbs_g: { type: "integer" },
              fat_g: { type: "integer" },
            },
          },
        },
      },
    },
  },
} as const;

function costOf(usage: OpenAI.Completions.CompletionUsage | undefined): number {
  if (!usage) return 0;
  return (usage.prompt_tokens || 0) * PRICE_IN + (usage.completion_tokens || 0) * PRICE_OUT;
}

/** Parse the model's JSON content; throw (so the route returns a retryable 502)
 *  instead of silently degrading to an empty result on a refusal/empty completion. */
function parseJsonContent(res: OpenAI.Chat.Completions.ChatCompletion): unknown {
  const content = res.choices[0]?.message?.content;
  if (!content) throw new Error("openai_empty_content");
  return JSON.parse(content);
}

export async function recognizeIngredients(imageDataUrl: string) {
  const res = await client().chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: VISION_SYSTEM },
      {
        role: "user",
        content: [
          { type: "text", text: "Liệt kê tất cả nguyên liệu thực phẩm trong ảnh này." },
          { type: "image_url", image_url: { url: imageDataUrl, detail: "low" } },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "ingredient_list", strict: true, schema: INGREDIENTS_SCHEMA },
    },
  });
  const parsed = parseJsonContent(res) as { ingredients?: Ingredient[] };
  const ingredients = (parsed.ingredients ?? []) as Ingredient[];
  return { ingredients, cost: costOf(res.usage) };
}

export async function suggestDishes(
  pantry: Ingredient[],
  prefs?: Record<string, unknown>,
) {
  const res = await client().chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: RECIPE_SYSTEM },
      { role: "user", content: JSON.stringify({ pantry, prefs: prefs ?? {} }) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "dish_suggestions", strict: true, schema: DISHES_SCHEMA },
    },
  });
  const parsed = parseJsonContent(res) as { dishes?: Dish[] };
  const dishes = ((parsed.dishes ?? []) as Dish[]).slice(0, 10);
  return { dishes, cost: costOf(res.usage) };
}
