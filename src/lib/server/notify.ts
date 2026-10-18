import { getSql } from "@/lib/db";
import { nid } from "@/lib/utils";

export async function notify(opts: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  const sql = await getSql();
  await sql`
    insert into notifications (id, user_id, type, title, body, data)
    values (
      ${nid("ntf")},
      ${opts.userId},
      ${opts.type},
      ${opts.title},
      ${opts.body ?? null},
      ${JSON.stringify(opts.data ?? {})}::jsonb
    )
  `;
}

export async function audit(opts: {
  actorId?: string | null;
  action: string;
  resource?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const sql = await getSql();
  await sql`
    insert into audit_logs (id, actor_id, action, resource, resource_id, metadata)
    values (
      ${nid("aud")},
      ${opts.actorId ?? null},
      ${opts.action},
      ${opts.resource ?? null},
      ${opts.resourceId ?? null},
      ${JSON.stringify(opts.metadata ?? {})}::jsonb
    )
  `;
}

export async function track(opts: {
  userId?: string | null;
  name: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const sql = await getSql();
  await sql`
    insert into analytics_events (id, user_id, name, payload)
    values (
      ${nid("evt")},
      ${opts.userId ?? null},
      ${opts.name},
      ${JSON.stringify(opts.payload ?? {})}::jsonb
    )
  `;
}
