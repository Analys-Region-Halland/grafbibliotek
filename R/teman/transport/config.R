# teman/transport/config.R — Kollektivtrafik & transport
# Fordonsflotta, laddinfrastruktur, kollektivtrafiknära läge, bilresande,
# pendling, trafiksäkerhet. Alla KPI:er från Kolada.

source("R/paket.R")

transport_config <- function() {

  # SCB-regionkoder (alla kommuner + län + riket)
  kommun_df <- readRDS("data/kommun-register.rds")
  scb_regioner <- sub("^00", "", kommun_df$id)
  scb_regioner <- scb_regioner[nchar(scb_regioner) > 0]

  list(
    tema_id    = "transport",
    tema_namn  = "Kollektivtrafik & transport",
    tema_farg  = "lila",
    datakalla  = c("kolada", "scb", "trafa"),
    startar    = 2010,

    # ── SCB-tabeller: dag- och nattbefolkning (BAS) ──
    scb_tabeller = list(
      # Dagbefolkning: sysselsatta efter arbetsställets belägenhet
      list(
        url = "https://api.scb.se/OV0104/v1/doris/sv/ssd/AM/AM0210/AM0210F/ArRegArbStDoN",
        kpi_id = "S_DAG_TOT",
        query = list(
          Region = scb_regioner,
          Kon = c("1+2"),
          SNI2007 = c("A-U+US"),
          Fodelseregion = c("tot"),
          ContentsCode = c("000002XH"),
          Tid = as.character(2020:2026)
        ),
        region_kolumn = "Region",
        ar_kolumn = "Tid"
      ),
      # Inpendlare: bor utanför kommunen, arbetar i kommunen
      list(
        url = "https://api.scb.se/OV0104/v1/doris/sv/ssd/AM/AM0210/AM0210F/ArRegPend1",
        kpi_id = "S_INPENDL",
        query = list(
          Kommun = scb_regioner[nchar(scb_regioner) == 4],  # Bara kommuner (4-siffriga)
          Kon = c("1+2"),
          ContentsCode = c("000000QI"),
          Tid = as.character(2020:2026)
        ),
        region_kolumn = "Kommun",
        ar_kolumn = "Tid"
      ),
      # Utpendlare: bor i kommunen, arbetar utanför
      list(
        url = "https://api.scb.se/OV0104/v1/doris/sv/ssd/AM/AM0210/AM0210F/ArRegPend1",
        kpi_id = "S_UTPENDL",
        query = list(
          Kommun = scb_regioner[nchar(scb_regioner) == 4],
          Kon = c("1+2"),
          ContentsCode = c("000000QJ"),
          Tid = as.character(2020:2026)
        ),
        region_kolumn = "Kommun",
        ar_kolumn = "Tid"
      ),
      # Nattbefolkning: sysselsatta efter bostadens belägenhet
      list(
        url = "https://api.scb.se/OV0104/v1/doris/sv/ssd/AM/AM0210/AM0210F/ArRegArbStDoN",
        kpi_id = "S_NATT_TOT",
        query = list(
          Region = scb_regioner,
          Kon = c("1+2"),
          SNI2007 = c("A-U+US"),
          Fodelseregion = c("tot"),
          ContentsCode = c("000002XI"),
          Tid = as.character(2020:2026)
        ),
        region_kolumn = "Region",
        ar_kolumn = "Tid"
      )
    ),

    # ── Kolada KPI:er ──
    kpier = c(
      # Fordonsflotta
      "N07935",  # Personbilar, antal/1 000 inv
      "N07945",  # Elbilar, andel (%)
      "N07938",  # Elbilar, antal/1 000 inv
      "N07947",  # Laddhybridbilar, andel (%)
      "N07940",  # Laddhybridbilar, antal/1 000 inv
      "U00501",  # Fossiloberoende personbilar, andel (%)

      # Laddinfrastruktur
      "N07713",  # Elbilsladdpunkter, totalt antal
      "N07710",  # Elbilsladdpunkter: normalladdare, antal
      "N07711",  # Elbilsladdpunkter: snabbladdare, antal

      # Kollektivtrafik och tillgänglighet
      "N07418",  # Befolkning i kollektivtrafiknära läge, andel (%)
      "N07419",  # Befolkning inom tätort i kollektivtrafiknära läge, andel (%)
      "N07412",  # Befolkning utanför tätort i kollektivtrafiknära läge, andel (%)
      "N07410",  # Nytillkomna bostäder i kollektivtrafiknära läge, andel (%)
      "N60404",  # Resor med kollektivtrafik, resor/inv (L)
      "U60496",  # Förnybara drivmedel i kollektivtrafiken, andel (%) (L)
      "U85001",  # Nettokostnad trafik, kr/inv (L)

      # Bilresande
      "U07917",  # Genomsnittlig körsträcka med personbil, mil/inv
      "U07918",  # Genomsnittlig körsträcka med personbil, mil/personbil
      "N07782",  # Drivmedelsleverans till vägtransporter, liter/inv

      # Pendling
      "N02276",  # Inpendling, andel (%)
      "N02277",  # Inpendling, antal
      "N02279",  # Utpendling, andel (%)
      "N02278",  # Utpendling, antal

      # Trafiksäkerhet
      "N00799"   # Trafikolyckor med räddningsinsatser per 1 000 inv
    ),

    # ── Trafikanalys-tabeller ──
    trafa_tabeller = list(
      # Personbilar i trafik per kommun, per drivmedel, alla år
      list(
        kpi_id = "TR_BILAR_EL",
        query_str = "T10026|itrfslut|reglan:13|regkom|ar|drivmedel:El",
        region_kolumn = "regkom",
        varde_kolumn = "itrfslut",
        ar_kolumn = "ar",
        region_typ = "kommun_namn"
      ),
      list(
        kpi_id = "TR_BILAR_DIESEL",
        query_str = "T10026|itrfslut|reglan:13|regkom|ar|drivmedel:Diesel",
        region_kolumn = "regkom",
        varde_kolumn = "itrfslut",
        ar_kolumn = "ar",
        region_typ = "kommun_namn"
      ),
      list(
        kpi_id = "TR_BILAR_BENSIN",
        query_str = "T10026|itrfslut|reglan:13|regkom|ar|drivmedel:Bensin",
        region_kolumn = "regkom",
        varde_kolumn = "itrfslut",
        ar_kolumn = "ar",
        region_typ = "kommun_namn"
      ),
      list(
        kpi_id = "TR_BILAR_LADDHYBRID",
        query_str = "T10026|itrfslut|reglan:13|regkom|ar|drivmedel:Laddhybrid",
        region_kolumn = "regkom",
        varde_kolumn = "itrfslut",
        ar_kolumn = "ar",
        region_typ = "kommun_namn"
      ),
      # Färdtjänstresor per kommun, alla år
      list(
        kpi_id = "TR_FARDTJANST",
        query_str = "T1201|antresf|lan:13|kommun|ar",
        region_kolumn = "kommun",
        varde_kolumn = "antresf",
        ar_kolumn = "ar",
        region_typ = "kommun_namn"
      )
    ),

    # Sektioner
    sektioner = list(
      list(
        id = "fordonsflotta",
        namn = "Fordonsflotta",
        kpi_ids = c("N07935", "N07945", "N07938", "N07947", "N07940", "U00501")
      ),
      list(
        id = "laddinfra",
        namn = "Laddinfrastruktur",
        kpi_ids = c("N07713", "N07710", "N07711")
      ),
      list(
        id = "kollektivtrafik",
        namn = "Kollektivtrafik och tillgänglighet",
        kpi_ids = c("N07418", "N07419", "N07412", "N07410")
      ),
      list(
        id = "bilresande",
        namn = "Bilresande",
        kpi_ids = c("U07917", "U07918", "N07782")
      ),
      list(
        id = "pendling",
        namn = "Pendling",
        kpi_ids = c("N02276", "N02277", "N02279", "N02278")
      ),
      list(
        id = "sakerhet",
        namn = "Trafiksäkerhet",
        kpi_ids = c("N00799")
      )
    ),

    # KPI-metadata
    kpi_meta = tribble(
      ~kpi_id,   ~enhet,            ~tema,        ~par_kpi_id,
      "N07935",  "per 1 000 inv.",  "transport",  NA_character_,
      "N07945",  "procent",         "transport",  "N07938",
      "N07938",  "per 1 000 inv.",  "transport",  "N07945",
      "N07947",  "procent",         "transport",  "N07940",
      "N07940",  "per 1 000 inv.",  "transport",  "N07947",
      "U00501",  "procent",         "transport",  NA_character_,
      "N07713",  "antal",           "transport",  NA_character_,
      "N07710",  "antal",           "transport",  NA_character_,
      "N07711",  "antal",           "transport",  NA_character_,
      "N07418",  "procent",         "transport",  NA_character_,
      "N07419",  "procent",         "transport",  NA_character_,
      "N07412",  "procent",         "transport",  NA_character_,
      "N07410",  "procent",         "transport",  NA_character_,
      "N60404",  "resor/inv",       "transport",  NA_character_,
      "U60496",  "procent",         "transport",  NA_character_,
      "U85001",  "kr/inv",          "transport",  NA_character_,
      "U07917",  "mil/inv",         "transport",  "U07918",
      "U07918",  "mil/bil",         "transport",  "U07917",
      "N07782",  "liter/inv",       "transport",  NA_character_,
      "N02276",  "procent",         "transport",  "N02277",
      "N02277",  "antal",           "transport",  "N02276",
      "N02279",  "procent",         "transport",  "N02278",
      "N02278",  "antal",           "transport",  "N02279",
      "S_INPENDL",   "antal",       "transport",  "S_UTPENDL",
      "S_UTPENDL",   "antal",       "transport",  "S_INPENDL",
      "S_DAG_TOT",   "antal",       "transport",  "S_NATT_TOT",
      "S_NATT_TOT",  "antal",       "transport",  "S_DAG_TOT",
      "C_INPENDL_ANDEL","procent",  "transport",  "S_INPENDL",
      "C_UTPENDL_ANDEL","procent",  "transport",  "S_UTPENDL",
      "C_PENDL_NETTO","antal",      "transport",  NA_character_,
      "C_PENDLKVOT", "kvot",        "transport",  NA_character_,
      "N00799",  "per 1 000 inv.",  "transport",  NA_character_,
      # Trafikanalys
      "TR_BILAR_EL",        "antal",   "transport",  NA_character_,
      "TR_BILAR_DIESEL",    "antal",   "transport",  NA_character_,
      "TR_BILAR_BENSIN",    "antal",   "transport",  NA_character_,
      "TR_BILAR_LADDHYBRID","antal",   "transport",  NA_character_,
      "TR_FARDTJANST",      "antal",   "transport",  NA_character_
    ),

    beraknade_kpier = tribble(
      ~kpi_id,               ~kpi_namn,                                          ~beskrivning,
      # Kolada-KPI:er med utförliga beskrivningar
      "N07935",              "Personbilar per 1 000 invånare",                   "Antal personbilar i trafik den 31 december, oavsett drivmedel, per 1 000 invånare. Källa: SCB via RKA Kolada.",
      "N07945",              "Elbilar, andel av personbilar",                    "Andel av personbilarna i trafik den 31 december som drivs med el. Källa: Trafikanalys och SCB via RKA Kolada.",
      "N07938",              "Elbilar per 1 000 invånare",                       "Antal registrerade rena elbilar per 1 000 invånare. Måttet kompletterar andelen elbilar genom att visa den absoluta utbredningen i relation till befolkningens storlek. Källa: Trafikanalys via RKA Kolada.",
      "N07947",              "Laddhybridbilar, andel av personbilar",            "Andel av personbilarna i trafik den 31 december som är laddhybrider, det vill säga har både förbränningsmotor och elmotor och ett batteri som kan laddas från elnätet. Källa: Trafikanalys och SCB via RKA Kolada.",
      "N07940",              "Laddhybridbilar per 1 000 invånare",               "Antal registrerade laddhybridbilar per 1 000 invånare. Källa: Trafikanalys via RKA Kolada.",
      "U00501",              "Fossiloberoende personbilar, andel",               "Andel av personbilarna som kan köras på drivmedel från förnybara källor, men inte nödvändigtvis gör det: el, laddhybrider som laddas med sladd, gas, E85, vätgas och bilar som tillverkaren godkänt för HVO100. Källa: Miljöfordon Sverige via RKA Kolada.",
      "N07713",              "Elbilsladdpunkter, totalt antal",                  "Antal offentligt tillgängliga laddpunkter för elbilar, med både offentliga och privata ägare: normalladdare (upp till 50 kW), snabbladdare (50 till 150 kW) och supersnabbladdare (över 150 kW). Uppdelningen visar normal- och snabbladdare, så supersnabbladdarna ingår bara i totalen. Källa: Energimyndigheten/Nobil via RKA Kolada.",
      "N07710",              "Normalladdare, antal",                             "Antal offentligt tillgängliga laddpunkter för elbilar, med både offentliga och privata ägare, med en effekt upp till 50 kW (normalladdare). Beräknad laddtid cirka 3 till 10 timmar. Källa: Energimyndigheten/Nobil via RKA Kolada.",
      "N07711",              "Snabbladdare, antal",                              "Antal offentligt tillgängliga laddpunkter för elbilar, med både offentliga och privata ägare, med en effekt mellan 50 och 150 kW (snabbladdare). Beräknad laddtid cirka 15 till 120 minuter. Källa: Energimyndigheten/Nobil via RKA Kolada.",
      "N07418",              "Befolkning i kollektivtrafiknära läge",            "Andel av befolkningen som har en trafikerad hållplats inom 500 meter fågelvägen från folkbokföringsadressen. En trafikerad hållplats har minst en avgång i timmen vardagar mellan klockan 6 och 20, oavsett trafikslag. Källa: SCB via RKA Kolada.",
      "N07419",              "Befolkning inom tätort, kollektivtrafiknära läge", "Andel av befolkningen inom tätort som har en trafikerad hållplats inom 500 meter fågelvägen från folkbokföringsadressen. En trafikerad hållplats har minst en avgång i timmen vardagar mellan klockan 6 och 20, oavsett trafikslag. Källa: SCB via RKA Kolada.",
      "N07412",              "Befolkning utanför tätort, kollektivtrafiknära läge","Andel av befolkningen utanför tätort som har en trafikerad hållplats inom 500 meter fågelvägen från folkbokföringsadressen. En trafikerad hållplats har minst en avgång i timmen vardagar mellan klockan 6 och 20, oavsett trafikslag. Källa: SCB via RKA Kolada.",
      "N07410",              "Nytillkomna bostäder i kollektivtrafiknära läge",  "Andel av de bostäder som tillkom under året som har en trafikerad hållplats inom 500 meter fågelvägen. En trafikerad hållplats har minst en avgång i timmen vardagar mellan klockan 6 och 20, oavsett trafikslag. Källa: SCB via RKA Kolada.",
      "N60404",              "Resor med kollektivtrafik per invånare",           "Antal resor i regional kollektivtrafik per invånare, enligt de regionala trafikhuvudmännens rapportering. Avser läns- och regionnivå. Källa: Trafikanalys via RKA Kolada.",
      "U60496",              "Förnybara drivmedel i kollektivtrafiken",          "Andel förnybara drivmedel, viktat efter energiinnehåll, i den allmänna kollektivtrafiken med trafikplikt: spårtrafik, buss och båt. Förnybart avser förnybar el, biodiesel, biogas och etanol, även låginblandning i diesel och bensin. Avser läns- och regionnivå. Källa: Trafikhuvudmännen och Energimyndigheten via RKA Kolada.",
      "U85001",              "Nettokostnad trafik per invånare",                 "Regionens nettokostnad för trafik per invånare den 31 december, alltså den del av kostnaden som finansieras med skatt, generella statsbidrag och utjämning. Huvuddelen är bidrag till den regionala kollektivtrafikmyndigheten. Avser läns- och regionnivå. Källa: SCB (räkenskapssammandraget) via RKA Kolada.",
      "U07917",              "Körsträcka med personbil, mil per invånare",       "Total körsträcka per år med personbilar registrerade i kommunen, delad med antalet invånare. Säger inget om var bilarna har körts. Bilar registrerade på företag ingår, vilket kan ge höga värden i kommuner med många företag och huvudkontor. Källa: Trafikanalys via RKA Kolada.",
      "U07918",              "Körsträcka med personbil, mil per bil",            "Genomsnittlig årlig körsträcka per registrerad personbil i kommunen. Till skillnad från mil per invånare visar detta mått hur intensivt varje bil används. Källa: Trafikanalys via RKA Kolada.",
      "N07782",              "Drivmedelsleverans vägtransporter, liter/inv",     "Levererad mängd bensin, diesel, eldningsolja 1, etanol och HVO för vägtransporter till slutliga förbrukare, liter per invånare. Mäts där drivmedlet levereras och inte där förbrukarna bor, så kommuner med mycket genomfartstrafik kan få höga värden. Serien slutar 2023. Källa: SCB via RKA Kolada.",
      "N02276",              "Inpendling, andel av förvärvsarbetande",           "Andel av de förvärvsarbetande i kommunen (dagbefolkning) som är folkbokförda i en annan kommun. Hög inpendlingsandel tyder på att kommunen fungerar som arbetsplatscentrum i sin arbetsmarknadsregion. Källa: SCB via RKA Kolada.",
      "N02277",              "Inpendling, antal",                                "Antal förvärvsarbetande som arbetar i kommunen men är folkbokförda i en annan kommun. Källa: SCB via RKA Kolada.",
      "N02279",              "Utpendling, andel av förvärvsarbetande",           "Andel av de förvärvsarbetande som bor i kommunen (nattbefolkning) och arbetar i en annan kommun. Hög utpendlingsandel indikerar att kommunen i större utsträckning är en bostadsort där invånarna pendlar till arbetsplatser på annan ort. Källa: SCB via RKA Kolada.",
      "N02278",              "Utpendling, antal",                                "Antal förvärvsarbetande som bor i kommunen men arbetar i en annan kommun. Källa: SCB via RKA Kolada.",
      "N00799",              "Trafikolyckor med räddningsinsatser",              "Genomsnittligt antal räddningsinsatser till trafikolyckor per år under tre år (året och de två föregående), per 1 000 invånare den 31 december. Alla trafikelement ingår, till exempel personbil, lastbil, cykel och djur. Källa: Myndigheten för samhällsskydd och beredskap (MSB) via RKA Kolada.",
      # SCB- och Trafikanalys-KPI:er
      "S_INPENDL",           "Inpendlare, antal",                               "Antal sysselsatta 15–74 år som bor utanför kommunen men har sitt arbetsställe i kommunen. Källa: SCB, BAS (Befolkningens arbetsmarknadsstatus).",
      "S_UTPENDL",           "Utpendlare, antal",                               "Antal sysselsatta 15–74 år som bor i kommunen men har sitt arbetsställe utanför kommunen. Källa: SCB, BAS.",
      "S_DAG_TOT",           "Dagbefolkning, antal",                            "Antal sysselsatta 15–74 år efter arbetsställets belägenhet. Dagbefolkningen visar hur många som arbetar i kommunen/regionen, oavsett var de bor. Källa: SCB, BAS.",
      "S_NATT_TOT",          "Nattbefolkning, antal",                           "Antal sysselsatta 15–74 år efter bostadens belägenhet. Nattbefolkningen visar hur många sysselsatta som bor i kommunen/regionen, oavsett var de arbetar. Källa: SCB, BAS.",
      "C_PENDL_NETTO",       "Nettopendling",                                  "Skillnaden mellan dagbefolkning och nattbefolkning (sysselsatta efter arbetsställe minus sysselsatta efter bostad). Positivt värde innebär att fler pendlar in än ut — kommunen är ett arbetsplatscentrum. Negativt värde innebär nettoutpendling — kommunen är mer av bostadsort. Källa: SCB, BAS och bearbetningar.",
      "C_INPENDL_ANDEL",     "Inpendlingsandel",                                "Andel av dagbefolkningen (sysselsatta efter arbetsställe) som bor utanför kommunen. Beräknat som antal inpendlare dividerat med dagbefolkning. Källa: SCB, BAS och bearbetningar.",
      "C_UTPENDL_ANDEL",     "Utpendlingsandel",                                "Andel av nattbefolkningen (sysselsatta efter bostad) som arbetar utanför kommunen. Beräknat som antal utpendlare dividerat med nattbefolkning. Källa: SCB, BAS och bearbetningar.",
      "C_PENDLKVOT",         "Pendlingskvot",                                   "Kvoten mellan dagbefolkning och nattbefolkning (sysselsatta efter arbetsställe dividerat med sysselsatta efter bostad). Kvot över 1,0 innebär att kommunen har fler arbetstillfällen än sysselsatta invånare — ett arbetsplatscentrum som drar till sig pendlare. Kvot under 1,0 innebär att fler pendlar ut. Källa: SCB, BAS och bearbetningar.",
      "TR_BILAR_EL",         "Elbilar i trafik, antal",                         "Antal registrerade personbilar med ren eldrift i trafik vid periodens slut. Avser personbilar registrerade i kommunen oavsett ägarkategori. Källa: Trafikanalys, Fordonsstatistik (T10026).",
      "TR_BILAR_DIESEL",     "Dieselbilar i trafik, antal",                     "Antal registrerade personbilar med dieseldrift i trafik vid periodens slut. Källa: Trafikanalys, Fordonsstatistik (T10026).",
      "TR_BILAR_BENSIN",     "Bensinbilar i trafik, antal",                     "Antal registrerade personbilar med bensindrift i trafik vid periodens slut. Källa: Trafikanalys, Fordonsstatistik (T10026).",
      "TR_BILAR_LADDHYBRID", "Laddhybridbilar i trafik, antal",                 "Antal registrerade personbilar med laddhybriddrift (kombination av el och förbränningsmotor, extern laddning) i trafik vid periodens slut. Källa: Trafikanalys, Fordonsstatistik (T10026).",
      "TR_FARDTJANST",       "Färdtjänstresor, antal enkelresor",               "Antal enkelresor med färdtjänst under året. Färdtjänst är ett kommunalt ansvar och erbjuds personer med funktionsnedsättning som har väsentliga svårigheter att förflytta sig på egen hand eller använda kollektivtrafik. Källa: Trafikanalys."
    ),
    berakna_antal = list(),

    # Visningsnamn
    visningsnamn = list(
      "N07935" = "Personbilar per 1 000 invånare",
      "N07945" = "Elbilar, andel av personbilar",
      "N07938" = "Elbilar per 1 000 invånare",
      "N07947" = "Laddhybridbilar, andel av personbilar",
      "N07940" = "Laddhybridbilar per 1 000 invånare",
      "U00501" = "Fossiloberoende personbilar, andel",
      "N07713" = "Elbilsladdpunkter, totalt antal",
      "N07710" = "Normalladdare, antal",
      "N07711" = "Snabbladdare, antal",
      "N07418" = "Befolkning i kollektivtrafiknära läge",
      "N07419" = "Befolkning inom tätort, kollektivtrafiknära läge",
      "N07412" = "Befolkning utanför tätort, kollektivtrafiknära läge",
      "N07410" = "Nytillkomna bostäder i kollektivtrafiknära läge",
      "N60404" = "Resor med kollektivtrafik",
      "U60496" = "Förnybara drivmedel i kollektivtrafiken",
      "U85001" = "Nettokostnad trafik",
      "U07917" = "Genomsnittlig körsträcka med personbil, mil per invånare",
      "U07918" = "Genomsnittlig körsträcka med personbil, mil per bil",
      "N07782" = "Drivmedelsleverans till vägtransporter, liter per invånare",
      "C_INPENDL_ANDEL" = "Inpendlingsandel",
      "C_UTPENDL_ANDEL" = "Utpendlingsandel",
      "S_INPENDL"    = "Inpendlare",
      "S_UTPENDL"    = "Utpendlare",
      "S_DAG_TOT"    = "Dagbefolkning",
      "S_NATT_TOT"   = "Nattbefolkning",
      "C_PENDL_NETTO" = "Nettopendling",
      "C_PENDLKVOT"  = "Pendlingskvot",
      "N02276" = "Inpendling, andel av förvärvsarbetande",
      "N02277" = "Inpendling, antal",
      "N02279" = "Utpendling, andel av förvärvsarbetande",
      "N02278" = "Utpendling, antal",
      "N00799" = "Trafikolyckor med räddningsinsatser",
      # Trafikanalys
      "TR_BILAR_EL"         = "Elbilar i trafik",
      "TR_BILAR_DIESEL"     = "Dieselbilar i trafik",
      "TR_BILAR_BENSIN"     = "Bensinbilar i trafik",
      "TR_BILAR_LADDHYBRID" = "Laddhybridbilar i trafik",
      "TR_FARDTJANST"       = "Färdtjänstresor"
    )
  )
}
