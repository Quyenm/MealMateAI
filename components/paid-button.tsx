"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function PaidButton() {
  const router = useRouter();
  return (
    <Button
      className="w-full"
      onClick={() => {
        toast.success("Đã ghi nhận!", {
          description: "Gói sẽ được kích hoạt sau khi xác nhận chuyển khoản (thường vài phút).",
        });
        router.push("/home");
      }}
    >
      Tôi đã chuyển khoản
    </Button>
  );
}
