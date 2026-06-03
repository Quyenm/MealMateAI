import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  dish_title: z.string().trim().min(1).max(120),
  note: z.string().trim().max(280).optional(),
  // a downscaled JPEG/PNG/WebP data URL from the client
  image: z.string().regex(/^data:image\/(jpeg|png|webp);base64,/).max(3_000_000),
});

/** Share a photo of a dish the user just cooked to the public feed. */
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
  const { dish_title, note, image } = parsed.data;

  const m = image.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!m) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const contentType = m[1];
  const buffer = Buffer.from(m[2], "base64");
  const ext = contentType.split("/")[1];

  const admin = createAdminClient();
  const path = `${user.id}/${randomUUID()}.${ext}`;
  const { error: upErr } = await admin.storage
    .from("community")
    .upload(path, buffer, { contentType, upsert: false });
  if (upErr) {
    console.error("/api/community upload failed", upErr);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }
  const { data: pub } = admin.storage.from("community").getPublicUrl(path);

  const { data: post, error } = await admin
    .from("community_posts")
    .insert({ user_id: user.id, dish_title, note: note || null, image_url: pub.publicUrl })
    .select("id")
    .single();
  if (error) {
    console.error("/api/community insert failed", error);
    return NextResponse.json({ error: "post_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: post.id });
}

/** Delete the caller's own post (RLS also enforces ownership). */
export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "invalid" }, { status: 400 });

  await supabase.from("community_posts").delete().eq("id", id).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
