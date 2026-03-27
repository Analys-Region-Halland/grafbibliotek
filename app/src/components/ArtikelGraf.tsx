import { useState, useEffect } from "react";
import type { GrafConfig, KommunEntry } from "../types";
import { HALLAND_KOMMUNER } from "../types";
import { useArtikelData } from "../hooks/useArtikelData";
import { cleanRegionName } from "../hooks/dataCache";
import type { KommunGruppData } from "./ControlDrawer";
import KpiPopup from "./KpiPopup";

interface Props {
  config: GrafConfig;
}

export default function ArtikelGraf({ config }: Props) {
  const { data, meta, loading } = useArtikelData(config.temaId);

  // Kommun-register + kommungrupper (samma som App.tsx)
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
    }).catch(() => {});
  }, []);

  const kommunKod = config.kommunKod ?? "0013";
  const kpiMeta = meta.find((m) => m.kpi_id === config.kpiId);
  const kommun = HALLAND_KOMMUNER.find((k) => k.kod === kommunKod);
  const kommunNamn = kommun?.namn ?? "";
  const isRegion = kommun?.typ === "L";

  if (loading || !kpiMeta) {
    return (
      <figure className="my-10 max-w-[860px] mx-auto px-0 sm:px-2">
        <div className="bg-white rounded-none sm:rounded-2xl border-y sm:border border-neutral-200/70
                        shadow-none sm:shadow-[0_2px_16px_rgba(0,0,0,0.04)] overflow-hidden"
             style={{ minHeight: 400 }}>
          <div className="flex items-center justify-center h-[400px]">
            <div className="flex flex-col items-center gap-2">
              <div className="h-4 w-4 border-2 border-neutral-200 border-t-neutral-400 rounded-full animate-spin" />
              <span className="text-[11px] text-neutral-400">Laddar graf…</span>
            </div>
          </div>
        </div>
      </figure>
    );
  }

  return (
    <figure className="my-10 max-w-[860px] mx-auto px-0 sm:px-2">
      <KpiPopup
        kpiId={config.kpiId}
        kpiNamn={kpiMeta.kpi_namn}
        beskrivning={kpiMeta.beskrivning}
        enhet={config.enhet ?? kpiMeta.enhet}
        kommunKod={kommunKod}
        kommunNamn={kommunNamn}
        isRegion={isRegion}
        allData={data}
        allMeta={meta}
        kommunRegister={kommunRegister}
        kommunGrupper={kommunGrupper}
        onClose={() => {}}
        inline
      />
      {config.bildtext && (
        <figcaption className="text-[12px] text-neutral-500 mt-3 px-4 sm:px-1 leading-relaxed"
                    style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
          {config.bildtext}
        </figcaption>
      )}
    </figure>
  );
}
