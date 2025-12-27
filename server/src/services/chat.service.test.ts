import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
vi.mock('../lib/prisma', () => ({
  default: {
    conversation: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    message: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock Gemini service
vi.mock('./gemini.service', () => ({
  default: {
    generateReply: vi.fn(),
    formatHistoryForGemini: vi.fn(),
  },
}));

import prisma from '../lib/prisma';
import geminiService from './gemini.service';
import chatService from './chat.service';

describe('ChatService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findOrCreateConversation', () => {
    it('should return existing conversation if found', async () => {
      const mockConversation = {
        id: 'conv-123',
        sessionId: 'session-123',
        messages: [],
        createdAt: new Date(),
      };

      vi.mocked(prisma.conversation.findUnique).mockResolvedValueOnce(mockConversation as any);

      const result = await chatService.findOrCreateConversation('session-123');

      expect(prisma.conversation.findUnique).toHaveBeenCalledWith({
        where: { sessionId: 'session-123' },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
      expect(result).toEqual(mockConversation);
      expect(prisma.conversation.create).not.toHaveBeenCalled();
    });

    it('should create new conversation if not found', async () => {
      const newConversation = {
        id: 'new-conv-123',
        sessionId: 'new-session',
        messages: [],
        createdAt: new Date(),
      };

      vi.mocked(prisma.conversation.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.conversation.create).mockResolvedValueOnce(newConversation as any);

      const result = await chatService.findOrCreateConversation('new-session');

      expect(prisma.conversation.create).toHaveBeenCalledWith({
        data: { sessionId: 'new-session' },
        include: { messages: true },
      });
      expect(result).toEqual(newConversation);
    });
  });

  describe('processMessage', () => {
    it('should process message and return AI response', async () => {
      const mockConversation = {
        id: 'conv-123',
        sessionId: 'session-123',
        messages: [
          { role: 'user', text: 'Hello' },
          { role: 'ai', text: 'Hi there!' },
        ],
        createdAt: new Date(),
      };

      const mockAiResponse = {
        reply: 'I can help with that!',
        tokensUsed: 42,
        responseTime: 500,
      };

      const mockAiMessage = {
        id: 'msg-ai-123',
        role: 'ai',
        text: 'I can help with that!',
      };

      vi.mocked(prisma.conversation.findUnique).mockResolvedValueOnce(mockConversation as any);
      vi.mocked(geminiService.formatHistoryForGemini).mockReturnValueOnce([
        { role: 'user', parts: [{ text: 'Hello' }] },
        { role: 'model', parts: [{ text: 'Hi there!' }] },
      ]);
      vi.mocked(geminiService.generateReply).mockResolvedValueOnce(mockAiResponse);
      vi.mocked(prisma.$transaction).mockResolvedValueOnce([{}, mockAiMessage] as any);

      const result = await chatService.processMessage('session-123', 'New question');

      expect(geminiService.formatHistoryForGemini).toHaveBeenCalledWith([
        { role: 'user', text: 'Hello' },
        { role: 'ai', text: 'Hi there!' },
      ]);
      expect(geminiService.generateReply).toHaveBeenCalled();
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual({
        reply: 'I can help with that!',
        sessionId: 'session-123',
        messageId: 'msg-ai-123',
        metadata: {
          tokensUsed: 42,
          responseTime: 500,
        },
      });
    });

    it('should create new conversation for new session', async () => {
      const newConversation = {
        id: 'new-conv',
        sessionId: 'brand-new-session',
        messages: [],
        createdAt: new Date(),
      };

      const mockAiResponse = {
        reply: 'Hello! How can I help?',
        tokensUsed: 20,
        responseTime: 300,
      };

      const mockAiMessage = {
        id: 'first-msg',
        role: 'ai',
        text: 'Hello! How can I help?',
      };

      vi.mocked(prisma.conversation.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.conversation.create).mockResolvedValueOnce(newConversation as any);
      vi.mocked(geminiService.formatHistoryForGemini).mockReturnValueOnce([]);
      vi.mocked(geminiService.generateReply).mockResolvedValueOnce(mockAiResponse);
      vi.mocked(prisma.$transaction).mockResolvedValueOnce([{}, mockAiMessage] as any);

      const result = await chatService.processMessage('brand-new-session', 'Hi!');

      expect(prisma.conversation.create).toHaveBeenCalled();
      expect(geminiService.formatHistoryForGemini).toHaveBeenCalledWith([]);
      expect(result.sessionId).toBe('brand-new-session');
    });

    it('should propagate errors from Gemini service', async () => {
      const mockConversation = {
        id: 'conv-123',
        sessionId: 'error-session',
        messages: [],
        createdAt: new Date(),
      };

      vi.mocked(prisma.conversation.findUnique).mockResolvedValueOnce(mockConversation as any);
      vi.mocked(geminiService.formatHistoryForGemini).mockReturnValueOnce([]);
      vi.mocked(geminiService.generateReply).mockRejectedValueOnce(
        new Error('RATE_LIMIT_EXCEEDED')
      );

      await expect(
        chatService.processMessage('error-session', 'Test')
      ).rejects.toThrow('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('getHistory', () => {
    it('should return messages for existing conversation', async () => {
      const mockConversation = {
        id: 'conv-123',
        sessionId: 'history-session',
        messages: [
          { id: 'msg-1', role: 'user', text: 'Hello', createdAt: new Date() },
          { id: 'msg-2', role: 'ai', text: 'Hi!', createdAt: new Date() },
        ],
      };

      vi.mocked(prisma.conversation.findUnique).mockResolvedValueOnce(mockConversation as any);

      const result = await chatService.getHistory('history-session');

      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].role).toBe('user');
      expect(result.messages[1].role).toBe('ai');
    });

    it('should return empty array for non-existent session', async () => {
      vi.mocked(prisma.conversation.findUnique).mockResolvedValueOnce(null);

      const result = await chatService.getHistory('non-existent-session');

      expect(result.messages).toEqual([]);
    });
  });
});
