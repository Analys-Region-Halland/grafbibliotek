import { Fragment } from "react";
import type { AnalysText, Figur } from "../hooks/useAnalys";

interface Props {
  text: AnalysText;
  /** Accentfärg för I korthet-rutan och figurerna (temats djupa färg) */
  accent?: string;
  /** Visa rubriken (döljs när omgivningen redan har den) */
  visaRubrik?: boolean;
  /** Visa ingressen (döljs när den redan står i sidans ingång) */
  visaIngress?: boolean;
  /** Ritar en figur; figurerna placeras efter sitt stycke */
  renderFigur?: (figur: Figur) => React.ReactNode;
}

/** Renderar en analystext: rubrik, ingress, I korthet och löpande stycken med figurer */
export default function AnalysArtikel({ text, accent = "#00664D", visaRubrik = true, visaIngress = true, renderFigur }: Props) {
  const figurer = renderFigur ? text.figurer ?? [] : [];
  return (
    <article style={{ "--accent": accent } as React.CSSProperties}>
      {visaRubrik && <h3 className="analys-rubrik mb-3">{text.rubrik}</h3>}
      {visaIngress && <p className="analys-ingress mb-5">{text.ingress}</p>}

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
        {text.stycken.map((s, i) => (
          <Fragment key={i}>
            <p>{s}</p>
            {figurer.filter((f) => f.efter === i).map((f, j) => <Fragment key={j}>{renderFigur!(f)}</Fragment>)}
          </Fragment>
        ))}
      </div>
    </article>
  );
}
