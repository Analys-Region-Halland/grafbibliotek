import type { TemaConfig } from "./tema-config";

const miljoKlimat: TemaConfig = {
  temaId: "miljo_klimat",
  temaNamn: "Miljö & klimat",
  temaFarg: "gron",
  nettoKpis: [],
  ingetIndex: [],
  sektioner: [
    {
      id: "utslapp",
      namn: "Växthusgasutsläpp",
      kpiIds: ["N00401"],
      undersektioner: [
        {
          namn: "Per sektor",
          kpiIds: ["N85073", "N85077", "N85078", "N85072"],
        },
      ],
    },
    {
      id: "energi",
      namn: "Energi och omställning",
      kpiIds: ["N45913", "N45925", "N00403"],
    },
  ],
  visningsnamn: {
    N00401: "Växthusgasutsläpp totalt, ton CO2-ekvivalenter per invånare",
    N07702: "Växthusgasutsläpp totalt, ton CO2-ekvivalenter",
    N85073: "Växthusgasutsläpp transporter, ton CO2-ekvivalenter per invånare",
    N85533: "Växthusgasutsläpp transporter, ton CO2-ekvivalenter",
    N85077: "Växthusgasutsläpp industri, ton CO2-ekvivalenter per invånare",
    N85537: "Växthusgasutsläpp industri, ton CO2-ekvivalenter",
    N85078: "Växthusgasutsläpp jordbruk, ton CO2-ekvivalenter per invånare",
    N85538: "Växthusgasutsläpp jordbruk, ton CO2-ekvivalenter",
    N85072: "Växthusgasutsläpp uppvärmning, ton CO2-ekvivalenter per invånare",
    N85532: "Växthusgasutsläpp uppvärmning, ton CO2-ekvivalenter",
    N45913: "Energianvändning transporter, MWh per invånare",
    N45945: "Energianvändning transporter, MWh",
    N45925: "Elproduktion av förnybara energikällor, andel (%)",
    N00403: "Ekologiskt brukad åkermark, andel (%)",
  },
  kortNamn: {
    N85073: "Transporter",
    N85077: "Industri",
    N85078: "Jordbruk",
    N85072: "Uppvärmning",
  },
  lagtArBra: [
    "N00401", "N07702", "N85073", "N85533", "N85077", "N85537",
    "N85078", "N85538", "N85072", "N85532", "N45913", "N45945",
  ],
};

export default miljoKlimat;
