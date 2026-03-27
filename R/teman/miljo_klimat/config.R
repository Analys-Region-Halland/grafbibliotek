# teman/miljo_klimat/config.R — Konfiguration för temat Miljö & klimat
# Växthusgasutsläpp (totalt + sektorsuppdelat), energi, ekologisk mark.
# Alla KPI:er från Kolada, typ A (kommun + region + riket).

source("R/paket.R")

miljo_klimat_config <- function() {
  list(
    tema_id    = "miljo_klimat",
    tema_namn  = "Miljö & klimat",
    tema_farg  = "gron",
    datakalla  = "kolada",
    startar    = 2010,

    # Alla KPI-ID:n att hämta från Kolada
    kpier = c(
      # Växthusgasutsläpp — totalt
      "N00401",  # Växthusgaser totalt, ton CO2-ekv/inv
      "N07702",  # Växthusgaser totalt, ton CO2-ekv

      # Växthusgasutsläpp — per sektor (per inv + absolut)
      "N85073",  # Transporter, ton CO2e/inv
      "N85533",  # Transporter, ton CO2e
      "N85077",  # Industri, ton CO2e/inv
      "N85537",  # Industri, ton CO2e
      "N85078",  # Jordbruk, ton CO2e/inv
      "N85538",  # Jordbruk, ton CO2e
      "N85072",  # Egen uppvärmning, ton CO2e/inv
      "N85532",  # Egen uppvärmning, ton CO2e

      # Energi
      "N45913",  # Slutanvändning energi transporter, MWh/inv
      "N45945",  # Slutanvändning energi transporter, MWh
      "N45925",  # Elproduktion av förnybara energikällor, andel (%)

      # Ekologisk mark
      "N00403"   # Ekologiskt brukad åkermark, andel (%)
    ),

    # Sektioner — styr gruppering i frontend
    sektioner = list(
      list(
        id = "utslapp",
        namn = "Växthusgasutsläpp",
        kpi_ids = c("N00401", "N07702", "N85073", "N85533", "N85077", "N85537",
                     "N85078", "N85538", "N85072", "N85532")
      ),
      list(
        id = "energi",
        namn = "Energi och omställning",
        kpi_ids = c("N45913", "N45945", "N45925", "N00403")
      )
    ),

    # KPI-metadata: enhet, tema, par
    kpi_meta = tribble(
      ~kpi_id,   ~enhet,          ~tema,           ~par_kpi_id,
      "N00401",  "ton CO2/inv",   "miljo_klimat",  "N07702",
      "N07702",  "ton CO2",       "miljo_klimat",  "N00401",
      "N85073",  "ton CO2/inv",   "miljo_klimat",  "N85533",
      "N85533",  "ton CO2",       "miljo_klimat",  "N85073",
      "N85077",  "ton CO2/inv",   "miljo_klimat",  "N85537",
      "N85537",  "ton CO2",       "miljo_klimat",  "N85077",
      "N85078",  "ton CO2/inv",   "miljo_klimat",  "N85538",
      "N85538",  "ton CO2",       "miljo_klimat",  "N85078",
      "N85072",  "ton CO2/inv",   "miljo_klimat",  "N85532",
      "N85532",  "ton CO2",       "miljo_klimat",  "N85072",
      "N45913",  "MWh/inv",       "miljo_klimat",  "N45945",
      "N45945",  "MWh",           "miljo_klimat",  "N45913",
      "N45925",  "procent",       "miljo_klimat",  NA_character_,
      "N00403",  "procent",       "miljo_klimat",  NA_character_
    ),

    # Beskrivningar för alla KPI:er (överskriver Kolada-beskrivningar)
    beraknade_kpier = tribble(
      ~kpi_id,   ~kpi_namn,                                          ~beskrivning,
      "N00401",  "Växthusgasutsläpp totalt, ton CO2-ekv/inv",       "Totala utsläpp av växthusgaser inom kommunens geografiska gräns, mätt i ton koldioxidekvivalenter per invånare. Måttet inkluderar koldioxid, metan och lustgas från alla sektorer. Lägre värden innebär lägre klimatpåverkan per person. Källa: Nationella emissionsdatabasen via RKA Kolada.",
      "N07702",  "Växthusgasutsläpp totalt, ton CO2-ekv",           "Totala utsläpp av växthusgaser inom kommunens geografiska gräns, mätt i ton koldioxidekvivalenter. Måttet inkluderar samtliga sektorer: transporter, industri, jordbruk, uppvärmning med mera. Källa: Nationella emissionsdatabasen via RKA Kolada.",
      "N85073",  "Växthusgasutsläpp transporter, ton CO2-ekv/inv",  "Utsläpp av växthusgaser från inrikes transporter per invånare. Inkluderar vägtrafik, sjöfart, flyg, järnväg och arbetsmaskiner inom kommunens gräns. Kommuner med stor genomfartstrafik tenderar att ha högre värden. Källa: Nationella emissionsdatabasen via RKA Kolada.",
      "N85533",  "Växthusgasutsläpp transporter, ton CO2-ekv",      "Totala utsläpp av växthusgaser från inrikes transporter inom kommunens gräns. Inkluderar vägtrafik, sjöfart, flyg, järnväg och arbetsmaskiner. Källa: Nationella emissionsdatabasen via RKA Kolada.",
      "N85077",  "Växthusgasutsläpp industri, ton CO2-ekv/inv",     "Utsläpp av växthusgaser från industriprocesser och industriell energianvändning per invånare. Enstaka stora anläggningar kan ge höga per capita-värden i mindre kommuner. Källa: Nationella emissionsdatabasen via RKA Kolada.",
      "N85537",  "Växthusgasutsläpp industri, ton CO2-ekv",         "Totala utsläpp av växthusgaser från industriprocesser och industriell energianvändning inom kommunens gräns. Källa: Nationella emissionsdatabasen via RKA Kolada.",
      "N85078",  "Växthusgasutsläpp jordbruk, ton CO2-ekv/inv",     "Utsläpp av växthusgaser från jordbruket per invånare. Inkluderar metan från djurhållning och lustgas från gödsling. Kommuner med omfattande jordbruk har typiskt högre värden. Källa: Nationella emissionsdatabasen via RKA Kolada.",
      "N85538",  "Växthusgasutsläpp jordbruk, ton CO2-ekv",         "Totala utsläpp av växthusgaser från jordbruket inom kommunens gräns. Inkluderar metan från djurhållning, lustgas från gödsling och koldioxid från kalkning. Källa: Nationella emissionsdatabasen via RKA Kolada.",
      "N85072",  "Växthusgasutsläpp uppvärmning, ton CO2-ekv/inv",  "Utsläpp av växthusgaser från egen uppvärmning av bostäder och lokaler per invånare. Avser direkta utsläpp från förbränning av olja, gas och ved. Kommuner med utbyggd fjärrvärme har generellt lägre värden. Källa: Nationella emissionsdatabasen via RKA Kolada.",
      "N85532",  "Växthusgasutsläpp uppvärmning, ton CO2-ekv",      "Totala utsläpp av växthusgaser från egen uppvärmning av bostäder och lokaler inom kommunens gräns. Källa: Nationella emissionsdatabasen via RKA Kolada.",
      "N45913",  "Energianvändning transporter, MWh/inv",           "Slutanvändning av energi i transportsektorn per invånare, mätt i megawattimmar. Inkluderar bensin, diesel, el och biodrivmedel för alla trafikslag inom kommunen. Lägre värden kan spegla effektivare transporter eller kortare körsträckor. Källa: SCB Kommunal energistatistik via RKA Kolada.",
      "N45945",  "Energianvändning transporter, MWh",               "Total slutanvändning av energi i transportsektorn, mätt i megawattimmar. Inkluderar alla energislag för samtliga trafikslag inom kommunen. Källa: SCB Kommunal energistatistik via RKA Kolada.",
      "N45925",  "Förnybar elproduktion, andel",                    "Andel av den lokalt producerade elen som kommer från förnybara energikällor som vindkraft, vattenkraft och solenergi. Värdet kan överstiga 100 procent om kommunen producerar mer förnybar el än den totala elproduktionen inom dess gräns. Källa: SCB Kommunal energistatistik via RKA Kolada.",
      "N00403",  "Ekologiskt brukad åkermark, andel",               "Andel av kommunens totala åkermark som brukas ekologiskt, inklusive mark under omställning. Ekologiskt jordbruk innebär odling utan kemiska bekämpningsmedel och konstgödsel. Källa: Jordbruksverket via RKA Kolada."
    ),
    berakna_antal = list(),

    # Visningsnamn för frontend
    visningsnamn = list(
      "N00401" = "Växthusgasutsläpp totalt",
      "N07702" = "Växthusgasutsläpp totalt",
      "N85073" = "Växthusgasutsläpp, transporter",
      "N85533" = "Växthusgasutsläpp, transporter",
      "N85077" = "Växthusgasutsläpp, industri",
      "N85537" = "Växthusgasutsläpp, industri",
      "N85078" = "Växthusgasutsläpp, jordbruk",
      "N85538" = "Växthusgasutsläpp, jordbruk",
      "N85072" = "Växthusgasutsläpp, uppvärmning",
      "N85532" = "Växthusgasutsläpp, uppvärmning",
      "N45913" = "Energianvändning, transporter",
      "N45945" = "Energianvändning, transporter",
      "N45925" = "Förnybar elproduktion",
      "N00403" = "Ekologiskt brukad åkermark"
    )
  )
}
