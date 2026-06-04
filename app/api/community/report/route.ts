import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HIDE_THRESHOLD = 3;
const Body = z.object({ postId: z.string().uuid() });

/** Report a community post; auto-hide once enough distinct users have reported it. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!(await rateLimit("community", user.id)).ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const admin = createAdminClient();
  await admin
    .from("community_reports")
    .upsert(
      { post_id: parsed.data.postId, reporter_id: user.id },
      { onConflict: "post_id,reporter_id", ignoreDuplicates: true },
    );

  const { count } = await admin
    .from("community_reports")
    .select("reporter_id", { count: "exact", head: true })
    .eq("post_id", parsed.data.postId);
  if ((count ?? 0) >= HIDE_THRESHOLD) {
    await admin.from("community_posts").update({ hidden: true }).eq("id", parsed.data.postId);
  }

  return NextResponse.json({ ok: true });
}
