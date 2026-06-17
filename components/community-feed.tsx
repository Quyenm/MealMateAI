"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, UtensilsCrossed, Flag } from "lucide-react";
import { toast } from "sonner";
import { useT, useLang } from "@/components/landing/i18n";

type Post = {
  id: string;
  dish_title: string;
  note: string | null;
  image_url: string;
  created_at: string;
  author: string;
  mine: boolean;
};

function timeAgo(iso: string, en: boolean): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return en ? "just now" : "vừa xong";
  if (m < 60) return en ? `${m}m ago` : `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return en ? `${h}h ago` : `${h} giờ trước`;
  const d = Math.floor(h / 24);
  return en ? `${d}d ago` : `${d} ngày trước`;
}

export function CommunityFeed({ posts }: { posts: Post[] }) {
  const t = useT();
  const { lang } = useLang();
  const en = lang === "en";
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [reported, setReported] = useState<Set<string>>(new Set());

  async function report(id: string) {
    setReported((s) => new Set(s).add(id));
    try {
      const res = await fetch("/api/community/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: id }),
      });
      if (!res.ok) throw new Error();
      toast.success(t.community.reported);
    } catch {
      toast.error(t.scan.toast.netErr);
    }
  }

  async function remove(id: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/community?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(t.community.deleted);
      router.refresh();
    } catch {
      toast.error(t.scan.toast.netErr);
    } finally {
      setBusy(null);
    }
  }

  if (!posts.length) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-3xl bg-card p-10 text-center shadow-card ring-1 ring-white/60">
        <UtensilsCrossed className="size-8 text-[#b85a2e]/40" />
        <p className="text-sm text-muted-foreground">{t.community.empty}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {posts.map((p) => (
        <article key={p.id} className="overflow-hidden rounded-3xl bg-card shadow-card ring-1 ring-white/60">
          <div className="relative aspect-square w-full overflow-hidden bg-muted sm:aspect-[4/3]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.image_url} alt={p.dish_title} className="h-full w-full object-cover" />
          </div>
          <div className="flex flex-col gap-1.5 p-4">
            <div className="flex items-start justify-between gap-2">
              <span className="font-bold tracking-tight">{p.dish_title}</span>
              {p.mine ? (
                <button
                  type="button"
                  disabled={busy === p.id}
                  onClick={() => remove(p.id)}
                  aria-label={t.community.delete}
                  className="text-muted-foreground/50 transition hover:text-[#c8102e] disabled:opacity-40"
                >
                  <Trash2 className="size-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={reported.has(p.id)}
                  onClick={() => report(p.id)}
                  aria-label={t.community.report}
                  title={t.community.report}
                  className="text-muted-foreground/40 transition hover:text-[#c8102e] disabled:opacity-40"
                >
                  <Flag className="size-4" />
                </button>
              )}
            </div>
            {p.note && <p className="text-sm text-muted-foreground">{p.note}</p>}
            <p className="text-xs text-muted-foreground/80">
              {p.author} · {timeAgo(p.created_at, en)}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}
