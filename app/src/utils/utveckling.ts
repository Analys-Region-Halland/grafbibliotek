import type { KpiSammanfattning } from "./kpiStats";
import type { Riktning } from "../teman/tema-config";
import { fmtPeriod, periodText, kpiDecimaler } from "./format";

/**
 * Vad tabellen och tooltipen visar om utvecklingen över tid. Det skiljer sig mellan
 * indikatorerna och står därför utskrivet per rad, aldrig bara i kolumnhuvudet:
 *
 * - skillnad: nivåer, andelar och flöden. Värdet nu minus värdet tio år tidigare (eller vid
 *   seriens början), för månads- och kvartalsdata samma period året innan. Enheten skrivs ut:
 *   andelar ändras i procentenheter.
 * - snitt: indikatorer vars värde självt är en förändring eller ett netto (temats taktKpis),
 *   årsdata. Skillnaden mellan två takter säger lite ("−0,45" för en befolkningsökning som gått
 *   från 1,01 till 0,56 procent), så raden visar snittet per år för samma tioårsperiod.
 * - aretInnan: samma sorts indikatorer med månads- eller kvartalsdata: värdet ett år tidigare.
 */
export type Utveckling =
  | { typ: "skillnad"; varde: number; bas: number; basVarde: number }
  | { typ: "snitt"; varde: number; fran: number; till: number; antalAr: number }
  | { typ: "aretInnan"; varde: number; period: number };

export function utveckling(s: KpiSammanfattning, takt: boolean): Utveckling | null {
  const manad = s.period > 9999;
  if (!takt) {
    const f = s.forandring[manad ? 1 : 10];
    return f ? { typ: "skillnad", varde: f.varde, bas: f.sedan, basVarde: s.varde - f.varde } : null;
  }
  if (manad) {
    const p = s.period - 100;
    const v = s.serie.find((r) => r.ar === p)?.varde;
    return v != null ? { typ: "aretInnan", varde: v, period: p } : null;
  }
  const rader = s.serie.filter((r) => r.varde != null && r.ar > s.period - 10 && r.ar <= s.period);
  if (rader.length < 3) return null;
  const snitt = rader.reduce((a, r) => a + (r.varde as number), 0) / rader.length;
  return { typ: "snitt", varde: snitt, fran: rader[0].ar, till: s.period, antalAr: rader.length };
}

/** Skillnadens enhet: procentenheter för andelar, annars värdets enhet (antal utan ord) */
export function skillnadsEnhet(enhet: string): string {
  if (enhet === "procent") return "procentenheter";
  if (enhet === "antal") return "";
  return enhet;
}

/** Värdets enhet i text */
export const vardeEnhet = (enhet: string) => (enhet === "procent" ? "procent" : enhet === "antal" ? "" : enhet);

/** Relativ förändring i procent är meningsfull för antal och belopp, inte för kvoter och andelar */
const visaRelativ = (enhet: string) => enhet === "antal" || /^(kr|tkr)\b/.test(enhet);

export interface UtvecklingText {
  /** Talet, med tecken för en skillnad: "+1,6", "±0", "1,30" */
  tal: string;
  /** Enheten under talet: "procentenheter", "procent", "år" eller tom */
  enhet: string;
  /** Vad som jämförs: "jämfört med 2015", "snitt per år 2016–2025" */
  vad: string;
  /** Färgklass när önskvärd riktning är känd (bara för skillnader) */
  klass: string;
  /** Hela meningen, för tooltip och skärmläsare */
  mening: string;
}

/**
 * Texten för utvecklingen. `f` formaterar ett tal med givna decimaler (tabellen förkortar
 * stora tal, tooltipen skriver ut dem exakt).
 */
export function utvecklingText(
  u: Utveckling, s: KpiSammanfattning, enhet: string, riktning: Riktning,
  f: (v: number, dec: number) => string,
): UtvecklingText {
  const dec = kpiDecimaler(s.varde, enhet);
  const med = (x: string, e: string) => (e ? `${x} ${e}` : x);
  // Perioden ("aug 2025", "kv. 2 2026") bryts aldrig mitt i
  const hel = (x: string) => x.replace(/ /g, " ");
  // Meningsslut utan dubbel punkt efter enheter som "per 1 000 inv."
  const slut = (x: string) => (x.endsWith(".") ? x : `${x}.`);
  // "år 2015", "juli 2025", "andra kvartalet 2026"
  const namn = (p: number) => periodText(p, s.kvartal).replace(/^i /, "");
  const nu = namn(s.period);

  if (u.typ === "skillnad") {
    const v = u.varde;
    const tal = v === 0 ? "±0" : v > 0 ? `+${f(v, dec)}` : f(v, dec);
    const e = skillnadsEnhet(enhet);
    const klass = !riktning || v === 0 ? "" : (v < 0) === (riktning === "lagt") ? "kt-battre" : "kt-samre";
    const rel = visaRelativ(enhet) && u.basVarde > 0 && v !== 0
      ? `, ${v > 0 ? "+" : ""}${f((v / u.basVarde) * 100, 1)} procent` : "";
    return {
      tal, enhet: e, klass,
      vad: `jämfört med ${hel(fmtPeriod(u.bas, s.kvartal))}`,
      mening: slut(`Förändring ${med(tal, e)}${rel} jämfört med ${namn(u.bas)}: från ${med(f(u.basVarde, dec), vardeEnhet(enhet))} till ${med(f(s.varde, dec), vardeEnhet(enhet))}`),
    };
  }

  if (u.typ === "snitt") {
    const d = kpiDecimaler(u.varde, enhet);
    const tal = f(u.varde, d);
    const e = vardeEnhet(enhet);
    const luckor = u.antalAr < u.till - u.fran + 1 ? ` (${u.antalAr} år med värde)` : "";
    return {
      tal, enhet: e, klass: "",
      // Ordfogar runt strecket, så att årsintervallet aldrig bryts
      vad: `snitt per år ${u.fran}⁠–⁠${u.till}`,
      mening: `${slut(`Snitt per år ${u.fran}–${u.till}${luckor}: ${med(tal, e)}`)} ${slut(`Värdet ${nu}: ${med(f(s.varde, dec), e)}`)} Måttet är självt en förändring eller ett netto under året, så snittet per år visas i stället för skillnaden mot ett tidigare år.`,
    };
  }

  const d = kpiDecimaler(u.varde, enhet);
  const tal = f(u.varde, d);
  const e = vardeEnhet(enhet);
  return {
    tal, enhet: e, klass: "",
    vad: `värdet ett år tidigare, ${hel(fmtPeriod(u.period, s.kvartal))}`,
    mening: `${slut(`Ett år tidigare, ${namn(u.period)}: ${med(tal, e)}`)} ${slut(`Värdet ${nu}: ${med(f(s.varde, dec), e)}`)} Måttet är självt en förändring mot året innan, så värdet ett år tidigare visas i stället för skillnaden.`,
  };
}
