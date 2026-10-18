import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { ensureProfile, requireRole, mapProfile } from "@/lib/server/profile";
import { fetchAllActive } from "./properties";
import { rankProperties } from "@/lib/atconiz/ranking";
import { scoreLead } from "@/lib/atconiz/lead-score";
import { asNumber, asString, nid, asJsonRow } from "@/lib/utils";
import { audit, notify } from "@/lib/server/notify";
import { ensureTask } from "@/lib/server/tasks";
import type { Role } from "@/lib/atconiz/types";

export const myProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    return ensureProfile(context.userId);
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      displayName: z.string().max(80).optional(),
      phone: z.string().max(40).optional(),
      role: z.enum(["USER", "AGENT"]).optional(),
      bio: z.string().max(600).optional(),
      agencyName: z.string().max(120).optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const current = await ensureProfile(context.userId);
    let role: Role = current.role;
    if (data.role && current.role !== "ADMIN") role = data.role;
    const sql = await getSql();
    await sql`
      update profiles set
        display_name = coalesce(${data.displayName ?? null}, display_name),
        phone = coalesce(${data.phone ?? null}, phone),
        role = ${role},
        bio = coalesce(${data.bio ?? null}, bio),
        agency_name = coalesce(${data.agencyName ?? null}, agency_name),
        updated_at = now()
      where user_id = ${context.userId}
    `;
    await audit({ actorId: context.userId, action: "profile.update", resource: "profile", resourceId: context.userId });
    return ensureProfile(context.userId);
  });

export const userDashboard = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const profile = await ensureProfile(context.userId);
    const favs = await sql<{ property_id: string }>`
      select property_id from favorites where user_id = ${context.userId}
    `;
    const views = await sql<{ property_id: string }>`
      select property_id from property_views where user_id = ${context.userId} order by created_at desc limit 20
    `;
    const viewings = await sql<{ c: number }>`
      select count(*)::int as c from viewing_requests where user_id = ${context.userId}
    `;
    const searches = await sql<{ c: number }>`
      select count(*)::int as c from saved_searches where user_id = ${context.userId}
    `;
    const all = await fetchAllActive();
    const favSet = new Set(favs.map((f) => f.property_id));
    const favProps = all.filter((p) => favSet.has(p.id));
    const cities = [...new Set(favProps.map((p) => p.city))];
    const types = [...new Set(favProps.map((p) => p.propertyType))];
    const maxPrice = favProps.length ? Math.max(...favProps.map((p) => p.price)) : undefined;
    const recs = rankProperties(all, {}, { cities, types, maxPrice }).filter((p) => !favSet.has(p.id)).slice(0, 6);
    return {
      profile,
      favoriteCount: favs.length,
      viewingCount: viewings[0]?.c ?? 0,
      savedSearchCount: searches[0]?.c ?? 0,
      recentlyViewed: views.map((v) => v.property_id),
      recommendations: recs,
      favorites: favProps,
    };
  });

export const agentDashboard = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const profile = await requireRole(context.userId, ["AGENT", "ADMIN"]);
    const sql = await getSql();
    const listings = await sql<Record<string, unknown>>`
      select id, title, city, price, currency, status, listing_type
      from properties
      where deleted_at is null and (agent_id = ${context.userId} or ${profile.role} = 'ADMIN')
      order by updated_at desc
      limit 40
    `;
    const leads = await sql<Record<string, unknown>>`
      select l.*, p.title as property_title
      from leads l
      left join properties p on p.id = l.property_id
      where ${profile.role} = 'ADMIN' or l.agent_id = ${context.userId} or l.agent_id is null
      order by l.score desc, l.updated_at desc
      limit 50
    `;
    const viewings = await sql<Record<string, unknown>>`
      select v.*, p.title as property_title
      from viewing_requests v
      left join properties p on p.id = v.property_id
      where ${profile.role} = 'ADMIN' or v.agent_id = ${context.userId} or v.agent_id is null
      order by v.created_at desc
      limit 40
    `;
    return {
      profile,
      listings: listings.map(asJsonRow),
      leads: leads.map(asJsonRow),
      viewings: viewings.map(asJsonRow),
      openViewings: viewings.filter((v) => ["REQUESTED", "CONFIRMED"].includes(asString(v.status))).length,
    };
  });

