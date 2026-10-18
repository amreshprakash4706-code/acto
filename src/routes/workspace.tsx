import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useState } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  adminOverview,
  agentDashboard,
  addLeadNote,
  createListing,
  myProfile,
  pendingReviews,
  moderateReview,
  refreshLeadScores,
  setUserRole,
  updateLeadStage,
  updateProfile,
  updateViewingStatus,
  userDashboard,
} from "@/lib/fn/workspace";
import { listLeadNotes, listTasks, completeTask } from "@/lib/fn/desk";
import { DealsPane } from "@/components/workspace/deals";
import { listNotifications, markNotificationsRead, mySavedSearches, myViewings } from "@/lib/fn/engagement";
import { PropertyTile } from "@/components/property/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { asString } from "@/lib/utils";
import { toast } from "sonner";
import { REFERENCE_FX } from "@/lib/atconiz/format";
import { useAppStore } from "@/lib/atconiz/store";
import type { Profile } from "@/lib/atconiz/types";

const schema = z.object({ tab: z.string().optional(), property: z.string().optional() });

export const Route = createFileRoute("/workspace")({
  validateSearch: schema,
  component: Workspace,
});

const TABS = ["overview", "saved", "viewings", "alerts", "deals", "crm", "atelier", "profile"] as const;

function Workspace() {
  const { tab, property } = Route.useSearch();
  const active = (tab && TABS.includes(tab as (typeof TABS)[number]) ? tab : "overview") as (typeof TABS)[number];
  const { user, isPending } = useCurrentUserState();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!user) return;
    myProfile().then(setProfile).catch(() => setProfile(null));
  }, [user]);

  if (isPending) return <div className="p-10 text-muted">Loading workspace…</div>;
  if (!user) return <RedirectToSignIn />;

  return (
    <div className="mx-auto max-w-[1480px] px-5 py-10 md:px-8">
      <h1 className="font-display text-4xl">Workspace</h1>
      <p className="mt-1 text-sm text-muted">
        {profile?.displayName || user.displayName || user.primaryEmail} · {profile?.role ?? "USER"}
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.filter((t) => {
          if (t === "crm") return profile?.role === "AGENT" || profile?.role === "ADMIN";
          if (t === "atelier") return profile?.role === "ADMIN";
          return true;
        }).map((t) => (
          <Link
            key={t}
            to="/workspace"
            search={{ tab: t }}
            className={`rounded-full border px-4 py-2 text-sm capitalize ${active === t ? "border-accent bg-bg-subtle" : "border-border"}`}
          >
            {t}
          </Link>
        ))}
      </div>
      <div className="mt-8">
        {active === "overview" ? <Overview /> : null}
        {active === "saved" ? <Saved /> : null}
        {active === "viewings" ? <Viewings role={profile?.role} /> : null}
        {active === "alerts" ? <Alerts /> : null}
        {active === "deals" ? <DealsPane propertyId={property} isDesk={profile?.role === "AGENT" || profile?.role === "ADMIN"} /> : null}
        {active === "crm" ? <Crm /> : null}
        {active === "atelier" ? <Atelier /> : null}
        {active === "profile" ? <ProfilePane profile={profile} onSave={setProfile} /> : null}
      </div>
    </div>
  );
}

function Overview() {
  const [data, setData] = useState<Awaited<ReturnType<typeof userDashboard>> | null>(null);
  useEffect(() => {
    userDashboard().then(setData).catch(() => setData(null));
  }, []);
  if (!data) return <p className="text-muted">Loading overview…</p>;
  return (
    <div>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Saved homes", data.favoriteCount],
          ["Viewings", data.viewingCount],
          ["Saved searches", data.savedSearchCount],
        ].map(([k, v]) => (
          <div key={String(k)} className="rounded-xl border border-border p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">{k}</p>
            <p className="mt-2 font-display text-4xl tabular">{v}</p>
          </div>
        ))}
      </div>
      <h2 className="mt-10 font-display text-2xl">Because you saved</h2>
      <p className="text-sm text-muted">Ranked from your saved cities and types. Empty until you save a residence.</p>
      <div className="mt-4 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {data.recommendations.map((p) => (
          <PropertyTile key={p.id} property={p} />
        ))}
      </div>
    </div>
  );
}

