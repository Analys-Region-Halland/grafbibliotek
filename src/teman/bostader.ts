import type { TemaConfig } from "./tema-config";

const bostader: TemaConfig = {
  temaId: "bostader",
  temaNamn: "Bostäder",
  temaFarg: "gul",
  sektioner: [
    {
      id: "bestand",
      namn: "Bostadsbestånd",
      kpiIds: ["N07913"],
      undersektioner: [
        { namn: "Upplåtelseform", kpiIds: ["N07956", "N07957", "N07958"] },
      ],
    },
    {
      id: "byggande",
      namn: "Nybyggda bostäder",
      kpiIds: ["N07917"],
      undersektioner: [
        { namn: "Typ", kpiIds: ["N07905", "N07906", "N07923"] },
      ],
    },
    {
      id: "brpris",
      namn: "Bostadsrättspris",
      kpiIds: ["N07908"],
    },
    {
      id: "shpris",
      namn: "Småhuspris",
      kpiIds: ["N07909"],
    },
    {
      id: "trang",
      namn: "Trångboddhet",
      kpiIds: ["N07907"],
    },
    {
      id: "kolltrafik",
      namn: "Kollektivtrafiknära",
      kpiIds: ["N07418"],
    },
  ],
  visningsnamn: {
    "N07913": "Antal bostäder per 1 000 invånare",
    "B_TOT": "Antal bostäder, totalt",
    "N07956": "Hyresrätter per 1 000 invånare",
    "B_HYRA_N": "Hyresrätter, antal",
    "N07957": "Bostadsrätter per 1 000 invånare",
    "B_BOST_N": "Bostadsrätter, antal",
    "N07958": "Äganderätter per 1 000 invånare",
    "B_AGAN_N": "Äganderätter, antal",
    "N07917": "Nybyggda bostäder per 1 000 invånare",
    "B_NY_TOT": "Nybyggda bostäder, antal",
    "N07905": "Färdigställda småhus per 1 000 invånare",
    "B_NY_SMAHUS": "Färdigställda småhus, antal",
    "N07906": "Färdigställda lägenheter i flerbostadshus per 1 000 invånare",
    "B_NY_FLERBO": "Färdigställda lägenheter i flerbostadshus, antal",
    "N07923": "Planberedskap för bostadsbyggande, antal bostäder i detaljplan",
    "N07908": "Genomsnittligt pris för bostadsrätter, kr/kvm",
    "N07909": "Genomsnittligt pris för småhus, tkr",
    "N07907": "Trångbodda hushåll, andel (%)",
    "N07418": "Bostäder i kollektivtrafiknära läge, andel (%)",
  },
  kortNamn: {
    "N07956": "Andel hyresrätter",
    "N07957": "Andel bostadsrätter",
    "N07958": "Andel äganderätter (småhus m.fl.)",
    "N07905": "Småhus",
    "N07906": "Flerbostadshus",
    "N07923": "Planberedskap",
  },
};

export default bostader;
