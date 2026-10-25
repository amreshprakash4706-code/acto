'use strict';

const { prisma } = require('../db/connection');
const { NotFoundError, ConflictError } = require('../utils/errors');

async function listFavorites(userId) {
  const favorites = await prisma.favorite.findMany({
    where: { userId },
    include: {
      property: {
        include: {
          images: { where: { isPrimary: true }, take: 1 },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  return favorites.map((f) => f.property).filter((p) => p && !p.deletedAt);
}

async function addFavorite(userId, propertyId) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, deletedAt: null, status: 'ACTIVE' },
  });
  if (!property) throw new NotFoundError('Property not found');

  try {
    await prisma.favorite.create({
      data: { userId, propertyId },
    });
  } catch (err) {
    if (err.code === 'P2002') {
      throw new ConflictError('Already in favorites');
    }
    throw err;
  }
  return { success: true };
}

async function removeFavorite(userId, propertyId) {
  const result = await prisma.favorite.deleteMany({
    where: { userId, propertyId },
  });
  if (result.count === 0) throw new NotFoundError('Favorite not found');
  return { success: true };
}

module.exports = { listFavorites, addFavorite, removeFavorite };
