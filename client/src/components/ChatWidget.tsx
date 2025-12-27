import { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2, RotateCcw, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { uuidv4 } from '../utils/uuid';

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  createdAt: string;
  isError?: boolean;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const MAX_MESSAGE_LENGTH = 2000;
const WARNING_THRESHOLD = 1800; // Show warning when 200 chars remaining
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s

// Error messages based on backend error codes
const ERROR_MESSAGES: Record<string, string> = {
  RATE_LIMIT: '⏳ Too many requests. Please wait a moment and try again.',
  TIMEOUT: '⌛ Request timed out. Please try again.',
  SERVICE_UNAVAILABLE: '🔧 AI service is temporarily unavailable. Please try again later.',
  VALIDATION_ERROR: '⚠️ Invalid message. Please check your input.',
  NETWORK_ERROR: '📡 Network error. Check your connection and try again.',
  UNKNOWN: '❌ Something went wrong. Please try again.',
};

// Helper function to format timestamp
const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Helper function to sleep for retry delays
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch with retry and exponential backoff
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // Don't retry on client errors (4xx) except 429 (rate limit)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return response;
      }
      
      // Retry on 5xx server errors or 429 rate limit
      if (response.status >= 500 || response.status === 429) {
        if (attempt < retries - 1) {
          const delay = RETRY_DELAYS[attempt] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
          console.log(`[Retry] Attempt ${attempt + 1} failed with ${response.status}, retrying in ${delay}ms...`);
          await sleep(delay);
          continue;
        }
      }
      
      return response;
    } catch (error) {
      lastError = error as Error;
      
      // Network errors - retry with backoff
      if (attempt < retries - 1) {
        const delay = RETRY_DELAYS[attempt] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        console.log(`[Retry] Network error, retrying in ${delay}ms...`, error);
        await sleep(delay);
        continue;
      }
    }
  }
  
  // All retries exhausted
  throw lastError || new Error('Request failed after retries');
}

