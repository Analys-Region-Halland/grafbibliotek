import { useState } from "react";
import * as d3 from "d3";
import { fmtPeriod } from "../utils/format";

export interface Del {
  id: string;
  namn: string;
  farg: string;
  varden: Map<number, number>;
}

interface Props {
  ar: number[];
  delar: Del[];
  /** Totalen som punkt per år, t.ex. befolkningsförändringen */
  summa?: { namn: string; varden: Map<number, number> };
  fmt: (v: number) => string;
  width: number;
  height: number;
}

/**
 * Staplade staplar per år över och under noll: hur en förändring delar upp sig på sina
 * komponenter (födelsenetto, inrikes och utrikes flyttnetto). Totalen som punkt.
 * Pekaren visar årets alla delar och totalen.
 */
export default function Delar({ ar, delar, summa, fmt, width, height }: Props) {
  const [pekar, setPekar] = useState<number | null>(null);
  const m = { t: 10, r: 8, b: 22, l: 50 };
  const staplar = ar.map((a) => {
    let upp = 0, ned = 0;
    const seg = delar.map((d) => {
      const v = d.varden.get(a) ?? 0;
      const fran = v >= 0 ? upp : ned;
      if (v >= 0) upp += v; else ned += v;
      return { d, v, fran, till: fran + v };
    });
    return { ar: a, seg, upp, ned, summa: summa?.varden.get(a) ?? null };
  });
  const lo = Math.min(0, ...staplar.map((s) => s.ned), ...staplar.map((s) => s.summa ?? 0));
  const hi = Math.max(0, ...staplar.map((s) => s.upp), ...staplar.map((s) => s.summa ?? 0));
  const y = d3.scaleLinear().domain([lo, hi]).range([height - m.b, m.t]).nice(4);
  const x = d3.scaleBand<number>().domain(ar).range([m.l, width - m.r]).paddingInner(0.35);
  const bredd = Math.min(24, x.bandwidth());
  const ticks = y.ticks(4);
  const visaAr = (i: number) => ar.length <= 10 || i % 2 === ar.length % 2 || i === ar.length - 1;
  const vald = staplar.find((s) => s.ar === pekar);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" className="block"
           aria-label={staplar.map((s) => `${fmtPeriod(s.ar)}: ${s.seg.map((g) => `${g.d.namn} ${fmt(g.v)}`).join(", ")}${s.summa != null ? `, ${summa?.namn} ${fmt(s.summa)}` : ""}`).join("; ")}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={width - m.r} y1={y(t)} y2={y(t)} stroke={t === 0 ? "#83888A" : "#EEF0F2"} />
            <text x={m.l - 6} y={y(t) + 3.5} textAnchor="end" fontSize={11} fill="#83888A">{fmt(t)}</text>
          </g>
        ))}
        {staplar.map((s, i) => {
          const cx = (x(s.ar) ?? 0) + x.bandwidth() / 2;
          return (
            <g key={s.ar} opacity={pekar == null || pekar === s.ar ? 1 : 0.55}>
              {s.seg.filter((g) => g.v !== 0).map((g) => (
                <rect key={g.d.id} x={cx - bredd / 2} width={bredd}
                      y={y(Math.max(g.fran, g.till))} height={Math.max(0, Math.abs(y(g.fran) - y(g.till)))}
                      fill={g.d.farg} stroke="#fff" strokeWidth={1} />
              ))}
              {s.summa != null && (
                <circle cx={cx} cy={y(s.summa)} r={4} fill="#2D2E2D" stroke="#fff" strokeWidth={2} />
              )}
              {visaAr(i) && (
                <text x={cx} y={height - 6} textAnchor="middle" fontSize={11} fill="#83888A">{fmtPeriod(s.ar)}</text>
              )}
              <rect x={x(s.ar)} width={x.bandwidth()} y={m.t} height={height - m.t - m.b} fill="transparent"
                    onPointerEnter={() => setPekar(s.ar)} onPointerLeave={() => setPekar(null)} />
            </g>
          );
        })}
      </svg>
      {vald && (
        <div className="sg-tip" style={{ left: Math.min((x(vald.ar) ?? 0) + x.bandwidth(), width - 190), top: m.t }}>
          <div className="sg-tip-ar">{fmtPeriod(vald.ar)}</div>
          {vald.summa != null && summa && (
            <div className="sg-tip-rad">
              <svg width={14} height={8} aria-hidden><circle cx={7} cy={4} r={3.5} fill="#2D2E2D" /></svg>
              <b>{fmt(vald.summa)}</b> <span>{summa.namn}</span>
            </div>
          )}
          {vald.seg.map((g) => (
            <div key={g.d.id} className="sg-tip-rad">
              <svg width={14} height={8} aria-hidden><rect y={1} width={14} height={6} fill={g.d.farg} /></svg>
              <b>{fmt(g.v)}</b> <span>{g.d.namn}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
