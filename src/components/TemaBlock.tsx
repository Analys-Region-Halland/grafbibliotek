import { useState, Fragment } from "react";
import type { KpiRow, KpiMeta } from "../types";
import type { TemaConfig, Sektion } from "../teman/tema-config";
import { TEMA_FARG_KLASSER } from "../teman/tema-config";
import KpiKort from "./KpiKort";

interface Props {
  tema: TemaConfig;
  meta: KpiMeta[];
  kommunKpiData: Map<string, KpiRow[]>;
  nettoKpis: Set<string>;
  onOpenKpi: (kpiId: string) => void;
  onStartBerattelse: () => void;
}

/** Hämta KPI-metadata, filtrera bort de utan data */
function resolveKpis(
  ids: string[],
  meta: KpiMeta[],
  kommunKpiData: Map<string, KpiRow[]>,
): KpiMeta[] {
  return ids
    .map((id) => meta.find((x) => x.kpi_id === id))
    .filter((m): m is KpiMeta =>
      m != null && (kommunKpiData.get(m.kpi_id)?.length ?? 0) > 0,
    );
}

/** Grupp av underkort */
interface SubGrupp {
  gruppNamn: string;
  kort: { kpiId: string; namn: string; beskrivning: string; enhet: string; data: KpiRow[] }[];
}

/** Bygg expand-underkort från undersektioner */
function buildSubKort(
  sektion: Sektion,
  tema: TemaConfig,
  meta: KpiMeta[],
  kommunKpiData: Map<string, KpiRow[]>,
  nettoKpis: Set<string>,
): SubGrupp[] {
  if (!sektion.undersektioner?.length) return [];
  return sektion.undersektioner
    .map((us) => ({
      gruppNamn: us.namn,
      kort: resolveKpis(us.kpiIds, meta, kommunKpiData).map((m) => ({
        kpiId: m.kpi_id,
        namn: tema.visningsnamn[m.kpi_id] ??
          (nettoKpis.has(m.kpi_id)
            ? m.kpi_namn.replace(/,\s*antal\s*$/i, "")
            : m.kpi_namn),
        beskrivning: m.beskrivning,
        enhet: nettoKpis.has(m.kpi_id) ? "per 1 000 inv." : m.enhet,
        data: kommunKpiData.get(m.kpi_id) ?? [],
      })),
    }))
    .filter((g) => g.kort.length > 0);
}

/** Fullständigt visningsnamn för ett KPI */
function getFullNamn(
  kpiId: string,
  tema: TemaConfig,
  meta: KpiMeta[],
  nettoKpis: Set<string>,
): string {
  if (tema.visningsnamn[kpiId]) return tema.visningsnamn[kpiId];
  const m = meta.find((x) => x.kpi_id === kpiId);
  if (!m) return kpiId;
  if (nettoKpis.has(kpiId)) return m.kpi_namn.replace(/,\s*antal\s*$/i, "");
  return m.kpi_namn;
}

/** CSS-variabelvärde för temafärgad vänsterkant på underkort */
const ACCENT_COLORS: Record<string, string> = {
  "bg-gron-2": "#00AB60",
  "bg-bla-2": "#2DB8F6",
  "bg-rod-2": "#FF5F4A",
  "bg-lila-2": "#6473D9",
  "bg-gul-1": "#FF7E00",
  "bg-brun-2": "#895B42",
};

