// Pure matching POLICY — deliberately has zero knowledge of Socket.IO,
// Express, or Prisma. Given a description of who's waiting and what they
// want, it decides who should be paired with whom. That's what makes it
// trivially unit-testable: no socket to fake, no DB to mock, just plain
// objects in and a plain answer out.
export interface MatchCandidate {
    identityId: string;
    interests: string[];
    fallbackActive: boolean;
}

// Two candidates can match on interest if they share at least one tag
// and aren't the same identity (no matching yourself across two tabs).
export function hasOverlap(a: MatchCandidate, b: MatchCandidate): boolean {
    if (a.identityId === b.identityId) return false;
    return a.interests.some((tag) => b.interests.includes(tag));
}

// Returns the index within `candidates` of the best partner for `entry`,
// or -1 if none. Two-pass: always prefer an actual shared interest; only
// fall back to a random (non-overlapping) pairing if BOTH sides have
// opted into that (fallbackActive) — someone who chose "match me by
// interest only, forever" must never be paired outside that, even if the
// other person has already given up on theirs.
//
// NOTE: `candidates` is assumed to already be filtered down to whoever is
// actually still connected — liveness is the caller's job, this function
// only decides policy.
export function findPartnerIndex<T extends MatchCandidate>(entry: T, candidates: T[]): number {
    let idx = candidates.findIndex((other) => other !== entry && hasOverlap(entry, other));
    if (idx !== -1) return idx;

    if (entry.fallbackActive) {
        idx = candidates.findIndex(
            (other) => other !== entry && other.fallbackActive && other.identityId !== entry.identityId
        );
    }
    return idx;
}
