import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/reveal";
import { createClient } from "@/lib/supabase/server";

const STEPS = [
  { icon: "📸", title: "Chụp tủ lạnh", desc: "Mở app, chụp đống nguyên liệu đang có." },
  { icon: "🤖", title: "AI gợi 3 món", desc: "Nhận diện nguyên liệu rồi gợi món nấu được ngay." },
  { icon: "🍳", title: "Vào bếp", desc: "Làm theo các bước, xong bữa — khỏi nghĩ." },
];

const FEATURES = [
  { icon: "🔄", title: "Đi từ nguyên liệu → món", desc: "Ngược với app công thức: nhìn đồ bạn CÓ rồi quyết hộ bạn." },
  { icon: "🔥", title: "Ưu tiên đồ sắp hỏng", desc: "Đánh dấu món sắp hư — AI gợi món dùng nó trước, đỡ phí." },
  { icon: "🇻🇳", title: "Món Việt nấu được ngay", desc: "Món quen thuộc, chỉ cần thêm tối đa 2 gia vị cơ bản." },
  { icon: "🧠", title: "Bán sự 'khỏi phải nghĩ'", desc: "Giải toả gánh nặng quyết định bữa ăn — không phải dạy nấu." },
];

const STATS = [
  { v: "~30 giây", l: "từ ảnh ra món" },
  { v: "3 lượt", l: "miễn phí mỗi ngày" },
  { v: "0đ", l: "để bắt đầu" },
];

export default async function Landing() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-1 flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="MealMate AI" className="h-9 w-9 rounded-lg" />
            <span className="font-semibold">MealMate AI</span>
          </div>
          <nav className="flex items-center gap-2">
            {user ? (
              <Link href="/home" className={buttonVariants({ size: "sm" })}>
                Vào app
              </Link>
            ) : (
              <>
                <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                  Đăng nhập
                </Link>
                <Link href="/signup" className={buttonVariants({ size: "sm" })}>
                  Bắt đầu
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#e8f4fb] to-background">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-4 py-16 text-center sm:py-24">
          <Reveal>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-sm text-muted-foreground shadow-sm">
              🤖 Trợ lý nấu ăn AI cho người Việt
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="max-w-2xl text-balance text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
              Chụp tủ lạnh — biết nấu gì{" "}
              <span className="bg-gradient-to-r from-[#2ba3d9] to-[#3fb37f] bg-clip-text text-transparent">
                trong 30 giây
              </span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="max-w-xl text-pretty text-base text-muted-foreground sm:text-lg">
              MealMate nhìn nguyên liệu bạn đang có rồi gợi món Việt nấu được ngay, ưu
              tiên đồ sắp hỏng. Hết cảnh đứng tần ngần trước tủ lạnh.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <Link
                href={user ? "/home" : "/signup"}
                className={buttonVariants({ size: "lg", className: "px-8 shadow-sm" })}
              >
                {user ? "Vào app" : "Bắt đầu miễn phí"}
              </Link>
              <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
                Đăng nhập
              </Link>
            </div>
          </Reveal>
          <Reveal delay={320}>
            <p className="text-xs text-muted-foreground">
              3 lượt quét miễn phí mỗi ngày · không cần thẻ
            </p>
          </Reveal>
          <Reveal delay={300} className="mt-4">
            <div className="relative">
              <div className="absolute inset-0 -z-10 scale-90 rounded-full bg-[#2ba3d9]/20 blur-3xl" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.jpg"
                alt="MealMate AI"
                className="h-56 w-56 rounded-[2rem] shadow-xl sm:h-72 sm:w-72"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border/60 bg-card">
        <div className="mx-auto grid w-full max-w-3xl grid-cols-3 gap-4 px-4 py-8 text-center">
          {STATS.map((s) => (
            <div key={s.l}>
              <p className="text-2xl font-bold text-primary sm:text-3xl">{s.v}</p>
              <p className="text-xs text-muted-foreground sm:text-sm">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:py-24">
        <Reveal>
          <h2 className="text-center text-3xl font-bold tracking-tight">3 bước, xong bữa</h2>
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 100}>
              <div className="flex h-full flex-col items-center gap-3 rounded-3xl border border-border bg-card p-6 text-center shadow-sm transition-shadow hover:shadow-md">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8f4fb] text-3xl">
                  {s.icon}
                </div>
                <p className="text-sm font-semibold text-primary">Bước {i + 1}</p>
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-card">
        <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:py-24">
          <Reveal>
            <h2 className="text-center text-3xl font-bold tracking-tight">
              Vì sao MealMate khác?
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 80}>
                <div className="flex h-full items-start gap-4 rounded-3xl border border-border bg-background p-6 transition-transform hover:-translate-y-0.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e8f4fb] text-2xl">
                    {f.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold">{f.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:py-24">
        <Reveal>
          <div className="flex flex-col items-center gap-5 rounded-[2rem] bg-gradient-to-br from-[#2ba3d9] to-[#1d83b3] px-6 py-14 text-center text-white shadow-lg">
            <h2 className="max-w-xl text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              Sẵn sàng hết cảnh &quot;tối nay ăn gì&quot;?
            </h2>
            <p className="max-w-md text-white/90">
              Tạo tài khoản miễn phí, chụp tủ lạnh, để AI lo phần còn lại.
            </p>
            <Link
              href={user ? "/home" : "/signup"}
              className={buttonVariants({
                size: "lg",
                variant: "secondary",
                className: "bg-white px-8 text-foreground hover:bg-white/90",
              })}
            >
              {user ? "Vào app" : "Bắt đầu miễn phí"}
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="MealMate AI" className="h-7 w-7 rounded-md" />
            <span>MealMate AI</span>
          </div>
          <p>Không lưu ảnh tủ lạnh của bạn · © 2026</p>
        </div>
      </footer>
    </div>
  );
}
