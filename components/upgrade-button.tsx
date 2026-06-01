"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function UpgradeButton({ tier, label }: { tier: string; label: string }) {
  const [loading, setLoading] = useState(false);

  async function buy() {
    setLoading(true);
    try {
      const res = await fetch("/api/payments/create-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      if (data.error === "payos_not_configured") {
        toast.message("Thanh toán sắp có", {
          description: "Đang cấu hình cổng PayOS — sẽ bật trong bước tới.",
        });
      } else {
        toast.error("Chưa tạo được link thanh toán", { description: data.error });
      }
    } catch {
      toast.error("Lỗi mạng, thử lại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button className="w-full" onClick={buy} disabled={loading}>
      {loading ? "Đang xử lý..." : label}
    </Button>
  );
}
