'use strict';

const { prisma } = require('../db/connection');
const { NotFoundError, AuthorizationError, ValidationError } = require('../utils/errors');

async function createViewingRequest(userId, { propertyId, requestedAt, notes }) {
  if (!propertyId || !requestedAt) {
    throw new ValidationError('propertyId and requestedAt are required');
  }
  const when = new Date(requestedAt);
  if (Number.isNaN(when.getTime()) || when < new Date()) {
    throw new ValidationError('requestedAt must be a valid future date');
  }

  const property = await prisma.property.findFirst({
    where: { id: propertyId, deletedAt: null, status: 'ACTIVE' },
  });
  if (!property) throw new NotFoundError('Property not found');

  const request = await prisma.viewingRequest.create({
    data: {
      userId,
      propertyId,
      agentId: property.agentId || property.ownerId,
      requestedAt: when,
      notes: notes ? String(notes).slice(0, 1000) : null,
      status: 'REQUESTED',
    },
  });
  return request;
}

async function listMyViewings(userId) {
  return prisma.viewingRequest.findMany({
    where: { userId },
    include: {
      property: {
        select: {
          id: true,
          title: true,
          city: true,
          country: true,
          price: true,
          images: { where: { isPrimary: true }, take: 1 },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function updateViewingStatus(id, status, user) {
  const request = await prisma.viewingRequest.findUnique({ where: { id } });
  if (!request) throw new NotFoundError('Viewing request not found');

  const isOwner = request.userId === user.id;
  const isAgent = request.agentId === user.id || user.role === 'ADMIN';
  if (!isOwner && !isAgent) {
    throw new AuthorizationError();
  }

  const allowed = ['CONFIRMED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED', 'REJECTED'];
  if (!allowed.includes(status)) {
    throw new ValidationError('Invalid status');
  }

  // Users can only cancel their own
  if (isOwner && !isAgent && status !== 'CANCELLED') {
    throw new AuthorizationError('You can only cancel your own requests');
  }

  return prisma.viewingRequest.update({
    where: { id },
    data: { status },
  });
}

module.exports = { createViewingRequest, listMyViewings, updateViewingStatus };