export default function TemaBlock({
  tema, meta, kommunKpiData, nettoKpis, onOpenKpi, onStartBerattelse,
}: Props) {
  const farg = TEMA_FARG_KLASSER[tema.temaFarg];
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const accentHex = ACCENT_COLORS[farg.dot] ?? "#999";

  const toggleExpand = (sectionId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  let cardIdx = 0;
  const cells: React.JSX.Element[] = [];
  let föregåendeGrupp = "";

  for (const sektion of tema.sektioner) {
    // Grupprubrik — renderas när gruppen ändras
    if (sektion.gruppRubrik && sektion.gruppRubrik !== föregåendeGrupp) {
      föregåendeGrupp = sektion.gruppRubrik;
      cells.push(
        <div key={`grp-${sektion.gruppRubrik}`} className="col-span-full mt-4 mb-1 first:mt-0">
          <h3 className="font-data text-[12px] font-semibold text-neutral-600 tracking-wide">
            {sektion.gruppRubrik}
          </h3>
        </div>,
      );
    }
    let huvudKpis = resolveKpis(sektion.kpiIds, meta, kommunKpiData);
    if (huvudKpis.length === 0) continue;

    // Sortera efter senaste värde (fallande) om konfigurerat
    if (sektion.sorteraEfterVarde && huvudKpis.length > 1) {
      huvudKpis = [...huvudKpis].sort((a, b) => {
        const aRows = kommunKpiData.get(a.kpi_id) ?? [];
        const bRows = kommunKpiData.get(b.kpi_id) ?? [];
        const aVal = [...aRows].sort((x, y) => y.ar - x.ar)[0]?.varde ?? 0;
        const bVal = [...bRows].sort((x, y) => y.ar - x.ar)[0]?.varde ?? 0;
        return (bVal ?? 0) - (aVal ?? 0);
      });
    }

    const isSingle = sektion.kpiIds.length === 1 || huvudKpis.length === 1;

    if (isSingle) {
      const m = huvudKpis[0];
      const subGrupper = buildSubKort(sektion, tema, meta, kommunKpiData, nettoKpis);
      const harSub = subGrupper.some((g) => g.kort.length > 0);
      const isExp = expanded.has(sektion.id);
      const fullNamn = getFullNamn(m.kpi_id, tema, meta, nettoKpis);

      cells.push(
        <div key={m.kpi_id} className="flex flex-col gap-2">
          <KpiKort
            kortNamn={fullNamn}
            beskrivning={m.beskrivning}
            enhet={nettoKpis.has(m.kpi_id) ? "per 1 000 inv." : m.enhet}
            data={kommunKpiData.get(m.kpi_id) ?? []}
            dotColor={farg.dot}
            hasExpand={harSub}
            isExpanded={isExp}
            onToggleExpand={() => toggleExpand(sektion.id)}
            animDelay={cardIdx++ * 40}
            onClick={() => onOpenKpi(m.kpi_id)}
          />

          {/* Underkort som faller ut */}
          {harSub && (
            <div
              className="grid transition-[grid-template-rows] duration-300 ease-in-out"
              style={{ gridTemplateRows: isExp ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <div
                  className="flex flex-col gap-1.5 pl-2"
                  style={{ "--sub-accent": accentHex } as React.CSSProperties}
                >
                  {subGrupper.map((grupp, gi) => (
                    <Fragment key={grupp.gruppNamn}>
                      <p className={`font-data text-[9px] font-semibold text-neutral-500 tracking-wide
                                    ${gi === 0 ? "mt-0" : "mt-1"}`}>
                        {grupp.gruppNamn}
                      </p>
                      {grupp.kort.map((sub, si) => (
                        <KpiKort
                          key={sub.kpiId}
                          kortNamn={sub.namn}
                          beskrivning={sub.beskrivning}
                          enhet={sub.enhet}
                          data={sub.data}
                          dotColor={farg.dot}
                          compact
                          animDelay={si * 50}
                          onClick={() => onOpenKpi(sub.kpiId)}
                        />
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
      // Fler-KPI-sektion: sektionsrubrik + individuella kort
      cells.push(
        <div key={`hdr-${sektion.id}`} className="col-span-full mt-4 mb-1 first:mt-0">
          <h3 className="font-data text-[12px] font-semibold text-neutral-600 tracking-wide">
            {sektion.namn}
          </h3>
        </div>,
      );
      for (const m of huvudKpis) {
        const fullNamn = getFullNamn(m.kpi_id, tema, meta, nettoKpis);
        cells.push(
          <div key={m.kpi_id} className="flex flex-col gap-2">
            <KpiKort
              kortNamn={fullNamn}
              beskrivning={m.beskrivning}
              enhet={nettoKpis.has(m.kpi_id) ? "per 1 000 inv." : m.enhet}
              data={kommunKpiData.get(m.kpi_id) ?? []}
              dotColor={farg.dot}
              animDelay={cardIdx++ * 40}
              onClick={() => onOpenKpi(m.kpi_id)}
            />
          </div>,
        );
      }
    }
  }

  return (
    <div className="tema-fade-in">
      {/* Temarubrik */}
      <div className="flex items-center gap-2.5 mb-5">
        <div className={`w-2.5 h-2.5 rounded-full ${farg.dot}`} />
        <h2 className="font-data text-[17px] font-bold text-neutral-900 tracking-tight">
          {tema.temaNamn}
        </h2>
        {tema.temaId === "befolkning" && (
          <button
            onClick={onStartBerattelse}
            className="flex items-center gap-1.5 ml-1 px-2.5 py-1 rounded-md
                       border border-neutral-200 bg-white
                       text-neutral-500 hover:text-neutral-800 hover:border-neutral-300
                       font-data text-[10px] font-medium
                       active:scale-[0.97] transition-all duration-150 cursor-pointer"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <span className="hidden sm:inline">Berättelse</span>
          </button>
        )}
      </div>

      {/* Kortgrid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
        {cells.map((el) => (
          <Fragment key={el.key}>{el}</Fragment>
        ))}
      </div>
    </div>
  );
}
