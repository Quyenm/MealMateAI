import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/bottom-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    isAdmin = !!data?.is_admin;
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="flex flex-1 flex-col pb-20">{children}</div>
      {user && <BottomNav isAdmin={isAdmin} />}
    </div>
  );
}
