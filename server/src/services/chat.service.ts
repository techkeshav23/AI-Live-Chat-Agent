import prisma from '../lib/prisma';
import geminiService from './gemini.service';

interface Message {
  id: string;
  role: string;
  text: string;
  createdAt: Date;
}

interface Conversation {
  id: string;
  sessionId: string;
  messages: Message[];
  createdAt: Date;
  updatedAt?: Date;
}

interface ChatResponse {
  reply: string;
  sessionId: string;
  messageId: string;
  metadata: {
    tokensUsed?: number;
    responseTime: number;
  };
}

interface ChatHistory {
  messages: Array<{
    id: string;
    role: string;
    text: string;
    createdAt: Date;
  }>;
}

/**
 * Chat Service - Business logic layer for chat operations
 * Separates data access and AI logic from route handlers
 */
class ChatService {
  /**
   * Find or create a conversation by session ID
   */
  async findOrCreateConversation(sessionId: string): Promise<Conversation> {
    let conversation = await prisma.conversation.findUnique({
      where: { sessionId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { 
          sessionId,
          // Explicitly set updatedAt to satisfy DBs missing default/updatedAt trigger
          updatedAt: new Date(),
        },
        include: { messages: true },
      });
    }

    return conversation;
  }

  /**
   * Process a user message and generate AI response
   */
  async processMessage(sessionId: string, userMessage: string): Promise<ChatResponse> {
    // Get or create conversation
    const conversation = await this.findOrCreateConversation(sessionId);

    // Format conversation history for Gemini
    const history = geminiService.formatHistoryForGemini(
      conversation.messages.map((msg) => ({
        role: msg.role,
        text: msg.text,
      }))
    );

    // Generate AI response
    const { reply, tokensUsed, responseTime } = await geminiService.generateReply(
      history,
      userMessage
    );

    // Persist user message and AI response in database
    const [, aiMessage] = await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'user',
          text: userMessage,
        },
      }),
      prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'ai',
          text: reply,
        },
      }),
    ]);

    return {
      reply,
      sessionId,
      messageId: aiMessage.id,
      metadata: {
        tokensUsed,
        responseTime,
      },
    };
  }

  /**
   * Get conversation history by session ID
   */
  async getHistory(sessionId: string): Promise<ChatHistory> {
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

    return {
      messages: conversation?.messages || [],
    };
  }
}

export default new ChatService();
