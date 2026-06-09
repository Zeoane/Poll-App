const VOTER_TOKEN_KEY = 'poll-app:voter-token';

/**
 * Returns a stable anonymous voter token stored in sessionStorage.
 * @returns Existing or newly created voter token string for this browser tab.
 * @remarks Each tab gets its own token so team members can vote independently on one device.
 */
export function getVoterToken(): string {
  try {
    const existing = window.sessionStorage.getItem(VOTER_TOKEN_KEY);
    if (existing !== null && existing.length >= 8) {
      return existing;
    }
    const created = createVoterToken();
    window.sessionStorage.setItem(VOTER_TOKEN_KEY, created);
    return created;
  } catch {
    return createVoterToken();
  }
}

/**
 * Builds a random token for anonymous survey responses.
 * @returns A prefixed UUID string suitable for voter identification.
 */
function createVoterToken(): string {
  const random = crypto.randomUUID().replace(/-/g, '');
  return `v-${random}`;
}
