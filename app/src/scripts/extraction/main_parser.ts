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

      if (this.inAppendix) {
        if (typ === 'Virtual_PPC') {
          this.flushPriloha();
          this.inAppendix = false;
          continue;
        }

        if (typ === 'PPC') {
          this.flushPriloha();
          this.inAppendix = false;
          this.inPpcSection = true;

          const { marker, text } = sb.extractPpcMarkerAndText(xhtml);
          const mrk = (marker ?? '').trim();
          const clean = (text ?? '').trim();

          if (mrk || clean) {
            this.zakon.nodes.push(json.createPoznamkaPodCarou(clean, mrk));
          }
          continue;
        }

        if (typ === 'Horizontal_Line' || typ === 'Virtual_Separator') {
          this.flushPriloha();
          continue;
        }

        if (typ === 'Hlavicka_priloha') {
          this.flushPriloha();

          const { marker, text } = sb.extractMarkerAndText(xhtml);
          const title = sb.stripTags(xhtml) || text || '';
          const raw = marker || title;
          const normMarker = (raw || '').replace(/^příloha\s*/i, '').trim();

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
          continue;
        }

        if (typ === 'Nadpis' || typ === 'Nadpis_pod' || typ === 'Nadpis_nad') {
          const txt = sb.stripTags(xhtml);
          if (txt) this.currentPriloha?.textBuf.push(txt);
          continue;
        }

        if (typ === 'Tabulka') {
          if (this.currentPriloha) {
            const { columns, rows } = sb.parseTableXhtml(xhtml);
            this.currentPriloha.tables.push({ type: 'TABULKA', columns, rows });
          }
          continue;
        }

        if (typ === 'Odstavec_Dc') {
          const { marker, text } = sb.extractMarkerAndText(xhtml);
          let n: number | null = null;
          if (marker && /^\(\d+\)$/.test(marker)) {
            n = parseInt(marker.replace(/[()]/g, ''), 10);
            this.currentPriloha!.nextOdstavecNum = Math.max(
              this.currentPriloha!.nextOdstavecNum,
              n,
            );
          } else {
            n = ++this.currentPriloha!.nextOdstavecNum;
          }

          this.currentPriloha!.children.push(json.createOdstavec(text, n));
          this.currentPriloha!.hasSeenOdstavec = true;
          continue;
        }

        if (typ === 'Pismeno_Lb') {
          const { marker, text } = sb.extractMarkerAndText(xhtml);
          if (!marker) {
            continue;
          }

          if (!this.currentPriloha!.hasSeenOdstavec) {
            const n = ++this.currentPriloha!.nextOdstavecNum;
            this.currentPriloha!.children.push(json.createOdstavec('', n));
            this.currentPriloha!.hasSeenOdstavec = true;
          }

          this.currentPriloha!.children.push(json.createPismeno(text, marker));
          continue;
        }

        if (typ === 'Bod_Dd') {
          const { marker, text } = sb.extractMarkerAndText(xhtml);
          if (!marker) {
            continue;
          }

          if (!this.currentPriloha!.hasSeenOdstavec) {
            const n = ++this.currentPriloha!.nextOdstavecNum;
            this.currentPriloha!.children.push(json.createOdstavec('', n));
            this.currentPriloha!.hasSeenOdstavec = true;
          }

          this.currentPriloha!.children.push(json.createBod(text, marker));
          continue;
        }
        {
          const { marker, text } = sb.extractMarkerAndText(xhtml);
          const line = marker ? `${marker} ${text}`.trim() : text;
          if (line) this.currentPriloha?.textBuf.push(line);
          continue;
        }
      }

      switch (typ) {
        case 'Horizontal_Line':
        case 'Virtual_Separator': {
          this.flushPar();
          this.flushPriloha();
          this.inPpcSection = false;
          break;
        }

        case 'Cast': {
          this.flushPar();
          this.flushPriloha();
          this.inPpcSection = false;

          const { marker } = sb.extractMarkerAndText(xhtml);
          const node = json.createCast('', marker ?? sb.stripTags(xhtml));

          this.zakon.nodes.push(node);
          this.lastStructural = node;
          break;
        }

        case 'Hlava': {
          this.flushPar();
          this.flushPriloha();
          this.inPpcSection = false;

          const { marker } = sb.extractMarkerAndText(xhtml);
          const node = json.createHlava('', marker ?? sb.stripTags(xhtml));

          this.zakon.nodes.push(node);
          this.lastStructural = node;
          break;
        }

        case 'Dil': {
          this.flushPar();
          this.flushPriloha();
          this.inPpcSection = false;

          const { marker } = sb.extractMarkerAndText(xhtml);
          const m = (marker ?? '').match(/d[ií]l\s+(.+)$/i);
          const mrk = m ? m[1] : (marker ?? '');
          const node = json.createDil('', mrk);

          this.zakon.nodes.push(node);
          this.lastStructural = node;
          break;
        }

        case 'Oddil': {
          this.flushPar();
          this.flushPriloha();
          this.inPpcSection = false;

          const { marker } = sb.extractMarkerAndText(xhtml);
          const m = (marker ?? '').match(/odd[ií]l\s+(.+)$/i);
          const mrk = m ? m[1] : (marker ?? '');
          const node = json.createOddil('', mrk);

          this.zakon.nodes.push(node);
          this.lastStructural = node;
          break;
        }

        case 'Pododdil': {
          this.flushPar();
          this.flushPriloha();
          this.inPpcSection = false;

          const { marker } = sb.extractMarkerAndText(xhtml);
          const m = (marker ?? '').match(/pododd[ií]l\s+(.+)$/i);
          const mrk = m ? m[1] : (marker ?? '');
          const node = json.createPododdil('', mrk);

          this.zakon.nodes.push(node);
          this.lastStructural = node;
          break;
        }

        case 'Nadpis':
        case 'Nadpis_pod':
        case 'Nadpis_nad': {
          const txt = sb.stripTags(xhtml);

          if (this.inAppendix && this.currentPriloha) {
            this.currentPriloha.textBuf.push(txt);
            break;
          }

          if (this.currentPar && !this.currentPar.title) {
            this.currentPar.title = txt;
            break;
          }

          if (this.lastStructural) {
            this.lastStructural.title = txt;
          }
          break;
        }

        case 'Paragraf': {
          if (this.inAppendix) {
            break;
          }
          this.flushPar();
          this.flushPriloha();
          this.inPpcSection = false;

          const { marker } = sb.extractMarkerAndText(xhtml);
          const parMarker = sb.parseParMarker(marker ?? '');

          this.currentPar = { marker: parMarker, textBuf: [] };
          this.hasSeenOdstavecInCurrentPar = false;
          break;
        }

        case 'Odstavec_Dc': {
          this.inPpcSection = false;
          const { marker, text } = sb.extractMarkerAndText(xhtml);

          if (marker && /^\(\d+\)$/.test(marker)) {
            if (this.currentPar) {
              this.flushPar();
            }

            const n = parseInt(marker.replace(/[()]/g, ''), 10);

            this.zakon.nodes.push(json.createOdstavec(text, n));
            this.hasSeenOdstavecInCurrentPar = true;
          } else {
            const plain = marker ? `${marker} ${text}`.trim() : text;
            if (plain) {
              if (this.currentPar) {
                this.currentPar.textBuf.push(plain);
              }
            }
          }
          break;
        }

        case 'Pismeno_Lb': {
          this.inPpcSection = false;
          const { marker, text } = sb.extractMarkerAndText(xhtml);

          if (!marker) {
            break;
          }
          if (this.currentPar) {
            this.flushPar();
          }
          if (!this.hasSeenOdstavecInCurrentPar) {
            this.zakon.nodes.push(json.createOdstavec('', 1));
            this.hasSeenOdstavecInCurrentPar = true;
          }
          this.zakon.nodes.push(json.createPismeno(text, marker));
          break;
        }

        case 'Bod_Dd': {
          this.inPpcSection = false;
          const { marker, text } = sb.extractMarkerAndText(xhtml);
          if (!marker) break;
          if (this.currentPar) {
            this.flushPar();
          }
          if (!this.hasSeenOdstavecInCurrentPar) {
            this.zakon.nodes.push(json.createOdstavec('', 1));
            this.hasSeenOdstavecInCurrentPar = true;
          }
          this.zakon.nodes.push(json.createBod(text, marker));
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

        case 'Tabulka': {
          this.inPpcSection = false;

          if (this.inAppendix && this.currentPriloha) {
            const { columns, rows } = sb.parseTableXhtml(xhtml);
            this.currentPriloha.tables.push({
              type: 'TABULKA',
              columns,
              rows,
            });
          }
          break;
        }

        case 'Virtual_PPC': {
          this.flushPar();
          this.flushPriloha();
          this.inPpcSection = true;
          break;
        }

        case 'PPC': {
          const { marker, text } = sb.extractPpcMarkerAndText(xhtml);
          const mrk = (marker ?? '').trim();
          const clean = (text ?? '').trim();
          if (!mrk && !clean) break;

          const node = json.createPoznamkaPodCarou(clean, mrk);

          this.zakon.nodes.push(node);
          break;
        }

        default: {
          if (this.inPpcSection) {
            break;
          }

          const plain = sb.stripTags(xhtml);
          if (!plain) {
            break;
          }
          if (this.currentPar) {
            this.currentPar.textBuf.push(plain);
          } else if (this.inAppendix && this.currentPriloha) {
            this.currentPriloha.textBuf.push(plain);
          }
          break;
        }
      }
    }
  }

  private flushPar(): void {
    if (!this.currentPar) {
      return;
    }
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
