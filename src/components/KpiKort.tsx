import { memo, useMemo, useRef, useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import type { KpiRow } from "../types";
import { fmt, fmtInt, fmtPeriod } from "../utils/format";
import Sparkline from "../charts/Sparkline";

interface Props {
  kortNamn: string;
  beskrivning?: string;
  enhet: string;
  data: KpiRow[];
  dotColor: string;
  hasExpand?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  animDelay?: number;
  onClick: () => void;
  compact?: boolean;
}

function fmtTrend(v: number | null, dec: number): string | null {
  if (v == null) return null;
  return v > 0 ? `+${fmt(v, dec)}` : fmt(v, dec);
}
function trendCls(v: number | null): string {
  if (v == null) return "text-neutral-500";
  return v > 0 ? "text-emerald-700" : v < 0 ? "text-rose-700" : "text-neutral-600";
}

/** Trendrad — definierad utanför komponenten så den inte återskapas */
function TrendRow({ label, value, d }: { label: string; value: number | null; d: number }) {
  const s = fmtTrend(value, d);
  if (!s) return null;
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="font-data text-[11px] text-neutral-500">{label}</span>
      <span className={`font-data text-[12px] font-semibold tabular-nums ${trendCls(value)}`}>
        {s}
      </span>
    </div>
  );
}

