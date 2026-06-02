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
      const res = await fetch("/api/payments/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      if (!res.ok) throw new Error(String(res.status));
      // Only confirm + leave the page once the claim is actually recorded.
      toast.success("Đã ghi nhận!", {
        description: "Bên mình sẽ kiểm tra chuyển khoản và nâng gói trong ít phút.",
      });
      router.push("/home");
    } catch {
      toast.error("Chưa gửi được", {
        description: "Kiểm tra kết nối mạng rồi bấm lại nhé. Tiền của bạn vẫn an toàn.",
      });
      setLoading(false);
    }
  }

  return (
    <Button className="w-full" onClick={confirm} disabled={loading}>
      {loading ? "Đang gửi..." : "Tôi đã chuyển khoản"}
    </Button>
  );
}
