"use client";

import { useEffect, useRef, useState } from "react";
import { Globe, Check } from "lucide-react";
import { useLang, useT, type Lang } from "@/components/landing/i18n";

const LANGS: Lang[] = ["vi", "en"];

/** Reusable vi/en dropdown — backed by the app-wide LangProvider. */
export function LangSwitcher({
  className = "",
  direction = "down",
}: {
  className?: string;
  direction?: "up" | "down";
}) {
  const { lang, setLang } = useLang();
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-border bg-card/80 px-3 py-1.5 text-sm font-medium text-foreground/80 backdrop-blur transition hover:text-foreground"
        aria-label="Language"
      >
        <Globe className="size-4" />
        <span className="uppercase">{lang}</span>
      </button>
      {open && (
        <div
          className={`absolute right-0 z-50 w-40 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-float ${
            direction === "up" ? "bottom-full mb-2" : "mt-2"
          }`}
        >
          {LANGS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => {
                setLang(l);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                lang === l ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/60"
              }`}
            >
              {t.langName[l]}
              {lang === l && <Check className="size-4 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
