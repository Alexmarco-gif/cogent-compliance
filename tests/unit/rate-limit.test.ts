/**
 * Cogent Marketing Shield - Sliding-Window Rate Limiter Unit Tests
 * Document Reference: Document 07 (Section 2) & Document 08 (Phase 4)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SlidingWindowRateLimiter, RATE_LIMIT_PROFILES } from "@/lib/rate-limit";

describe("Sliding-Window Rate Limiting (Phase 4)", () => {
  let limiter: SlidingWindowRateLimiter;

  beforeEach(() => {
    limiter = new SlidingWindowRateLimiter();
  });

  it("should permit requests within limit and decrement remaining quota", () => {
    const key = "user_001_chat";
    const config = { maxRequests: 3, windowMs: 1000 };
    const now = 100000;

    const res1 = limiter.checkLimit(key, config, now);
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(2);

    const res2 = limiter.checkLimit(key, config, now + 100);
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = limiter.checkLimit(key, config, now + 200);
    expect(res3.allowed).toBe(true);
    expect(res3.remaining).toBe(0);
  });

  it("should block requests when rate limit is exceeded", () => {
    const key = "tenant_001_assessment";
    const config = { maxRequests: 2, windowMs: 1000 };
    const now = 100000;

    limiter.checkLimit(key, config, now);
    limiter.checkLimit(key, config, now + 50);

    // 3rd attempt within window should be rejected
    const blockedRes = limiter.checkLimit(key, config, now + 100);
    expect(blockedRes.allowed).toBe(false);
    expect(blockedRes.remaining).toBe(0);
    expect(blockedRes.resetTimeMs).toBe(now + 1000);
  });

  it("should slide the window and restore capacity after windowMs has elapsed", () => {
    const key = "user_002_search";
    const config = { maxRequests: 2, windowMs: 1000 };
    const t0 = 100000;

    // Use up quota at t0
    limiter.checkLimit(key, config, t0);
    limiter.checkLimit(key, config, t0 + 100);

    // Attempt at t0 + 500 (still inside 1000ms window)
    expect(limiter.checkLimit(key, config, t0 + 500).allowed).toBe(false);

    // Advance time past the 1000ms window: t0 + 1001ms
    const restoredRes = limiter.checkLimit(key, config, t0 + 1001);
    expect(restoredRes.allowed).toBe(true);
  });

  it("should define production rate limit profiles for core operations", () => {
    expect(RATE_LIMIT_PROFILES.CHAT_STREAM.maxRequests).toBe(30);
    expect(RATE_LIMIT_PROFILES.CAMPAIGN_ASSESSMENT.maxRequests).toBe(10);
    expect(RATE_LIMIT_PROFILES.ASSET_UPLOAD.maxRequests).toBe(20);
    expect(RATE_LIMIT_PROFILES.LIVE_WEB_SEARCH.maxRequests).toBe(15);
  });
});
