function isNumericString(value: string): boolean {
  return /^\d+$/.test(value);
}

function extractAppIdFromPattern(url: string): string | null {
  const match = url.match(/\/app\/(\d+)/);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}

export function extractAppId(url: string): string | null {
  const trimmed = url.trim();
  if (trimmed.length === 0) return null;

  if (isNumericString(trimmed)) {
    return trimmed;
  }

  return extractAppIdFromPattern(trimmed);
}
