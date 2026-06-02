"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function UpgradeButton({ tier, label }: { tier: string; label: string }) {
  const router = useRouter();
  return (
    <Button className="w-full" onClick={() => router.push(`/upgrade/pay?tier=${tier}`)}>
      {label}
    </Button>
  );
}
