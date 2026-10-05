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
      "N85075",  # Arbetsmaskiner, ton CO2e/inv
      "N85535",  # Arbetsmaskiner, ton CO2e
      "N85076",  # El och fjärrvärme, ton CO2e/inv
      "N85536",  # El och fjärrvärme, ton CO2e
      "N85543",  # Avfall inkl. avlopp, ton CO2e/inv
      "N85542",  # Avfall inkl. avlopp, ton CO2e
      "N85541",  # Produktanvändning inkl. lösningsmedel, ton CO2e/inv
      "N85540",  # Produktanvändning inkl. lösningsmedel, ton CO2e

      # Luftföroreningar
      "N85047",  # Kväveoxider (NOx), kg/inv
      "N07701",  # Kväveoxider (NOx), kg
      "N85048",  # Partiklar PM2.5, kg/inv
      "N07700",  # Partiklar PM2.5, kg

      # Avfall
      "U07801",  # Insamlat kommunalt avfall, kg/inv (justerat)
      "U07414",  # Kommunalt avfall till materialåtervinning inkl. biologisk behandling, andel (%)

      # Skyddad natur
      "N85054",  # Skyddad natur totalt, andel (%)
      "N85055",  # Skyddad natur land, andel (%)
      "N85056",  # Skyddad natur hav, andel (%)
      "N85057",  # Skyddad natur inlandsvatten, andel (%)

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
      "N00401",  "ton CO2-ekv/inv",   "miljo_klimat",  "N07702",
      "N07702",  "ton CO2",       "miljo_klimat",  "N00401",
      "N85073",  "ton CO2-ekv/inv",   "miljo_klimat",  "N85533",
      "N85533",  "ton CO2",       "miljo_klimat",  "N85073",
      "N85077",  "ton CO2-ekv/inv",   "miljo_klimat",  "N85537",
      "N85537",  "ton CO2",       "miljo_klimat",  "N85077",
      "N85078",  "ton CO2-ekv/inv",   "miljo_klimat",  "N85538",
      "N85538",  "ton CO2",       "miljo_klimat",  "N85078",
      "N85072",  "ton CO2-ekv/inv",   "miljo_klimat",  "N85532",
      "N85532",  "ton CO2",       "miljo_klimat",  "N85072",
      "N85075",  "ton CO2-ekv/inv",   "miljo_klimat",  "N85535",
      "N85535",  "ton CO2",       "miljo_klimat",  "N85075",
      "N85076",  "ton CO2-ekv/inv",   "miljo_klimat",  "N85536",
      "N85536",  "ton CO2",       "miljo_klimat",  "N85076",
      "N85543",  "ton CO2-ekv/inv",   "miljo_klimat",  "N85542",
      "N85542",  "ton CO2",       "miljo_klimat",  "N85543",
      "N85541",  "ton CO2-ekv/inv",   "miljo_klimat",  "N85540",
      "N85540",  "ton CO2",       "miljo_klimat",  "N85541",
      "N85047",  "kg/inv",        "miljo_klimat",  "N07701",
      "N07701",  "kg",            "miljo_klimat",  "N85047",
      "N85048",  "kg/inv",        "miljo_klimat",  "N07700",
      "N07700",  "kg",            "miljo_klimat",  "N85048",
      "U07801",  "kg/inv",        "miljo_klimat",  NA_character_,
      "U07414",  "procent",       "miljo_klimat",  NA_character_,
      "N85054",  "procent",       "miljo_klimat",  NA_character_,
      "N85055",  "procent",       "miljo_klimat",  NA_character_,
      "N85056",  "procent",       "miljo_klimat",  NA_character_,
      "N85057",  "procent",       "miljo_klimat",  NA_character_,
      "N45913",  "MWh/inv",       "miljo_klimat",  "N45945",
      "N45945",  "MWh",           "miljo_klimat",  "N45913",
      "N45925",  "procent",       "miljo_klimat",  NA_character_,
      "N00403",  "procent",       "miljo_klimat",  NA_character_
    ),

    # Beskrivningar för alla KPI:er (överskriver Kolada-beskrivningar)
    beraknade_kpier = tribble(
      ~kpi_id,   ~kpi_namn,                                          ~beskrivning,
      "N00401",  "Växthusgasutsläpp totalt, ton CO2-ekv/inv",       "Utsläpp av växthusgaser inom kommunens gräns per invånare, i ton koldioxidekvivalenter (fossil koldioxid, metan, lustgas och fluorerade gaser) från alla sektorer. Utsläppen är inte konsumtionsbaserade: enskilda industrier, trafik på stora vägar eller mycket jordbruk kan ge höga värden lokalt. Tidsserien revideras bakåt vid varje uppdatering. Källa: Nationella emissionsdatabasen och SCB via RKA Kolada.",
      "N07702",  "Växthusgasutsläpp totalt, ton CO2-ekv",           "Totala utsläpp av växthusgaser inom kommunens geografiska gräns, mätt i ton koldioxidekvivalenter. Måttet inkluderar samtliga sektorer: transporter, industri, jordbruk, uppvärmning med mera. Källa: Nationella emissionsdatabasen via RKA Kolada.",
      "N85073",  "Växthusgasutsläpp transporter, ton CO2-ekv/inv",  "Utsläpp av växthusgaser från transporter inom kommunens gräns per invånare, i ton koldioxidekvivalenter (fossil koldioxid, metan, lustgas och fluorerade gaser): vägtrafik, järnväg, inrikes flyg, inrikes civil sjöfart och militära transporter, inklusive slitage och avdunstning från vägfordon. Arbetsmaskiner redovisas som en egen sektor. Källa: Nationella emissionsdatabasen och SCB via RKA Kolada.",
      "N85533",  "Växthusgasutsläpp transporter, ton CO2-ekv",      "Totala utsläpp av växthusgaser från inrikes transporter inom kommunens gräns. Inkluderar vägtrafik, sjöfart, flyg, järnväg och arbetsmaskiner. Källa: Nationella emissionsdatabasen via RKA Kolada.",
      "N85077",  "Växthusgasutsläpp industri, ton CO2-ekv/inv",     "Utsläpp av växthusgaser från industriprocesser och industriell energianvändning per invånare. Enstaka stora anläggningar kan ge höga per capita-värden i mindre kommuner. Källa: Nationella emissionsdatabasen via RKA Kolada.",
      "N85537",  "Växthusgasutsläpp industri, ton CO2-ekv",         "Totala utsläpp av växthusgaser från industriprocesser och industriell energianvändning inom kommunens gräns. Källa: Nationella emissionsdatabasen via RKA Kolada.",
      "N85078",  "Växthusgasutsläpp jordbruk, ton CO2-ekv/inv",     "Utsläpp av växthusgaser från jordbruket per invånare. Inkluderar metan från djurhållning och lustgas från gödsling. Kommuner med omfattande jordbruk har typiskt högre värden. Källa: Nationella emissionsdatabasen via RKA Kolada.",
      "N85538",  "Växthusgasutsläpp jordbruk, ton CO2-ekv",         "Totala utsläpp av växthusgaser från jordbruket inom kommunens gräns. Inkluderar metan från djurhållning, lustgas från gödsling och koldioxid från kalkning. Källa: Nationella emissionsdatabasen via RKA Kolada.",
      "N85072",  "Växthusgasutsläpp uppvärmning, ton CO2-ekv/inv",  "Utsläpp av växthusgaser från egen uppvärmning av bostäder, kommersiella och offentliga lokaler samt jordbruks- och skogsbrukslokaler per invånare, i ton koldioxidekvivalenter (fossil koldioxid, metan, lustgas och fluorerade gaser). Källa: Nationella emissionsdatabasen och SCB via RKA Kolada.",
      "N85532",  "Växthusgasutsläpp uppvärmning, ton CO2-ekv",      "Totala utsläpp av växthusgaser från egen uppvärmning av bostäder och lokaler inom kommunens gräns. Källa: Nationella emissionsdatabasen via RKA Kolada.",
      "N85075",  "Växthusgasutsläpp arbetsmaskiner, ton CO2-ekv/inv", "Utsläpp av växthusgaser från arbetsmaskiner per invånare: bland annat industrins och byggsektorns arbetsmaskiner, fiskebåtar, jord- och skogsbruk och hushållens maskiner. Utsläppen per invånare ska inte tolkas som konsumtionsbaserade. Källa: Nationella emissionsdatabasen och SCB via RKA Kolada.",
      "N85535",  "Växthusgasutsläpp arbetsmaskiner, ton CO2-ekv",   "Totala utsläpp av växthusgaser från arbetsmaskiner inom kommunens gräns. Källa: Nationella emissionsdatabasen via RKA Kolada.",
      "N85076",  "Växthusgasutsläpp el och fjärrvärme, ton CO2-ekv/inv", "Utsläpp av växthusgaser från produktion av el och fjärrvärme inom kommunens gräns per invånare. Utsläppen per invånare ska inte tolkas som konsumtionsbaserade. Källa: Nationella emissionsdatabasen och SCB via RKA Kolada.",
      "N85536",  "Växthusgasutsläpp el och fjärrvärme, ton CO2-ekv", "Totala utsläpp av växthusgaser från produktion av el och fjärrvärme inom kommunens gräns. Källa: Nationella emissionsdatabasen via RKA Kolada.",
      "N85543",  "Växthusgasutsläpp avfall, ton CO2-ekv/inv",       "Utsläpp av växthusgaser från avfall inklusive avlopp per invånare: avfallsdeponier, behandling av avloppsvatten, biologisk behandling och förbränning av farligt avfall med mera. Källa: Nationella emissionsdatabasen och SCB via RKA Kolada.",
      "N85542",  "Växthusgasutsläpp avfall, ton CO2-ekv",           "Totala utsläpp av växthusgaser från avfall inklusive avlopp inom kommunens gräns. Källa: Nationella emissionsdatabasen via RKA Kolada.",
      "N85541",  "Växthusgasutsläpp produktanvändning, ton CO2-ekv/inv", "Utsläpp av växthusgaser från produktanvändning per invånare: lösningsmedel, färg, smörjmedel, fluorerade gaser med mera. Källa: Nationella emissionsdatabasen och SCB via RKA Kolada.",
      "N85540",  "Växthusgasutsläpp produktanvändning, ton CO2-ekv", "Totala utsläpp av växthusgaser från produktanvändning inom kommunens gräns. Källa: Nationella emissionsdatabasen via RKA Kolada.",
      "N85047",  "Utsläpp av kväveoxider, kg/inv",                  "Utsläpp till luft av kväveoxider (NOx) från samtliga sektorer inom kommunens geografiska område, i kilo per invånare. Vägtrafik på större vägar och enskilda industrier kan ge höga utsläpp lokalt. Följer upp miljökvalitetsmålet Frisk luft. Källa: Nationella emissionsdatabasen och SCB via RKA Kolada.",
      "N07701",  "Utsläpp av kväveoxider, kg",                      "Totala utsläpp till luft av kväveoxider (NOx) från samtliga sektorer inom kommunens geografiska område. Källa: Nationella emissionsdatabasen via RKA Kolada.",
      "N85048",  "Utsläpp av partiklar PM2.5, kg/inv",              "Utsläpp till luft av små partiklar (PM2,5) från samtliga sektorer inom kommunens geografiska område, i kilo per invånare. Egen uppvärmning, till exempel vedeldning, speglar förhållandena i kommunen väl. Följer upp miljökvalitetsmålet Frisk luft. Källa: Nationella emissionsdatabasen och SCB via RKA Kolada.",
      "N07700",  "Utsläpp av partiklar PM2.5, kg",                  "Totala utsläpp till luft av små partiklar (PM2,5) från samtliga sektorer inom kommunens geografiska område. Källa: Nationella emissionsdatabasen via RKA Kolada.",
      "U07801",  "Insamlat kommunalt avfall, kg/inv",               "Insamlat kommunalt avfall i kilo per invånare: mat- och restavfall, grovavfall, farligt avfall, liknande avfall från verksamheter och avfall under producentansvar som förpackningar och tidningar. Invånarantalet är justerat för fritidshus, gästnätter och pendling, så att kommuner med mycket turism eller inpendling kan jämföras med andra. Källa: Avfall Sverige via RKA Kolada.",
      "U07414",  "Kommunalt avfall till materialåtervinning, andel", "Andel av det insamlade kommunala avfallet som samlats in för materialåtervinning, inklusive biologisk behandling. Andelen omfattar även den del som samlats in men inte kunnat återvinnas. Källa: Avfall Sverige via RKA Kolada.",
      "N85054",  "Skyddad natur, andel av arealen",                 "Andel av kommunens totala areal, land och vatten, som är skyddad natur: nationalpark, naturreservat, naturvårdsområde eller biotopskyddsområde. Källa: SCB via RKA Kolada.",
      "N85055",  "Skyddad natur på land, andel",                    "Andel av landarealen som är skyddad natur: nationalpark, naturreservat, naturvårdsområde eller biotopskyddsområde. Källa: SCB via RKA Kolada.",
      "N85056",  "Skyddad natur i hav, andel",                      "Andel av havsarealen ut till territorialgränsen som är skyddad natur. Kommuner utan kust saknar värde. Källa: SCB via RKA Kolada.",
      "N85057",  "Skyddad natur i inlandsvatten, andel",            "Andel av arealen sjöar och större vattendrag som är skyddad natur. Källa: SCB via RKA Kolada.",
      "N45913",  "Energianvändning transporter, MWh/inv",           "Slutanvändning av energi inom transporter, oavsett bränsle, inom kommunens gräns, i megawattimmar per invånare. Källa: Energimyndigheten och SCB via RKA Kolada.",
      "N45945",  "Energianvändning transporter, MWh",               "Total slutanvändning av energi i transportsektorn, mätt i megawattimmar. Inkluderar alla energislag för samtliga trafikslag inom kommunen. Källa: SCB Kommunal energistatistik via RKA Kolada.",
      "N45925",  "Förnybar elproduktion, andel",                    "Elproduktion från vattenkraft, vindkraft och förnybara bränslen som andel av all elproduktion inom kommunens gräns, oavsett producent. Från och med 2021 ingår även solkraft. Källa: Energimyndigheten och SCB via RKA Kolada.",
      "N00403",  "Ekologiskt brukad åkermark, andel",               "Ekologiskt brukad åkermark som andel av all åkermark, enligt EU:s regler för ekologisk produktion. Uppgifterna kommer från två register, och ett jordbruksföretag registreras i en kommun även om marken ligger i flera, så kommunvärdena ska tolkas med försiktighet. Källa: Jordbruksverket via RKA Kolada."
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
      "N85075" = "Växthusgasutsläpp, arbetsmaskiner",
      "N85535" = "Växthusgasutsläpp, arbetsmaskiner",
      "N85076" = "Växthusgasutsläpp, el och fjärrvärme",
      "N85536" = "Växthusgasutsläpp, el och fjärrvärme",
      "N85543" = "Växthusgasutsläpp, avfall",
      "N85542" = "Växthusgasutsläpp, avfall",
      "N85541" = "Växthusgasutsläpp, produktanvändning",
      "N85540" = "Växthusgasutsläpp, produktanvändning",
      "N85047" = "Utsläpp av kväveoxider",
      "N07701" = "Utsläpp av kväveoxider",
      "N85048" = "Utsläpp av partiklar PM2.5",
      "N07700" = "Utsläpp av partiklar PM2.5",
      "U07801" = "Insamlat kommunalt avfall",
      "U07414" = "Kommunalt avfall till materialåtervinning",
      "N85054" = "Skyddad natur",
      "N85055" = "Skyddad natur, land",
      "N85056" = "Skyddad natur, hav",
      "N85057" = "Skyddad natur, inlandsvatten",
      "N45913" = "Energianvändning, transporter",
      "N45945" = "Energianvändning, transporter",
      "N45925" = "Förnybar elproduktion",
      "N00403" = "Ekologiskt brukad åkermark"
    )
  )
}
