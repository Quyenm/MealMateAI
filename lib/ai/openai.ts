import OpenAI from "openai";

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
// Rough USD/token for cost tracking (gpt-4o tier). Used only for the spend circuit-breaker.
const PRICE_IN = 2.5 / 1_000_000;
const PRICE_OUT = 10 / 1_000_000;

let _client: OpenAI | null = null;
function client() {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

export type Ingredient = {
  name_vi: string;
  name_en: string;
  confidence: number;
  expiring?: boolean;
};

export type Dish = {
  title_vi: string;
  title_en: string;
  cook_time_min: number;
  difficulty: "easy" | "medium" | "hard";
  uses_ingredients: string[];
  missing_ingredients: string[];
  why: string;
  steps: string[];
};

const VISION_SYSTEM =
  "Bạn là trợ lý nhận diện nguyên liệu cho app nấu ăn Việt Nam. Nhìn ảnh tủ lạnh/bếp và liệt kê MỌI nguyên liệu thực phẩm ăn được nhìn thấy (rau củ, thịt cá, trứng, gia vị, đồ khô). " +
  "Quy tắc: (1) chỉ liệt kê thứ thực sự nhìn thấy, không đoán thứ không có; (2) mỗi món cho name_vi (tên tiếng Việt thông dụng) và name_en; (3) confidence là độ chắc chắn 0..1; " +
  "(4) bỏ qua đồ không ăn được, bao bì, chữ/logo; gộp các món trùng lặp; (5) nếu ảnh không đọc được hoặc không có thực phẩm, trả mảng rỗng.";

const RECIPE_SYSTEM =
  "Bạn là công cụ gợi món ăn gia đình Việt Nam. Bạn nhận một JSON pantry (các nguyên liệu user ĐÃ xác nhận, mỗi món có thể có expiring:true) và prefs tùy chọn. " +
  "QUY TẮC: (1) chỉ gợi món Việt đời thường nấu được NGAY; (2) CHỈ dùng nguyên liệu trong pantry; ngoại lệ tối đa 2 gia vị cơ bản (muối, dầu ăn, nước mắm, đường, tiêu, nước) — phải liệt kê chúng vào missing_ingredients; TUYỆT ĐỐI không bịa món cần nguyên liệu không có trong pantry; " +
  "(3) nếu có nguyên liệu expiring:true thì ƯU TIÊN món dùng nó và nói rõ trong 'why'; (4) trả TỐI ĐA 3 món, xếp món dùng đồ sắp hỏng lên đầu; (5) steps là các bước nấu ngắn gọn bằng tiếng Việt; (6) nếu KHÔNG có món Việt nào nấu được thì trả mảng dishes rỗng (không bịa).";

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
        required: ["name_vi", "name_en", "confidence"],
        properties: {
          name_vi: { type: "string" },
          name_en: { type: "string" },
          confidence: { type: "number" },
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
          "why",
          "steps",
        ],
        properties: {
          title_vi: { type: "string" },
          title_en: { type: "string" },
          cook_time_min: { type: "integer" },
          difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
          uses_ingredients: { type: "array", items: { type: "string" } },
          missing_ingredients: { type: "array", items: { type: "string" } },
          why: { type: "string" },
          steps: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
} as const;

function costOf(usage: OpenAI.Completions.CompletionUsage | undefined): number {
  if (!usage) return 0;
  return (usage.prompt_tokens || 0) * PRICE_IN + (usage.completion_tokens || 0) * PRICE_OUT;
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
  const parsed = JSON.parse(res.choices[0]?.message?.content || "{}");
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
  const parsed = JSON.parse(res.choices[0]?.message?.content || "{}");
  const dishes = ((parsed.dishes ?? []) as Dish[]).slice(0, 3);
  return { dishes, cost: costOf(res.usage) };
}
