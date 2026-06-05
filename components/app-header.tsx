"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { LangSwitcher } from "@/components/lang-switcher";
import { SignOutButton } from "@/components/sign-out-button";

/**
 * Thin sticky app header shared by every (app) screen — gives consistent brand
 * + a language switcher + sign-out everywhere (previously sign-out only existed
 * on /home). Client component with no server data, so the (app) layout stays
 * synchronous and navigation stays instant.
 */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur lg:hidden">
      <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3 px-4 py-2.5">
        <Link href="/home" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="" className="size-8 rounded-lg ring-1 ring-border" />
          <span className="font-bold tracking-tight">MealMate</span>
        </Link>
        <div className="flex items-center gap-1.5">
          <Link
            href="/settings"
            aria-label="Settings"
            className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition hover:text-foreground"
          >
            <Settings className="size-[18px]" />
          </Link>
          <LangSwitcher align="left" />
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
