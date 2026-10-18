import { getSql } from "@/lib/db";
import type { Profile, Role } from "@/lib/atconiz/types";
import { asRecord, asString } from "@/lib/utils";

export async function ensureProfile(userId: string, seed?: { displayName?: string | null }): Promise<Profile> {
  const sql = await getSql();
  const existing = await sql<Record<string, unknown>>`
    select * from profiles where user_id = ${userId} limit 1
  `;
  if (existing[0]) return mapProfile(existing[0]);

  const adminCount = await sql<{ c: number }>`select count(*)::int as c from profiles where role = 'ADMIN'`;
  const role: Role = (adminCount[0]?.c ?? 0) === 0 ? "ADMIN" : "USER";

  await sql`
    insert into profiles (user_id, display_name, role)
    values (${userId}, ${seed?.displayName ?? null}, ${role})
    on conflict (user_id) do nothing
  `;
  const rows = await sql<Record<string, unknown>>`select * from profiles where user_id = ${userId} limit 1`;
  return mapProfile(rows[0] ?? { user_id: userId, role: "USER" });
}

export function mapProfile(row: Record<string, unknown>): Profile {
  return {
    userId: asString(row.user_id),
    displayName: row.display_name == null ? null : asString(row.display_name),
    phone: row.phone == null ? null : asString(row.phone),
    role: asString(row.role, "USER") as Role,
    bio: row.bio == null ? null : asString(row.bio),
    agencyName: row.agency_name == null ? null : asString(row.agency_name),
    plan: asString(row.plan, "PRIVATE"),
    preferences: asRecord(row.preferences),
  };
}

export async function requireRole(userId: string, roles: Role[]): Promise<Profile> {
  const profile = await ensureProfile(userId);
  if (!roles.includes(profile.role)) {
    const err = new Error("Forbidden");
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
  return profile;
}
