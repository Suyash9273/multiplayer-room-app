// Pure matching data structure — deliberately has zero knowledge of
// Socket.IO, Express, or Prisma. Given plain objects describing who's
// waiting and what they want, it decides who should be paired with whom.
// That's what makes it directly reusable/testable in isolation: no socket
// to fake, no DB to mock.
export interface MatchCandidate {
    identityId: string;
    interests: string[];
    fallbackActive: boolean;
}

// Buckets waiting candidates by interest tag so finding a partner who
// shares a tag is a direct lookup instead of a scan over everyone
// waiting. Separately tracks a FIFO "fallback pool" of candidates open
// to a non-interest match, for the same reason.
//
// WHY FIRST-MATCH, NOT BEST-MATCH: finding the candidate who shares the
// MOST tags with you requires walking every candidate in every bucket
// you belong to and tallying overlap counts — for a popular tag, that's
// right back to an O(N) scan, undoing the point of bucketing. Grabbing
// the first entry already sitting in a bucket is O(1) per tag, O(k)
// total (k = your own tag count, capped small) — independent of how many
// people are in the queue. It also matches the actual product: this is
// low-stakes casual pairing with an impatience-driven timer (5s/10s/
// forever) already built in, not ranked/competitive matching where a
// specific partner choice has lasting consequences worth paying scan
// cost for.
export class MatchQueue<T extends MatchCandidate> {
    private buckets = new Map<string, T[]>();
    private fallbackPool: T[] = [];
    private all = new Set<T>();

    private tagKey(tag: string): string {
        return tag.toLowerCase();
    }

    has(entry: T): boolean {
        return this.all.has(entry);
    }

    size(): number {
        return this.all.size
    }

    // Registers `entry` into every structure relevant to its CURRENT
    // state: one FIFO list per interest tag, and the fallback pool too if
    // it's already fallback-eligible (e.g. it has no interests at all).
    add(entry: T): void {
        this.all.add(entry)
        for(const tag of entry.interests) {
            const key = this.tagKey(tag)
            const bucket = this.buckets.get(key);
            if(bucket) bucket.push(entry)
            else this.buckets.set(key, [entry])
        }
        if(entry.fallbackActive) this.fallbackPool.push(entry)
    }

    // Removes `entry` from every structure it could possibly be in.
    // O(k) in the entry's OWN tag count — not O(N) in total queue size.
    remove(entry: T): void {
        if (!this.all.delete(entry)) return;

        for (const tag of entry.interests) {
            const key = this.tagKey(tag);
            const bucket = this.buckets.get(key);
            if (!bucket) continue;
            const idx = bucket.indexOf(entry);
            if (idx !== -1) bucket.splice(idx, 1);
            if (bucket.length === 0) this.buckets.delete(key);
        }

        const fIdx = this.fallbackPool.indexOf(entry);
        if (fIdx !== -1) this.fallbackPool.splice(fIdx, 1);
    }

    // Call when an already-queued entry's fallback timer fires (its
    // fallbackActive flips true AFTER it was added). Adds it to the
    // fallback pool without touching its interest buckets — it's already
    // in those.
    activateFallback(entry: T): void {
        if (!this.fallbackPool.includes(entry)) this.fallbackPool.push(entry);
    }

    // Finds a partner for `entry` WITHOUT adding entry to the queue
    // itself. Checks entry's own interest buckets first (oldest-queued
    // candidate in each, first tag that has anyone), then the fallback
    // pool if entry itself is fallback-eligible. Returns null if nobody
    // is currently matchable.
    findPartner(entry: T): T | null {
        for (const tag of entry.interests) {
            const bucket = this.buckets.get(this.tagKey(tag));
            if (!bucket) continue;
            const partner = bucket.find((c) => c !== entry && c.identityId !== entry.identityId);
            if (partner) return partner;
        }

        if (entry.fallbackActive) {
            const partner = this.fallbackPool.find((c) => c !== entry && c.identityId !== entry.identityId);
            if (partner) return partner;
        }

        return null;
    }
}
