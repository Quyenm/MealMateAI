"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function PaidButton({ tier }: { tier: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function confirm() {
    setLoading(true);
    try {
      await fetch("/api/payments/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
    } catch {
      // ignore — the claim is best-effort; admin verifies against MoMo anyway
    }
    toast.success("Đã ghi nhận!", {
      description: "Bên mình sẽ kiểm tra chuyển khoản và nâng gói trong ít phút.",
    });
    router.push("/home");
  }

  return (
    <Button className="w-full" onClick={confirm} disabled={loading}>
      {loading ? "Đang gửi..." : "Tôi đã chuyển khoản"}
    </Button>
  );
}
