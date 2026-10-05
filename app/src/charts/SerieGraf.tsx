import { useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { fmtPeriod } from "../utils/format";

export interface Serie {
  id: string;
  namn: string;
  farg: string;
  /** Streckmönster för referensserier (Halland, riket), annars heldragen */
  streck?: string;
  /** Huvudserien: tjockare linje, punkt och värde vid slutet */
  huvud?: boolean;
  punkter: { ar: number; varde: number }[];
}

interface Props {
  serier: Serie[];
  width: number;
  height: number;
  fmt: (v: number) => string;
  /** Liten variant för tooltipen: inga etiketter utöver huvudseriens slutvärde, ingen pekare */
  kompakt?: boolean;
  ariaLabel?: string;
}

/** Månadsperioder (ÅÅÅÅMM) som decimalår, så att x-axeln blir jämn */
const tid = (a: number) => (a > 9999 ? Math.floor(a / 100) + ((a % 100) - 1) / 12 : a);

/**
 * Tidsserie med en eller flera linjer: huvudserien i enhetens färg, Halland och riket som
 * referenser. Etikett vid varje linjes slut (namn och värde) när de inte krockar, och en
 * pekare som visar alla seriers värden för det år man pekar på.
 */
export default function SerieGraf({ serier, width, height, fmt, kompakt, ariaLabel }: Props) {
  const [pekar, setPekar] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const tecken = kompakt ? 5.9 : 6.5; // ungefärlig teckenbredd för axeltal och etiketter

  const geo = useMemo(() => {
    const synliga = serier.filter((s) => s.punkter.length > 1);
    const huvud = synliga.find((s) => s.huvud) ?? synliga[0];
    if (!huvud) return null;
    const forsta = huvud.punkter[0].ar, sista = huvud.punkter[huvud.punkter.length - 1].ar;
    const inom = synliga.map((s) => ({ ...s, punkter: s.punkter.filter((p) => p.ar >= forsta && p.ar <= sista) }));
    const alla = inom.flatMap((s) => s.punkter.map((p) => p.varde));
    const [lo, hi] = d3.extent(alla) as [number, number];
    const pad = (hi - lo) * 0.08 || Math.abs(hi) * 0.05 || 1;
    const y = d3.scaleLinear().domain([lo - pad, hi + pad]).nice(kompakt ? 3 : 4);
    const ticks = y.ticks(kompakt ? 3 : 4);
    // Marginalerna följer de längsta texterna, så att axeltal och slutetiketter inte klipps
    const vansterText = Math.max(...ticks.map((t) => fmt(t).length));
    const hogerText = Math.max(...inom.map((s) => {
      const slut = s.punkter[s.punkter.length - 1];
      return kompakt ? (s.huvud ? fmt(slut.varde).length : 0) : fmt(slut.varde).length + s.namn.length + 1;
    }));
    const m = { t: kompakt ? 14 : 12, b: kompakt ? 18 : 24, l: 10 + vansterText * tecken, r: 14 + hogerText * tecken };
    y.range([height - m.b, m.t]);
    const x = d3.scaleLinear().domain([tid(forsta), tid(sista)]).range([m.l, width - m.r]);
    const ar = [...new Set(inom.flatMap((s) => s.punkter.map((p) => p.ar)))].sort((a, b) => a - b);
    // Slutetiketter: huvudserien först, andra bara där de inte krockar med en redan placerad
    const etiketter: { id: string; y: number; text: string; namn: string }[] = [];
    for (const s of [...inom].sort((a, b) => Number(!!b.huvud) - Number(!!a.huvud))) {
      const slut = s.punkter[s.punkter.length - 1];
      if (!slut || (kompakt && !s.huvud)) continue;
      const yy = y(slut.varde);
      if (etiketter.some((e) => Math.abs(e.y - yy) < 13)) continue;
      etiketter.push({ id: s.id, y: yy, text: fmt(slut.varde), namn: s.namn });
    }
    return { inom, huvud, x, y, ticks, m, forsta, sista, ar, etiketter };
  }, [serier, width, height, kompakt, fmt, tecken]);

  if (!geo) return null;
  const { inom, x, y, ticks, m, forsta, sista, ar, etiketter } = geo;
  const linje = d3.line<{ ar: number; varde: number }>().x((d) => x(tid(d.ar))).y((d) => y(d.varde)).curve(d3.curveMonotoneX);

  const flytta = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * width;
    const t = x.invert(px);
    let bast = ar[0];
    for (const a of ar) if (Math.abs(tid(a) - t) < Math.abs(tid(bast) - t)) bast = a;
    setPekar(bast);
  };

  const pekVarden = pekar == null ? [] : inom
    .map((s) => ({ s, p: s.punkter.find((p) => p.ar === pekar) }))
    .filter((d): d is { s: typeof d.s; p: { ar: number; varde: number } } => d.p != null);

  return (
    <div className="relative">
      <svg ref={ref} viewBox={`0 0 ${width} ${height}`} width={width} height={height}
           role="img" aria-label={ariaLabel} className="block overflow-visible">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={width - m.r} y1={y(t)} y2={y(t)} stroke="#EEF0F2" />
            <text x={m.l - 6} y={y(t) + 3.5} textAnchor="end" fontSize={kompakt ? 10 : 11} fill="#83888A">{fmt(t)}</text>
          </g>
        ))}
        <text x={m.l} y={height - (kompakt ? 3 : 6)} fontSize={kompakt ? 10 : 11} fill="#83888A">{fmtPeriod(forsta)}</text>
        <text x={width - m.r} y={height - (kompakt ? 3 : 6)} textAnchor="end" fontSize={kompakt ? 10 : 11} fill="#83888A">{fmtPeriod(sista)}</text>

        {inom.filter((s) => !s.huvud).map((s) => (
          <path key={s.id} d={linje(s.punkter) ?? ""} fill="none" stroke={s.farg}
                strokeWidth={kompakt ? 1.2 : 1.6} strokeDasharray={s.streck} strokeLinecap="round" />
        ))}
        {/* Med få punkter (t.ex. samma månad varje år) syns varje värde som en punkt */}
        {!kompakt && inom.map((s) => s.punkter.length <= 15 && s.punkter.slice(0, -1).map((p) => (
          <circle key={`${s.id}-${p.ar}`} cx={x(tid(p.ar))} cy={y(p.varde)} r={s.huvud ? 3 : 2.2}
                  fill={s.huvud ? s.farg : "#fff"} stroke={s.farg} strokeWidth={s.huvud ? 1.5 : 1.2} />
        )))}
        {inom.filter((s) => s.huvud).map((s) => {
          const slut = s.punkter[s.punkter.length - 1];
          return (
            <g key={s.id}>
              <path d={linje(s.punkter) ?? ""} fill="none" stroke={s.farg} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={x(tid(slut.ar))} cy={y(slut.varde)} r={4} fill={s.farg} stroke="#fff" strokeWidth={2} />
            </g>
          );
        })}

        {etiketter.map((e) => {
          const s = inom.find((v) => v.id === e.id)!;
          const xe = x(tid(s.punkter[s.punkter.length - 1].ar)) + 8;
          return kompakt ? (
            <text key={e.id} x={xe - 2} y={e.y + 4} fontSize={11} fontWeight={700} fill="#2D2E2D">{e.text}</text>
          ) : (
            <text key={e.id} x={xe} y={e.y + 4} fontSize={11.5} fill="#2D2E2D">
              <tspan fontWeight={s.huvud ? 700 : 500}>{e.text}</tspan>
              <tspan fill="#5B5B5B"> {e.namn}</tspan>
            </text>
          );
        })}

        {!kompakt && pekar != null && (
          <line x1={x(tid(pekar))} x2={x(tid(pekar))} y1={m.t} y2={height - m.b} stroke="#83888A" strokeWidth={1} />
        )}
        {!kompakt && pekVarden.map(({ s, p }) => (
          <circle key={s.id} cx={x(tid(p.ar))} cy={y(p.varde)} r={3.5} fill={s.farg} stroke="#fff" strokeWidth={1.5} />
        ))}
        {!kompakt && (
          <rect x={m.l} y={m.t} width={Math.max(0, width - m.l - m.r)} height={Math.max(0, height - m.t - m.b)}
                fill="transparent" onPointerMove={flytta} onPointerLeave={() => setPekar(null)} />
        )}
      </svg>
      {!kompakt && pekar != null && pekVarden.length > 0 && (
        <div className="sg-tip" style={{ left: Math.min(x(tid(pekar)) + 10, width - 150), top: m.t }}>
          <div className="sg-tip-ar">{fmtPeriod(pekar)}</div>
          {pekVarden.map(({ s, p }) => (
            <div key={s.id} className="sg-tip-rad">
              <svg width={14} height={6} aria-hidden>
                <line x1={0} x2={14} y1={3} y2={3} stroke={s.farg} strokeWidth={2} strokeDasharray={s.streck} />
              </svg>
              <b>{fmt(p.varde)}</b> <span>{s.namn}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
