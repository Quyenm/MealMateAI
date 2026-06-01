"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function redirectTarget() {
  const r = new URLSearchParams(window.location.search).get("redirect");
  return r && r.startsWith("/") ? r : "/home";
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Đăng nhập thất bại", { description: error.message });
      return;
    }
    router.refresh();
    router.push(redirectTarget());
  }

  async function handleGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(
          redirectTarget(),
        )}`,
      },
    });
    if (error) toast.error("Không mở được Google", { description: error.message });
  }

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Đăng nhập</CardTitle>
          <CardDescription>Vào MealMate AI để bắt đầu nấu ăn đỡ nghĩ.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ban@email.com"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>
          </form>
          <Button
            type="button"
            variant="outline"
            className="mt-3 w-full"
            onClick={handleGoogle}
          >
            Tiếp tục với Google
          </Button>
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted-foreground">
          Chưa có tài khoản?&nbsp;
          <Link href="/signup" className="font-medium text-foreground underline">
            Đăng ký
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}
