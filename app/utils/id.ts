export function generateClientId(): string {
  try {
    const g: any = global as any;
    if (g?.crypto?.randomUUID) return g.crypto.randomUUID();
  } catch {}
  // Fallback RFC4122-ish v4 generator (good enough for client ids)
  // Not cryptographically secure.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}


