import type { TemaConfig } from "./tema-config";

const G = {
  PENDLING: "Pendling",
  KOLLEKTIV: "Kollektivtrafik och resande",
  FORDON: "Fordonsflotta och elektrifiering",
  BIL: "Bilresande och trafiksäkerhet",
};

const transport: TemaConfig = {
  temaId: "transport",
  temaNamn: "Kollektivtrafik & transport",
  temaFarg: "lila",
  nettoKpis: [],
  ingetIndex: [],
  sektioner: [
    {
      id: "pendling",
      gruppRubrik: G.PENDLING,
      namn: "Pendling",
      kpiIds: ["C_PENDLKVOT", "C_INPENDL_ANDEL", "C_UTPENDL_ANDEL", "C_PENDL_NETTO"],
      undersektioner: [
        { namn: "inpendlare och utpendlare", delAv: "C_PENDL_NETTO", kpiIds: ["S_INPENDL", "S_UTPENDL"] },
        { namn: "dag- och nattbefolkningen", delAv: "C_PENDL_NETTO", kpiIds: ["S_DAG_TOT", "S_NATT_TOT"] },
      ],
    },
    {
      id: "kollektivtrafik",
      gruppRubrik: G.KOLLEKTIV,
      namn: "Kollektivtrafik och resande",
      kpiIds: ["N60404", "N07418", "N07410", "U60496", "U85001", "TR_FARDTJANST"],
      undersektioner: [
        { namn: "befolkningen inom och utanför tätort", delAv: "N07418", kpiIds: ["N07419", "N07412"] },
      ],
    },
    {
      id: "fordon",
      gruppRubrik: G.FORDON,
      namn: "Fordonsflotta och elektrifiering",
      kpiIds: ["N07935", "N07945", "N07947", "U00501", "N07713"],
      undersektioner: [
        { namn: "normalladdare och snabbladdare", delAv: "N07713", kpiIds: ["N07710", "N07711"] },
      ],
    },
    {
      id: "bilresande",
      gruppRubrik: G.BIL,
      namn: "Bilresande och trafiksäkerhet",
      kpiIds: ["U07917", "N07782", "N00799"],
    },
  ],
  kortNamn: {
    S_INPENDL: "Inpendlare",
    S_UTPENDL: "Utpendlare",
    S_DAG_TOT: "Dagbefolkning",
    S_NATT_TOT: "Nattbefolkning",
    N07419: "Inom tätort",
    N07412: "Utanför tätort",
    N07710: "Normalladdare",
    N07711: "Snabbladdare",
  },
  visningsnamn: {
    C_PENDLKVOT: "Pendlingskvot (dag / natt)",
    C_PENDL_NETTO: "Nettopendling, antal",
    C_INPENDL_ANDEL: "Inpendlingsandel (%)",
    C_UTPENDL_ANDEL: "Utpendlingsandel (%)",
    S_INPENDL: "Inpendlare, antal",
    S_UTPENDL: "Utpendlare, antal",
    S_DAG_TOT: "Dagbefolkning, antal sysselsatta",
    S_NATT_TOT: "Nattbefolkning, antal sysselsatta",
    N60404: "Resor med kollektivtrafik, antal resor per invånare och år",
    N07418: "Befolkning i kollektivtrafiknära läge, andel (%)",
    N07419: "Befolkning inom tätort i kollektivtrafiknära läge, andel (%)",
    N07412: "Befolkning utanför tätort i kollektivtrafiknära läge, andel (%)",
    N07410: "Nytillkomna bostäder i kollektivtrafiknära läge, andel (%)",
    U60496: "Förnybara drivmedel i kollektivtrafiken, andel (%)",
    U85001: "Nettokostnad trafik, kronor per invånare (regionnivå)",
    TR_FARDTJANST: "Färdtjänstresor, antal enkelresor under året",
    N07935: "Personbilar, antal per 1 000 invånare",
    N07945: "Elbilar, andel av personbilar (%)",
    N07938: "Elbilar, antal per 1 000 invånare",
    N07947: "Laddhybridbilar, andel av personbilar (%)",
    N07940: "Laddhybridbilar, antal per 1 000 invånare",
    U00501: "Fossiloberoende personbilar, andel av totalt antal bilar (%)",
    N07713: "Elbilsladdpunkter, totalt antal i kommunen",
    N07710: "Elbilsladdpunkter, normalladdare, antal",
    N07711: "Elbilsladdpunkter, snabbladdare, antal",
    U07917: "Genomsnittlig körsträcka med personbil, mil per invånare och år",
    U07918: "Genomsnittlig körsträcka med personbil, mil per bil och år",
    N07782: "Drivmedelsleverans till vägtransporter, liter per invånare",
    N00799: "Trafikolyckor med räddningsinsatser, antal per 1 000 invånare",
  },
  lagtArBra: ["N00799"],
  // För länet avser pendlingen länsgränsen, för kommunerna kommungränsen
  lanEjJamforbar: ["C_PENDLKVOT", "C_INPENDL_ANDEL", "C_UTPENDL_ANDEL"],
  lanEjJamforbarText: "Länets pendling avser länsgränsen och går inte att jämföra med kommunernas, som avser kommungränsen.",
  hogtArBra: [
    "N07418", "N07419", "N07412", "N07410", "N60404", "U60496", "N07945", "U00501",
  ],
};

export default transport;
