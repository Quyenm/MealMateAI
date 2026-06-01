"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.refresh();
    router.push("/login");
  }

  return (
    <Button variant="outline" size="sm" onClick={signOut}>
      Đăng xuất
    </Button>
  );
}
