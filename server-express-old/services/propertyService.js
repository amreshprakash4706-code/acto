'use strict';

const { prisma } = require('../db/connection');
const {
  NotFoundError,
  AuthorizationError,
  ValidationError,
} = require('../utils/errors');
const { Prisma } = require('@prisma/client');

async function listProperties(query, user = null) {
  const {
    page = 1,
    limit = 20,
    q,
    city,
    country,
    propertyType,
    status,
    minPrice,
    maxPrice,
    bedrooms,
    sort = 'newest',
  } = query;

  const where = {
    deletedAt: null,
  };

  // Public listing: only ACTIVE by default unless authenticated agent/admin viewing own
  if (!status) {
    where.status = 'ACTIVE';
  } else if (status === 'DRAFT' || status === 'ARCHIVED') {
    if (!user || (user.role !== 'ADMIN' && user.role !== 'AGENT')) {
      throw new AuthorizationError('Cannot list draft/archived properties');
    }
    where.status = status;
    if (user.role === 'AGENT') {
      where.ownerId = user.id;
    }
  } else {
    where.status = status;
  }

  if (city) where.city = { contains: city, mode: 'insensitive' };
  if (country) where.country = { contains: country, mode: 'insensitive' };
  if (propertyType) where.propertyType = { equals: propertyType, mode: 'insensitive' };
  if (bedrooms != null) where.bedrooms = { gte: bedrooms };
  if (minPrice != null || maxPrice != null) {
    where.price = {};
    if (minPrice != null) where.price.gte = minPrice;
    if (maxPrice != null) where.price.lte = maxPrice;
  }
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { city: { contains: q, mode: 'insensitive' } },
      { country: { contains: q, mode: 'insensitive' } },
    ];
  }

  let orderBy = { publishedAt: 'desc' };
  if (sort === 'price_asc') orderBy = { price: 'asc' };
  else if (sort === 'price_desc') orderBy = { price: 'desc' };
  else if (sort === 'oldest') orderBy = { createdAt: 'asc' };
  else if (sort === 'newest') orderBy = { createdAt: 'desc' };

  const [total, items] = await Promise.all([
    prisma.property.count({ where }),
    prisma.property.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        images: { orderBy: { sortOrder: 'asc' }, take: 5 },
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { reviews: true, favorites: true } },
      },
    }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

async function getPropertyById(id, user = null) {
  const property = await prisma.property.findFirst({
    where: { id, deletedAt: null },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      owner: { select: { id: true, name: true, email: true, role: true } },
      reviews: {
        where: { moderationStatus: 'APPROVED' },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
      _count: { select: { reviews: true, favorites: true, viewingRequests: true } },
    },
  });

  if (!property) throw new NotFoundError('Property not found');

  if (property.status !== 'ACTIVE') {
    const isOwner = user && property.ownerId === user.id;
    const isAdmin = user && user.role === 'ADMIN';
    if (!isOwner && !isAdmin) {
      throw new NotFoundError('Property not found');
    }
  }

  return property;
}

async function createProperty(data, user) {
  if (!user || (user.role !== 'AGENT' && user.role !== 'ADMIN')) {
    throw new AuthorizationError('Only agents or admins can create properties');
  }

  const property = await prisma.property.create({
    data: {
      ...data,
      price: new Prisma.Decimal(data.price),
      ownerId: user.id,
      agentId: user.id,
      provenance: user.role === 'ADMIN' ? 'ADMIN_CREATED' : 'AGENT_CREATED',
      status: data.status || 'DRAFT',
      publishedAt: data.status === 'ACTIVE' ? new Date() : null,
    },
    include: { images: true },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: 'PROPERTY_CREATED',
      resource: 'property',
      resourceId: property.id,
      metadata: { title: property.title, status: property.status },
    },
  });

  return property;
}

async function updateProperty(id, data, user) {
  const existing = await prisma.property.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) throw new NotFoundError('Property not found');

  const isOwner = existing.ownerId === user.id;
  const isAdmin = user.role === 'ADMIN';
  if (!isOwner && !isAdmin) {
    throw new AuthorizationError('You can only update your own properties');
  }

  const updateData = { ...data };
  if (data.price != null) updateData.price = new Prisma.Decimal(data.price);
  if (data.status === 'ACTIVE' && existing.status !== 'ACTIVE') {
    updateData.publishedAt = new Date();
  }

  const property = await prisma.property.update({
    where: { id },
    data: updateData,
    include: { images: true },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: 'PROPERTY_UPDATED',
      resource: 'property',
      resourceId: id,
      metadata: { changes: Object.keys(data) },
    },
  });

  return property;
}

async function deleteProperty(id, user) {
  const existing = await prisma.property.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) throw new NotFoundError('Property not found');

  const isOwner = existing.ownerId === user.id;
  const isAdmin = user.role === 'ADMIN';
  if (!isOwner && !isAdmin) {
    throw new AuthorizationError('You can only delete your own properties');
  }

  await prisma.property.update({
    where: { id },
    data: { deletedAt: new Date(), status: 'ARCHIVED' },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: 'PROPERTY_DELETED',
      resource: 'property',
      resourceId: id,
    },
  });

  return { success: true };
}

module.exports = {
  listProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
};
