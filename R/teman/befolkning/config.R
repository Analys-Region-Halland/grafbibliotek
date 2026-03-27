# teman/befolkning/config.R — Konfiguration för temat Befolkning & demografi
# Datakälla: SCB (PxWeb API) — ersätter tidigare Kolada-hämtning
# Tidsperiod: 2000-2025 (beroende på tabell)
#
# SCB-tabeller som används:
#   BE0101A/BefolkningNy       — Folkmängd per ålder och kön (1968-2024)
#   BE0101A/BefolkningNyCKM    — Folkmängd preliminär (2025)
#   BE0101G/BefforandrKvRLK    — Befolkningsförändringar (2000-2024)
#   BE0101G/BefforandrKvRLKCKM — Befolkningsförändringar preliminär (2025)
#   BE0101A/FkvotHVD           — Demografisk försörjningskvot (2000-2025)
#   BE0101B/BefolkningMedelAlder — Medelålder (1998-2025)
#   BE0101H/FruktsamhetSum     — Summerad fruktsamhet (2000-2025)
#   BE0101C/BefArealTathetKon  — Befolkningstäthet (1991-2025)
#   BE0101E/InrUtrFoddaRegAlKon — Utrikes/inrikes födda (2000-2024)
#   BE0101H/FoddaK + FoddaKCKM — Födda per region (1968-2025)
#   BE0101I/DodaFodelsearK + CKM — Döda per region (1968-2025)
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
        namn = "Folkmängd och förändring",
        kpi_ids = c("S_BEF_TOTALT", "S_BEF_TATHET", "S_BEF_FORANDR_PCT",
                     "S_FODELSENETTO_ANTAL", "S_INRIKES_NETTO_ANTAL",
                     "S_UTRIKES_NETTO_ANTAL", "S_FRUKTSAMHET")
      ),
      list(
        id = "sammansattning",
        namn = "Befolkningens sammansättning",
        kpi_ids = c("S_MEDELALDER", "S_FORSORJ_TOTAL",
                     "S_BEF_0_19_ANDEL", "S_BEF_20_64_ANDEL",
                     "S_BEF_65_79_ANDEL", "S_BEF_80_ANDEL",
                     "S_KVINNOR_ANDEL", "S_UTRIKES_FODDA_ANDEL")
      )
    ),

    # KPI-metadata: enhet, tema, par (andel<->antal)
    kpi_meta = tribble(
      ~kpi_id,                      ~enhet,            ~tema,          ~par_kpi_id,
      # Folkmängd
      "S_BEF_TOTALT",               "antal",           "befolkning",   NA_character_,
      "S_BEF_FORANDR_PCT",          "procent",         "befolkning",   "S_BEF_FORANDR_ANTAL",
      "S_BEF_FORANDR_ANTAL",        "antal",           "befolkning",   "S_BEF_FORANDR_PCT",
      # Åldersstruktur
      "S_BEF_0_19_ANDEL",           "procent",         "befolkning",   "S_BEF_0_19_ANTAL",
      "S_BEF_0_19_ANTAL",           "antal",           "befolkning",   "S_BEF_0_19_ANDEL",
      "S_BEF_20_64_ANDEL",          "procent",         "befolkning",   "S_BEF_20_64_ANTAL",
      "S_BEF_20_64_ANTAL",          "antal",           "befolkning",   "S_BEF_20_64_ANDEL",
      "S_BEF_65_79_ANDEL",          "procent",         "befolkning",   "S_BEF_65_79_ANTAL",
      "S_BEF_65_79_ANTAL",          "antal",           "befolkning",   "S_BEF_65_79_ANDEL",
      "S_BEF_80_ANDEL",             "procent",         "befolkning",   "S_BEF_80_ANTAL",
      "S_BEF_80_ANTAL",             "antal",           "befolkning",   "S_BEF_80_ANDEL",
      # Befolkningsrörelse — netto
      "S_FODELSENETTO_PROMILLE",    "per 1 000 inv.",  "befolkning",   "S_FODELSENETTO_ANTAL",
      "S_FODELSENETTO_ANTAL",       "antal",           "befolkning",   "S_FODELSENETTO_PROMILLE",
      "S_INRIKES_NETTO_PROMILLE",   "per 1 000 inv.",  "befolkning",   "S_INRIKES_NETTO_ANTAL",
      "S_INRIKES_NETTO_ANTAL",      "antal",           "befolkning",   "S_INRIKES_NETTO_PROMILLE",
      "S_UTRIKES_NETTO_PROMILLE",   "per 1 000 inv.",  "befolkning",   "S_UTRIKES_NETTO_ANTAL",
      "S_UTRIKES_NETTO_ANTAL",      "antal",           "befolkning",   "S_UTRIKES_NETTO_PROMILLE",
      # Befolkningsrörelse — ingående komponenter
      "S_FODDA_ANTAL",              "antal",           "befolkning",   NA_character_,
      "S_DODA_ANTAL",               "antal",           "befolkning",   NA_character_,
      "S_INVANDRING_ANTAL",         "antal",           "befolkning",   NA_character_,
      "S_UTVANDRING_ANTAL",         "antal",           "befolkning",   NA_character_,
      "S_INRIKES_INFLYTT_ANTAL",    "antal",           "befolkning",   NA_character_,
      "S_INRIKES_UTFLYTT_ANTAL",    "antal",           "befolkning",   NA_character_,
      # Sammansättning
      "S_KVINNOR_ANDEL",            "procent",         "befolkning",   "S_KVINNOR_ANTAL",
      "S_KVINNOR_ANTAL",            "antal",           "befolkning",   "S_KVINNOR_ANDEL",
      "S_UTRIKES_FODDA_ANDEL",      "procent",         "befolkning",   "S_UTRIKES_FODDA_ANTAL",
      "S_UTRIKES_FODDA_ANTAL",      "antal",           "befolkning",   "S_UTRIKES_FODDA_ANDEL",
      # Försörjningskvot
      "S_FORSORJ_TOTAL",            "kvot",            "befolkning",   NA_character_,
      "S_FORSORJ_UNG",              "kvot",            "befolkning",   NA_character_,
      "S_FORSORJ_ALD",              "kvot",            "befolkning",   NA_character_,
      # Övrigt
      "S_MEDELALDER",               "år",              "befolkning",   NA_character_,
      "S_FRUKTSAMHET",              "barn/kvinna",     "befolkning",   NA_character_,
      "S_BEF_TATHET",               "inv/kvm",         "befolkning",   NA_character_
    ),

    # KPI-beskrivningar (alla, eftersom inget hämtas från Kolada)
    beraknade_kpier = tribble(
      ~kpi_id, ~kpi_namn, ~beskrivning,
      "S_BEF_TOTALT",             "Folkmängd, antal",                     "Folkmängden den 31 december. Källa: SCB.",
      "S_BEF_FORANDR_PCT",        "Befolkningsförändring, procent",       "Procentuell förändring av folkmängden sedan föregående år. Källa: SCB, bearbetning Region Halland.",
      "S_BEF_FORANDR_ANTAL",      "Befolkningsförändring, antal",         "Folkökning/minskning i antal under året. Källa: SCB.",
      "S_BEF_0_19_ANDEL",         "Invånare 0\u201319 år, andel",        "Andelen av befolkningen i åldern 0\u201319 år. Källa: SCB, bearbetning Region Halland.",
      "S_BEF_0_19_ANTAL",         "Invånare 0\u201319 år, antal",        "Antal invånare i åldern 0\u201319 år. Källa: SCB, bearbetning Region Halland.",
      "S_BEF_20_64_ANDEL",        "Invånare 20\u201364 år, andel",       "Andelen av befolkningen i arbetsför ålder (20\u201364 år). Källa: SCB, bearbetning Region Halland.",
      "S_BEF_20_64_ANTAL",        "Invånare 20\u201364 år, antal",       "Antal invånare i arbetsför ålder (20\u201364 år). Källa: SCB, bearbetning Region Halland.",
      "S_BEF_65_79_ANDEL",        "Invånare 65\u201379 år, andel",       "Andelen av befolkningen i åldern 65\u201379 år. Källa: SCB, bearbetning Region Halland.",
      "S_BEF_65_79_ANTAL",        "Invånare 65\u201379 år, antal",       "Antal invånare i åldern 65\u201379 år. Källa: SCB, bearbetning Region Halland.",
      "S_BEF_80_ANDEL",           "Invånare 80 år och äldre, andel",     "Andelen av befolkningen som är 80 år och äldre. Källa: SCB, bearbetning Region Halland.",
      "S_BEF_80_ANTAL",           "Invånare 80 år och äldre, antal",     "Antal invånare som är 80 år och äldre. Källa: SCB, bearbetning Region Halland.",
      "S_FODELSENETTO_PROMILLE",  "Födelsenetto per 1 000 inv.",         "Födelseöverskott (födda minus döda) per 1 000 invånare. Källa: SCB, bearbetning Region Halland.",
      "S_FODELSENETTO_ANTAL",     "Födelsenetto, antal",                 "Födelseöverskott: antal födda minus antal döda under året. Källa: SCB.",
      "S_INRIKES_NETTO_PROMILLE", "Inrikes flyttnetto per 1 000 inv.",   "Inrikes flyttningsöverskott per 1 000 invånare. Källa: SCB, bearbetning Region Halland.",
      "S_INRIKES_NETTO_ANTAL",    "Inrikes flyttnetto, antal",           "Inrikes flyttningsöverskott: inflyttade minus utflyttade inom Sverige. Källa: SCB.",
      "S_UTRIKES_NETTO_PROMILLE", "Utrikes flyttnetto per 1 000 inv.",   "Invandringsöverskott per 1 000 invånare. Källa: SCB, bearbetning Region Halland.",
      "S_UTRIKES_NETTO_ANTAL",    "Utrikes flyttnetto, antal",           "Invandringsöverskott: antal invandrade minus utvandrade. Källa: SCB.",
      "S_FODDA_ANTAL",            "Antal födda",                         "Antal levande födda under året. Källa: SCB.",
      "S_DODA_ANTAL",             "Antal döda",                          "Antal döda under året. Källa: SCB.",
      "S_INVANDRING_ANTAL",       "Invandringar, antal",                 "Antal invandringar (inflyttningar från utlandet) under året. Källa: SCB.",
      "S_UTVANDRING_ANTAL",       "Utvandringar, antal",                 "Antal utvandringar (utflyttningar till utlandet) under året. Källa: SCB.",
      "S_INRIKES_INFLYTT_ANTAL",  "Inrikes inflyttningar, antal",        "Antal inflyttningar från andra kommuner i Sverige under året. Källa: SCB.",
      "S_INRIKES_UTFLYTT_ANTAL",  "Inrikes utflyttningar, antal",        "Antal utflyttningar till andra kommuner i Sverige under året. Källa: SCB.",
      "S_KVINNOR_ANDEL",          "Kvinnor i befolkningen, andel",       "Andelen kvinnor av totalbefolkningen. Källa: SCB, bearbetning Region Halland.",
      "S_KVINNOR_ANTAL",          "Kvinnor i befolkningen, antal",       "Antal kvinnor i befolkningen. Källa: SCB.",
      "S_UTRIKES_FODDA_ANDEL",    "Utrikes födda, andel",                "Andelen av befolkningen som är födda utanför Sverige. Källa: SCB, bearbetning Region Halland.",
      "S_UTRIKES_FODDA_ANTAL",    "Utrikes födda, antal",                "Antal invånare som är födda utanför Sverige. Källa: SCB.",
      "S_FORSORJ_TOTAL",          "Demografisk försörjningskvot",        "Antal invånare 0\u201319 och 65+ per 100 invånare 20\u201364 år. Källa: SCB.",
      "S_FORSORJ_UNG",            "Försörjningskvot, yngre (0\u201319 / 20\u201364)", "Antal invånare 0\u201319 år per 100 invånare 20\u201364 år. Källa: SCB.",
      "S_FORSORJ_ALD",            "Försörjningskvot, äldre (65+ / 20\u201364)",  "Antal invånare 65 år och äldre per 100 invånare 20\u201364 år. Källa: SCB.",
      "S_MEDELALDER",             "Befolkningens medelålder",            "Medelålder i befolkningen. Källa: SCB.",
      "S_FRUKTSAMHET",            "Summerad fruktsamhet",                "Genomsnittligt antal barn per kvinna (summerat fruktsamhetstal). Källa: SCB.",
      "S_BEF_TATHET",             "Invånare per kvadratkilometer",       "Befolkningstäthet: antal invånare per kvadratkilometer landareal. Källa: SCB."
    ),

    # Inga beräknade antal-KPI:er (allt beräknas i hämta-steget)
    berakna_antal = NULL,

    # Visningsnamn för frontend
    visningsnamn = list(
      "S_BEF_TOTALT"              = "Folkmängd",
      "S_BEF_FORANDR_PCT"         = "Årlig befolkningsförändring",
      "S_BEF_FORANDR_ANTAL"       = "Årlig befolkningsförändring",
      "S_BEF_0_19_ANDEL"          = "Befolkningsandel 0\u201319 år",
      "S_BEF_0_19_ANTAL"          = "Befolkning 0\u201319 år",
      "S_BEF_20_64_ANDEL"         = "Andel i arbetsför ålder",
      "S_BEF_20_64_ANTAL"         = "Befolkning i arbetsför ålder",
      "S_BEF_65_79_ANDEL"         = "Befolkningsandel 65\u201379 år",
      "S_BEF_65_79_ANTAL"         = "Befolkning 65\u201379 år",
      "S_BEF_80_ANDEL"            = "Befolkningsandel 80 år och äldre",
      "S_BEF_80_ANTAL"            = "Befolkning 80 år och äldre",
      "S_FODELSENETTO_PROMILLE"   = "Födelsenetto",
      "S_FODELSENETTO_ANTAL"      = "Födelsenetto",
      "S_INRIKES_NETTO_PROMILLE"  = "Inrikes flyttnetto",
      "S_INRIKES_NETTO_ANTAL"     = "Inrikes flyttnetto",
      "S_UTRIKES_NETTO_PROMILLE"  = "Utrikes flyttnetto",
      "S_UTRIKES_NETTO_ANTAL"     = "Utrikes flyttnetto",
      "S_FODDA_ANTAL"             = "Antal födda",
      "S_DODA_ANTAL"              = "Antal döda",
      "S_INVANDRING_ANTAL"        = "Invandringar",
      "S_UTVANDRING_ANTAL"        = "Utvandringar",
      "S_INRIKES_INFLYTT_ANTAL"   = "Inrikes inflyttningar",
      "S_INRIKES_UTFLYTT_ANTAL"   = "Inrikes utflyttningar",
      "S_KVINNOR_ANDEL"           = "Kvinnor i befolkningen",
      "S_KVINNOR_ANTAL"           = "Kvinnor i befolkningen",
      "S_UTRIKES_FODDA_ANDEL"     = "Utrikes födda",
      "S_UTRIKES_FODDA_ANTAL"     = "Utrikes födda",
      "S_FORSORJ_TOTAL"           = "Demografisk försörjningskvot",
      "S_FORSORJ_UNG"             = "Försörjningskvot, yngre (0\u201319 / 20\u201364)",
      "S_FORSORJ_ALD"             = "Försörjningskvot, äldre (65+ / 20\u201364)",
      "S_MEDELALDER"              = "Befolkningens medelålder",
      "S_FRUKTSAMHET"             = "Summerad fruktsamhet",
      "S_BEF_TATHET"              = "Invånare per kvadratkilometer"
    )
  )
}
