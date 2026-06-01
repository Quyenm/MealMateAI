import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type QuotaStatus = {
  tier: string;
  used: number;
  scan_limit: number;
  remaining: number;
  suggestions_per_scan: number;
};

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // proxy already guards this route, but double-check.
  if (!user) redirect("/login");

  const { data } = await supabase.rpc("get_quota_status", { p_user: user.id });
  const quota = (Array.isArray(data) ? data[0] : data) as QuotaStatus | null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Xin chào</p>
          <p className="font-medium">{user.email}</p>
        </div>
        <SignOutButton />
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lượt quét hôm nay</CardTitle>
          <CardDescription>
            Gói <span className="font-medium uppercase">{quota?.tier ?? "free"}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">
            {quota ? `${quota.remaining}/${quota.scan_limit}` : "—"}
          </p>
          <p className="text-sm text-muted-foreground">lượt còn lại</p>
        </CardContent>
      </Card>

      <Link href="/scan" className={buttonVariants({ size: "lg", className: "w-full" })}>
        Chụp tủ lạnh
      </Link>
      <Link
        href="/upgrade"
        className={buttonVariants({ variant: "ghost", size: "sm", className: "w-full" })}
      >
        Xem các gói
      </Link>
    </main>
  );
}
