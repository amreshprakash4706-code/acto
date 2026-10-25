'use strict';

const { prisma } = require('../db/connection');
const {
  NotFoundError,
  ValidationError,
  ConflictError,
  AuthorizationError,
} = require('../utils/errors');

async function createReview(userId, propertyId, { rating, title, body }) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new ValidationError('Rating must be an integer between 1 and 5');
  }
  const property = await prisma.property.findFirst({
    where: { id: propertyId, deletedAt: null },
  });
  if (!property) throw new NotFoundError('Property not found');

  try {
    const review = await prisma.review.create({
      data: {
        userId,
        propertyId,
        rating,
        title: title ? String(title).slice(0, 120) : null,
        body: body ? String(body).slice(0, 2000) : null,
        moderationStatus: 'PENDING',
      },
      include: { user: { select: { id: true, name: true } } },
    });
    return review;
  } catch (err) {
    if (err.code === 'P2002') {
      throw new ConflictError('You have already reviewed this property');
    }
    throw err;
  }
}

async function listReviewsForProperty(propertyId) {
  return prisma.review.findMany({
    where: {
      propertyId,
      moderationStatus: 'APPROVED',
    },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

async function moderateReview(reviewId, status, adminId) {
  if (!['APPROVED', 'REJECTED', 'HIDDEN'].includes(status)) {
    throw new ValidationError('Invalid moderation status');
  }
  const review = await prisma.review.update({
    where: { id: reviewId },
    data: { moderationStatus: status },
  });
  await prisma.auditLog.create({
    data: {
      actorId: adminId,
      action: 'REVIEW_MODERATED',
      resource: 'review',
      resourceId: reviewId,
      metadata: { status },
    },
  });
  return review;
}

module.exports = { createReview, listReviewsForProperty, moderateReview };
