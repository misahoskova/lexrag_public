function normalizeListToken(tok: string): string {
  return tok.replace(/[^0-9a-z]+/gi, '').toLowerCase();
}

export function expandRangeNumeric(from: string, to: string): string[] {
  if (!/^\d+$/.test(from) || !/^\d+$/.test(to)) return [from, to].filter(Boolean);
  const a = parseInt(from, 10);
  const b = parseInt(to, 10);
  if (Number.isNaN(a) || Number.isNaN(b)) return [from, to].filter(Boolean);
  const lo = Math.min(a, b),
    hi = Math.max(a, b);
  const out: string[] = [];
  for (let x = lo; x <= hi; x++) out.push(String(x));
  return out;
}

export function expandRangeAlpha(from: string, to: string): string[] {
  const a = from.charCodeAt(0),
    b = to.charCodeAt(0);
  const lo = Math.min(a, b),
    hi = Math.max(a, b);
  const out: string[] = [];
  for (let c = lo; c <= hi; c++) out.push(String.fromCharCode(c));
  return out;
}

export function expandListOrRanges(src?: string, alpha = false): string[] {
  if (!src) return [];
  const parts = src
    .split(/[,;]|(?:\s+a\s+)/i)
    .map(t => t.trim())
    .filter(Boolean);

  const out: string[] = [];
  for (const p of parts) {
    const m = p.match(/^\s*([0-9a-z]+)\s*(?:–|-|až)\s*([0-9a-z]+)\s*$/i);
    if (m) {
      const f = normalizeListToken(m[1]),
        t = normalizeListToken(m[2]);
      out.push(...(alpha ? expandRangeAlpha(f, t) : expandRangeNumeric(f, t)));
    } else {
      out.push(normalizeListToken(p));
    }
  }
  return out;
}
