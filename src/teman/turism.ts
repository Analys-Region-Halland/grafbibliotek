import type { TemaConfig } from "./tema-config";

const turism: TemaConfig = {
  temaId: "turism",
  temaNamn: "Turism & besöksnäring",
  temaFarg: "rod",
  kortNamn: {
    T_GAST_HOTELL: "Hotell",
    T_GAST_CAMPING: "Camping",
    T_GAST_STUGBY: "Stugbyar",
    T_GAST_VANDRARHEM: "Vandrarhem",
    T_GAST_SOL: "Stugor/lgh",
    T_GAST_SVE: "Svenska",
    T_GAST_UTL: "Utländska",
    T_ANKOMST_SVE: "Svenska",
    T_ANKOMST_UTL: "Utländska",
  },
  sektioner: [
    {
      id: "gastnatter",
      namn: "Gästnätter",
      kpiIds: ["T_GAST_TOT", "T_GAST_PER_INV"],
      undersektioner: [
        {
          namn: "Per anläggningstyp",
          kpiIds: [
            "T_GAST_HOTELL",
            "T_GAST_CAMPING",
            "T_GAST_STUGBY",
            "T_GAST_VANDRARHEM",
            "T_GAST_SOL",
          ],
        },
      ],
    },
    {
      id: "marknad",
      namn: "Inhemska och utländska gäster",
      kpiIds: [
        "T_GAST_SVE",
        "T_GAST_UTL",
        "T_ANDEL_UTL_NATTER",
        "T_ANKOMST_SVE",
        "T_ANKOMST_UTL",
        "T_ANDEL_UTL",
      ],
    },
    {
      id: "tillvaxt",
      namn: "Utveckling och tillväxt",
      kpiIds: ["T_GAST_TILLVAXT", "T_INTAKT_TILLVAXT"],
    },
    {
      id: "kapacitet",
      namn: "Kapacitet och intäkter",
      kpiIds: [
        "T_BELAGG_RUM",
        "T_BELAGG_BADD",
        "T_LOGIINTAKT",
        "T_INTAKT_PER_GAST",
        "T_GAST_PER_ANLAGG",
        "T_ANLAGGNINGAR",
      ],
    },
  ],
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
