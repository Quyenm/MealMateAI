import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getLocale } from "@/lib/i18n/server";
import { STR } from "@/lib/i18n/strings";
import { ChatView } from "@/components/chat-view";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const locale = await getLocale();
  const t = STR[locale].chat;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 p-4 lg:p-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{t.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.sub}</p>
      </div>
      <ChatView />
    </main>
  );
}
