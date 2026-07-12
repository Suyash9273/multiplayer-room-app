// A simple sliding-window rate limiter: "at most `maxEvents` within the
// trailing `windowMs`". Deliberately keyed by whatever string the caller
// gives it (we use identity.id, not socket.id — a socket dies on
// disconnect, but the same guest/user could just reconnect and get a
// fresh socket.id, resetting a socket-keyed limit for free. Keying by
// identity.id means the limit follows the ACTUAL person, not their
// current connection).

export class RateLimiter {
    private hits = new Map<string, number[]>();

    constructor(private readonly maxEvents: number, private readonly windowMs: number) {}

    // Records this attempt and returns whether it's ALLOWED. Call this
    // once per attempt — it both checks and (if allowed) counts the hit,
    // so callers don't need a separate "record" step.
    check(key: string): boolean {
        const now = Date.now();
        const timestamps = (this.hits.get(key) ?? []).filter((t) => now-t < this.windowMs)

        if(timestamps.length >= this.maxEvents) {
            this.hits.set(key, timestamps);
            return false;
        }

        timestamps.push(now);
        this.hits.set(key, timestamps);
        return true;
    }

    // Opportunistic cleanup so `hits` doesn't grow forever for identities
    // that stop being active. Cheap enough to call periodically rather
    // than needing a precise TTL mechanism.
    sweep() {
        const now = Date.now()
        for(const [key, timestamps] of this.hits) {
            const fresh = timestamps.filter((t) => now-t < this.windowMs)
            if(fresh.length === 0) this.hits.delete(key)
            else this.hits.set(key, fresh)
        }
    }
}