import * as d3 from "d3";
import type { HallandCell } from "../utils/kpiStats";
import { ENHET_FARG, KOMMUNER_NORR_SODER } from "../types";

interface Props {
  celler: Map<string, HallandCell>;
  /** Kommunen som analysen gäller lyfts fram i sin färg; länet ger alla kommuner samma ton */
  valdKod: string;
  /** Länets värde mäter något annat än kommunernas och ritas inte som referens */
  utanLan?: boolean;
  namn: (kod: string) => string;
  fmt: (v: number) => string;
  width: number;
}

const RAD = 26;
const STAPEL = 16;
const NEUTRAL = "#B4B8BB";
const LAN = "#8A9096";

/**
 * Hallands sex kommuner som liggande staplar, sorterade efter värde, med länet (streckat)
 * och riket (heldraget) som lodräta referenslinjer. Värdet står vid stapelns ände.
 */
export default function HallandStaplar({ celler, valdKod, utanLan = false, namn, fmt, width }: Props) {
  const kommuner = KOMMUNER_NORR_SODER
    .map((kod) => ({ kod, varde: celler.get(kod)?.varde ?? null }))
    .filter((d): d is { kod: string; varde: number } => d.varde != null)
    .sort((a, b) => b.varde - a.varde);
  if (kommuner.length === 0) return null;
  const lan = utanLan ? null : celler.get("0013")?.varde ?? null;
  const riket = celler.get("0000")?.varde ?? null;

  const namnBredd = 96;
  const m = { t: 28, r: 54, b: 6, l: namnBredd };
  const alla = [...kommuner.map((d) => d.varde), lan, riket, 0].filter((v): v is number => v != null);
  const [lo, hi] = d3.extent(alla) as [number, number];
  const x = d3.scaleLinear().domain([Math.min(0, lo), Math.max(0, hi)]).range([m.l + (lo < 0 ? 44 : 0), width - m.r]).nice();
  const height = m.t + kommuner.length * RAD + m.b;
  const noll = x(0);

  // Referenslinjernas etiketter ovanför ytan
  const ref = [
    lan != null ? { id: "lan", text: `Halland ${fmt(lan)}`, x: x(lan), streck: "4,3", farg: "#555555" } : null,
    riket != null ? { id: "riket", text: `Riket ${fmt(riket)}`, x: x(riket), streck: undefined, farg: "#2D2E2D" } : null,
  ].filter((r): r is NonNullable<typeof r> => r != null).sort((a, b) => a.x - b.x);
  // Två linjer: etiketterna pekar bort från varandra (vänster åt vänster, höger åt höger)
  const ankare = (i: number) => (ref.length < 2 ? "middle" : i === 0 ? "end" : "start");
  const textX = (r: (typeof ref)[number], i: number) =>
    ref.length < 2 ? Math.min(Math.max(r.x, m.l + 44), width - 44) : i === 0 ? r.x - 4 : r.x + 4;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" className="block"
         aria-label={`${kommuner.map((d) => `${namn(d.kod)} ${fmt(d.varde)}`).join(", ")}${lan != null ? `; Halland ${fmt(lan)}` : ""}${riket != null ? `; riket ${fmt(riket)}` : ""}`}>
      <line x1={noll} x2={noll} y1={m.t - 4} y2={height - m.b} stroke="#C4C7C9" />
      {kommuner.map((d, i) => {
        const y = m.t + i * RAD + (RAD - STAPEL) / 2;
        const x0 = Math.min(noll, x(d.varde)), x1 = Math.max(noll, x(d.varde));
        const vald = d.kod === valdKod;
        const farg = vald ? ENHET_FARG[d.kod] : valdKod === "0013" ? LAN : NEUTRAL;
        const positiv = d.varde >= 0;
        return (
          <g key={d.kod}>
            <title>{`${namn(d.kod)}: ${fmt(d.varde)}`}</title>
            <text x={m.l - 10} y={y + STAPEL / 2 + 4} textAnchor="end" fontSize={12.5}
                  fontWeight={vald ? 700 : 400} fill="#2D2E2D">{namn(d.kod)}</text>
            <rect x={x0} y={y} width={Math.max(1, x1 - x0)} height={STAPEL} rx={3} fill={farg} />
            <text x={positiv ? x1 + 6 : x0 - 6} y={y + STAPEL / 2 + 4} textAnchor={positiv ? "start" : "end"}
                  fontSize={12} fontWeight={vald ? 700 : 500} fill="#2D2E2D" className="tabular-nums">{fmt(d.varde)}</text>
          </g>
        );
      })}
      {ref.map((r, i) => (
        <g key={r.id}>
          <line x1={r.x} x2={r.x} y1={14} y2={height - m.b} stroke={r.farg} strokeWidth={1.4} strokeDasharray={r.streck} />
          <text x={textX(r, i)} y={18} textAnchor={ankare(i)} fontSize={11.5} fill="#2D2E2D">{r.text}</text>
        </g>
      ))}
    </svg>
  );
}
