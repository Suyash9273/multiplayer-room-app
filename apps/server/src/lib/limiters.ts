import { RateLimiter } from "./rateLimiter.js";

// One place to see every rate limit in the app, rather than a number
// buried inline in each handler file. Keyed by identity.id everywhere
// they're used (see rateLimiter.ts for why).
export const messageLimiter = new RateLimiter(10, 10_000);       // 10 messages / 10s PER IDENTITY
export const markReadLimiter = new RateLimiter(20, 10_000);      // 20 markRead calls / 10s (fires on every message while a room is open, needs headroom)
export const roomEntryLimiter = new RateLimiter(15, 10_000);     // 15 enterRoom/leaveRoom calls / 10s
export const matchmakingLimiter = new RateLimiter(8, 10_000);    // 8 findMatch/cancelFindMatch calls / 10s

// GLOBAL circuit breaker — deliberately separate from the per-identity
// limiters above. Per-identity limiting answers "is THIS ONE PERSON
// sending too fast" (fairness/abuse); it says nothing about AGGREGATE
// load. 20,000 legitimate users each politely staying under their own
// 10-per-10s cap can still add up to a write volume Postgres was never
// sized for. This doesn't fix that on its own — real fixes at that scale
// are a write-buffer/queue in front of the DB, connection pooling, and
// edge-level DDoS protection — but it's a cheap degrade-gracefully valve:
// past this ceiling, reject with "server busy" instead of trying to
// write everything and choking. Keyed by a fixed constant (not identity)
// since it's tracking TOTAL volume, not any one person's.
export const GLOBAL_KEY = "__global__";
export const globalMessageLimiter = new RateLimiter(300, 1_000); // 300 messages / 1s SYSTEM-WIDE

const ALL_LIMITERS = [messageLimiter, markReadLimiter, roomEntryLimiter, matchmakingLimiter, globalMessageLimiter];

export function sweepAllLimiters() {
    for (const limiter of ALL_LIMITERS) limiter.sweep();
}
