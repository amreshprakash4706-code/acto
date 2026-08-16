'use strict';

const { prisma } = require('../db/connection');
const { generateReply } = require('../ai/geminiProvider');
const { ValidationError } = require('../utils/errors');
const propertyService = require('./propertyService');

async function chat({ userId, message, conversationId, propertyId }) {
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    throw new ValidationError('message is required');
  }

  let conversation;
  if (conversationId) {
    conversation = await prisma.aiConversation.findFirst({
      where: { id: conversationId, ...(userId ? { userId } : {}) },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
    });
  }

  if (!conversation) {
    conversation = await prisma.aiConversation.create({
      data: {
        userId: userId || null,
        title: message.slice(0, 80),
      },
      include: { messages: true },
    });
  }

  let propertyContext = null;
  if (propertyId) {
    try {
      const prop = await propertyService.getPropertyById(propertyId, null);
      propertyContext = {
        id: prop.id,
        title: prop.title,
        propertyType: prop.propertyType,
        status: prop.status,
        price: Number(prop.price),
        currency: prop.currency,
        bedrooms: prop.bedrooms,
        bathrooms: prop.bathrooms,
        areaSqft: prop.areaSqft,
        city: prop.city,
        country: prop.country,
        amenities: prop.amenities,
        provenance: prop.provenance,
        verificationStatus: prop.verificationStatus,
      };
    } catch {
      // ignore missing property context
    }
  }

  const history = (conversation.messages || []).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const { reply, model } = await generateReply({
    userMessage: message,
    conversationHistory: history,
    propertyContext,
  });

  await prisma.aiMessage.createMany({
    data: [
      {
        conversationId: conversation.id,
        role: 'user',
        content: message.trim().slice(0, 2000),
      },
      {
        conversationId: conversation.id,
        role: 'assistant',
        content: reply,
        metadata: { model },
      },
    ],
  });

  await prisma.aiConversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });

  return {
    conversationId: conversation.id,
    reply,
    model,
  };
}

module.exports = { chat };
