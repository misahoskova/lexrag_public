import { load } from 'cheerio';
import { MasterJsonMeta } from '../types/types';
import { norm } from '../utils/string.utils';
import { parseCzDate } from '../utils/date.utils';

export function parseMetaFromHtml(html: string): MasterJsonMeta {
  const $ = load(html);

  const h1 = norm($('.doc-header h1').first().text() || '');
  const h1a = norm($('.doc-header h1 .h1a').first().text() || '');
  let cislo = 0;
  let rok = 0;

  const m = h1.match(/Zákon\s+č\.\s*(\d+)\s*\/\s*(\d+)\s*Sb\.?/i);
  if (m) {
    cislo = parseInt(m[1], 10);
    rok = parseInt(m[2], 10);
  }

  if (!(cislo && rok)) {
    const href = $('.doc-header a.RuleLink').attr('href') || '';
    const mm = href.match(/\/cs\/(\d{4})-(\d+)/i);
    if (mm) {
      rok = rok || parseInt(mm[1], 10);
      cislo = cislo || parseInt(mm[2], 10);
    }
  }

  const staleUrl = $('.doc-header a.RuleLink').attr('href') || null;

  let platneOd: string | null = null;
  let ucinneOd: string | null = null;
  let ucinneDo: string | null = null;

  $('.doc-meta table tbody tr').each((_: any, tr: any) => {
    const key = norm($(tr).find('td.td0').text());
    const val = norm($(tr).find('td.td1').text());
    if (/^Částka$/i.test(key)) {
    } else if (/Platnost od/i.test(key)) {
      platneOd = parseCzDate(val);
    } else if (/Účinnost od/i.test(key)) {
      ucinneOd = parseCzDate(val);
    } else if (/Účinnost do/i.test(key)) {
      ucinneDo = parseCzDate(val);
    }
  });

  let aktualniZneniOd: string | null = null;
  let aktualniZneniDo: string | null = null;
  const slice = norm($('.SliceLabel').first().text() || '');
  const sm = slice.match(/(\d{2}\.\d{2}\.\d{4})\s*(?:-|–)\s*(\d{2}\.\d{2}\.\d{4})/);
  
  if (sm) {
    aktualniZneniOd = parseCzDate(sm[1]);
    aktualniZneniDo = parseCzDate(sm[2]);
    ucinneOd = aktualniZneniOd;
    ucinneDo = aktualniZneniDo;
  } else {
    const smSingle = slice.match(/(\d{2}\.\d{2}\.\d{4})/);
    if (smSingle) {
      aktualniZneniOd = parseCzDate(smSingle[1]);
      ucinneOd = aktualniZneniOd; 
    }
  }

  return {
    cislo,
    rok,
    nazev: h1a,
    staleUrl: staleUrl ?? undefined,
    platneOd: platneOd ?? '',
    ucinneOd: ucinneOd ?? '',
    ucinneDo: ucinneDo ?? undefined,
    aktualniZneniOd: aktualniZneniOd ?? undefined,
    aktualniZneniDo: aktualniZneniDo ?? undefined,
  };
}