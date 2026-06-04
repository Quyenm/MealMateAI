import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getAdminUser } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { STR } from "@/lib/i18n/strings";
import { AdminDishImages } from "@/components/admin-dish-images";

export const dynamic = "force-dynamic";

export default async function AdminImagesPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) redirect("/home");

  const locale = await getLocale();
  const t = STR[locale].admin;

  const admin = createAdminClient();
  const { data } = await admin
    .from("dish_images")
    .select("title_key, image_url, credit_url, source, created_at")
    .order("created_at", { ascending: false })
    .limit(300);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 p-4 lg:p-8">
      <Link
        href="/admin"
        className="flex w-fit items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> {t.title}
      </Link>
      <div>
        <h1 className="text-xl font-bold tracking-tight">{t.imgTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.imgSub}</p>
      </div>
      <AdminDishImages rows={data ?? []} />
    </main>
  );
}
