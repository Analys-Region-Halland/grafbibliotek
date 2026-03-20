import { useState, useMemo, useCallback } from "react";
import { useData } from "./hooks/useData";
import { HALLAND_KOMMUNER } from "./types";
import { TEMAN, getAllNettoKpis } from "./teman";
import KommunValjare from "./components/KommunValjare";
import TemaNav from "./components/TemaNav";
import TemaBlock from "./components/TemaBlock";
import KpiModal from "./components/KpiModal";
import GuidadBerattelse from "./components/GuidadBerattelse";
import OmModal from "./components/OmModal";

/** Alla netto-KPI:er samlade från samtliga teman */
const NETTO_KPIS = getAllNettoKpis();


export default function App() {
  const [aktivtTema, setAktivtTema] = useState("befolkning");
  const { data, meta, loading, temaLoading, error, temaError, progress, retryTema } = useData(aktivtTema);
  const [valdKommun, setValdKommun] = useState("0013");
  const [openKpi, setOpenKpi] = useState<string | null>(null);
  const [visaBerattelse, setVisaBerattelse] = useState(false);
  const [visaOm, setVisaOm] = useState(false);

  const valdEnhet = HALLAND_KOMMUNER.find((k) => k.kod === valdKommun);
  const kommunNamn = valdEnhet?.namn ?? "";
  const isRegion = valdEnhet?.typ === "L";

  const aktivTemaConfig = TEMAN.find((t) => t.temaId === aktivtTema);

  const handleTemaChange = useCallback((temaId: string) => {
    setAktivtTema(temaId);
    setOpenKpi(null);
  }, []);

  const handleOpenKpi = useCallback((kpiId: string) => setOpenKpi(kpiId), []);
  const handleStartBerattelse = useCallback(() => setVisaBerattelse(true), []);



  // Rikets befolkning — cachad separat (ändras bara vid nytt tema, inte vid kommunbyte)
  const riketPopCache = useMemo(() => {
    const m = new Map<number, number>();
    for (const d of data) {
      if (d.kpi_id === "N01951" && d.kommun_kod === "0000" && d.varde != null) {
        m.set(d.ar, d.varde);
      }
    }
    return m;
  }, [data]);

  const kommunKpiData = useMemo(() => {
    const filtered = data.filter((d) => d.kommun_kod === valdKommun);
    const grouped = new Map<string, typeof filtered>();
    filtered.forEach((row) => {
      const existing = grouped.get(row.kpi_id) ?? [];
      existing.push(row);
      grouped.set(row.kpi_id, existing);
    });

    // Per 1 000 inv. för netto-KPI:er
    const popByYear = new Map<number, number>();
    (grouped.get("N01951") ?? []).forEach((d) => {
      if (d.varde != null) popByYear.set(d.ar, d.varde);
    });
    const riketPopByYear = riketPopCache;
    for (const kpiId of NETTO_KPIS) {
      const rows = grouped.get(kpiId);
      if (!rows) continue;
      grouped.set(kpiId, rows.map((d) => {
        const pop = popByYear.get(d.ar);
        const riketPop = riketPopByYear.get(d.ar);
        return {
          ...d,
          varde: d.varde != null && pop && pop > 0 ? (d.varde / pop) * 1000 : null,
          riksvarde: d.riksvarde != null && riketPop && riketPop > 0
            ? (d.riksvarde / riketPop) * 1000 : null,
        };
      }));
    }

    // Regionranking (bland L-enheter) — förberäknad lookup istället för O(n×m²)
    if (isRegion) {
      // Bygg en Map<"kpiId|år", {värden för alla regioner}> i ett pass
      const regionIndex = new Map<string, number[]>();
      for (const d of data) {
        if (d.kommun_typ !== "L" || d.kommun_kod === "0000" || d.varde == null) continue;
        const key = `${d.kpi_id}|${d.ar}`;
        const arr = regionIndex.get(key);
        if (arr) arr.push(d.varde);
        else regionIndex.set(key, [d.varde]);
      }

      for (const [kpiId, rows] of grouped) {
        grouped.set(kpiId, rows.map((row) => {
          const key = `${kpiId}|${row.ar}`;
          const vals = regionIndex.get(key);
          if (!vals || row.varde == null) return row;
          const rang = vals.filter((v) => v > row.varde!).length + 1;
          return { ...row, rang_total: rang, antal_kommuner: vals.length };
        }));
      }
    }

    return grouped;
  }, [data, valdKommun, isRegion]);

  const openKpiMeta = meta.find((m) => m.kpi_id === openKpi);

  // Laddningsskärm
  if (loading) {
    const pct = Math.round(progress * 100);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-yta gap-5">
        <img src={`${import.meta.env.BASE_URL}logo_farg.svg`} alt="Region Halland" className="h-9 loading-pulse" />
        <div className="w-40 flex flex-col items-center gap-2">
          <div className="w-full h-1 bg-neutral-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gron-2 rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-neutral-400 text-[11px]">
            {pct > 0 ? `${pct} %` : "Laddar…"}
          </p>
        </div>
      </div>
    );
  }

  // Felskärm
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-yta gap-4">
        <img src={`${import.meta.env.BASE_URL}logo_farg.svg`} alt="Region Halland" className="h-9 opacity-40" />
        <p className="text-rose-600 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-yta flex flex-col">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200/60">
        {/* Accentlinje */}
        <div className="h-[3px] bg-gradient-to-r from-gron-1 via-gron-2 to-gron-3/60" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Rad 1: Logo + titel + kommunväljare + Om */}
          <div className="flex items-center justify-between gap-3 pt-3 pb-2">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <img
                src={`${import.meta.env.BASE_URL}logo_farg.svg`}
                alt="Region Halland"
                className="h-7 sm:h-8 shrink-0"
              />
              <div className="border-l border-neutral-200 pl-3 sm:pl-4 shrink-0">
                <h1 className="text-[17px] sm:text-[20px] font-bold text-neutral-900 tracking-tight leading-tight">
                  Halland i siffror
                </h1>
              </div>
              <div className="hidden lg:block ml-1">
                <KommunValjare vald={valdKommun} onChange={setValdKommun} />
              </div>
            </div>
            <button
              onClick={() => setVisaOm(true)}
              className="font-data text-[11px] font-medium text-neutral-500
                         hover:text-neutral-800 hover:bg-neutral-100
                         px-2.5 py-1 rounded-md transition-colors cursor-pointer shrink-0
                         focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gron-2"
            >
              Om
            </button>
          </div>

          {/* Mobil/tablet: kommunväljare på egen rad */}
          <div className="lg:hidden pb-1.5">
            <KommunValjare vald={valdKommun} onChange={setValdKommun} />
          </div>

          {/* Rad 2: Temanavigation */}
          <div className="border-t border-neutral-100 py-1.5">
            <TemaNav aktivtTema={aktivtTema} onChange={handleTemaChange} />
          </div>
        </div>
      </header>

      {/* ── Innehåll ── */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 flex-1">
        {temaLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="h-5 w-5 border-2 border-neutral-200 border-t-neutral-500 rounded-full animate-spin" />
            <p className="text-neutral-400 text-[12px]">Laddar tema…</p>
          </div>
        ) : temaError ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <p className="text-rose-600 text-sm">{temaError}</p>
            <button
              onClick={retryTema}
              className="text-[12px] text-neutral-500 underline hover:no-underline cursor-pointer"
            >
              Försök igen
            </button>
          </div>
        ) : aktivTemaConfig ? (
          <TemaBlock
            key={aktivtTema}
            tema={aktivTemaConfig}
            meta={meta}
            kommunKpiData={kommunKpiData}
            nettoKpis={NETTO_KPIS}
            onOpenKpi={handleOpenKpi}
            onStartBerattelse={handleStartBerattelse}
          />
        ) : null}
      </main>

      {/* ── Footer ── */}
      <footer className="mt-auto border-t border-neutral-200/60 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <img src={`${import.meta.env.BASE_URL}logo_farg.svg`} alt="Region Halland" className="h-5 opacity-50" />
            <span className="text-[10px] text-neutral-300">|</span>
            <span className="text-[10px] text-neutral-400 font-medium">Halland i siffror</span>
          </div>
          <p className="text-[10px] text-neutral-400">
            Data: RKA Kolada · SCB · Folkhälsomyndigheten · Trafikanalys och bearbetningar av Region Halland
          </p>
        </div>
      </footer>

      {/* Berättelse-modal */}
      {visaBerattelse && (
        <GuidadBerattelse
          kommunKod={valdKommun}
          kommunNamn={kommunNamn}
          isRegion={isRegion}
          allData={data}
          allMeta={meta}
          onClose={() => setVisaBerattelse(false)}
        />
      )}

      {/* Om-modal */}
      {visaOm && <OmModal onClose={() => setVisaOm(false)} />}

      {/* KPI-modal (graf/karta) */}
      {openKpi && openKpiMeta && (
        <KpiModal
          kpiId={openKpi}
          kpiNamn={openKpiMeta.kpi_namn}
          beskrivning={openKpiMeta.beskrivning}
          enhet={openKpiMeta.enhet}
          kommunKod={valdKommun}
          kommunNamn={kommunNamn}
          isRegion={isRegion}
          allData={data}
          allMeta={meta}
          onClose={() => setOpenKpi(null)}
        />
      )}
    </div>
  );
}
