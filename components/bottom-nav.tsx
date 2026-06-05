"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, ShieldCheck, type LucideIcon } from "lucide-react";
import { useT } from "@/components/landing/i18n";
import { NAV_ITEMS, QUICK_KEYS, type NavKey } from "@/components/nav-items";

export function BottomNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const t = useT();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const quick = QUICK_KEYS.map((k) => NAV_ITEMS.find((i) => i.key === k)!);
  const all: { href: string; key: NavKey | "admin"; Icon: LucideIcon }[] = isAdmin
    ? [...NAV_ITEMS, { href: "/admin", key: "admin", Icon: ShieldCheck }]
    : NAV_ITEMS;

  return (
    <>
      {/* full-nav drawer (everything the desktop sidebar has) */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-3xl bg-card p-4 pb-8 shadow-float">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-bold tracking-tight">{t.shell.menu}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t.cook.close}
                className="text-muted-foreground transition hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {all.map(({ href, key, Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={`flex flex-col items-center gap-1.5 rounded-2xl p-3 text-center text-xs font-medium transition ${
                      active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="size-5 shrink-0" />
                    {t.shell[key]}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* bottom quick bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex w-full max-w-md items-stretch justify-around">
          {quick.map(({ href, key, Icon }) => {
            const active = isActive(href);
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
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <Menu className="size-5" />
            {t.shell.menu}
          </button>
        </div>
      </nav>
    </>
  );
}
