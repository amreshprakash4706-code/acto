import { getSql } from "@/lib/db";
import { SEED_PROPERTIES } from "@/lib/atconiz/catalog";
import { nid } from "@/lib/utils";

let seeding: Promise<void> | null = null;

export async function ensureCatalog(): Promise<void> {
  if (seeding) return seeding;
  seeding = (async () => {
    const sql = await getSql();
    const rows = await sql<{ c: number }>`select count(*)::int as c from properties`;
    if ((rows[0]?.c ?? 0) > 0) return;
    for (const p of SEED_PROPERTIES) {
      await sql`
        insert into properties (
          id, title, slug, description, property_type, status, listing_type,
          price, currency, price_period, bedrooms, bathrooms, area_sqft, plot_sqft,
          year_built, furnishing, address_line1, city, neighborhood, state, country,
          latitude, longitude, amenities, features, provenance, verification_status,
          is_featured, published_at
        ) values (
          ${p.id}, ${p.title}, ${p.slug}, ${p.description}, ${p.propertyType},
          ${"ACTIVE"}, ${p.listingType}, ${p.price}, ${p.currency}, ${p.pricePeriod},
          ${p.bedrooms}, ${p.bathrooms}, ${p.areaSqft}, ${p.plotSqft ?? null},
          ${p.yearBuilt}, ${p.furnishing ?? null}, ${p.address}, ${p.city},
          ${p.neighborhood}, ${p.state ?? null}, ${p.country}, ${p.lat}, ${p.lng},
          ${JSON.stringify(p.amenities)}::jsonb, ${"{}"}::jsonb,
          ${"SEED_DEVELOPMENT"}, ${"unverified"}, ${Boolean(p.featured)},
          now()
        )
        on conflict (id) do nothing
      `;
      let order = 0;
      for (const img of p.images) {
        await sql`
          insert into property_images (id, property_id, url, alt_text, sort_order, is_primary, room_type)
          values (${nid("img")}, ${p.id}, ${img.url}, ${img.alt}, ${order}, ${order === 0}, ${img.room ?? null})
          on conflict (id) do nothing
        `;
        order += 1;
      }
    }
  })().finally(() => {
    /* keep seeding resolved so later calls skip */
  });
  return seeding;
}
