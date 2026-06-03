"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Camera, Clock, CreditCard, ShieldCheck, type LucideIcon } from "lucide-react";
import { useT } from "@/components/landing/i18n";

type NavKey = "home" | "scan" | "history" | "plans" | "admin";
const ITEMS: { href: string; key: NavKey; Icon: LucideIcon }[] = [
  { href: "/home", key: "home", Icon: Home },
  { href: "/scan", key: "scan", Icon: Camera },
  { href: "/history", key: "history", Icon: Clock },
  { href: "/upgrade", key: "plans", Icon: CreditCard },
];

export function BottomNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const t = useT();
  const items = isAdmin
    ? [...ITEMS, { href: "/admin", key: "admin" as const, Icon: ShieldCheck }]
    : ITEMS;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-md items-stretch justify-around">
        {items.map(({ href, key, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] transition-colors ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-5" />
              {t.shell[key]}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
