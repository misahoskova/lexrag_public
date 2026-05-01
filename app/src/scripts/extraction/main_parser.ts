import * as json from './tree.builder';
import { SbJson, MasterJson, MasterJsonMeta, CurrentPar, CurrentPriloha } from '../types/types';
import * as sb from './parser.helpers';
import { parseMetaFromHtml } from './html.parser';

export class MainParser {
  private zakon: MasterJson;
  private currentPar: CurrentPar | null = null;
  private currentPriloha: CurrentPriloha | null = null;
  private inAppendix = false;
  private lastStructural: any = null;
  private hasSeenOdstavecInCurrentPar = false;
  private inPpcSection = false;

  constructor(
    private data: SbJson,
    private html?: string,
  ) {
    let meta: MasterJsonMeta = {
      cislo: 0,
      rok: 0,
      nazev: '',
      staleUrl: undefined,
      platneOd: '',
      ucinneOd: '',
      ucinneDo: undefined,
      aktualniZneniOd: undefined,
      aktualniZneniDo: undefined,
    };

    if (this.html) {
      const htmlMeta = parseMetaFromHtml(this.html);
      meta = { ...meta, ...htmlMeta };
    }

    this.zakon = json.createZakon(meta);
  }

  public parse(): MasterJson {
    this.parseBody();
    this.flushPar();
    this.flushPriloha();
    this.zakon.nodes = json.nestNodesFlatToTree(this.zakon.nodes);

    return this.zakon;
  }

