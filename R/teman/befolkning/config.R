# teman/befolkning/config.R — Konfiguration for temat Befolkning & demografi
# Datakalla: SCB (PxWeb API) — ersatter tidigare Kolada-hamtning
# Tidsperiod: 2000-2025 (beroende pa tabell)
#
# SCB-tabeller som anvands:
#   BE0101A/BefolkningNy       — Folkmagd per alder och kon (1968-2024)
#   BE0101G/BefforandrKvRLK    — Befolkningsforandringar (2000-2024)
#   BE0101A/FkvotHVD           — Demografisk forsorjningskvot (2000-2025)
#   BE0101B/BefolkningMedelAlder — Medelalder (1998-2025)
#   BE0101H/FruktsamhetSum     — Summerad fruktsamhet (2000-2025)
#   BE0101C/BefArealTathetKon  — Befolkningstathet (1991-2025)
#   BE0101E/InrUtrFoddaRegAlKon — Utrikes/inrikes fodda (2000-2024)
#   BE0101H/FoddaK + FoddaKCKM — Fodda per region (1968-2025)
#   BE0101I/DodaFodelsearK + CKM — Doda per region (1968-2025)
#   BE0101J/Flyttningar97 + CKM — Flyttningar per region (1997-2025)

source("R/paket.R")

