import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Ensure environment variables are loaded even when this module is imported
// before the server entrypoint executes (CommonJS import hoisting).
dotenv.config();

// System instructions for the AI - Domain knowledge for e-commerce support
const SYSTEM_INSTRUCTION = `You are a professional customer support agent for "Apex", an AI-powered customer engagement platform.

Domain Knowledge:
- Shipping: Standard shipping takes 3-5 business days
- Returns: We offer a 30-day return window for all products
- Support Hours: Monday-Friday, 9 AM - 6 PM PST
- Brand Voice: Professional, concise, helpful, and friendly

Guidelines:
- Always maintain the "Apex" brand voice
- Provide accurate information based on the domain knowledge above
- Be empathetic and solution-oriented
- Keep responses concise but complete
- If you don't know something, acknowledge it and offer to escalate to a human agent`;

interface ChatMessage {
  role: 'user' | 'model'; // Gemini API uses 'model', we map from 'ai'
  parts: { text: string }[];
}

interface GenerateReplyResult {
  reply: string;
  tokensUsed?: number;
  responseTime: number;
}

/**
 * Interface for LLM services - allows easy swapping between providers
 * Implement this interface to add support for OpenAI, Anthropic, etc.
 */
export interface ILLMService {
  generateReply(
    history: ChatMessage[],
    userMessage: string
  ): Promise<GenerateReplyResult>;
  
  formatHistoryForGemini(
    messages: Array<{ role: string; text: string }>
  ): ChatMessage[];
}

class GeminiService implements ILLMService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private modelName: string;
  private readonly defaultModel = 'gemini-3-flash-preview';
  private maxRetries: number = 3;
  private retryDelay: number = 10000; // 10 second base delay to cross rate limit windows
  private timeout: number = 30000; // 30 second timeout for API calls

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }

    // Using Gemini 3 Flash Preview - latest preview model
    // Can be overridden via GEMINI_MODEL env var for testing other models
    this.modelName = process.env.GEMINI_MODEL || this.defaultModel;

    this.genAI = new GoogleGenerativeAI(apiKey);

    this.model = this.createModel(this.modelName);

    console.log(`[Gemini Service] Using model: ${this.modelName}`);
  }

  /**
   * Generate a reply using Gemini API with conversation history
   * Includes automatic retry with exponential backoff for rate limits
   * @param history - Previous conversation messages
   * @param userMessage - Current user message
   * @returns AI-generated reply with performance metrics
   */
  async generateReply(
    history: ChatMessage[],
    userMessage: string
  ): Promise<GenerateReplyResult> {
    const startTime = Date.now();

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // Start a chat session with history
        const chat = this.model.startChat({
          history: history,
          generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.7,
          },
        });

        // Send the user message and get response (with timeout)
        const result = await this.withTimeout<{ response: any }>(
          chat.sendMessage(userMessage),
          this.timeout,
          'Gemini API request timed out'
        );
        const response = await result.response;
        const reply = response.text();

        // Calculate performance metrics (founding engineer mindset)
        const responseTime = Date.now() - startTime;
        
        // Note: Token usage tracking for cost monitoring
        // In production, you'd want to log this to a monitoring service
        const tokensUsed = response.usageMetadata?.totalTokenCount;

        // Log performance metrics for monitoring
        console.log(`[Gemini Service] Response time: ${responseTime}ms, Tokens: ${tokensUsed || 'N/A'}, Attempt: ${attempt}`);

        return {
          reply,
          tokensUsed,
          responseTime,
        };
      } catch (error: any) {
        const isRateLimit = error.status === 429 || error.message?.includes('429') || error.message?.includes('quota');

        // If the configured model is invalid in prod, fall back to the known-good default
        if (error.status === 404 && this.modelName !== this.defaultModel) {
          console.warn(`[Gemini Service] Model ${this.modelName} not found. Falling back to ${this.defaultModel}`);
          this.modelName = this.defaultModel;
          this.model = this.createModel(this.modelName);
          // Retry immediately with the fallback model
          continue;
        }
        
        // Handle rate limiting with retry
        if (isRateLimit && attempt < this.maxRetries) {
          // Custom delays to cross minute boundaries: 10s, 30s, 65s
          const delays = [10000, 30000, 65000];
          const delay = delays[attempt - 1] || 10000;
          console.warn(`[Gemini Service] Rate limit hit, waiting ${delay/1000}s for quota reset... (Attempt ${attempt}/${this.maxRetries})`);
          await this.sleep(delay);
          continue; // Retry
        } else if (isRateLimit) {
          console.error(`[Gemini Service] Rate limit exceeded after ${this.maxRetries} attempts`);
          throw new Error('RATE_LIMIT_EXCEEDED: Please try again in a few moments. Consider upgrading your API plan for higher limits.');
        }

        // Model name not found / not supported for the requested method.
        if (error.status === 404) {
          console.error(`[Gemini Service] Model not found or not supported: ${this.modelName}`);
          throw new Error('MODEL_NOT_FOUND');
        }
        
        console.error('[Gemini Service] Error:', error.message || error);
        throw new Error('AI_SERVICE_ERROR: ' + (error.message || 'Unknown error'));
      }
    }

    throw new Error('AI_SERVICE_ERROR: Max retries exceeded');
  }

  /**
   * Sleep helper for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Timeout wrapper for API calls
   * @param promise - The promise to wrap
   * @param ms - Timeout in milliseconds
   * @param message - Error message on timeout
   */
  private withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    });
    return Promise.race([promise, timeout]);
  }

  /**
   * Convert database messages to Gemini chat format
   * @param messages - Database messages
   * @returns Formatted chat history for Gemini
   */
  formatHistoryForGemini(messages: Array<{ role: string; text: string }>): ChatMessage[] {
    return messages.map((msg) => ({
      // Map 'ai' (our DB) to 'model' (Gemini API format)
      role: (msg.role === 'ai' ? 'model' : msg.role) as 'user' | 'model',
      parts: [{ text: msg.text }],
    }));
  }

  /**
   * Helper to create a configured model instance
   */
  private createModel(modelName: string) {
    return this.genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: SYSTEM_INSTRUCTION,
    });
  }
}

export default new GeminiService();
