export interface KpiRow {
  kpi_id: string;
  kpi_namn: string;
  enhet: string;
  tema: string;
  kommun_kod: string;
  kommun_namn: string;
  kommun_typ: string;
  ar: number;
  varde: number | null;
  riksvarde: number | null;
  diff_riket: number | null;
  diff_riket_pct: number | null;
  halland: boolean;
  rang_total: number | null;
  antal_kommuner: number | null;
  trend_1ar: number | null;
  trend_5ar: number | null;
  trend_10ar: number | null;
  trend_riktning: string | null;
  ki_lower: number | null;
  ki_upper: number | null;
}

/**
 * Slim JSON-format från per-tema-filer (korta nycklar, inga redundanta kolumner).
 * I de kompakta tabellfilerna har övriga kommuner bara värdet; saknade fält är null.
 */
export interface SlimRow {
  k: string;   // kpi_id
  m: string;   // kommun_kod
  t: string;   // kommun_typ
  a: number;   // ar
  v?: number | null;   // varde
  r?: number | null;   // riksvarde
  rg?: number | null;  // rang_total
  n?: number | null;   // antal_kommuner
  t1?: number | null;  // trend_1ar (äldre filer)
  t5?: number | null;  // trend_5ar (äldre filer)
  t10?: number | null; // trend_10ar (äldre filer)
  kl?: number | null;  // ki_lower
  kh?: number | null;  // ki_upper
}

/** Kommun-register: kort nyckelformat */
export interface KommunEntry {
  k: string;  // kommun_kod
  n: string;  // kommun_namn
  t: string;  // kommun_typ
}

export interface KpiMeta {
  kpi_id: string;
  kpi_namn: string;
  beskrivning: string;
  enhet: string;
  tema: string;
  par_kpi_id: string | null;
}

export const HALLAND_KOMMUNER = [
  { kod: "0013", namn: "Halland", typ: "L" as const },
  { kod: "1380", namn: "Halmstad", typ: "K" as const },
  { kod: "1381", namn: "Laholm", typ: "K" as const },
  { kod: "1382", namn: "Falkenberg", typ: "K" as const },
  { kod: "1383", namn: "Varberg", typ: "K" as const },
  { kod: "1384", namn: "Kungsbacka", typ: "K" as const },
  { kod: "1315", namn: "Hylte", typ: "K" as const },
] as const;

/** Fasta färger per enhet, samma i alla grafer och kartor (riktlinje VIS-01) */
export const ENHET_FARG: Record<string, string> = {
  "1384": "#0C8C7E", // Kungsbacka
  "1383": "#004990", // Varberg
  "1382": "#FF7E00", // Falkenberg
  "1380": "#A51300", // Halmstad
  "1381": "#8cd211", // Laholm
  "1315": "#7b2d8e", // Hylte
  "0013": "#555555", // Halland
  "0000": "#999999", // Riket
};

/** Kommunerna i geografisk ordning norr till söder, inlandet sist */
export const KOMMUNER_NORR_SODER = ["1384", "1383", "1382", "1380", "1381", "1315"];

export const HALLAND_KODER: string[] = HALLAND_KOMMUNER
  .filter((k) => k.typ === "K")
  .map((k) => k.kod);

// ─── Kommungrupper (SKR:s indelning, för jämförelser i popupen) ───

export interface KommunGrupp {
  kod: string;
  namn: string;
  huvudgrupp: string;
}

export interface KommunGruppData {
  grupper: KommunGrupp[];
  kommuner: Record<string, string>; // kommun_kod → gruppkod
}

// ─── Adresser ───

/** Valet "Alla sida vid sida" i kommunväljaren */
export const ALLA = "alla";

/** Enhetens namn i adressen, t.ex. #/halmstad/befolkning */
export const ENHET_SLUG: Record<string, string> = {
  "0013": "halland",
  "1384": "kungsbacka",
  "1383": "varberg",
  "1382": "falkenberg",
  "1380": "halmstad",
  "1381": "laholm",
  "1315": "hylte",
  [ALLA]: "alla",
};
