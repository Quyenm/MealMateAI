"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/components/landing/i18n";

/** Inline 1–5 star rating for a dish; upserts to /api/ratings on click. */
export function StarRating({
  scanId,
  dishIndex,
  dishTitle,
  initial = 0,
}: {
  scanId: string;
  dishIndex: number;
  dishTitle: string;
  initial?: number;
}) {
  const t = useT();
  const [stars, setStars] = useState(initial);
  const [hover, setHover] = useState(0);

  async function rate(n: number) {
    const prev = stars;
    setStars(n);
    try {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scan_id: scanId, dish_index: dishIndex, dish_title: dishTitle, stars: n }),
      });
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      setStars(prev);
      toast.error(t.scan.toast.netErr);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">{t.scan.rateLabel}</span>
      <div className="flex items-center gap-0.5" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onClick={() => rate(n)}
            aria-label={`${n}`}
            className="p-0.5"
          >
            <Star
              className={`size-[18px] transition ${
                (hover || stars) >= n ? "fill-[#f7b267] text-[#f7b267]" : "text-muted-foreground/30"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
