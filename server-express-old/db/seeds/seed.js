'use strict';

/**
 * Development seed only.
 * Records are marked with provenance = SEED_DEVELOPMENT.
 * NEVER present these as verified live inventory in production UI.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient, Prisma } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding development data (marked as SEED_DEVELOPMENT)...');

  const passwordHash = await bcrypt.hash('Password123!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@atconiz.local' },
    update: {},
    create: {
      email: 'admin@atconiz.local',
      passwordHash,
      name: 'Atconiz Admin',
      role: 'ADMIN',
      emailVerified: true,
    },
  });

  const agent = await prisma.user.upsert({
    where: { email: 'agent@atconiz.local' },
    update: {},
    create: {
      email: 'agent@atconiz.local',
      passwordHash,
      name: 'Demo Agent',
      role: 'AGENT',
      emailVerified: true,
      agentProfile: {
        create: {
          agencyName: 'Atconiz Development Agency',
          verified: true,
          bio: 'Development seed agent — not a real licensed professional.',
        },
      },
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@atconiz.local' },
    update: {},
    create: {
      email: 'user@atconiz.local',
      passwordHash,
      name: 'Demo User',
      role: 'USER',
      emailVerified: true,
    },
  });

  // A few clearly marked seed properties so the UI has something to show in local dev
  const count = await prisma.property.count();
  if (count === 0) {
    await prisma.property.create({
      data: {
        title: '[SEED] Development Villa — Not Live Inventory',
        description:
          'This is a development seed record only. It is not a verified listing and must never be shown as live market inventory.',
        propertyType: 'Villa',
        status: 'ACTIVE',
        price: new Prisma.Decimal(2500000),
        currency: 'USD',
        bedrooms: 4,
        bathrooms: 3.5,
        areaSqft: 4200,
        city: 'Dubai',
        country: 'United Arab Emirates',
        amenities: ['Pool', 'Garden'],
        ownerId: agent.id,
        agentId: agent.id,
        provenance: 'SEED_DEVELOPMENT',
        verificationStatus: 'unverified',
        publishedAt: new Date(),
        images: {
          create: [
            {
              url: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800',
              altText: 'Seed villa exterior',
              isPrimary: true,
              sortOrder: 0,
            },
          ],
        },
      },
    });
  }

  console.log('Seed complete.');
  console.log('  admin@atconiz.local / Password123!');
  console.log('  agent@atconiz.local / Password123!');
  console.log('  user@atconiz.local  / Password123!');
  console.log('All seed records use provenance SEED_DEVELOPMENT.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
