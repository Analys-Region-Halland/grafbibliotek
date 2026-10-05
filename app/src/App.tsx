import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useData, useHelaTemat, cleanRegionName } from "./hooks/useData";
import { useHash, hashFor } from "./hooks/useHash";
import { ALLA, HALLAND_KOMMUNER } from "./types";
import type { KommunEntry, KommunGruppData } from "./types";
import { TEMAN } from "./teman";
import KommunValjare, { KommunSelect } from "./components/KommunValjare";
import { Sidomeny, MobilNav } from "./components/Navigering";
import TemaBlock from "./components/TemaBlock";
import { useAnalys } from "./hooks/useAnalys";
import { indexera } from "./utils/kpiStats";
import KpiPopup from "./components/KpiPopup";
import OmModal from "./components/OmModal";

export default function App() {
  const { route, navigate } = useHash();
  // Enheten i adressen: länet, en kommun eller alla sida vid sida.
  // Data, popup och analys utgår från länet när alla kommuner visas.
  const enhet = route.enhet;
  const arAlla = enhet === ALLA;
  const valdKommun = arAlla ? "0013" : enhet;
  const aktivtTema = route.tema;
  const openKpi = route.kpi;

  const { data, meta, loading, temaLoading, error, temaError, progress, retryTema } = useData(aktivtTema);
  const [visaOm, setVisaOm] = useState(false);
  const analys = useAnalys();

  // Kommun-register + kommungrupper (laddas en gång)
  const [kommunRegister, setKommunRegister] = useState<KommunEntry[]>([]);
  const [kommunGrupper, setKommunGrupper] = useState<KommunGruppData | null>(null);

  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    Promise.all([
      fetch(`${base}data/kommun-register.json`).then((r) => r.json()),
      fetch(`${base}data/kommungrupper.json`).then((r) => r.json()),
    ]).then(([reg, grupp]) => {
      setKommunRegister((reg as KommunEntry[]).map((k) => ({ ...k, n: cleanRegionName(k.n, k.t) })));
      setKommunGrupper(grupp as KommunGruppData);
    }).catch(() => { /* popupen klarar sig utan kommungrupper */ });
  }, []);

  const valdEnhet = HALLAND_KOMMUNER.find((k) => k.kod === valdKommun);
  const kommunNamn = valdEnhet?.namn ?? "";
  const isRegion = valdEnhet?.typ === "L";
  const sidEnhetNamn = arAlla ? "Hallands kommuner" : isRegion ? "Halland (länet)" : kommunNamn;

  const aktivTemaConfig = TEMAN.find((t) => t.temaId === aktivtTema);

  // Ett nytt område börjar överst; byte av enhet eller öppen indikator gör det inte
  useEffect(() => { window.scrollTo({ top: 0 }); }, [aktivtTema]);

  // ── Adresser ──
  const hrefTema = useCallback((temaId: string) => hashFor({ enhet, tema: temaId, kpi: null }), [enhet]);
  const hrefEnhet = useCallback((ny: string) => hashFor({ enhet: ny, tema: aktivtTema, kpi: null }), [aktivtTema]);
  const valjEnhet = useCallback((ny: string) => navigate({ enhet: ny, tema: aktivtTema, kpi: null }), [navigate, aktivtTema]);

  // Popupen: öppnas som en egen adress så att bakåtknappen stänger den
  const kpiOppnadHar = useRef(false);
  const handleOpenKpi = useCallback((kpiId: string) => {
    kpiOppnadHar.current = true;
    navigate({ ...route, kpi: kpiId });
  }, [navigate, route]);
  const stangKpi = useCallback(() => {
    if (kpiOppnadHar.current) {
      kpiOppnadHar.current = false;
      history.back();
    } else {
      navigate({ ...route, kpi: null }, true);
    }
  }, [navigate, route]);

  const temaAnalys = analys?.enheter[valdKommun]?.teman[aktivtTema];

  // Index kpi → enhet → serie, för tabellerna (alla kommuner och regioner)
  const kpiIndex = useMemo(() => indexera(data), [data]);
  const enhetsnamn = useMemo(() => new Map(kommunRegister.map((k) => [k.k, k.n])), [kommunRegister]);

  const openKpiMeta = meta.find((m) => m.kpi_id === openKpi);
  const helaTemat = useHelaTemat(openKpi ? aktivtTema : null);

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
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 h-[60px] lg:h-[68px]">
            <a href={hrefTema(TEMAN[0].temaId)}
               className="flex items-center gap-3 sm:gap-4 min-w-0"
               aria-label="Halland i siffror, till första området">
              <img src={`${import.meta.env.BASE_URL}logo_farg.svg`} alt="Region Halland" className="h-[22px] sm:h-7 shrink-0" />
              <span className="border-l border-neutral-200 pl-3 sm:pl-4 text-[15px] sm:text-[19px] font-bold
                               text-neutral-900 tracking-tight leading-tight whitespace-nowrap">
                Halland i siffror
              </span>
            </a>
            <div className="hidden xl:block">
              <KommunValjare vald={enhet} onChange={valjEnhet} href={hrefEnhet} />
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <div className="xl:hidden"><KommunSelect vald={enhet} onChange={valjEnhet} /></div>
              <button
                onClick={() => setVisaOm(true)}
                className="hidden lg:block text-[12.5px] font-medium text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100
                           px-2.5 py-1.5 rounded-md transition-colors cursor-pointer
                           focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gron-2"
              >
                Om
              </button>
            </div>
          </div>
          <div className="lg:hidden border-t border-neutral-100">
            <MobilNav aktiv={aktivtTema} href={hrefTema} />
          </div>
        </div>
      </header>

      {/* ── Innehåll ── */}
      <div className="max-w-[1440px] mx-auto w-full px-4 sm:px-6 lg:px-8 flex-1
                      lg:grid lg:grid-cols-[216px_minmax(0,1fr)] lg:gap-10">
        <aside className="hidden lg:block pt-8">
          <Sidomeny aktiv={aktivtTema} href={hrefTema} />
        </aside>

        <main className="py-6 sm:py-8 min-w-0">
          {temaLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <div className="h-5 w-5 border-2 border-neutral-200 border-t-neutral-500 rounded-full animate-spin" />
              <p className="text-neutral-400 text-[12px]">Laddar området</p>
            </div>
          ) : temaError ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <p className="text-rose-600 text-sm">{temaError}</p>
              <button onClick={retryTema}
                      className="text-[12px] text-neutral-500 underline hover:no-underline cursor-pointer">
                Försök igen
              </button>
            </div>
          ) : aktivTemaConfig ? (
            <TemaBlock
              key={`${aktivtTema}-${enhet}`}
              tema={aktivTemaConfig}
              meta={meta}
              idx={kpiIndex}
              enhetsnamn={enhetsnamn}
              valdKod={valdKommun}
              arAlla={arAlla}
              enhetNamn={sidEnhetNamn}
              analys={temaAnalys}
              analysEnhet={kommunNamn}
              genererad={analys?.genererad}
              onOpenKpi={handleOpenKpi}
              onValjEnhet={valjEnhet}
            />
          ) : null}
        </main>
      </div>

      {/* ── Footer ── */}
      <footer className="mt-auto border-t border-neutral-200/60 bg-white">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <img src={`${import.meta.env.BASE_URL}logo_farg.svg`} alt="Region Halland" className="h-5 opacity-50" />
            <span className="text-[10px] text-neutral-300">|</span>
            <span className="text-[10px] text-neutral-400 font-medium">Halland i siffror</span>
            <span className="text-[10px] text-neutral-300">|</span>
            <button onClick={() => setVisaOm(true)}
                    className="text-[10px] text-neutral-500 font-medium underline underline-offset-2 cursor-pointer">
              Om sidan
            </button>
          </div>
          <p className="text-[10px] text-neutral-400">
            Data: RKA Kolada · SCB · Folkhälsomyndigheten · Tillväxtverket · Trafikanalys. Bearbetning: Region Halland
          </p>
        </div>
      </footer>

      {/* Om-modal */}
      {visaOm && <OmModal onClose={() => setVisaOm(false)} />}

      {/* Graf och karta för en indikator: behöver hela temafilen, som hämtas först nu */}
      {openKpi && openKpiMeta && (helaTemat.rows ? (
        <KpiPopup
          kpiId={openKpi}
          kpiNamn={openKpiMeta.kpi_namn}
          beskrivning={openKpiMeta.beskrivning}
          enhet={openKpiMeta.enhet}
          kommunKod={valdKommun}
          kommunNamn={kommunNamn}
          isRegion={isRegion}
          allData={helaTemat.rows}
          allMeta={meta}
          kommunRegister={kommunRegister}
          kommunGrupper={kommunGrupper}
          onClose={stangKpi}
        />
      ) : (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/30" onClick={stangKpi}
             role="dialog" aria-modal="true" aria-label={`Graf och karta för ${openKpiMeta.kpi_namn}`}>
          <div className="bg-white rounded-xl shadow-xl px-6 py-5 flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            {helaTemat.fel ? (
              <>
                <p className="text-[13px] text-rose-600">Kunde inte ladda graf och karta: {helaTemat.fel}</p>
                <button onClick={stangKpi} className="text-[12.5px] underline cursor-pointer">Stäng</button>
              </>
            ) : (
              <>
                <div className="h-4 w-4 border-2 border-neutral-200 border-t-neutral-600 rounded-full animate-spin" />
                <p className="text-[13px] text-neutral-600">Laddar graf och karta</p>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
