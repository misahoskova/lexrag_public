export function parseParagrafy(zdroj: string): string[] {
  const result: string[] = [];

  const segmenty = zdroj.split(',').map(s => s.trim());

  for (const segment of segmenty) {
    if (segment.includes('až')) {
      const parts = segment.split('až').map(s => s.trim());
      const from = parts[0].match(/§\s*(\d+)/)?.[1];
      const to = parts[1].match(/§\s*(\d+)/)?.[1];
      if (from && to) {
        for (let i = Number(from); i <= Number(to); i++) {
          result.push(`§ ${i}`);
        }
      }
    } else if (segment.includes(' a ') && segment.indexOf('§', segment.indexOf(' a ')) !== -1) {
      const parts = segment.split(' a ').map(s => s.trim());
      for (const part of parts) {
        const par = part.match(/§\s*\d+[a-z]*/)?.[0];
        if (par) result.push(par);
      }
    } else {
      const par = segment.match(/§\s*\d+[a-z]*/)?.[0];
      if (par) result.push(par);
    }
  }

  return [...new Set(result)];
}
