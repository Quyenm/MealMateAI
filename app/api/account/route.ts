import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("password"), password: z.string().min(6).max(72) }),
  z.object({ action: z.literal("email"), email: z.string().email() }),
]);

/** Change the signed-in user's password or email (email change sends a confirm link). */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const update =
    parsed.data.action === "password" ? { password: parsed.data.password } : { email: parsed.data.email };
  const { error } = await supabase.auth.updateUser(update);
  if (error) return NextResponse.json({ error: "update_failed", message: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

/** Permanently delete the signed-in user (cascades to their rows). */
export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error } = await createAdminClient().auth.admin.deleteUser(user.id);
  if (error) {
    console.error("/api/account delete failed", error);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
