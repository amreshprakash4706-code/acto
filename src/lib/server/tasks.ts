import { getSql } from "@/lib/db";
import { nid } from "@/lib/utils";

/** Idempotent agent task. Duplicate viewing/offer kinds are ignored. */
export async function ensureTask(opts: {
  assigneeId: string;
  createdBy?: string | null;
  leadId?: string | null;
  viewingId?: string | null;
  propertyId?: string | null;
  offerId?: string | null;
  title: string;
  body?: string | null;
  kind: string;
  dueInHours?: number;
}): Promise<void> {
  const sql = await getSql();
  if (opts.viewingId) {
    const existing = await sql<{ id: string }>`
      select id from tasks where viewing_id = ${opts.viewingId} and kind = ${opts.kind} limit 1
    `;
    if (existing[0]) return;
  }
  if (opts.offerId) {
    const existing = await sql<{ id: string }>`
      select id from tasks where offer_id = ${opts.offerId} and kind = ${opts.kind} limit 1
    `;
    if (existing[0]) return;
  }
  const due = new Date(Date.now() + (opts.dueInHours ?? 24) * 60 * 60 * 1000).toISOString();
  try {
    await sql`
      insert into tasks (
        id, assignee_id, created_by, lead_id, viewing_id, property_id, offer_id,
        title, body, kind, status, due_at
      ) values (
        ${nid("task")}, ${opts.assigneeId}, ${opts.createdBy ?? null}, ${opts.leadId ?? null},
        ${opts.viewingId ?? null}, ${opts.propertyId ?? null}, ${opts.offerId ?? null},
        ${opts.title}, ${opts.body ?? null}, ${opts.kind}, ${"OPEN"}, ${due}
      )
    `;
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("unique") || message.includes("duplicate")) return;
    throw error;
  }
}
