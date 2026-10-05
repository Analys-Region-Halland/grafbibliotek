import { createPortal } from "react-dom";
import SerieGraf from "../charts/SerieGraf";
import DiagramIkon from "./DiagramIkon";
import type { KpiRow } from "../types";
import { ENHET_FARG } from "../types";
import type { KpiSammanfattning } from "../utils/kpiStats";
import { periodText } from "../utils/format";
import { huvudForandring } from "../utils/kpiStats";

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
  /** Exakt format för det stora talet och jämförelsen (fmt förkortar stora tal) */
  fmtExakt?: (v: number) => string;
  /** Förändringen som text, t.ex. "+0,6", dess klass och startperiod ("2015", "jul 2025") */
  delta: { text: string; klass: string; sedan: string } | null;
  bricka: { klass: string };
  /** Radens skärmposition */
  ankare: { x: number; topp: number; botten: number };
}

/** Seriens punkter med värde */
const punkter = (rows: KpiRow[] | null) =>
  (rows ?? []).filter((d) => d.varde != null).map((d) => ({ ar: d.ar, varde: d.varde as number }));

export default function RadTip({
  temaNamn, farg, namn, enhet, beskrivning, s, enhetNamn, valdKod, riketSerie, hallandSerie,
  enhetsnamn, fmt, fmtExakt = fmt, delta, bricka, ankare,
}: Props) {
  const arRegion = valdKod === "0013";
  const arAntal = enhet === "antal";
  const enhetsord = arRegion ? "regioner" : "kommuner";
  const hogst = s.enheter[s.enheter.length - 1];
  const hk = [...s.hallandKommuner].sort((a, b) => b.varde - a.varde);
  const forandring = huvudForandring(s);
  const nu = periodText(s.period, s.kvartal);
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
        <b>{fmtExakt(s.varde)}</b>
        <span style={{ fontSize: 12.5, color: "#5B5B5B", fontFamily: "var(--font-sans)" }}>{enhet}</span>
        <span className="kt-tip-ar">{enhetNamn} {nu}</span>
      </div>
      {delta && (
        <div className="kt-tip-fran">
          Förändring <span className={`kt-delta ${delta.klass}`}>{delta.text}</span> sedan {delta.sedan}
        </div>
      )}
      {basVarde != null && forandring && (
        <div className="kt-tip-fran">Jämfört med {fmtExakt(basVarde)} {periodText(forandring.sedan, s.kvartal)}</div>
      )}
      <div className="kt-tip-kropp">
        <SerieGraf kompakt width={212} height={170} fmt={fmt} serier={[
          // För antal ritas inte länet och riket: nivåerna är så olika att enhetens kurva blir platt
          ...(arRegion || arAntal || s.halland == null ? [] : [{ id: "halland", namn: "Halland", farg: "#555555", streck: "3,2.5", punkter: punkter(hallandSerie) }]),
          ...(arAntal ? [] : [{ id: "riket", namn: "Riket", farg: "#2D2E2D", streck: "1.5,2.5", punkter: punkter(riketSerie) }]),
          { id: "egen", namn: enhetNamn, farg: ENHET_FARG[valdKod] ?? farg, huvud: true, punkter: punkter(s.serie) },
        ]} />
        <dl className="kt-fakta">
          {s.rang != null && (
            <div>
              <dt>Plats bland landets {enhetsord} {nu}</dt>
              <dd>
                <span className={`kt-bricka ${bricka.klass}`}>{s.rang}</span>{" "}
                <span style={{ fontSize: 12, color: "#5B5B5B" }}>av {s.n}</span>
                {basRang != null && forandring && <small>Plats {basRang} {periodText(forandring.sedan, s.kvartal)}</small>}
              </dd>
            </div>
          )}
          <div>
            <dt>Riket{!arRegion && s.halland != null ? " och Halland" : ""} {nu}</dt>
            <dd>
              <b>{s.riket != null ? fmt(s.riket) : "–"}</b>
              {!arRegion && s.halland != null && <span style={{ fontSize: 13, color: "#5B5B5B" }}> och {fmt(s.halland)}</span>}
            </dd>
          </div>
          {hogst && (
            <div>
              <dt>Högst i landet {nu}</dt>
              <dd><b>{fmt(hogst.varde)}</b><small>{enhetsnamn.get(hogst.kod) ?? hogst.kod}</small></dd>
            </div>
          )}
          {!arRegion && hk.length > 1 && (
            <div>
              <dt>I Halland {nu}</dt>
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
      <div className="kt-tip-klick"><DiagramIkon className="" />Klicka på raden för diagram och karta</div>
    </div>,
    document.body,
  );
}