export const updateLeadStage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      leadId: z.string(),
      stage: z.enum(["NEW", "CONTACTED", "QUALIFIED", "VIEWING", "NEGOTIATING", "WON", "LOST"]),
    }),
  )
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, ["AGENT", "ADMIN"]);
    const sql = await getSql();
    await sql`
      update leads set stage = ${data.stage}, updated_at = now()
      where id = ${data.leadId}
    `;
    await audit({ actorId: context.userId, action: "lead.stage", resource: "lead", resourceId: data.leadId, metadata: { stage: data.stage } });
    return { ok: true };
  });

export const addLeadNote = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ leadId: z.string(), body: z.string().min(1).max(2000) }))
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, ["AGENT", "ADMIN"]);
    const sql = await getSql();
    await sql`
      insert into lead_notes (id, lead_id, author_id, body)
      values (${nid("note")}, ${data.leadId}, ${context.userId}, ${data.body})
    `;
    return { ok: true };
  });

export const updateViewingStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      viewingId: z.string(),
      status: z.enum(["REQUESTED", "CONFIRMED", "RESCHEDULED", "COMPLETED", "CANCELLED", "REJECTED"]),
      agentNotes: z.string().max(1000).optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, ["AGENT", "ADMIN"]);
    const sql = await getSql();
    const rows = await sql<{ id: string; user_id: string; property_id: string }>`
      select id, user_id, property_id from viewing_requests where id = ${data.viewingId} limit 1
    `;
    if (!rows[0]) throw new Error("Viewing not found");
    await sql`
      update viewing_requests
      set status = ${data.status}, agent_notes = coalesce(${data.agentNotes ?? null}, agent_notes),
          agent_id = coalesce(agent_id, ${context.userId}), updated_at = now()
      where id = ${data.viewingId}
    `;
    await notify({
      userId: rows[0].user_id,
      type: "viewing",
      title: `Viewing ${data.status.toLowerCase()}`,
      body: "Your viewing status was updated by an advisor.",
      data: { viewingId: data.viewingId, status: data.status },
    });
    if (data.status === "CONFIRMED" || data.status === "COMPLETED") {
      await ensureTask({
        assigneeId: context.userId,
        createdBy: context.userId,
        viewingId: data.viewingId,
        propertyId: rows[0].property_id,
        title: data.status === "COMPLETED" ? "Follow up after viewing" : "Prepare confirmed viewing",
        body: data.status === "COMPLETED" ? "Send a recap and next step to the client." : "Confirm access, timing, and materials.",
        kind: data.status === "COMPLETED" ? "viewing_followup" : "viewing_prep",
        dueInHours: data.status === "COMPLETED" ? 24 : 12,
      });
    }
    await audit({ actorId: context.userId, action: "viewing.status", resource: "viewing", resourceId: data.viewingId });
    return { ok: true };
  });

export const createListing = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      title: z.string().min(4).max(120),
      description: z.string().max(4000).optional(),
      propertyType: z.string().min(2).max(40),
      listingType: z.enum(["SALE", "RENT"]),
      price: z.number().positive(),
      currency: z.string().min(3).max(3),
      city: z.string().min(2).max(80),
      country: z.string().min(2).max(80),
      bedrooms: z.number().int().min(0).max(20).optional(),
      bathrooms: z.number().min(0).max(20).optional(),
      areaSqft: z.number().positive().optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, ["AGENT", "ADMIN"]);
    const sql = await getSql();
    const id = nid("prop");
    const slug = `${data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60)}-${id.slice(-6)}`;
    await sql`
      insert into properties (
        id, title, slug, description, property_type, status, listing_type,
        price, currency, city, country, bedrooms, bathrooms, area_sqft,
        amenities, features, agent_id, owner_id, provenance, verification_status, published_at
      ) values (
        ${id}, ${data.title}, ${slug}, ${data.description ?? null}, ${data.propertyType},
        ${"ACTIVE"}, ${data.listingType}, ${data.price}, ${data.currency}, ${data.city}, ${data.country},
        ${data.bedrooms ?? null}, ${data.bathrooms ?? null}, ${data.areaSqft ?? null},
        ${"[]"}::jsonb, ${"{}"}::jsonb, ${context.userId}, ${context.userId},
        ${"AGENT_CREATED"}, ${"unverified"}, now()
      )
    `;
    await audit({ actorId: context.userId, action: "property.create", resource: "property", resourceId: id });
    return { id, slug };
  });

