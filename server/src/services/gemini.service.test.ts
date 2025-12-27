import { describe, it, expect, vi, beforeAll } from 'vitest';

// Mock functions need to be defined inside the factory function due to hoisting
let mockSendMessage: ReturnType<typeof vi.fn>;
let mockStartChat: ReturnType<typeof vi.fn>;

vi.mock('@google/generative-ai', () => {
  // Define mocks inside factory to avoid hoisting issues
  const sendMessage = vi.fn();
  const startChat = vi.fn(() => ({ sendMessage }));
  
  // Export for tests to access
  return {
    GoogleGenerativeAI: class {
      constructor() {}
      getGenerativeModel() {
        return { startChat };
      }
    },
    __mocks: { sendMessage, startChat },
  };
});

// Set env before importing
process.env.GEMINI_API_KEY = 'test-api-key';

// Import after mock setup
import geminiService from './gemini.service';
import * as genAI from '@google/generative-ai';

beforeAll(() => {
  // Get references to the mocks
  const mocks = (genAI as any).__mocks;
  mockSendMessage = mocks.sendMessage;
  mockStartChat = mocks.startChat;
});

describe('GeminiService', () => {
  describe('formatHistoryForGemini', () => {
    it('should convert "ai" role to "model" for Gemini API', () => {
      const messages = [
        { role: 'user', text: 'Hello' },
        { role: 'ai', text: 'Hi there!' },
        { role: 'user', text: 'How are you?' },
      ];

      const formatted = geminiService.formatHistoryForGemini(messages);

      expect(formatted).toHaveLength(3);
      expect(formatted[0]).toEqual({
        role: 'user',
        parts: [{ text: 'Hello' }],
      });
      expect(formatted[1]).toEqual({
        role: 'model', // 'ai' should be converted to 'model'
        parts: [{ text: 'Hi there!' }],
      });
      expect(formatted[2]).toEqual({
        role: 'user',
        parts: [{ text: 'How are you?' }],
      });
    });

    it('should handle empty message array', () => {
      const formatted = geminiService.formatHistoryForGemini([]);
      expect(formatted).toEqual([]);
    });

    it('should preserve user role as-is', () => {
      const messages = [{ role: 'user', text: 'Test message' }];
      const formatted = geminiService.formatHistoryForGemini(messages);
      expect(formatted[0].role).toBe('user');
    });

    it('should wrap text in parts array correctly', () => {
      const messages = [{ role: 'user', text: 'Hello world!' }];
      const formatted = geminiService.formatHistoryForGemini(messages);
      
      expect(formatted[0].parts).toEqual([{ text: 'Hello world!' }]);
    });

    it('should handle multiple consecutive messages from same role', () => {
      const messages = [
        { role: 'user', text: 'First' },
        { role: 'user', text: 'Second' },
        { role: 'ai', text: 'Response' },
      ];
      const formatted = geminiService.formatHistoryForGemini(messages);
      
      expect(formatted[0].role).toBe('user');
      expect(formatted[1].role).toBe('user');
      expect(formatted[2].role).toBe('model');
    });
  });

  describe('generateReply', () => {
    it('should call Gemini API and return response', async () => {
      const mockResponse = {
        response: {
          text: () => 'Mocked AI response',
          usageMetadata: { totalTokenCount: 50 },
        },
      };

      mockSendMessage.mockResolvedValueOnce(mockResponse);

      const result = await geminiService.generateReply([], 'Hello');

      expect(mockStartChat).toHaveBeenCalled();
      expect(mockSendMessage).toHaveBeenCalledWith('Hello');
      expect(result.reply).toBe('Mocked AI response');
      expect(result.tokensUsed).toBe(50);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should throw RATE_LIMIT_EXCEEDED on 429 error', async () => {
      const rateLimitError = new Error('429 Too Many Requests');
      (rateLimitError as any).status = 429;
      mockSendMessage.mockRejectedValue(rateLimitError);

      // Set retries to 1 for faster test
      (geminiService as any).maxRetries = 1;

      await expect(
        geminiService.generateReply([], 'Test')
      ).rejects.toThrow('RATE_LIMIT_EXCEEDED');

      // Reset
      (geminiService as any).maxRetries = 3;
    });

    it('should throw MODEL_NOT_FOUND on 404 error', async () => {
      const notFoundError = new Error('Not found');
      (notFoundError as any).status = 404;
      mockSendMessage.mockRejectedValue(notFoundError);

      await expect(
        geminiService.generateReply([], 'Test')
      ).rejects.toThrow('MODEL_NOT_FOUND');
    });

    it('should throw AI_SERVICE_ERROR on unknown errors', async () => {
      mockSendMessage.mockRejectedValue(new Error('Unknown'));

      await expect(
        geminiService.generateReply([], 'Test')
      ).rejects.toThrow('AI_SERVICE_ERROR');
    });
  });
});
