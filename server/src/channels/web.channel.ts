import { 
  IChannel, 
  ChannelType, 
  IncomingMessage, 
  OutgoingMessage,
  ChannelFactory 
} from '../interfaces/channel.interface';

/**
 * Web Channel - Handles messages from the web chat widget
 * 
 * This is the default channel implementation for browser-based chat.
 * Messages are sent via REST API and responses returned directly.
 */
class WebChannel implements IChannel {
  readonly type: ChannelType = 'web';

  async parseIncoming(rawPayload: unknown): Promise<IncomingMessage> {
    const payload = rawPayload as { message: string; sessionId: string };
    
    return {
      text: payload.message,
      sessionId: payload.sessionId,
      channelType: 'web',
    };
  }

  async sendResponse(message: OutgoingMessage): Promise<void> {
    // For web channel, response is returned directly via HTTP
    // No additional delivery mechanism needed
    console.log(`[WebChannel] Response sent to session ${message.sessionId}`);
  }
}

// Register the web channel
const webChannel = new WebChannel();
ChannelFactory.register(webChannel);

export default webChannel;
