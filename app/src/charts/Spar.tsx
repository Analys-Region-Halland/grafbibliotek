import { memo, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ENHET_FARG, HALLAND_KODER } from "../types";
import { kvantil } from "../utils/kpiStats";
import type { Riktning } from "../teman/tema-config";

const BRA = "#E3F4E2";
const DALIGT = "#FEE6E7";

interface Props {
  /** Jämförbara enheter (kommuner eller regioner), sorterade stigande på värde */
  enheter: { kod: string; varde: number }[];
  valdKod: string;
  riket: number | null;
  halland: number | null;
  namn: Map<string, string>;
  fmt: (v: number) => string;
  /** Tvinga logaritmisk skala (antal); väljs annars när fördelningen är mycket sned */
  logSkala?: boolean;
  width: number;
  height?: number;
  /** Tona fördelningens kvartiler: mittersta hälften neutral, ytterfjärdedelarna efter riktning */
  kvartiler?: boolean;
  /** Önskvärd riktning: den bästa fjärdedelen tonas grön och den sämsta röd (annars bara neutral ton) */
  riktning?: Riktning;
  /** Visa Hallands kommuner i sina färger (när raden pekas) */
  visaHalland: boolean;
  ariaLabel: string;
}

const R = 1.5;
const STEG = 3.6;
const R_HALLAND = 2.7;
const R_VALD = 4.2;
const VANSTER = 38;   // plats för skalans lägsta värde
const HOGER = 44;     // plats för skalans högsta värde

interface Fack { x: number; fran: number; till: number; antal: number }

/**
 * Spåret: en axel per rad med skalans ändvärden utskrivna, landets enheter som små grå
 * punkter staplade där de ligger tätt (fördelningens form), riket som svart streck,
 * länet som streckat, den valda enheten som punkt med vit halo och pulserande ring.
 * Kvartilerna kan tonas bakom punkterna (mittersta hälften neutral, ytterfjärdedelarna efter
 * önskvärd riktning när den är känd). Peka på en punkt för namn och värde; Hallands kommuner
 * tänds när raden pekas.
 */
