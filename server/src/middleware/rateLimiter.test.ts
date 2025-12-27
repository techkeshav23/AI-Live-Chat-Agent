import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import rateLimiter, { createRateLimitMiddleware, chatRateLimitConfig } from './rateLimiter';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('isRateLimited', () => {
    it('should allow first request', () => {
      const config = { windowMs: 60000, maxRequests: 5 };
      const sessionId = 'test-session-1';

      const isLimited = rateLimiter.isRateLimited(sessionId, config);

      expect(isLimited).toBe(false);
    });

    it('should allow requests up to the limit', () => {
      const config = { windowMs: 60000, maxRequests: 3 };
      const sessionId = 'test-session-2';

      // First 3 requests should pass
      expect(rateLimiter.isRateLimited(sessionId, config)).toBe(false);
      expect(rateLimiter.isRateLimited(sessionId, config)).toBe(false);
      expect(rateLimiter.isRateLimited(sessionId, config)).toBe(false);

      // 4th request should be limited
      expect(rateLimiter.isRateLimited(sessionId, config)).toBe(true);
    });

    it('should reset after window expires', () => {
      const config = { windowMs: 60000, maxRequests: 2 };
      const sessionId = 'test-session-3';

      // Use up the limit
      rateLimiter.isRateLimited(sessionId, config);
      rateLimiter.isRateLimited(sessionId, config);
      expect(rateLimiter.isRateLimited(sessionId, config)).toBe(true);

      // Advance time past the window
      vi.advanceTimersByTime(60001);

      // Should be allowed again
      expect(rateLimiter.isRateLimited(sessionId, config)).toBe(false);
    });

    it('should track different sessions separately', () => {
      const config = { windowMs: 60000, maxRequests: 1 };

      // Session A uses its limit
      expect(rateLimiter.isRateLimited('session-a', config)).toBe(false);
      expect(rateLimiter.isRateLimited('session-a', config)).toBe(true);

      // Session B should still have its own limit
      expect(rateLimiter.isRateLimited('session-b', config)).toBe(false);
      expect(rateLimiter.isRateLimited('session-b', config)).toBe(true);
    });
  });

  describe('getRemaining', () => {
    it('should return max requests for new session', () => {
      const config = { windowMs: 60000, maxRequests: 10 };
      const sessionId = 'new-session';

      const remaining = rateLimiter.getRemaining(sessionId, config);

      expect(remaining).toBe(10);
    });

    it('should decrease as requests are made', () => {
      const config = { windowMs: 60000, maxRequests: 5 };
      const sessionId = 'counting-session';

      rateLimiter.isRateLimited(sessionId, config); // 1st request
      expect(rateLimiter.getRemaining(sessionId, config)).toBe(4);

      rateLimiter.isRateLimited(sessionId, config); // 2nd request
      expect(rateLimiter.getRemaining(sessionId, config)).toBe(3);
    });

    it('should not go below zero', () => {
      const config = { windowMs: 60000, maxRequests: 1 };
      const sessionId = 'zero-session';

      rateLimiter.isRateLimited(sessionId, config);
      rateLimiter.isRateLimited(sessionId, config);
      rateLimiter.isRateLimited(sessionId, config);

      expect(rateLimiter.getRemaining(sessionId, config)).toBe(0);
    });
  });

  describe('createRateLimitMiddleware', () => {
    it('should call next() when under limit', () => {
      const config = { windowMs: 60000, maxRequests: 10 };
      const middleware = createRateLimitMiddleware(config);

      const req = { body: { sessionId: 'middleware-test-1' }, ip: '127.0.0.1' } as Request;
      const res = {
        setHeader: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn() as NextFunction;

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(String));
    });

    it('should return 429 when over limit', () => {
      const config = { windowMs: 60000, maxRequests: 1 };
      const middleware = createRateLimitMiddleware(config);

      const req = { body: { sessionId: 'middleware-test-2' }, ip: '127.0.0.1' } as Request;
      const res = {
        setHeader: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn() as NextFunction;

      // First request passes
      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      // Second request should be blocked
      const next2 = vi.fn() as NextFunction;
      middleware(req, res, next2);

      expect(next2).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errorCode: 'RATE_LIMIT',
        })
      );
    });

    it('should set Retry-After header when rate limited', () => {
      const config = { windowMs: 60000, maxRequests: 1 };
      const middleware = createRateLimitMiddleware(config);

      const req = { body: { sessionId: 'retry-after-test' }, ip: '127.0.0.1' } as Request;
      const res = {
        setHeader: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      // Exhaust limit
      middleware(req, res, vi.fn());
      middleware(req, res, vi.fn());

      expect(res.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
    });

    it('should use IP address when sessionId is not provided', () => {
      const config = { windowMs: 60000, maxRequests: 1 };
      const middleware = createRateLimitMiddleware(config);

      const req = { body: {}, ip: '192.168.1.1' } as Request;
      const res = {
        setHeader: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();

      // Second request from same IP should count
      middleware(req, res, vi.fn());
      expect(res.status).toHaveBeenCalledWith(429);
    });

    it('should use anonymous when no sessionId or IP', () => {
      const config = { windowMs: 60000, maxRequests: 1 };
      const middleware = createRateLimitMiddleware(config);

      const req = { body: {} } as Request;
      const res = {
        setHeader: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should use custom error message from config', () => {
      const customMessage = 'Custom rate limit message';
      const config = { windowMs: 60000, maxRequests: 1, message: customMessage };
      const middleware = createRateLimitMiddleware(config);

      const req = { body: { sessionId: 'custom-msg-test' }, ip: '127.0.0.1' } as Request;
      const res = {
        setHeader: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      // Exhaust limit and trigger rate limit
      middleware(req, res, vi.fn());
      middleware(req, res, vi.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: customMessage,
        })
      );
    });
  });

  describe('getResetTime', () => {
    it('should return null for unknown session', () => {
      const resetTime = rateLimiter.getResetTime('unknown-session');
      expect(resetTime).toBeNull();
    });

    it('should return reset time for known session', () => {
      const config = { windowMs: 60000, maxRequests: 5 };
      rateLimiter.isRateLimited('reset-time-test', config);
      
      const resetTime = rateLimiter.getResetTime('reset-time-test');
      expect(resetTime).toBeGreaterThan(Date.now());
    });
  });

  describe('destroy', () => {
    it('should stop the cleanup interval', () => {
      // This test ensures destroy() can be called without errors
      // In a real scenario, you'd verify the interval is cleared
      expect(() => rateLimiter.destroy()).not.toThrow();
    });
  });

  describe('chatRateLimitConfig', () => {
    it('should have sensible defaults', () => {
      expect(chatRateLimitConfig.windowMs).toBe(60000); // 1 minute
      expect(chatRateLimitConfig.maxRequests).toBe(20); // 20 per minute
      expect(chatRateLimitConfig.message).toBeDefined();
    });
  });
});
