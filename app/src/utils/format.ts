/** Formatera tal med svensk notation: decimalkomma, mellanslag i tusental */
export function fmt(value: number | null | undefined, decimals = 1): string {
  if (value == null || isNaN(value)) return "–";
  if (value === 0) return "0";
  const parts = value.toFixed(decimals).split(".");
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
  if (decimals === 0) return intPart;
  return `${intPart},${parts[1]}`;
}

/**
 * Stora tal förkortas så att de får plats i tabeller och figurer: från en miljon skrivs de
 * med tre värdesiffror i miljoner (mn) eller miljarder (mdr), t.ex. 3,13 mn och 40,9 mdr.
 * Mindre tal skrivs ut med `decimals` decimaler. `ref` styr enheten, så att en förändring
 * skrivs i samma enhet som värdet den hör till: 3,13 mn (+0,43 mn). Exakta värden finns
 * i tooltipen och i graf och karta.
 */
export function fmtStor(value: number | null | undefined, decimals: number, ref?: number | null): string {
  if (value == null || isNaN(value)) return "–";
  const a = Math.abs(ref ?? value);
  const tre = (x: number) => (x >= 100 ? 0 : x >= 10 ? 1 : 2);
  if (a >= 1e9) return `${fmt(value / 1e9, tre(a / 1e9))} mdr`;
  if (a >= 1e6) return `${fmt(value / 1e6, tre(a / 1e6))} mn`;
  return fmt(value, decimals);
}

/**
 * Decimaler för ett KPI-värde. Samma regel används i R/kap03-ai-analys.R så att
 * siffrorna i analystexten stämmer med korten: antal och tal ≥ 1 000 utan decimaler,
 * tal under 10 med två, övriga med en.
 */
export function kpiDecimaler(v: number | null | undefined, enhet: string): number {
  if (v == null) return 1;
  if (enhet === "antal" || Math.abs(v) >= 1000) return 0;
  if (Math.abs(v) < 10) return 2;
  return 1;
}

/** Formatera heltal med mellanslag */
export function fmtInt(value: number | null | undefined): string {
  return fmt(value, 0);
}

/** Formatera rangplacering: "42 av 290" */
export function fmtRang(rang: number | null, total: number | null): string {
  if (rang == null || total == null) return "–";
  return `${rang} av ${total}`;
}

/** Trendpil baserad på riktning */
export function trendPil(riktning: string | null): string {
  if (riktning === "upp") return "↑";
  if (riktning === "ned") return "↓";
  return "→";
}

/** CSS-klass för trend */
export function trendFarg(riktning: string | null): string {
  if (riktning === "upp") return "text-gron-2";
  if (riktning === "ned") return "text-rod-2";
  return "text-gra-1";
}

/** Kolla om period är månadsdata (YYYYMM > 9999) */
export function isMonthly(ar: number): boolean {
  return ar > 9999;
}

/** Svenska månadsförkortningar */
const MANAD_KORT = [
  "jan", "feb", "mar", "apr", "maj", "jun",
  "jul", "aug", "sep", "okt", "nov", "dec",
];

const MANAD_LANG = [
  "januari", "februari", "mars", "april", "maj", "juni",
  "juli", "augusti", "september", "oktober", "november", "december",
];

/**
 * Formatera period: YYYY → "2025", YYYYMM → "dec 2025". Kvartalsdata lagras som kvartalets
 * sista månad (YYYY03, YYYY06 …) och skrivs "kv. 2 2026".
 */
export function fmtPeriod(ar: number, kvartal = false): string {
  if (!isMonthly(ar)) return String(ar);
  const year = Math.floor(ar / 100);
  const month = ar % 100;
  if (kvartal) return `kv. ${Math.ceil(month / 3)} ${year}`;
  return `${MANAD_KORT[month - 1] ?? "?"} ${year}`;
}

/** Perioden i löptext: "år 2025", "i juli 2026", "andra kvartalet 2026" */
export function periodText(ar: number, kvartal = false): string {
  if (!isMonthly(ar)) return `år ${ar}`;
  const year = Math.floor(ar / 100);
  const month = ar % 100;
  if (kvartal) return `${["första", "andra", "tredje", "fjärde"][Math.ceil(month / 3) - 1] ?? "?"} kvartalet ${year}`;
  return `i ${MANAD_LANG[month - 1] ?? "?"} ${year}`;
}

/**
 * Kvartalsserie: månadskodad men bara kvartalets sista månader (3, 6, 9, 12). Avgörs av hela
 * serien, så att en enskild period kan formateras rätt.
 */
export function arKvartalsserie(rows: { ar: number }[]): boolean {
  if (rows.length < 2 || !isMonthly(rows[0].ar)) return false;
  return rows.every((r) => r.ar % 100 % 3 === 0);
}

/** Hitta "samma månad föregående år" — returnerar YYYYMM eller null */
export function sameMonthLastYear(ar: number): number | null {
  if (!isMonthly(ar)) return null;
  const year = Math.floor(ar / 100);
  const month = ar % 100;
  return (year - 1) * 100 + month;
}

/** CSS-klass för differens mot riket */
export function diffFarg(diff: number | null): string {
  if (diff == null) return "text-gra-1";
  if (diff > 0) return "text-gron-2";
  if (diff < 0) return "text-rod-2";
  return "text-gra-1";
}
