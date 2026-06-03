import { cookies } from "next/headers";
import { STR, type Lang } from "@/lib/i18n/strings";

export const LANG_COOKIE = "mm-lang";

/** Server-side current locale, read from the `mm-lang` cookie. Defaults to "vi". */
export async function getLocale(): Promise<Lang> {
  const v = (await cookies()).get(LANG_COOKIE)?.value;
  return v === "en" ? "en" : "vi";
}

/** Translation dictionary for the current request — use in Server Components. */
export async function getT() {
  return STR[await getLocale()];
}
