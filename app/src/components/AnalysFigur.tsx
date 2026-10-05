import { useMemo, useState } from "react";
import type { KpiMeta } from "../types";
import { ENHET_FARG, HALLAND_KOMMUNER } from "../types";
import type { TemaConfig } from "../teman/tema-config";
import type { Figur } from "../hooks/useAnalys";
import type { KpiIndex } from "../utils/kpiStats";
import { hallandsCeller, HALLAND_KOLUMNER, sammanfatta } from "../utils/kpiStats";
import { fmt as fmtBas, fmtPeriod, fmtStor, kpiDecimaler } from "../utils/format";
import { useContainerWidth } from "../hooks/useContainerWidth";
import SerieGraf from "../charts/SerieGraf";
import type { Serie } from "../charts/SerieGraf";
import HallandStaplar from "../charts/HallandStaplar";
import Delar from "../charts/Delar";
import Spar from "../charts/Spar";

interface Props {
  figur: Figur;
  idx: KpiIndex;
  meta: KpiMeta[];
  tema: TemaConfig;
  /** Enheten som analysen gäller */
  valdKod: string;
  enhetNamn: string;
  enhetsnamn: Map<string, string>;
  onOpenKpi: (kpiId: string) => void;
}

/** Delar och uppdelningar: validerad ordning (#6473D9, #2DB8F6, #FF7E00), sedan reserv */
const DEL_FARGER = ["#6473D9", "#2DB8F6", "#FF7E00", "#00AB60", "#A51300"];
const HALLAND_FARG = "#555555";
const RIKET_FARG = "#2D2E2D";

const minus = (s: string) => s.replace(/^-/, "−");
const rensa = (n: string) => n.replace(/\s*\(%\)\s*$/, "").replace(/,\s*andel\s*\(%\)/, ", andel").trim();
const enhetText = (e: string) => (e === "procent" ? "procent" : e);
const namnPaEnhet = (kod: string, enhetsnamn: Map<string, string>) =>
  kod === "0000" ? "Riket" : HALLAND_KOMMUNER.find((k) => k.kod === kod)?.namn ?? enhetsnamn.get(kod) ?? kod;

interface Tabell { kolumner: string[]; rader: string[][] }

/**
 * En figur i analysen: budskapet som rubrik, måttet och perioden under, figuren, källan,
 * en genväg till graf och karta och siffrorna som tabell.
 */
