import { useState, Fragment } from "react";
import type { KpiRow, KpiMeta } from "../types";
import type { TemaConfig, Sektion } from "../teman/tema-config";
import { TEMA_FARG_HEX } from "../teman/tema-config";
import type { AnalysText } from "../hooks/useAnalys";
import KpiKort from "./KpiKort";
import { AiEtikett } from "./AiUpplysning";
import TemaTabell from "./TemaTabell";
import JamforTabell from "./JamforTabell";
import type { KpiIndex } from "../utils/kpiStats";

type Visning = "tabell" | "jamfor" | "kort";
const VISNING_NYCKEL = "halland-i-siffror.visning";
function lasVisning(): Visning {
  try {
    const v = localStorage.getItem(VISNING_NYCKEL);
    if (v === "tabell" || v === "jamfor" || v === "kort") return v;
  } catch { /* privat läge */ }
  return "tabell";
}

interface Props {
  tema: TemaConfig;
  meta: KpiMeta[];
  kommunKpiData: Map<string, KpiRow[]>;
  /** Länets serier, för jämförelse när en kommun är vald (tom karta för länet självt) */
  hallandKpiData: Map<string, KpiRow[]>;
  nettoKpis: Set<string>;
  enhetNamn: string;
  analys?: AnalysText;
  onOpenAnalys: () => void;
  onOpenKpi: (kpiId: string) => void;
  idx: KpiIndex;
  enhetsnamn: Map<string, string>;
  valdKod: string;
  onValjEnhet: (kod: string) => void;
}

/** Hämta KPI-metadata, filtrera bort de utan data */
function resolveKpis(ids: string[], meta: KpiMeta[], kommunKpiData: Map<string, KpiRow[]>): KpiMeta[] {
  return ids
    .map((id) => meta.find((x) => x.kpi_id === id))
    .filter((m): m is KpiMeta => m != null && (kommunKpiData.get(m.kpi_id)?.length ?? 0) > 0);
}

/** Fullständigt visningsnamn för ett KPI */
function visningsnamn(m: KpiMeta, tema: TemaConfig, nettoKpis: Set<string>): string {
  if (tema.visningsnamn[m.kpi_id]) return tema.visningsnamn[m.kpi_id];
  if (nettoKpis.has(m.kpi_id)) return m.kpi_namn.replace(/,\s*antal\s*$/i, "");
  return m.kpi_namn;
}

function SektionsRubrik({ children, forsta }: { children: React.ReactNode; forsta: boolean }) {
  return (
    <div className={`col-span-full flex items-center gap-3 ${forsta ? "" : "mt-5"} mb-0.5`}>
      <h3 className="text-[11.5px] font-semibold tracking-[0.06em] uppercase text-neutral-500 shrink-0">
        {children}
      </h3>
      <span className="flex-1 h-px bg-neutral-200" />
    </div>
  );
}

/** Analysens rubrik och ingress överst i temat, med knapp till hela texten */
function AnalysBand({ analys, accent, onOpen }: { analys: AnalysText; accent: string; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="group/analys w-full text-left bg-white border border-neutral-200 hover:border-neutral-300
                 rounded-lg px-5 sm:px-6 py-4 sm:py-5 mb-7 cursor-pointer transition-colors
                 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gron-2
                 border-l-[3px]"
      style={{ borderLeftColor: accent }}
    >
      <p className="text-[11px] font-semibold tracking-[0.06em] uppercase text-neutral-500 mb-1.5 flex items-center gap-2">Analys <AiEtikett /></p>
      <p className="analys-serif text-[19px] sm:text-[21px] font-semibold leading-snug text-black">
        {analys.rubrik}
      </p>
      <p className="analys-serif text-[15px] sm:text-[16px] leading-relaxed text-neutral-800 mt-1.5 line-clamp-3 sm:line-clamp-none max-w-[72ch]">
        {analys.ingress}
      </p>
      <span className="inline-flex items-center gap-1.5 mt-3 text-[13px] font-medium text-neutral-900
                       underline decoration-neutral-300 underline-offset-4 group-hover/analys:decoration-neutral-900">
        Läs analysen
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
             strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 12h14" /><path d="M13 6l6 6-6 6" />
        </svg>
      </span>
    </button>
  );
}

