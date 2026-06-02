import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { AdminPaymentActions } from "@/components/admin-payment-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  amount_vnd: number;
  tier_purchased: string;
  user_id: string;
  created_at: string;
  profiles: { email: string } | null;
};

export default async function AdminPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) redirect("/home");

  const admin = createAdminClient();
  const { data } = await admin
    .from("payments")
    .select("id, amount_vnd, tier_purchased, user_id, created_at, profiles(email)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as unknown as Row[];

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4">
      <h1 className="text-lg font-semibold">Admin — Duyệt thanh toán</h1>
      <p className="text-sm text-muted-foreground">
        Đối chiếu với MoMo (đúng số tiền + nội dung) rồi bấm Duyệt.
      </p>

      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground">Không có yêu cầu nào đang chờ.</p>
      )}

      {rows.map((p) => {
        const note = `MM ${p.tier_purchased.toUpperCase()} ${p.user_id.slice(0, 6)}`;
        return (
          <Card key={p.id}>
            <CardHeader>
              <CardTitle className="text-base">
                {p.tier_purchased.toUpperCase()} — {p.amount_vnd.toLocaleString("vi-VN")}đ
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <p>User: {p.profiles?.email ?? "?"}</p>
              <p>
                Nội dung cần khớp: <b>{note}</b>
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(p.created_at).toLocaleString("vi-VN")}
              </p>
              <AdminPaymentActions paymentId={p.id} />
            </CardContent>
          </Card>
        );
      })}
    </main>
  );
}
