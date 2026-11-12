/**
 * Cogent Marketing Shield - Sliding-Window Rate Limiter
 * Document Reference: Document 07 (Section 2) & Document 08 (Phase 4)
 */

export interface RateLimitConfig {
  /** Maximum number of operations allowed in window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTimeMs: number;
}

export const RATE_LIMIT_PROFILES = {
  /** Conversational Copilot SSE streaming */
  CHAT_STREAM: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 req/min
  /** Full multimodal campaign compliance assessment */
  CAMPAIGN_ASSESSMENT: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 req/min
  /** Asset presigned URL uploads */
  ASSET_UPLOAD: { maxRequests: 20, windowMs: 60 * 1000 }, // 20 req/min
  /** Two-step live web search fetches */
  LIVE_WEB_SEARCH: { maxRequests: 15, windowMs: 60 * 1000 }, // 15 req/min
} as const;

export class SlidingWindowRateLimiter {
  // In-memory bucket store: Key -> Array of timestamps
  private buckets: Map<string, number[]> = new Map();

  /**
   * Evaluates if a request key is within permitted rate limits using sliding-window algorithm.
   */
  public checkLimit(
    identifier: string,
    config: RateLimitConfig,
    now: number = Date.now(),
  ): RateLimitResult {
    const windowStart = now - config.windowMs;
    const timestamps = this.buckets.get(identifier) || [];

    // Retain only timestamps within the active sliding window
    const validTimestamps = timestamps.filter((t) => t > windowStart);

    const count = validTimestamps.length;
    const allowed = count < config.maxRequests;

    if (allowed) {
      validTimestamps.push(now);
      this.buckets.set(identifier, validTimestamps);
    }

    const remaining = Math.max(0, config.maxRequests - validTimestamps.length);
    const oldestTimestamp = validTimestamps[0] || now;
    const resetTimeMs = oldestTimestamp + config.windowMs;

    return {
      allowed,
      limit: config.maxRequests,
      remaining,
      resetTimeMs,
    };
  }

  /**
   * Cleans up expired bucket entries to prevent memory growth.
   */
  public prune(now: number = Date.now()): void {
    for (const [key, timestamps] of this.buckets.entries()) {
      const active = timestamps.filter((t) => t > now - 60000);
      if (active.length === 0) {
        this.buckets.delete(key);
      } else {
        this.buckets.set(key, active);
      }
    }
  }

  /**
   * Resets rate limit for a specific identifier (primarily for test environments).
   */
  public reset(identifier: string): void {
    this.buckets.delete(identifier);
  }
}

export const rateLimiter = new SlidingWindowRateLimiter();
