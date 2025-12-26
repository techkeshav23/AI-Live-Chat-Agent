import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import geminiService from '../services/gemini.service';

const router = Router();

// Zod validation schema
const chatMessageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(2000, 'Message too long'),
  sessionId: z.string().uuid('Invalid session ID format'),
});

/**
 * POST /api/chat/message
 * Send a message and get AI response
 */
router.post('/message', async (req: Request, res: Response) => {
  try {
    // Validate request body with Zod
    const validationResult = chatMessageSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.errors,
      });
    }

    const { message, sessionId } = validationResult.data;

    // Find or create conversation
    let conversation = await prisma.conversation.findUnique({
      where: { sessionId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { sessionId },
        include: { messages: true },
      });
    }

    // Format conversation history for Gemini
    const history = geminiService.formatHistoryForGemini(
      conversation.messages.map((msg: { role: string; text: string }) => ({
        role: msg.role,
        text: msg.text,
      }))
    );

    // Generate AI response
    const { reply, tokensUsed, responseTime } = await geminiService.generateReply(
      history,
      message
    );

    // Persist user message and AI response in database
    const [userMessage, modelMessage] = await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'user',
          text: message,
        },
      }),
      prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'model',
          text: reply,
        },
      }),
    ]);

    // Return response with performance metrics
    return res.status(200).json({
      message: reply,
      messageId: modelMessage.id,
      metadata: {
        tokensUsed,
        responseTime,
      },
    });
  } catch (error: any) {
    console.error('[Chat API] Error:', error);

    // Handle specific error types
    if (error.message === 'RATE_LIMIT_EXCEEDED') {
      return res.status(429).json({ error: 'Service temporarily unavailable' });
    }

    if (error.message === 'MODEL_NOT_FOUND' || error.message === 'AI_SERVICE_ERROR') {
      return res.status(503).json({ error: 'Service temporarily unavailable' });
    }

    // Generic error response
    return res.status(500).json({ error: 'Service temporarily unavailable' });
  }
});

/**
 * GET /api/chat/history/:sessionId
 * Get conversation history for a session
 */
router.get('/history/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    // Validate sessionId is a valid UUID
    const sessionIdSchema = z.string().uuid();
    const validationResult = sessionIdSchema.safeParse(sessionId);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid session ID format',
      });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            role: true,
            text: true,
            createdAt: true,
          },
        },
      },
    });

    if (!conversation) {
      return res.status(200).json({
        messages: [],
      });
    }

    return res.status(200).json({
      messages: conversation.messages,
    });
  } catch (error) {
    console.error('[Chat API] Error fetching history:', error);
    return res.status(500).json({
      error: 'Failed to fetch conversation history',
    });
  }
});

export default router;
