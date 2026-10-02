import { Fragment, useMemo, useRef, useState } from "react";
import type { KpiMeta } from "../types";
import type { TemaConfig } from "../teman/tema-config";
import { TEMA_FARG_HEX } from "../teman/tema-config";
import { sammanfatta } from "../utils/kpiStats";
import type { KpiIndex, KpiSammanfattning } from "../utils/kpiStats";
import { byggGrupper } from "../utils/temaRader";
import type { TabellRad } from "../utils/temaRader";
import { kpiDecimaler } from "../utils/format";
import { fmt as fmtBas } from "../utils/format";
import Spar from "../charts/Spar";
import RadTip from "./RadTip";
import { useContainerWidth } from "../hooks/useContainerWidth";

/** Typografiskt minustecken */
const fmt = (v: number | null | undefined, dec: number) => fmtBas(v, dec).replace(/^-/, "−");

interface Props {
  tema: TemaConfig;
  meta: KpiMeta[];
  idx: KpiIndex;
  valdKod: string;
  enhetNamn: string;
  enhetsnamn: Map<string, string>;
  onOpenKpi: (kpiId: string) => void;
}

const enhetText = (enhet: string) => (enhet === "procent" ? "procent" : enhet);

/** Förändringen inom parentes; färg bara när önskvärd riktning är känd (lågt är bra) */
function deltaFor(s: KpiSammanfattning, dec: number, lagtArBra: boolean) {
  const f = s.forandring[s.period > 9999 ? 1 : 10];
  if (!f) return null;
  const v = f.varde;
  const text = v === 0 ? "(±0)" : v > 0 ? `(+${fmt(v, dec)})` : `(${fmt(v, dec)})`;
  const klass = !lagtArBra || v === 0 ? "" : v < 0 ? "kt-battre" : "kt-samre";
  return { text, klass };
}

/** Platsens bricka: fyra färgsteg bara när önskvärd riktning är känd, annars neutral */
function brickaFor(s: KpiSammanfattning, lagtArBra: boolean) {
  if (!lagtArBra || s.rang == null || s.n < 2) return { klass: "" };
  const andel = s.rang / s.n; // lågt värde är bra: hög platssiffra = lågt värde
  return { klass: andel > 0.75 ? "kt-topp" : andel > 0.5 ? "kt-ovre" : andel > 0.25 ? "kt-nedre" : "kt-botten" };
}

/** Stege: en liten ruta per tiondel av fältet, platsens ruta högre och mörk */
function Stege({ rang, n }: { rang: number; n: number }) {
  const antal = Math.min(n, 29);
  const steg = n / antal;
  const aktiv = Math.min(antal - 1, Math.floor((rang - 1) / steg));
  return (
    <svg width={58} height={12} aria-hidden className="inline-block align-middle ml-1.5">
      {Array.from({ length: antal }, (_, i) => (
        <rect key={i} x={i * 2} y={i === aktiv ? 0 : 3} width={1.2} height={i === aktiv ? 12 : 6}
              fill={i === aktiv ? "#2D2E2D" : "#D6D6D6"} />
      ))}
    </svg>
  );
}

const Mer = () => (
  <svg className="kt-mer" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
    <circle cx="8" cy="8" r="6.6" /><path d="M6.8 5.2L9.6 8l-2.8 2.8" />
  </svg>
);

