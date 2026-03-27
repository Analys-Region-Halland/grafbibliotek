# teman/turism/config.R — Konfiguration för temat Turism & besöksnäring
# Datakälla: Tillväxtverkets öppna data (inkvarteringsstatistik)
# Bas-URL: https://oppnadata.tillvaxtverket.se/data/inkvartering/
# Licens: CC0

source("R/paket.R")

turism_config <- function() {
  list(
    tema_id    = "turism",
    tema_namn  = "Turism & besöksnäring",
    tema_farg  = "rod",
    datakalla  = "tillvaxtverket",
    startar    = 2008,

    # KPI-ID:n som skapas av hamta-tillvaxtverket.R + forbearbeta_turism()
    kpier = c(
      # Gästnätter — volym
      "T_GAST_TOT",        # Gästnätter totalt (alla anläggningstyper)
      "T_GAST_HOTELL",     # Gästnätter hotell
      "T_GAST_CAMPING",    # Gästnätter camping
      "T_GAST_STUGBY",     # Gästnätter stugbyar
      "T_GAST_VANDRARHEM", # Gästnätter vandrarhem
      "T_GAST_SOL",        # Gästnätter förmedlade stugor/lägenheter

      # Gästnätter — ursprung
      "T_GAST_SVE",        # Gästnätter svenska gäster
      "T_GAST_UTL",        # Gästnätter utländska gäster
      "T_ANDEL_UTL_NATTER", # Andel utländska gästnätter, %

      # Besökare — ankomster
      "T_ANKOMST_SVE",     # Ankomster svenska gäster
      "T_ANKOMST_UTL",     # Ankomster utländska gäster
      "T_ANDEL_UTL",       # Andel utländska gästankomster, %

      # Kapacitet och ekonomi
      "T_BELAGG_RUM",      # Rumsbeläggning, %
      "T_BELAGG_BADD",     # Bäddbeläggning, %
      "T_LOGIINTAKT",      # Logiintäkter, kr
      "T_ANLAGGNINGAR",    # Antal anläggningar

      # Intensitet och relativa mått
      "T_INTAKT_PER_GAST", # Logiintäkt per gästnatt, kr
      "T_GAST_PER_ANLAGG", # Gästnätter per anläggning
      "T_GAST_PER_INV",    # Gästnätter per invånare

      # Tillväxt (år-över-år, %)
      "T_GAST_TILLVAXT",   # Gästnätter förändring, %
      "T_INTAKT_TILLVAXT"  # Logiintäkter förändring, %
    ),

    # Sektioner — styr gruppering i frontend
    sektioner = list(
      list(
        id = "gastnatter",
        namn = "Gästnätter",
        kpi_ids = c("T_GAST_TOT", "T_GAST_PER_INV"),
        undersektioner = list(
          list(
            namn = "Per anläggningstyp",
            kpi_ids = c("T_GAST_HOTELL", "T_GAST_CAMPING", "T_GAST_STUGBY",
                        "T_GAST_VANDRARHEM", "T_GAST_SOL")
          )
        )
      ),
      list(
        id = "marknad",
        namn = "Inhemska och utländska gäster",
        kpi_ids = c("T_GAST_SVE", "T_GAST_UTL", "T_ANDEL_UTL_NATTER",
                     "T_ANKOMST_SVE", "T_ANKOMST_UTL", "T_ANDEL_UTL")
      ),
      list(
        id = "tillvaxt",
        namn = "Utveckling och tillväxt",
        kpi_ids = c("T_GAST_TILLVAXT", "T_INTAKT_TILLVAXT")
      ),
      list(
        id = "kapacitet",
        namn = "Kapacitet och intäkter",
        kpi_ids = c("T_BELAGG_RUM", "T_BELAGG_BADD", "T_LOGIINTAKT",
                     "T_INTAKT_PER_GAST", "T_GAST_PER_ANLAGG", "T_ANLAGGNINGAR")
      )
    ),

    # KPI-metadata: enhet, tema, par
    kpi_meta = tribble(
      ~kpi_id,               ~enhet,    ~tema,    ~par_kpi_id,
      # Volym
      "T_GAST_TOT",          "antal",   "turism", NA_character_,
      "T_GAST_HOTELL",       "antal",   "turism", NA_character_,
      "T_GAST_CAMPING",      "antal",   "turism", NA_character_,
      "T_GAST_STUGBY",       "antal",   "turism", NA_character_,
      "T_GAST_VANDRARHEM",   "antal",   "turism", NA_character_,
      "T_GAST_SOL",          "antal",   "turism", NA_character_,
      # Ursprung
      "T_GAST_SVE",          "antal",   "turism", NA_character_,
      "T_GAST_UTL",          "antal",   "turism", "T_ANDEL_UTL_NATTER",
      "T_ANDEL_UTL_NATTER",  "procent", "turism", "T_GAST_UTL",
      # Ankomster
      "T_ANKOMST_SVE",       "antal",   "turism", NA_character_,
      "T_ANKOMST_UTL",       "antal",   "turism", "T_ANDEL_UTL",
      "T_ANDEL_UTL",         "procent", "turism", "T_ANKOMST_UTL",
      # Kapacitet
      "T_BELAGG_RUM",        "procent", "turism", NA_character_,
      "T_BELAGG_BADD",       "procent", "turism", NA_character_,
      "T_LOGIINTAKT",        "kr",      "turism", NA_character_,
      "T_ANLAGGNINGAR",      "antal",   "turism", NA_character_,
      # Intensitet
      "T_INTAKT_PER_GAST",   "kr",      "turism", NA_character_,
      "T_GAST_PER_ANLAGG",   "antal",   "turism", NA_character_,
      "T_GAST_PER_INV",      "antal",   "turism", NA_character_,
      # Tillväxt
      "T_GAST_TILLVAXT",     "procent", "turism", NA_character_,
      "T_INTAKT_TILLVAXT",   "procent", "turism", NA_character_
    ),

    # Alla KPI:er är beräknade (ingen Kolada-beskrivning att hämta)
    beraknade_kpier = tribble(
      ~kpi_id,               ~kpi_namn,                                       ~beskrivning,
      "T_GAST_TOT",          "Gästnätter, totalt",                           "Totalt antal gästnätter vid samtliga kommersiella boenden (hotell, stugbyar, vandrarhem, camping och förmedlade stugor/lägenheter). Källa: Tillväxtverkets inkvarteringsstatistik.",
      "T_GAST_HOTELL",       "Gästnätter, hotell",                           "Antal gästnätter vid hotell.",
      "T_GAST_CAMPING",      "Gästnätter, camping",                          "Antal gästnätter vid campinganläggningar.",
      "T_GAST_STUGBY",       "Gästnätter, stugbyar",                         "Antal gästnätter vid stugbyar.",
      "T_GAST_VANDRARHEM",   "Gästnätter, vandrarhem",                       "Antal gästnätter vid vandrarhem.",
      "T_GAST_SOL",          "Gästnätter, förmedlade stugor och lägenheter", "Antal gästnätter i kommersiellt förmedlade privata stugor och lägenheter.",
      "T_GAST_SVE",          "Gästnätter, svenska gäster",                   "Antal gästnätter av gäster med hemland Sverige.",
      "T_GAST_UTL",          "Gästnätter, utländska gäster",                 "Antal gästnätter av gäster med hemland utanför Sverige.",
      "T_ANDEL_UTL_NATTER",  "Andel utländska gästnätter",                   "Utländska gästnätter som andel av samtliga gästnätter, procent.",
      "T_ANKOMST_SVE",       "Gästankomster, svenska",                       "Antal ankomster av svenska gäster till kommersiella boenden.",
      "T_ANKOMST_UTL",       "Gästankomster, utländska",                     "Antal ankomster av utländska gäster till kommersiella boenden.",
      "T_ANDEL_UTL",         "Andel utländska gästankomster",                "Utländska gästankomster som andel av samtliga ankomster, procent.",
      "T_BELAGG_RUM",        "Rumsbeläggning",                               "Andel belagda rum av totalt antal disponibla rum, procent. Omfattar hotell, stugbyar och vandrarhem.",
      "T_BELAGG_BADD",       "Bäddbeläggning",                               "Andel belagda bäddar av totalt antal disponibla bäddar, procent.",
      "T_LOGIINTAKT",        "Logiintäkter",                                 "Totala logiintäkter i kronor vid kommersiella boenden.",
      "T_ANLAGGNINGAR",      "Antal anläggningar",                           "Totalt antal kommersiella boendeanläggningar.",
      "T_INTAKT_PER_GAST",   "Logiintäkt per gästnatt",                     "Genomsnittlig logiintäkt per gästnatt, kronor. Beräknat som totala logiintäkter dividerat med antal gästnätter.",
      "T_GAST_PER_ANLAGG",   "Gästnätter per anläggning",                   "Genomsnittligt antal gästnätter per anläggning. Indikerar genomsnittlig storlek och utnyttjande.",
      "T_GAST_PER_INV",      "Gästnätter per invånare",                     "Antal gästnätter per invånare. Mäter turismintensiteten i förhållande till kommunens storlek. Beräknat med totalbefolkning. Källa: Tillväxtverket, RKA Kolada och bearbetningar av Region Halland.",
      "T_GAST_TILLVAXT",     "Gästnätter, årlig förändring",                "Gästnätternas förändring jämfört med föregående år, procent.",
      "T_INTAKT_TILLVAXT",   "Logiintäkter, årlig förändring",              "Logiintäkternas förändring jämfört med föregående år, procent."
    ),

    # Visningsnamn för frontend
    visningsnamn = list(
      "T_GAST_TOT"          = "Gästnätter, totalt",
      "T_GAST_HOTELL"       = "Gästnätter, hotell",
      "T_GAST_CAMPING"      = "Gästnätter, camping",
      "T_GAST_STUGBY"       = "Gästnätter, stugbyar",
      "T_GAST_VANDRARHEM"   = "Gästnätter, vandrarhem",
      "T_GAST_SOL"          = "Gästnätter, förmedlade stugor och lägenheter",
      "T_GAST_SVE"          = "Gästnätter, svenska gäster",
      "T_GAST_UTL"          = "Gästnätter, utländska gäster",
      "T_ANDEL_UTL_NATTER"  = "Andel utländska gästnätter",
      "T_ANKOMST_SVE"       = "Gästankomster, svenska",
      "T_ANKOMST_UTL"       = "Gästankomster, utländska",
      "T_ANDEL_UTL"         = "Andel utländska gästankomster",
      "T_BELAGG_RUM"        = "Rumsbeläggning",
      "T_BELAGG_BADD"       = "Bäddbeläggning",
      "T_LOGIINTAKT"        = "Logiintäkter",
      "T_ANLAGGNINGAR"      = "Antal anläggningar",
      "T_INTAKT_PER_GAST"   = "Logiintäkt per gästnatt",
      "T_GAST_PER_ANLAGG"   = "Gästnätter per anläggning",
      "T_GAST_PER_INV"      = "Gästnätter per invånare",
      "T_GAST_TILLVAXT"     = "Gästnätter, årlig förändring",
      "T_INTAKT_TILLVAXT"   = "Logiintäkter, årlig förändring"
    )
  )
}
