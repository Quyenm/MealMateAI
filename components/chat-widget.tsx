"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageCircle, X, Send } from "lucide-react";
import { useT } from "@/components/landing/i18n";

type Msg = { role: "user" | "assistant"; content: string };

/** Floating cooking-assistant chat bubble, mounted app-wide for signed-in users. */
export function ChatWidget() {
  const c = useT().chat;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [limited, setLimited] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, open]);

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
        setMessages((m) => m.slice(0, -2));
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

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label={c.title}
        className="fixed bottom-24 right-4 z-50 flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-[#33afe0] to-[#15689a] text-white shadow-float ring-1 ring-white/30 transition hover:scale-105 active:scale-95 lg:bottom-6 lg:right-6"
      >
        <MessageCircle className="size-6" />
      </button>
    );
  }

  return (
    <div className="fixed inset-x-3 bottom-3 top-16 z-50 flex flex-col overflow-hidden rounded-3xl bg-card shadow-float ring-1 ring-white/60 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:top-auto sm:h-[600px] sm:max-h-[82vh] sm:w-[380px]">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MessageCircle className="size-4" />
          </span>
          <span className="text-sm font-bold tracking-tight">{c.title}</span>
        </div>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
        {messages.length === 0 && !limited && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">{c.greeting}</p>
            <div className="flex flex-col gap-2">
              {c.samples.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-2xl bg-muted px-3 py-2 text-left text-xs font-medium transition hover:bg-primary/10 hover:text-primary"
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">{c.disclaimer}</p>
          </div>
        )}

        {messages.map((m, i) => {
          const waiting = m.role === "assistant" && !m.content && busy && i === messages.length - 1;
          return (
            <div
              key={i}
              className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                m.role === "user" ? "self-end bg-primary text-primary-foreground" : "self-start bg-muted"
              }`}
            >
              {waiting ? (
                <span className="inline-flex gap-1 align-middle">
                  <span className="size-1.5 animate-bounce rounded-full bg-current opacity-50" />
                  <span
                    className="size-1.5 animate-bounce rounded-full bg-current opacity-50"
                    style={{ animationDelay: "0.15s" }}
                  />
                  <span
                    className="size-1.5 animate-bounce rounded-full bg-current opacity-50"
                    style={{ animationDelay: "0.3s" }}
                  />
                </span>
              ) : (
                m.content
              )}
            </div>
          );
        })}

        {limited && (
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-muted p-4 text-center">
            <p className="text-sm font-semibold">{c.limitTitle}</p>
            <p className="text-xs text-muted-foreground">{c.limitBody}</p>
            <Link
              href="/upgrade"
              onClick={() => setOpen(false)}
              className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
            >
              {c.limitCta}
            </Link>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 border-t border-border p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={500}
          placeholder={c.placeholder}
          disabled={limited}
          className="flex-1 rounded-2xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={busy || limited || !input.trim()}
          aria-label={c.send}
          className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}
