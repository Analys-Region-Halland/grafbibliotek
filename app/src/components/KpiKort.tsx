import { memo, useMemo, useRef, useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import type { KpiRow } from "../types";
import { fmt, fmtPeriod, kpiDecimaler } from "../utils/format";
import Sparkline from "../charts/Sparkline";

interface Props {
  kortNamn: string;
  beskrivning?: string;
  enhet: string;
  data: KpiRow[];
  /** Hallands (länets) serie för samma KPI — visas som jämförelse när en kommun är vald */
  hallandData?: KpiRow[];
  /** Temats medelfärg (hex) för sparklinens slutpunkt */
  accent: string;
  hasExpand?: boolean;
  isExpanded?: boolean;
  antalNedbrytningar?: number;
  onToggleExpand?: () => void;
  animDelay?: number;
  onClick: () => void;
  compact?: boolean;
  /** Lågt värde är önskvärt (påverkar bara förklaringstexten för rangplatsen) */
  lagtArBra?: boolean;
}

type Tip = "beskrivning" | "ki" | "ej_jamforbar" | "rang";

function signerat(v: number | null | undefined, dec: number): string {
  if (v == null || isNaN(v)) return "–";
  if (v === 0) return "±0";
  return v > 0 ? `+${fmt(v, dec)}` : `−${fmt(Math.abs(v), dec)}`;
}

/** Liten jämförelsecell: etikett ovanför värde */
function Cell({ etikett, varde, dampad }: { etikett: string; varde: string; dampad?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[10.5px] text-neutral-500 leading-tight truncate">{etikett}</p>
      <p className={`font-data text-[12.5px] font-medium tabular-nums leading-snug truncate ${
        dampad ? "text-neutral-400" : "text-neutral-800"}`}>
        {varde}
      </p>
    </div>
  );
}

/** Rangposition som prick på en linje: vänster = högsta värdet, höger = lägsta */
function RangLinje({ rang, n }: { rang: number; n: number }) {
  const x = n > 1 ? ((rang - 1) / (n - 1)) * 100 : 0;
  return (
    <div className="relative h-[7px] w-[64px]" aria-hidden>
      <div className="absolute top-[3px] left-0 right-0 h-px bg-neutral-300" />
      <div className="absolute top-[3px] left-1/2 w-px h-[3px] -translate-y-px bg-neutral-300" />
      <div className="absolute top-0 w-[7px] h-[7px] rounded-full bg-neutral-800 ring-2 ring-white -translate-x-1/2"
           style={{ left: `${x}%` }} />
    </div>
  );
}

function TipRuta({ x, y, rubrik, children }: { x: number; y: number; rubrik: string; children: React.ReactNode }) {
  return createPortal(
    <div
      className="fixed z-[9999] w-[300px] max-w-[90vw] bg-neutral-800 text-neutral-100 text-[12px]
                 leading-relaxed px-4 py-3 rounded-lg shadow-2xl pointer-events-none"
      style={{ left: Math.max(8, Math.min(x, window.innerWidth - 316)), top: y }}
    >
      <p className="text-neutral-400 text-[10.5px] font-semibold mb-1">{rubrik}</p>
      <div className="text-neutral-200">{children}</div>
    </div>,
    document.body,
  );
}

function KpiKortInner({
  kortNamn, beskrivning, enhet, data, hallandData, accent,
  hasExpand, isExpanded, antalNedbrytningar, onToggleExpand,
  animDelay = 0, onClick, compact, lagtArBra,
}: Props) {
  // Mät sparklinens bredd
  const sparkRef = useRef<HTMLDivElement>(null);
  const [bredd, setBredd] = useState(0);
  useEffect(() => {
    if (!sparkRef.current) return;
    const obs = new ResizeObserver((e) => {
      const w = e[0]?.contentRect.width ?? 0;
      if (w > 0) setBredd(Math.floor(w));
    });
    obs.observe(sparkRef.current);
    return () => obs.disconnect();
  }, []);

  // Tooltips via portal
  const [tip, setTip] = useState<{ typ: Tip; x: number; y: number } | null>(null);
  const timer = useRef<number>(0);
  const visaTip = useCallback((typ: Tip) => (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    timer.current = window.setTimeout(() => setTip({ typ, x: r.left, y: r.bottom + 8 }), 250);
  }, []);
  const doljTip = useCallback(() => { clearTimeout(timer.current); setTip(null); }, []);

  const sorted = useMemo(() =>
    [...data].filter((d) => d.varde != null).sort((a, b) => b.ar - a.ar),
  [data]);
  const senaste = sorted[0] ?? null;
  const hallandVarde = useMemo(() => {
    if (!hallandData || !senaste) return null;
    return hallandData.find((d) => d.ar === senaste.ar)?.varde ?? null;
  }, [hallandData, senaste]);

  if (!senaste) return null;

  const dec = kpiDecimaler(senaste.varde, enhet);
  const isAntal = enhet === "antal";
  const monthly = senaste.ar > 9999;

  const harKI = senaste.ki_lower != null && senaste.ki_upper != null;
  const rang = senaste.rang_total;
  const nEnheter = senaste.antal_kommuner ?? 290;
  const arRegion = nEnheter <= 21;

  // Jämförelseceller
  const celler: { etikett: string; varde: string; dampad?: boolean }[] = [];
  if (!isAntal && senaste.riksvarde != null) celler.push({ etikett: "Riket", varde: fmt(senaste.riksvarde, dec) });
  if (!isAntal && hallandVarde != null) celler.push({ etikett: "Halland", varde: fmt(hallandVarde, dec) });
  celler.push({ etikett: monthly ? "1 år" : "1 år", varde: signerat(senaste.trend_1ar, dec), dampad: senaste.trend_1ar == null });
  if (!monthly) {
    celler.push({ etikett: "5 år", varde: signerat(senaste.trend_5ar, dec), dampad: senaste.trend_5ar == null });
    if (celler.length < 4) celler.push({ etikett: "10 år", varde: signerat(senaste.trend_10ar, dec), dampad: senaste.trend_10ar == null });
  }
  const synligaCeller = compact ? celler.slice(0, 3) : celler.slice(0, 4);
  const trendEnhet = enhet === "procent" ? "procentenheter" : enhet;

  return (
    <div
      className={`${compact ? "sub-card-drop" : "card-enter flex-1"} group/card relative bg-white rounded-lg
                  border border-neutral-200 hover:border-neutral-300
                  hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-[border-color,box-shadow] duration-200
                  flex flex-col ${compact ? "border-l-2" : ""}`}
      style={{ animationDelay: `${animDelay}ms`, ...(compact ? { borderLeftColor: accent } : {}) }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={`${kortNamn}: visa graf och karta`}
        className={`cursor-pointer flex-1 rounded-lg flex flex-col
                    focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gron-2
                    ${compact ? "px-3.5 pt-3 pb-3" : "px-4 sm:px-5 pt-4 pb-4"}`}
        onClick={onClick}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      >
        {/* Rubrik + period */}
        <div className="flex items-start justify-between gap-3">
          <div className={`min-w-0 ${compact ? "" : "min-h-[58px]"}`}>
            <h3
              className={`font-medium text-neutral-900 leading-snug line-clamp-2
                          ${compact ? "text-[12.5px]" : "text-[14px]"}
                          ${beskrivning ? "cursor-help" : ""}`}
              onMouseEnter={beskrivning ? visaTip("beskrivning") : undefined}
              onMouseLeave={beskrivning ? doljTip : undefined}
            >
              {kortNamn}
            </h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              {harKI ? "enkätdata" : enhet} · {fmtPeriod(senaste.ar)}
            </p>
          </div>
          <svg className="shrink-0 mt-0.5 text-neutral-300 group-hover/card:text-neutral-700 transition-colors"
               width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M7 17L17 7" /><path d="M8 7h9v9" />
          </svg>
        </div>

        {/* Värde + rangplats */}
        <div className={`flex items-end justify-between gap-3 ${compact ? "mt-2" : "mt-3"}`}>
          <div className="min-w-0">
            <p className={`font-semibold text-neutral-900 tracking-tight leading-none
                           ${compact ? "text-[21px]" : "text-[28px]"}`}>
              {fmt(senaste.varde, dec)}
            </p>
            {harKI && (
              <p className="text-[10.5px] text-neutral-500 mt-1 cursor-help"
                 onMouseEnter={visaTip("ki")} onMouseLeave={doljTip}>
                95 % KI {fmt(senaste.ki_lower!, dec)}–{fmt(senaste.ki_upper!, dec)}
              </p>
            )}
          </div>
          {rang != null && nEnheter > 1 && (
            <div className="shrink-0 flex flex-col items-end gap-1 cursor-help"
                 onMouseEnter={visaTip("rang")} onMouseLeave={doljTip}>
              <p className="text-[11.5px] text-neutral-600 leading-none">
                Plats <span className="font-semibold text-neutral-900">{rang}</span> av {nEnheter}
              </p>
              <RangLinje rang={rang} n={nEnheter} />
            </div>
          )}
          {rang != null && nEnheter <= 1 && (
            <p className="shrink-0 text-[11px] text-neutral-400 cursor-help"
               onMouseEnter={visaTip("ej_jamforbar")} onMouseLeave={doljTip}>
              Ej rangordnad
            </p>
          )}
        </div>

        {/* Utfyllnad så att sparkline och jämförelser linjerar i en rad med olika höga kort */}
        <div className="flex-1" />

        {/* Sparkline med riket som referens */}
        <div ref={sparkRef} className={compact ? "mt-2.5" : "mt-3.5"}>
          {bredd > 0 && (
            <Sparkline data={data} mode="value" enhet={enhet} width={bredd}
                       height={compact ? 34 : 46} accent={accent} visaRiket={!isAntal} />
          )}
        </div>

        {/* Jämförelser */}
        <div className={`grid gap-x-3 border-t border-neutral-100 ${compact ? "mt-2 pt-2" : "mt-3 pt-3"}`}
             style={{ gridTemplateColumns: `repeat(${compact ? 3 : 4}, minmax(0, 1fr))` }}
             title={`Förändring i ${trendEnhet}`}>
          {synligaCeller.map((c) => <Cell key={c.etikett} {...c} />)}
        </div>
      </div>

      {/* Nedbrytningar — bara när de finns; annars lika hög tom list så att korten i en rad linjerar */}
      {!compact && !hasExpand && <div className="h-[35px] border-t border-transparent" aria-hidden />}
      {!compact && hasExpand && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleExpand?.(); }}
          aria-expanded={isExpanded}
          className="flex items-center gap-1.5 px-4 sm:px-5 py-2 border-t border-neutral-100
                     text-[11.5px] font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50
                     rounded-b-lg cursor-pointer transition-colors
                     focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-gron-2"
        >
          {isExpanded ? "Dölj" : "Visa"} nedbrytningar{antalNedbrytningar ? ` (${antalNedbrytningar})` : ""}
          <svg className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
               viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"
               strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M2.5 4.5L6 8L9.5 4.5" />
          </svg>
        </button>
      )}

      {tip?.typ === "beskrivning" && beskrivning && (
        <TipRuta x={tip.x} y={tip.y} rubrik="Beskrivning">{beskrivning}</TipRuta>
      )}
      {tip?.typ === "rang" && rang != null && (
        <TipRuta x={tip.x} y={tip.y} rubrik="Rangplats">
          Plats {rang} av {nEnheter} {arRegion ? "regioner" : "kommuner"} {fmtPeriod(senaste.ar)}, där plats 1
          har det högsta värdet. Punkten visar läget på skalan från högst (vänster) till lägst (höger).
          {lagtArBra ? " För den här indikatorn är ett lågt värde önskvärt." : ""}
        </TipRuta>
      )}
      {tip?.typ === "ki" && (
        <TipRuta x={tip.x} y={tip.y} rubrik="Om konfidensintervall">
          Uppgifterna bygger på en urvalsundersökning och redovisas med 95-procentigt
          konfidensintervall: det verkliga värdet ligger med stor sannolikhet inom intervallet.
          Bredare intervall betyder större osäkerhet, ofta på grund av färre svarande. Data
          redovisas som fyraårsmedelvärden. Källa: Folkhälsomyndigheten, Nationella folkhälsoenkäten.
        </TipRuta>
      )}
      {tip?.typ === "ej_jamforbar" && (
        <TipRuta x={tip.x} y={tip.y} rubrik="Rangplats saknas">
          Indikatorn är beräknad utifrån data som bara finns för den valda enheten och kan därför
          inte rangordnas mot andra kommuner eller regioner.
        </TipRuta>
      )}
    </div>
  );
}

const KpiKort = memo(KpiKortInner);
export default KpiKort;
