import { createPortal } from "react-dom";
import * as d3 from "d3";
import type { KpiRow } from "../types";
import { ENHET_FARG } from "../types";
import type { KpiSammanfattning } from "../utils/kpiStats";
import { fmtPeriod } from "../utils/format";

interface Props {
  temaNamn: string;
  farg: string;
  namn: string;
  enhet: string;
  beskrivning: string;
  s: KpiSammanfattning;
  enhetNamn: string;
  valdKod: string;
  riketSerie: KpiRow[];
  hallandSerie: KpiRow[] | null;
  enhetsnamn: Map<string, string>;
  fmt: (v: number) => string;
  /** Förändringen som text, t.ex. "(+0,6)", och dess klass */
  delta: { text: string; klass: string } | null;
  bricka: { klass: string };
  /** Radens skärmposition */
  ankare: { x: number; topp: number; botten: number };
}

/** Kvadratisk tidsserie: vald enhet i sin färg, riket streckat, länet streckat grått */
function Graf({ serie, riket, halland, farg, fmt }: {
  serie: KpiRow[]; riket: KpiRow[]; halland: KpiRow[] | null; farg: string; fmt: (v: number) => string;
}) {
  const W = 212, H = 170, m = { t: 14, r: 40, b: 18, l: 30 };
  const varden = (rows: KpiRow[]) => rows.filter((d) => d.varde != null) as (KpiRow & { varde: number })[];
  const egen = varden(serie);
  if (egen.length < 2) return null;
  const forsta = egen[0].ar, sista = egen[egen.length - 1].ar;
  const inom = (rows: KpiRow[]) => varden(rows).filter((d) => d.ar >= forsta && d.ar <= sista);
  const r = inom(riket), h = halland ? inom(halland) : [];
  const alla = [...egen, ...r, ...h].map((d) => d.varde);
  const [lo, hi] = d3.extent(alla) as [number, number];
  const pad = (hi - lo) * 0.08 || 1;
  const manad = sista > 9999;
  const tid = (a: number) => (manad ? Math.floor(a / 100) + ((a % 100) - 1) / 12 : a);
  const x = d3.scaleLinear().domain([tid(forsta), tid(sista)]).range([m.l, W - m.r]);
  const y = d3.scaleLinear().domain([lo - pad, hi + pad]).range([H - m.b, m.t]).nice(3);
  const linje = d3.line<KpiRow & { varde: number }>().x((d) => x(tid(d.ar))).y((d) => y(d.varde)).curve(d3.curveMonotoneX);
  const ticks = y.ticks(3);
  const slut = egen[egen.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke="#EEF0F2" />
          <text x={m.l - 5} y={y(t) + 3.5} textAnchor="end" fontSize={10} fill="#83888A">{fmt(t)}</text>
        </g>
      ))}
      <text x={m.l} y={H - 3} fontSize={10} fill="#83888A">{fmtPeriod(forsta)}</text>
      <text x={W - m.r} y={H - 3} textAnchor="end" fontSize={10} fill="#83888A">{fmtPeriod(sista)}</text>
      {h.length > 1 && <path d={linje(h) ?? ""} fill="none" stroke="#555" strokeWidth={1.2} strokeDasharray="3,2.5" />}
      {r.length > 1 && <path d={linje(r) ?? ""} fill="none" stroke="#2D2E2D" strokeWidth={1.2} strokeDasharray="1.5,2.5" />}
      <path d={linje(egen) ?? ""} fill="none" stroke={farg} strokeWidth={2} />
      <circle cx={x(tid(slut.ar))} cy={y(slut.varde)} r={3.5} fill={farg} stroke="#fff" strokeWidth={1.5} />
      <text x={x(tid(slut.ar)) + 6} y={y(slut.varde) + 4} fontSize={11} fontWeight={700} fill="#2D2E2D">{fmt(slut.varde)}</text>
    </svg>
  );
}

