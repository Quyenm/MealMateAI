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
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
};
const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const STEPS = [
  { Icon: Camera, title: "Chụp tủ lạnh", desc: "Mở app, chụp đống nguyên liệu đang có." },
  { Icon: Sparkles, title: "AI gợi 3 món", desc: "Nhận diện nguyên liệu rồi gợi món nấu được ngay." },
  { Icon: UtensilsCrossed, title: "Vào bếp", desc: "Làm theo các bước — xong bữa, khỏi nghĩ." },
];

const FEATURES = [
  { Icon: ArrowLeftRight, title: "Đi từ nguyên liệu → món", desc: "Ngược với app công thức: nhìn đồ bạn CÓ rồi quyết hộ bạn." },
  { Icon: Flame, title: "Ưu tiên đồ sắp hỏng", desc: "Đánh dấu món sắp hư — AI gợi món dùng nó trước, đỡ phí." },
  { Icon: Soup, title: "Món Việt nấu được ngay", desc: "Món quen thuộc, chỉ cần thêm tối đa 2 gia vị cơ bản." },
  { Icon: BrainCircuit, title: "Bán sự 'khỏi phải nghĩ'", desc: "Giải toả gánh nặng quyết định bữa ăn — không phải dạy nấu." },
];

const STATS = [
  { v: "~30s", l: "từ ảnh ra món" },
  { v: "3 lượt", l: "miễn phí / ngày" },
  { v: "0đ", l: "để bắt đầu" },
];

function reveal(margin = "-80px") {
  return {
    initial: "hidden" as const,
    whileInView: "show" as const,
    viewport: { once: true, margin },
    variants: fadeUp,
  };
}

export function LandingClient({ authed }: { authed: boolean }) {
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
          <nav className="flex items-center gap-1.5">
            {authed ? (
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
      </motion.header>

      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        {/* animated background blobs */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -left-32 -top-24 -z-10 h-96 w-96 rounded-full bg-[#7cc6ec]/30 blur-3xl"
          animate={{ scale: [1, 1.18, 1], x: [0, 30, 0], y: [0, 20, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -right-24 top-32 -z-10 h-96 w-96 rounded-full bg-[#ffd6a8]/40 blur-3xl"
          animate={{ scale: [1, 1.12, 1], x: [0, -24, 0], y: [0, 28, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-20 lg:grid-cols-2 lg:py-28">
          {/* copy */}
          <motion.div
            initial="hidden"
            animate="show"
            variants={container}
            className="flex flex-col items-start gap-6 text-left"
          >
            <motion.span
              variants={fadeUp}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-sm text-muted-foreground shadow-sm"
            >
              <Sparkles className="size-3.5 text-primary" /> Trợ lý nấu ăn AI cho người Việt
            </motion.span>
            <motion.h1
              variants={fadeUp}
              className="text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl"
            >
              Chụp tủ lạnh —<br />biết nấu gì{" "}
              <span className="bg-gradient-to-r from-[#2ba3d9] to-[#3fb37f] bg-clip-text text-transparent">
                trong 30 giây
              </span>
            </motion.h1>
            <motion.p variants={fadeUp} className="max-w-md text-lg text-muted-foreground">
              MealMate nhìn nguyên liệu bạn đang có rồi gợi món Việt nấu được ngay, ưu
              tiên đồ sắp hỏng. Hết cảnh đứng tần ngần trước tủ lạnh.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col gap-3 sm:flex-row">
              <Link href={primaryHref} className={buttonVariants({ size: "lg", className: "px-8 shadow-sm" })}>
                {primaryLabel}
              </Link>
              <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
                Đăng nhập
              </Link>
            </motion.div>
            <motion.p variants={fadeUp} className="text-xs text-muted-foreground">
              3 lượt quét miễn phí mỗi ngày · không cần thẻ
            </motion.p>
          </motion.div>

          {/* phone mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40, rotate: -3 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ duration: 0.8, ease, delay: 0.15 }}
            className="mx-auto"
          >
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="relative w-[270px] rounded-[2.6rem] border-[10px] border-foreground bg-foreground p-0 shadow-2xl"
            >
              <div className="overflow-hidden rounded-[1.9rem] bg-background">
                {/* app header */}
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo.jpg" alt="" className="h-6 w-6 rounded-md" />
                    <span className="text-sm font-semibold">MealMate</span>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    2/3 lượt
                  </span>
                </div>
                <div className="flex flex-col gap-3 p-4">
                  {/* fake fridge photo */}
                  <div className="flex h-24 items-center justify-center rounded-xl bg-gradient-to-br from-[#cfeafc] to-[#fde7cf] text-3xl">
                    🧊
                  </div>
                  {/* ingredient chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {["Cà chua", "Trứng", "Hành lá", "🔥 Rau"].map((c) => (
                      <span
                        key={c}
                        className="rounded-full border border-border px-2 py-0.5 text-xs"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                  {/* dish result */}
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Trứng chiên cà chua</span>
                      <span className="text-xs text-muted-foreground">15&apos;</span>
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-xs text-primary">
                      <Check className="size-3.5" /> Nấu được với đồ đang có
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border/60 bg-card">
        <motion.div
          {...reveal()}
          className="mx-auto grid w-full max-w-3xl grid-cols-3 gap-4 px-5 py-10 text-center"
        >
          {STATS.map((s) => (
            <div key={s.l}>
              <p className="text-3xl font-bold text-primary sm:text-4xl">{s.v}</p>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{s.l}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* How it works */}
      <section className="mx-auto w-full max-w-6xl px-5 py-24">
        <motion.h2 {...reveal()} className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
          3 bước, xong bữa
        </motion.h2>
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          variants={container}
          className="mt-12 grid gap-6 sm:grid-cols-3"
        >
          {STEPS.map((s, i) => (
            <motion.div
              key={s.title}
              variants={fadeUp}
              whileHover={{ y: -6 }}
              className="flex h-full flex-col items-start gap-4 rounded-3xl border border-border bg-card p-7 shadow-sm"
            >
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <s.Icon className="size-6" />
              </div>
              <span className="text-sm font-semibold text-primary">Bước {i + 1}</span>
              <h3 className="text-lg font-semibold">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section className="bg-card">
        <div className="mx-auto w-full max-w-6xl px-5 py-24">
          <motion.h2 {...reveal()} className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Vì sao MealMate khác?
          </motion.h2>
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            variants={container}
            className="mt-12 grid gap-6 sm:grid-cols-2"
          >
            {FEATURES.map((f) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                whileHover={{ y: -4 }}
                className="flex h-full items-start gap-5 rounded-3xl border border-border bg-background p-7"
              >
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <f.Icon className="size-6" />
                </div>
                <div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-6xl px-5 py-24">
        <motion.div
          {...reveal()}
          className="relative flex flex-col items-center gap-5 overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#2ba3d9] to-[#1b7aa8] px-6 py-16 text-center text-white shadow-xl"
        >
          <h2 className="max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
            Sẵn sàng hết cảnh &quot;tối nay ăn gì&quot;?
          </h2>
          <p className="max-w-md text-white/90">
            Tạo tài khoản miễn phí, chụp tủ lạnh, để AI lo phần còn lại.
          </p>
          <Link
            href={primaryHref}
            className={buttonVariants({
              size: "lg",
              className: "bg-white px-8 text-foreground hover:bg-white/90",
            })}
          >
            {primaryLabel}
          </Link>
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
