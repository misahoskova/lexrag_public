import { Document } from '@langchain/core/documents';
import { normalizeLawNumber } from '../utils/string.utils';

export function splitTextWithContext(rawInput: string): { sourceFromText: string; content: string } {
  const raw = (rawInput ?? '').trim();
  if (!raw) return { sourceFromText: '', content: '' };

  const parts = raw.split(/\n\s*\n/);
  if (parts.length >= 2) {
    const sourceFromText = parts[0].replace(/\s+/g, ' ').trim();
    const content = parts.slice(1).join('\n\n').trim();
    return { sourceFromText, content };
  }
  return { sourceFromText: '', content: raw };
}

export function parseBreadcrumb(sourceFromText: string) {
  const src = (sourceFromText ?? '').trim();
  const parts = src.split(/\s*>\s*/).map(p => p.trim()).filter(Boolean);
  const law = parts.length ? normalizeLawNumber(parts[0]) : '';

  let paragraf = '';
  const paraIdx = parts.findIndex(p => /^§\s*\d+[a-zA-Z]*$/.test(p));
  if (paraIdx !== -1) paragraf = parts[paraIdx].replace(/^§\s*/, '').trim();

  const tail: string[] = [];
  if (paraIdx !== -1) {
    for (let i = paraIdx + 1; i < parts.length; i++) {
      const p = parts[i];
      if (/^odst\.\s*\d+$/i.test(p) || /^písm\.\s*[a-z]\)$/i.test(p) || /^bod\s*\d+\.?$/i.test(p)) {
        tail.push(p);
      }
    }
  }
  return { law, paragraf, tail };
}

export function canonicalizeSource(sourceFromText: string, meta?: Record<string, any>): string {
  const { law, paragraf, tail } = parseBreadcrumb(sourceFromText);
  const metaLabel = (meta?.label ?? '').toString().trim();
  const metaMarker = (meta?.marker ?? '').toString().trim();

  const lawPart = law ? `Zákon č. ${law} Sb.` : 'Zákon (neurčen)';
  const paraPart = paragraf ? `§ ${paragraf}` : '';

  let tailPart = '';
  if (tail.length > 0) {
    tailPart = tail.join(' ');
  } else {
    if (metaLabel && metaMarker && metaLabel.toLowerCase().includes(metaMarker.toLowerCase())) {
      tailPart = metaLabel;
    } else {
      tailPart = `${metaLabel} ${metaMarker}`.trim();
    }
  }

  const rightSide = [paraPart, tailPart].filter(Boolean).join(' ').trim();
  return rightSide ? `${lawPart}, ${rightSide}` : lawPart;
}

export function formatContextForLLM(docs: Document[]): string {
  return docs
    .map((doc, index) => {
      const { sourceFromText, content } = splitTextWithContext(doc.pageContent);
      const source = canonicalizeSource(sourceFromText, doc.metadata as any);
      return `ZDROJ_ID: ${index + 1}\nZDROJ: ${source}\nTEXT: ${(content ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;').trim()}`;
    })
    .join('\n\n');
}