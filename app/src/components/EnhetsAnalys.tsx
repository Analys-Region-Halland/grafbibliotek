import type { AnalysData } from "../hooks/useAnalys";
import { TEMAN, TEMA_FARG_HEX } from "../teman";
import AnalysArtikel from "./AnalysArtikel";
import AiUpplysning, { AiEtikett } from "./AiUpplysning";

interface Props {
  analys: AnalysData | null;
  enhetKod: string;
  enhetNamn: string;
  /** Gå till nyckeltalen för ett tema */
  onVisaNyckeltal: (temaId: string) => void;
}

const sektionsId = (temaId: string) => `analys-${temaId}`;

/** Samlad analys för en enhet: översikt + alla teman i följd */
export default function EnhetsAnalys({ analys, enhetKod, enhetNamn, onVisaNyckeltal }: Props) {
  if (!analys) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="h-5 w-5 border-2 border-neutral-200 border-t-neutral-500 rounded-full animate-spin" />
        <p className="text-neutral-400 text-[12px]">Laddar analys…</p>
      </div>
    );
  }
  const enhet = analys.enheter[enhetKod];
  if (!enhet) {
    return <p className="text-[14px] text-neutral-600 py-16">Det finns ingen analys för {enhetNamn} ännu.</p>;
  }

  return (
    <div className="tema-fade-in max-w-[680px]">
      <header className="mb-8">
        <p className="text-[12px] font-semibold tracking-wide uppercase text-neutral-500 mb-2">
          Analys · {enhetNamn}
        </p>
        <h2 className="analys-rubrik !text-[28px] sm:!text-[34px] !leading-[1.15]">
          {enhet.oversikt?.rubrik ?? `${enhetNamn} i siffror`}
        </h2>
      </header>

      <AiUpplysning genererad={analys.genererad} />

      {enhet.oversikt && (
        <section className="mb-14">
          <AnalysArtikel text={enhet.oversikt} visaRubrik={false} accent="#00664D" />
        </section>
      )}

      {TEMAN.map((tema) => {
        const text = enhet.teman[tema.temaId];
        if (!text) return null;
        const farg = TEMA_FARG_HEX[tema.temaFarg];
        return (
          <section key={tema.temaId} id={sektionsId(tema.temaId)}
                   className="mb-14 scroll-mt-28 border-t border-neutral-200 pt-6">
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="flex items-center gap-2 text-[12px] font-semibold tracking-wide uppercase"
                 style={{ color: farg.djup }}>
                <span className="w-2 h-2 rounded-full" style={{ background: farg.medel }} />
                {tema.temaNamn} <AiEtikett />
              </p>
              <button
                onClick={() => onVisaNyckeltal(tema.temaId)}
                className="text-[12px] font-medium text-neutral-500 hover:text-neutral-900 cursor-pointer
                           underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-900"
              >
                Visa nyckeltalen
              </button>
            </div>
            <AnalysArtikel text={text} accent={farg.djup} />
          </section>
        );
      })}

    </div>
  );
}
