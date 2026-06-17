"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Send } from "lucide-react";
import { useT } from "@/components/landing/i18n";

type Msg = { role: "user" | "assistant"; content: string };

export function ChatView() {
  const c = useT().chat;
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [limited, setLimited] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function send(text: string) {
    const msg = text.trim();
    if (!msg || busy) return;
    setInput("");
    const history = messages.slice(-8);
    setMessages((m) => [...m, { role: "user", content: msg }, { role: "assistant", content: "" }]);
    setBusy(true);
    const patchLast = (content: string) =>
      setMessages((m) => {
        const cp = [...m];
        cp[cp.length - 1] = { role: "assistant", content };
        return cp;
      });
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history }),
      });
      if (res.status === 402) {
        setLimited(true);
        setMessages((m) => m.slice(0, -2)); // drop the optimistic user + assistant pair
        return;
      }
      if (!res.ok || !res.body) {
        patchLast(c.error);
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        patchLast(acc);
      }
      if (!acc) patchLast(c.error);
    } catch {
      patchLast(c.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      {messages.length === 0 && !limited && (
        <div className="flex flex-col gap-3 rounded-3xl bg-card p-5 shadow-card ring-1 ring-border/60">
          <p className="text-sm text-muted-foreground">{c.greeting}</p>
          <div className="flex flex-wrap gap-2">
            {c.samples.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-full bg-muted px-3 py-1.5 text-left text-xs font-medium transition hover:bg-primary/10 hover:text-primary"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {messages.map((m, i) => {
          const waiting = m.role === "assistant" && !m.content && busy && i === messages.length - 1;
          return (
            <div
              key={i}
              className={`max-w-[85%] whitespace-pre-wrap rounded-3xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "self-end bg-primary text-primary-foreground"
                  : "self-start bg-card shadow-card ring-1 ring-border/60"
              }`}
            >
              {waiting ? (
                <span className="inline-flex gap-1 align-middle">
                  <span className="size-1.5 animate-bounce rounded-full bg-current opacity-60" />
                  <span
                    className="size-1.5 animate-bounce rounded-full bg-current opacity-60"
                    style={{ animationDelay: "0.15s" }}
                  />
                  <span
                    className="size-1.5 animate-bounce rounded-full bg-current opacity-60"
                    style={{ animationDelay: "0.3s" }}
                  />
                </span>
              ) : (
                m.content
              )}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {limited && (
        <div className="flex flex-col items-center gap-2 rounded-3xl bg-card p-5 text-center shadow-card ring-1 ring-border/60">
          <p className="text-sm font-semibold">{c.limitTitle}</p>
          <p className="text-sm text-muted-foreground">{c.limitBody}</p>
          <Link
            href="/upgrade"
            className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            {c.limitCta}
          </Link>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-0 flex items-end gap-2 bg-background/80 py-2 backdrop-blur"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={500}
          placeholder={c.placeholder}
          disabled={limited}
          className="flex-1 rounded-2xl border border-border bg-card px-4 py-2.5 text-sm outline-none transition focus:border-primary disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={busy || limited || !input.trim()}
          aria-label={c.send}
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
        >
          <Send className="size-5" />
        </button>
      </form>

      <p className="text-center text-[11px] text-muted-foreground">{c.disclaimer}</p>
    </div>
  );
}
