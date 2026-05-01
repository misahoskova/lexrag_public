import { CrossrefAddress } from '../types/types';

/* ========================= Regexy ========================= */

export const reParagraph =
  /§[\s\u00A0\u202F]*([0-9]+[a-z]?)(?:[\s\u00A0\u202F]*(?:odst\.?|odstavec)[\s\u00A0\u202F]*\(?([0-9a-z]+)\)?)?(?:[\s\u00A0\u202F]*(?:písm\.?|písmeno)[\s\u00A0\u202F]*\(?([a-z])\)?[\.,]?)?(?:[\s\u00A0\u202F]*(?:bod|bodu|body|bodů)[\s\u00A0\u202F]*([0-9]+)\.?)?/gi;

export const reParRange =
  /§[\s\u00A0\u202F]*([0-9]+[a-z]?)(?:[\s\u00A0\u202F]*(?:–|-|až|,|a)[\s\u00A0\u202F]*([0-9]+[a-z]?))+/gi;

export const rePriloha =
  /(?:p[řr][íi]lo[hz][a-záéíóúýčďěňřšťžů]{0,5})\s+(?:[čc]\.?\s*)?(\d+[a-z]?)/gi;

export const reSbirka =
  /\b(?:zákon|vyhláška|nařízení\s+vlády)?\s*(?:č\.?|c\.?)?\s*(\d{1,4})\s*\/\s*(\d{4})\s*sb\.?\b/i;

export const reFootnote = /\[(\d+[a-z]?)\]/gi;

export const reDeixis = /\b(tento|tohoto|t[eé]ho[žz])\s+z[aá]kona\b/i;
export const reEU1 = /\b(sm[ěe]rnice|na[řr]ízen[íi])\s*(?:EU|ES|EHS)\b/i;
export const reEU2 = /\b\d{4}\/\d{2,4}\/(?:EU|ES|EHS)\b/i;

export function cleanToken(x?: string): string | undefined {
  return x ? x.replace(/[^0-9a-z]+/gi, '').toLowerCase() : undefined;
}

export function parMarker(par: string): string {
  return par.replace(/[^0-9a-z]+/gi, '').toLowerCase();
}

export function looksLikeLegalText(s: string): boolean {
  if (s.length < 20) return false;
  if (!/[§\d]/.test(s) && !/p[řr][íi]loh/i.test(s)) return false;
  return true;
}

export function parseAddressFromMatch(m: RegExpExecArray): CrossrefAddress {
  return {
    par: cleanToken(m[1]),
    odst: cleanToken(m[2]),
    pism: cleanToken(m[3]),
    bod: cleanToken(m[4]),
  };
}

export function normalizeRef(m: RegExpExecArray): string {
  const par = cleanToken(m[1]);
  const odst = cleanToken(m[2]);
  const pism = cleanToken(m[3]);
  const bod = cleanToken(m[4]);
  const parts: string[] = [];
  if (par) parts.push(`PARAGRAF:${par}`);
  if (odst) parts.push(`ODSTAVEC:${odst}`);
  if (pism) parts.push(`PISMENO:${pism}`);
  if (bod) parts.push(`BOD:${bod}`);
  return parts.join('/');
}

export function parsePrilohaFromMatch(m: RegExpExecArray): CrossrefAddress {
  return {
    priloha: cleanToken(m[1]),
  };
}

export function normalizePrilohaRef(m: RegExpExecArray): string {
  const priloha = cleanToken(m[1]);
  return `PRILOHA:${priloha}`;
}
