import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { STR } from "@/lib/i18n/strings";
import { CommunityFeed } from "@/components/community-feed";

export const dynamic = "force-dynamic";

type PostRow = {
  id: string;
  user_id: string;
  dish_title: string;
  note: string | null;
  image_url: string;
  created_at: string;
  profiles: { email: string | null; display_name: string | null } | null;
};

export default async function CommunityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const locale = await getLocale();
  const t = STR[locale].community;

  const admin = createAdminClient();
  const { data } = await admin
    .from("community_posts")
    .select("id, user_id, dish_title, note, image_url, created_at, profiles(email, display_name)")
    .eq("hidden", false)
    .order("created_at", { ascending: false })
    .limit(60);

  const posts = ((data ?? []) as unknown as PostRow[]).map((p) => ({
    id: p.id,
    dish_title: p.dish_title,
    note: p.note,
    image_url: p.image_url,
    created_at: p.created_at,
    author: p.profiles?.display_name || p.profiles?.email?.split("@")[0] || t.anon,
    mine: p.user_id === user.id,
  }));

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4 lg:p-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{t.title}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{t.subtitle}</p>
      </div>
      <CommunityFeed posts={posts} />
    </main>
  );
}
