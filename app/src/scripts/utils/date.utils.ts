export const parseCzDate = (s?: string | null): string | null => {
  if (!s) return null;
  const m = s.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo}-${d}`;
};
