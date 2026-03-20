import type { TemaConfig } from "./tema-config";

const G = {
  HALSA: "Hälsa",
  PSYKISK: "Psykisk hälsa",
  LEVNAD: "Levnadsvanor",
  INKOMST: "Inkomster och försörjning",
};

const socioekonomi: TemaConfig = {
  temaId: "socioekonomi",
  temaNamn: "Socioekonomi & hälsa",
  temaFarg: "rod",
  nettoKpis: [],
  ingetIndex: ["F_MEDLIVS_KV", "F_MEDLIVS_MAN"],
  sektioner: [
    // ── Hälsa ──
    {
      id: "ohalsa_tal",
      gruppRubrik: G.HALSA,
      namn: "Ohälsotal",
      kpiIds: ["N00957"],
      undersektioner: [
        { namn: "Kön", kpiIds: ["N00957_KV", "N00957_MAN"] },
      ],
    },
    {
      id: "sjukpenning",
      gruppRubrik: G.HALSA,
      namn: "Sjukpenningtal",
      kpiIds: ["N00938"],
      undersektioner: [
        { namn: "Kön", kpiIds: ["N00938_KV", "N00938_MAN"] },
      ],
    },
    {
      id: "halsa_god",
      gruppRubrik: G.HALSA,
      namn: "Självskattad hälsa",
      kpiIds: ["F_HALSA_GOD"],
      undersektioner: [
        { namn: "Kön", kpiIds: ["F_HALSA_GOD_KV", "F_HALSA_GOD_MAN"] },
      ],
    },
    {
      id: "medlivs",
      gruppRubrik: G.HALSA,
      namn: "Medellivslängd",
      kpiIds: ["F_MEDLIVS_KV", "F_MEDLIVS_MAN"],
    },
    {
      id: "dodlighet",
      gruppRubrik: G.HALSA,
      namn: "Förtida dödlighet",
      kpiIds: ["F_FORTID"],
      undersektioner: [
        { namn: "Kön", kpiIds: ["F_FORTID_KV", "F_FORTID_MAN"] },
      ],
    },

    // ── Psykisk hälsa ──
    {
      id: "psykisk",
      gruppRubrik: G.PSYKISK,
      namn: "Allvarlig psykisk påfrestning",
      kpiIds: ["F_PSYK_PAFR"],
      undersektioner: [
        { namn: "Kön", kpiIds: ["F_PSYK_PAFR_KV", "F_PSYK_PAFR_MAN"] },
      ],
    },
    {
      id: "stress",
      gruppRubrik: G.PSYKISK,
      namn: "Stress",
      kpiIds: ["F_STRESS"],
      undersektioner: [
        { namn: "Kön", kpiIds: ["F_STRESS_KV", "F_STRESS_MAN"] },
      ],
    },
    {
      id: "psyk_barn",
      gruppRubrik: G.PSYKISK,
      namn: "Psykisk ohälsa, barn och unga",
      kpiIds: ["N33820"],
      undersektioner: [
        { namn: "Kön", kpiIds: ["N33820_KV", "N33820_MAN"] },
      ],
    },
    {
      id: "suicid",
      gruppRubrik: G.PSYKISK,
      namn: "Suicid",
      kpiIds: ["F_SUICID"],
      undersektioner: [
        { namn: "Kön", kpiIds: ["F_SUICID_KV", "F_SUICID_MAN"] },
      ],
    },

    // ── Levnadsvanor ──
    {
      id: "overvikt",
      gruppRubrik: G.LEVNAD,
      namn: "Övervikt och obesitas",
      kpiIds: ["F_OVERVIKT"],
      undersektioner: [
        { namn: "Kön", kpiIds: ["F_OVERVIKT_KV", "F_OVERVIKT_MAN"] },
      ],
    },
    {
      id: "tobak",
      gruppRubrik: G.LEVNAD,
      namn: "Daglig tobaksrökning",
      kpiIds: ["F_TOBAK"],
      undersektioner: [
        { namn: "Kön", kpiIds: ["F_TOBAK_KV", "F_TOBAK_MAN"] },
      ],
    },
    {
      id: "alkohol",
      gruppRubrik: G.LEVNAD,
      namn: "Riskkonsumtion alkohol",
      kpiIds: ["F_ALK_RISK"],
      undersektioner: [
        { namn: "Kön", kpiIds: ["F_ALK_RISK_KV", "F_ALK_RISK_MAN"] },
      ],
    },

    // ── Inkomster och försörjning ──
    {
      id: "ekon_standard",
      gruppRubrik: G.INKOMST,
      namn: "Ekonomisk standard",
      kpiIds: ["F_DINK"],
      undersektioner: [
        { namn: "Kön", kpiIds: ["F_DINK_KV", "F_DINK_MAN"] },
      ],
    },
    {
      id: "gini_forvarv",
      gruppRubrik: G.INKOMST,
      namn: "Ginikoefficient, förvärvsinkomst",
      kpiIds: ["N00956"],
    },
    {
      id: "gini_disp",
      gruppRubrik: G.INKOMST,
      namn: "Ginikoefficient, disponibel inkomst",
      kpiIds: ["N00997"],
    },
    {
      id: "vek_vux",
      gruppRubrik: G.INKOMST,
      namn: "Varaktigt låg ekonomisk standard",
      kpiIds: ["F_VEK_VUX"],
    },
    {
      id: "vink_barn",
      gruppRubrik: G.INKOMST,
      namn: "Varaktigt låg inkomststandard, barn",
      kpiIds: ["F_VINK_BARN"],
    },
    {
      id: "bistand",
      gruppRubrik: G.INKOMST,
      namn: "Kostnad ekonomiskt bistånd",
      kpiIds: ["N31001"],
    },

  ],
  visningsnamn: {
    // Kolada
    N00956: "Ginikoefficient, förvärvsinkomst",
    N00997: "Ginikoefficient, disponibel inkomst",
    N00957: "Ohälsotal, dagar",
    N00957_KV: "Ohälsotal, kvinnor, dagar",
    N00957_MAN: "Ohälsotal, män, dagar",
    N00938: "Sjukpenningtalet 16–64 år, dagar per försäkrad",
    N00938_KV: "Sjukpenningtal, kvinnor, dagar per försäkrad",
    N00938_MAN: "Sjukpenningtal, män, dagar per försäkrad",
    N33820: "Psykisk ohälsa bland barn och unga, andel (%)",
    N33820_KV: "Psykisk ohälsa, flickor, andel (%)",
    N33820_MAN: "Psykisk ohälsa, pojkar, andel (%)",
    N31001: "Kostnad ekonomiskt bistånd, kronor per invånare",
    N31910: "Biståndshushåll, antal",
    // FoHM — hälsa
    F_HALSA_GOD: "Självskattad god hälsa, andel (%)",
    F_HALSA_GOD_KV: "Självskattad god hälsa, kvinnor (%)",
    F_HALSA_GOD_MAN: "Självskattad god hälsa, män (%)",
    F_MEDLIVS_KV: "Medellivslängd vid födseln, kvinnor (år)",
    F_MEDLIVS_MAN: "Medellivslängd vid födseln, män (år)",
    F_FORTID: "Förtida dödlighet 25–64 år, per 100 000 invånare",
    F_FORTID_KV: "Förtida dödlighet, kvinnor 25–64 år, per 100 000",
    F_FORTID_MAN: "Förtida dödlighet, män 25–64 år, per 100 000",
    // FoHM — psykisk hälsa
    F_PSYK_PAFR: "Allvarlig psykisk påfrestning, andel (%)",
    F_PSYK_PAFR_KV: "Allvarlig psykisk påfrestning, kvinnor (%)",
    F_PSYK_PAFR_MAN: "Allvarlig psykisk påfrestning, män (%)",
    F_STRESS: "Stress, andel (%)",
    F_STRESS_KV: "Stress, kvinnor (%)",
    F_STRESS_MAN: "Stress, män (%)",
    F_SUICID: "Suicid 25+ år, per 100 000 invånare",
    F_SUICID_KV: "Suicid, kvinnor, per 100 000",
    F_SUICID_MAN: "Suicid, män, per 100 000",
    // FoHM — inkomst
    F_DINK: "Ekonomisk standard, medianinkomst i tusenkronor",
    F_DINK_KV: "Ekonomisk standard, kvinnor (tkr)",
    F_DINK_MAN: "Ekonomisk standard, män (tkr)",
    F_VEK_VUX: "Varaktigt låg ekonomisk standard, vuxna, andel (%)",
    F_VINK_BARN: "Varaktigt låg inkomststandard, barn och unga, andel (%)",
    // FoHM — levnadsvanor
    F_OVERVIKT: "Övervikt och obesitas (BMI 25+), andel (%)",
    F_OVERVIKT_KV: "Övervikt och obesitas, kvinnor (%)",
    F_OVERVIKT_MAN: "Övervikt och obesitas, män (%)",
    F_TOBAK: "Daglig tobaksrökning, andel (%)",
    F_TOBAK_KV: "Daglig tobaksrökning, kvinnor (%)",
    F_TOBAK_MAN: "Daglig tobaksrökning, män (%)",
    F_ALK_RISK: "Riskkonsumtion av alkohol, andel (%)",
    F_ALK_RISK_KV: "Riskkonsumtion av alkohol, kvinnor (%)",
    F_ALK_RISK_MAN: "Riskkonsumtion av alkohol, män (%)",
  },
  lagtArBra: [
    "N00957", "N00957_KV", "N00957_MAN",
    "N00938", "N00938_KV", "N00938_MAN",
    "N31001", "N31910",
    "N33820", "N33820_KV", "N33820_MAN",
    "N00956", "N00997",
    "F_TOBAK", "F_TOBAK_KV", "F_TOBAK_MAN",
    "F_FORTID", "F_FORTID_KV", "F_FORTID_MAN",
    "F_SUICID", "F_SUICID_KV", "F_SUICID_MAN",
    "F_PSYK_PAFR", "F_PSYK_PAFR_KV", "F_PSYK_PAFR_MAN",
    "F_STRESS", "F_STRESS_KV", "F_STRESS_MAN",
    "F_OVERVIKT", "F_OVERVIKT_KV", "F_OVERVIKT_MAN",
    "F_ALK_RISK", "F_ALK_RISK_KV", "F_ALK_RISK_MAN",
    "F_VEK_VUX", "F_VINK_BARN",
  ],
  kortNamn: {
    // Medellivslängd (multi-kort)
    F_MEDLIVS_KV: "Kvinnor",
    F_MEDLIVS_MAN: "Män",
    // Könsnedbrytningar
    F_HALSA_GOD_KV: "Kvinnor",
    F_HALSA_GOD_MAN: "Män",
    F_FORTID_KV: "Kvinnor 25–64 år",
    F_FORTID_MAN: "Män 25–64 år",
    N00957_KV: "Kvinnor",
    N00957_MAN: "Män",
    N00938_KV: "Kvinnor",
    N00938_MAN: "Män",
    F_PSYK_PAFR_KV: "Kvinnor",
    F_PSYK_PAFR_MAN: "Män",
    F_STRESS_KV: "Kvinnor",
    F_STRESS_MAN: "Män",
    N33820_KV: "Flickor",
    N33820_MAN: "Pojkar",
    F_SUICID_KV: "Kvinnor 25+ år",
    F_SUICID_MAN: "Män 25+ år",
    F_OVERVIKT_KV: "Kvinnor",
    F_OVERVIKT_MAN: "Män",
    F_TOBAK_KV: "Kvinnor",
    F_TOBAK_MAN: "Män",
    F_ALK_RISK_KV: "Kvinnor",
    F_ALK_RISK_MAN: "Män",
    F_DINK_KV: "Kvinnor",
    F_DINK_MAN: "Män",
  },
};

export default socioekonomi;
