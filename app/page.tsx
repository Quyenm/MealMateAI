import { createClient } from "@/lib/supabase/server";
import { LandingClient, type LandingTier } from "@/components/landing/landing-client";

export default async function Landing() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: tiers } = await supabase
    .from("tier_limits")
    .select("tier, display_label, price_vnd, daily_scan_limit, suggestions_per_scan")
    .order("price_vnd");

  return <LandingClient authed={!!user} tiers={(tiers ?? []) as LandingTier[]} />;
}
