import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  completeTask,
  getThread,
  listOffers,
  listTasks,
  listThreads,
  openPropertyThread,
  postMessage,
  updateOfferStatus,
} from "@/lib/fn/desk";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/property/price";
import { toast } from "sonner";

type ThreadRow = Awaited<ReturnType<typeof listThreads>>[number];
type Message = Awaited<ReturnType<typeof getThread>>["messages"][number];
type OfferRow = Awaited<ReturnType<typeof listOffers>>[number];
type TaskRow = Awaited<ReturnType<typeof listTasks>>[number];

export function DealsPane({ propertyId, isDesk }: { propertyId?: string; isDesk: boolean }) {
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [sending, setSending] = useState(false);

  async function refreshLists() {
    const [nextThreads, nextOffers] = await Promise.all([
      listThreads().catch(() => [] as ThreadRow[]),
      listOffers().catch(() => [] as OfferRow[]),
    ]);
    setThreads(nextThreads);
    setOffers(nextOffers);
    if (isDesk) {
      setTasks(await listTasks().catch(() => []));
    }
  }

  async function loadThread(threadId: string) {
    setActive(threadId);
    const detail = await getThread({ data: { threadId } });
    setMessages(detail.messages);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (propertyId) {
          const opened = await openPropertyThread({ data: { propertyId } });
          if (cancelled) return;
          setActive(opened.thread.id);
          setMessages(opened.messages);
        }
        if (!cancelled) await refreshLists();
      } catch {
        if (!cancelled) toast.error("Could not load the deal desk.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [propertyId, isDesk]);

  async function send() {
    if (!active || !draft.trim() || sending) return;
    setSending(true);
    try {
      await postMessage({ data: { threadId: active, body: draft.trim() } });
      setDraft("");
      await loadThread(active);
      await refreshLists();
    } catch {
      toast.error("Message was not sent.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-8">
        <section>
          <h2 className="font-display text-2xl">Threads</h2>
          <p className="mt-1 text-sm text-muted">Private notes between you and the listing advisor. Not email.</p>
          <ul className="mt-3 space-y-2">
            {threads.length === 0 ? <li className="text-sm text-muted">No threads yet. Open one from a residence.</li> : null}
            {threads.map((thread) => (
              <li key={thread.id}>
                <button
                  type="button"
                  onClick={() => loadThread(thread.id).catch(() => toast.error("Could not open thread."))}
                  className={`w-full rounded-lg border px-4 py-3 text-left ${active === thread.id ? "border-accent bg-bg-subtle" : "border-border"}`}
                >
                  <p className="font-medium">{thread.subject || thread.propertyTitle || "Thread"}</p>
                  <p className="text-sm text-muted">{thread.propertyTitle}</p>
                </button>
              </li>
            ))}
          </ul>
        </section>
        {isDesk ? (
          <section>
            <h2 className="font-display text-2xl">Tasks</h2>
            <ul className="mt-3 space-y-2">
              {tasks.length === 0 ? <li className="text-sm text-muted">No follow-ups yet. Confirming a viewing creates one.</li> : null}
              {tasks.map((task) => (
                <li key={task.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
                  <div>
                    <p className="font-medium">{task.title}</p>
                    <p className="text-sm text-muted">
                      {task.propertyTitle} · {task.status}
                    </p>
                  </div>
                  {task.status === "OPEN" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        try {
                          await completeTask({ data: { taskId: task.id } });
                          setTasks(await listTasks());
                        } catch {
                          toast.error("Could not complete the task.");
                        }
                      }}
                    >
                      Done
                    </Button>
                  ) : (
                    <Badge>{task.status}</Badge>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
      <div className="space-y-8">
        <section className="rounded-xl border border-border p-4">
          <h2 className="font-display text-2xl">Conversation</h2>
          <div className="mt-4 max-h-80 space-y-3 overflow-y-auto">
            {messages.length === 0 ? <p className="text-sm text-muted">No messages in this thread.</p> : null}
            {messages.map((message) => (
              <p
                key={message.id}
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${message.mine ? "ml-auto bg-bg-subtle" : "border border-border"}`}
              >
                {message.body}
              </p>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write to the advisor…" disabled={!active} />
            <Button type="button" onClick={send} disabled={!active || sending}>
              Send
            </Button>
          </div>
        </section>
        <section>
          <h2 className="font-display text-2xl">Expressions of interest</h2>
          <p className="mt-1 text-sm text-muted">Recorded on-platform. Not a binding contract.</p>
          <ul className="mt-3 space-y-2">
            {offers.length === 0 ? <li className="text-sm text-muted">None yet.</li> : null}
            {offers.map((offer) => (
              <li key={offer.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Link to="/properties/$id" params={{ id: offer.propertyId }} className="font-medium">
                      {offer.propertyTitle}
                    </Link>
                    <p className="text-sm text-champagne">
                      <Price amount={offer.amount} currency={offer.currency} compact />
                    </p>
                  </div>
                  <Badge>{offer.status}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {offer.mine && ["SUBMITTED", "COUNTERED", "DRAFT"].includes(offer.status) ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        try {
                          await updateOfferStatus({ data: { offerId: offer.id, status: "WITHDRAWN" } });
                          setOffers(await listOffers());
                        } catch {
                          toast.error("Could not withdraw.");
                        }
                      }}
                    >
                      Withdraw
                    </Button>
                  ) : null}
                  {offer.canModerate
                    ? (["COUNTERED", "ACCEPTED", "REJECTED"] as const).map((status) => (
                        <Button
                          key={status}
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            try {
                              await updateOfferStatus({ data: { offerId: offer.id, status } });
                              setOffers(await listOffers());
                              toast.success(`Marked ${status.toLowerCase()}.`);
                            } catch {
                              toast.error("Could not update the record.");
                            }
                          }}
                        >
                          {status}
                        </Button>
                      ))
                    : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
