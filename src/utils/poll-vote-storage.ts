const VOTED_POLLS_STORAGE_KEY = 'poll-app:voted-polls';

/** Parses stored JSON into poll IDs; invalid shapes yield an empty set. */
function parseVotedPollIds(raw: string): Set<string> {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    return new Set();
  }
  return new Set(parsed.filter((value): value is string => typeof value === 'string'));
}

/** Reads voted poll IDs from localStorage; failures yield an empty set. */
export function readVotedPollIds(): Set<string> {
  try {
    const raw = window.localStorage.getItem(VOTED_POLLS_STORAGE_KEY);
    if (raw === null) {
      return new Set();
    }
    return parseVotedPollIds(raw);
  } catch {
    return new Set();
  }
}

/** Writes the set of voted poll IDs to localStorage, ignoring storage errors. */
export function writeVotedPollIds(voted: Set<string>): void {
  try {
    window.localStorage.setItem(
      VOTED_POLLS_STORAGE_KEY,
      JSON.stringify(Array.from(voted)),
    );
} catch {
  /* ignore quota / privacy mode errors */
}
}

/** Whether the visitor has recorded a vote for this poll ID in storage. */
export function hasUserVotedOnPoll(pollId: string): boolean {
  return readVotedPollIds().has(pollId);
}

/** Records that this visitor voted on this poll ID. */
export function markUserVotedOnPoll(pollId: string): void {
  const voted = readVotedPollIds();
  voted.add(pollId);
  writeVotedPollIds(voted);
}
