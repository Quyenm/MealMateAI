"use client";

import Link from "next/link";
import { motion, type Variants } from "motion/react";
import {
  Camera,
  Sparkles,
  UtensilsCrossed,
  ArrowLeftRight,
  Flame,
  Soup,
  BrainCircuit,
  Check,
  Clock,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export type LandingTier = {
  tier: string;
  display_label: string;
  price_vnd: number;
  daily_scan_limit: number;
  suggestions_per_scan: number;
};

const ease = [0.22, 1, 0.36, 1] as const;
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
};
const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const reveal = (margin = "-70px") => ({
  initial: "hidden" as const,
  whileInView: "show" as const,
  viewport: { once: true, margin },
  variants: fadeUp,
});
const revealStagger = (margin = "-60px") => ({
  initial: "hidden" as const,
  whileInView: "show" as const,
  viewport: { once: true, margin },
  variants: container,
});

const PAINS = [
  { Icon: Clock, title: "15–30 phút mỗi ngày", desc: "chỉ để đứng nghĩ 'hôm nay ăn gì' — mệt đầu trước khi mệt tay." },
  { Icon: Trash2, title: "8 triệu tấn / năm", desc: "thực phẩm bị bỏ phí ở Việt Nam vì mua về rồi quên dùng." },
  { Icon: BrainCircuit, title: "Không phải không biết nấu", desc: "vấn đề thật là gánh nặng quyết định bữa ăn, lặp lại mỗi ngày." },
];

const STEPS = [
  { Icon: Camera, title: "Chụp tủ lạnh", desc: "Mở app, chụp đống nguyên liệu đang có." },
  { Icon: Sparkles, title: "AI gợi 3 món", desc: "Nhận diện nguyên liệu rồi gợi món nấu được ngay." },
  { Icon: UtensilsCrossed, title: "Vào bếp", desc: "Làm theo các bước — xong bữa, khỏi nghĩ." },
];

const FEATURES = [
  { Icon: ArrowLeftRight, title: "Đi từ nguyên liệu → món", desc: "Ngược với app công thức: nhìn đồ bạn CÓ rồi quyết hộ bạn." },
  { Icon: Flame, title: "Ưu tiên đồ sắp hỏng", desc: "Đánh dấu món sắp hư — AI gợi món dùng nó trước, đỡ phí." },
  { Icon: Soup, title: "Món Việt nấu được ngay", desc: "Món quen thuộc, chỉ cần thêm tối đa 2 gia vị cơ bản." },
  { Icon: BrainCircuit, title: "Bán sự 'khỏi phải nghĩ'", desc: "Giải toả gánh nặng quyết định — không phải dạy bạn nấu." },
];

const STATS = [
  { v: "73.9%", l: "muốn dùng AI nếu tiết kiệm 30+ phút/ngày" },
  { v: "~30 giây", l: "từ ảnh tủ lạnh đến gợi ý món" },
  { v: "87.7%", l: "nấu ở nhà ≥ 2 bữa mỗi tuần" },
];

const PRICING_EXTRAS: Record<string, string[]> = {
  free: ["Món Việt nấu được ngay", "Ưu tiên đồ sắp hỏng"],
  vip: ["Lên thực đơn cả tuần (sắp có)", "Nhắc đồ sắp hỏng (sắp có)"],
  svip: ["Theo dõi dinh dưỡng / macro (sắp có)", "Cá nhân hoá nâng cao (sắp có)"],
  family: ["Dùng chung tới 6 người (sắp có)", "Tủ lạnh chung gia đình (sắp có)"],
};

const FAQ = [
  { q: "MealMate có tốn tiền không?", a: "Miễn phí 3 lượt quét mỗi ngày. Cần nhiều hơn thì nâng gói, từ 139.000đ/tháng." },
  { q: "Ảnh tủ lạnh của tôi có bị lưu lại không?", a: "Không. Ảnh chỉ dùng để nhận diện rồi bỏ ngay — bọn mình chỉ lưu danh sách nguyên liệu dạng chữ." },
  { q: "AI nhận diện sai thì sao?", a: "Bạn luôn xem và sửa danh sách nguyên liệu trước khi AI gợi món, nên không lo nhận diện nhầm." },
  { q: "Gợi món có bắt mua thêm nhiều thứ không?", a: "Không — AI chỉ gợi món nấu được với đồ bạn đang có, tối đa thêm 2 gia vị cơ bản (muối, dầu, nước mắm...)." },
  { q: "Dùng trên điện thoại được không?", a: "Có. Mở web trên điện thoại rồi 'Thêm vào màn hình chính' là dùng như một app thật." },
];

