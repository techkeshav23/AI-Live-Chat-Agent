import { Router, Request, Response } from 'express';
import { z } from 'zod';
import chatService from '../services/chat.service';
import { createRateLimitMiddleware, chatRateLimitConfig } from '../middleware/rateLimiter';

const router = Router();

// Error codes for frontend to display specific messages
const ERROR_CODES = {
  RATE_LIMIT: 'RATE_LIMIT',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  TIMEOUT: 'TIMEOUT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNKNOWN: 'UNKNOWN',
} as const;

// Zod validation schema - also trims whitespace
const chatMessageSchema = z.object({
  message: z
    .string()
    .transform((val) => val.trim())
    .refine((val) => val.length > 0, { message: 'Message cannot be empty' })
    .refine((val) => val.length <= 2000, { message: 'Message too long (max 2000 characters)' }),
  sessionId: z.string().uuid('Invalid session ID format'),
});

/**
 * POST /api/chat/message
 * Send a message and get AI response
 * Rate limited: 20 requests per minute per session
 */
router.post('/message', createRateLimitMiddleware(chatRateLimitConfig), async (req: Request, res: Response) => {
  try {
    // Validate request body with Zod
    const validationResult = chatMessageSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        errorCode: ERROR_CODES.VALIDATION_ERROR,
        details: validationResult.error.errors,
      });
    }

    const { message, sessionId } = validationResult.data;

    // Use chat service to process message
    const response = await chatService.processMessage(sessionId, message);

    return res.status(200).json(response);
  } catch (error: any) {
    console.error('[Chat API] Error:', error);

    // Handle specific error types with error codes for frontend
    if (error.message?.includes('RATE_LIMIT')) {
      return res.status(429).json({
        error: 'Too many requests. Please wait a moment and try again.',
        errorCode: ERROR_CODES.RATE_LIMIT,
      });
    }

    if (error.message?.includes('timed out') || error.message?.includes('TIMEOUT')) {
      return res.status(504).json({
        error: 'Request timed out. Please try again.',
        errorCode: ERROR_CODES.TIMEOUT,
      });
    }

    if (error.message?.includes('MODEL_NOT_FOUND') || error.message?.includes('AI_SERVICE_ERROR')) {
      return res.status(503).json({
        error: 'AI service is temporarily unavailable. Please try again later.',
        errorCode: ERROR_CODES.SERVICE_UNAVAILABLE,
      });
    }

    // Generic error response
    return res.status(500).json({
      error: 'Something went wrong. Please try again.',
      errorCode: ERROR_CODES.UNKNOWN,
    });
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
        errorCode: ERROR_CODES.VALIDATION_ERROR,
      });
    }

    const history = await chatService.getHistory(sessionId);
    return res.status(200).json(history);
  } catch (error) {
    console.error('[Chat API] Error fetching history:', error);
    return res.status(500).json({
      error: 'Failed to fetch conversation history',
      errorCode: ERROR_CODES.UNKNOWN,
    });
  }
});

export default router;
