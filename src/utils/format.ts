/** Formatera tal med svensk notation: decimalkomma, mellanslag i tusental */
export function fmt(value: number | null | undefined, decimals = 1): string {
  if (value == null || isNaN(value)) return "–";
  if (value === 0) return "0";
  const parts = value.toFixed(decimals).split(".");
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
  if (decimals === 0) return intPart;
  return `${intPart},${parts[1]}`;
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

/** CSS-klass för differens mot riket */
export function diffFarg(diff: number | null): string {
  if (diff == null) return "text-gra-1";
  if (diff > 0) return "text-gron-2";
  if (diff < 0) return "text-rod-2";
  return "text-gra-1";
}