export default function TemaBlock({
  tema, meta, kommunKpiData, hallandKpiData, nettoKpis, enhetNamn, analys, onOpenAnalys, onOpenKpi,
  idx, enhetsnamn, valdKod, onValjEnhet,
}: Props) {
  const [visning, setVisningState] = useState<Visning>(lasVisning);
  const setVisning = (v: Visning) => {
    setVisningState(v);
    try { localStorage.setItem(VISNING_NYCKEL, v); } catch { /* privat läge */ }
  };
  const farg = TEMA_FARG_HEX[tema.temaFarg];
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const lagtArBra = new Set(tema.lagtArBra ?? []);

  const toggleExpand = (id: string) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const kortProps = (m: KpiMeta) => ({
    kortNamn: visningsnamn(m, tema, nettoKpis),
    beskrivning: m.beskrivning,
    enhet: nettoKpis.has(m.kpi_id) ? "per 1 000 inv." : m.enhet,
    data: kommunKpiData.get(m.kpi_id) ?? [],
    hallandData: hallandKpiData.get(m.kpi_id),
    accent: farg.medel,
    lagtArBra: lagtArBra.has(m.kpi_id),
    onClick: () => onOpenKpi(m.kpi_id),
  });

  let cardIdx = 0;
  const cells: React.JSX.Element[] = [];
  let foregaendeGrupp = "";
  let forstaRubrik = true;

  for (const sektion of tema.sektioner) {
    if (sektion.gruppRubrik && sektion.gruppRubrik !== foregaendeGrupp) {
      foregaendeGrupp = sektion.gruppRubrik;
      cells.push(<SektionsRubrik key={`grp-${sektion.gruppRubrik}`} forsta={forstaRubrik}>{sektion.gruppRubrik}</SektionsRubrik>);
      forstaRubrik = false;
    }
    let huvud = resolveKpis(sektion.kpiIds, meta, kommunKpiData);
    if (huvud.length === 0) continue;

    if (sektion.sorteraEfterVarde && huvud.length > 1) {
      const senaste = (id: string) =>
        [...(kommunKpiData.get(id) ?? [])].sort((x, y) => y.ar - x.ar)[0]?.varde ?? 0;
      huvud = [...huvud].sort((a, b) => senaste(b.kpi_id) - senaste(a.kpi_id));
    }

    if (sektion.kpiIds.length === 1 || huvud.length === 1) {
      const m = huvud[0];
      const subGrupper = buildSubGrupper(sektion, meta, kommunKpiData);
      const antalSub = subGrupper.reduce((n, g) => n + g.kpis.length, 0);
      const isExp = expanded.has(sektion.id);

      cells.push(
        <div key={m.kpi_id} className="flex flex-col gap-2">
          <KpiKort
            {...kortProps(m)}
            hasExpand={antalSub > 0}
            antalNedbrytningar={antalSub}
            isExpanded={isExp}
            onToggleExpand={() => toggleExpand(sektion.id)}
            animDelay={cardIdx++ * 30}
          />
          {antalSub > 0 && (
            <div className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                 style={{ gridTemplateRows: isExp ? "1fr" : "0fr" }}>
              <div className="overflow-hidden">
                <div className="flex flex-col gap-1.5 pl-2">
                  {isExp && subGrupper.map((g) => (
                    <Fragment key={g.namn}>
                      <p className="text-[10.5px] font-semibold text-neutral-500 mt-1">{g.namn}</p>
                      {g.kpis.map((sm, si) => (
                        <KpiKort key={sm.kpi_id} {...kortProps(sm)} compact animDelay={si * 40} />
                      ))}
                    </Fragment>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>,
      );
    } else {
      cells.push(<SektionsRubrik key={`hdr-${sektion.id}`} forsta={forstaRubrik}>{sektion.namn}</SektionsRubrik>);
      forstaRubrik = false;
      for (const m of huvud) {
        cells.push(
          <div key={m.kpi_id} className="flex flex-col">
            <KpiKort {...kortProps(m)} animDelay={cardIdx++ * 30} />
          </div>,
        );
      }
    }
  }

  return (
    <div className="tema-fade-in">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
        <p className="text-[12px] font-medium text-neutral-500 mb-1 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: farg.medel }} />
          {enhetNamn}
        </p>
        <h2 className="text-[24px] sm:text-[28px] font-semibold text-neutral-900 tracking-tight leading-tight">
          {tema.temaNamn}
        </h2>
        </div>
        <div className="flex p-0.5 bg-neutral-100 rounded-lg" role="group" aria-label="Visa som">
          {([["tabell", "Tabell"], ["jamfor", "Jämför kommuner"], ["kort", "Kort"]] as [Visning, string][]).map(([v, etikett]) => (
            <button key={v} onClick={() => setVisning(v)} aria-pressed={visning === v}
                    className={`px-3 py-1 rounded-md text-[12.5px] font-medium cursor-pointer transition-colors
                                focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gron-2 ${
                      visning === v ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-800"}`}>
              {etikett}
            </button>
          ))}
        </div>
      </header>

      {analys && <AnalysBand analys={analys} accent={farg.djup} onOpen={onOpenAnalys} />}

      {visning === "tabell" && (
        <TemaTabell tema={tema} meta={meta} idx={idx} enhetsnamn={enhetsnamn} valdKod={valdKod} enhetNamn={enhetNamn.replace(" (länet)", "")}
                    onOpenKpi={onOpenKpi} />
      )}
      {visning === "jamfor" && (
        <JamforTabell tema={tema} meta={meta} idx={idx} valdKod={valdKod} onOpenKpi={onOpenKpi} onValjEnhet={onValjEnhet} />
      )}
      {visning === "kort" && (<>
      <p className="mb-3 text-[11.5px] text-neutral-500 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="inline-flex items-center gap-1.5">
          <svg width="18" height="6" aria-hidden><line x1="0" y1="3" x2="18" y2="3" stroke="#3D4245" strokeWidth="1.5" /></svg>
          {enhetNamn}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="18" height="6" aria-hidden><line x1="0" y1="3" x2="18" y2="3" stroke="#83888A" strokeWidth="1" strokeDasharray="3,2.5" /></svg>
          Riket
        </span>
        <span>Plats 1 = högsta värdet. Klicka på ett kort för graf och karta.</span>
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 items-stretch">
        {cells}
      </div>
      </>)}

    </div>
  );
}

function buildSubGrupper(sektion: Sektion, meta: KpiMeta[], kommunKpiData: Map<string, KpiRow[]>) {
  return (sektion.undersektioner ?? [])
    .map((us) => ({ namn: us.namn, kpis: resolveKpis(us.kpiIds, meta, kommunKpiData) }))
    .filter((g) => g.kpis.length > 0);
}
