import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { STR } from "@/lib/i18n/strings";
import { FavoritesList, type SavedDish } from "@/components/favorites-list";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const locale = await getLocale();
  const t = STR[locale].favorites;

  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_dishes")
    .select("id, scan_id, dish_index, dish")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const items = (data ?? []) as unknown as SavedDish[];

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 p-4 lg:p-8">
      <h1 className="text-xl font-bold tracking-tight">{t.title}</h1>
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl bg-card p-8 text-center shadow-card ring-1 ring-white/60">
          <p className="text-sm text-muted-foreground">{t.empty}</p>
          <Link href="/scan" className={buttonVariants({ className: "shadow-float" })}>
            {t.browse}
          </Link>
        </div>
      ) : (
        <FavoritesList initial={items} />
      )}
    </main>
  );
}