export default function TemaTabell({ tema, meta, idx, valdKod, enhetNamn, enhetsnamn, onOpenKpi }: Props) {
  const [oppna, setOppna] = useState<Set<string>>(new Set());
  const [pekad, setPekad] = useState<string | null>(null);
  const [tip, setTip] = useState<{ kpiId: string; ankare: { x: number; topp: number; botten: number } } | null>(null);
  const timer = useRef<number>(0);
  const iSpar = useRef(false);
  const grupper = useMemo(() => byggGrupper(tema, meta, idx), [tema, meta, idx]);
  const arRegion = valdKod === "0013";
  const farg = TEMA_FARG_HEX[tema.temaFarg].djup;
  const [sparRef, sparBredd] = useContainerWidth();

  const sammanfattningar = useMemo(() => {
    const m = new Map<string, KpiSammanfattning>();
    const lagg = (r: TabellRad) => {
      const s = sammanfatta(idx, r.kpiId, valdKod);
      if (s) m.set(r.kpiId, s);
      r.nedbrytningar.forEach((g) => g.rader.forEach(lagg));
    };
    grupper.forEach((g) => g.rader.forEach(lagg));
    return m;
  }, [grupper, idx, valdKod]);

  const nEnheter = useMemo(() => {
    for (const s of sammanfattningar.values()) if (s.n > 1) return s.n;
    return arRegion ? 21 : 290;
  }, [sammanfattningar, arRegion]);
  const enhetsord = arRegion ? "regioner" : "kommuner";

  const vaxla = (id: string) => setOppna((prev) => {
    const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n;
  });

  const visaTip = (kpiId: string, el: HTMLElement) => {
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (iSpar.current) return;
      const r = el.getBoundingClientRect();
      setTip({ kpiId, ankare: { x: r.left + r.width * 0.3, topp: r.top, botten: r.bottom } });
    }, tip ? 40 : 170);
  };
  const doljTip = () => { clearTimeout(timer.current); setTip(null); };

  const allaRader = useMemo(() => {
    const m = new Map<string, TabellRad>();
    const lagg = (r: TabellRad) => { m.set(r.kpiId, r); r.nedbrytningar.forEach((g) => g.rader.forEach(lagg)); };
    grupper.forEach((g) => g.rader.forEach(lagg));
    return m;
  }, [grupper]);

  const renderRad = (r: TabellRad, sub: boolean) => {
    const s = sammanfattningar.get(r.kpiId);
    if (!s) return null;
    const dec = kpiDecimaler(s.varde, r.enhet);
    const harNed = !sub && r.nedbrytningar.length > 0;
    const arOppen = oppna.has(r.kpiId);
    const arAntal = r.enhet === "antal";
    const delta = deltaFor(s, dec, r.lagtArBra);
    const bricka = brickaFor(s, r.lagtArBra);
    const aria = [`${r.namn}: ${fmt(s.varde, dec)} ${enhetText(r.enhet)}`,
      s.riket != null ? `riket ${fmt(s.riket, dec)}` : "",
      s.rang != null ? `plats ${s.rang} av ${s.n}` : ""].filter(Boolean).join(", ");
    return (
      <Fragment key={r.kpiId}>
        <div
          className={`kt-rad ${pekad === r.kpiId ? "kt-pekad" : ""}`}
          role="button" tabIndex={0} aria-label={`${aria}. Öppna graf och karta`}
          onClick={() => onOpenKpi(r.kpiId)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenKpi(r.kpiId); } }}
          onMouseEnter={(e) => { setPekad(r.kpiId); visaTip(r.kpiId, e.currentTarget); }}
          onMouseLeave={() => { setPekad(null); doljTip(); }}
        >
          <div className="kt-c-etikett flex items-start gap-1.5 min-w-0">
            {harNed ? (
              <button
                onClick={(e) => { e.stopPropagation(); vaxla(r.kpiId); }}
                aria-expanded={arOppen}
                aria-label={`${arOppen ? "Dölj" : "Visa"} nedbrytningar av ${r.namn}`}
                className="mt-[2px] w-4 h-4 shrink-0 flex items-center justify-center rounded text-[#83888A]
                           hover:bg-[#EEF0F2] hover:text-[#2D2E2D] cursor-pointer"
              >
                <svg width="9" height="9" viewBox="0 0 12 12" className={`transition-transform ${arOppen ? "rotate-90" : ""}`}
                     fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden><path d="M4 2l4 4-4 4" /></svg>
              </button>
            ) : <span className="w-4 shrink-0" />}
            <span className={sub ? "kt-namn kt-namn-sub" : "kt-namn"}>{r.namn}<Mer /></span>
          </div>
          <div className="kt-c-varde kt-tal kt-varde">
            <b>{fmt(s.varde, dec)}</b>{delta && <> <span className={`kt-delta ${delta.klass}`}>{delta.text}</span></>}
            <span className="kt-enhet">{s.ki ? `${enhetText(r.enhet)}, enkät` : enhetText(r.enhet)}</span>
          </div>
          <div className="kt-c-riket kt-tal kt-riket">{s.riket != null ? fmt(s.riket, dec) : "–"}</div>
          <div className="kt-c-spar"
               onMouseEnter={() => { iSpar.current = true; doljTip(); }}
               onMouseLeave={(e) => { iSpar.current = false; visaTip(r.kpiId, e.currentTarget.parentElement as HTMLElement); }}>
            <Spar
              enheter={s.enheter} valdKod={valdKod}
              riket={arAntal ? null : s.riket} halland={arAntal ? null : s.halland}
              namn={enhetsnamn} fmt={(v) => fmt(v, dec)} logSkala={arAntal}
              width={Math.max(200, sparBredd || 260)} visaHalland={!arRegion && pekad === r.kpiId}
              ariaLabel={aria}
            />
          </div>
          <div className="kt-c-plats kt-plats-kol whitespace-nowrap">
            {s.rang != null ? (
              <>
                <span className={`kt-bricka ${bricka.klass}`}>{s.rang}</span>
                <Stege rang={s.rang} n={s.n} />
              </>
            ) : <span className="text-[12px] text-[#83888A]">–</span>}
          </div>
        </div>
        {harNed && arOppen && (
          <div className="kt-grupp">
            {r.nedbrytningar.map((g) => (
              <Fragment key={g.grupp}>
                <div className="pl-[30px] pt-2 pb-0.5 text-[10.5px] font-semibold tracking-[0.14em] uppercase text-[#83888A]">{g.grupp}</div>
                {g.rader.map((sr) => renderRad(sr, true))}
              </Fragment>
            ))}
          </div>
        )}
      </Fragment>
    );
  };

  const tipRad = tip ? allaRader.get(tip.kpiId) : null;
  const tipS = tip ? sammanfattningar.get(tip.kpiId) : null;

  return (
    <div className="kt bg-white border border-neutral-200 rounded-lg px-3 sm:px-4 pb-4"
         style={{ ["--farg" as string]: farg }}>
      <div className="kt-huvud">
        <div className="kt-c-etikett">Indikator<small>Klicka på en indikator för graf och karta</small></div>
        <div className="kt-c-varde kt-tal">{enhetNamn}<small>Senaste år (förändring på tio år)</small></div>
        <div className="kt-c-riket kt-tal">Riket<small>Senaste år</small></div>
        <div className="kt-c-spar" ref={sparRef}>
          {enhetNamn} och landets {enhetsord}
          <small>Grå punkter är {enhetsord}, svart streck riket{arRegion ? "" : ", streckat Halland"}</small>
        </div>
        <div className="kt-c-plats kt-plats-kol">Plats<small>Bland {nEnheter} {enhetsord}, 1 = högst</small></div>
      </div>

      {grupper.map((g, gi) => (
        <Fragment key={g.rubrik ?? `g${gi}`}>
          {g.rubrik ? (
            <>
              <div className="kt-band">{g.rubrik}</div>
              <div className="kt-grupp">{g.rader.map((r) => renderRad(r, false))}</div>
            </>
          ) : (
            <div className={gi === 0 ? "pt-1.5" : "pt-2.5"}>{g.rader.map((r) => renderRad(r, false))}</div>
          )}
        </Fragment>
      ))}

      {tip && tipRad && tipS && (() => {
        const dec = kpiDecimaler(tipS.varde, tipRad.enhet);
        return (
          <RadTip
            temaNamn={tema.temaNamn} farg={farg} namn={tipRad.namn} enhet={enhetText(tipRad.enhet)}
            beskrivning={tipRad.beskrivning} s={tipS} enhetNamn={enhetNamn} valdKod={valdKod}
            riketSerie={idx.get(tipRad.kpiId)?.get("0000") ?? []}
            hallandSerie={idx.get(tipRad.kpiId)?.get("0013") ?? null}
            enhetsnamn={enhetsnamn} fmt={(v) => fmt(v, dec)}
            delta={deltaFor(tipS, dec, tipRad.lagtArBra)} bricka={brickaFor(tipS, tipRad.lagtArBra)}
            ankare={tip.ankare}
          />
        );
      })()}
    </div>
  );
}
