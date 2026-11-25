export function extractToken(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  let str = raw.trim();
  if (!str) return '';

  // Handle URL with searchParams
  if (str.includes('token=')) {
    try {
      const parsed = str.startsWith('http://') || str.startsWith('https://')
        ? new URL(str)
        : new URL(`https://dummy.com/${str.startsWith('?') ? str : '?' + str}`);
      const t = parsed.searchParams.get('token');
      if (t) return t.trim();
    } catch {
      const match = str.match(/token=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) return match[1].trim();
    }
  }

  if (str.includes('code=')) {
    try {
      const parsed = str.startsWith('http://') || str.startsWith('https://')
        ? new URL(str)
        : new URL(`https://dummy.com/${str.startsWith('?') ? str : '?' + str}`);
      const c = parsed.searchParams.get('code');
      if (c) return c.trim();
    } catch {
      const match = str.match(/code=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) return match[1].trim();
    }
  }

  if (str.includes('/onboarding/')) {
    const parts = str.split('/onboarding/');
    const seg = parts[1]?.split(/[\?#]/)[0]?.trim();
    if (seg) return seg;
  }

  return str.replace(/^[?&]/, '').trim();
}
