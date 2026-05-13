/** Parses ISO or German date strings into an end-of-day deadline. */
export function parseSurveyEndDate(raw: string): Date | null {
  const s = raw.trim();
  if (s.length === 0) {
    return null;
  }
  const parsed = tryParseDateSegments(s);
  if (parsed === null || !isValidCalendarDay(parsed.y, parsed.m, parsed.d)) {
    return null;
  }
  const { y, m, d } = parsed;
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

function tryParseDateSegments(s: string): { y: number; m: number; d: number } | null {
  return tryParseIsoYmd(s) ?? tryParseDeDmy(s);
}

function tryParseIsoYmd(s: string): { y: number; m: number; d: number } | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (iso === null) {
    return null;
  }
  return { y: Number(iso[1]), m: Number(iso[2]), d: Number(iso[3]) };
}

function tryParseDeDmy(s: string): { y: number; m: number; d: number } | null {
  const de = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s);
  if (de === null) {
    return null;
  }
  return { y: Number(de[3]), m: Number(de[2]), d: Number(de[1]) };
}

function isValidCalendarDay(y: number, m: number, d: number): boolean {
  if (y < 1000 || y > 9999 || m < 1 || m > 12 || d < 1 || d > 31) {
    return false;
  }
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}
