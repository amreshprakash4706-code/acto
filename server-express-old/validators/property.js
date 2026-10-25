'use strict';

const { z } = require('zod');

const propertyCreateSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(10000).optional().nullable(),
  propertyType: z.string().min(1).max(80),
  status: z.enum(['DRAFT', 'ACTIVE', 'SOLD', 'LEASED', 'ARCHIVED']).optional(),
  price: z.number().positive().max(1e15),
  currency: z.string().length(3).default('USD'),
  bedrooms: z.number().int().min(0).max(50).optional().nullable(),
  bathrooms: z.number().min(0).max(50).optional().nullable(),
  areaSqft: z.number().positive().max(1e8).optional().nullable(),
  yearBuilt: z.number().int().min(1600).max(2100).optional().nullable(),
  addressLine1: z.string().max(255).optional().nullable(),
  addressLine2: z.string().max(255).optional().nullable(),
  city: z.string().min(1).max(120),
  state: z.string().max(120).optional().nullable(),
  country: z.string().min(1).max(120),
  postalCode: z.string().max(30).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  amenities: z.array(z.string().max(80)).max(50).optional(),
  features: z.record(z.any()).optional().nullable(),
});

const propertyUpdateSchema = propertyCreateSchema.partial();

const propertyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  q: z.string().max(200).optional(),
  city: z.string().max(120).optional(),
  country: z.string().max(120).optional(),
  propertyType: z.string().max(80).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'SOLD', 'LEASED', 'ARCHIVED']).optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  bedrooms: z.coerce.number().int().optional(),
  sort: z.enum(['price_asc', 'price_desc', 'newest', 'oldest']).default('newest'),
});

module.exports = {
  propertyCreateSchema,
  propertyUpdateSchema,
  propertyQuerySchema,
};
