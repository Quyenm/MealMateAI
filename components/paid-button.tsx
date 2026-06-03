"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useT } from "@/components/landing/i18n";
import { Button } from "@/components/ui/button";

export function PaidButton({ tier }: { tier: string }) {
  const router = useRouter();
  const t = useT();
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
      toast.success(t.pay.sent, { description: t.pay.sentDesc });
      router.push("/home");
    } catch {
      toast.error(t.pay.failed, { description: t.pay.failedDesc });
      setLoading(false);
    }
  }

  return (
    <Button className="w-full shadow-float" onClick={confirm} disabled={loading}>
      {loading ? t.pay.sending : t.pay.confirmBtn}
    </Button>
  );
}
