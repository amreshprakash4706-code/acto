import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { asJsonRow, asStringArray, nid } from "@/lib/utils";
import { notify, audit, track } from "@/lib/server/notify";
import { ensureTask } from "@/lib/server/tasks";
import { ensureProfile } from "@/lib/server/profile";
import { scoreLead } from "@/lib/atconiz/lead-score";
import { ensureCatalog } from "@/lib/server/seed";

export const listFavorites = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ensureCatalog();
    const sql = await getSql();
    const rows = await sql<{ property_id: string }>`
      select property_id from favorites where user_id = ${context.userId} order by created_at desc
    `;
    return rows.map((r) => r.property_id);
  });

export const toggleFavorite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ propertyId: z.string() }))
  .handler(async ({ context, data }) => {
    await ensureCatalog();
    const sql = await getSql();
    const existing = await sql<{ id: string }>`
      select id from favorites where user_id = ${context.userId} and property_id = ${data.propertyId} limit 1
    `;
    if (existing[0]) {
      await sql`delete from favorites where id = ${existing[0].id} and user_id = ${context.userId}`;
      await track({ userId: context.userId, name: "unfavorite", payload: { propertyId: data.propertyId } });
      return { saved: false };
    }
    await sql`
      insert into favorites (id, user_id, property_id)
      values (${nid("fav")}, ${context.userId}, ${data.propertyId})
    `;
    await track({ userId: context.userId, name: "favorite", payload: { propertyId: data.propertyId } });
    return { saved: true };
  });

export const listReviews = createServerFn({ method: "GET" })
  .validator(z.object({ propertyId: z.string() }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    return sql<{
      id: string;
      rating: number;
      title: string | null;
      body: string | null;
      created_at: string;
      user_id: string;
    }>`
      select id, rating, title, body, created_at, user_id
      from reviews
      where property_id = ${data.propertyId} and moderation_status = 'APPROVED'
      order by created_at desc
    `;
  });

export const addReview = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      propertyId: z.string(),
      rating: z.number().int().min(1).max(5),
      title: z.string().max(120).optional(),
      body: z.string().max(2000).optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      insert into reviews (id, property_id, user_id, rating, title, body, moderation_status)
      values (${nid("rev")}, ${data.propertyId}, ${context.userId}, ${data.rating}, ${data.title ?? null}, ${data.body ?? null}, ${"APPROVED"})
      on conflict (property_id, user_id) do update set
        rating = excluded.rating,
        title = excluded.title,
        body = excluded.body,
        updated_at = now()
    `;
    await track({ userId: context.userId, name: "review", payload: { propertyId: data.propertyId, rating: data.rating } });
    return { ok: true };
  });

export const requestViewing = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      propertyId: z.string(),
      requestedAt: z.string(),
      viewingType: z.enum(["IN_PERSON", "VIRTUAL"]).optional(),
      notes: z.string().max(1000).optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    await ensureProfile(context.userId);
    const sql = await getSql();
    const prop = await sql<{ id: string; title: string; agent_id: string | null }>`
      select id, title, agent_id from properties where id = ${data.propertyId} limit 1
    `;
    if (!prop[0]) throw new Error("Property not found");
    const id = nid("vw");
    await sql`
      insert into viewing_requests (id, property_id, user_id, agent_id, requested_at, viewing_type, notes, status)
      values (${id}, ${data.propertyId}, ${context.userId}, ${prop[0].agent_id}, ${data.requestedAt}, ${data.viewingType ?? "IN_PERSON"}, ${data.notes ?? null}, ${"REQUESTED"})
    `;
    const leadId = nid("lead");
    const scored = scoreLead({
      views: 1,
      uniqueDays: 1,
      favorites: 0,
      inquiries: 0,
      viewings: 1,
      recencyHours: 0,
    });
    await sql`
      insert into leads (id, user_id, viewing_id, property_id, agent_id, source, stage, score, score_breakdown)
      values (${leadId}, ${context.userId}, ${id}, ${data.propertyId}, ${prop[0].agent_id}, ${"viewing"}, ${"VIEWING"}, ${scored.score}, ${JSON.stringify(scored.breakdown)}::jsonb)
    `;
    await notify({
      userId: context.userId,
      type: "viewing",
      title: "Viewing requested",
      body: `${prop[0].title} — pending confirmation.`,
      data: { viewingId: id, propertyId: data.propertyId },
    });
    if (prop[0].agent_id) {
      await notify({
        userId: prop[0].agent_id,
        type: "viewing",
        title: "New viewing request",
        body: prop[0].title,
        data: { viewingId: id },
      });
    }
    await audit({ actorId: context.userId, action: "viewing.request", resource: "viewing", resourceId: id });
    await track({ userId: context.userId, name: "viewing_request", payload: { propertyId: data.propertyId } });
    return { id, status: "REQUESTED" as const };
  });

export const myViewings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select v.*, p.title as property_title, p.city, p.currency, p.price
      from viewing_requests v
      join properties p on p.id = v.property_id
      where v.user_id = ${context.userId}
      order by v.created_at desc
    `;
    return rows.map(asJsonRow);
  });