function SparInner({
  enheter, valdKod, riket, halland, namn, fmt, logSkala, width, height = 26, visaHalland, ariaLabel,
  kvartiler = false, riktning = null,
}: Props) {
  const [tip, setTip] = useState<{ text: React.ReactNode; sx: number; sy: number } | null>(null);
  const mid = height / 2;

  const layout = useMemo(() => {
    const vals = enheter.map((e) => e.varde);
    const q = (p: number) => vals[Math.round((vals.length - 1) * p)];
    const sned = vals.length > 2 && vals[0] > 0 && q(0.99) / Math.max(q(0.5), 1e-9) > 8;
    const logg = (logSkala || sned) && vals[0] > 0;
    const t = (v: number) => (logg ? Math.log10(Math.max(v, 1e-9)) : v);
    const valdV = enheter.find((e) => e.kod === valdKod)?.varde;
    const markorer = [riket, halland, valdV].filter((v): v is number => v != null && (!logg || v > 0));
    const loV = Math.min(q(0.01), ...markorer);
    const hiV = Math.max(q(0.99), ...markorer);
    let lo = t(loV), hi = t(hiV);
    if (hi === lo) { lo -= 1; hi += 1; }
    const x0 = VANSTER, x1 = width - HOGER;
    const x = (v: number) => x0 + ((Math.min(hi, Math.max(lo, t(v))) - lo) / (hi - lo)) * (x1 - x0);
    const nFack = Math.max(8, Math.floor((x1 - x0) / STEG));
    const fack: Fack[] = Array.from({ length: nFack }, (_, i) => ({ x: x0 + (i + 0.5) * ((x1 - x0) / nFack), fran: Infinity, till: -Infinity, antal: 0 }));
    for (const v of vals) {
      const i = Math.min(nFack - 1, Math.max(0, Math.floor(((x(v) - x0) / (x1 - x0)) * nFack)));
      const f = fack[i]; f.antal++; f.fran = Math.min(f.fran, v); f.till = Math.max(f.till, v);
    }
    const maxStapel = Math.max(1, Math.floor((height - 4) / STEG));
    const perPrick = Math.max(1, Math.ceil(Math.max(...fack.map((f) => f.antal)) / maxStapel));
    const q25 = kvantil(vals, 0.25), q75 = kvantil(vals, 0.75);
    return { x, x0, x1, fack, perPrick, logg, loV, hiV, q25, q75 };
  }, [enheter, riket, halland, logSkala, width, height, valdKod]);

  if (enheter.length < 2) return null;
  const { x, x0, x1, fack, perPrick, logg, loV, hiV, q25, q75 } = layout;
  const vald = enheter.find((e) => e.kod === valdKod);
  const hallandEnheter = enheter.filter((e) => HALLAND_KODER.includes(e.kod) && e.kod !== valdKod);
  const n = enheter.length;
  const enhetsord = n <= 21 ? "regioner" : "kommuner";
  const rangFor = (v: number) => enheter.filter((e) => e.varde > v).length + 1;
  const farg = ENHET_FARG[valdKod] ?? "#3D4245";

  const onMove = (ev: React.MouseEvent<SVGSVGElement>) => {
    ev.stopPropagation();
    const rect = ev.currentTarget.getBoundingClientRect();
    const mx = ev.clientX - rect.left;
    const kandidater = [...(vald ? [vald] : []), ...(visaHalland ? hallandEnheter : [])];
    const nara = kandidater.map((e) => ({ e, d: Math.abs(x(e.varde) - mx) })).sort((a, b) => a.d - b.d)[0];
    if (nara && nara.d < 5) {
      setTip({
        text: <><b>{namn.get(nara.e.kod) ?? nara.e.kod}</b> {fmt(nara.e.varde)}
          <span style={{ color: "#83888A" }}> plats {rangFor(nara.e.varde)} av {n}</span></>,
        sx: rect.left + x(nara.e.varde), sy: rect.top,
      });
      return;
    }
    if (mx < x0 - 4 || mx > x1 + 4) { setTip(null); return; }
    const f = fack.reduce((b, c) => (Math.abs(c.x - mx) < Math.abs(b.x - mx) ? c : b));
    if (f.antal === 0) { setTip(null); return; }
    setTip({
      text: <><b>{f.antal}</b> {f.antal === 1 ? enhetsord.slice(0, -2) : enhetsord}{" "}
        {f.fran === f.till ? fmt(f.fran) : `${fmt(f.fran)}–${fmt(f.till)}`}</>,
      sx: rect.left + f.x, sy: rect.top,
    });
  };

  return (
    <div className="kt-spar" onMouseMove={(e) => e.stopPropagation()}>
      <svg width={width} height={height} role="img" aria-label={ariaLabel} className="block overflow-visible"
           onMouseMove={onMove} onMouseLeave={() => setTip(null)}>
        {kvartiler && (!logg || q25 > 0) && (() => {
          const a = x(q25), b = x(q75), y = 1, h = height - 2;
          return (
            <g aria-hidden>
              {riktning && <rect x={x0} y={y} width={Math.max(0, a - x0)} height={h} rx={2} fill={riktning === "lagt" ? BRA : DALIGT} />}
              <rect x={a} y={y} width={Math.max(1, b - a)} height={h} rx={2} fill="#EEF0F2" />
              {riktning && <rect x={b} y={y} width={Math.max(0, x1 - b)} height={h} rx={2} fill={riktning === "lagt" ? DALIGT : BRA} />}
            </g>
          );
        })()}
        <line x1={x0} x2={x1} y1={mid} y2={mid} stroke="#D6D6D6" />
        <line x1={x0} x2={x0} y1={mid - 4} y2={mid + 4} stroke="#B4B8BB" />
        <line x1={x1} x2={x1} y1={mid - 4} y2={mid + 4} stroke="#B4B8BB" />
        <text x={x0 - 5} y={mid + 3.5} textAnchor="end" fontSize={10} fill="#83888A">{fmt(loV)}</text>
        <text x={x1 + 5} y={mid + 3.5} textAnchor="start" fontSize={10} fill="#83888A">{fmt(hiV)}</text>
        {fack.map((f) => {
          const k = Math.ceil(f.antal / perPrick);
          return Array.from({ length: k }, (_, j) => (
            <circle key={`${f.x}-${j}`} cx={f.x} cy={mid + (j - (k - 1) / 2) * STEG} r={R} fill="#B4B8BB" />
          ));
        })}
        {halland != null && (!logg || halland > 0) && (
          <line x1={x(halland)} x2={x(halland)} y1={2} y2={height - 2} stroke="#555" strokeWidth={1.25} strokeDasharray="2,2" />
        )}
        {riket != null && (!logg || riket > 0) && (
          <line x1={x(riket)} x2={x(riket)} y1={0} y2={height} stroke="#2D2E2D" strokeWidth={1.4} />
        )}
        {hallandEnheter.map((e) => (
          <circle key={`h${e.kod}`} cx={x(e.varde)} cy={mid} r={R_HALLAND} fill={ENHET_FARG[e.kod]}
                  stroke="#fff" strokeWidth={0.8}
                  style={{ opacity: visaHalland ? 1 : 0, transition: "opacity 120ms" }} />
        ))}
        {vald && (
          <>
            <circle className="kt-puls" cx={x(vald.varde)} cy={mid} r={R_VALD + 1} stroke={farg} />
            <circle cx={x(vald.varde)} cy={mid} r={R_VALD} fill={farg} stroke="#fff" strokeWidth={2} />
          </>
        )}
      </svg>
      {tip && createPortal(
        <div className="kt-tip kt-tip-liten -translate-x-1/2 -translate-y-full" style={{ left: tip.sx, top: tip.sy - 6 }}>
          {tip.text}
          {perPrick > 1 && <div style={{ fontSize: 11, color: "#83888A" }}>Varje grå punkt motsvarar {perPrick} {enhetsord}.</div>}
          {logg && <div style={{ fontSize: 11, color: "#83888A" }}>Skalan är logaritmisk.</div>}
        </div>,
        document.body,
      )}
    </div>
  );
}

const Spar = memo(SparInner);
export default Spar;
