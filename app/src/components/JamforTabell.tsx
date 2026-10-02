import { Fragment, useMemo, useState } from "react";
import type { KpiMeta } from "../types";
import { ENHET_FARG, HALLAND_KOMMUNER, KOMMUNER_NORR_SODER } from "../types";
import type { TemaConfig } from "../teman/tema-config";
import type { KpiIndex } from "../utils/kpiStats";
import { byggGrupper } from "../utils/temaRader";
import type { TabellRad } from "../utils/temaRader";
import { fmtPeriod, kpiDecimaler } from "../utils/format";
import { fmt as fmtBas } from "../utils/format";

/** Typografiskt minustecken i tabellerna */
const fmt = (v: number | null | undefined, dec: number) => fmtBas(v, dec).replace(/^-/, "−");

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

const KOLUMNER = [...KOMMUNER_NORR_SODER, "0013", "0000"];
const namnFor = (kod: string) =>
  kod === "0000" ? "Riket" : HALLAND_KOMMUNER.find((k) => k.kod === kod)?.namn ?? kod;

interface Cell { varde: number | null; percentil: number | null; rang: number | null; n: number }

function cellerFor(idx: KpiIndex, kpiId: string) {
  const perEnhet = idx.get(kpiId);
  if (!perEnhet) return null;
  // Gemensam period: senaste år där Halland (länet) har värde, annars senaste bland kommunerna
  const senaste = (kod: string) => {
    const rows = perEnhet.get(kod)?.filter((r) => r.varde != null);
    return rows && rows.length ? rows[rows.length - 1].ar : null;
  };
  const p = senaste("0013") ?? Math.max(...KOMMUNER_NORR_SODER.map((k) => senaste(k) ?? -Infinity));
  if (!isFinite(p)) return null;
  const vid = (kod: string) => perEnhet.get(kod)?.find((r) => r.ar === p)?.varde ?? null;
  const kommunVarden: number[] = [];
  for (const [kod, rows] of perEnhet) {
    if (kod === "0000" || rows[0]?.kommun_typ !== "K") continue;
    const v = vid(kod);
    if (v != null) kommunVarden.push(v);
  }
  const n = kommunVarden.length;
  const celler = new Map<string, Cell>();
  for (const kod of KOLUMNER) {
    const v = vid(kod);
    const arKommun = KOMMUNER_NORR_SODER.includes(kod);
    celler.set(kod, {
      varde: v,
      percentil: v != null && arKommun && n > 1 ? kommunVarden.filter((x) => x < v).length / (n - 1) : null,
      rang: v != null && arKommun && n > 1 ? kommunVarden.filter((x) => x > v).length + 1 : null,
      n,
    });
  }
  return { period: p, celler };
}

export default function JamforTabell({ tema, meta, idx, valdKod, onOpenKpi, onValjEnhet }: Props) {
  const grupper = useMemo(() => byggGrupper(tema, meta, idx), [tema, meta, idx]);
  const [oppna, setOppna] = useState<Set<string>>(new Set());
  const vaxla = (id: string) => setOppna((prev) => {
    const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n;
  });

  const renderRad = (r: TabellRad, niva: 0 | 1) => {
    const c = cellerFor(idx, r.kpiId);
    if (!c) return null;
    const ref = c.celler.get("0013")?.varde ?? c.celler.get(valdKod)?.varde ?? null;
    const dec = kpiDecimaler(ref, r.enhet);
    const harNed = niva === 0 && r.nedbrytningar.length > 0;
    const arOppen = oppna.has(r.kpiId);
    return (
      <Fragment key={r.kpiId}>
        <tr className={`border-t border-neutral-100 hover:bg-neutral-50/60 ${niva ? "bg-neutral-50/40" : ""}`}>
          <th scope="row" className={`sticky left-0 z-[1] bg-white text-left font-normal py-2 pr-3 align-middle min-w-[220px] max-w-[300px] ${niva ? "pl-7" : "pl-1"}`}>
            <div className="flex items-start gap-1.5">
              {harNed ? (
                <button onClick={() => vaxla(r.kpiId)} aria-expanded={arOppen}
                        aria-label={`${arOppen ? "Dölj" : "Visa"} nedbrytningar av ${r.namn}`}
                        className="mt-[3px] w-4 h-4 shrink-0 flex items-center justify-center rounded text-neutral-500 hover:bg-neutral-200 cursor-pointer">
                  <svg width="9" height="9" viewBox="0 0 12 12" className={`transition-transform ${arOppen ? "rotate-90" : ""}`}
                       fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden><path d="M4 2l4 4-4 4" /></svg>
                </button>
              ) : <span className="w-4 shrink-0" />}
              <div className="min-w-0">
                <button onClick={() => onOpenKpi(r.kpiId)} title={r.beskrivning}
                        className={`text-left cursor-pointer hover:underline underline-offset-2 decoration-neutral-300
                                    ${niva ? "text-[12.5px] text-neutral-700" : "text-[13.5px] font-medium text-neutral-900"}`}>
                  {r.namn}
                </button>
                <p className="text-[11px] text-neutral-500 leading-tight mt-0.5">
                  {r.enhet} · {fmtPeriod(c.period)}
                </p>
              </div>
            </div>
          </th>
          {KOLUMNER.map((kod, i) => {
            const cell = c.celler.get(kod)!;
            const vald = kod === valdKod;
            const referens = kod === "0013" || kod === "0000";
            return (
              <td key={kod}
                  className={`py-2 px-2.5 text-right align-middle tabular-nums whitespace-nowrap text-[13px]
                              ${i === KOMMUNER_NORR_SODER.length ? "border-l border-neutral-300" : ""}
                              ${referens ? "text-neutral-600" : "text-neutral-900"} ${vald ? "font-semibold" : ""}`}
                  style={{
                    background: cell.percentil != null ? stegFor(cell.percentil) : undefined,
                    boxShadow: vald ? `inset 0 0 0 1.5px ${ENHET_FARG[kod]}` : undefined,
                  }}
                  title={cell.rang != null ? `${namnFor(kod)}: plats ${cell.rang} av ${cell.n} kommuner (1 = högst)` : namnFor(kod)}>
                {cell.varde != null ? fmt(cell.varde, dec) : "–"}
              </td>
            );
          })}
        </tr>
        {harNed && arOppen && r.nedbrytningar.map((g) => (
          <Fragment key={g.grupp}>
            <tr className="bg-neutral-50/40">
              <td colSpan={KOLUMNER.length + 1}
                  className="sticky left-0 pl-7 pt-2 pb-0.5 text-[10.5px] font-semibold tracking-wide uppercase text-neutral-500">
                {g.grupp}
              </td>
            </tr>
            {g.rader.map((sr) => renderRad(sr, 1))}
          </Fragment>
        ))}
      </Fragment>
    );
  };

  return (
    <div>
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
            <tr className="text-[11.5px] border-b border-neutral-300">
              <th scope="col" className="sticky left-0 z-[1] bg-white text-left font-semibold text-neutral-500 py-2.5 pl-6 pr-3">Indikator</th>
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
                        className={`sticky left-0 text-left pl-6 pb-1.5 ${gi === 0 ? "pt-3" : "pt-6"} text-[11.5px] font-semibold tracking-[0.06em] uppercase text-neutral-500`}>
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
        Kommunerna står i ordning från norr till söder, med Hylte i inlandet sist. Alla värden gäller samma period per rad.
        Halland och riket är vägda värden och färgas inte.
      </p>
    </div>
  );
}
