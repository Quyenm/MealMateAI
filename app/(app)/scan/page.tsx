"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Ingredient = { name_vi: string; name_en?: string; confidence?: number; expiring?: boolean };
type Dish = {
  title_vi: string;
  title_en: string;
  cook_time_min: number;
  difficulty: "easy" | "medium" | "hard";
  uses_ingredients: string[];
  missing_ingredients: string[];
  why: string;
  steps: string[];
};
type Step = "capture" | "recognizing" | "confirm" | "suggesting" | "results";

async function downscale(file: File, maxEdge = 1024, quality = 0.7): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

export default function ScanPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("capture");
  const [preview, setPreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [newName, setNewName] = useState("");
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [openDish, setOpenDish] = useState<number | null>(0);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await downscale(file);
      setImageData(data);
      setPreview(data);
    } catch {
      toast.error("Không đọc được ảnh, thử ảnh khác");
    }
  }

  async function analyze() {
    if (!imageData) return;
    setStep("recognizing");
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: imageData }),
      });
      if (res.status === 422) {
        toast.message("Không nhận ra nguyên liệu", { description: "Thêm tay bên dưới nhé." });
        setIngredients([]);
        setStep("confirm");
        return;
      }
      if (!res.ok) {
        toast.error(res.status === 503 ? "Hệ thống đang bận, thử lại sau" : "Lỗi nhận diện, thử lại");
        setStep("capture");
        return;
      }
      const data = await res.json();
      setIngredients((data.ingredients ?? []).map((g: Ingredient) => ({ ...g, expiring: false })));
      setStep("confirm");
    } catch {
      toast.error("Lỗi mạng, thử lại");
      setStep("capture");
    }
  }

  function removeAt(i: number) {
    setIngredients((xs) => xs.filter((_, j) => j !== i));
  }
  function toggleExpiring(i: number) {
    setIngredients((xs) => xs.map((g, j) => ({ ...g, expiring: j === i ? !g.expiring : false })));
  }
  function addIngredient() {
    const name = newName.trim();
    if (!name) return;
    setIngredients((xs) => [...xs, { name_vi: name, name_en: name, expiring: false }]);
    setNewName("");
  }

  async function getSuggestions() {
    if (!ingredients.length) {
      toast.error("Thêm ít nhất 1 nguyên liệu");
      return;
    }
    setStep("suggesting");
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients }),
      });
      if (res.status === 402) {
        toast.error("Hết lượt quét hôm nay", { description: "Quay lại mai hoặc nâng gói." });
        router.push("/home");
        return;
      }
      if (!res.ok) {
        toast.error(res.status === 503 ? "Hệ thống đang bận" : "Lỗi gợi món, thử lại");
        setStep("confirm");
        return;
      }
      const data = await res.json();
      setDishes(data.dishes ?? []);
      setOpenDish(0);
      setStep("results");
      if (data.noMatch) {
        toast.message("Chưa có món nấu được", { description: "Thử thêm nguyên liệu rồi quét lại." });
      }
    } catch {
      toast.error("Lỗi mạng, thử lại");
      setStep("confirm");
    }
  }

  function reset() {
    setStep("capture");
    setPreview(null);
    setImageData(null);
    setIngredients([]);
    setDishes([]);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Chụp tủ lạnh</h1>
        <Button variant="ghost" size="sm" onClick={() => router.push("/home")}>
          Trang chủ
        </Button>
      </div>

      {/* STEP: capture */}
      {step === "capture" && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="preview" className="max-h-64 rounded-lg object-contain" />
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                Chụp/chọn ảnh tủ lạnh hay đống nguyên liệu — đủ sáng, rõ là được.
              </p>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={onPick}
            />
            <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
              {preview ? "Chọn ảnh khác" : "Chụp / chọn ảnh"}
            </Button>
            {preview && (
              <Button className="w-full" onClick={analyze}>
                Phân tích ảnh
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* STEP: loading */}
      {(step === "recognizing" || step === "suggesting") && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
            <p className="text-sm text-muted-foreground">
              {step === "recognizing" ? "Đang nhận diện nguyên liệu…" : "Đang tìm món nấu được…"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* STEP: confirm ingredients */}
      {step === "confirm" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Xác nhận nguyên liệu</CardTitle>
            <p className="text-sm text-muted-foreground">
              Xoá món sai, thêm món thiếu. Bấm 🔥 vào món sắp hỏng để ưu tiên.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {ingredients.map((g, i) => (
                <span
                  key={i}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm ${
                    g.expiring ? "border-orange-400 bg-orange-50" : "border-border"
                  }`}
                >
                  <button
                    type="button"
                    title="Sắp hỏng"
                    onClick={() => toggleExpiring(i)}
                    className={g.expiring ? "" : "opacity-40"}
                  >
                    🔥
                  </button>
                  {g.name_vi}
                  <button type="button" onClick={() => removeAt(i)} className="ml-0.5 text-muted-foreground">
                    ✕
                  </button>
                </span>
              ))}
              {!ingredients.length && (
                <p className="text-sm text-muted-foreground">Chưa có nguyên liệu nào — thêm bên dưới.</p>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addIngredient())}
                placeholder="Thêm nguyên liệu…"
              />
              <Button variant="outline" onClick={addIngredient}>
                Thêm
              </Button>
            </div>
            <Button onClick={getSuggestions}>Gợi món ({ingredients.length})</Button>
          </CardContent>
        </Card>
      )}

      {/* STEP: results */}
      {step === "results" && (
        <div className="flex flex-col gap-3">
          {dishes.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Chưa nấu được món nào với mấy nguyên liệu này. Thêm vài thứ rồi quét lại nhé.
              </CardContent>
            </Card>
          )}
          {dishes.map((d, i) => (
            <Card key={i}>
              <CardHeader className="cursor-pointer" onClick={() => setOpenDish(openDish === i ? null : i)}>
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{d.title_vi}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {d.cook_time_min}&apos; · {d.difficulty}
                  </span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">{d.why}</p>
              </CardHeader>
              {openDish === i && (
                <CardContent className="flex flex-col gap-3">
                  {d.missing_ingredients?.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Cần thêm: {d.missing_ingredients.join(", ")}
                    </p>
                  )}
                  <ol className="list-decimal space-y-1 pl-5 text-sm">
                    {d.steps.map((s, j) => (
                      <li key={j}>{s}</li>
                    ))}
                  </ol>
                </CardContent>
              )}
            </Card>
          ))}
          <Button variant="outline" onClick={reset}>
            Quét lần nữa
          </Button>
        </div>
      )}
    </main>
  );
}
