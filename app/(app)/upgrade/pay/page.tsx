import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PaidButton } from "@/components/paid-button";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const BANK = process.env.PAYMENT_BANK;
const ACCOUNT = process.env.PAYMENT_ACCOUNT;
const NAME = process.env.PAYMENT_ACCOUNT_NAME;

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

  const configured = !!(BANK && ACCOUNT && NAME);
  // Transfer note that lets the admin match a bank transfer to this user + tier.
  const note = `MM ${(tier ?? "").toUpperCase()} ${user.id.slice(0, 6)}`;
  const qrUrl = configured
    ? `https://img.vietqr.io/image/${BANK}-${ACCOUNT}-compact2.png?amount=${t.price_vnd}` +
      `&addInfo=${encodeURIComponent(note)}&accountName=${encodeURIComponent(NAME!)}`
    : null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4">
      <h1 className="text-lg font-semibold">Thanh toán — {t.display_label}</h1>

      {!configured ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Chưa cấu hình tài khoản nhận tiền. Cần đặt biến môi trường{" "}
            <code>PAYMENT_BANK</code>, <code>PAYMENT_ACCOUNT</code>,{" "}
            <code>PAYMENT_ACCOUNT_NAME</code>.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quét QR để chuyển khoản</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl!} alt="QR chuyển khoản" className="w-64 rounded-lg border" />
            <div className="w-full space-y-1 text-sm">
              <p>
                Số tiền: <b>{t.price_vnd.toLocaleString("vi-VN")}đ</b>
              </p>
              <p>
                Nội dung (GIỮ NGUYÊN): <b>{note}</b>
              </p>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Quét bằng app ngân hàng hoặc Momo — số tiền &amp; nội dung đã điền sẵn.
              Đừng đổi nội dung để bên mình nhận đúng gói cho bạn.
            </p>
            <PaidButton />
          </CardContent>
        </Card>
      )}

      <Link href="/upgrade" className={buttonVariants({ variant: "ghost", size: "sm" })}>
        ← Các gói
      </Link>
    </main>
  );
}