function KpiKortInner({
  kortNamn, beskrivning, enhet, data, dotColor,
  hasExpand, isExpanded, onToggleExpand,
  animDelay = 0, onClick, compact,
}: Props) {
  // Mät sparkline-containerbredd
  const sparkRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  useEffect(() => {
    if (!sparkRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w > 0) setContainerWidth(Math.floor(w));
    });
    obs.observe(sparkRef.current);
    return () => obs.disconnect();
  }, []);

  // Tooltip via portal — undviker overflow-hidden
  const [showTip, setShowTip] = useState(false);
  const [tipPos, setTipPos] = useState({ x: 0, y: 0 });
  const tipTrigger = useRef<HTMLDivElement>(null);
  const tipTimer = useRef<number>(0);
  const onTipEnter = useCallback(() => {
    tipTimer.current = window.setTimeout(() => {
      if (tipTrigger.current) {
        const r = tipTrigger.current.getBoundingClientRect();
        setTipPos({ x: r.left, y: r.top - 8 });
      }
      setShowTip(true);
    }, 300);
  }, []);
  const onTipLeave = useCallback(() => {
    clearTimeout(tipTimer.current);
    setShowTip(false);
  }, []);

  const sorted = useMemo(() =>
    [...data].filter((d) => d.varde != null).sort((a, b) => b.ar - a.ar),
  [data]);
  const senaste = sorted[0] ?? null;
  const forega = sorted[1] ?? null;
  const forsta = sorted[sorted.length - 1] ?? null;

  if (!senaste) return null;

  // Decimaler: 0 för antal, annars 1 (eller 2 för små procent)
  const isAntal = enhet === "antal";
  const dec = isAntal ? 0 : (senaste.varde != null && Math.abs(senaste.varde) < 10 ? 2 : 1);
  const trendDec = isAntal ? 0 : 1;
  const vardeStr = isAntal ? fmtInt(senaste.varde) : fmt(senaste.varde, dec);

  // Trender
  const t1 = senaste.varde != null && forega?.varde != null
    ? senaste.varde - forega.varde : null;
  const t5 = senaste.trend_5ar;
  const tTotal = senaste.varde != null && forsta?.varde != null && forsta.ar !== senaste.ar
    ? senaste.varde - forsta.varde : null;
  const totalLabel = forsta && forsta.ar !== senaste.ar
    ? `${fmtPeriod(forsta.ar)}–${fmtPeriod(senaste.ar)}` : null;

  // Ranking
  const rang = senaste.rang_total;
  const nKommuner = senaste.antal_kommuner ?? 290;
  const rangPct = rang != null ? rang / nKommuner : null;
  const rangColor = rangPct != null
    ? rangPct <= 0.25 ? "text-emerald-700"
    : rangPct >= 0.75 ? "text-rose-700"
    : "text-neutral-700"
    : "text-neutral-500";

  // Storlekar
  const valueSize = compact ? "text-[19px]" : "text-[24px]";
  const sparkH = compact ? 48 : 72;
  const gap = 8;
  const halfWidth = containerWidth > 0 ? Math.floor((containerWidth - gap) / 2) : 0;
  const cardAnim = compact ? "sub-card-drop" : "card-enter";

  return (
    <div
      className={`${cardAnim} bg-white rounded-xl border border-neutral-200/70 relative
                 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]
                 transition-all duration-200
                 ${compact ? "border-l-[3px]" : ""}`}
      style={{
        animationDelay: `${animDelay}ms`,
        ...(compact ? { borderLeftColor: "var(--sub-accent)" } : {}),
      }}
    >
      {/* Klickbar kortyta — öppnar graf/karta */}
      <div
        className={`cursor-pointer group/card ${compact ? "px-3.5 pt-3 pb-3" : "px-5 pt-4 pb-4"}`}
        onClick={onClick}
      >
        {/* Rad 1: Rubrik + "Visa graf" */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div
            ref={tipTrigger}
            className="min-w-0"
            onMouseEnter={beskrivning ? onTipEnter : undefined}
            onMouseLeave={beskrivning ? onTipLeave : undefined}
          >
            <div className="flex items-start gap-2">
              {!compact && (
                <div className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0 mt-[5px]`} />
              )}
              <h3
                className={`font-data font-medium text-neutral-900 leading-snug
                           ${compact ? "text-[11.5px] min-h-[2.75em]" : "text-[13px] min-h-[2.75em]"}
                           ${beskrivning ? "decoration-neutral-300 decoration-dotted underline underline-offset-2" : ""}`}
              >
                {kortNamn}
              </h3>
            </div>
          </div>

          {/* Visa graf & karta — poppar fram vid hover */}
          <div className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-md
                           opacity-0 translate-x-1 group-hover/card:opacity-100 group-hover/card:translate-x-0
                           transition-all duration-200
                           bg-neutral-900 text-white shadow-sm">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <span className="font-data text-[9px] font-medium whitespace-nowrap">Graf & karta</span>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
                <path d="M7 17L17 7" />
                <path d="M7 7h10v10" />
              </svg>
            </div>
        </div>

        {/* Rad 2: Värde+ranking vänster, trender höger */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className={`font-data ${valueSize} font-bold text-neutral-900 tracking-tight leading-none block`}>
              {vardeStr}
            </span>
            {rang != null && (
              <span className={`font-data text-[11.5px] font-semibold ${rangColor} block mt-1`}>
                Plats {rang} <span className="text-neutral-500 font-normal">av {nKommuner}</span>
              </span>
            )}
            <span className="font-data text-[10.5px] text-neutral-600 block mt-0.5">
              {enhet} · {fmtPeriod(senaste.ar)}
            </span>
          </div>

          <div className="min-w-[85px] pt-0.5 border-l border-neutral-100 pl-3">
            <p className="font-data text-[10px] text-neutral-500 mb-1 font-medium">Förändring</p>
            <div className="space-y-1">
              <TrendRow label="1 år" value={t1} d={trendDec} />
              <TrendRow label="5 år" value={t5} d={trendDec} />
              {totalLabel && <TrendRow label={totalLabel} value={tTotal} d={trendDec} />}
            </div>
          </div>
        </div>

        {/* Sparklines — sida vid sida, pushade till botten */}
        <div ref={sparkRef} className="flex gap-2 mt-3.5">
          <div className="flex-1 min-w-0">
            <p className="font-data text-[10px] text-neutral-500 mb-0.5">Utveckling</p>
            {halfWidth > 0 && (
              <Sparkline data={data} mode="value" enhet={enhet} width={halfWidth} height={sparkH} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-data text-[10px] text-neutral-500 mb-0.5">Ranking</p>
            {halfWidth > 0 && (
              <Sparkline data={data} mode="rank" width={halfWidth} height={sparkH} />
            )}
          </div>
        </div>
      </div>

      {/* Nederkant: alltid en list — klickbar om expand finns, annars dämpad */}
      {!compact && (
        hasExpand ? (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleExpand?.(); }}
            className="w-full flex items-center justify-center gap-2 py-2
                       border-t border-neutral-100 cursor-pointer
                       hover:bg-neutral-50 transition-colors"
          >
            <span className="font-data text-[10.5px] text-neutral-500 font-medium">
              {isExpanded ? "Dölj nedbrytningar" : "Visa nedbrytningar"}
            </span>
            <svg
              className={`w-3 h-3 text-neutral-400 transition-transform duration-200
                         ${isExpanded ? "rotate-180" : ""}`}
              viewBox="0 0 12 12" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M2.5 4.5L6 8L9.5 4.5" />
            </svg>
          </button>
        ) : (
          <div className="w-full py-2 border-t border-neutral-100">
            <span className="font-data text-[10.5px] text-neutral-200 block text-center select-none">
              Inga nedbrytningar
            </span>
          </div>
        )
      )}

      {/* Tooltip via portal — renderas utanför overflow-hidden */}
      {beskrivning && showTip && createPortal(
        <div
          className="fixed z-[9999] w-[300px] max-w-[90vw]
                     bg-neutral-800 text-neutral-100 font-data text-[11.5px] leading-relaxed
                     px-4 py-3 rounded-lg shadow-2xl pointer-events-none"
          style={{
            left: Math.min(tipPos.x, window.innerWidth - 320),
            top: tipPos.y,
            transform: "translateY(-100%)",
          }}
        >
          <p className="text-neutral-400 text-[10px] font-semibold mb-1.5">Beskrivning</p>
          <p className="text-neutral-200">{beskrivning}</p>
          <div
            className="absolute left-4 top-full w-0 h-0
                       border-l-[6px] border-l-transparent
                       border-r-[6px] border-r-transparent
                       border-t-[6px] border-t-neutral-800"
          />
        </div>,
        document.body,
      )}
    </div>
  );
}

const KpiKort = memo(KpiKortInner);
export default KpiKort;
