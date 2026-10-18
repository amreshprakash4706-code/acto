import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { ensureProfile, requireRole } from "@/lib/server/profile";
import { audit, notify } from "@/lib/server/notify";
import { asNumber, asString, nid } from "@/lib/utils";
import type { Role } from "@/lib/atconiz/types";

const OFFER_STATUS = ["DRAFT", "SUBMITTED", "COUNTERED", "ACCEPTED", "REJECTED", "WITHDRAWN"] as const;

async function roleOf(userId: string): Promise<Role> {
  const profile = await ensureProfile(userId);
  return profile.role;
}

function canSeeThread(row: { buyer_id: string; agent_id: string | null }, userId: string, role: Role) {
  if (role === "ADMIN") return true;
  if (row.buyer_id === userId) return true;
  if (row.agent_id === userId) return true;
  if (role === "AGENT" && !row.agent_id) return true;
  return false;
}

export const listThreads = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const role = await roleOf(context.userId);
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select t.id, t.property_id, t.buyer_id, t.agent_id, t.subject, t.updated_at, p.title as property_title
      from threads t
      left join properties p on p.id = t.property_id
      where t.buyer_id = ${context.userId}
         or t.agent_id = ${context.userId}
         or (${role} = 'ADMIN')
         or (${role} = 'AGENT' and t.agent_id is null)
      order by t.updated_at desc
      limit 40
    `;
    return rows.map((row) => ({
      id: asString(row.id),
      propertyId: row.property_id == null ? null : asString(row.property_id),
      propertyTitle: row.property_title == null ? null : asString(row.property_title),
      buyerId: asString(row.buyer_id),
      agentId: row.agent_id == null ? null : asString(row.agent_id),
      subject: row.subject == null ? null : asString(row.subject),
      updatedAt: asString(row.updated_at),
    }));
  });

export const getThread = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ threadId: z.string() }))
  .handler(async ({ context, data }) => {
    const role = await roleOf(context.userId);
    const sql = await getSql();
    const rows = await sql<{ id: string; buyer_id: string; agent_id: string | null; subject: string | null; property_id: string | null }>`
      select id, buyer_id, agent_id, subject, property_id from threads where id = ${data.threadId} limit 1
    `;
    const thread = rows[0];
    if (!thread || !canSeeThread(thread, context.userId, role)) throw new Error("Thread not found");
    const messages = await sql<{ id: string; author_id: string; body: string; created_at: string }>`
      select id, author_id, body, created_at from thread_messages
      where thread_id = ${thread.id}
      order by created_at asc
    `;
    return {
      thread: {
        id: thread.id,
        propertyId: thread.property_id,
        buyerId: thread.buyer_id,
        agentId: thread.agent_id,
        subject: thread.subject,
      },
      messages: messages.map((m) => ({
        id: m.id,
        authorId: m.author_id,
        body: m.body,
        createdAt: asString(m.created_at),
        mine: m.author_id === context.userId,
      })),
    };
  });

export const openPropertyThread = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ propertyId: z.string() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const props = await sql<{ id: string; title: string; agent_id: string | null }>`
      select id, title, agent_id from properties where id = ${data.propertyId} and deleted_at is null limit 1
    `;
    if (!props[0]) throw new Error("Property not found");
    const existing = await sql<{ id: string }>`
      select id from threads where buyer_id = ${context.userId} and property_id = ${data.propertyId} limit 1
    `;
    let threadId = existing[0]?.id;
    if (!threadId) {
      threadId = nid("thr");
      try {
        await sql`
          insert into threads (id, property_id, buyer_id, agent_id, subject)
          values (${threadId}, ${data.propertyId}, ${context.userId}, ${props[0].agent_id}, ${props[0].title})
        `;
      } catch (error) {
        const message = error instanceof Error ? error.message.toLowerCase() : "";
        if (!message.includes("unique") && !message.includes("duplicate")) throw error;
        const again = await sql<{ id: string }>`
          select id from threads where buyer_id = ${context.userId} and property_id = ${data.propertyId} limit 1
        `;
        threadId = again[0]?.id;
        if (!threadId) throw error;
      }
      await audit({
        actorId: context.userId,
        action: "thread.open",
        resource: "thread",
        resourceId: threadId,
        metadata: { propertyId: data.propertyId },
      });
    }
    const messages = await sql<{ id: string; author_id: string; body: string; created_at: string }>`
      select id, author_id, body, created_at from thread_messages where thread_id = ${threadId} order by created_at asc
    `;
    return {
      thread: { id: threadId, propertyId: data.propertyId, subject: props[0].title },
      messages: messages.map((m) => ({
        id: m.id,
        authorId: m.author_id,
        body: m.body,
        createdAt: asString(m.created_at),
        mine: m.author_id === context.userId,
      })),
    };
  });

export const postMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ threadId: z.string(), body: z.string().min(1).max(4000) }))
  .handler(async ({ context, data }) => {
    const role = await roleOf(context.userId);
    const sql = await getSql();
    const rows = await sql<{ id: string; buyer_id: string; agent_id: string | null; subject: string | null }>`
      select id, buyer_id, agent_id, subject from threads where id = ${data.threadId} limit 1
    `;
    const thread = rows[0];
    if (!thread || !canSeeThread(thread, context.userId, role)) throw new Error("Thread not found");
    if (role === "AGENT" && !thread.agent_id && thread.buyer_id !== context.userId) {
      await sql`update threads set agent_id = ${context.userId}, updated_at = now() where id = ${thread.id}`;
      thread.agent_id = context.userId;
    }
    const id = nid("msg");
    await sql`
      insert into thread_messages (id, thread_id, author_id, body)
      values (${id}, ${thread.id}, ${context.userId}, ${data.body.trim()})
    `;
    await sql`update threads set updated_at = now() where id = ${thread.id}`;
    const other = context.userId === thread.buyer_id ? thread.agent_id : thread.buyer_id;
    if (other && other !== context.userId) {
      await notify({
        userId: other,
        type: "message",
        title: "New advisor message",
        body: thread.subject ?? "A thread was updated.",
        data: { threadId: thread.id },
      });
    }
    return { id };
  });

export const listOffers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const role = await roleOf(context.userId);
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select o.id, o.property_id, o.user_id, o.amount, o.currency, o.status, o.notes, o.created_at,
             p.title as property_title, p.agent_id
      from offers o
      join properties p on p.id = o.property_id
      where o.user_id = ${context.userId}
         or p.agent_id = ${context.userId}
         or (${role} = 'ADMIN')
      order by o.created_at desc
      limit 40
    `;
    return rows.map((row) => ({
      id: asString(row.id),
      propertyId: asString(row.property_id),
      propertyTitle: asString(row.property_title),
      amount: asNumber(row.amount),
      currency: asString(row.currency, "USD"),
      status: asString(row.status),
      notes: row.notes == null ? null : asString(row.notes),
      createdAt: asString(row.created_at),
      mine: asString(row.user_id) === context.userId,
      canModerate: role === "ADMIN" || asString(row.agent_id) === context.userId,
    }));
  });

