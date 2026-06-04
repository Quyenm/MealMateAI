import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  image: z.string().regex(/^data:image\/(jpeg|png|webp);base64,/).max(3_000_000),
});

/** Upload the signed-in user's avatar to Storage and point profiles.avatar_url at it. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const m = parsed.data.image.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!m) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const contentType = m[1];
  const buffer = Buffer.from(m[2], "base64");
  const ext = contentType.split("/")[1];

  const admin = createAdminClient();
  const path = `${user.id}.${ext}`;
  const { error: upErr } = await admin.storage
    .from("avatars")
    .upload(path, buffer, { contentType, upsert: true });
  if (upErr) {
    console.error("/api/profile/avatar upload failed", upErr);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }
  // Cache-bust: the path is fixed, so add a version so the new image shows.
  const { data: pub } = admin.storage.from("avatars").getPublicUrl(path);
  const url = `${pub.publicUrl}?v=${Date.now()}`;

  const { error } = await admin.from("profiles").update({ avatar_url: url }).eq("id", user.id);
  if (error) {
    console.error("/api/profile/avatar set failed", error);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, url });
}