function savedExploreSearch(raw: unknown) {
  let obj: Record<string, unknown> = {};
  if (typeof raw === "string" && raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object") obj = parsed as Record<string, unknown>;
    } catch {
      obj = {};
    }
  }
  const text = (value: unknown) => {
    if (typeof value === "string" && value) return value;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    return undefined;
  };
  const listing = obj.listingType === "SALE" || obj.listingType === "RENT" ? obj.listingType : undefined;
  return {
    q: text(obj.q),
    city: text(obj.city),
    type: text(obj.type),
    listingType: listing as "SALE" | "RENT" | undefined,
    minBeds: text(obj.minBeds),
    minPrice: text(obj.minPrice),
    maxPrice: text(obj.maxPrice),
  };
}

function Saved() {
  const [data, setData] = useState<Awaited<ReturnType<typeof userDashboard>> | null>(null);
  const [searches, setSearches] = useState<Record<string, unknown>[]>([]);
  useEffect(() => {
    userDashboard().then(setData).catch(() => setData(null));
    mySavedSearches().then(setSearches).catch(() => setSearches([]));
  }, []);
  return (
    <div className="space-y-8">
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {data?.favorites.length ? (
          data.favorites.map((p) => <PropertyTile key={p.id} property={p} favorited />)
        ) : (
          <p className="text-muted">No saved residences yet.</p>
        )}
      </div>
      <div>
        <h2 className="font-display text-2xl">Saved searches</h2>
        <ul className="mt-3 space-y-2">
          {searches.length === 0 ? <li className="text-sm text-muted">No saved searches yet.</li> : null}
          {searches.map((s) => {
            const search = savedExploreSearch(s.query);
            const bits = [search.city, search.type, search.listingType, search.minBeds ? `${search.minBeds}+ beds` : "", search.q]
              .filter(Boolean)
              .join(" · ");
            return (
              <li key={asString(s.id)}>
                <Link to="/explore" search={search} className="block rounded-lg border border-border p-4 hover:bg-bg-subtle">
                  <p className="font-medium">{asString(s.name)}</p>
                  <p className="mt-1 text-sm text-muted">{bits || "All residences"}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function Viewings({ role }: { role?: string }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  useEffect(() => {
    myViewings().then(setRows).catch(() => setRows([]));
  }, []);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted">
            <th className="p-3">Residence</th>
            <th className="p-3">Status</th>
            <th className="p-3">Requested</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={asString(r.id)} className="border-t border-border">
              <td className="p-3">{asString(r.property_title)}</td>
              <td className="p-3">
                <Badge>{asString(r.status)}</Badge>
              </td>
              <td className="p-3 text-muted">{asString(r.requested_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {role === "ADMIN" || role === "AGENT" ? (
        <p className="mt-4 text-sm text-muted">Manage incoming requests in the CRM tab.</p>
      ) : null}
    </div>
  );
}

function Alerts() {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  useEffect(() => {
    listNotifications()
      .then((r) => setItems(r.items))
      .catch(() => setItems([]));
  }, []);
  return (
    <div>
      <Button
        variant="secondary"
        size="sm"
        onClick={async () => {
          await markNotificationsRead();
          const r = await listNotifications();
          setItems(r.items);
        }}
      >
        Mark all read
      </Button>
      <ul className="mt-4 space-y-2">
        {items.length === 0 ? <li className="text-muted">No notifications yet.</li> : null}
        {items.map((n) => (
          <li key={asString(n.id)} className="rounded-lg border border-border p-4">
            <p className="font-medium">{asString(n.title)}</p>
            <p className="text-sm text-muted">{asString(n.body)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Crm() {
  const [data, setData] = useState<Awaited<ReturnType<typeof agentDashboard>> | null>(null);
  const [tasks, setTasks] = useState<Awaited<ReturnType<typeof listTasks>>>([]);
  const [activeLead, setActiveLead] = useState<string | null>(null);
  const [notes, setNotes] = useState<Awaited<ReturnType<typeof listLeadNotes>>>([]);
  const [note, setNote] = useState("");
  const [title, setTitle] = useState("");
  const [city, setCity] = useState("");
  const [price, setPrice] = useState(1000000);
  useEffect(() => {
    agentDashboard().then(setData).catch(() => setData(null));
    listTasks().then(setTasks).catch(() => setTasks([]));
  }, []);
  useEffect(() => {
    if (!activeLead) return;
    listLeadNotes({ data: { leadId: activeLead } }).then(setNotes).catch(() => setNotes([]));
  }, [activeLead]);
  if (!data) return <p className="text-muted">Loading desk…</p>;
  return (
    <div className="space-y-10">
      <div className="flex flex-wrap gap-3">
        <Badge>Open viewings {data.openViewings}</Badge>
        <Badge>Leads {data.leads.length}</Badge>
        <Button
          size="sm"
          variant="secondary"
          onClick={async () => {
            await refreshLeadScores();
            agentDashboard().then(setData);
            toast.success("Scores recomputed from engagement.");
          }}
        >
          Refresh scores
        </Button>
      </div>
      <section>
        <h2 className="font-display text-2xl">Follow-ups</h2>
        <ul className="mt-3 space-y-2">
          {tasks.filter((task) => task.status === "OPEN").length === 0 ? (
            <li className="text-sm text-muted">No open tasks.</li>
          ) : null}
          {tasks
            .filter((task) => task.status === "OPEN")
            .map((task) => (
              <li key={task.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
                <span>
                  {task.title}
                  {task.propertyTitle ? ` · ${task.propertyTitle}` : ""}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    await completeTask({ data: { taskId: task.id } });
                    listTasks().then(setTasks);
                  }}
                >
                  Done
                </Button>
              </li>
            ))}
        </ul>
      </section>
      <section>
        <h2 className="font-display text-2xl">Viewing desk</h2>
        <ul className="mt-3 space-y-2">
          {data.viewings.map((v) => (
            <li key={asString(v.id)} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
              <span>
                {asString(v.property_title)} · {asString(v.status)}
              </span>
              <Select
                className="w-44"
                value={asString(v.status)}
                onChange={async (e) => {
                  await updateViewingStatus({
                    data: {
                      viewingId: asString(v.id),
                      status: e.target.value as "CONFIRMED",
                    },
                  });
                  agentDashboard().then(setData);
                  listTasks().then(setTasks).catch(() => setTasks([]));
                }}
              >
                {["REQUESTED", "CONFIRMED", "RESCHEDULED", "COMPLETED", "CANCELLED", "REJECTED"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="font-display text-2xl">Pipeline</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th className="p-3">Lead</th>
                <th className="p-3">Property</th>
                <th className="p-3">Score</th>
                <th className="p-3">Stage</th>
              </tr>
            </thead>
            <tbody>
              {data.leads.map((l) => (
                <tr key={asString(l.id)} className="border-t border-border">
                  <td className="p-3">
                    <button type="button" className="text-left" onClick={() => setActiveLead(asString(l.id))}>
                      {asString(l.source)}
                    </button>
                  </td>
                  <td className="p-3">{asString(l.property_title)}</td>
                  <td className="p-3 tabular">{asString(l.score)}</td>
                  <td className="p-3">
                    <Select
                      value={asString(l.stage)}
                      onChange={async (e) => {
                        await updateLeadStage({
                          data: { leadId: asString(l.id), stage: e.target.value as "NEW" },
                        });
                        agentDashboard().then(setData);
                      }}
                    >
                      {["NEW", "CONTACTED", "QUALIFIED", "VIEWING", "NEGOTIATING", "WON", "LOST"].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {activeLead ? (
            <form
              className="mt-4 max-w-xl space-y-2"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await addLeadNote({ data: { leadId: activeLead, body: note } });
                  setNote("");
                  setNotes(await listLeadNotes({ data: { leadId: activeLead } }));
                } catch {
                  toast.error("Could not save the note.");
                }
              }}
            >
              <Label>Note on {activeLead}</Label>
              <ul className="space-y-1 text-sm text-muted">
                {notes.length === 0 ? <li>No notes yet.</li> : null}
                {notes.map((item) => (
                  <li key={item.id}>{item.body}</li>
                ))}
              </ul>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} required />
              <Button type="submit" size="sm" variant="secondary">
                Add note
              </Button>
            </form>
          ) : (
            <p className="mt-3 text-sm text-muted">Select a lead source to add a private note.</p>
          )}
        </div>
      </section>
      <section>
        <h2 className="font-display text-2xl">New listing</h2>
        <form
          className="mt-4 grid gap-3 md:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await createListing({
                data: {
                  title,
                  city,
                  country: "United States",
                  price,
                  currency: "USD",
                  listingType: "SALE",
                  propertyType: "Apartment",
                },
              });
              toast.success("Listing published to the catalog.");
              setTitle("");
              agentDashboard().then(setData);
            } catch {
              toast.error("Could not create listing.");
            }
          }}
        >
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <Label>City</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} required />
          </div>
          <div>
            <Label>Price USD</Label>
            <Input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
          </div>
          <div className="flex items-end">
            <Button type="submit">Publish</Button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Atelier() {
  const [data, setData] = useState<Awaited<ReturnType<typeof adminOverview>> | null>(null);
  const [reviews, setReviews] = useState<Awaited<ReturnType<typeof pendingReviews>>>([]);
  useEffect(() => {
    adminOverview().then(setData).catch(() => setData(null));
    pendingReviews().then(setReviews).catch(() => setReviews([]));
  }, []);
  if (!data) return <p className="text-muted">Operations require an admin role.</p>;
  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["People", data.users],
          ["Agents", data.agents],
          ["Residences", data.properties],
          ["AI calls", data.aiCalls],
        ].map(([k, v]) => (
          <div key={String(k)} className="rounded-xl border border-border p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">{k}</p>
            <p className="mt-2 font-display text-3xl tabular">{v}</p>
          </div>
        ))}
      </div>
      <section>
        <h2 className="font-display text-2xl">Roles</h2>
        <ul className="mt-3 space-y-2">
          {data.profiles.map((p) => (
            <li key={p.userId} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
              <span>
                {p.displayName || p.userId} · {p.role}
              </span>
              <Select
                className="w-40"
                value={p.role}
                onChange={async (e) => {
                  await setUserRole({ data: { userId: p.userId, role: e.target.value as "USER" } });
                  adminOverview().then(setData);
                }}
              >
                {["USER", "AGENT", "ADMIN"].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </Select>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="font-display text-2xl">Review moderation</h2>
        <ul className="mt-3 space-y-2">
          {reviews.length === 0 ? <li className="text-sm text-muted">No reviews on file.</li> : null}
          {reviews.map((review) => (
            <li key={review.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
              <span className="text-sm">
                {review.rating}/5 · {review.moderation_status} · {review.body}
              </span>
              <Select
                className="w-40"
                value={review.moderation_status}
                onChange={async (e) => {
                  await moderateReview({
                    data: { reviewId: review.id, status: e.target.value as "APPROVED" },
                  });
                  pendingReviews().then(setReviews);
                }}
              >
                {["APPROVED", "REJECTED", "HIDDEN"].map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </Select>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="font-display text-2xl">Audit</h2>
        <ul className="mt-3 space-y-1 text-sm text-muted">
          {data.audit.map((a) => (
            <li key={asString(a.id)}>
              {asString(a.created_at)} · {asString(a.action)} · {asString(a.resource_id)}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ProfilePane({ profile, onSave }: { profile: Profile | null; onSave: (p: Profile) => void }) {
  const currency = useAppStore((s) => s.currency);
  const setCurrency = useAppStore((s) => s.setCurrency);
  const [name, setName] = useState(profile?.displayName ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [agency, setAgency] = useState(profile?.agencyName ?? "");
  const [role, setRole] = useState<"USER" | "AGENT">(profile?.role === "AGENT" ? "AGENT" : "USER");

  return (
    <form
      className="max-w-lg space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          const p = await updateProfile({
            data: { displayName: name, phone, bio, agencyName: agency, role: profile?.role === "ADMIN" ? undefined : role },
          });
          onSave(p);
          toast.success("Profile updated.");
        } catch {
          toast.error("Could not update profile.");
        }
      }}
    >
      <div>
        <Label>Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <Label>Phone</Label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div>
        <Label>Bio</Label>
        <Textarea value={bio} onChange={(e) => setBio(e.target.value)} />
      </div>
      <div>
        <Label>Agency</Label>
        <Input value={agency} onChange={(e) => setAgency(e.target.value)} />
      </div>
      {profile?.role !== "ADMIN" ? (
        <div>
          <Label>Workspace role</Label>
          <Select value={role} onChange={(e) => setRole(e.target.value as "USER" | "AGENT")}>
            <option value="USER">Private client</option>
            <option value="AGENT">Agent</option>
          </Select>
        </div>
      ) : null}
      <div>
        <Label>Display currency (reference FX)</Label>
        <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
          {Object.keys(REFERENCE_FX).map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
      </div>
      <Button type="submit">Save profile</Button>
    </form>
  );
}
