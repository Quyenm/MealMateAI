import { createClient } from "@/lib/supabase/server";
import { LandingClient } from "@/components/landing/landing-client";

export default async function Landing() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <LandingClient authed={!!user} />;
}
