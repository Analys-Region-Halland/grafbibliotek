import { Fragment, useMemo, useState } from "react";
import type { KpiMeta } from "../types";
import { ENHET_FARG, HALLAND_KOMMUNER, KOMMUNER_NORR_SODER } from "../types";
import type { TemaConfig } from "../teman/tema-config";
import { TEMA_FARG_HEX } from "../teman/tema-config";
import type { KpiIndex } from "../utils/kpiStats";
import { HALLAND_KOLUMNER, hallandsCeller } from "../utils/kpiStats";
import { byggGrupper, uppdelningsText } from "../utils/temaRader";
import type { TabellRad } from "../utils/temaRader";
import { fmtPeriod, periodText, kpiDecimaler } from "../utils/format";
import { fmt as fmtBas, fmtStor } from "../utils/format";
import { LAN_EJ_JAMFORBAR } from "../teman";

/** Typografiskt minustecken i tabellerna */
const fmt = (v: number | null | undefined, dec: number) => fmtBas(v, dec).replace(/^-/, "−");
/** Stora tal förkortade (3,13 mn) så att kolumnerna håller sin bredd; exakt värde i cellens hjälptext */
const kort = (v: number | null | undefined, dec: number) => fmtStor(v, dec).replace(/^-/, "−");

interface Props {
  tema: TemaConfig;
  meta: KpiMeta[];
  idx: KpiIndex;
  valdKod: string;
  onOpenKpi: (kpiId: string) => void;
  onValjEnhet: (kod: string) => void;
}

/** Neutral sekventiell skala (blå): läge bland landets kommuner, säger inget om önskvärdhet */
const STEG = ["#F6FBFE", "#E2F6FF", "#C7EAFC", "#A2D9F8", "#7CC5F1"];
const stegFor = (p: number) => STEG[Math.min(4, Math.floor(p * 5))];

const KOLUMNER = HALLAND_KOLUMNER;
const namnFor = (kod: string) =>
  kod === "0000" ? "Riket" : HALLAND_KOMMUNER.find((k) => k.kod === kod)?.namn ?? kod;

const Pil = () => (
  <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
    <path d="M4 2l4 4-4 4" />
  </svg>
);

