import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { KpiMeta } from "../types";
import type { TemaConfig } from "../teman/tema-config";
import { TEMA_FARG_HEX } from "../teman/tema-config";
import { sammanfatta } from "../utils/kpiStats";
import type { KpiIndex, KpiSammanfattning } from "../utils/kpiStats";
import { byggGrupper, uppdelningsText } from "../utils/temaRader";
import type { TabellRad } from "../utils/temaRader";
import { kpiDecimaler, fmtPeriod } from "../utils/format";
import { fmt as fmtBas, fmtStor } from "../utils/format";
import Spar from "../charts/Spar";
import RadTip from "./RadTip";
import DiagramIkon from "./DiagramIkon";
import { useContainerWidth } from "../hooks/useContainerWidth";

/** Typografiskt minustecken */
/** Typografiskt minustecken; `fmt` exakt (skärmläsare, tooltipens stora tal), `kort` förkortar stora tal */
const fmt = (v: number | null | undefined, dec: number) => fmtBas(v, dec).replace(/^-/, "−");
const kort = (v: number | null | undefined, dec: number, ref?: number | null) => fmtStor(v, dec, ref).replace(/^-/, "−");

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

/**
 * Förändringen inom parentes; färg bara när önskvärd riktning är känd (lågt är bra).
 * I tabellen i samma förkortade enhet som värdet, i tooltipen exakt.
 */
function deltaFor(s: KpiSammanfattning, dec: number, lagtArBra: boolean, exakt = false) {
  const f = s.forandring[s.period > 9999 ? 1 : 10];
  if (!f) return null;
  const v = f.varde;
  const tal = (x: number) => (exakt ? fmt(x, dec) : kort(x, dec, s.varde));
  const text = v === 0 ? "(±0)" : v > 0 ? `(+${tal(v)})` : `(${tal(v)})`;
  const klass = !lagtArBra || v === 0 ? "" : v < 0 ? "kt-battre" : "kt-samre";
  return { text, klass };
}

/** Platsens bricka: fyra färgsteg bara när önskvärd riktning är känd, annars neutral */
function brickaFor(s: KpiSammanfattning, lagtArBra: boolean) {
  if (!lagtArBra || s.rang == null || s.n < 2) return { klass: "" };
  const andel = s.rang / s.n; // lågt värde är bra: hög platssiffra = lågt värde
  return { klass: andel > 0.75 ? "kt-topp" : andel > 0.5 ? "kt-ovre" : andel > 0.25 ? "kt-nedre" : "kt-botten" };
}

/**
 * Platsens färg i texten bredvid spåret: bara när önskvärd riktning är känd, och bara i
 * ytterfjärdedelarna (samma fjärdedelar som spårets tonade fält)
 */
function platsKlass(s: KpiSammanfattning, lagtArBra: boolean) {
  if (!lagtArBra || s.rang == null || s.n < 2) return "";
  const andel = s.rang / s.n; // lågt värde är bra: hög platssiffra = lågt värde
  return andel > 0.75 ? "kt-battre" : andel <= 0.25 ? "kt-samre" : "";
}