export const submitContact = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      name: z.string().min(1).max(120),
      email: z.string().email(),
      phone: z.string().max(40).optional(),
      subject: z.string().max(160).optional(),
      message: z.string().min(4).max(4000),
      propertyId: z.string().optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const id = nid("ct");
    await sql`
      insert into contact_requests (id, name, email, phone, subject, message, property_id, user_id, status)
      values (${id}, ${data.name}, ${data.email}, ${data.phone ?? null}, ${data.subject ?? null}, ${data.message}, ${data.propertyId ?? null}, ${context.userId}, ${"NEW"})
    `;
    const scored = scoreLead({
      views: 1,
      uniqueDays: 1,
      favorites: 0,
      inquiries: 1,
      viewings: 0,
      recencyHours: 0,
    });
    await sql`
      insert into leads (id, user_id, contact_id, property_id, source, stage, score, score_breakdown)
      values (${nid("lead")}, ${context.userId}, ${id}, ${data.propertyId ?? null}, ${"inquiry"}, ${"NEW"}, ${scored.score}, ${JSON.stringify(scored.breakdown)}::jsonb)
    `;
    await notify({
      userId: context.userId,
      type: "inquiry",
      title: "Inquiry received",
      body: "An advisor will follow up. This is logged in your workspace.",
      data: { contactId: id },
    });
    await track({ userId: context.userId, name: "contact", payload: { propertyId: data.propertyId } });
    return { id };
  });

export const saveSearch = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ name: z.string().min(1).max(80), query: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])) }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const id = nid("ss");
    await sql`
      insert into saved_searches (id, user_id, name, query)
      values (${id}, ${context.userId}, ${data.name}, ${JSON.stringify(data.query)}::jsonb)
    `;
    return { id };
  });

export const mySavedSearches = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select id, name, query, notify, created_at from saved_searches
      where user_id = ${context.userId} order by created_at desc
    `;
    return rows.map(asJsonRow);
  });

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select id, type, title, body, data, read_at, created_at
      from notifications where user_id = ${context.userId}
      order by created_at desc limit 40
    `;
    const unread = rows.filter((r) => !r.read_at).length;
    return { items: rows.map(asJsonRow), unread };
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await sql`update notifications set read_at = now() where user_id = ${context.userId} and read_at is null`;
    return { ok: true };
  });

export const saveComparison = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ propertyIds: z.array(z.string()).min(2).max(4), title: z.string().optional() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const id = nid("cmp");
    await sql`
      insert into comparisons (id, user_id, property_ids, title)
      values (${id}, ${context.userId}, ${JSON.stringify(data.propertyIds)}::jsonb, ${data.title ?? null})
    `;
    return { id };
  });

export const submitOffer = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      propertyId: z.string(),
      amount: z.number().positive(),
      currency: z.string().min(3).max(3),
      notes: z.string().max(1000).optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const id = nid("ofr");
    await sql`
      insert into offers (id, property_id, user_id, amount, currency, status, notes)
      values (${id}, ${data.propertyId}, ${context.userId}, ${data.amount}, ${data.currency}, ${"SUBMITTED"}, ${data.notes ?? null})
    `;
    const prop = await sql<{ title: string; agent_id: string | null }>`
      select title, agent_id from properties where id = ${data.propertyId} limit 1
    `;
    if (prop[0]?.agent_id && prop[0].agent_id !== context.userId) {
      await notify({
        userId: prop[0].agent_id,
        type: "offer",
        title: "New expression of interest",
        body: prop[0].title,
        data: { offerId: id, propertyId: data.propertyId },
      });
      await ensureTask({
        assigneeId: prop[0].agent_id,
        createdBy: context.userId,
        propertyId: data.propertyId,
        offerId: id,
        title: "Review expression of interest",
        body: prop[0].title,
        kind: "offer_review",
        dueInHours: 12,
      });
    }
    await notify({
      userId: context.userId,
      type: "offer",
      title: "Offer recorded",
      body: "This is an in-platform expression of interest — not a legally binding contract.",
      data: { offerId: id },
    });
    await audit({ actorId: context.userId, action: "offer.submit", resource: "offer", resourceId: id });
    return { id, status: "SUBMITTED" as const };
  });

export const myComparisons = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select id, title, property_ids, created_at from comparisons
      where user_id = ${context.userId}
      order by created_at desc
      limit 20
    `;
    return rows.map((row) => ({
      id: String(row.id),
      title: row.title == null ? null : String(row.title),
      propertyIds: asStringArray(row.property_ids),
      createdAt: row.created_at == null ? "" : String(row.created_at),
    }));
  });
