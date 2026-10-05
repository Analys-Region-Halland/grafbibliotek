import type { TemaConfig } from "./tema-config";

const G = {
  GAST: "Gästnätter",
  ANK: "Gästankomster",
  KAP: "Kapacitet och beläggning",
  INT: "Intäkter",
};

const turism: TemaConfig = {
  temaId: "turism",
  temaNamn: "Turism & besöksnäring",
  temaFarg: "rod",
  sektioner: [
    {
      id: "gastnatter",
      gruppRubrik: G.GAST,
      namn: "Gästnätter",
      kpiIds: ["T_GAST_TOT", "T_GAST_PER_INV", "T_GAST_TILLVAXT", "T_ANDEL_UTL_NATTER"],
      undersektioner: [
        { namn: "svenska och utländska gäster", delAv: "T_GAST_TOT", kpiIds: ["T_GAST_SVE", "T_GAST_UTL"] },
        {
          namn: "boendeformerna",
          delAv: "T_GAST_TOT",
          sorteraEfterVarde: true,
          kpiIds: ["T_GAST_HOTELL", "T_GAST_CAMPING", "T_GAST_STUGBY", "T_GAST_VANDRARHEM", "T_GAST_SOL"],
        },
      ],
    },
    {
      id: "ankomster",
      gruppRubrik: G.ANK,
      namn: "Gästankomster",
      kpiIds: ["T_ANKOMST_SVE", "T_ANKOMST_UTL", "T_ANDEL_UTL"],
    },
    {
      id: "kapacitet",
      gruppRubrik: G.KAP,
      namn: "Kapacitet och beläggning",
      kpiIds: ["T_ANLAGGNINGAR", "T_GAST_PER_ANLAGG", "T_BELAGG_RUM", "T_BELAGG_BADD"],
    },
    {
      id: "intakter",
      gruppRubrik: G.INT,
      namn: "Intäkter",
      kpiIds: ["T_LOGIINTAKT", "T_INTAKT_PER_GAST", "T_INTAKT_TILLVAXT"],
    },
  ],
  kortNamn: {
    T_GAST_SVE: "Svenska gäster",
    T_GAST_UTL: "Utländska gäster",
    T_GAST_HOTELL: "Hotell",
    T_GAST_CAMPING: "Camping",
    T_GAST_STUGBY: "Stugbyar",
    T_GAST_VANDRARHEM: "Vandrarhem",
    T_GAST_SOL: "Förmedlade stugor och lägenheter",
  },
  visningsnamn: {
    T_GAST_TOT: "Gästnätter, totalt",
    T_GAST_HOTELL: "Gästnätter, hotell",
    T_GAST_CAMPING: "Gästnätter, camping",
    T_GAST_STUGBY: "Gästnätter, stugbyar",
    T_GAST_VANDRARHEM: "Gästnätter, vandrarhem",
    T_GAST_SOL: "Gästnätter, förmedlade stugor och lägenheter",
    T_GAST_SVE: "Gästnätter, svenska gäster",
    T_GAST_UTL: "Gästnätter, utländska gäster",
    T_ANDEL_UTL_NATTER: "Andel utländska gästnätter",
    T_ANKOMST_SVE: "Gästankomster, svenska",
    T_ANKOMST_UTL: "Gästankomster, utländska",
    T_ANDEL_UTL: "Andel utländska gästankomster",
    T_BELAGG_RUM: "Rumsbeläggning",
    T_BELAGG_BADD: "Bäddbeläggning",
    T_LOGIINTAKT: "Logiintäkter",
    T_ANLAGGNINGAR: "Antal anläggningar",
    T_INTAKT_PER_GAST: "Logiintäkt per gästnatt",
    T_GAST_PER_ANLAGG: "Gästnätter per anläggning",
    T_GAST_PER_INV: "Gästnätter per invånare",
    T_GAST_TILLVAXT: "Gästnätter, årlig förändring",
    T_INTAKT_TILLVAXT: "Logiintäkter, årlig förändring",
  },
};

export default turism;
