import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type Dish = { title_vi: string; cook_time_min: number; why?: string; steps?: string[] };
type Scan = {
  id: string;
  created_at: string;
  scan_ingredients: { name_vi: string | null }[];
  suggestions: { dishes: Dish[] }[];
};

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("scans")
    .select("id, created_at, scan_ingredients(name_vi), suggestions(dishes)")
    .eq("user_id", user.id)
    .eq("status", "suggested")
    .order("created_at", { ascending: false })
    .limit(30);
  const scans = (data ?? []) as unknown as Scan[];

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Lịch sử</h1>
        <Link href="/home" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Trang chủ
        </Link>
      </div>

      {scans.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">Chưa có lịch sử quét nào.</p>
            <Link href="/scan" className={buttonVariants({})}>
              Quét lần đầu
            </Link>
          </CardContent>
        </Card>
      )}

      {scans.map((s) => {
        const ingredients = s.scan_ingredients.map((g) => g.name_vi).filter(Boolean);
        const dishes = s.suggestions?.[0]?.dishes ?? [];
        return (
          <Card key={s.id}>
            <CardHeader>
              <CardTitle className="text-sm font-normal text-muted-foreground">
                {new Date(s.created_at).toLocaleString("vi-VN")}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm">
                <span className="text-muted-foreground">Nguyên liệu: </span>
                {ingredients.join(", ") || "—"}
              </p>
              <div className="flex flex-col gap-2">
                {dishes.map((d, i) => (
                  <details key={i} className="rounded-md border p-2">
                    <summary className="cursor-pointer text-sm font-medium">
                      {d.title_vi}{" "}
                      <span className="font-normal text-muted-foreground">
                        · {d.cook_time_min}&apos;
                      </span>
                    </summary>
                    {d.why && <p className="mt-1 text-xs text-muted-foreground">{d.why}</p>}
                    {d.steps && d.steps.length > 0 && (
                      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
                        {d.steps.map((st, j) => (
                          <li key={j}>{st}</li>
                        ))}
                      </ol>
                    )}
                  </details>
                ))}
                {dishes.length === 0 && (
                  <p className="text-sm text-muted-foreground">(không có món)</p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </main>
  );
}
