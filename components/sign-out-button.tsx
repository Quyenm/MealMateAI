"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/components/landing/i18n";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();
  const t = useT();

  async function signOut() {
    await createClient().auth.signOut();
    router.refresh();
    router.push("/login");
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={signOut}
      aria-label={t.shell.signOut}
      title={t.shell.signOut}
      className="text-muted-foreground hover:text-foreground"
    >
      <LogOut className="size-[18px]" />
    </Button>
  );
}
