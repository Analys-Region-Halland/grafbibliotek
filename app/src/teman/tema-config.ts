/**
 * Typer för tema-konfiguration.
 *
 * Tabellen har tre nivåer: band (gruppRubrik) → indikator (kpiIds) → uppdelning (undersektioner).
 * En uppdelning visar hur förälderns helhet fördelar sig: samma mått för delgrupper (kön,
 * födelseregion, åldersgrupper, bransch) eller flödena bakom ett netto (födda och döda).
 * Ett mått med egen innebörd, som andel utrikes födda, är en egen indikator i ett band.
 * Se METODIK.md §8.0.
 */

export interface Undersektion {
  /**
   * Uppdelningen som nominalfras i gemener; knappen blir "Visa {namn}" och vid flera
   * uppdelningar blir namnet med versal rubrik över raderna. T.ex. "kvinnor och män".
   */
  namn: string;
  kpiIds: string[];
  /** Indikatorn som delas upp; standard är sektionens första. Krävs när sektionen har flera. */
  delAv?: string;
  /** Sortera raderna efter den valda enhetens senaste värde (fallande), t.ex. branscher */
  sorteraEfterVarde?: boolean;
}

export interface Sektion {
  id: string;
  namn: string;
  kpiIds: string[];
  undersektioner?: Undersektion[];
  /** Bandets rubrik i tabellen; följande sektioner med samma rubrik hamnar i samma band */
  gruppRubrik?: string;
}

export interface TemaConfig {
  temaId: string;
  temaNamn: string;
  temaFarg: TemaFarg;
  sektioner: Sektion[];
  visningsnamn: Record<string, string>;
  /** Korta namn på uppdelningarnas rader, där förälderns namn står ovanför (t.ex. "Kvinnor") */
  kortNamn?: Record<string, string>;
  /** KPI:er som bara används i analysens figurer (inte i tabellen), t.ex. komponenter i antal */
  figurKpiIds?: string[];
  /** KPI-ID:n som visas per 1 000 invånare */
  nettoKpis?: string[];
  /** KPI-ID:n som saknar index-toggle (netto-KPI:er) */
  ingetIndex?: string[];
  /** KPI-ID:n där lågt värde är önskvärt (inverterad färgskala för ranking) */
  lagtArBra?: string[];
}

/** Tillgängliga temafärger — mappar till Tailwind-klasser */
export type TemaFarg = "gron" | "bla" | "rod" | "lila" | "gul" | "brun";

/** Hexvärden per temafärg: djup (text, linjer) och medel (prickar, accentlinjer) */
export const TEMA_FARG_HEX: Record<TemaFarg, { djup: string; medel: string; ljus: string }> = {
  gron: { djup: "#00664D", medel: "#00AB60", ljus: "#E3F4E2" },
  bla: { djup: "#004990", medel: "#2DB8F6", ljus: "#E2F6FF" },
  rod: { djup: "#A51300", medel: "#FF5F4A", ljus: "#FEE6E7" },
  lila: { djup: "#433C9D", medel: "#6473D9", ljus: "#E8EBFF" },
  gul: { djup: "#FF7E00", medel: "#FF7E00", ljus: "#FEF8E8" },
  brun: { djup: "#59392E", medel: "#895B42", ljus: "#EFCDB6" },
};

/** CSS-klasser per temafärg */
export const TEMA_FARG_KLASSER: Record<TemaFarg, {
  gradient: string;
  border: string;
  bg: string;
  text: string;
  accent: string;
  accentLight: string;
  barTop: string;
  sectionBorder: string;
  dot: string;
  pillBg: string;
  pillText: string;
}> = {
  gron: {
    gradient: "from-gron-4 to-gron-4/40",
    border: "border-gron-3/50",
    bg: "bg-gron-4",
    text: "text-gron-1",
    accent: "text-gron-2",
    accentLight: "bg-gron-4",
    barTop: "from-gron-2 to-gron-3",
    sectionBorder: "border-gron-3/40",
    dot: "bg-gron-2",
    pillBg: "bg-gron-4",
    pillText: "text-gron-1",
  },
  bla: {
    gradient: "from-bla-4 to-bla-4/40",
    border: "border-bla-3/50",
    bg: "bg-bla-4",
    text: "text-bla-1",
    accent: "text-bla-2",
    accentLight: "bg-bla-4",
    barTop: "from-bla-2 to-bla-3",
    sectionBorder: "border-bla-3/40",
    dot: "bg-bla-2",
    pillBg: "bg-bla-4",
    pillText: "text-bla-1",
  },
  rod: {
    gradient: "from-rod-4 to-rod-4/40",
    border: "border-rod-3/50",
    bg: "bg-rod-4",
    text: "text-rod-1",
    accent: "text-rod-2",
    accentLight: "bg-rod-4",
    barTop: "from-rod-2 to-rod-3",
    sectionBorder: "border-rod-3/40",
    dot: "bg-rod-2",
    pillBg: "bg-rod-4",
    pillText: "text-rod-1",
  },
  lila: {
    gradient: "from-lila-4 to-lila-4/40",
    border: "border-lila-3/50",
    bg: "bg-lila-4",
    text: "text-lila-1",
    accent: "text-lila-2",
    accentLight: "bg-lila-4",
    barTop: "from-lila-2 to-lila-3",
    sectionBorder: "border-lila-3/40",
    dot: "bg-lila-2",
    pillBg: "bg-lila-4",
    pillText: "text-lila-1",
  },
  gul: {
    gradient: "from-gul-4 to-gul-4/40",
    border: "border-gul-3/50",
    bg: "bg-gul-4",
    text: "text-gul-1",
    accent: "text-gul-2",
    accentLight: "bg-gul-4",
    barTop: "from-gul-2 to-gul-3",
    sectionBorder: "border-gul-3/40",
    dot: "bg-gul-1",
    pillBg: "bg-gul-4",
    pillText: "text-gul-1",
  },
  brun: {
    gradient: "from-brun-4 to-brun-4/40",
    border: "border-brun-3/50",
    bg: "bg-brun-4",
    text: "text-brun-1",
    accent: "text-brun-2",
    accentLight: "bg-brun-4",
    barTop: "from-brun-2 to-brun-3",
    sectionBorder: "border-brun-3/40",
    dot: "bg-brun-2",
    pillBg: "bg-brun-4",
    pillText: "text-brun-1",
  },
};
