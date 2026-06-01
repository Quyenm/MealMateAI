import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UpgradeButton } from "@/components/upgrade-button";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

type Tier = {
  tier: string;
  display_label: string;
  daily_scan_limit: number;
  suggestions_per_scan: number;
  price_vnd: number;
};

// Features unlocked now (quota) vs deferred (shown as "sắp có").
const COMING_SOON: Record<string, string[]> = {
  vip: ["Lên thực đơn cả tuần (sắp có)", "Nhắc nguyên liệu sắp hỏng (sắp có)"],
  svip: ["Theo dõi dinh dưỡng / macro (sắp có)", "Cá nhân hoá nâng cao (sắp có)"],
  family: ["Dùng chung 6 người (sắp có)", "Tủ lạnh chung gia đình (sắp có)"],
};

function vnd(n: number) {
  return n === 0 ? "Miễn phí" : `${n.toLocaleString("vi-VN")}đ/tháng`;
}

export default async function UpgradePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .single();
  const currentTier = profile?.tier ?? "free";

  const { data: tiersData } = await supabase
    .from("tier_limits")
    .select("tier, display_label, daily_scan_limit, suggestions_per_scan, price_vnd")
    .order("price_vnd");
  const tiers = (tiersData ?? []) as Tier[];

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Các gói</h1>
        <Link href="/home" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Trang chủ
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        Nâng gói để có nhiều lượt quét hơn mỗi ngày. (Tính năng cao cấp đang phát triển.)
      </p>

      {tiers.map((t) => {
        const isCurrent = t.tier === currentTier;
        return (
          <Card key={t.tier} className={isCurrent ? "border-foreground" : undefined}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>{t.display_label}</span>
                {isCurrent && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal">
                    Gói hiện tại
                  </span>
                )}
              </CardTitle>
              <CardDescription className="text-base font-medium text-foreground">
                {vnd(t.price_vnd)}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <ul className="space-y-1 text-sm">
                <li>✅ {t.daily_scan_limit} lượt quét / ngày</li>
                <li>✅ Tối đa {t.suggestions_per_scan} món / lần</li>
                {(COMING_SOON[t.tier] ?? []).map((f) => (
                  <li key={f} className="text-muted-foreground">
                    ⏳ {f}
                  </li>
                ))}
              </ul>
              {t.price_vnd > 0 && !isCurrent && (
                <UpgradeButton tier={t.tier} label={`Mua ${t.display_label}`} />
              )}
            </CardContent>
          </Card>
        );
      })}
    </main>
  );
}
