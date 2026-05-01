export type NodeType =
  | 'ZAKON'
  | 'CAST_ZAKONA'
  | 'HLAVA'
  | 'DIL'
  | 'ODDIL'
  | 'PODODDIL'
  | 'PARAGRAF'
  | 'ODSTAVEC'
  | 'PISMENO'
  | 'BOD'
  | 'PRILOHA'
  | 'POZNAMKA_POD_CAROU';

export interface MasterJsonMeta {
  cislo: number;
  rok: number;
  nazev: string;
  zkratka?: string | null;
  staleUrl?: string | null;
  platneOd: string;
  ucinneOd: string;
  ucinneDo?: string | null;
  aktualniZneniOd?: string | null;
  aktualniZneniDo?: string | null;
  sourceUrl?: string | null;
}

export interface MasterJsonNode {
  type: Exclude<NodeType, 'ZAKON'>;
  marker: string | null | number;
  label: string | null;
  orderIndex: number;
  text?: string;
  children?: MasterJsonNode[];
}

export interface MasterJson {
  meta: MasterJsonMeta;
  nodes: MasterJsonNode[];
}

export type SbJson = {
  metadata: {
    castkaCislo?: string | null;
    predpisCislo?: string | null;
    rocnik?: number | null;
    datumUcinnostiZneniOd?: string | null;
  };
  fragmenty: SbFragment[];
};

export type SbFragment = {
  fragmentId: number;
  hloubka: number;
  typ: string;
  xhtml: string | null;
  souboroveDokumenty?: any;
};

export type RawNodeType =
  | 'CAST_ZAKONA'
  | 'HLAVA'
  | 'DIL'
  | 'ODDIL'
  | 'PODODDIL'
  | 'PARAGRAF'
  | 'ODSTAVEC'
  | 'PISMENO'
  | 'BOD'
  | 'PRILOHA'
  | 'POZNAMKA_POD_CAROU';

export enum SbFragmentType {
  Horizontal_Line = 'Horizontal_Line',
  Virtual_Separator = 'Virtual_Separator',
  Cast = 'Cast',
  Hlava = 'Hlava',
  Dil = 'Dil',
  Oddil = 'Oddil',
  Pododdil = 'Pododdil',
  Nadpis_pod = 'Nadpis_pod',
  Nadpis_nad = 'Nadpis_nad',
  Paragraf = 'Paragraf',
  Odstavec_Dc = 'Odstavec_Dc',
  Pismeno_Lb = 'Pismeno_Lb',
  Bod_Dd = 'Bod_Dd',
  Virtual_PPC = 'Virtual_PPC',
  PPC = 'PPC',
}

export type CurrentPar = {
  marker: string;
  title?: string;
  textBuf: string[];
};

export type Table = {
  type: 'TABULKA';
  columns: string[];
  rows: string[][];
};

export type CurrentPriloha = {
  title: string;
  marker: string;
  textBuf: string[];
  tables: Table[];
  children: any[];
  hasSeenOdstavec: boolean;
  nextOdstavecNum: number;
};

export type CurrentPrechodne = {
  title: string;
  cisloZakona: number | null;
  rokZakona: number | null;
  clanek: string | null;
  textBuf: string[];
};

export type Law = { cislo: number; rok: number };
export type CrossrefCategory =
  | 'INTERNAL'
  | 'EXTERNAL_SBIRKA'
  | 'EXTERNAL_ALIAS'
  | 'EU'
  | 'AMBIGUOUS';
export type AliasDict = Record<string, Law>;

export type CrossrefAddress = {
  par?: string;
  odst?: string;
  pism?: string;
  bod?: string;
  priloha?: string;
};

export type Finding = {
  rawText: string;
  normalized?: string;
  category: CrossrefCategory;
  reason: string;
  targetLaw?: Law;
  contextSnippet: string;
  nodePath?: string;
  address?: CrossrefAddress;
  rangeExpanded?: string[];
};

export type Report = {
  lawCurrent: Law;
  totalTextsScanned: number;
  totalMatches: number;
  byCategory: Record<CrossrefCategory, number>;
  sample: Finding[];
  all?: Finding[];
};

export type LoadedFile = { filePath: string; data: any };

export type AddressableNodeType =
  | 'PARAGRAF'
  | 'ODSTAVEC'
  | 'PISMENO'
  | 'BOD'
  | 'POZNAMKA_POD_CAROU'
  | 'PRILOHA';
