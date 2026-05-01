import { toSlug } from './string.utils';
import { MasterJsonMeta } from '../types/types';

export class LawFilenameBuilder {
  build(meta: MasterJsonMeta): string {
    const cislo = meta?.cislo ?? 'nezname';
    const rok = meta?.rok ?? 'nezname';
    const nazev = meta?.nazev ?? '';
    const slug = nazev ? toSlug(nazev) : '';
    return slug ? `${cislo}-${rok}-${slug}.json` : `${cislo}-${rok}.json`;
  }
}
