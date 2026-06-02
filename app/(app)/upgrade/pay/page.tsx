import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PaidButton } from "@/components/paid-button";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

// Receiving account (MoMo / napas247 VietQR).
const MOMO_PHONE = "0336427958";
const MOMO_NAME = "Nguyễn Mạnh Quyền";

export default async function PayPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string }>;
}) {
  const { tier } = await searchParams; // Next.js 16: searchParams is async
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: t } = await supabase
    .from("tier_limits")
    .select("display_label, price_vnd")
    .eq("tier", tier ?? "")
    .maybeSingle();
  if (!t || t.price_vnd <= 0) redirect("/upgrade");

  // Note lets the admin match a transfer to this user + tier.
  const note = `MM ${(tier ?? "").toUpperCase()} ${user.id.slice(0, 6)}`;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4">
      <h1 className="text-lg font-semibold">Thanh toán — {t.display_label}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chuyển khoản qua MoMo / VietQR</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/momo-qr.jpg"
            alt="QR chuyển khoản MoMo"
            className="w-60 rounded-lg border"
          />
          <div className="w-full space-y-1 text-sm">
            <p>
              Người nhận: <b>{MOMO_NAME}</b> (MoMo {MOMO_PHONE})
            </p>
            <p>
              Số tiền: <b>{t.price_vnd.toLocaleString("vi-VN")}đ</b>
            </p>
            <p>
              Nội dung: <b>{note}</b>
            </p>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Quét QR bằng MoMo hoặc app ngân hàng (hỗ trợ napas247). Nhớ nhập đúng{" "}
            <b>số tiền</b> và <b>nội dung</b> ở trên để bên mình nâng đúng gói cho bạn.
          </p>
          <PaidButton tier={tier ?? ""} />
        </CardContent>
      </Card>

      <Link href="/upgrade" className={buttonVariants({ variant: "ghost", size: "sm" })}>
        ← Các gói
      </Link>
    </main>
  );
}
