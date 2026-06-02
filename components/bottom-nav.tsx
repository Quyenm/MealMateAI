"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Camera, Clock, CreditCard, ShieldCheck } from "lucide-react";

const ITEMS = [
  { href: "/home", label: "Trang chủ", Icon: Home },
  { href: "/scan", label: "Quét", Icon: Camera },
  { href: "/history", label: "Lịch sử", Icon: Clock },
  { href: "/upgrade", label: "Gói", Icon: CreditCard },
];

export function BottomNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = isAdmin
    ? [...ITEMS, { href: "/admin", label: "Admin", Icon: ShieldCheck }]
    : ITEMS;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-md items-stretch justify-around">
        {items.map(({ href, label, Icon }) => {
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
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