function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [inputError, setInputError] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Calculate remaining characters
  const remainingChars = MAX_MESSAGE_LENGTH - inputMessage.length;
  const showCharWarning = inputMessage.length > WARNING_THRESHOLD;
  const isOverLimit = remainingChars < 0;

  // Validate input on change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputMessage(value);
    
    // Clear error when user starts typing valid content
    if (value.trim().length > 0 && value.length <= MAX_MESSAGE_LENGTH) {
      setInputError('');
    }
  };

  // Initialize session and load history
  useEffect(() => {
    // Check localStorage for existing session
    let storedSessionId = localStorage.getItem('apex_session_id');
    
    if (!storedSessionId) {
      storedSessionId = uuidv4();
      localStorage.setItem('apex_session_id', storedSessionId);
    }
    
    setSessionId(storedSessionId);
    
    // Load conversation history
    loadHistory(storedSessionId);
  }, []);

  // Start a new chat session
  const startNewChat = () => {
    const newSessionId = uuidv4();
    localStorage.setItem('apex_session_id', newSessionId);
    setSessionId(newSessionId);
    setMessages([]);
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadHistory = async (targetSessionId: string) => {
    setIsLoadingHistory(true);
    try {
      const response = await fetchWithRetry(`${API_URL}/chat/history/${targetSessionId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      
      if (data.messages) {
        // Map 'model' to 'ai' for backward compatibility with existing data
        const mappedMessages = data.messages.map((msg: any) => ({
          ...msg,
          role: msg.role === 'model' ? 'ai' : msg.role,
        }));
        setMessages(mappedMessages);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedMessage = inputMessage.trim();
    
    // Frontend validation
    if (!trimmedMessage) {
      setInputError('Please enter a message');
      return;
    }
    
    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      setInputError(`Message too long (${trimmedMessage.length}/${MAX_MESSAGE_LENGTH})`);
      return;
    }
    
    if (isLoading) return;

    setInputMessage('');
    setInputError('');
    setIsLoading(true);

    // Optimistically add user message to UI
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      text: trimmedMessage,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      const response = await fetchWithRetry(`${API_URL}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: trimmedMessage,
          sessionId: sessionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Get specific error message based on error code
        const errorCode = data.errorCode || 'UNKNOWN';
        const errorText = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.UNKNOWN;
        throw new Error(errorText);
      }

      // Add AI response to messages
      const aiMessage: Message = {
        id: data.messageId,
        role: 'ai',
        text: data.reply,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      // Check if it's a network error (fetch failed entirely)
      const isNetworkError = error.message?.includes('Failed to fetch') || 
                             error.message?.includes('Network') ||
                             error.name === 'TypeError';
      
      // Add error message with specific text
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'ai',
        text: isNetworkError ? ERROR_MESSAGES.NETWORK_ERROR : (error.message || ERROR_MESSAGES.UNKNOWN),
        createdAt: new Date().toISOString(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Widget */}
      {isOpen && (
        <div className="mb-4 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="bg-black text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center p-1.5">
                <img src="/logo.png" alt="APEX" className="w-full h-full object-contain" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">APEX Support</h3>
                <p className="text-xs text-gray-400">Always here to help</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={startNewChat}
                title="New Chat"
                className="hover:bg-white/20 rounded-full p-1.5 transition-colors"
              >
                <RotateCcw size={18} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/20 rounded-full p-1 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 chat-scrollbar">
            {/* Loading history indicator */}
            {isLoadingHistory && (
              <div className="flex justify-center items-center py-8">
                <Loader2 size={24} className="animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">Loading conversation...</span>
              </div>
            )}
            
            {!isLoadingHistory && messages.length === 0 && (
              <div className="text-center text-gray-500 mt-8">
                <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center p-3">
                  <img src="/logo.png" alt="APEX" className="w-full h-full object-contain" />
                </div>
                <p className="text-sm">Hi! How can I help you today?</p>
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'ai' && (
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center p-1.5 flex-shrink-0">
                    <img src="/logo.png" alt="APEX" className="w-full h-full object-contain" />
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-black text-white'
                        : message.isError
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-white text-gray-800 shadow-sm border border-gray-200'
                    }`}
                  >
                    {message.isError && (
                      <div className="flex items-center gap-1 mb-1">
                        <AlertCircle size={14} className="text-red-500" />
                      </div>
                    )}
                    {message.role === 'ai' ? (
                      <ReactMarkdown className="markdown-content text-sm">
                        {message.text}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                    )}
                  </div>
                  <span className={`text-xs text-gray-400 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {formatTime(message.createdAt)}
                  </span>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-200">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-gray-200">
            {/* Character count warning */}
            {showCharWarning && (
              <div className={`text-xs mb-2 ${isOverLimit ? 'text-red-500' : 'text-amber-500'}`}>
                {isOverLimit 
                  ? `Message too long! ${Math.abs(remainingChars)} characters over limit`
                  : `${remainingChars} characters remaining`
                }
              </div>
            )}
            
            {/* Input error message */}
            {inputError && (
              <div className="text-xs text-red-500 mb-2 flex items-center gap-1">
                <AlertCircle size={12} />
                {inputError}
              </div>
            )}
            
            <form onSubmit={sendMessage} className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={handleInputChange}
                placeholder="Type your message..."
                disabled={isLoading}
                maxLength={MAX_MESSAGE_LENGTH + 50} // Allow slight overflow to show error
                className={`flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${
                  isOverLimit || inputError
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-black'
                }`}
              />
              <button
                type="submit"
                disabled={isLoading || !inputMessage.trim() || isOverLimit}
                className="bg-black text-white p-2 rounded-full hover:bg-gray-800 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Send size={20} />
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-white rounded-full p-3 shadow-2xl hover:shadow-3xl transition-all hover:scale-110 border-2 border-gray-200"
        >
          <img src="/logo.png" alt="APEX" className="w-10 h-10 object-contain" />
        </button>
      )}
    </div>
  );
}

export default ChatWidget;
