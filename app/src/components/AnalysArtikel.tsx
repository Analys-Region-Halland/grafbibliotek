import type { AnalysText } from "../hooks/useAnalys";

interface Props {
  text: AnalysText;
  /** Accentfärg för I korthet-rutan (temats djupa färg) */
  accent?: string;
  /** Visa rubriken (döljs när omgivningen redan har den) */
  visaRubrik?: boolean;
}

/** Renderar en analystext: rubrik, ingress, I korthet och löpande stycken */
export default function AnalysArtikel({ text, accent = "#00664D", visaRubrik = true }: Props) {
  return (
    <article style={{ "--accent": accent } as React.CSSProperties}>
      {visaRubrik && <h3 className="analys-rubrik mb-3">{text.rubrik}</h3>}
      <p className="analys-ingress mb-5">{text.ingress}</p>

      {text.i_korthet.length > 0 && (
        <ul className="analys-ikorthet list-none m-0 mb-6 rounded-sm">
          {text.i_korthet.map((p) => (
            <li key={p.ledtext}>
              <strong className="font-semibold">{p.ledtext}.</strong> {p.text}
            </li>
          ))}
        </ul>
      )}

      <div className="analys-brodtext">
        {text.stycken.map((s, i) => <p key={i}>{s}</p>)}
      </div>
    </article>
  );
}