export const updateOfferStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ offerId: z.string(), status: z.enum(OFFER_STATUS) }))
  .handler(async ({ context, data }) => {
    const role = await roleOf(context.userId);
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      user_id: string;
      property_id: string;
      status: string;
      agent_id: string | null;
      title: string;
    }>`
      select o.id, o.user_id, o.property_id, o.status, p.agent_id, p.title
      from offers o
      join properties p on p.id = o.property_id
      where o.id = ${data.offerId}
      limit 1
    `;
    const offer = rows[0];
    if (!offer) throw new Error("Offer not found");
    const isOwner = offer.user_id === context.userId;
    const isAgent = role === "ADMIN" || offer.agent_id === context.userId;
    if (data.status === "WITHDRAWN") {
      if (!isOwner || !["DRAFT", "SUBMITTED", "COUNTERED"].includes(offer.status)) throw new Error("Forbidden");
    } else if (!isAgent) {
      throw new Error("Forbidden");
    }
    await sql`
      update offers set status = ${data.status}, updated_at = now() where id = ${offer.id}
    `;
    if (data.status === "ACCEPTED" || data.status === "COUNTERED") {
      const stage = data.status === "ACCEPTED" ? "NEGOTIATING" : "NEGOTIATING";
      await sql`
        update leads set stage = ${stage}, updated_at = now()
        where user_id = ${offer.user_id} and property_id = ${offer.property_id}
          and stage not in ('WON', 'LOST')
      `;
    }
    if (offer.user_id !== context.userId) {
      await notify({
        userId: offer.user_id,
        type: "offer",
        title: `Interest ${data.status.toLowerCase()}`,
        body: `${offer.title} — this remains an in-platform record, not a contract.`,
        data: { offerId: offer.id, status: data.status },
      });
    }
    await audit({
      actorId: context.userId,
      action: "offer.status",
      resource: "offer",
      resourceId: offer.id,
      metadata: { status: data.status },
    });
    return { ok: true };
  });

export const listTasks = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const profile = await requireRole(context.userId, ["AGENT", "ADMIN"]);
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select t.id, t.title, t.body, t.kind, t.status, t.due_at, t.property_id, t.viewing_id, t.offer_id,
             p.title as property_title
      from tasks t
      left join properties p on p.id = t.property_id
      where t.assignee_id = ${context.userId} or ${profile.role} = 'ADMIN'
      order by case when t.status = 'OPEN' then 0 else 1 end, t.created_at desc
      limit 40
    `;
    return rows.map((row) => ({
      id: asString(row.id),
      title: asString(row.title),
      body: row.body == null ? null : asString(row.body),
      kind: asString(row.kind),
      status: asString(row.status),
      dueAt: row.due_at == null ? null : asString(row.due_at),
      propertyTitle: row.property_title == null ? null : asString(row.property_title),
    }));
  });

export const completeTask = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ taskId: z.string() }))
  .handler(async ({ context, data }) => {
    const profile = await requireRole(context.userId, ["AGENT", "ADMIN"]);
    const sql = await getSql();
    const rows = await sql<{ id: string }>`
      update tasks set status = 'DONE', updated_at = now()
      where id = ${data.taskId}
        and status = 'OPEN'
        and (assignee_id = ${context.userId} or ${profile.role} = 'ADMIN')
      returning id
    `;
    if (!rows[0]) throw new Error("Task not found");
    await audit({ actorId: context.userId, action: "task.done", resource: "task", resourceId: data.taskId });
    return { ok: true };
  });

export const listLeadNotes = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ leadId: z.string() }))
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, ["AGENT", "ADMIN"]);
    const sql = await getSql();
    const rows = await sql<{ id: string; body: string; created_at: string; author_id: string }>`
      select id, body, created_at, author_id from lead_notes
      where lead_id = ${data.leadId}
      order by created_at asc
    `;
    return rows.map((row) => ({
      id: row.id,
      body: row.body,
      createdAt: asString(row.created_at),
      mine: row.author_id === context.userId,
    }));
  });