export default function RadTip({
  temaNamn, farg, namn, enhet, beskrivning, s, enhetNamn, valdKod, riketSerie, hallandSerie,
  enhetsnamn, fmt, delta, bricka, ankare,
}: Props) {
  const arRegion = valdKod === "0013";
  const enhetsord = arRegion ? "regioner" : "kommuner";
  const hogst = s.enheter[s.enheter.length - 1];
  const hk = [...s.hallandKommuner].sort((a, b) => b.varde - a.varde);
  const forandring = s.forandring[s.period > 9999 ? 1 : 10];
  const basRad = forandring ? s.serie.find((r) => r.ar === forandring.sedan) : null;
  const basVarde = basRad?.varde ?? null;
  const basRang = basRad?.rang_total ?? null;
  const beskr = beskrivning.replace(/\s*Källa:.*$/, "").trim();
  const kalla = beskrivning.match(/Källa:\s*(.*)$/)?.[1]?.trim();

  // Ovanför raden om det finns plats, annars under
  const bredd = Math.min(468, window.innerWidth - 16);
  const left = Math.max(8, Math.min(ankare.x - bredd / 2, window.innerWidth - bredd - 8));
  const ovanfor = ankare.topp > 430;
  const stil: React.CSSProperties = ovanfor
    ? { left, top: ankare.topp - 8, transform: "translateY(-100%)", ["--farg" as string]: farg }
    : { left, top: ankare.botten + 8, ["--farg" as string]: farg };

  return createPortal(
    <div className="kt-tip" style={stil} role="tooltip">
      <div className="kt-tip-kicker">{temaNamn}</div>
      <div className="kt-tip-rubrik">{namn}</div>
      <div className="kt-tip-stor">
        <b>{fmt(s.varde)}</b>
        {delta && <span className={`kt-delta ${delta.klass}`}>{delta.text}</span>}
        <span style={{ fontSize: 12.5, color: "#5B5B5B", fontFamily: "var(--font-sans)" }}>{enhet}</span>
        <span className="kt-tip-ar">{enhetNamn} {fmtPeriod(s.period)}</span>
      </div>
      {basVarde != null && forandring && (
        <div className="kt-tip-fran">Jämfört med {fmt(basVarde)} år {fmtPeriod(forandring.sedan)}</div>
      )}
      <div className="kt-tip-kropp">
        <Graf serie={s.serie} riket={riketSerie} halland={arRegion ? null : hallandSerie}
              farg={ENHET_FARG[valdKod] ?? farg} fmt={fmt} />
        <dl className="kt-fakta">
          {s.rang != null && (
            <div>
              <dt>Plats bland landets {enhetsord}</dt>
              <dd>
                <span className={`kt-bricka ${bricka.klass}`}>{s.rang}</span>{" "}
                <span style={{ fontSize: 12, color: "#5B5B5B" }}>av {s.n}</span>
                {basRang != null && forandring && <small>Plats {basRang} år {fmtPeriod(forandring.sedan)}</small>}
              </dd>
            </div>
          )}
          <div>
            <dt>Riket{!arRegion && s.halland != null ? " och Halland" : ""}</dt>
            <dd>
              <b>{s.riket != null ? fmt(s.riket) : "–"}</b>
              {!arRegion && s.halland != null && <span style={{ fontSize: 13, color: "#5B5B5B" }}> och {fmt(s.halland)}</span>}
            </dd>
          </div>
          {hogst && (
            <div>
              <dt>Högst i landet</dt>
              <dd><b>{fmt(hogst.varde)}</b><small>{enhetsnamn.get(hogst.kod) ?? hogst.kod}</small></dd>
            </div>
          )}
          {!arRegion && hk.length > 1 && (
            <div>
              <dt>I Halland</dt>
              <dd>
                <small>Högst {enhetsnamn.get(hk[0].kod)} {fmt(hk[0].varde)}, lägst {enhetsnamn.get(hk[hk.length - 1].kod)} {fmt(hk[hk.length - 1].varde)}</small>
              </dd>
            </div>
          )}
        </dl>
      </div>
      {(beskr || kalla) && (
        <div className="kt-tip-not">
          {beskr}{kalla ? ` Källa: ${kalla}` : ""}
        </div>
      )}
    </div>,
    document.body,
  );
}
