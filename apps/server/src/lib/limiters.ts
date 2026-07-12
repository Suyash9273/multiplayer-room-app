import { RateLimiter } from "./rateLimiter.js";

// One place to see every rate limit in the app, rather than a number
// buried inline in each handler file. Keyed by identity.id everywhere
// they're used (see rateLimiter.ts for why).
export const messageLimiter = new RateLimiter(10, 10_000);       // 10 messages / 10s
export const markReadLimiter = new RateLimiter(20, 10_000);      // 20 markRead calls / 10s (fires on every message while a room is open, needs headroom)
export const roomEntryLimiter = new RateLimiter(15, 10_000);     // 15 enterRoom/leaveRoom calls / 10s
export const matchmakingLimiter = new RateLimiter(8, 10_000);    // 8 findMatch/cancelFindMatch calls / 10s

const ALL_LIMITERS = [messageLimiter, markReadLimiter, roomEntryLimiter, matchmakingLimiter];

export function sweepAllLimiters() {
    for (const limiter of ALL_LIMITERS) limiter.sweep();
}