befolkning_config <- function() {
  list(
    tema_id    = "befolkning",
    tema_namn  = "Befolkning & demografi",
    tema_farg  = "gron",
    datakalla  = "tema_hamta",
    startar    = 2000,

    # Sektioner — styr gruppering i frontend
    sektioner = list(
      list(
        id = "folkmagd",
        namn = "Folkmangd och forandring",
        kpi_ids = c("S_BEF_TOTALT", "S_BEF_TATHET", "S_BEF_FORANDR_PCT",
                     "S_FODELSENETTO_ANTAL", "S_INRIKES_NETTO_ANTAL",
                     "S_UTRIKES_NETTO_ANTAL", "S_FRUKTSAMHET")
      ),
      list(
        id = "sammansattning",
        namn = "Befolkningens sammansattning",
        kpi_ids = c("S_MEDELALDER", "S_FORSORJ_TOTAL",
                     "S_BEF_0_19_ANDEL", "S_BEF_20_64_ANDEL",
                     "S_BEF_65_79_ANDEL", "S_BEF_80_ANDEL",
                     "S_KVINNOR_ANDEL", "S_UTRIKES_FODDA_ANDEL")
      )
    ),

    # KPI-metadata: enhet, tema, par (andel<->antal)
    kpi_meta = tribble(
      ~kpi_id,                      ~enhet,        ~tema,          ~par_kpi_id,
      # Folkmagd
      "S_BEF_TOTALT",               "antal",       "befolkning",   NA_character_,
      "S_BEF_FORANDR_PCT",          "procent",     "befolkning",   "S_BEF_FORANDR_ANTAL",
      "S_BEF_FORANDR_ANTAL",        "antal",       "befolkning",   "S_BEF_FORANDR_PCT",
      # Aldersstruktur
      "S_BEF_0_19_ANDEL",           "procent",     "befolkning",   "S_BEF_0_19_ANTAL",
      "S_BEF_0_19_ANTAL",           "antal",       "befolkning",   "S_BEF_0_19_ANDEL",
      "S_BEF_20_64_ANDEL",          "procent",     "befolkning",   "S_BEF_20_64_ANTAL",
      "S_BEF_20_64_ANTAL",          "antal",       "befolkning",   "S_BEF_20_64_ANDEL",
      "S_BEF_65_79_ANDEL",          "procent",     "befolkning",   "S_BEF_65_79_ANTAL",
      "S_BEF_65_79_ANTAL",          "antal",       "befolkning",   "S_BEF_65_79_ANDEL",
      "S_BEF_80_ANDEL",             "procent",     "befolkning",   "S_BEF_80_ANTAL",
      "S_BEF_80_ANTAL",             "antal",       "befolkning",   "S_BEF_80_ANDEL",
      # Befolkningsrorelse — netto
      "S_FODELSENETTO_PROMILLE",    "promille",    "befolkning",   "S_FODELSENETTO_ANTAL",
      "S_FODELSENETTO_ANTAL",       "antal",       "befolkning",   "S_FODELSENETTO_PROMILLE",
      "S_INRIKES_NETTO_PROMILLE",   "promille",    "befolkning",   "S_INRIKES_NETTO_ANTAL",
      "S_INRIKES_NETTO_ANTAL",      "antal",       "befolkning",   "S_INRIKES_NETTO_PROMILLE",
      "S_UTRIKES_NETTO_PROMILLE",   "promille",    "befolkning",   "S_UTRIKES_NETTO_ANTAL",
      "S_UTRIKES_NETTO_ANTAL",      "antal",       "befolkning",   "S_UTRIKES_NETTO_PROMILLE",
      # Befolkningsrorelse — ingaende komponenter
      "S_FODDA_ANTAL",              "antal",       "befolkning",   NA_character_,
      "S_DODA_ANTAL",               "antal",       "befolkning",   NA_character_,
      "S_INVANDRING_ANTAL",         "antal",       "befolkning",   NA_character_,
      "S_UTVANDRING_ANTAL",         "antal",       "befolkning",   NA_character_,
      "S_INRIKES_INFLYTT_ANTAL",    "antal",       "befolkning",   NA_character_,
      "S_INRIKES_UTFLYTT_ANTAL",    "antal",       "befolkning",   NA_character_,
      # Sammansattning
      "S_KVINNOR_ANDEL",            "procent",     "befolkning",   "S_KVINNOR_ANTAL",
      "S_KVINNOR_ANTAL",            "antal",       "befolkning",   "S_KVINNOR_ANDEL",
      "S_UTRIKES_FODDA_ANDEL",      "procent",     "befolkning",   "S_UTRIKES_FODDA_ANTAL",
      "S_UTRIKES_FODDA_ANTAL",      "antal",       "befolkning",   "S_UTRIKES_FODDA_ANDEL",
      # Forsorjningskvot
      "S_FORSORJ_TOTAL",            "kvot",        "befolkning",   NA_character_,
      "S_FORSORJ_UNG",              "kvot",        "befolkning",   NA_character_,
      "S_FORSORJ_ALD",              "kvot",        "befolkning",   NA_character_,
      # Ovrigt
      "S_MEDELALDER",               "ar",          "befolkning",   NA_character_,
      "S_FRUKTSAMHET",              "barn/kvinna", "befolkning",   NA_character_,
      "S_BEF_TATHET",               "inv/kvm",     "befolkning",   NA_character_
    ),

    # KPI-beskrivningar (alla, eftersom inget hamtas fran Kolada)
    beraknade_kpier = tribble(
      ~kpi_id, ~kpi_namn, ~beskrivning,
      "S_BEF_TOTALT",             "Folkmagd, antal",                     "Folkmagden den 31 december. Kalla: SCB.",
      "S_BEF_FORANDR_PCT",        "Befolkningsforandring, procent",      "Procentuell forandring av folkmagden sedan foregaende ar. Kalla: SCB, bearbetning Region Halland.",
      "S_BEF_FORANDR_ANTAL",      "Befolkningsforandring, antal",        "Folketokning/minskning i antal under aret. Kalla: SCB.",
      "S_BEF_0_19_ANDEL",         "Invanare 0-19 ar, andel",             "Andelen av befolkningen i aldern 0-19 ar. Kalla: SCB, bearbetning Region Halland.",
      "S_BEF_0_19_ANTAL",         "Invanare 0-19 ar, antal",             "Antal invanare i aldern 0-19 ar. Kalla: SCB, bearbetning Region Halland.",
      "S_BEF_20_64_ANDEL",        "Invanare 20-64 ar, andel",            "Andelen av befolkningen i arbetsfor alder (20-64 ar). Kalla: SCB, bearbetning Region Halland.",
      "S_BEF_20_64_ANTAL",        "Invanare 20-64 ar, antal",            "Antal invanare i arbetsfor alder (20-64 ar). Kalla: SCB, bearbetning Region Halland.",
      "S_BEF_65_79_ANDEL",        "Invanare 65-79 ar, andel",            "Andelen av befolkningen i aldern 65-79 ar. Kalla: SCB, bearbetning Region Halland.",
      "S_BEF_65_79_ANTAL",        "Invanare 65-79 ar, antal",            "Antal invanare i aldern 65-79 ar. Kalla: SCB, bearbetning Region Halland.",
      "S_BEF_80_ANDEL",           "Invanare 80 ar och aldre, andel",     "Andelen av befolkningen som ar 80 ar och aldre. Kalla: SCB, bearbetning Region Halland.",
      "S_BEF_80_ANTAL",           "Invanare 80 ar och aldre, antal",     "Antal invanare som ar 80 ar och aldre. Kalla: SCB, bearbetning Region Halland.",
      "S_FODELSENETTO_PROMILLE",  "Fodelsenetto per 1 000 inv.",         "Fodelseoeverskott (fodda minus doda) per 1 000 invanare. Kalla: SCB, bearbetning Region Halland.",
      "S_FODELSENETTO_ANTAL",     "Fodelsenetto, antal",                 "Fodelseoeverskott: antal fodda minus antal doda under aret. Kalla: SCB.",
      "S_INRIKES_NETTO_PROMILLE", "Inrikes flyttnetto per 1 000 inv.",   "Inrikes flyttningsoeverskott per 1 000 invanare. Kalla: SCB, bearbetning Region Halland.",
      "S_INRIKES_NETTO_ANTAL",    "Inrikes flyttnetto, antal",           "Inrikes flyttningsoeverskott: inflyttade minus utflyttade inom Sverige. Kalla: SCB.",
      "S_UTRIKES_NETTO_PROMILLE", "Utrikes flyttnetto per 1 000 inv.",   "Invandringsoeverskott per 1 000 invanare. Kalla: SCB, bearbetning Region Halland.",
      "S_UTRIKES_NETTO_ANTAL",    "Utrikes flyttnetto, antal",           "Invandringsoeverskott: antal invandrade minus utvandrade. Kalla: SCB.",
      "S_FODDA_ANTAL",            "Antal fodda",                         "Antal levande fodda under aret. Kalla: SCB.",
      "S_DODA_ANTAL",             "Antal doda",                          "Antal doda under aret. Kalla: SCB.",
      "S_INVANDRING_ANTAL",       "Invandringar, antal",                 "Antal invandringar (inflyttningar fran utlandet) under aret. Kalla: SCB.",
      "S_UTVANDRING_ANTAL",       "Utvandringar, antal",                 "Antal utvandringar (utflyttningar till utlandet) under aret. Kalla: SCB.",
      "S_INRIKES_INFLYTT_ANTAL",  "Inrikes inflyttningar, antal",        "Antal inflyttningar fran andra kommuner i Sverige under aret. Kalla: SCB.",
      "S_INRIKES_UTFLYTT_ANTAL",  "Inrikes utflyttningar, antal",        "Antal utflyttningar till andra kommuner i Sverige under aret. Kalla: SCB.",
      "S_KVINNOR_ANDEL",          "Kvinnor i befolkningen, andel",       "Andelen kvinnor av totalbefolkningen. Kalla: SCB, bearbetning Region Halland.",
      "S_KVINNOR_ANTAL",          "Kvinnor i befolkningen, antal",       "Antal kvinnor i befolkningen. Kalla: SCB.",
      "S_UTRIKES_FODDA_ANDEL",    "Utrikes fodda, andel",                "Andelen av befolkningen som ar fodda utanfor Sverige. Kalla: SCB, bearbetning Region Halland.",
      "S_UTRIKES_FODDA_ANTAL",    "Utrikes fodda, antal",                "Antal invanare som ar fodda utanfor Sverige. Kalla: SCB.",
      "S_FORSORJ_TOTAL",          "Demografisk forsorjningskvot",        "Antal invanare 0-19 och 65+ per 100 invanare 20-64 ar. Kalla: SCB.",
      "S_FORSORJ_UNG",            "Forsorjningskvot, yngre (0-19 / 20-64)", "Antal invanare 0-19 ar per 100 invanare 20-64 ar. Kalla: SCB.",
      "S_FORSORJ_ALD",            "Forsorjningskvot, aldre (65+ / 20-64)",  "Antal invanare 65 ar och aldre per 100 invanare 20-64 ar. Kalla: SCB.",
      "S_MEDELALDER",             "Befolkningens medelalder",            "Medelalder i befolkningen. Kalla: SCB.",
      "S_FRUKTSAMHET",            "Summerad fruktsamhet",                "Genomsnittligt antal barn per kvinna (summerat fruktsamhetstal). Kalla: SCB.",
      "S_BEF_TATHET",             "Invanare per kvadratkilometer",       "Befolkningstathet: antal invanare per kvadratkilometer landareal. Kalla: SCB."
    ),

    # Inga beraknade antal-KPI:er (allt beraknas i hamta-steget)
    berakna_antal = NULL,

    # Visningsnamn for frontend
    visningsnamn = list(
      "S_BEF_TOTALT"              = "Folkmagd",
      "S_BEF_FORANDR_PCT"         = "Arlig befolkningsforandring",
      "S_BEF_FORANDR_ANTAL"       = "Arlig befolkningsforandring",
      "S_BEF_0_19_ANDEL"          = "Befolkningsandel 0-19 ar",
      "S_BEF_0_19_ANTAL"          = "Befolkning 0-19 ar",
      "S_BEF_20_64_ANDEL"         = "Andel i arbetsfor alder",
      "S_BEF_20_64_ANTAL"         = "Befolkning i arbetsfor alder",
      "S_BEF_65_79_ANDEL"         = "Befolkningsandel 65-79 ar",
      "S_BEF_65_79_ANTAL"         = "Befolkning 65-79 ar",
      "S_BEF_80_ANDEL"            = "Befolkningsandel 80 ar och aldre",
      "S_BEF_80_ANTAL"            = "Befolkning 80 ar och aldre",
      "S_FODELSENETTO_PROMILLE"   = "Fodelsenetto",
      "S_FODELSENETTO_ANTAL"      = "Fodelsenetto",
      "S_INRIKES_NETTO_PROMILLE"  = "Inrikes flyttnetto",
      "S_INRIKES_NETTO_ANTAL"     = "Inrikes flyttnetto",
      "S_UTRIKES_NETTO_PROMILLE"  = "Utrikes flyttnetto",
      "S_UTRIKES_NETTO_ANTAL"     = "Utrikes flyttnetto",
      "S_FODDA_ANTAL"             = "Antal fodda",
      "S_DODA_ANTAL"              = "Antal doda",
      "S_INVANDRING_ANTAL"        = "Invandringar",
      "S_UTVANDRING_ANTAL"        = "Utvandringar",
      "S_INRIKES_INFLYTT_ANTAL"   = "Inrikes inflyttningar",
      "S_INRIKES_UTFLYTT_ANTAL"   = "Inrikes utflyttningar",
      "S_KVINNOR_ANDEL"           = "Kvinnor i befolkningen",
      "S_KVINNOR_ANTAL"           = "Kvinnor i befolkningen",
      "S_UTRIKES_FODDA_ANDEL"     = "Utrikes fodda",
      "S_UTRIKES_FODDA_ANTAL"     = "Utrikes fodda",
      "S_FORSORJ_TOTAL"           = "Demografisk forsorjningskvot",
      "S_FORSORJ_UNG"             = "Forsorjningskvot, yngre (0-19 / 20-64)",
      "S_FORSORJ_ALD"             = "Forsorjningskvot, aldre (65+ / 20-64)",
      "S_MEDELALDER"              = "Befolkningens medelalder",
      "S_FRUKTSAMHET"             = "Summerad fruktsamhet",
      "S_BEF_TATHET"              = "Invanare per kvadratkilometer"
    )
  )
}
