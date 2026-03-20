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

          {/* 3. Kontakt */}
          <section>
            <h3 className="font-data text-[12px] font-semibold text-neutral-900 mb-2 tracking-wide">
              Kontakt
            </h3>
            <p>
              Har du frågor, hittat ett fel eller vill föreslå en förbättring?
              Kontakta{" "}
              <a
                href="mailto:robin.rikardsson@regionhalland.se"
                className="text-bla-1 underline underline-offset-2 hover:text-bla-2 transition-colors"
              >
                robin.rikardsson@regionhalland.se
              </a>
            </p>
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
