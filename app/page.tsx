import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function Landing() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">MealMate AI</h1>
      <p className="max-w-md text-muted-foreground">
        Chụp tủ lạnh — AI gợi ý món nấu được ngay trong vài giây, ưu tiên đồ sắp
        hỏng. Hết cảnh đứng nghĩ &quot;tối nay ăn gì&quot;.
      </p>
      <div className="flex gap-3">
        {user ? (
          <Link href="/home" className={buttonVariants({ size: "lg" })}>
            Vào app
          </Link>
        ) : (
          <>
            <Link href="/login" className={buttonVariants({ size: "lg" })}>
              Đăng nhập
            </Link>
            <Link
              href="/signup"
              className={buttonVariants({ size: "lg", variant: "outline" })}
            >
              Đăng ký
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
