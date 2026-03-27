# teman/bostader/config.R — Bostäder
# Blandad källa: Kolada (andelar, per 1 000 inv, priser) + SCB (absoluta antal)
# SCB-tabell BO0104T04: Bostadsbestånd per upplåtelseform
# SCB-tabell LghReHtypUfAr: Färdigställda bostäder i nybyggnad

source("R/paket.R")

# SCB-tabellernas URL:er
SCB_BESTAND_URL <- "https://api.scb.se/OV0104/v1/doris/sv/ssd/BO/BO0104/BO0104D/BO0104T04"
SCB_NYBYGG_URL  <- "https://api.scb.se/OV0104/v1/doris/sv/ssd/BO/BO0101/BO0101A/LghReHtypUfAr"

bostader_config <- function() {

  # Alla region-koder för ranking (kommun + län + riket)
  kommun_df <- readRDS("data/kommun-register.rds")
  alla_regioner <- kommun_df$id
  scb_regioner <- sub("^00", "", alla_regioner)
  scb_regioner <- scb_regioner[nchar(scb_regioner) > 0]

  # Perioder
  perioder <- as.character(2010:as.integer(format(Sys.Date(), "%Y")))

  list(
    tema_id    = "bostader",
    tema_namn  = "Bostäder",
    tema_farg  = "gul",
    datakalla  = c("kolada", "scb"),
    startar    = 2010,

    # ── Kolada KPI:er (andelar, per 1 000 inv, priser, kvalitet) ──
    kpier = c(
      # Bostadsbestånd — andelar
      "N07913",   # Bostäder totalt, antal/1 000 inv
      "N07956",   # Hyresrätter i beståndet, andel (%)
      "N07957",   # Bostadsrätter i beståndet, andel (%)
      "N07958",   # Äganderätter i beståndet, andel (%)
      # Bostadsbyggande — per 1 000 inv
      "N07917",   # Färdigställda bostäder, nybyggnad, antal/1 000 inv
      "N07905",   # Färdigställda småhus, antal/1 000 inv
      "N07906",   # Färdigställda flerbostadshus, antal/1 000 inv
      "N07923",   # Planberedskap för nya bostäder, antal/1 000 inv
      # Priser
      "N07908",   # Fastighetspris bostadsrätt, kr/kvm
      "N07909",   # Fastighetspris småhus, kr/kvm
      # Boendekvalitet
      "N07907",   # Trångboddhet flerbostadshus, norm 2, andel (%)
      "N07418"    # Befolkning i kollektivtrafiknära läge, andel (%)
    ),

    # Ingen könsuppdelning
    konuppdelning = character(0),

    # ── SCB-tabeller (absoluta antal) ──
    scb_tabeller = list(

      # Bostadsbestånd totalt (alla hustyp + alla upplåtelseformer → summa)
      list(
        url = SCB_BESTAND_URL,
        kpi_id = "B_TOT",
        query = list(
          Region = scb_regioner,
          ContentsCode = c("BO0104AH"),
          Tid = perioder
        ),
        region_kolumn = "Region",
        ar_kolumn = "Tid"
      ),
      # Hyresrätter, antal (alla hustyp, upplåtelseform = hyresrätt)
      list(
        url = SCB_BESTAND_URL,
        kpi_id = "B_HYRA_N",
        query = list(
          Region = scb_regioner,
          Upplatelseform = c("1"),
          ContentsCode = c("BO0104AH"),
          Tid = perioder
        ),
        region_kolumn = "Region",
        ar_kolumn = "Tid"
      ),
      # Bostadsrätter, antal
      list(
        url = SCB_BESTAND_URL,
        kpi_id = "B_BOST_N",
        query = list(
          Region = scb_regioner,
          Upplatelseform = c("2"),
          ContentsCode = c("BO0104AH"),
          Tid = perioder
        ),
        region_kolumn = "Region",
        ar_kolumn = "Tid"
      ),
      # Äganderätter, antal
      list(
        url = SCB_BESTAND_URL,
        kpi_id = "B_AGAN_N",
        query = list(
          Region = scb_regioner,
          Upplatelseform = c("3"),
          ContentsCode = c("BO0104AH"),
          Tid = perioder
        ),
        region_kolumn = "Region",
        ar_kolumn = "Tid"
      ),

      # Färdigställda bostäder totalt (alla hustyp + alla upplåtelseformer)
      list(
        url = SCB_NYBYGG_URL,
        kpi_id = "B_NY_TOT",
        query = list(
          Region = scb_regioner,
          ContentsCode = c("0000005O"),
          Tid = perioder
        ),
        region_kolumn = "Region",
        ar_kolumn = "Tid"
      ),
      # Färdigställda småhus, antal
      list(
        url = SCB_NYBYGG_URL,
        kpi_id = "B_NY_SMAHUS",
        query = list(
          Region = scb_regioner,
          Hustyp = c("SMÅHUS"),
          ContentsCode = c("0000005O"),
          Tid = perioder
        ),
        region_kolumn = "Region",
        ar_kolumn = "Tid"
      ),
      # Färdigställda flerbostadshus, antal
      list(
        url = SCB_NYBYGG_URL,
        kpi_id = "B_NY_FLERBO",
        query = list(
          Region = scb_regioner,
          Hustyp = c("FLERBO"),
          ContentsCode = c("0000005O"),
          Tid = perioder
        ),
        region_kolumn = "Region",
        ar_kolumn = "Tid"
      )
    ),

    # Sektioner för frontend
    sektioner = list(
      list(
        id = "bestand",
        namn = "Bostadsbestånd och upplåtelseform",
        kpi_ids = c("N07913", "N07956", "N07957", "N07958")
      ),
      list(
        id = "byggande",
        namn = "Bostadsbyggande",
        kpi_ids = c("N07917", "N07905", "N07906", "N07923")
      ),
      list(
        id = "priser",
        namn = "Fastighetspriser",
        kpi_ids = c("N07908", "N07909")
      ),
      list(
        id = "kvalitet",
        namn = "Boendekvalitet",
        kpi_ids = c("N07907", "N07418")
      )
    ),

    # KPI-metadata (Kolada + SCB)
    kpi_meta = tribble(
      ~kpi_id,       ~enhet,             ~tema,       ~par_kpi_id,
      # Bostadsbestånd — Kolada (rate/andel) ↔ SCB (antal)
      "N07913",      "antal/1 000 inv",  "bostader",  "B_TOT",
      "B_TOT",       "antal",            "bostader",  "N07913",
      "N07956",      "procent",          "bostader",  "B_HYRA_N",
      "B_HYRA_N",    "antal",            "bostader",  "N07956",
      "N07957",      "procent",          "bostader",  "B_BOST_N",
      "B_BOST_N",    "antal",            "bostader",  "N07957",
      "N07958",      "procent",          "bostader",  "B_AGAN_N",
      "B_AGAN_N",    "antal",            "bostader",  "N07958",
      # Bostadsbyggande — Kolada (per 1 000 inv) ↔ SCB (antal)
      "N07917",      "antal/1 000 inv",  "bostader",  "B_NY_TOT",
      "B_NY_TOT",    "antal",            "bostader",  "N07917",
      "N07905",      "antal/1 000 inv",  "bostader",  "B_NY_SMAHUS",
      "B_NY_SMAHUS", "antal",            "bostader",  "N07905",
      "N07906",      "antal/1 000 inv",  "bostader",  "B_NY_FLERBO",
      "B_NY_FLERBO", "antal",            "bostader",  "N07906",
      "N07923",      "antal/1 000 inv",  "bostader",  NA_character_,
      # Priser
      "N07908",      "kr/kvm",           "bostader",  NA_character_,
      "N07909",      "kr/kvm",           "bostader",  NA_character_,
      # Boendekvalitet
      "N07907",      "procent",          "bostader",  NA_character_,
      "N07418",      "procent",          "bostader",  NA_character_
    ),

    # Beräknade KPI:er — SCB-antal behöver namn/beskrivningar
    beraknade_kpier = tribble(
      ~kpi_id,        ~kpi_namn,                                ~beskrivning,
      # Bostadsbestånd
      "B_TOT",        "Bostäder totalt, antal",                 "Totalt antal lägenheter i kommunen. Källa: SCB Bostadsbestånd.",
      "B_HYRA_N",     "Hyresrätter, antal",                     "Antal lägenheter med hyresrätt. Källa: SCB Bostadsbestånd.",
      "B_BOST_N",     "Bostadsrätter, antal",                   "Antal lägenheter med bostadsrätt. Källa: SCB Bostadsbestånd.",
      "B_AGAN_N",     "Äganderätter, antal",                    "Antal lägenheter med äganderätt (småhus). Källa: SCB Bostadsbestånd.",
      # Bostadsbyggande
      "B_NY_TOT",     "Färdigställda bostäder, antal",          "Antal färdigställda lägenheter i nybyggda hus per år. Källa: SCB.",
      "B_NY_SMAHUS",  "Färdigställda småhus, antal",            "Antal färdigställda lägenheter i nybyggda småhus per år. Källa: SCB.",
      "B_NY_FLERBO",  "Färdigställda flerbostadshus, antal",    "Antal färdigställda lägenheter i nybyggda flerbostadshus per år. Källa: SCB."
    ),

    # Inga beräknade antal-KPI:er (SCB levererar antal direkt)
    berakna_antal = list(),

    # Visningsnamn för frontend
    visningsnamn = list(
      "N07913"       = "Bostäder totalt",
      "B_TOT"        = "Bostäder totalt",
      "N07956"       = "Hyresrätter",
      "B_HYRA_N"     = "Hyresrätter",
      "N07957"       = "Bostadsrätter",
      "B_BOST_N"     = "Bostadsrätter",
      "N07958"       = "Äganderätter",
      "B_AGAN_N"     = "Äganderätter",
      "N07917"       = "Nybyggda bostäder",
      "B_NY_TOT"     = "Nybyggda bostäder",
      "N07905"       = "Färdigställda småhus",
      "B_NY_SMAHUS"  = "Färdigställda småhus",
      "N07906"       = "Färdigställda flerbostadshus",
      "B_NY_FLERBO"  = "Färdigställda flerbostadshus",
      "N07923"       = "Planberedskap",
      "N07908"       = "Bostadsrättspris",
      "N07909"       = "Småhuspris",
      "N07907"       = "Trångboddhet",
      "N07418"       = "Kollektivtrafiknära läge"
    )
  )
}
