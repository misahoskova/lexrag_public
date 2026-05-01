import { AliasDict, Law, CrossrefCategory } from '../types/types';
import { reSbirka, reDeixis, reEU1, reEU2 } from './crossref.parsers';

type LawDecision = {
  category: CrossrefCategory;
  reason: string;
  targetLaw?: Law;
};

function reAliasFromDict(dict: AliasDict): RegExp {
  const keys = Object.keys(dict);
  if (keys.length === 0) return /$(?!.)/i;
  const esc = keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`\\b(${esc.join('|')})\\b`, 'i');
}

export function defaultAliases(): AliasDict {
  return {
    ZDPH: { cislo: 235, rok: 2004 },
    OZ: { cislo: 89, rok: 2012 },
    ZOK: { cislo: 90, rok: 2012 },
    ZDP: { cislo: 586, rok: 1992 },
    ZÚ: { cislo: 563, rok: 1991 },
    ZP: { cislo: 262, rok: 2006 },
  };
}

export function decideLaw(context: string, dict: AliasDict, current: Law): LawDecision {
  const sb = context.match(reSbirka);
  if (sb) {
    const cislo = Number(sb[1]);
    const rok = Number(sb[2]);
    return {
      category: 'EXTERNAL_SBIRKA',
      reason: `Explicitní "zákon č. ${cislo}/${rok} Sb." v okolí`,
      targetLaw: { cislo, rok },
    };
  }
  const reAlias = reAliasFromDict(dict);
  const al = context.match(reAlias);
  if (al) {
    const key = al[1].toUpperCase();
    const law = dict[key] || dict[al[1]];
    if (law) {
      return { category: 'EXTERNAL_ALIAS', reason: `Alias "${al[1]}" detekován`, targetLaw: law };
    }
  }
  if (reEU1.test(context) || reEU2.test(context)) {
    return { category: 'EU', reason: 'Detekována EU citace (nařízení/směrnice)' };
  }
  if (reDeixis.test(context)) {
    return {
      category: 'INTERNAL',
      reason: 'Deiktický odkaz ("tento/tohoto/téhož zákona") → interní',
      targetLaw: current,
    };
  }
  return {
    category: 'INTERNAL',
    reason: 'Bez explicitního předpisu v okolí → interní (default)',
    targetLaw: current,
  };
}
