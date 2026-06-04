import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin: drop a cached dish photo so it re-resolves on the next scan. */
export async function DELETE(req: Request) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const key = new URL(req.url).searchParams.get("key");
  if (!key) return NextResponse.json({ error: "invalid" }, { status: 400 });
  await createAdminClient().from("dish_images").delete().eq("title_key", key);
  return NextResponse.json({ ok: true });
}
