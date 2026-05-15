const VOTED_POLLS_STORAGE_KEY = 'poll-app:voted-polls';
const VOTED_POLL_OPTION_IDS_KEY = 'poll-app:voted-option-ids';
const SESSION_VOTE_OPTION_PREFIX = 'poll-app:session-vote-option:';

function sessionVoteOptionKey(pollId: string): string {
  return SESSION_VOTE_OPTION_PREFIX + pollId;
}

/** Parses stored JSON into a pollId → optionId map; invalid shapes yield {}. */
function parseVoteOptionIds(raw: string): Record<string, string> {
  const parsed: unknown = JSON.parse(raw);
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed)) {
    if (typeof v === 'string' && v.length > 0) {
      out[k] = v;
    }
  }
  return out;
}

/** Reads pollId → chosen optionId from localStorage; failures yield {}. */
function readVoteOptionIds(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(VOTED_POLL_OPTION_IDS_KEY);
    if (raw === null) {
      return {};
    }
    return parseVoteOptionIds(raw);
  } catch {
    return {};
  }
}

/** Writes pollId → optionId map to localStorage, ignoring storage errors. */
function writeVoteOptionIds(map: Record<string, string>): void {
  try {
    window.localStorage.setItem(VOTED_POLL_OPTION_IDS_KEY, JSON.stringify(map));
  } catch {
    //
  }
}

/** Vote option id remembered for this tab session (survives reload if localStorage lacked it). */
export function getSessionVoteOptionId(pollId: string): string | null {
  try {
    const v = sessionStorage.getItem(sessionVoteOptionKey(pollId));
    return v !== null && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

function writeSessionVoteOptionId(pollId: string, optionId: string): void {
  try {
    sessionStorage.setItem(sessionVoteOptionKey(pollId), optionId);
  } catch {
    //
  }
}

/** Copies session-only vote option id into localStorage (e.g. after reload). */
export function syncStoredVoteOptionFromSession(pollId: string): void {
  const sid = getSessionVoteOptionId(pollId);
  if (sid === null) {
    return;
  }
  const choices = readVoteOptionIds();
  if (choices[pollId] === sid) {
    return;
  }
  choices[pollId] = sid;
  writeVoteOptionIds(choices);
}

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
  }
}

/** Whether the visitor has recorded a vote for this poll ID in storage. */
export function hasUserVotedOnPoll(pollId: string): boolean {
  return readVotedPollIds().has(pollId);
}

/** The option ID stored for this visitor's vote, if known. */
export function getUserVoteOptionId(pollId: string): string | null {
  const id = readVoteOptionIds()[pollId];
  return id !== undefined && id.length > 0 ? id : null;
}

/** Records that this visitor voted on this poll ID; optionally stores which option they chose. */
export function markUserVotedOnPoll(pollId: string, optionId?: string): void {
  const voted = readVotedPollIds();
  voted.add(pollId);
  writeVotedPollIds(voted);
  if (optionId !== undefined && optionId.length > 0) {
    const choices = readVoteOptionIds();
    choices[pollId] = optionId;
    writeVoteOptionIds(choices);
    writeSessionVoteOptionId(pollId, optionId);
  }
}
