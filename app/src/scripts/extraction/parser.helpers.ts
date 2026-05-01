import { norm, unescapeHtml } from '../utils/string.utils';

export const stripTags = (html?: string | null): string => {
  if (!html) return '';

  let s = html;

  s = s.replace(/<a[^>]*>\s*<sup[^>]*>\s*([\da-z]+)\s*<\/sup>\s*\)\s*<\/a>/gi, '[$1]');
  s = s.replace(/<sup[^>]*>\s*([\da-z]+)\s*<\/sup>\s*\)/gi, '[$1]');
  s = s.replace(/<a[^>]*>\s*<sup[^>]*>\s*([\da-z]+)\s*<\/sup>\s*<\/a>/gi, '[$1]');
  s = s.replace(/<sup[^>]*>\s*([\da-z]+)\s*<\/sup>/gi, '[$1]');
  s = s.replace(/<[^>]+>/g, '');

  return norm(unescapeHtml(s));
};

export const extractMarkerAndText = (
  xhtml?: string | null,
): { marker: string | null; text: string } => {
  if (!xhtml) return { marker: null, text: '' };

  const m = xhtml.match(/<var[^>]*>([\s\S]*?)<\/var>/i);
  const markerInner = m ? m[1] : null;
  const marker = markerInner ? stripTags(markerInner) : null;

  const rest = m ? xhtml.replace(m[0], '') : xhtml;
  const text = stripTags(rest);

  return { marker, text };
};

export const parseParMarker = (raw?: string | null): string => {
  if (!raw) return '';
  const m = raw.match(/§\s*([0-9]+[a-zA-Z]*)\b/i);
  return m ? m[1] : norm(unescapeHtml(raw));
};

export const parsePrechodneHeading = (txt: string) => {
  const m = txt.match(
    /zavedeno\s+z[aá]konem\s+č\.\s*(\d+)\s*\/\s*(\d{4})\s*Sb\.\s*Čl\.\s*([IVXLCDM]+|\w+)/i,
  );
  return m
    ? {
        is: true,
        cislo: parseInt(m[1], 10),
        rok: parseInt(m[2], 10),
        clanek: m[3],
      }
    : { is: false, cislo: null, rok: null, clanek: null };
};

export const extractPpcMarkerAndText = (
  xhtml?: string | null,
): { marker: string | null; text: string } => {
  if (!xhtml) return { marker: null, text: '' };

  const m =
    xhtml.match(/<var[^>]*>\s*<sup[^>]*>\s*([\da-z]+)\s*\)?\s*<\/sup>\s*<\/var>/i) ||
    xhtml.match(/<var[^>]*>\s*<sup[^>]*>\s*([\da-z]+)\s*<\/sup>\s*\)\s*<\/var>/i);

  let marker: string | null = null;
  let rest = xhtml;

  if (m) {
    marker = m[1].trim().toLowerCase();
    rest = xhtml.replace(m[0], '');
  }

  const text = stripTags(rest).replace(/\s+/g, ' ').trim();
  return { marker, text };
};

export const parseTableXhtml = (xhtml?: string | null) => {
  if (!xhtml) return { columns: [] as string[], rows: [] as string[][] };

  const allTr = Array.from(xhtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)).map(m => m[1]);

  let columns: string[] = [];
  if (allTr.length > 0) {
    const thMatches = Array.from(allTr[0].matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi));
    if (thMatches.length) {
      columns = thMatches.map(m => stripTags(m[1]));
    }
  }

  const dataRows = columns.length > 0 ? allTr.slice(1) : allTr;

  if (!columns.length && dataRows.length) {
    const firstCells = Array.from(dataRows[0].matchAll(/<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi)).map(m =>
      stripTags(m[2]).trim(),
    );
    columns = firstCells.map((_, i) => `Sloupec ${i + 1}`);
  }

  const rows: string[][] = dataRows.map(rowHtml => {
    const cells = Array.from(rowHtml.matchAll(/<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi)).map(m =>
      stripTags(m[2]).trim(),
    );

    const cleaned = cells
      .filter(c => c && !/^[-–—]$/.test(c))
      .map(c => c.replace(/^\s*[-–—]\s+/, '').trim());

    return cleaned;
  });

  return { columns, rows };
};
