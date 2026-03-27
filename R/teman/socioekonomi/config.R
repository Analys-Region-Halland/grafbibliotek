# teman/socioekonomi/config.R — Konfiguration: Socioekonomi & hälsa
# Organiserat efter folkhälsopolitiska målområden.
# Datakällor: Kolada (registerdata) + FoHM Folkhälsodata (register + enkät med KI).
#
# FoHM-KPI:er har prefix F_ och hämtas via PxWeb-API:t.
# Enkätdata levereras med konfidensintervall (ki_lower, ki_upper).
# Rullande perioder (4-år enkät, 5-år dödsorsak) konverteras till sista året.

source("R/paket.R")

FOHM_BAS <- "https://fohm-app.folkhalsomyndigheten.se/Folkhalsodata/api/v1/sv/A_Folkhalsodata/A_Mo8"

socioekonomi_config <- function() {
  list(
    tema_id    = "socioekonomi",
    tema_namn  = "Socioekonomi & hälsa",
    tema_farg  = "rod",
    datakalla  = c("kolada", "fohm"),
    startar    = 2010,

    # ── Kolada KPI:er (registerdata, enskilda år) ──
    kpier = c(
      "N00956",  # Ginikoefficient, förvärvsinkomst
      "N00997",  # Ginikoefficient, hushållens disponibla inkomster
      "N00957",  # Ohälsotal, dagar
      "N00938",  # Sjukpenningtalet 16-64, dagar/försäkrad
      "N33820",  # Psykisk ohälsa bland barn och unga, andel (%)
      "N31001",  # Kostnad ekonomiskt bistånd, kr/inv
      "N31910"   # Biståndshushåll, antal
    ),

    # KPI:er som ska ha könsuppdelning (_KV/_MAN) från Kolada
    konuppdelning = c("N00957", "N00938", "N33820"),

    # ── FoHM-tabeller (PxWeb) ──
    fohm_tabeller = list(

      # --- Hälsoutfall: Övergripande ---

      # Självskattad god hälsa (enkät, 4-årsperioder, KI)
      list(
        url = paste0(FOHM_BAS, "/Halsoutfall/01Overgrip/01.01halsgod/halsgodyreg.px"),
        kpi_id = "F_HALSA_GOD",
        har_ki = TRUE,
        ki_kolumn = "Andel och konfidensintervall",
        ki_andel = "01", ki_lower = "02", ki_upper = "03",
        query = list(
          Region = c("*"),
          `Hälsotillstånd` = c("01"),
          `Andel och konfidensintervall` = c("01", "02", "03"),
          Kön = c("00", "01", "02"),
          År = c("*")
        ),
        kon_kolumn = "Kön", kon_total = "00", kon_kv = "01", kon_man = "02",
        konuppdelning = c("F_HALSA_GOD"),
        region_kolumn = "Region", ar_kolumn = "År"
      ),

      # Medellivslängd kvinnor (register, 5-årsperioder, inget "Totalt")
      list(
        url = paste0(FOHM_BAS, "/Halsoutfall/01Overgrip/01.03medlivs/MedlivsYreg.px"),
        kpi_id = "F_MEDLIVS_KV",
        har_ki = FALSE,
        query = list(Region = c("*"), Kön = c("01"), År = c("*")),
        kon_kolumn = "Kön", kon_total = "01",
        region_kolumn = "Region", ar_kolumn = "År"
      ),

      # Medellivslängd män (register, 5-årsperioder)
      list(
        url = paste0(FOHM_BAS, "/Halsoutfall/01Overgrip/01.03medlivs/MedlivsYreg.px"),
        kpi_id = "F_MEDLIVS_MAN",
        har_ki = FALSE,
        query = list(Region = c("*"), Kön = c("02"), År = c("*")),
        kon_kolumn = "Kön", kon_total = "02",
        region_kolumn = "Region", ar_kolumn = "År"
      ),

      # Förtida dödlighet 25-64 år (register, 5-årsperioder)
      list(
        url = paste0(FOHM_BAS, "/Halsoutfall/01Overgrip/01.06Fortid/FortidReg.px"),
        kpi_id = "F_FORTID",
        har_ki = FALSE,
        query = list(
          Region = c("*"),
          Ålder = c("25-64 åldersstandardiserad"),
          Kön = c("1+2", "1", "2"),
          År = c("*")
        ),
        kon_kolumn = "Kön", kon_total = "1+2", kon_kv = "1", kon_man = "2",
        konuppdelning = c("F_FORTID"),
        region_kolumn = "Region", ar_kolumn = "År"
      ),

      # --- Hälsoutfall: Psykisk hälsa ---

      # Allvarlig psykisk påfrestning (enkät, KI)
      list(
        url = paste0(FOHM_BAS, "/Halsoutfall/02Pyskhals/02.03psykessler6/psykessler6yreg.px"),
        kpi_id = "F_PSYK_PAFR",
        har_ki = TRUE,
        ki_kolumn = "Andel och konfidensintervall",
        ki_andel = "01", ki_lower = "02", ki_upper = "03",
        query = list(
          Region = c("*"),
          `Psykisk hälsa` = c("21"),
          `Andel och konfidensintervall` = c("01", "02", "03"),
          Kön = c("00", "01", "02"),
          År = c("*")
        ),
        kon_kolumn = "Kön", kon_total = "00", kon_kv = "01", kon_man = "02",
        konuppdelning = c("F_PSYK_PAFR"),
        region_kolumn = "Region", ar_kolumn = "År"
      ),

      # Stress (enkät, KI)
      list(
        url = paste0(FOHM_BAS, "/Halsoutfall/02Pyskhals/02.05psystress/psystressyreg.px"),
        kpi_id = "F_STRESS",
        har_ki = TRUE,
        ki_kolumn = "Andel och konfidensintervall",
        ki_andel = "01", ki_lower = "02", ki_upper = "03",
        query = list(
          Region = c("*"),
          `Psykisk hälsa` = c("44"),
          `Andel och konfidensintervall` = c("01", "02", "03"),
          Kön = c("00", "01", "02"),
          År = c("*")
        ),
        kon_kolumn = "Kön", kon_total = "00", kon_kv = "01", kon_man = "02",
        konuppdelning = c("F_STRESS"),
        region_kolumn = "Region", ar_kolumn = "År"
      ),

      # Suicid 25+ (register, 5-årsperioder)
      list(
        url = paste0(FOHM_BAS, "/Halsoutfall/02Pyskhals/02.07.02SuicidVux/SuicidVuxReg.px"),
        kpi_id = "F_SUICID",
        har_ki = FALSE,
        query = list(
          Region = c("*"),
          Ålder = c("25- åldersstandardiserad"),
          Kön = c("1+2", "1", "2"),
          År = c("*")
        ),
        kon_kolumn = "Kön", kon_total = "1+2", kon_kv = "1", kon_man = "2",
        konuppdelning = c("F_SUICID"),
        region_kolumn = "Region", ar_kolumn = "År"
      ),

      # --- MO 4: Inkomst och ekonomisk utsatthet ---

      # Ekonomisk standard, median (register, enskilda år)
      list(
        url = paste0(FOHM_BAS, "/4_Inkomst/01Fordelink/04.01Dink/DinkReg.px"),
        kpi_id = "F_DINK",
        har_ki = FALSE,
        query = list(Region = c("*"), Kön = c("1+2", "1", "2"), År = c("*")),
        kon_kolumn = "Kön", kon_total = "1+2", kon_kv = "1", kon_man = "2",
        konuppdelning = c("F_DINK"),
        region_kolumn = "Region", ar_kolumn = "År"
      ),

      # Varaktigt låg ekonomisk standard, vuxna (register)
      list(
        url = paste0(FOHM_BAS, "/4_Inkomst/02ResursEk/04.07.02VEkVux/VEkVuxReg.px"),
        kpi_id = "F_VEK_VUX",
        har_ki = FALSE,
        query = list(
          Region = c("*"),
          Åldersstandardisering = c("1"),  # Ej åldersstandardiserat
          Kön = c("1+2"),
          År = c("*")
        ),
        kon_kolumn = "Kön", kon_total = "1+2",
        region_kolumn = "Region", ar_kolumn = "År"
      ),

      # Varaktigt låg inkomststandard, barn (register)
      list(
        url = paste0(FOHM_BAS, "/4_Inkomst/02ResursEk/04.08.01VInkBarn/VInkBarnReg.px"),
        kpi_id = "F_VINK_BARN",
        har_ki = FALSE,
        query = list(
          Region = c("*"),
          Åldersstandardisering = c("1"),  # Ej åldersstandardiserat
          Kön = c("1+2"),
          År = c("*")
        ),
        kon_kolumn = "Kön", kon_total = "1+2",
        region_kolumn = "Region", ar_kolumn = "År"
      ),

      # --- MO 6: Levnadsvanor ---

      # Övervikt och obesitas (enkät, KI, könsuppdelad)
      list(
        url = paste0(FOHM_BAS, "/Halsoutfall/09Riskfakt/09.01overfet/overfetYreg.px"),
        kpi_id = "F_OVERVIKT",
        har_ki = TRUE,
        ki_kolumn = "Andel och konfidensintervall",
        ki_andel = "01", ki_lower = "02", ki_upper = "03",
        query = list(
          Region = c("*"),
          `Viktstatus (BMI)` = c("2"),  # Övervikt och obesitas (BMI 25,0+)
          `Andel och konfidensintervall` = c("01", "02", "03"),
          Kön = c("00", "01", "02"),
          År = c("*")
        ),
        kon_kolumn = "Kön", kon_total = "00", kon_kv = "01", kon_man = "02",
        konuppdelning = c("F_OVERVIKT"),
        region_kolumn = "Region", ar_kolumn = "År"
      ),

      # Daglig tobaksrökning (enkät, KI, könsuppdelad)
      list(
        url = paste0(FOHM_BAS, "/6_Levanor/01Begrans/06.01tobakdag/tobakdagyreg.px"),
        kpi_id = "F_TOBAK",
        har_ki = TRUE,
        ki_kolumn = "Andel och konfidensintervall",
        ki_andel = "01", ki_lower = "02", ki_upper = "03",
        query = list(
          Region = c("*"),
          `Användning av tobaks- och nikotinprodukter` = c("01"),
          `Andel och konfidensintervall` = c("01", "02", "03"),
          Kön = c("00", "01", "02"),
          År = c("*")
        ),
        kon_kolumn = "Kön", kon_total = "00", kon_kv = "01", kon_man = "02",
        konuppdelning = c("F_TOBAK"),
        region_kolumn = "Region", ar_kolumn = "År"
      ),

      # Riskkonsumtion alkohol (enkät, KI, könsuppdelad)
      list(
        url = paste0(FOHM_BAS, "/6_Levanor/01Begrans/06.04alkrisk/alkriskyreg.px"),
        kpi_id = "F_ALK_RISK",
        har_ki = TRUE,
        ki_kolumn = "Andel och konfidensintervall",
        ki_andel = "01", ki_lower = "02", ki_upper = "03",
        query = list(
          Region = c("*"),
          Alkoholkonsumtion = c("01"),
          `Andel och konfidensintervall` = c("01", "02", "03"),
          Kön = c("00", "01", "02"),
          År = c("*")
        ),
        kon_kolumn = "Kön", kon_total = "00", kon_kv = "01", kon_man = "02",
        konuppdelning = c("F_ALK_RISK"),
        region_kolumn = "Region", ar_kolumn = "År"
      ),

      # --- MO 2+7: Utbildning och delaktighet ---

      # Gymnasiebehörighet (register)
      list(
        url = paste0(FOHM_BAS, "/2_Kompetens/02Lutbsyss/02.11Behgymn/BehgymnReg.px"),
        kpi_id = "F_BEHGYMN",
        har_ki = FALSE,
        query = list(Region = c("*"), Kön = c("1+2", "1", "2"), År = c("*")),
        kon_kolumn = "Kön", kon_total = "1+2", kon_kv = "1", kon_man = "2",
        konuppdelning = c("F_BEHGYMN"),
        region_kolumn = "Region", ar_kolumn = "År"
      ),

      # Valdeltagande (register, valår)
      list(
        url = paste0(FOHM_BAS, "/7_Kontroll/01Demokrati/07.01Val/ValReg.px"),
        kpi_id = "F_VAL",
        har_ki = FALSE,
        query = list(
          Region = c("*"),
          Åldersstandardisering = c("1"),  # Ej åldersstandardiserat
          Kön = c("1+2"),
          År = c("*")
        ),
        kon_kolumn = "Kön", kon_total = "1+2",
        region_kolumn = "Region", ar_kolumn = "År"
      )
    ),

    # ── Sektioner (efter folkhälsopolitiska målområden) ──
    sektioner = list(
      list(
        id = "halsoutfall",
        namn = "Hälsa",
        kpi_ids = c("F_HALSA_GOD", "F_MEDLIVS_KV", "F_MEDLIVS_MAN",
                     "F_FORTID", "N00957", "N00938")
      ),
      list(
        id = "psykisk_halsa",
        namn = "Psykisk hälsa",
        kpi_ids = c("F_PSYK_PAFR", "F_STRESS", "N33820", "F_SUICID")
      ),
      list(
        id = "inkomst",
        namn = "Inkomst och ekonomisk utsatthet",
        kpi_ids = c("F_DINK", "N00956", "N00997",
                     "F_VEK_VUX", "F_VINK_BARN", "N31001", "N31910")
      ),
      list(
        id = "levnadsvanor",
        namn = "Levnadsvanor",
        kpi_ids = c("F_OVERVIKT", "F_TOBAK", "F_ALK_RISK")
      ),
      list(
        id = "utbildning_delaktighet",
        namn = "Utbildning och delaktighet",
        kpi_ids = c("F_BEHGYMN", "F_VAL")
      )
    ),

    # ── KPI-metadata ──
    kpi_meta = tribble(
      ~kpi_id,          ~enhet,            ~tema,           ~par_kpi_id,
      # Kolada
      "N00956",         "index",           "socioekonomi",  NA_character_,
      "N00997",         "index",           "socioekonomi",  NA_character_,
      "N00957",         "dagar",           "socioekonomi",  NA_character_,
      "N00957_KV",      "dagar",           "socioekonomi",  NA_character_,
      "N00957_MAN",     "dagar",           "socioekonomi",  NA_character_,
      "N00938",         "dagar",           "socioekonomi",  NA_character_,
      "N00938_KV",      "dagar",           "socioekonomi",  NA_character_,
      "N00938_MAN",     "dagar",           "socioekonomi",  NA_character_,
      "N33820",         "procent",         "socioekonomi",  NA_character_,
      "N33820_KV",      "procent",         "socioekonomi",  NA_character_,
      "N33820_MAN",     "procent",         "socioekonomi",  NA_character_,
      "N31001",         "kr/inv",          "socioekonomi",  "N31910",
      "N31910",         "antal",           "socioekonomi",  "N31001",
      # FoHM — hälsa
      "F_HALSA_GOD",    "procent",         "socioekonomi",  NA_character_,
      "F_HALSA_GOD_KV", "procent",         "socioekonomi",  NA_character_,
      "F_HALSA_GOD_MAN","procent",         "socioekonomi",  NA_character_,
      "F_MEDLIVS_KV",   "år",             "socioekonomi",  NA_character_,
      "F_MEDLIVS_MAN",  "år",             "socioekonomi",  NA_character_,
      "F_FORTID",       "per 100 000",     "socioekonomi",  NA_character_,
      "F_FORTID_KV",    "per 100 000",     "socioekonomi",  NA_character_,
      "F_FORTID_MAN",   "per 100 000",     "socioekonomi",  NA_character_,
      # FoHM — psykisk hälsa
      "F_PSYK_PAFR",    "procent",         "socioekonomi",  NA_character_,
      "F_PSYK_PAFR_KV", "procent",         "socioekonomi",  NA_character_,
      "F_PSYK_PAFR_MAN","procent",         "socioekonomi",  NA_character_,
      "F_STRESS",       "procent",         "socioekonomi",  NA_character_,
      "F_STRESS_KV",    "procent",         "socioekonomi",  NA_character_,
      "F_STRESS_MAN",   "procent",         "socioekonomi",  NA_character_,
      "F_SUICID",       "per 100 000",     "socioekonomi",  NA_character_,
      "F_SUICID_KV",    "per 100 000",     "socioekonomi",  NA_character_,
      "F_SUICID_MAN",   "per 100 000",     "socioekonomi",  NA_character_,
      # FoHM — inkomst
      "F_DINK",         "tkr",             "socioekonomi",  NA_character_,
      "F_DINK_KV",      "tkr",             "socioekonomi",  NA_character_,
      "F_DINK_MAN",     "tkr",             "socioekonomi",  NA_character_,
      "F_VEK_VUX",      "procent",         "socioekonomi",  NA_character_,
      "F_VINK_BARN",    "procent",         "socioekonomi",  NA_character_,
      # FoHM — levnadsvanor (med könsvarianter)
      "F_OVERVIKT",     "procent",         "socioekonomi",  NA_character_,
      "F_OVERVIKT_KV",  "procent",         "socioekonomi",  NA_character_,
      "F_OVERVIKT_MAN", "procent",         "socioekonomi",  NA_character_,
      "F_TOBAK",        "procent",         "socioekonomi",  NA_character_,
      "F_TOBAK_KV",     "procent",         "socioekonomi",  NA_character_,
      "F_TOBAK_MAN",    "procent",         "socioekonomi",  NA_character_,
      "F_ALK_RISK",     "procent",         "socioekonomi",  NA_character_,
      "F_ALK_RISK_KV",  "procent",         "socioekonomi",  NA_character_,
      "F_ALK_RISK_MAN", "procent",         "socioekonomi",  NA_character_,
      # FoHM — utbildning/delaktighet
      "F_BEHGYMN",      "procent",         "socioekonomi",  NA_character_,
      "F_BEHGYMN_KV",   "procent",         "socioekonomi",  NA_character_,
      "F_BEHGYMN_MAN",  "procent",         "socioekonomi",  NA_character_,
      "F_VAL",          "procent",         "socioekonomi",  NA_character_
    ),

    # ── Beräknade KPI:er (FoHM-KPI:er behöver beskrivning här) ──
    beraknade_kpier = tribble(
      ~kpi_id,           ~kpi_namn,                                              ~beskrivning,
      # ── Kolada — inkomst och ojämlikhet ──
      "N00956",          "Ginikoefficient, förvärvsinkomst",                     "Ginikoefficienten mäter ojämlikheten i förvärvsinkomster bland befolkningen 20 år och äldre. Värdet ligger mellan 0 och 1 där 0 innebär fullständig jämlikhet och 1 innebär att all inkomst tillfaller en enda person. Högre värden indikerar större inkomstspridning i kommunen. Källa: SCB via RKA Kolada.",
      "N00997",          "Ginikoefficient, disponibel inkomst",                  "Ginikoefficienten mäter ojämlikheten i hushållens disponibla inkomster, det vill säga inkomster efter skatt och transfereringar, justerat för hushållets storlek. Disponibel inkomst ger en mer rättvisande bild av den faktiska köpkraften än förvärvsinkomst. Källa: SCB via RKA Kolada.",
      "N00957",          "Ohälsotal",                                           "Ohälsotalet mäter det genomsnittliga antalet utbetalda dagar med sjukpenning, rehabiliteringspenning och sjuk- eller aktivitetsersättning per person 16–64 år under ett år. Måttet ger en samlad bild av sjukfrånvaron i kommunen. Höga värden kan spegla hälsoproblem, arbetsmarknadsförhållanden eller socioekonomiska faktorer. Källa: Försäkringskassan via RKA Kolada.",
      "N00938",          "Sjukpenningtal",                                      "Antal utbetalda nettodagar med sjukpenning och rehabiliteringspenning per registrerad försäkrad person 16–64 år, exklusive försäkrade med hel sjukersättning. Till skillnad från ohälsotalet fångar sjukpenningtalet bara den kortare sjukfrånvaron och är därmed ett mer direkt mått på pågående sjukskrivning. Källa: Försäkringskassan via RKA Kolada.",
      "N33820",          "Psykisk ohälsa bland barn och unga",                  "Andel barn och unga 0–19 år med psykisk ohälsa, baserat på ett index som kombinerar uthämtad psykofarmaka, psykiatrisk diagnos och slutenvård vid psykiatrisk klinik. Ett högre värde innebär att en större andel av barn och unga har vårdkontakter eller läkemedelsbehandling för psykisk ohälsa. Källa: Socialstyrelsen via RKA Kolada.",
      "N31001",          "Kostnad ekonomiskt bistånd, kr/inv",                  "Kommunens totala kostnad för ekonomiskt bistånd (försörjningsstöd) per invånare. Ekonomiskt bistånd är samhällets yttersta skyddsnät och beviljas när enskilda inte kan försörja sig genom arbete, sjukförsäkring eller andra inkomster. Höga kostnader kan spegla arbetsmarknadsläget, bostadssituationen och befolkningens sammansättning. Källa: Socialstyrelsen via RKA Kolada.",
      "N31910",          "Biståndshushåll, antal",                              "Antal hushåll i kommunen som någon gång under året mottagit ekonomiskt bistånd (försörjningsstöd). Antalet ger en bild av hur stor del av befolkningen som befinner sig i ekonomisk utsatthet och behöver samhällets stöd för sin försörjning. Källa: Socialstyrelsen via RKA Kolada.",
      # ── Hälsa — övergripande ──
      "F_HALSA_GOD",     "Självskattad god hälsa",                              "Andel av befolkningen 16–84 år som uppger att de har bra eller mycket bra allmänt hälsotillstånd. Uppgifterna bygger på Nationella folkhälsoenkäten och redovisas som 4-årsmedelvärden för att ge tillräckligt underlag på kommunnivå. Källa: Folkhälsomyndigheten.",
      "F_HALSA_GOD_KV",  "Självskattad god hälsa, kvinnor",                     "Andel av kvinnor 16–84 år som uppger bra eller mycket bra allmänt hälsotillstånd. 4-årsmedelvärden. Källa: Folkhälsomyndigheten, Nationella folkhälsoenkäten.",
      "F_HALSA_GOD_MAN", "Självskattad god hälsa, män",                         "Andel av män 16–84 år som uppger bra eller mycket bra allmänt hälsotillstånd. 4-årsmedelvärden. Källa: Folkhälsomyndigheten, Nationella folkhälsoenkäten.",
      "F_MEDLIVS_KV",    "Medellivslängd vid födseln, kvinnor",                 "Återstående förväntad medellivslängd vid födseln för kvinnor, beräknad som 5-årsmedelvärde. Medellivslängden speglar det generella hälsoläget i befolkningen och påverkas av dödlighet i alla åldrar. Källa: Folkhälsomyndigheten.",
      "F_MEDLIVS_MAN",   "Medellivslängd vid födseln, män",                     "Återstående förväntad medellivslängd vid födseln för män, beräknad som 5-årsmedelvärde. Medellivslängden speglar det generella hälsoläget i befolkningen och påverkas av dödlighet i alla åldrar. Källa: Folkhälsomyndigheten.",
      "F_FORTID",        "Förtida dödlighet, 25–64 år",                        "Antal dödsfall per 100 000 invånare i åldern 25–64 år, åldersstandardiserat och beräknat som 5-årsmedelvärde. Förtida dödlighet är ett mått på dödsfall som inträffar före 65 års ålder och ses som potentiellt undvikbara genom folkhälsoinsatser. Källa: Folkhälsomyndigheten.",
      "F_FORTID_KV",     "Förtida dödlighet, kvinnor 25–64 år",                "Antal dödsfall per 100 000 kvinnor i åldern 25–64 år, åldersstandardiserat, 5-årsmedelvärde. Källa: Folkhälsomyndigheten.",
      "F_FORTID_MAN",    "Förtida dödlighet, män 25–64 år",                    "Antal dödsfall per 100 000 män i åldern 25–64 år, åldersstandardiserat, 5-årsmedelvärde. Källa: Folkhälsomyndigheten.",
      # ── Hälsa — ohälsa (Kolada-varianter) ──
      "N00957_KV",       "Ohälsotal, kvinnor",                                 "Ohälsotalet för kvinnor 16–64 år. Beräknas som summan av utbetalda dagar med sjukpenning, arbetsskadesjukpenning, rehabiliteringspenning samt aktivitets- och sjukersättning, dividerat med antal kvinnor 16–64 år. Källa: Försäkringskassan via RKA Kolada.",
      "N00957_MAN",      "Ohälsotal, män",                                     "Ohälsotalet för män 16–64 år. Beräknas som summan av utbetalda dagar med sjukpenning, arbetsskadesjukpenning, rehabiliteringspenning samt aktivitets- och sjukersättning, dividerat med antal män 16–64 år. Källa: Försäkringskassan via RKA Kolada.",
      "N00938_KV",       "Sjukpenningtal, kvinnor",                            "Antal utbetalda nettodagar med sjukpenning och rehabiliteringspenning per registrerad försäkrad kvinna 16–64 år, exklusive försäkrade med hel sjukersättning. Källa: Försäkringskassan via RKA Kolada.",
      "N00938_MAN",      "Sjukpenningtal, män",                                "Antal utbetalda nettodagar med sjukpenning och rehabiliteringspenning per registrerad försäkrad man 16–64 år, exklusive försäkrade med hel sjukersättning. Källa: Försäkringskassan via RKA Kolada.",
      # ── Psykisk hälsa ──
      "F_PSYK_PAFR",     "Allvarlig psykisk påfrestning",                      "Andel av befolkningen 16–84 år som skattar sin psykiska hälsa som allvarligt nedsatt, mätt med instrumentet Kessler 6 (K6). K6 innehåller sex frågor om psykiska besvär de senaste 30 dagarna och används internationellt som screeninginstrument. Redovisas som 4-årsmedelvärden. Källa: Folkhälsomyndigheten, Nationella folkhälsoenkäten.",
      "F_PSYK_PAFR_KV",  "Allvarlig psykisk påfrestning, kvinnor",            "Andel av kvinnor 16–84 år med allvarlig psykisk påfrestning enligt Kessler 6. 4-årsmedelvärden. Källa: Folkhälsomyndigheten, Nationella folkhälsoenkäten.",
      "F_PSYK_PAFR_MAN", "Allvarlig psykisk påfrestning, män",                "Andel av män 16–84 år med allvarlig psykisk påfrestning enligt Kessler 6. 4-årsmedelvärden. Källa: Folkhälsomyndigheten, Nationella folkhälsoenkäten.",
      "F_STRESS",        "Stress",                                             "Andel av befolkningen 16–84 år som uppger att de känner sig stressade. Självrapporterad stress i Nationella folkhälsoenkäten. Redovisas som 4-årsmedelvärden på kommunnivå. Källa: Folkhälsomyndigheten.",
      "F_STRESS_KV",     "Stress, kvinnor",                                    "Andel av kvinnor 16–84 år som uppger att de känner sig stressade. 4-årsmedelvärden. Källa: Folkhälsomyndigheten, Nationella folkhälsoenkäten.",
      "F_STRESS_MAN",    "Stress, män",                                        "Andel av män 16–84 år som uppger att de känner sig stressade. 4-årsmedelvärden. Källa: Folkhälsomyndigheten, Nationella folkhälsoenkäten.",
      "N33820_KV",       "Psykisk ohälsa bland barn och unga, flickor",        "Andel flickor 0–19 år med psykisk ohälsa, baserat på ett index som kombinerar uthämtad psykofarmaka, psykiatrisk diagnos (F10–F99) och slutenvård vid psykiatrisk klinik. Källa: Socialstyrelsen via RKA Kolada.",
      "N33820_MAN",      "Psykisk ohälsa bland barn och unga, pojkar",         "Andel pojkar 0–19 år med psykisk ohälsa, baserat på ett index som kombinerar uthämtad psykofarmaka, psykiatrisk diagnos (F10–F99) och slutenvård vid psykiatrisk klinik. Källa: Socialstyrelsen via RKA Kolada.",
      "F_SUICID",        "Suicid",                                             "Antal suicid (avsiktlig självdestruktiv handling med dödlig utgång) per 100 000 invånare 25 år och äldre, åldersstandardiserat och beräknat som 5-årsmedelvärde. Åldersstandardisering görs för att möjliggöra jämförelser mellan kommuner med olika ålderssammansättning. Källa: Folkhälsomyndigheten.",
      "F_SUICID_KV",     "Suicid, kvinnor",                                   "Antal suicid per 100 000 kvinnor 25 år och äldre, åldersstandardiserat, 5-årsmedelvärde. Källa: Folkhälsomyndigheten.",
      "F_SUICID_MAN",    "Suicid, män",                                       "Antal suicid per 100 000 män 25 år och äldre, åldersstandardiserat, 5-årsmedelvärde. Källa: Folkhälsomyndigheten.",
      # ── Levnadsvanor ──
      "F_OVERVIKT",      "Övervikt och obesitas",                              "Andel av befolkningen 16–84 år med övervikt eller obesitas, definierat som BMI 25,0 eller högre. Baseras på självrapporterad längd och vikt i Nationella folkhälsoenkäten. Redovisas som 4-årsmedelvärden. Källa: Folkhälsomyndigheten.",
      "F_OVERVIKT_KV",   "Övervikt och obesitas, kvinnor",                    "Andel av kvinnor 16–84 år med BMI 25,0 eller högre. 4-årsmedelvärden. Källa: Folkhälsomyndigheten, Nationella folkhälsoenkäten.",
      "F_OVERVIKT_MAN",  "Övervikt och obesitas, män",                        "Andel av män 16–84 år med BMI 25,0 eller högre. 4-årsmedelvärden. Källa: Folkhälsomyndigheten, Nationella folkhälsoenkäten.",
      "F_TOBAK",         "Daglig tobaksrökning",                               "Andel av befolkningen 16–84 år som röker tobak dagligen. Baseras på Nationella folkhälsoenkäten och redovisas som 4-årsmedelvärden på kommunnivå. Källa: Folkhälsomyndigheten.",
      "F_TOBAK_KV",      "Daglig tobaksrökning, kvinnor",                     "Andel av kvinnor 16–84 år som röker tobak dagligen. 4-årsmedelvärden. Källa: Folkhälsomyndigheten, Nationella folkhälsoenkäten.",
      "F_TOBAK_MAN",     "Daglig tobaksrökning, män",                         "Andel av män 16–84 år som röker tobak dagligen. 4-årsmedelvärden. Källa: Folkhälsomyndigheten, Nationella folkhälsoenkäten.",
      "F_ALK_RISK",      "Riskkonsumtion av alkohol",                          "Andel av befolkningen 16–84 år med riskkonsumtion av alkohol. Riskkonsumtion bedöms utifrån AUDIT-C, ett internationellt vedertaget screeninginstrument med tre frågor om dryckesfrekvens, mängd och intensivkonsumtion. Redovisas som 4-årsmedelvärden. Källa: Folkhälsomyndigheten, Nationella folkhälsoenkäten.",
      "F_ALK_RISK_KV",   "Riskkonsumtion av alkohol, kvinnor",                "Andel av kvinnor 16–84 år med riskkonsumtion av alkohol enligt AUDIT-C. 4-årsmedelvärden. Källa: Folkhälsomyndigheten, Nationella folkhälsoenkäten.",
      "F_ALK_RISK_MAN",  "Riskkonsumtion av alkohol, män",                    "Andel av män 16–84 år med riskkonsumtion av alkohol enligt AUDIT-C. 4-årsmedelvärden. Källa: Folkhälsomyndigheten, Nationella folkhälsoenkäten.",
      # ── Inkomst ──
      "F_DINK",          "Ekonomisk standard, medianinkomst",                  "Medianinkomst i tusenkronor, beräknad som disponibel inkomst per konsumtionsenhet. Disponibel inkomst är summan av alla skattepliktiga och skattefria inkomster minus skatt och negativa transfereringar, justerad för hushållets sammansättning. Källa: Folkhälsomyndigheten/SCB.",
      "F_DINK_KV",       "Ekonomisk standard, kvinnor",                       "Medianinkomst i tusenkronor för kvinnor, beräknad som disponibel inkomst per konsumtionsenhet. Källa: Folkhälsomyndigheten/SCB.",
      "F_DINK_MAN",      "Ekonomisk standard, män",                           "Medianinkomst i tusenkronor för män, beräknad som disponibel inkomst per konsumtionsenhet. Källa: Folkhälsomyndigheten/SCB.",
      "F_VEK_VUX",       "Varaktigt låg ekonomisk standard, vuxna",           "Andel vuxna som under minst tre av de senaste fyra åren haft en disponibel inkomst per konsumtionsenhet som understiger 60 procent av medianvärdet för samtliga. Måttet är relativt och fångar varaktig ekonomisk utsatthet. Källa: Folkhälsomyndigheten/SCB.",
      "F_VINK_BARN",     "Varaktigt låg inkomststandard, barn och unga",      "Andel barn och unga 0–19 år som under minst tre av de senaste fyra åren levt i hushåll med en inkomststandard under 1,0. Inkomststandard under 1,0 innebär att hushållets inkomster inte räcker för att täcka grundläggande levnadskostnader enligt Konsumentverkets beräkningar. Måttet är absolut (inte relativt). Källa: Folkhälsomyndigheten/SCB."
    ),

    berakna_antal = list(),

    # ── Visningsnamn ──
    visningsnamn = list(
      # Kolada
      "N00956" = "Ginikoefficient, förvärvsinkomst",
      "N00997" = "Ginikoefficient, disponibel inkomst",
      "N00957" = "Ohälsotal",
      "N00957_KV" = "Ohälsotal, kvinnor",
      "N00957_MAN" = "Ohälsotal, män",
      "N00938" = "Sjukpenningtal",
      "N00938_KV" = "Sjukpenningtal, kvinnor",
      "N00938_MAN" = "Sjukpenningtal, män",
      "N33820" = "Psykisk ohälsa, barn och unga",
      "N33820_KV" = "Psykisk ohälsa, flickor",
      "N33820_MAN" = "Psykisk ohälsa, pojkar",
      "N31001" = "Kostnad ekonomiskt bistånd",
      "N31910" = "Biståndshushåll",
      # FoHM — hälsa
      "F_HALSA_GOD"     = "Självskattad god hälsa",
      "F_HALSA_GOD_KV"  = "Självskattad god hälsa, kvinnor",
      "F_HALSA_GOD_MAN" = "Självskattad god hälsa, män",
      "F_MEDLIVS_KV"    = "Medellivslängd, kvinnor",
      "F_MEDLIVS_MAN"   = "Medellivslängd, män",
      "F_FORTID"        = "Förtida dödlighet, 25–64 år",
      "F_FORTID_KV"     = "Förtida dödlighet, kvinnor 25–64 år",
      "F_FORTID_MAN"    = "Förtida dödlighet, män 25–64 år",
      # FoHM — psykisk hälsa
      "F_PSYK_PAFR"     = "Allvarlig psykisk påfrestning",
      "F_PSYK_PAFR_KV"  = "Allvarlig psykisk påfrestning, kvinnor",
      "F_PSYK_PAFR_MAN" = "Allvarlig psykisk påfrestning, män",
      "F_STRESS"        = "Stress",
      "F_STRESS_KV"     = "Stress, kvinnor",
      "F_STRESS_MAN"    = "Stress, män",
      "F_SUICID"        = "Suicid",
      "F_SUICID_KV"     = "Suicid, kvinnor",
      "F_SUICID_MAN"    = "Suicid, män",
      # FoHM — inkomst
      "F_DINK"          = "Ekonomisk standard, medianinkomst",
      "F_DINK_KV"       = "Ekonomisk standard, kvinnor",
      "F_DINK_MAN"      = "Ekonomisk standard, män",
      "F_VEK_VUX"       = "Varaktigt låg ekonomisk standard, vuxna",
      "F_VINK_BARN"     = "Varaktigt låg inkomststandard, barn och unga",
      # FoHM — levnadsvanor
      "F_OVERVIKT"      = "Övervikt och obesitas",
      "F_OVERVIKT_KV"   = "Övervikt och obesitas, kvinnor",
      "F_OVERVIKT_MAN"  = "Övervikt och obesitas, män",
      "F_TOBAK"         = "Daglig tobaksrökning",
      "F_TOBAK_KV"      = "Daglig tobaksrökning, kvinnor",
      "F_TOBAK_MAN"     = "Daglig tobaksrökning, män",
      "F_ALK_RISK"      = "Riskkonsumtion av alkohol",
      "F_ALK_RISK_KV"   = "Riskkonsumtion av alkohol, kvinnor",
      "F_ALK_RISK_MAN"  = "Riskkonsumtion av alkohol, män",
      # FoHM — utbildning/delaktighet
      "F_BEHGYMN"       = "Gymnasiebehörighet",
      "F_BEHGYMN_KV"    = "Gymnasiebehörighet, flickor",
      "F_BEHGYMN_MAN"   = "Gymnasiebehörighet, pojkar",
      "F_VAL"           = "Valdeltagande"
    )
  )
}
