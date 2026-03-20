import type { TemaConfig } from "./tema-config";

const G = {
  PENDLING: "Pendling",
  KOLLEKTIV: "Kollektivtrafik och resande",
  FORDON: "Fordonsflotta och elektrifiering",
  RESANDE: "Bilresande",
  SAKERHET: "Trafiksäkerhet",
};

const transport: TemaConfig = {
  temaId: "transport",
  temaNamn: "Kollektivtrafik & transport",
  temaFarg: "lila",
  nettoKpis: [],
  ingetIndex: [],
  sektioner: [
    // ── Pendling ──
    {
      id: "pendlkvot",
      gruppRubrik: G.PENDLING,
      namn: "Pendlingskvot",
      kpiIds: ["C_PENDLKVOT"],
    },
    {
      id: "inpendling",
      gruppRubrik: G.PENDLING,
      namn: "Inpendlingsandel",
      kpiIds: ["C_INPENDL_ANDEL"],
    },
    {
      id: "utpendling",
      gruppRubrik: G.PENDLING,
      namn: "Utpendlingsandel",
      kpiIds: ["C_UTPENDL_ANDEL"],
    },
    {
      id: "inpendlare",
      gruppRubrik: G.PENDLING,
      namn: "Inpendlare",
      kpiIds: ["S_INPENDL"],
    },
    {
      id: "utpendlare",
      gruppRubrik: G.PENDLING,
      namn: "Utpendlare",
      kpiIds: ["S_UTPENDL"],
    },
    {
      id: "nettopendling",
      gruppRubrik: G.PENDLING,
      namn: "Nettopendling",
      kpiIds: ["C_PENDL_NETTO"],
      undersektioner: [
        { namn: "Underlag", kpiIds: ["S_DAG_TOT", "S_NATT_TOT"] },
      ],
    },

    // ── Kollektivtrafik och resande ──
    {
      id: "koll_resor",
      gruppRubrik: G.KOLLEKTIV,
      namn: "Resor med kollektivtrafik",
      kpiIds: ["N60404"],
    },
    {
      id: "kolltrafik",
      gruppRubrik: G.KOLLEKTIV,
      namn: "Befolkning i kollektivtrafiknära läge",
      kpiIds: ["N07418"],
      undersektioner: [
        { namn: "Uppdelning", kpiIds: ["N07419", "N07412"] },
      ],
    },
    {
      id: "kolltrafik_bost",
      gruppRubrik: G.KOLLEKTIV,
      namn: "Nytillkomna bostäder i kollektivtrafiknära läge",
      kpiIds: ["N07410"],
    },
    {
      id: "koll_fornybar",
      gruppRubrik: G.KOLLEKTIV,
      namn: "Förnybara drivmedel i kollektivtrafiken",
      kpiIds: ["U60496"],
    },
    {
      id: "koll_kostnad",
      gruppRubrik: G.KOLLEKTIV,
      namn: "Nettokostnad trafik",
      kpiIds: ["U85001"],
    },
    {
      id: "fardtjanst",
      gruppRubrik: G.KOLLEKTIV,
      namn: "Färdtjänstresor",
      kpiIds: ["TR_FARDTJANST"],
    },

    // ── Fordonsflotta och elektrifiering ──
    {
      id: "bilar",
      gruppRubrik: G.FORDON,
      namn: "Personbilar per 1 000 invånare",
      kpiIds: ["N07935"],
    },
    {
      id: "elbilar",
      gruppRubrik: G.FORDON,
      namn: "Elbilar",
      kpiIds: ["N07945"],
      undersektioner: [
        { namn: "Antal", kpiIds: ["N07938"] },
      ],
    },
    {
      id: "laddhybrid",
      gruppRubrik: G.FORDON,
      namn: "Laddhybridbilar",
      kpiIds: ["N07947"],
      undersektioner: [
        { namn: "Antal", kpiIds: ["N07940"] },
      ],
    },
    {
      id: "fossilo",
      gruppRubrik: G.FORDON,
      namn: "Fossiloberoende personbilar",
      kpiIds: ["U00501"],
    },
    {
      id: "laddpunkter",
      gruppRubrik: G.FORDON,
      namn: "Elbilsladdpunkter",
      kpiIds: ["N07713"],
      undersektioner: [
        { namn: "Typ", kpiIds: ["N07710", "N07711"] },
      ],
    },

    // ── Bilresande ──
    {
      id: "korstracka",
      gruppRubrik: G.RESANDE,
      namn: "Körsträcka med personbil",
      kpiIds: ["U07917"],
      undersektioner: [
        { namn: "Per bil", kpiIds: ["U07918"] },
      ],
    },
    {
      id: "drivmedel",
      gruppRubrik: G.RESANDE,
      namn: "Drivmedelsleverans till vägtransporter",
      kpiIds: ["N07782"],
    },

    // ── Trafiksäkerhet ──
    {
      id: "olyckor",
      gruppRubrik: G.SAKERHET,
      namn: "Trafikolyckor med räddningsinsatser",
      kpiIds: ["N00799"],
    },
  ],
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
  kortNamn: {
    N02277: "Antal inpendlare",
    N02278: "Antal utpendlare",
    S_INPENDL: "Antal inpendlare",
    S_UTPENDL: "Antal utpendlare",
    S_DAG_TOT: "Dagbefolkning",
    S_NATT_TOT: "Nattbefolkning",
    N07938: "Antal per 1 000 invånare",
    N07940: "Antal per 1 000 invånare",
    N07710: "Normalladdare",
    N07711: "Snabbladdare",
    N07419: "Inom tätort",
    N07412: "Utanför tätort",
    U07918: "Mil per bil",
  },
  lagtArBra: ["N00799"],
};

export default transport;
