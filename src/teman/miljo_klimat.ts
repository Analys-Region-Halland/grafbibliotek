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
};

export default miljoKlimat;