  private parseBody(): void {
    for (const fr of this.data.fragmenty) {
      const typ = fr.typ;
      const xhtml = fr.xhtml ?? '';

      switch (typ) {
        case 'Horizontal_Line':
        case 'Virtual_Separator': {
          this.flushPar();
          this.flushPriloha();
          this.inPpcSection = false;
          break;
        }
        case 'Block_Priloha': {
          this.flushPar();
          this.flushPriloha();
          this.inAppendix = false;
          break;
        }
        case 'Hlavicka_priloha': {
          this.inPpcSection = false;
          this.flushPar();
          this.flushPriloha();

          const { marker, text } = sb.extractMarkerAndText(xhtml);
          const title = sb.stripTags(xhtml) || text;
          const rawMarker = marker || title;
          const normMarker = (rawMarker || '').replace(/^příloha\s*/i, '').trim();

          this.currentPriloha = {
            title,
            marker: normMarker,
            textBuf: [],
            tables: [],
            children: [],
            hasSeenOdstavec: false,
            nextOdstavecNum: 0,
          };
          this.inAppendix = true;
          break;
        }
        case 'Cast':
        case 'Hlava':
        case 'Dil':
        case 'Oddil':
        case 'Pododdil': {
          this.flushPar();
          this.flushPriloha();
          this.inPpcSection = false;
          this.inAppendix = false;

          const { marker } = sb.extractMarkerAndText(xhtml);
          let mrk = marker ?? '';
          if (typ === 'Dil') mrk = (marker ?? '').match(/d[ií]l\s+(.+)$/i)?.[1] ?? mrk;
          if (typ === 'Oddil') mrk = (marker ?? '').match(/odd[ií]l\s+(.+)$/i)?.[1] ?? mrk;

          const node =
            typ === 'Cast'
              ? json.createCast('', mrk || sb.stripTags(xhtml))
              : typ === 'Hlava'
                ? json.createHlava('', mrk || sb.stripTags(xhtml))
                : typ === 'Dil'
                  ? json.createDil('', mrk)
                  : typ === 'Oddil'
                    ? json.createOddil('', mrk)
                    : json.createPododdil('', mrk);

          this.zakon.nodes.push(node);
          this.lastStructural = node;
          break;
        }
        case 'Paragraf': {
          this.flushPar();
          this.flushPriloha();
          this.inAppendix = false;
          this.inPpcSection = false;

          const { marker } = sb.extractMarkerAndText(xhtml);
          const parMarker = sb.parseParMarker(marker ?? '');

          this.currentPar = { marker: parMarker, textBuf: [] };
          this.hasSeenOdstavecInCurrentPar = false;
          break;
        }
        case 'Nadpis':
        case 'Nadpis_pod':
        case 'Nadpis_nad': {
          const txt = sb.stripTags(xhtml);
          if (!txt) break;
          if (this.inAppendix && this.currentPriloha) {
            this.currentPriloha.textBuf.push(txt);
          } else if (this.currentPar && !this.currentPar.title) {
            this.currentPar.title = txt;
          } else if (this.lastStructural) {
            this.lastStructural.title = txt;
          }
          break;
        }
        case 'Odstavec_Dc': {
          const { marker, text } = sb.extractMarkerAndText(xhtml);

          if (this.inAppendix && this.currentPriloha) {
            let n: number;
            if (marker && /^\(\d+\)$/.test(marker)) {
              n = parseInt(marker.replace(/[()]/g, ''), 10);
              this.currentPriloha.nextOdstavecNum = Math.max(
                this.currentPriloha.nextOdstavecNum,
                n,
              );
            } else {
              n = ++this.currentPriloha.nextOdstavecNum;
            }
            this.currentPriloha.children.push(json.createOdstavec(text, n));
            this.currentPriloha.hasSeenOdstavec = true;
          } else {
            if (marker && /^\(\d+\)$/.test(marker)) {
              this.flushPar();
              const n = parseInt(marker.replace(/[()]/g, ''), 10);
              this.zakon.nodes.push(json.createOdstavec(text, n));
              this.hasSeenOdstavecInCurrentPar = true;
            } else if (this.currentPar) {
              this.currentPar.textBuf.push(marker ? `${marker} ${text}`.trim() : text);
            }
          }
          break;
        }
        case 'Pismeno_Lb':
        case 'Bod_Dd': {
          const { marker, text } = sb.extractMarkerAndText(xhtml);
          if (!marker) break;

          const target = this.inAppendix && this.currentPriloha ? this.currentPriloha : null;

          if (target) {
            if (!target.hasSeenOdstavec) {
              target.children.push(json.createOdstavec('', ++target.nextOdstavecNum));
              target.hasSeenOdstavec = true;
            }
            target.children.push(
              typ === 'Pismeno_Lb'
                ? json.createPismeno(text, marker)
                : json.createBod(text, marker),
            );
          } else {
            this.flushPar();
            if (!this.hasSeenOdstavecInCurrentPar) {
              this.zakon.nodes.push(json.createOdstavec('', 1));
              this.hasSeenOdstavecInCurrentPar = true;
            }
            this.zakon.nodes.push(
              typ === 'Pismeno_Lb'
                ? json.createPismeno(text, marker)
                : json.createBod(text, marker),
            );
          }
          break;
        }
        case 'Tabulka': {
          if (this.inAppendix && this.currentPriloha) {
            const { columns, rows } = sb.parseTableXhtml(xhtml);
            this.currentPriloha.tables.push({ type: 'TABULKA', columns, rows });
          }
          break;
        }
        case 'Virtual_PPC':
        case 'PPC': {
          this.flushPar();
          this.flushPriloha();
          this.inAppendix = false;
          this.inPpcSection = true;

          if (typ === 'PPC') {
            const { marker, text } = sb.extractPpcMarkerAndText(xhtml);
            const mrk = (marker ?? '').trim();
            const clean = (text ?? '').trim();
            if (mrk || clean) {
              this.zakon.nodes.push(json.createPoznamkaPodCarou(clean, mrk));
            }
          }
          break;
        }

        default: {
          if (this.inPpcSection) break;
          const plain = sb.stripTags(xhtml);
          if (!plain) break;

          if (this.inAppendix && this.currentPriloha) {
            this.currentPriloha.textBuf.push(plain);
          } else if (this.currentPar) {
            this.currentPar.textBuf.push(plain);
          }
          break;
        }
      }
    }
  }

  private flushPar(): void {
    if (!this.currentPar) return;
    const title = this.currentPar.title ?? '';
    const text = this.currentPar.textBuf.join(' ').trim();
    this.zakon.nodes.push(json.createParagraf(title, text, this.currentPar.marker));
    this.currentPar = null;
  }

  private flushPriloha(): void {
    if (!this.currentPriloha) {
      this.inAppendix = false;
      return;
    }
    const { title, marker, textBuf, tables, children } = this.currentPriloha;
    this.zakon.nodes.push(
      json.createPriloha(title, textBuf.join(' ').trim(), marker, tables, children),
    );
    this.currentPriloha = null;
    this.inAppendix = false;
  }
}
