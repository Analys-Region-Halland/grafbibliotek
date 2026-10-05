import type { TemaConfig } from "./tema-config";

const G = {
  SYSS: "Sysselsättning",
  ARBL: "Arbetslöshet och arbetskraft",
  DAG: "Näringsliv (dagbefolkning)",
  GAST: "Gästnätter",
  BEF: "Befolkning och bostadsbyggande",
};

const konjunktur: TemaConfig = {
  temaId: "konjunktur",
  temaNamn: "Konjunktur",
  temaFarg: "bla",
  sektioner: [
    {
      id: "nattbefolkning",
      gruppRubrik: G.SYSS,
      namn: "Sysselsatta nattbefolkning 15–74 år (prelim.)",
      kpiIds: ["K_NATT_ANT", "K_NATT_GRAD"],
    },
    {
      id: "sysselsattning",
      gruppRubrik: G.SYSS,
      namn: "Sysselsättningsgrad 20–64 år (prelim.)",
      kpiIds: ["K_SYSS_TOT", "K_SYSS_FORANDR"],
      undersektioner: [
        { namn: "kvinnor och män", delAv: "K_SYSS_TOT", kpiIds: ["K_SYSS_KV", "K_SYSS_MAN"] },
        { namn: "inrikes och utrikes födda", delAv: "K_SYSS_TOT", kpiIds: ["K_SYSS_INR", "K_SYSS_UTR"] },
      ],
    },
    {
      id: "arbetsloshet",
      gruppRubrik: G.ARBL,
      namn: "Arbetslöshet 20–64 år (prelim.)",
      kpiIds: ["K_ARBL_TOT", "K_ARBL_FORANDR"],
      undersektioner: [
        { namn: "kvinnor och män", delAv: "K_ARBL_TOT", kpiIds: ["K_ARBL_KV", "K_ARBL_MAN"] },
        { namn: "inrikes och utrikes födda", delAv: "K_ARBL_TOT", kpiIds: ["K_ARBL_INR", "K_ARBL_UTR"] },
      ],
    },
    {
      id: "arbetskraft",
      gruppRubrik: G.ARBL,
      namn: "Arbetskraftsdeltagande 20–64 år (prelim.)",
      kpiIds: ["K_ARKR_TOT"],
      undersektioner: [{ namn: "kvinnor och män", kpiIds: ["K_ARKR_KV", "K_ARKR_MAN"] }],
    },
    {
      id: "dagbefolkning",
      gruppRubrik: G.DAG,
      namn: "Sysselsatta dagbefolkning 15–74 år (prelim.)",
      kpiIds: ["K_DAG_TOT", "K_DAG_TILLVAXT"],
      undersektioner: [
        {
          namn: "branscherna",
          delAv: "K_DAG_TOT",
          sorteraEfterVarde: true,
          kpiIds: [
            "K_DAG_JORD", "K_DAG_IND", "K_DAG_ENMI", "K_DAG_BYG", "K_DAG_HAND",
            "K_DAG_TRANS", "K_DAG_HOTEL", "K_DAG_IT", "K_DAG_FINANS", "K_DAG_FAST",
            "K_DAG_FORETJ", "K_DAG_OFF", "K_DAG_KULT",
          ],
        },
      ],
    },
    {
      id: "gastnatter",
      gruppRubrik: G.GAST,
      namn: "Gästnätter",
      kpiIds: ["K_GAST_TOT", "K_ANDEL_UTL", "K_GAST_TILLVAXT"],
      undersektioner: [
        { namn: "svenska och utländska gäster", delAv: "K_GAST_TOT", kpiIds: ["K_GAST_SVE", "K_GAST_UTL"] },
      ],
    },
    {
      id: "befolkning",
      gruppRubrik: G.BEF,
      namn: "Befolkningsutveckling",
      kpiIds: ["K_BEF_TOT", "K_BEF_FORANDR"],
    },
    {
      id: "byggnation",
      gruppRubrik: G.BEF,
      namn: "Bostadsbyggande",
      kpiIds: ["K_BYGG_TOT"],
      undersektioner: [{ namn: "småhus och flerbostadshus", kpiIds: ["K_BYGG_SMAHUS", "K_BYGG_FLERBO"] }],
    },
  ],
  kortNamn: {
    K_SYSS_KV: "Kvinnor",
    K_SYSS_MAN: "Män",
    K_SYSS_INR: "Inrikes födda",
    K_SYSS_UTR: "Utrikes födda",
    K_ARBL_KV: "Kvinnor",
    K_ARBL_MAN: "Män",
    K_ARBL_INR: "Inrikes födda",
    K_ARBL_UTR: "Utrikes födda",
    K_ARKR_KV: "Kvinnor",
    K_ARKR_MAN: "Män",
    K_DAG_JORD: "Jordbruk med mera",
    K_DAG_IND: "Tillverkning",
    K_DAG_ENMI: "Energi och miljö",
    K_DAG_BYG: "Bygg",
    K_DAG_HAND: "Handel",
    K_DAG_TRANS: "Transport",
    K_DAG_HOTEL: "Hotell och restaurang",
    K_DAG_IT: "IT och kommunikation",
    K_DAG_FINANS: "Finans",
    K_DAG_FAST: "Fastigheter",
    K_DAG_FORETJ: "Företagstjänster",
    K_DAG_OFF: "Offentlig sektor",
    K_DAG_KULT: "Kultur med mera",
    K_GAST_SVE: "Svenska gäster",
    K_GAST_UTL: "Utländska gäster",
    K_BYGG_SMAHUS: "Småhus",
    K_BYGG_FLERBO: "Lägenheter i flerbostadshus",
  },
  visningsnamn: {
    K_NATT_ANT: "Sysselsatta nattbefolkning 15–74 år, antal (prelim.)",
    K_NATT_GRAD: "Sysselsättningsgrad 15–74 år (prelim.)",

    K_SYSS_TOT: "Sysselsatta bland befolkningen 20–64 år, andel (%) (prelim.)",
    K_SYSS_ANT: "Sysselsatta i befolkningen 20–64 år, antal (prelim.)",
    K_SYSS_INR: "Sysselsatta bland inrikes födda 20–64 år, andel (%) (prelim.)",
    K_SYSS_UTR: "Sysselsatta bland utrikes födda 20–64 år, andel (%) (prelim.)",
    K_SYSS_KV: "Sysselsatta bland kvinnor 20–64 år, andel (%) (prelim.)",
    K_SYSS_MAN: "Sysselsatta bland män 20–64 år, andel (%) (prelim.)",

    K_ARBL_TOT: "Arbetslösa i arbetskraften 20–64 år, andel (%) (prelim.)",
    K_ARBL_ANT: "Arbetslösa i arbetskraften 20–64 år, antal (prelim.)",
    K_ARBL_INR: "Arbetslösa bland inrikes födda 20–64 år, andel (%) (prelim.)",
    K_ARBL_UTR: "Arbetslösa bland utrikes födda 20–64 år, andel (%) (prelim.)",
    K_ARBL_KV: "Arbetslösa bland kvinnor 20–64 år, andel (%) (prelim.)",
    K_ARBL_MAN: "Arbetslösa bland män 20–64 år, andel (%) (prelim.)",

    K_ARKR_TOT: "I arbetskraften bland befolkningen 20–64 år, andel (%) (prelim.)",
    K_ARKR_KV: "I arbetskraften bland kvinnor 20–64 år, andel (%) (prelim.)",
    K_ARKR_MAN: "I arbetskraften bland män 20–64 år, andel (%) (prelim.)",

    K_DAG_TOT: "Sysselsatta dagbefolkning 15–74 år, antal (prelim.)",
    K_DAG_JORD: "Sysselsatta inom jordbruk och skogsbruk (prelim.)",
    K_DAG_IND: "Sysselsatta inom tillverkning (prelim.)",
    K_DAG_ENMI: "Sysselsatta inom energi och miljö (prelim.)",
    K_DAG_BYG: "Sysselsatta inom byggverksamhet (prelim.)",
    K_DAG_HAND: "Sysselsatta inom handel (prelim.)",
    K_DAG_TRANS: "Sysselsatta inom transport (prelim.)",
    K_DAG_HOTEL: "Sysselsatta inom hotell och restaurang (prelim.)",
    K_DAG_IT: "Sysselsatta inom IT och kommunikation (prelim.)",
    K_DAG_FINANS: "Sysselsatta inom finans och försäkring (prelim.)",
    K_DAG_FAST: "Sysselsatta inom fastighetsverksamhet (prelim.)",
    K_DAG_FORETJ: "Sysselsatta inom företagstjänster (prelim.)",
    K_DAG_OFF: "Sysselsatta inom offentlig sektor (prelim.)",
    K_DAG_KULT: "Sysselsatta inom kultur, nöje och fritid (prelim.)",

    K_SYSS_FORANDR: "Sysselsättningsgrad, årsförändring (procentenheter)",
    K_ARBL_FORANDR: "Arbetslöshet, årsförändring (procentenheter)",
    K_DAG_TILLVAXT: "Dagbefolkning, årsförändring (procent)",

    K_GAST_TOT: "Gästnätter totalt (prelim.)",
    K_GAST_SVE: "Gästnätter svenska gäster",
    K_GAST_UTL: "Gästnätter utländska gäster",
    K_ANDEL_UTL: "Andel utländska gästnätter (%)",
    K_GAST_TILLVAXT: "Gästnätter, årsförändring (%)",

    K_BEF_TOT: "Folkmängd (prelim.)",
    K_BEF_FORANDR: "Befolkningsförändring mot samma månad fg. år",

    K_BYGG_TOT: "Påbörjade lägenheter, alla hustyper (kvartal)",
    K_BYGG_SMAHUS: "Påbörjade lägenheter, småhus (kvartal)",
    K_BYGG_FLERBO: "Påbörjade lägenheter, flerbostadshus (kvartal)",
  },
  lagtArBra: [
    "K_ARBL_TOT", "K_ARBL_ANT", "K_ARBL_INR", "K_ARBL_UTR",
    "K_ARBL_KV", "K_ARBL_MAN", "K_ARBL_FORANDR",
  ],
  hogtArBra: [
    "K_NATT_GRAD", "K_SYSS_TOT", "K_SYSS_FORANDR", "K_SYSS_KV", "K_SYSS_MAN", "K_SYSS_INR",
    "K_SYSS_UTR", "K_ARKR_TOT", "K_ARKR_KV", "K_ARKR_MAN",
  ],
};

export default konjunktur;