export const adminOverview = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireRole(context.userId, ["ADMIN"]);
    const sql = await getSql();
    const users = await sql<{ c: number }>`select count(*)::int as c from profiles`;
    const agents = await sql<{ c: number }>`select count(*)::int as c from profiles where role = 'AGENT'`;
    const properties = await sql<{ c: number }>`select count(*)::int as c from properties where deleted_at is null`;
    const viewings = await sql<{ c: number }>`select count(*)::int as c from viewing_requests`;
    const leads = await sql<{ c: number }>`select count(*)::int as c from leads`;
    const ai = await sql<{ c: number; tin: number; tout: number }>`
      select count(*)::int as c, coalesce(sum(tokens_in),0)::int as tin, coalesce(sum(tokens_out),0)::int as tout
      from ai_usage
    `;
    const events = await sql<{ name: string; c: number }>`
      select name, count(*)::int as c from analytics_events group by name order by c desc limit 12
    `;
    const auditRows = await sql<Record<string, unknown>>`
      select id, actor_id, action, resource, resource_id, created_at from audit_logs
      order by created_at desc limit 25
    `;
    const profiles = await sql<Record<string, unknown>>`
      select user_id, display_name, role, plan, created_at from profiles order by created_at desc limit 40
    `;
    return {
      users: users[0]?.c ?? 0,
      agents: agents[0]?.c ?? 0,
      properties: properties[0]?.c ?? 0,
      viewings: viewings[0]?.c ?? 0,
      leads: leads[0]?.c ?? 0,
      aiCalls: ai[0]?.c ?? 0,
      tokensIn: ai[0]?.tin ?? 0,
      tokensOut: ai[0]?.tout ?? 0,
      events,
      audit: auditRows.map(asJsonRow),
      profiles: profiles.map(mapProfile),
    };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ userId: z.string(), role: z.enum(["USER", "AGENT", "ADMIN"]) }))
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, ["ADMIN"]);
    const sql = await getSql();
    await sql`update profiles set role = ${data.role}, updated_at = now() where user_id = ${data.userId}`;
    await audit({
      actorId: context.userId,
      action: "role.change",
      resource: "profile",
      resourceId: data.userId,
      metadata: { role: data.role },
    });
    return { ok: true };
  });

export const moderateReview = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ reviewId: z.string(), status: z.enum(["APPROVED", "REJECTED", "HIDDEN"]) }))
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, ["ADMIN"]);
    const sql = await getSql();
    await sql`update reviews set moderation_status = ${data.status}, updated_at = now() where id = ${data.reviewId}`;
    return { ok: true };
  });

export const pendingReviews = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireRole(context.userId, ["ADMIN"]);
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select id, property_id, user_id, rating, title, body, moderation_status, created_at
      from reviews order by created_at desc limit 40
    `;
    return rows.map((row) => ({
      id: asString(row.id),
      rating: asNumber(row.rating),
      body: row.body == null ? "" : asString(row.body),
      moderation_status: asString(row.moderation_status),
    }));
  });

export const refreshLeadScores = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireRole(context.userId, ["AGENT", "ADMIN"]);
    const sql = await getSql();
    const leads = await sql<{ id: string; user_id: string | null }>`select id, user_id from leads`;
    for (const lead of leads) {
      if (!lead.user_id) continue;
      const views = await sql<{ c: number }>`select count(*)::int as c from property_views where user_id = ${lead.user_id}`;
      const favs = await sql<{ c: number }>`select count(*)::int as c from favorites where user_id = ${lead.user_id}`;
      const inq = await sql<{ c: number }>`select count(*)::int as c from contact_requests where user_id = ${lead.user_id}`;
      const vws = await sql<{ c: number }>`select count(*)::int as c from viewing_requests where user_id = ${lead.user_id}`;
      const scored = scoreLead({
        views: asNumber(views[0]?.c),
        uniqueDays: 1,
        favorites: asNumber(favs[0]?.c),
        inquiries: asNumber(inq[0]?.c),
        viewings: asNumber(vws[0]?.c),
        recencyHours: 12,
      });
      await sql`
        update leads set score = ${scored.score}, score_breakdown = ${JSON.stringify(scored.breakdown)}::jsonb, updated_at = now()
        where id = ${lead.id}
      `;
    }
    return { ok: true, count: leads.length };
  });