export default function AnalysFigur({ figur, idx, meta, tema, valdKod, enhetNamn, enhetsnamn, onOpenKpi }: Props) {
  const [ref, bredd] = useContainerWidth();
  const [visaTabell, setVisaTabell] = useState(false);
  const metaMap = useMemo(() => new Map(meta.map((m) => [m.kpi_id, m])), [meta]);
  const forsta = metaMap.get(figur.kpi[0]);
  const namnFor = (id: string, kort = false) => {
    const hela = rensa(tema.visningsnamn[id] ?? metaMap.get(id)?.kpi_namn ?? id);
    return kort ? tema.kortNamn?.[id] ?? hela : hela;
  };
  /** Måttets namn med enheten, utan att upprepa den ("Medelålder, år", inte "…, år, år") */
  const matt = (id: string) => {
    const n = namnFor(id);
    const e = enhetText(metaMap.get(id)?.enhet ?? "");
    return !e || n.toLowerCase().includes(`, ${e}`) || n.toLowerCase().endsWith(` ${e}`) ? n : `${n}, ${e}`;
  };
  const serie = (id: string, kod: string) =>
    (idx.get(id)?.get(kod) ?? [])
      .filter((r) => r.varde != null && (figur.fran == null || r.ar >= figur.fran))
      .map((r) => ({ ar: r.ar, varde: r.varde as number }));

  if (!forsta) return null;
  const enhet = forsta.enhet;
  const ref0 = serie(figur.kpi[0], valdKod).at(-1)?.varde ?? null;
  const dec = kpiDecimaler(ref0, enhet);
  // Figurerna förkortar stora tal (3,13 mn); tabellvyn visar dem exakt
  const fmt = (v: number) => minus(fmtStor(v, dec));
  const exakt = (v: number) => minus(fmtBas(v, dec));
  const kalla = forsta.beskrivning.match(/Källa:\s*(.*)$/)?.[1]?.trim().replace(/\.$/, "");
  const w = Math.max(280, bredd || 600);
  const h = Math.round(Math.min(320, Math.max(220, w * 0.5)));
  const arAntal = enhet === "antal";

  let innehall: React.ReactNode = null;
  let legend: { namn: string; farg: string; streck?: string; form: "linje" | "yta" | "punkt" }[] = [];
  let tabell: Tabell = { kolumner: [], rader: [] };
  let undertitel = "";

  if (figur.typ === "utveckling" || figur.typ === "uppdelning") {
    const serier: Serie[] = figur.typ === "utveckling"
      ? [
          { id: "egen", namn: enhetNamn, farg: ENHET_FARG[valdKod] ?? HALLAND_FARG, huvud: true, punkter: serie(figur.kpi[0], valdKod) },
          ...(valdKod !== "0013" && !arAntal ? [{ id: "halland", namn: "Halland", farg: HALLAND_FARG, streck: "4,3", punkter: serie(figur.kpi[0], "0013") }] : []),
          ...(!arAntal ? [{ id: "riket", namn: "Riket", farg: RIKET_FARG, streck: "1.5,2.5", punkter: serie(figur.kpi[0], "0000") }] : []),
        ]
      : figur.kpi.map((id, i) => ({ id, namn: namnFor(id, true), farg: DEL_FARGER[i % DEL_FARGER.length], huvud: i === 0, punkter: serie(id, valdKod) }));
    // Månads- och kvartalsdata: samma månad varje år, så att säsongen inte skymmer trenden
    // och figuren jämför som texten och underlaget gör (juli 2021, juli 2022 …)
    const sistaPeriod = serier[0].punkter.at(-1)?.ar ?? 0;
    const manad = sistaPeriod > 9999 ? sistaPeriod % 100 : null;
    const synliga = serier
      .map((s) => (manad == null ? s : { ...s, punkter: s.punkter.filter((p) => p.ar % 100 === manad) }))
      .filter((s) => s.punkter.length > 1);
    if (synliga.length === 0) return null;
    const huvud = synliga[0].punkter;
    const spann = `${fmtPeriod(huvud[0].ar)}–${fmtPeriod(huvud[huvud.length - 1].ar)}${manad != null ? ", samma månad varje år" : ""}`;
    undertitel = figur.typ === "utveckling" ? `${matt(figur.kpi[0])}, ${spann}` : `${enhetNamn}, ${enhetText(enhet)}, ${spann}`;
    if (synliga.length > 1) legend = synliga.map((s) => ({ namn: s.namn, farg: s.farg, streck: s.streck, form: "linje" as const }));
    innehall = <SerieGraf serier={synliga} width={w} height={h} fmt={fmt}
                          ariaLabel={`${figur.rubrik}. ${synliga.map((s) => `${s.namn} ${fmt(s.punkter[s.punkter.length - 1].varde)} år ${fmtPeriod(s.punkter[s.punkter.length - 1].ar)}`).join(", ")}`} />;
    const ar = [...new Set(synliga.flatMap((s) => s.punkter.map((p) => p.ar)))].sort((a, b) => a - b);
    tabell = {
      kolumner: ["Period", ...synliga.map((s) => s.namn)],
      rader: ar.map((a) => [fmtPeriod(a), ...synliga.map((s) => { const p = s.punkter.find((q) => q.ar === a); return p ? exakt(p.varde) : "–"; })]),
    };
  } else if (figur.typ === "halland") {
    const c = hallandsCeller(idx, figur.kpi[0]);
    if (!c) return null;
    undertitel = `${matt(figur.kpi[0])}, ${fmtPeriod(c.period)}`;
    innehall = <HallandStaplar celler={c.celler} valdKod={valdKod} namn={(k) => namnPaEnhet(k, enhetsnamn)} fmt={fmt} width={w} />;
    tabell = {
      kolumner: ["Enhet", fmtPeriod(c.period)],
      rader: HALLAND_KOLUMNER.map((k) => [namnPaEnhet(k, enhetsnamn), c.celler.get(k)?.varde != null ? exakt(c.celler.get(k)!.varde!) : "–"]),
    };
  } else if (figur.typ === "landet") {
    const s = sammanfatta(idx, figur.kpi[0], valdKod);
    if (!s) return null;
    const ord = valdKod === "0013" ? "regioner" : "kommuner";
    undertitel = `${matt(figur.kpi[0])}, ${fmtPeriod(s.period)}`;
    legend = [
      { namn: `Landets ${ord}`, farg: "#B4B8BB", form: "punkt" },
      { namn: enhetNamn, farg: ENHET_FARG[valdKod] ?? HALLAND_FARG, form: "punkt" },
      ...(valdKod !== "0013" && s.halland != null ? [{ namn: "Halland", farg: HALLAND_FARG, streck: "2,2", form: "linje" as const }] : []),
      ...(s.riket != null ? [{ namn: "Riket", farg: RIKET_FARG, form: "linje" as const }] : []),
    ];
    innehall = (
      <>
        <Spar enheter={s.enheter} valdKod={valdKod} riket={arAntal ? null : s.riket} halland={arAntal ? null : s.halland}
              namn={enhetsnamn} fmt={fmt} logSkala={arAntal} width={w} height={58} visaHalland={valdKod !== "0013"}
              kvartiler lagtArBra={(tema.lagtArBra ?? []).includes(figur.kpi[0])}
              ariaLabel={`${enhetNamn} ${fmt(s.varde)}, plats ${s.rang} av ${s.n} ${ord}`} />
        {s.rang != null && (
          <p className="af-not">{enhetNamn} har {fmt(s.varde)} och plats {s.rang} av {s.n} {ord}, där 1 är det högsta värdet.</p>
        )}
      </>
    );
    tabell = {
      kolumner: ["", fmtPeriod(s.period)],
      rader: [
        [enhetNamn, exakt(s.varde)],
        ...(s.halland != null ? [["Halland", exakt(s.halland)]] : []),
        ...(s.riket != null ? [["Riket", exakt(s.riket)]] : []),
        [`Lägst bland ${ord}`, exakt(s.enheter[0].varde)],
        [`Högst bland ${ord}`, exakt(s.enheter[s.enheter.length - 1].varde)],
      ],
    };
  } else if (figur.typ === "delar") {
    const delar = figur.kpi.map((id, i) => ({
      id, namn: namnFor(id, true).replace(/,\s*antal$/, ""), farg: DEL_FARGER[i % DEL_FARGER.length],
      varden: new Map(serie(id, valdKod).map((p) => [p.ar, p.varde])),
    }));
    const summa = figur.summa
      ? { namn: namnFor(figur.summa, true).replace(/,\s*antal$/, ""), varden: new Map(serie(figur.summa, valdKod).map((p) => [p.ar, p.varde])) }
      : undefined;
    const ar = [...new Set(delar.flatMap((d) => [...d.varden.keys()]))].sort((a, b) => a - b).slice(figur.fran ? 0 : -10);
    if (ar.length === 0) return null;
    undertitel = `${enhetNamn}, ${enhetText(enhet)}, ${fmtPeriod(ar[0])}–${fmtPeriod(ar[ar.length - 1])}`;
    legend = [
      ...(summa ? [{ namn: summa.namn, farg: RIKET_FARG, form: "punkt" as const }] : []),
      ...delar.map((d) => ({ namn: d.namn, farg: d.farg, form: "yta" as const })),
    ];
    innehall = <Delar ar={ar} delar={delar} summa={summa} fmt={fmt} width={w} height={h} />;
    tabell = {
      kolumner: ["Period", ...delar.map((d) => d.namn), ...(summa ? [summa.namn] : [])],
      rader: ar.map((a) => [fmtPeriod(a), ...delar.map((d) => (d.varden.has(a) ? exakt(d.varden.get(a)!) : "–")),
        ...(summa ? [summa.varden.has(a) ? exakt(summa.varden.get(a)!) : "–"] : [])]),
    };
  }

  return (
    <figure className="af">
      <figcaption>
        <div className="af-rubrik">{figur.rubrik}</div>
        <div className="af-under">{undertitel}</div>
      </figcaption>
      {legend.length > 0 && (
        <div className="af-legend" aria-hidden>
          {legend.map((l) => (
            <span key={l.namn}>
              <svg width={16} height={10}>
                {l.form === "linje" && <line x1={0} x2={16} y1={5} y2={5} stroke={l.farg} strokeWidth={2} strokeDasharray={l.streck} />}
                {l.form === "yta" && <rect x={1} y={1} width={14} height={8} rx={1.5} fill={l.farg} />}
                {l.form === "punkt" && <circle cx={8} cy={5} r={4} fill={l.farg} />}
              </svg>
              {l.namn}
            </span>
          ))}
        </div>
      )}
      <div ref={ref} className="af-yta">{bredd > 0 && innehall}</div>
      <div className="af-fot">
        {kalla && <span>Källa: {kalla}.</span>}
        <button onClick={() => onOpenKpi(figur.kpi[0])}>Öppna i graf och karta</button>
        <button onClick={() => setVisaTabell((v) => !v)} aria-expanded={visaTabell}>
          {visaTabell ? "Dölj tabellen" : "Visa som tabell"}
        </button>
      </div>
      {visaTabell && (
        <div className="af-tabell">
          <table>
            <thead><tr>{tabell.kolumner.map((k, i) => <th key={i}>{k}</th>)}</tr></thead>
            <tbody>{tabell.rader.map((r, i) => <tr key={i}>{r.map((v, j) => (j === 0 ? <th key={j}>{v}</th> : <td key={j}>{v}</td>))}</tr>)}</tbody>
          </table>
        </div>
      )}
    </figure>
  );
}
