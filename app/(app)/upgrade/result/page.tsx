import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function ResultPage() {
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

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 p-6">
      <Card className="w-full text-center">
        <CardHeader>
          <CardTitle>Cảm ơn bạn! 🎉</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Thanh toán đang được xác nhận. Gói của bạn sẽ tự cập nhật trong vài giây
            (qua webhook). Gói hiện tại:{" "}
            <span className="font-medium uppercase">{profile?.tier ?? "free"}</span>.
          </p>
          <Link href="/home" className={buttonVariants({ className: "w-full" })}>
            Về trang chủ
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
