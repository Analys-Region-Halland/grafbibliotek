import { useEffect, useRef } from "react";
import type { AnalysText } from "../hooks/useAnalys";
import AnalysArtikel from "./AnalysArtikel";
import AiUpplysning from "./AiUpplysning";

interface Props {
  temaNamn: string;
  enhetNamn: string;
  accent: string;
  text: AnalysText;
  genererad?: string;
  onClose: () => void;
  /** Gå till enhetens samlade analys (alla teman) */
  onVisaAllaTeman: () => void;
}

/** Utfällbar panel från höger med analysen av ett tema för vald enhet */
export default function AnalysPanel({
  temaNamn, enhetNamn, accent, text, genererad, onClose, onVisaAllaTeman,
}: Props) {
  const stangRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    stangRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true"
         aria-label={`Analys: ${temaNamn}, ${enhetNamn}`}>
      <div className="absolute inset-0 bg-neutral-900/30 overlay-in" onClick={onClose} />
      <div className="relative panel-in h-full w-full sm:w-[min(640px,92vw)] bg-white shadow-2xl
                      flex flex-col">
        <div className="h-[3px] shrink-0" style={{ background: accent }} />
        <div className="flex items-center justify-between gap-3 px-5 sm:px-8 pt-4 pb-3 border-b border-neutral-100">
          <p className="text-[12px] font-medium text-neutral-600">
            <span className="text-neutral-900 font-semibold">Analys</span>
            <span className="mx-1.5 text-neutral-300">/</span>{temaNamn}
            <span className="mx-1.5 text-neutral-300">/</span>{enhetNamn}
          </p>
          <button
            ref={stangRef}
            onClick={onClose}
            className="text-[12px] text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100
                       px-2.5 py-1 rounded-md cursor-pointer
                       focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gron-2"
          >
            Stäng ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6">
          <AiUpplysning genererad={genererad} />
          <AnalysArtikel text={text} accent={accent} />
          <div className="mt-8 pt-4 border-t border-neutral-100 flex flex-col gap-4">
            <button
              onClick={onVisaAllaTeman}
              className="self-start text-[13px] font-medium text-neutral-900 underline
                         decoration-neutral-300 underline-offset-4 hover:decoration-neutral-900 cursor-pointer"
            >
              Läs analysen av alla områden för {enhetNamn} →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