function vnd(n: number) {
  return n === 0 ? "Miễn phí" : `${n.toLocaleString("vi-VN")}đ`;
}

export function LandingClient({ authed, tiers }: { authed: boolean; tiers: LandingTier[] }) {
  const primaryHref = authed ? "/home" : "/signup";
  const primaryLabel = authed ? "Vào app" : "Bắt đầu miễn phí";

  return (
    <div className="flex flex-1 flex-col overflow-x-hidden">
      {/* Nav */}
      <motion.header
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease }}
        className="sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-xl"
      >
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="MealMate AI" className="h-9 w-9 rounded-xl" />
            <span className="text-[15px] font-semibold tracking-tight">MealMate AI</span>
          </div>
          <nav className="flex items-center gap-3">
            <a href="#pricing" className="hidden text-sm text-muted-foreground hover:text-foreground sm:block">
              Bảng giá
            </a>
            {authed ? (
              <Link href="/home" className={buttonVariants({ size: "sm" })}>Vào app</Link>
            ) : (
              <>
                <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>Đăng nhập</Link>
                <Link href="/signup" className={buttonVariants({ size: "sm" })}>Bắt đầu</Link>
              </>
            )}
          </nav>
        </div>
      </motion.header>

      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <motion.div aria-hidden className="pointer-events-none absolute -left-32 -top-24 -z-10 h-96 w-96 rounded-full bg-[#7cc6ec]/30 blur-3xl"
          animate={{ scale: [1, 1.18, 1], x: [0, 30, 0], y: [0, 20, 0] }} transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div aria-hidden className="pointer-events-none absolute -right-24 top-32 -z-10 h-96 w-96 rounded-full bg-[#ffd6a8]/40 blur-3xl"
          animate={{ scale: [1, 1.12, 1], x: [0, -24, 0], y: [0, 28, 0] }} transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }} />

        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-20 lg:grid-cols-2 lg:py-28">
          <motion.div initial="hidden" animate="show" variants={container} className="flex flex-col items-start gap-6">
            <motion.span variants={fadeUp} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-sm text-muted-foreground shadow-sm">
              <Sparkles className="size-3.5 text-primary" /> Trợ lý nấu ăn AI cho người Việt
            </motion.span>
            <motion.h1 variants={fadeUp} className="text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              Chụp tủ lạnh —<br />biết nấu gì{" "}
              <span className="bg-gradient-to-r from-[#2ba3d9] to-[#3fb37f] bg-clip-text text-transparent">trong 30 giây</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="max-w-md text-lg text-muted-foreground">
              MealMate nhìn nguyên liệu bạn đang có rồi gợi món Việt nấu được ngay, ưu tiên đồ sắp hỏng. Hết cảnh đứng tần ngần trước tủ lạnh.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col gap-3 sm:flex-row">
              <Link href={primaryHref} className={buttonVariants({ size: "lg", className: "px-8 shadow-sm" })}>{primaryLabel}</Link>
              <a href="#demo" className={buttonVariants({ variant: "outline", size: "lg" })}>Xem thử</a>
            </motion.div>
            <motion.p variants={fadeUp} className="text-xs text-muted-foreground">3 lượt quét miễn phí mỗi ngày · không cần thẻ</motion.p>
          </motion.div>

          {/* phone mockup */}
          <motion.div initial={{ opacity: 0, y: 40, rotate: -3 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ duration: 0.8, ease, delay: 0.15 }} className="mx-auto">
            <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="relative w-[270px] rounded-[2.6rem] border-[10px] border-foreground bg-foreground shadow-2xl">
              <div className="overflow-hidden rounded-[1.9rem] bg-background">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo.jpg" alt="" className="h-6 w-6 rounded-md" />
                    <span className="text-sm font-semibold">MealMate</span>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">2/3 lượt</span>
                </div>
                <div className="flex flex-col gap-3 p-4">
                  <div className="flex h-24 items-center justify-center rounded-xl bg-gradient-to-br from-[#cfeafc] to-[#fde7cf] text-3xl">🧊</div>
                  <div className="flex flex-wrap gap-1.5">
                    {["Cà chua", "Trứng", "Hành lá", "🔥 Rau"].map((c) => (
                      <span key={c} className="rounded-full border border-border px-2 py-0.5 text-xs">{c}</span>
                    ))}
                  </div>
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Trứng chiên cà chua</span>
                      <span className="text-xs text-muted-foreground">15&apos;</span>
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-xs text-primary"><Check className="size-3.5" /> Nấu được với đồ đang có</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Problem / intro */}
      <section className="bg-card">
        <div className="mx-auto w-full max-w-6xl px-5 py-24">
          <motion.div {...reveal()} className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Nấu ăn ở nhà mệt nhất ở khâu… nghĩ</h2>
            <p className="mt-4 text-muted-foreground">
              MealMate sinh ra để xử lý đúng nỗi đau đó: không phải dạy bạn nấu, mà gỡ bỏ gánh nặng &quot;hôm nay ăn gì&quot;.
            </p>
          </motion.div>
          <motion.div {...revealStagger()} className="mt-12 grid gap-6 sm:grid-cols-3">
            {PAINS.map((p) => (
              <motion.div key={p.title} variants={fadeUp} className="flex flex-col items-start gap-3 rounded-3xl border border-border bg-background p-7">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><p.Icon className="size-6" /></div>
                <h3 className="text-lg font-semibold">{p.title}</h3>
                <p className="text-sm text-muted-foreground">{p.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto w-full max-w-6xl px-5 py-24">
        <motion.h2 {...reveal()} className="text-center text-3xl font-bold tracking-tight sm:text-4xl">3 bước, xong bữa</motion.h2>
        <motion.div {...revealStagger()} className="mt-12 grid gap-6 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <motion.div key={s.title} variants={fadeUp} whileHover={{ y: -6 }} className="flex h-full flex-col items-start gap-4 rounded-3xl border border-border bg-card p-7 shadow-sm">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><s.Icon className="size-6" /></div>
              <span className="text-sm font-semibold text-primary">Bước {i + 1}</span>
              <h3 className="text-lg font-semibold">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Demo */}
      <section id="demo" className="scroll-mt-16 bg-gradient-to-b from-[#eef7fb] to-card">
        <div className="mx-auto w-full max-w-6xl px-5 py-24">
          <motion.div {...reveal()} className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Xem thử trong 30 giây</h2>
            <p className="mt-4 text-muted-foreground">Từ ảnh tủ lạnh tới món ăn — đây là những gì bạn thấy.</p>
          </motion.div>
          <motion.div {...revealStagger()} className="mt-12 grid gap-6 sm:grid-cols-3">
            {/* screen 1 */}
            <motion.div variants={fadeUp} className="rounded-3xl border border-border bg-card p-4 shadow-sm">
              <div className="mb-3 flex h-40 items-center justify-center rounded-2xl bg-gradient-to-br from-[#cfeafc] to-[#fde7cf] text-5xl">🧊</div>
              <p className="text-sm font-semibold">1. Chụp tủ lạnh</p>
              <p className="text-xs text-muted-foreground">Chụp đống nguyên liệu — chỉ cần đủ sáng.</p>
            </motion.div>
            {/* screen 2 */}
            <motion.div variants={fadeUp} className="rounded-3xl border border-border bg-card p-4 shadow-sm">
              <div className="mb-3 flex h-40 flex-wrap content-start gap-1.5 rounded-2xl bg-muted p-3">
                {["Cà chua", "Trứng", "Hành", "🔥 Rau muống", "Thịt bò", "Tỏi"].map((c) => (
                  <span key={c} className="h-fit rounded-full border border-border bg-background px-2 py-0.5 text-xs">{c}</span>
                ))}
              </div>
              <p className="text-sm font-semibold">2. Xác nhận nguyên liệu</p>
              <p className="text-xs text-muted-foreground">Sửa cho đúng, đánh dấu 🔥 món sắp hỏng.</p>
            </motion.div>
            {/* screen 3 */}
            <motion.div variants={fadeUp} className="rounded-3xl border border-border bg-card p-4 shadow-sm">
              <div className="mb-3 flex h-40 flex-col gap-2 rounded-2xl bg-muted p-3">
                {[["Bò xào rau muống", "12'"], ["Canh cà chua trứng", "10'"], ["Trứng chiên hành", "8'"]].map(([t, time]) => (
                  <div key={t} className="rounded-lg border border-border bg-background p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{t}</span>
                      <span className="text-[10px] text-muted-foreground">{time}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm font-semibold">3. Chọn món &amp; nấu</p>
              <p className="text-xs text-muted-foreground">3 món Việt nấu được ngay, kèm các bước.</p>
            </motion.div>
          </motion.div>
          <motion.div {...reveal()} className="mt-10 text-center">
            <Link href={primaryHref} className={buttonVariants({ size: "lg", className: "px-8" })}>{primaryLabel}</Link>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto w-full max-w-6xl px-5 py-24">
        <motion.h2 {...reveal()} className="text-center text-3xl font-bold tracking-tight sm:text-4xl">Vì sao MealMate khác?</motion.h2>
        <motion.div {...revealStagger()} className="mt-12 grid gap-6 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <motion.div key={f.title} variants={fadeUp} whileHover={{ y: -4 }} className="flex h-full items-start gap-5 rounded-3xl border border-border bg-card p-7 shadow-sm">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><f.Icon className="size-6" /></div>
              <div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Stats */}
      <section className="bg-gradient-to-br from-[#2ba3d9] to-[#1b7aa8] text-white">
        <motion.div {...revealStagger()} className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-8 px-5 py-16 text-center sm:grid-cols-3">
          {STATS.map((s) => (
            <motion.div key={s.l} variants={fadeUp}>
              <p className="text-4xl font-extrabold sm:text-5xl">{s.v}</p>
              <p className="mt-2 text-sm text-white/85">{s.l}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-16 mx-auto w-full max-w-6xl px-5 py-24">
        <motion.div {...reveal()} className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Bảng giá</h2>
          <p className="mt-4 text-muted-foreground">Bắt đầu miễn phí. Nâng gói khi cần quét nhiều hơn mỗi ngày.</p>
        </motion.div>
        <motion.div {...revealStagger()} className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {tiers.map((t) => {
            const popular = t.tier === "vip";
            return (
              <motion.div key={t.tier} variants={fadeUp}
                className={`relative flex h-full flex-col gap-4 rounded-3xl border bg-card p-6 shadow-sm ${popular ? "border-primary ring-1 ring-primary" : "border-border"}`}>
                {popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">Phổ biến</span>
                )}
                <div>
                  <h3 className="font-semibold">{t.display_label}</h3>
                  <p className="mt-1">
                    <span className="text-2xl font-bold">{vnd(t.price_vnd)}</span>
                    {t.price_vnd > 0 && <span className="text-sm text-muted-foreground">/tháng</span>}
                  </p>
                </div>
                <ul className="flex flex-1 flex-col gap-2 text-sm">
                  <li className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-primary" /> {t.daily_scan_limit} lượt quét / ngày</li>
                  <li className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-primary" /> {t.suggestions_per_scan} món / lần</li>
                  {(PRICING_EXTRAS[t.tier] ?? []).map((f) => (
                    <li key={f} className="flex items-start gap-2 text-muted-foreground"><Check className="mt-0.5 size-4 shrink-0 text-muted-foreground/60" /> {f}</li>
                  ))}
                </ul>
                <Link href={primaryHref} className={buttonVariants({ variant: popular ? "default" : "outline", className: "w-full" })}>
                  {t.price_vnd === 0 ? "Bắt đầu" : `Chọn ${t.display_label}`}
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* FAQ */}
      <section className="bg-card">
        <div className="mx-auto w-full max-w-3xl px-5 py-24">
          <motion.h2 {...reveal()} className="text-center text-3xl font-bold tracking-tight sm:text-4xl">Câu hỏi thường gặp</motion.h2>
          <motion.div {...revealStagger()} className="mt-10 flex flex-col gap-3">
            {FAQ.map((f) => (
              <motion.details key={f.q} variants={fadeUp} className="group rounded-2xl border border-border bg-background p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                  {f.q}
                  <ChevronDown className="size-5 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
              </motion.details>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-6xl px-5 py-24">
        <motion.div {...reveal()} className="flex flex-col items-center gap-5 rounded-[2.5rem] bg-gradient-to-br from-[#2ba3d9] to-[#1b7aa8] px-6 py-16 text-center text-white shadow-xl">
          <h2 className="max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">Sẵn sàng hết cảnh &quot;tối nay ăn gì&quot;?</h2>
          <p className="max-w-md text-white/90">Tạo tài khoản miễn phí, chụp tủ lạnh, để AI lo phần còn lại.</p>
          <Link href={primaryHref} className={buttonVariants({ size: "lg", className: "bg-white px-8 text-foreground hover:bg-white/90" })}>{primaryLabel}</Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm text-muted-foreground sm:flex-row">
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
