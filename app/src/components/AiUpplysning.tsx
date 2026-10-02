import { useState } from "react";

/** Kontakt för frågor om analyserna */
const ANALYS_KONTAKT = "robin.rikardsson@regionhalland.se";

/**
 * Upplysning om att analystexterna är AI-genererade. Visas i början av varje analys.
 * Formuleringen följer EU:s AI-förordning (artikel 50: AI-genererad text som informerar
 * allmänheten ska märkas) och Diggs och IMY:s riktlinjer för generativ AI i offentlig
 * förvaltning (det ska framgå tydligt när AI används i tjänster till allmänheten).
 * Ändra texten här om arbetssättet ändras, till exempel om texterna börjar granskas
 * manuellt av en analytiker före publicering.
 */
function Forklaring() {
  return (
    <div className="mt-3 pt-3 border-t border-[#E4E6E8] space-y-2.5 text-[13px] leading-relaxed text-[#3B4742]">
      <p>
        Analyserna är skrivna av en AI-modell (Claude från Anthropic) utifrån statistik som Region Halland
        hämtat från SCB, Kolada, Folkhälsomyndigheten, Tillväxtverket och Trafikanalys och bearbetat. Texterna
        tas fram och kontrolleras i flera steg:
      </p>
      <ol className="list-decimal pl-5 space-y-1.5">
        <li>
          <span className="font-semibold text-[#2D2E2D]">Underlag.</span> Varje text utgår från ett sifferunderlag
          med exakt de indikatorer som visas på sidan: värden, jämförelser med länet och riket, placering bland
          landets kommuner och förändring över tid.
        </li>
        <li>
          <span className="font-semibold text-[#2D2E2D]">Riktlinjer.</span> Texterna skrivs enligt Region Hallands
          riktlinjer för analystext: saklig ton, siffror i sammanhang, inga värdeladdade ord och förklaringar
          som möjliga tolkningar.
        </li>
        <li>
          <span className="font-semibold text-[#2D2E2D]">Avstämning mot data.</span> Varje siffra kontrolleras
          automatiskt mot underlaget. Därefter granskas varje påstående, som jämförelser, rangordningar och vad
          som bidrar till en förändring, mot underlaget i en separat AI-granskning innan texten publiceras.
        </li>
        <li>
          <span className="font-semibold text-[#2D2E2D]">Uppdatering.</span> När statistiken uppdateras visas inte
          de berörda texterna förrän de har skrivits om och kontrollerats på nytt.
        </li>
      </ol>
      <p>
        <span className="font-semibold text-[#2D2E2D]">Förbehåll.</span> Texterna har inte granskats i sin helhet
        av en analytiker före publicering, och trots kontrollerna kan de innehålla fel eller förenklingar.
        Förklaringarna är tolkningar av mönster i statistiken, inte belagda orsakssamband, och texterna uttrycker
        inte Region Hallands ställningstaganden. Preliminära uppgifter och enkätdata har en osäkerhet som kan
        göra skillnader mindre säkra än de ser ut. Använd siffrorna i tabellerna och graferna, och källorna bakom
        dem, som grund vid beslut.
      </p>
      <p>
        Har du frågor, hittat ett fel eller vill veta mer om hur texterna tas fram? Kontakta{" "}
        <a href={`mailto:${ANALYS_KONTAKT}`} className="text-[#004990] underline underline-offset-2">{ANALYS_KONTAKT}</a>.
      </p>
    </div>
  );
}

/** Ruta i början av en analys: kort upplysning med utfällbar förklaring */
export default function AiUpplysning({ genererad }: { genererad?: string }) {
  const [oppen, setOppen] = useState(false);
  return (
    <aside className="mb-6 rounded-lg border border-[#E4E6E8] bg-[#F7F8FA] px-4 py-3" aria-label="Om AI-genererad text">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 shrink-0 rounded px-1.5 py-[1px] text-[10.5px] font-semibold tracking-[0.08em] uppercase
                         bg-[#2D2E2D] text-white">AI</span>
        <div className="min-w-0 text-[13px] leading-relaxed text-[#2D2E2D]">
          <p>
            <span className="font-semibold">AI-genererad analys.</span> Texten är skriven av en AI-modell utifrån
            statistiken på sidan och kontrollerad mot underlaget enligt Region Hallands riktlinjer. Den kan ändå
            innehålla fel; kontrollera viktiga uppgifter i tabellerna och källorna.
            {genererad ? ` Uppdaterad ${genererad}.` : ""}
          </p>
          <p className="mt-1">
            <button onClick={() => setOppen((v) => !v)} aria-expanded={oppen}
                    className="font-medium underline underline-offset-2 decoration-[#83888A] hover:decoration-[#2D2E2D] cursor-pointer">
              {oppen ? "Dölj" : "Så tas texterna fram"}
            </button>
            <span className="text-[#5B5B5B]">{" "}Frågor:{" "}</span>
            <a href={`mailto:${ANALYS_KONTAKT}`} className="text-[#004990] underline underline-offset-2">{ANALYS_KONTAKT}</a>
          </p>
          {oppen && <Forklaring />}
        </div>
      </div>
    </aside>
  );
}

/** Liten etikett för analysband och avsnitt */
export function AiEtikett() {
  return (
    <span className="inline-flex items-center rounded px-1.5 py-[1px] text-[10px] font-semibold tracking-[0.08em] uppercase
                     bg-[#2D2E2D] text-white align-middle" title="Texten är AI-genererad">
      AI-genererad
    </span>
  );
}

export { Forklaring as AiForklaring };
