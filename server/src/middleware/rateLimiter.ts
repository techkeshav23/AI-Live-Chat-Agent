import { Request, Response, NextFunction } from 'express';

interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  message?: string;      // Custom error message
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * In-memory rate limiter for per-session request limiting
 * 
 * In production, use Redis for distributed rate limiting:
 * - Supports multiple server instances
 * - Persists across restarts
 * - More efficient memory usage
 * 
 * Example Redis implementation:
 * ```
 * const redis = new Redis();
 * const key = `ratelimit:${sessionId}`;
 * const current = await redis.incr(key);
 * if (current === 1) await redis.expire(key, windowSeconds);
 * ```
 */
class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Check if a session has exceeded rate limit
   */
  isRateLimited(sessionId: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const entry = this.store.get(sessionId);

    if (!entry || now > entry.resetTime) {
      // First request or window expired - reset counter
      this.store.set(sessionId, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      return false;
    }

    // Increment counter
    entry.count++;

    // Check if exceeded
    return entry.count > config.maxRequests;
  }

  /**
   * Get remaining requests for a session
   */
  getRemaining(sessionId: string, config: RateLimitConfig): number {
    const entry = this.store.get(sessionId);
    if (!entry || Date.now() > entry.resetTime) {
      return config.maxRequests;
    }
    return Math.max(0, config.maxRequests - entry.count);
  }

  /**
   * Get reset time for a session
   */
  getResetTime(sessionId: string): number | null {
    const entry = this.store.get(sessionId);
    return entry ? entry.resetTime : null;
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Stop the cleanup interval (for testing/shutdown)
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

/**
 * Rate limiting middleware factory
 * 
 * Usage:
 * ```
 * router.post('/message', createRateLimitMiddleware({
 *   windowMs: 60000,    // 1 minute
 *   maxRequests: 20,    // 20 requests per minute
 * }), async (req, res) => { ... });
 * ```
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Extract session ID from body or generate temporary one from IP
    const sessionId = req.body?.sessionId || req.ip || 'anonymous';

    if (rateLimiter.isRateLimited(sessionId, config)) {
      const resetTime = rateLimiter.getResetTime(sessionId);
      const retryAfter = resetTime ? Math.ceil((resetTime - Date.now()) / 1000) : 60;

      res.setHeader('Retry-After', retryAfter.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      
      return res.status(429).json({
        error: config.message || 'Too many requests. Please slow down.',
        errorCode: 'RATE_LIMIT',
        retryAfter,
      });
    }

    // Add rate limit headers
    res.setHeader('X-RateLimit-Remaining', rateLimiter.getRemaining(sessionId, config).toString());
    
    next();
  };
}

// Default config for chat endpoints
export const chatRateLimitConfig: RateLimitConfig = {
  windowMs: 60000,      // 1 minute window
  maxRequests: 20,      // 20 messages per minute per session
  message: 'You\'re sending messages too quickly. Please wait a moment.',
};

export default rateLimiter;
