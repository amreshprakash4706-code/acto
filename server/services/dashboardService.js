'use strict';

const { prisma } = require('../db/connection');
const { AuthorizationError } = require('../utils/errors');

async function getUserDashboard(userId) {
  const [favoritesCount, viewings, calculations, recentNotifications] = await Promise.all([
    prisma.favorite.count({ where: { userId } }),
    prisma.viewingRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        property: { select: { id: true, title: true, city: true } },
      },
    }),
    prisma.savedCalculation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  return {
    favoritesCount,
    viewingRequests: viewings,
    savedCalculations: calculations,
    notifications: recentNotifications,
  };
}

async function getAgentDashboard(userId) {
  const [owned, activeCount, draftCount, inquiries, viewings] = await Promise.all([
    prisma.property.findMany({
      where: { ownerId: userId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      include: {
        _count: { select: { favorites: true, reviews: true, viewingRequests: true } },
      },
    }),
    prisma.property.count({
      where: { ownerId: userId, status: 'ACTIVE', deletedAt: null },
    }),
    prisma.property.count({
      where: { ownerId: userId, status: 'DRAFT', deletedAt: null },
    }),
    prisma.contactRequest.count({
      where: { property: { ownerId: userId } },
    }),
    prisma.viewingRequest.findMany({
      where: { agentId: userId },
      orderBy: { createdAt: 'desc' },
      take: 15,
      include: {
        property: { select: { id: true, title: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  return {
    listings: owned,
    metrics: {
      activeListings: activeCount,
      draftListings: draftCount,
      totalInquiries: inquiries,
      pendingViewings: viewings.filter((v) => v.status === 'REQUESTED').length,
    },
    viewingRequests: viewings,
  };
}

async function getAdminDashboard(user) {
  if (user.role !== 'ADMIN') {
    throw new AuthorizationError();
  }

  const [
    userCount,
    agentCount,
    propertyCount,
    activePropertyCount,
    pendingReviews,
    openContacts,
    recentAudit,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'AGENT' } }),
    prisma.property.count({ where: { deletedAt: null } }),
    prisma.property.count({ where: { status: 'ACTIVE', deletedAt: null } }),
    prisma.review.count({ where: { moderationStatus: 'PENDING' } }),
    prisma.contactRequest.count({ where: { status: 'NEW' } }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { actor: { select: { id: true, email: true, role: true } } },
    }),
  ]);

  return {
    metrics: {
      users: userCount,
      agents: agentCount,
      properties: propertyCount,
      activeProperties: activePropertyCount,
      pendingReviews,
      openContactRequests: openContacts,
    },
    recentAudit,
  };
}

module.exports = {
  getUserDashboard,
  getAgentDashboard,
  getAdminDashboard,
};