const versal = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function JamforTabell({ tema, meta, idx, valdKod, onOpenKpi, onValjEnhet }: Props) {
  const grupper = useMemo(() => byggGrupper(tema, meta, idx), [tema, meta, idx]);
  const farg = TEMA_FARG_HEX[tema.temaFarg].djup;
  const [oppna, setOppna] = useState<Set<string>>(new Set());
  const vaxla = (id: string) => setOppna((prev) => {
    const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n;
  });

  /** Uppdelningens rader i fallande ordning efter länets värde (t.ex. branscher) */
  const sorterade = (rader: TabellRad[]) => {
    const v = (r: TabellRad) => hallandsCeller(idx, r.kpiId)?.celler.get("0013")?.varde ?? -Infinity;
    return [...rader].sort((a, b) => v(b) - v(a));
  };

  const renderRad = (r: TabellRad, niva: 0 | 1) => {
    const c = hallandsCeller(idx, r.kpiId);
    if (!c) return null;
    const ref = c.celler.get("0013")?.varde ?? c.celler.get(valdKod)?.varde ?? null;
    const dec = kpiDecimaler(ref, r.enhet);
    const harNed = niva === 0 && r.nedbrytningar.length > 0;
    const arOppen = oppna.has(r.kpiId);
    const flera = r.nedbrytningar.length > 1;
    return (
      <Fragment key={r.kpiId}>
        <tr className="border-t border-neutral-100 hover:bg-neutral-50/60">
          <th scope="row"
              className={`sticky left-0 z-[1] bg-white text-left font-normal py-2 pr-3 align-middle min-w-[220px] max-w-[300px] ${niva ? "jt-sub" : "pl-3"}`}>
            <button onClick={() => onOpenKpi(r.kpiId)} title={r.helaNamn}
                    className={`text-left cursor-pointer hover:underline underline-offset-2 decoration-neutral-300
                                ${niva ? "text-[12.5px] text-neutral-700" : "text-[14px] text-neutral-900"}`}>
              {r.namn}
            </button>
            <p className="text-[11px] text-neutral-500 leading-tight mt-0.5">
              {r.enhet}{" "}<span className="kt-ar" title={`Alla värden på raden gäller ${periodText(c.period, c.kvartal)}`}>{fmtPeriod(c.period, c.kvartal)}</span>
            </p>
            {harNed && (
              <button className="kt-uppdela" aria-expanded={arOppen} onClick={() => vaxla(r.kpiId)}>
                <Pil />
                {arOppen ? (flera ? "Dölj uppdelningarna" : "Dölj uppdelningen") : `Visa ${uppdelningsText(r.nedbrytningar)}`}
              </button>
            )}
          </th>
          {KOLUMNER.map((kod, i) => {
            const cell = c.celler.get(kod)!;
            const vald = kod === valdKod;
            const referens = kod === "0013" || kod === "0000";
            const annatMatt = kod === "0013" && LAN_EJ_JAMFORBAR.has(r.kpiId);
            return (
              <td key={kod}
                  className={`py-2 px-2.5 text-right align-middle tabular-nums whitespace-nowrap ${niva ? "text-[12.5px]" : "text-[13px]"}
                              ${i === KOMMUNER_NORR_SODER.length ? "border-l border-neutral-300" : ""}
                              ${referens ? "text-neutral-600" : "text-neutral-900"} ${vald ? "font-semibold" : ""}`}
                  style={{
                    background: cell.percentil != null ? stegFor(cell.percentil) : undefined,
                    boxShadow: vald ? `inset 0 0 0 1.5px ${ENHET_FARG[kod]}` : undefined,
                  }}
                  title={`${namnFor(kod)} ${periodText(c.period, c.kvartal)}: ${cell.varde != null ? fmt(cell.varde, dec) : "uppgift saknas"}${cell.rang != null ? `, plats ${cell.rang} av ${cell.n} kommuner (1 = högst)` : ""}${annatMatt ? ". Går inte att jämföra med kommunernas värden" : ""}`}>
                {cell.varde != null ? kort(cell.varde, dec) : "–"}{annatMatt && cell.varde != null && <sup aria-hidden>*</sup>}
              </td>
            );
          })}
        </tr>
        {harNed && arOppen && r.nedbrytningar.map((g) => (
          <Fragment key={g.grupp}>
            {flera && (
              <tr>
                <td colSpan={KOLUMNER.length + 1}
                    className="jt-sub sticky left-0 bg-white pt-2 pb-0.5 text-[12px] font-semibold text-neutral-500">
                  {versal(g.grupp)}
                </td>
              </tr>
            )}
            {(g.sortera ? sorterade(g.rader) : g.rader).map((sr) => renderRad(sr, 1))}
          </Fragment>
        ))}
      </Fragment>
    );
  };

  return (
    <div style={{ ["--farg" as string]: farg }}>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] text-neutral-600">
        <span className="inline-flex items-center gap-1.5">
          Läge bland landets 290 kommuner:
          <span className="inline-flex">
            {STEG.map((c) => <span key={c} className="w-5 h-3 border-y border-neutral-200 first:border-l last:border-r" style={{ background: c }} />)}
          </span>
          lägst 20 procent till högst 20 procent
        </span>
        <span className="text-neutral-500">Färgen visar läge, inte vad som är önskvärt. Klicka på en kommun för att välja den.</span>
      </div>

      <div className="bg-white border border-neutral-200 rounded-lg overflow-x-auto">
        <table className="w-full border-collapse">
          <caption className="sr-only">{tema.temaNamn}: Hallands kommuner, länet och riket sida vid sida</caption>
          <thead>
            <tr className="text-[11.5px] border-b-2 border-neutral-800">
              <th scope="col" className="sticky left-0 z-[1] bg-white text-left font-semibold text-neutral-800 py-2.5 pl-3 pr-3 text-[12px]">
                Indikator
              </th>
              {KOLUMNER.map((kod, i) => {
                const vald = kod === valdKod;
                const referens = kod === "0013" || kod === "0000";
                return (
                  <th key={kod} scope="col"
                      className={`text-right font-semibold py-2.5 px-2.5 whitespace-nowrap align-bottom
                                  ${i === KOMMUNER_NORR_SODER.length ? "border-l border-neutral-300" : ""}`}>
                    {kod === "0000" ? (
                      <span className="text-neutral-500">Riket</span>
                    ) : (
                      <button onClick={() => onValjEnhet(kod)} aria-pressed={vald}
                              className={`cursor-pointer inline-flex flex-col items-end gap-1 ${vald ? "text-neutral-900" : referens ? "text-neutral-500 hover:text-neutral-900" : "text-neutral-600 hover:text-neutral-900"}`}>
                        <span className="block h-[3px] w-full rounded-full" style={{ background: ENHET_FARG[kod] }} />
                        {namnFor(kod)}
                      </button>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {grupper.map((g, gi) => (
              <Fragment key={g.rubrik ?? `g${gi}`}>
                {g.rubrik && (
                  <tr>
                    <th colSpan={KOLUMNER.length + 1} scope="colgroup"
                        className={`jt-band sticky left-0 bg-white text-left ${gi === 0 ? "pt-4" : "pt-7"}`}>
                      {g.rubrik}
                    </th>
                  </tr>
                )}
                {g.rader.map((r) => renderRad(r, 0))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11.5px] leading-relaxed text-neutral-500 max-w-[80ch]">
        Kommunerna står i ordning från norr till söder, med Hylte i inlandet sist. Alla värden på en rad gäller perioden under indikatorns namn; den kan skilja mellan raderna.
        Halland och riket är vägda värden och färgas inte.
        {tema.lanEjJamforbarText ? ` * ${tema.lanEjJamforbarText}` : ""}
      </p>
    </div>
  );
}
