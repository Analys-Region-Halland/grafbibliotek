import type { TemaConfig } from "./tema-config";

const G = {
  BEF: "Befolkningen 20–64 år",
  UNGA: "Unga och långtidsarbetslösa",
};

const arbetsmarknad: TemaConfig = {
  temaId: "arbetsmarknad",
  temaNamn: "Arbetsmarknad",
  temaFarg: "bla",
  sektioner: [
    {
      id: "sysselsattning",
      gruppRubrik: G.BEF,
      namn: "Sysselsättningsgrad, 20–64 år",
      kpiIds: ["S_SYSS_TOT"],
      undersektioner: [
        { namn: "kvinnor och män", kpiIds: ["S_SYSS_KV", "S_SYSS_MAN"] },
        { namn: "inrikes och utrikes födda", kpiIds: ["S_SYSS_INR", "S_SYSS_UTR"] },
      ],
    },
    {
      id: "arbetskraft",
      gruppRubrik: G.BEF,
      namn: "Arbetskraftsdeltagande, 20–64 år",
      kpiIds: ["S_ARKR_TOT"],
      undersektioner: [
        { namn: "kvinnor och män", kpiIds: ["S_ARKR_KV", "S_ARKR_MAN"] },
        { namn: "inrikes och utrikes födda", kpiIds: ["S_ARKR_INR", "S_ARKR_UTR"] },
      ],
    },
    {
      id: "arbetsloshet",
      gruppRubrik: G.BEF,
      namn: "Arbetslöshet, 20–64 år",
      kpiIds: ["S_ARBL_TOT"],
      undersektioner: [
        { namn: "kvinnor och män", kpiIds: ["S_ARBL_KV", "S_ARBL_MAN"] },
        { namn: "inrikes och utrikes födda", kpiIds: ["S_ARBL_INR", "S_ARBL_UTR"] },
      ],
    },
    {
      id: "inkomst",
      gruppRubrik: G.BEF,
      namn: "Förvärvsinkomst, median 20–64 år",
      kpiIds: ["N00906"],
    },
    {
      id: "unga",
      gruppRubrik: G.UNGA,
      namn: "Unga och långtidsarbetslösa",
      kpiIds: ["N03942", "N02797", "N03954"],
    },
  ],
  kortNamn: {
    S_SYSS_KV: "Kvinnor",
    S_SYSS_MAN: "Män",
    S_SYSS_INR: "Inrikes födda",
    S_SYSS_UTR: "Utrikes födda",
    S_ARKR_KV: "Kvinnor",
    S_ARKR_MAN: "Män",
    S_ARKR_INR: "Inrikes födda",
    S_ARKR_UTR: "Utrikes födda",
    S_ARBL_KV: "Kvinnor",
    S_ARBL_MAN: "Män",
    S_ARBL_INR: "Inrikes födda",
    S_ARBL_UTR: "Utrikes födda",
  },
  visningsnamn: {
    "S_SYSS_TOT": "Sysselsatta bland befolkningen 20–64 år, andel (%)",
    "S_SYSS_TOT_N": "Sysselsatta i befolkningen 20–64 år, antal",
    "S_SYSS_INR": "Sysselsatta bland inrikes födda 20–64 år, andel (%)",
    "S_SYSS_INR_N": "Sysselsatta bland inrikes födda 20–64 år, antal",
    "S_SYSS_UTR": "Sysselsatta bland utrikes födda 20–64 år, andel (%)",
    "S_SYSS_UTR_N": "Sysselsatta bland utrikes födda 20–64 år, antal",
    "S_SYSS_KV": "Sysselsatta bland kvinnor 20–64 år, andel (%)",
    "S_SYSS_KV_N": "Sysselsatta bland kvinnor 20–64 år, antal",
    "S_SYSS_MAN": "Sysselsatta bland män 20–64 år, andel (%)",
    "S_SYSS_MAN_N": "Sysselsatta bland män 20–64 år, antal",

    "S_ARKR_TOT": "I arbetskraften bland befolkningen 20–64 år, andel (%)",
    "S_ARKR_TOT_N": "I arbetskraften bland befolkningen 20–64 år, antal",
    "S_ARKR_INR": "I arbetskraften bland inrikes födda 20–64 år, andel (%)",
    "S_ARKR_INR_N": "I arbetskraften bland inrikes födda 20–64 år, antal",
    "S_ARKR_UTR": "I arbetskraften bland utrikes födda 20–64 år, andel (%)",
    "S_ARKR_UTR_N": "I arbetskraften bland utrikes födda 20–64 år, antal",
    "S_ARKR_KV": "I arbetskraften bland kvinnor 20–64 år, andel (%)",
    "S_ARKR_KV_N": "I arbetskraften bland kvinnor 20–64 år, antal",
    "S_ARKR_MAN": "I arbetskraften bland män 20–64 år, andel (%)",
    "S_ARKR_MAN_N": "I arbetskraften bland män 20–64 år, antal",

    "S_ARBL_TOT": "Arbetslösa i arbetskraften 20–64 år, andel (%)",
    "S_ARBL_TOT_N": "Arbetslösa i arbetskraften 20–64 år, antal",
    "S_ARBL_INR": "Arbetslösa bland inrikes födda 20–64 år, andel (%)",
    "S_ARBL_INR_N": "Arbetslösa bland inrikes födda 20–64 år, antal",
    "S_ARBL_UTR": "Arbetslösa bland utrikes födda 20–64 år, andel (%)",
    "S_ARBL_UTR_N": "Arbetslösa bland utrikes födda 20–64 år, antal",
    "S_ARBL_KV": "Arbetslösa bland kvinnor 20–64 år, andel (%)",
    "S_ARBL_KV_N": "Arbetslösa bland kvinnor 20–64 år, antal",
    "S_ARBL_MAN": "Arbetslösa bland män 20–64 år, andel (%)",
    "S_ARBL_MAN_N": "Arbetslösa bland män 20–64 år, antal",
    "N00906": "Sammanräknad förvärvsinkomst 20–64 år, median, kr",
    "N03942": "Arbetslösa i arbetskraften 18–24 år, andel (%)",
    "N02797": "Unga 16–24 år som varken arbetar eller studerar, andel (%)",
    "N03954": "Långtidsarbetslösa av de arbetslösa 18–65 år, andel (%)",
  },
  lagtArBra: [
    "S_ARBL_TOT", "S_ARBL_TOT_N", "S_ARBL_INR", "S_ARBL_INR_N",
    "S_ARBL_UTR", "S_ARBL_UTR_N", "S_ARBL_KV", "S_ARBL_KV_N",
    "S_ARBL_MAN", "S_ARBL_MAN_N", "N03942", "N02797", "N03954",
  ],
  hogtArBra: [
    "S_SYSS_TOT", "S_SYSS_KV", "S_SYSS_MAN", "S_SYSS_INR", "S_SYSS_UTR", "S_ARKR_TOT",
    "S_ARKR_KV", "S_ARKR_MAN", "S_ARKR_INR", "S_ARKR_UTR",
  ],
};

export default arbetsmarknad;
