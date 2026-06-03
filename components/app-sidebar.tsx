"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Camera, Clock, CreditCard, Settings, ShieldCheck, type LucideIcon } from "lucide-react";
import { useT } from "@/components/landing/i18n";
import { LangSwitcher } from "@/components/lang-switcher";
import { SignOutButton } from "@/components/sign-out-button";

type NavKey = "home" | "scan" | "history" | "plans" | "settings" | "admin";
const ITEMS: { href: string; key: NavKey; Icon: LucideIcon }[] = [
  { href: "/home", key: "home", Icon: Home },
  { href: "/scan", key: "scan", Icon: Camera },
  { href: "/history", key: "history", Icon: Clock },
  { href: "/upgrade", key: "plans", Icon: CreditCard },
  { href: "/settings", key: "settings", Icon: Settings },
];

/** Desktop-only left navigation rail (lg+). Mobile uses AppHeader + BottomNav. */
export function AppSidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const t = useT();
  const items = isAdmin
    ? [...ITEMS, { href: "/admin", key: "admin" as const, Icon: ShieldCheck }]
    : ITEMS;

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-card/60 backdrop-blur lg:flex">
      <Link href="/home" className="flex items-center gap-2.5 px-5 py-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.jpg" alt="" className="size-9 rounded-xl ring-1 ring-border" />
        <span className="text-lg font-bold tracking-tight">
          MealMate <span className="font-medium text-muted-foreground">AI</span>
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {items.map(({ href, key, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="size-5 shrink-0" />
              {t.shell[key]}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
        <LangSwitcher direction="up" align="left" />
        <SignOutButton />
      </div>
    </aside>
  );
}