const Pil = () => (
  <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
    <path d="M4 2l4 4-4 4" />
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

  const allaRader = useMemo(() => {
    const m = new Map<string, TabellRad>();
    const lagg = (r: TabellRad) => { m.set(r.kpiId, r); r.nedbrytningar.forEach((g) => g.rader.forEach(lagg)); };
    grupper.forEach((g) => g.rader.forEach(lagg));
    return m;
  }, [grupper]);

  /** Indikatorer som har uppdelningar och data för den valda enheten */
  const delbara = useMemo(
    () => [...allaRader.values()].filter((r) => r.nedbrytningar.length > 0 && sammanfattningar.has(r.kpiId)).map((r) => r.kpiId),
    [allaRader, sammanfattningar],
  );
  const allaUtfallda = delbara.length > 0 && delbara.every((id) => oppna.has(id));

  const vaxla = (id: string) => setOppna((prev) => {
    const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n;
  });

  // Utskrift visar alla uppdelningar och återställer sedan läget
  useEffect(() => {
    let fore: Set<string> | null = null;
    const foreUtskrift = () => { setOppna((prev) => { fore = prev; return new Set(delbara); }); };
    const efterUtskrift = () => { if (fore) setOppna(fore); };
    window.addEventListener("beforeprint", foreUtskrift);
    window.addEventListener("afterprint", efterUtskrift);
    return () => {
      window.removeEventListener("beforeprint", foreUtskrift);
      window.removeEventListener("afterprint", efterUtskrift);
    };
  }, [delbara]);

  const visaTip = (kpiId: string, el: HTMLElement) => {
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (iSpar.current) return;
      const r = el.getBoundingClientRect();
      setTip({ kpiId, ankare: { x: r.left + r.width * 0.3, topp: r.top, botten: r.bottom } });
    }, tip ? 40 : 170);
  };
  const doljTip = () => { clearTimeout(timer.current); setTip(null); };

  /** Rader i fallande ordning efter den valda enhetens värde (t.ex. branscher) */
  const sorterade = (rader: TabellRad[]) =>
    [...rader].sort((a, b) => (sammanfattningar.get(b.kpiId)?.varde ?? -Infinity) - (sammanfattningar.get(a.kpiId)?.varde ?? -Infinity));

  const renderRad = (r: TabellRad, sub: boolean) => {
    const s = sammanfattningar.get(r.kpiId);
    if (!s) return null;
    const dec = kpiDecimaler(s.varde, r.enhet);
    const harNed = !sub && r.nedbrytningar.length > 0;
    const arOppen = oppna.has(r.kpiId);
    const arAntal = r.enhet === "antal";
    const delta = deltaFor(s, dec, r.lagtArBra);
    const gammal = s.period < s.nyastePeriod;

    const aria = [`${r.helaNamn}: ${fmt(s.varde, dec)} ${enhetText(r.enhet)}${gammal ? ` (${fmtPeriod(s.period)})` : ""}`,
      s.riket != null ? `riket ${fmt(s.riket, dec)}` : "",
      s.rang != null ? `plats ${s.rang} av ${s.n}` : ""].filter(Boolean).join(", ");
    const flera = r.nedbrytningar.length > 1;
    return (
      <Fragment key={r.kpiId}>
        <div
          className={`kt-rad ${sub ? "kt-rad-sub" : ""} ${pekad === r.kpiId ? "kt-pekad" : ""}`}
          onClick={() => onOpenKpi(r.kpiId)}
          onMouseEnter={(e) => { setPekad(r.kpiId); visaTip(r.kpiId, e.currentTarget); }}
          onMouseLeave={() => { setPekad(null); doljTip(); }}
        >
          <div className="kt-c-etikett min-w-0">
            <button className="kt-namn-knapp" aria-label={`${aria}. Öppna graf och karta`}
                    onClick={(e) => { e.stopPropagation(); onOpenKpi(r.kpiId); }}>
              {/* Symbolen följer sista ordet, så att den aldrig hamnar ensam på en rad */}
              {r.namn.split(" ").slice(0, -1).join(" ")}{r.namn.includes(" ") ? " " : ""}
              <span className="whitespace-nowrap">{r.namn.split(" ").at(-1)}<DiagramIkon /></span>
            </button>
            {harNed && (
              <button className="kt-uppdela" aria-expanded={arOppen}
                      onClick={(e) => { e.stopPropagation(); vaxla(r.kpiId); }}>
                <Pil />
                {arOppen ? (flera ? "Dölj uppdelningarna" : "Dölj uppdelningen")
                         : `Visa ${uppdelningsText(r.nedbrytningar)}`}
              </button>
            )}
          </div>
          <div className="kt-c-varde kt-tal kt-varde">
            <b>{kort(s.varde, dec)}</b>{delta && <> <span className={`kt-delta ${delta.klass}`}>{delta.text}</span></>}
            <span className="kt-enhet">{s.ki ? `${enhetText(r.enhet)}, enkät` : enhetText(r.enhet)}{gammal && <>, <span className="kt-aldre" title={`Senaste värdet för ${enhetNamn}. Statistiken finns för andra enheter till och med ${fmtPeriod(s.nyastePeriod)}`}>{fmtPeriod(s.period)}</span></>}</span>
          </div>
          <div className="kt-c-riket kt-tal kt-riket">{s.riket != null ? kort(s.riket, dec) : "–"}</div>
          <div className="kt-c-spar"
               onMouseEnter={() => { iSpar.current = true; doljTip(); }}
               onMouseLeave={(e) => { iSpar.current = false; visaTip(r.kpiId, e.currentTarget.parentElement as HTMLElement); }}>
            <Spar
              enheter={s.enheter} valdKod={valdKod}
              riket={arAntal ? null : s.riket} halland={arAntal ? null : s.halland}
              namn={enhetsnamn} fmt={(v) => kort(v, dec)} logSkala={arAntal}
              width={Math.max(200, sparBredd || 260)} height={sub ? 21 : 26}
              visaHalland={!arRegion && pekad === r.kpiId}
              kvartiler lagtArBra={r.lagtArBra}
              ariaLabel={aria}
            />
          </div>
          <div className="kt-c-plats kt-plats-text">
            {s.rang != null && <>(plats <b className={platsKlass(s, r.lagtArBra)}>{s.rang}</b>)</>}
          </div>
        </div>
        {harNed && arOppen && (
          <div className="kt-uppdelning">
            {r.nedbrytningar.map((g) => (
              <Fragment key={g.grupp}>
                {flera && <div className="kt-uppdelning-rubrik">{g.grupp.charAt(0).toUpperCase() + g.grupp.slice(1)}</div>}
                {(g.sortera ? sorterade(g.rader) : g.rader).map((sr) => renderRad(sr, true))}
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
        <div className="kt-c-etikett">
          Indikator<small className="kt-klick-hint"><DiagramIkon className="kt-mer-huvud" />Klicka på en rad för diagram och karta</small>
          {delbara.length > 0 && (
            <button className="kt-uppdela kt-uppdela-alla" aria-expanded={allaUtfallda}
                    onClick={() => setOppna(allaUtfallda ? new Set() : new Set(delbara))}>
              <Pil />{allaUtfallda ? "Fäll ihop alla uppdelningar" : "Fäll ut alla uppdelningar"}
            </button>
          )}
        </div>
        <div className="kt-c-varde kt-tal">{enhetNamn}<small>Senaste år (förändring på tio år)</small></div>
        <div className="kt-c-riket kt-tal">Riket<small>Senaste år</small></div>
        <div className="kt-c-spar" ref={sparRef}>
          {enhetNamn} och landets {enhetsord}
          <small>
            Grå punkter är {enhetsord}, det tonade fältet den mittersta hälften. Svart streck
            riket{arRegion ? "" : ", streckat Halland"}. Platsen inom parentes bland {nEnheter}, 1 = högst.
          </small>
        </div>
        <div className="kt-c-plats" aria-hidden />
      </div>

      {grupper.map((g, gi) => (
        <Fragment key={g.rubrik ?? `g${gi}`}>
          {g.rubrik && <div className="kt-band">{g.rubrik}</div>}
          <div className={g.rubrik ? "kt-band-rader" : gi === 0 ? "pt-1.5" : "pt-2.5"}>
            {g.rader.map((r) => renderRad(r, false))}
          </div>
        </Fragment>
      ))}

      {tip && tipRad && tipS && (() => {
        const dec = kpiDecimaler(tipS.varde, tipRad.enhet);
        return (
          <RadTip
            temaNamn={tema.temaNamn} farg={farg} namn={tipRad.helaNamn} enhet={enhetText(tipRad.enhet)}
            beskrivning={tipRad.beskrivning} s={tipS} enhetNamn={enhetNamn} valdKod={valdKod}
            riketSerie={idx.get(tipRad.kpiId)?.get("0000") ?? []}
            hallandSerie={idx.get(tipRad.kpiId)?.get("0013") ?? null}
            enhetsnamn={enhetsnamn} fmt={(v) => kort(v, dec)} fmtExakt={(v) => fmt(v, dec)}
            delta={deltaFor(tipS, dec, tipRad.lagtArBra, true)} bricka={brickaFor(tipS, tipRad.lagtArBra)}
            ankare={tip.ankare}
          />
        );
      })()}
    </div>
  );
}
