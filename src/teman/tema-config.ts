/** Typer för tema-konfiguration */

export interface Undersektion {
  namn: string;
  kpiIds: string[];
}

export interface Sektion {
  id: string;
  namn: string;
  kpiIds: string[];
  undersektioner?: Undersektion[];
  /** Sortera kort efter senaste värde (fallande) */
  sorteraEfterVarde?: boolean;
  /** Grupprubrik — renderas som rubrik ovanför kortet när gruppen ändras */
  gruppRubrik?: string;
}

export interface TemaConfig {
  temaId: string;
  temaNamn: string;
  temaFarg: TemaFarg;
  sektioner: Sektion[];
  visningsnamn: Record<string, string>;
  /** Korta namn för kort i fler-KPI-sektioner */
  kortNamn?: Record<string, string>;
  /** KPI-ID:n som visas per 1 000 invånare */
  nettoKpis?: string[];
  /** KPI-ID:n som saknar index-toggle (netto-KPI:er) */
  ingetIndex?: string[];
}

/** Tillgängliga temafärger — mappar till Tailwind-klasser */
export type TemaFarg = "gron" | "bla" | "rod" | "lila" | "gul" | "brun";

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
