"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useT } from "@/components/landing/i18n";
import { Button } from "@/components/ui/button";

export function AdminPaymentActions({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const t = useT();
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
      toast.success(action === "approve" ? t.admin.approved : t.admin.rejected);
      router.refresh();
    } else {
      toast.error(t.admin.error);
    }
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" className="flex-1" onClick={() => act("approve")} disabled={loading}>
        {t.admin.approve}
      </Button>
      <Button size="sm" variant="outline" className="flex-1" onClick={() => act("reject")} disabled={loading}>
        {t.admin.reject}
      </Button>
    </div>
  );
}
