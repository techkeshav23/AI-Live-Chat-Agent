/**
 * Channel Interface - Abstraction for multi-channel support
 * 
 * Implement this interface to add new channels like WhatsApp, Instagram, Facebook, etc.
 * Each channel handles message ingestion and response delivery differently.
 */

export interface IncomingMessage {
  text: string;
  sessionId: string;
  channelType: ChannelType;
  metadata?: Record<string, unknown>;
}

export interface OutgoingMessage {
  text: string;
  sessionId: string;
  channelType: ChannelType;
  messageId: string;
  metadata?: {
    tokensUsed?: number;
    responseTime?: number;
  };
}

export type ChannelType = 'web' | 'whatsapp' | 'instagram' | 'facebook' | 'sms';

/**
 * IChannel - Interface for channel implementations
 * 
 * To add a new channel (e.g., WhatsApp):
 * 1. Create src/channels/whatsapp.channel.ts
 * 2. Implement IChannel interface
 * 3. Register in channel factory
 * 
 * Example:
 * ```
 * class WhatsAppChannel implements IChannel {
 *   readonly type = 'whatsapp';
 *   
 *   async parseIncoming(rawPayload: any): Promise<IncomingMessage> {
 *     // Parse WhatsApp webhook payload
 *   }
 *   
 *   async sendResponse(message: OutgoingMessage): Promise<void> {
 *     // Call WhatsApp API to send message
 *   }
 * }
 * ```
 */
export interface IChannel {
  readonly type: ChannelType;
  
  /**
   * Parse incoming webhook/request payload into standard message format
   */
  parseIncoming(rawPayload: unknown): Promise<IncomingMessage>;
  
  /**
   * Send response back through the channel
   */
  sendResponse(message: OutgoingMessage): Promise<void>;
  
  /**
   * Validate webhook signature (for security)
   */
  validateSignature?(signature: string, payload: unknown): boolean;
}

/**
 * Channel Factory - Registry for channel implementations
 */
export class ChannelFactory {
  private static channels: Map<ChannelType, IChannel> = new Map();

  static register(channel: IChannel): void {
    this.channels.set(channel.type, channel);
  }

  static get(type: ChannelType): IChannel | undefined {
    return this.channels.get(type);
  }

  static getAll(): IChannel[] {
    return Array.from(this.channels.values());
  }
}
