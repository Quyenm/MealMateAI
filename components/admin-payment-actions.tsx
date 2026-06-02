"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function AdminPaymentActions({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function act(action: "approve" | "reject") {
    setLoading(true);
    const res = await fetch("/api/admin/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId, action }),
    });
    setLoading(false);
    if (res.ok) {
      toast.success(action === "approve" ? "Đã duyệt + nâng gói" : "Đã từ chối");
      router.refresh();
    } else {
      toast.error("Lỗi, thử lại");
    }
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={() => act("approve")} disabled={loading}>
        Duyệt
      </Button>
      <Button size="sm" variant="outline" onClick={() => act("reject")} disabled={loading}>
        Từ chối
      </Button>
    </div>
  );
}
