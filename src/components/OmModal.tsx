import { useEffect, useCallback } from "react";

interface Props {
  onClose: () => void;
}

export default function OmModal({ onClose }: Props) {
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [handleKey]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-neutral-100">
          <h2 className="font-data text-[17px] font-bold text-neutral-900 tracking-tight">
            Om Halland i siffror
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg
                       text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100
                       transition-colors cursor-pointer
                       focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gron-2"
            aria-label="Stäng"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-6 text-[13px] text-neutral-700 leading-relaxed">
          {/* 1. Om dashboarden */}
          <section>
            <p>
              Halland i siffror samlar nyckeltal för Region Hallands sex kommuner
              och regionen som helhet. Dashboarden ger en överblick över utvecklingen
              inom tio temaområden — från befolkning och arbetsmarknad till miljö,
              hälsa och kollektivtrafik — med möjlighet att jämföra mot riksnivå
              och andra kommuner.
            </p>
          </section>

          {/* 2. Datakällor */}
          <section>
            <h3 className="font-data text-[12px] font-semibold text-neutral-900 mb-2 tracking-wide">
              Datakällor
            </h3>
            <ul className="space-y-2">
              <li>
                <span className="font-semibold text-neutral-900">RKA Kolada</span>{" "}
                — Kommun- och regiondatabasen med över 6 000 nyckeltal från SCB,
                Försäkringskassan, Socialstyrelsen m.fl. Registerdata med årsvisa
                uppdateringar.
              </li>
              <li>
                <span className="font-semibold text-neutral-900">SCB</span>{" "}
                — Statistiska centralbyrån. Pendlingsstatistik (BAS/RAMS) hämtas
                direkt via SCB:s PxWeb-API.
              </li>
              <li>
                <span className="font-semibold text-neutral-900">Folkhälsomyndigheten</span>{" "}
                — Folkhälsodata med enkätbaserade indikatorer (Nationella
                folkhälsoenkäten) och registerdata om dödlighet, inkomst och
                utbildning. Enkätdata redovisas med konfidensintervall.
              </li>
              <li>
                <span className="font-semibold text-neutral-900">Trafikanalys</span>{" "}
                — Fordonsstatistik och färdtjänstdata hämtas via Trafikanalys
                öppna data-API.
              </li>
            </ul>
          </section>

          {/* 3. Datapipeline */}
          <section>
            <h3 className="font-data text-[12px] font-semibold text-neutral-900 mb-3 tracking-wide">
              Datapipeline
            </h3>
            <div className="flex items-center justify-center">
              <svg viewBox="0 0 440 56" className="w-full max-w-md" aria-hidden="true">
                {/* Steg 1: Datakällor */}
                <rect x="0" y="8" width="100" height="40" rx="8" fill="#f5f5f5" stroke="#d4d4d4" strokeWidth="1" />
                <text x="50" y="24" textAnchor="middle" className="fill-neutral-600" fontSize="9" fontWeight="600">Datakällor</text>
                <text x="50" y="38" textAnchor="middle" className="fill-neutral-400" fontSize="8">Kolada · SCB</text>
                <text x="50" y="47" textAnchor="middle" className="fill-neutral-400" fontSize="8">FoHM · Trafikanalys</text>

                {/* Pil 1 */}
                <path d="M105 28 L125 28" stroke="#a3a3a3" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />

                {/* Steg 2: R-bearbetning */}
                <rect x="130" y="8" width="90" height="40" rx="8" fill="#ecfdf5" stroke="#86efac" strokeWidth="1" />
                <text x="175" y="24" textAnchor="middle" className="fill-emerald-700" fontSize="9" fontWeight="600">R-bearbetning</text>
                <text x="175" y="38" textAnchor="middle" className="fill-emerald-600" fontSize="8">Trender · Ranking</text>
                <text x="175" y="47" textAnchor="middle" className="fill-emerald-600" fontSize="8">Rikssnitt · KI</text>

                {/* Pil 2 */}
                <path d="M225 28 L245 28" stroke="#a3a3a3" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />

                {/* Steg 3: JSON */}
                <rect x="250" y="12" width="60" height="32" rx="8" fill="#fefce8" stroke="#fde047" strokeWidth="1" />
                <text x="280" y="32" textAnchor="middle" className="fill-yellow-700" fontSize="9" fontWeight="600">JSON</text>

                {/* Pil 3 */}
                <path d="M315 28 L335 28" stroke="#a3a3a3" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />

                {/* Steg 4: Frontend */}
                <rect x="340" y="8" width="96" height="40" rx="8" fill="#eff6ff" stroke="#93c5fd" strokeWidth="1" />
                <text x="388" y="24" textAnchor="middle" className="fill-blue-700" fontSize="9" fontWeight="600">React + D3</text>
                <text x="388" y="38" textAnchor="middle" className="fill-blue-600" fontSize="8">Visualisering</text>
                <text x="388" y="47" textAnchor="middle" className="fill-blue-600" fontSize="8">& interaktion</text>

                <defs>
                  <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5"
                          markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#a3a3a3" />
                  </marker>
                </defs>
              </svg>
            </div>
          </section>

          {/* 4. Under utveckling */}
          <section>
            <h3 className="font-data text-[12px] font-semibold text-neutral-900 mb-2 tracking-wide">
              Under utveckling
            </h3>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[8px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500 font-data font-semibold uppercase tracking-wider">
                  Planerad
                </span>
                <span>Guidade berättelser — KI-genererade analyser av kommunens utveckling (maj 2026).</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[8px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500 font-data font-semibold uppercase tracking-wider">
                  Planerad
                </span>
                <span>Snabbrapport — exporterbar sammanfattning per kommun (maj 2026).</span>
              </div>
            </div>
          </section>

          {/* Uppdateringsdatum */}
          <p className="text-[11px] text-neutral-400 pt-2 border-t border-neutral-100">
            Sidan uppdaterades {__BUILD_DATE__}.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-100 flex justify-end">
          <button
            onClick={onClose}
            className="font-data text-[12px] font-medium text-neutral-600
                       hover:text-neutral-900 px-4 py-2 rounded-lg
                       hover:bg-neutral-100 transition-colors cursor-pointer
                       focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gron-2"
          >
            Stäng
          </button>
        </div>
      </div>
    </div>
  );
}
