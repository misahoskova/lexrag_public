import { OpenAIEmbeddings } from '@langchain/openai';

export function asNullOrString(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}


export function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

export const unescapeHtml = (s: string): string =>
  s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'");

export const norm = (s: string): string => s.replace(/\s+/g, ' ').trim();

export function windowAround(
  sentence: string,
  span: { start: number; end: number },
  win: number,
): string {
  const start = Math.max(0, span.start - win);
  const end = Math.min(sentence.length, span.end + win);
  return sentence.slice(start, end);
}

export function toSlug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const EMBEDDING_DIM = 1536;

export const embeddings = new OpenAIEmbeddings({
  model: 'text-embedding-3-large',
  dimensions: EMBEDDING_DIM,
});

export function toPgvectorLiteral(v: number[]): string {
  return `[${v.map(x => (Number.isFinite(x) ? x : 0)).join(',')}]`;
}
