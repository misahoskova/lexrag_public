import { RawNodeType } from '../types/types';
import { stripDiacritics } from '../utils/string.utils';

export function normalizeNodeType(raw?: string | null): RawNodeType | null {
  if (!raw) return null;
  let s = String(raw).trim();
  if (!s) return null;

  if (s === '§') s = 'PARAGRAF';
  if (s === 'ČÁST') s = 'CAST_ZAKONA';
  if (s === 'PÍSMENO') s = 'PISMENO';
  if (s === 'PŘÍLOHA') s = 'PRILOHA';
  if (s === 'POZNÁMKA POD ČAROU') s = 'POZNAMKA_POD_CAROU';

  const up = stripDiacritics(s).toUpperCase();

  switch (up) {
    case 'CAST_ZAKONA':
      return 'CAST_ZAKONA';
    case 'HLAVA':
      return 'HLAVA';
    case 'DIL':
      return 'DIL';
    case 'ODDIL':
      return 'ODDIL';
    case 'PODODDIL':
      return 'PODODDIL';
    case 'PARAGRAF':
      return 'PARAGRAF';
    case 'ODSTAVEC':
      return 'ODSTAVEC';
    case 'PISMENO':
      return 'PISMENO';
    case 'BOD':
      return 'BOD';
    case 'PRILOHA':
      return 'PRILOHA';
    case 'POZNAMKA_POD_CAROU':
      return 'POZNAMKA_POD_CAROU';
    default:
      return null;
  }
}
