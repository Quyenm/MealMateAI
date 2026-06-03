import Link from "next/link";
import { ShieldCheck, Clock, Sparkles, type LucideIcon } from "lucide-react";
import { getT } from "@/lib/i18n/server";
import { Atmosphere, Grain } from "@/components/landing/atmosphere";
import { LangSwitcher } from "@/components/lang-switcher";

const TRUST_ICONS: LucideIcon[] = [ShieldCheck, Clock, Sparkles];

/**
 * Auth shell: a two-column split on lg+ — a branded gradient panel on the left,
 * the auth card on the right. On mobile the panel collapses and only the card
 * shows. Reuses the landing design language (gradient, grain, blooms) so login
 * and signup feel like the same product as the marketing site.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getT();

  return (
    <div className="relative grid min-h-full flex-1 grid-cols-1 lg:grid-cols-2">
      {/* Brand panel — lg+ only */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-[#2ba3d9] to-[#176f9c] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-24 size-96 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-28 -right-20 size-[28rem] rounded-full bg-[#f7b267]/25 blur-3xl" />
        </div>
        <Grain opacity={0.06} />

        <Link href="/" className="relative flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="" className="size-11 rounded-xl ring-1 ring-white/30" />
          <span className="text-lg font-bold tracking-tight">
            MealMate <span className="font-medium text-white/80">AI</span>
          </span>
        </Link>

        <div className="relative flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <h2 className="text-3xl font-extrabold leading-tight">{t.auth.brandHeadline}</h2>
            <p className="max-w-sm text-[15px] leading-relaxed text-white/85">{t.auth.brandBody}</p>
          </div>
          <ul className="flex flex-col gap-3">
            {t.auth.trust.map((txt, i) => {
              const Icon = TRUST_ICONS[i] ?? ShieldCheck;
              return (
                <li key={txt} className="flex items-center gap-3 text-sm text-white/90">
                  <span className="flex size-8 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
                    <Icon className="size-4" />
                  </span>
                  {txt}
                </li>
              );
            })}
          </ul>
        </div>

        <p className="relative text-xs text-white/60">© 2026 MealMate AI</p>
      </aside>

      {/* Form side */}
      <div className="relative flex min-h-full flex-col">
        <Atmosphere />
        <Grain opacity={0.045} />
        <header className="relative flex items-center justify-between gap-3 p-4 lg:justify-end lg:p-6">
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="" className="size-9 rounded-lg ring-1 ring-border" />
            <span className="font-bold tracking-tight">MealMate</span>
          </Link>
          <LangSwitcher />
        </header>
        <main className="relative flex flex-1 flex-col items-center justify-center p-4 pb-16">
          {children}
        </main>
      </div>
    </div>
  );
}
