import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useRef, useState } from "react";
import { aiChat, getConversation, listConversations } from "@/lib/fn/ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { toast } from "sonner";

const schema = z.object({
  q: z.string().optional(),
  propertyId: z.string().optional(),
});

export const Route = createFileRoute("/studio")({
  validateSearch: schema,
  component: Studio,
});

function Studio() {
  const { q, propertyId } = Route.useSearch();
  const { user, isPending } = useCurrentUserState();
  const [input, setInput] = useState(q ?? "");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [convos, setConvos] = useState<{ id: string; title: string | null }[]>([]);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    listConversations().then(setConvos).catch(() => setConvos([]));
  }, [user, conversationId]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages, busy]);

  if (isPending) return <div className="p-10 text-muted">Loading session…</div>;
  if (!user) return <RedirectToSignIn />;

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setBusy(true);
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    try {
      const r = await aiChat({ data: { message: text, conversationId, propertyId } });
      if (!r.ok) {
        toast.error(r.error);
        setMessages((m) => [...m, { role: "assistant", content: r.error }]);
      } else {
        setConversationId(r.conversationId);
        setMessages((m) => [...m, { role: "assistant", content: r.text }]);
      }
    } catch (e) {
      const msg = e instanceof Error && e.message === "Unauthorized" ? "Sign in required." : "Intelligence request failed.";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-[1480px] gap-6 px-5 py-8 md:grid-cols-[240px_1fr] md:px-8">
      <aside className="rounded-xl border border-border p-4">
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Threads</p>
        <button
          type="button"
          className="mt-3 w-full rounded-md border border-border px-3 py-2 text-left text-sm"
          onClick={() => {
            setConversationId(undefined);
            setMessages([]);
          }}
        >
          New thread
        </button>
        <ul className="mt-3 space-y-1">
          {convos.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="w-full truncate rounded-md px-2 py-2 text-left text-sm hover:bg-bg-subtle"
                onClick={async () => {
                  setConversationId(c.id);
                  const r = await getConversation({ data: { id: c.id } });
                  setMessages(r.messages);
                }}
              >
                {c.title || "Untitled"}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section className="flex min-h-[70vh] flex-col rounded-xl border border-border">
        <header className="border-b border-border p-5">
          <h1 className="font-display text-3xl">Intelligence</h1>
          <p className="mt-1 text-sm text-muted">
            Grounded in the Atconiz catalog. Tools search, value, and calculate — they cannot invent homes.
          </p>
        </header>
        <div ref={scroller} className="flex-1 space-y-4 overflow-auto p-5">
          {messages.length === 0 ? (
            <p className="text-muted">
              Try: “Find five family homes under my budget, compare them, and estimate monthly financing.”
            </p>
          ) : null}
          {messages.map((m, i) => (
            <div key={`${m.role}-${i}`} className={m.role === "user" ? "ml-8 rounded-lg bg-bg-subtle p-4" : "mr-8 rounded-lg border border-border p-4"}>
              <p className="text-[11px] uppercase tracking-[0.14em] text-subtle">{m.role === "user" ? "You" : "Atconiz"}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
            </div>
          ))}
          {busy ? <p className="text-sm text-muted">Researching catalog…</p> : null}
        </div>
        <form
          className="border-t border-border p-4"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <Textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask with real constraints…" />
          <Button type="submit" className="mt-3" disabled={busy}>
            Send
          </Button>
        </form>
      </section>
    </div>
  );
}
