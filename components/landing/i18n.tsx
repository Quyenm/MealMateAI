"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { STR, type Lang } from "@/lib/i18n/strings";

// Re-export so existing `import { ... } from "./i18n"` call sites keep working.
export { STR, type Lang };

export const LANG_COOKIE = "mm-lang";

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: "vi",
  setLang: () => {},
});

export const useLang = () => useContext(LangContext);
export const useT = () => STR[useLang().lang];

/**
 * App-wide language provider. Mounted ONCE in the root layout, which reads the
 * `mm-lang` cookie on the server and passes it as `initialLang` — so SSR renders
 * the right language with no hydration mismatch and the choice persists across
 * the whole app (landing, auth, in-app), not just the landing page.
 */
export function LangProvider({
  children,
  initialLang = "vi",
}: {
  children: ReactNode;
  initialLang?: Lang;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const router = useRouter();

  const setLang = (l: Lang) => {
    setLangState(l);
    // Persist as a cookie so the server reads it on the next render...
    document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    // ...and refresh so Server Components re-render in the new language.
    router.refresh();
  };

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}
