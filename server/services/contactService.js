'use strict';

const { prisma } = require('../db/connection');
const { ValidationError, NotFoundError, AuthorizationError } = require('../utils/errors');

async function createContactRequest(data, userId = null) {
  const { name, email, phone, subject, message, propertyId } = data;
  if (!name || !email || !message) {
    throw new ValidationError('name, email and message are required');
  }
  if (message.length > 5000) {
    throw new ValidationError('Message too long');
  }

  const request = await prisma.contactRequest.create({
    data: {
      name: String(name).slice(0, 120),
      email: String(email).trim().toLowerCase().slice(0, 255),
      phone: phone ? String(phone).slice(0, 40) : null,
      subject: subject ? String(subject).slice(0, 200) : null,
      message: String(message).slice(0, 5000),
      propertyId: propertyId || null,
      userId: userId || null,
      status: 'NEW',
    },
  });
  return request;
}

async function listContactRequests(user) {
  if (user.role !== 'ADMIN' && user.role !== 'AGENT') {
    throw new AuthorizationError();
  }
  return prisma.contactRequest.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      property: { select: { id: true, title: true } },
      user: { select: { id: true, email: true, name: true } },
    },
  });
}

async function updateContactStatus(id, status, user) {
  if (user.role !== 'ADMIN' && user.role !== 'AGENT') {
    throw new AuthorizationError();
  }
  const allowed = ['NEW', 'IN_PROGRESS', 'RESOLVED', 'SPAM'];
  if (!allowed.includes(status)) {
    throw new ValidationError('Invalid status');
  }
  return prisma.contactRequest.update({
    where: { id },
    data: { status, assignedTo: user.id },
  });
}

module.exports = { createContactRequest, listContactRequests, updateContactStatus };
