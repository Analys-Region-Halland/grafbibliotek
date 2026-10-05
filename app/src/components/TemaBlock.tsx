import type { KpiMeta } from "../types";
import type { TemaConfig } from "../teman/tema-config";
import { TEMA_FARG_HEX } from "../teman/tema-config";
import type { AnalysText } from "../hooks/useAnalys";
import AiUpplysning, { AiEtikett } from "./AiUpplysning";
import AnalysArtikel from "./AnalysArtikel";
import AnalysFigur from "./AnalysFigur";
import TemaTabell from "./TemaTabell";
import JamforTabell from "./JamforTabell";
import type { KpiIndex } from "../utils/kpiStats";

interface Props {
  tema: TemaConfig;
  meta: KpiMeta[];
  idx: KpiIndex;
  enhetsnamn: Map<string, string>;
  /** Enheten som tabellen utgår från (länet när alla kommuner visas sida vid sida) */
  valdKod: string;
  /** Alla kommuner sida vid sida i stället för indikatortabellen */
  arAlla: boolean;
  /** Sidans enhet, t.ex. "Halmstad", "Halland (länet)" eller "Hallands kommuner" */
  enhetNamn: string;
  /** Analysen och enheten den gäller (länets analys när alla kommuner visas) */
  analys?: AnalysText;
  analysEnhet: string;
  genererad?: string;
  onOpenKpi: (kpiId: string) => void;
  onValjEnhet: (kod: string) => void;
}

const analysId = (temaId: string) => `analys-${temaId}`;

/** Ingången överst: analysens rubrik och ingress, med genväg till hela texten under tabellen */
function AnalysIngang({ analys, analysEnhet, accent, onLas }: {
  analys: AnalysText; analysEnhet: string; accent: string; onLas: () => void;
}) {
  return (
    <button
      onClick={onLas}
      className="group/analys w-full text-left bg-white border border-neutral-200 hover:border-neutral-300
                 rounded-lg px-5 sm:px-6 py-4 sm:py-5 mb-7 cursor-pointer transition-colors
                 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gron-2
                 border-l-[3px]"
      style={{ borderLeftColor: accent }}
    >
      <p className="text-[11px] font-semibold tracking-[0.06em] uppercase text-neutral-500 mb-1.5 flex items-center gap-2">
        Analys för {analysEnhet} <AiEtikett />
      </p>
      <p className="analys-serif text-[19px] sm:text-[21px] font-semibold leading-snug text-black">
        {analys.rubrik}
      </p>
      <p className="analys-serif text-[15px] sm:text-[16px] leading-relaxed text-neutral-800 mt-1.5 line-clamp-3 sm:line-clamp-none max-w-[72ch]">
        {analys.ingress}
      </p>
      <span className="inline-flex items-center gap-1.5 mt-3 text-[13px] font-medium text-neutral-900
                       underline decoration-neutral-300 underline-offset-4 group-hover/analys:decoration-neutral-900">
        Läs hela analysen under tabellen
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
             strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 5v14" /><path d="M6 13l6 6 6-6" />
        </svg>
      </span>
    </button>
  );
}

/** Ett område: ingång till analysen, tabellen och hela analysen */
export default function TemaBlock({
  tema, meta, idx, enhetsnamn, valdKod, arAlla, enhetNamn, analys, analysEnhet, genererad,
  onOpenKpi, onValjEnhet,
}: Props) {
  const farg = TEMA_FARG_HEX[tema.temaFarg];
  const lasAnalysen = () =>
    document.getElementById(analysId(tema.temaId))?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="tema-fade-in">
      <header className="mb-5">
        <p className="text-[12px] font-medium text-neutral-500 mb-1 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: farg.medel }} />
          {enhetNamn}
        </p>
        <h2 className="text-[24px] sm:text-[28px] font-semibold text-neutral-900 tracking-tight leading-tight">
          {tema.temaNamn}
        </h2>
      </header>

      {analys && <AnalysIngang analys={analys} analysEnhet={analysEnhet} accent={farg.djup} onLas={lasAnalysen} />}

      {arAlla ? (
        <JamforTabell tema={tema} meta={meta} idx={idx} valdKod={valdKod} onOpenKpi={onOpenKpi} onValjEnhet={onValjEnhet} />
      ) : (
        <TemaTabell tema={tema} meta={meta} idx={idx} enhetsnamn={enhetsnamn} valdKod={valdKod}
                    enhetNamn={enhetNamn.replace(" (länet)", "")} onOpenKpi={onOpenKpi} />
      )}

      {analys && (
        <section id={analysId(tema.temaId)} className="mt-12 pt-8 border-t border-neutral-200 max-w-[700px] scroll-mt-24">
          <p className="flex items-center gap-2 text-[12px] font-semibold tracking-wide uppercase mb-2"
             style={{ color: farg.djup }}>
            <span className="w-2 h-2 rounded-full" style={{ background: farg.medel }} />
            Analys för {analysEnhet} <AiEtikett />
          </p>
          <h2 className="analys-rubrik mb-4">{analys.rubrik}</h2>
          <AiUpplysning genererad={genererad} />
          <AnalysArtikel text={analys} accent={farg.djup} visaRubrik={false} visaIngress={false}
                         renderFigur={(f) => (
                           <AnalysFigur figur={f} idx={idx} meta={meta} tema={tema} valdKod={valdKod}
                                        enhetNamn={analysEnhet} enhetsnamn={enhetsnamn} onOpenKpi={onOpenKpi} />
                         )} />
        </section>
      )}
    </div>
  );
}
