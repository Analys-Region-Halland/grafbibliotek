# teman/konjunktur/config.R — Konjunktur (preliminär månadsstatistik)
# Källa: SCB tabeller ArbStatusM (nattbefolkning) och ArbStDoNMNN (dagbefolkning)
# Åldersgrupp: 20–64 år
# Data publiceras månadsvis med ~6 månaders eftersläpning.
#
# Skillnad mot arbetsmarknad-temat:
#   - Arbetsmarknad använder BAS årsregister (slutlig registerstatistik)
#   - Konjunktur använder preliminär månadsstatistik (snabbare men osäkrare)
#   - Konjunktur inkluderar dagbefolkning (sysselsatta per arbetsställe/bransch)
#
# Månadsdata konverteras till årsformat i bearbeta.R:
#   - Senaste gemensamma månaden väljs som referensmånad
#   - Samma månad jämförs över alla år → äpple-med-äpple-jämförelse

source("R/paket.R")

# SCB-tabellernas URL:er
SCB_NATT_URL <- "https://api.scb.se/OV0104/v1/doris/sv/ssd/AM/AM0210/AM0210A/ArbStatusM"
SCB_DAG_URL  <- "https://api.scb.se/OV0104/v1/doris/sv/ssd/AM/AM0210/AM0210B/ArbStDoNMNN"

konjunktur_config <- function() {

  # Alla region-koder — byggs dynamiskt från kommunregistret
  kommun_df <- readRDS("data/kommun-register.rds")
  alla_regioner <- kommun_df$id
  scb_regioner <- sub("^00", "", alla_regioner)
  scb_regioner <- scb_regioner[nchar(scb_regioner) > 0]

  # Generera månadskoder från 2020M01 till nuvarande år
  source("R/gemensam/hamta-scb-manad.R", local = TRUE)
  manadskoder <- generera_manadskoder(2020)

  list(
    tema_id    = "konjunktur",
    tema_namn  = "Konjunktur",
    tema_farg  = "bla",
    datakalla  = c("scb_manad", "tillvaxtverket_manad"),
    startar    = 2020,

    # Inga Kolada-KPI:er
    kpier = character(0),

    # SCB-månadstabeller — en per KPI × dimension
    scb_manad_tabeller = list(

      # ══════════════════════════════════════════════
      # TABELL 1: ArbStatusM (nattbefolkning 20–64)
      # ══════════════════════════════════════════════

      # ── Sysselsättningsgrad ──

      # Totalt (andel)
      list(
        url = SCB_NATT_URL, kpi_id = "K_SYSS_TOT",
        query = list(
          Region = scb_regioner, Kon = c("1+2"), Alder = c("20-64"),
          Fodelseregion = c("tot"), ContentsCode = c("000006IK"),
          Tid = manadskoder
        ),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      # Totalt (antal)
      list(
        url = SCB_NATT_URL, kpi_id = "K_SYSS_ANT",
        query = list(
          Region = scb_regioner, Kon = c("1+2"), Alder = c("20-64"),
          Fodelseregion = c("tot"), ContentsCode = c("000006HI"),
          Tid = manadskoder
        ),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      # Inrikes födda (andel)
      list(
        url = SCB_NATT_URL, kpi_id = "K_SYSS_INR",
        query = list(
          Region = scb_regioner, Kon = c("1+2"), Alder = c("20-64"),
          Fodelseregion = c("in"), ContentsCode = c("000006IK"),
          Tid = manadskoder
        ),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      # Utrikes födda (andel)
      list(
        url = SCB_NATT_URL, kpi_id = "K_SYSS_UTR",
        query = list(
          Region = scb_regioner, Kon = c("1+2"), Alder = c("20-64"),
          Fodelseregion = c("ut"), ContentsCode = c("000006IK"),
          Tid = manadskoder
        ),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      # Kvinnor (andel)
      list(
        url = SCB_NATT_URL, kpi_id = "K_SYSS_KV",
        query = list(
          Region = scb_regioner, Kon = c("2"), Alder = c("20-64"),
          Fodelseregion = c("tot"), ContentsCode = c("000006IK"),
          Tid = manadskoder
        ),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      # Män (andel)
      list(
        url = SCB_NATT_URL, kpi_id = "K_SYSS_MAN",
        query = list(
          Region = scb_regioner, Kon = c("1"), Alder = c("20-64"),
          Fodelseregion = c("tot"), ContentsCode = c("000006IK"),
          Tid = manadskoder
        ),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),

      # ── Sysselsatta nattbefolkning 15–74 år ──

      # Antal sysselsatta 15–74 (nattbefolkning)
      list(
        url = SCB_NATT_URL, kpi_id = "K_NATT_ANT",
        query = list(
          Region = scb_regioner, Kon = c("1+2"), Alder = c("15-74"),
          Fodelseregion = c("tot"), ContentsCode = c("000006HI"),
          Tid = manadskoder
        ),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      # Sysselsättningsgrad 15–74 (nattbefolkning)
      list(
        url = SCB_NATT_URL, kpi_id = "K_NATT_GRAD",
        query = list(
          Region = scb_regioner, Kon = c("1+2"), Alder = c("15-74"),
          Fodelseregion = c("tot"), ContentsCode = c("000006IK"),
          Tid = manadskoder
        ),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),

      # ── Arbetslöshet ──

      # Totalt (andel)
      list(
        url = SCB_NATT_URL, kpi_id = "K_ARBL_TOT",
        query = list(
          Region = scb_regioner, Kon = c("1+2"), Alder = c("20-64"),
          Fodelseregion = c("tot"), ContentsCode = c("000006II"),
          Tid = manadskoder
        ),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      # Totalt (antal)
      list(
        url = SCB_NATT_URL, kpi_id = "K_ARBL_ANT",
        query = list(
          Region = scb_regioner, Kon = c("1+2"), Alder = c("20-64"),
          Fodelseregion = c("tot"), ContentsCode = c("000004YH"),
          Tid = manadskoder
        ),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      # Inrikes födda (andel)
      list(
        url = SCB_NATT_URL, kpi_id = "K_ARBL_INR",
        query = list(
          Region = scb_regioner, Kon = c("1+2"), Alder = c("20-64"),
          Fodelseregion = c("in"), ContentsCode = c("000006II"),
          Tid = manadskoder
        ),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      # Utrikes födda (andel)
      list(
        url = SCB_NATT_URL, kpi_id = "K_ARBL_UTR",
        query = list(
          Region = scb_regioner, Kon = c("1+2"), Alder = c("20-64"),
          Fodelseregion = c("ut"), ContentsCode = c("000006II"),
          Tid = manadskoder
        ),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      # Kvinnor (andel)
      list(
        url = SCB_NATT_URL, kpi_id = "K_ARBL_KV",
        query = list(
          Region = scb_regioner, Kon = c("2"), Alder = c("20-64"),
          Fodelseregion = c("tot"), ContentsCode = c("000006II"),
          Tid = manadskoder
        ),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      # Män (andel)
      list(
        url = SCB_NATT_URL, kpi_id = "K_ARBL_MAN",
        query = list(
          Region = scb_regioner, Kon = c("1"), Alder = c("20-64"),
          Fodelseregion = c("tot"), ContentsCode = c("000006II"),
          Tid = manadskoder
        ),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),

      # ── Arbetskraftsdeltagande ──

      # Totalt (andel)
      list(
        url = SCB_NATT_URL, kpi_id = "K_ARKR_TOT",
        query = list(
          Region = scb_regioner, Kon = c("1+2"), Alder = c("20-64"),
          Fodelseregion = c("tot"), ContentsCode = c("000006IJ"),
          Tid = manadskoder
        ),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      # Kvinnor (andel)
      list(
        url = SCB_NATT_URL, kpi_id = "K_ARKR_KV",
        query = list(
          Region = scb_regioner, Kon = c("2"), Alder = c("20-64"),
          Fodelseregion = c("tot"), ContentsCode = c("000006IJ"),
          Tid = manadskoder
        ),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      # Män (andel)
      list(
        url = SCB_NATT_URL, kpi_id = "K_ARKR_MAN",
        query = list(
          Region = scb_regioner, Kon = c("1"), Alder = c("20-64"),
          Fodelseregion = c("tot"), ContentsCode = c("000006IJ"),
          Tid = manadskoder
        ),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),

      # ══════════════════════════════════════════════
      # TABELL 2: ArbStDoNMNN (dagbefolkning/bransch)
      # ══════════════════════════════════════════════

      # Totalt alla branscher
      list(
        url = SCB_DAG_URL, kpi_id = "K_DAG_TOT",
        query = list(
          Region = scb_regioner, Kon = c("1+2"),
          `SNI2007` = c("A-U+US"), Fodelseregion = c("tot"),
          ContentsCode = c("0000054D"),
          Tid = manadskoder
        ),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      # Jordbruk, skogsbruk, fiske (A)
      list(
        url = SCB_DAG_URL, kpi_id = "K_DAG_JORD",
        query = list(
          Region = scb_regioner, Kon = c("1+2"),
          `SNI2007` = c("A"), Fodelseregion = c("tot"),
          ContentsCode = c("0000054D"),
          Tid = manadskoder
        ),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      # Tillverkning (B+C)
      list(
        url = SCB_DAG_URL, kpi_id = "K_DAG_IND",
        query = list(
          Region = scb_regioner, Kon = c("1+2"),
          `SNI2007` = c("B+C"), Fodelseregion = c("tot"),
          ContentsCode = c("0000054D"),
          Tid = manadskoder
        ),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      # Energi och miljö (D+E)
      list(
        url = SCB_DAG_URL, kpi_id = "K_DAG_ENMI",
        query = list(
          Region = scb_regioner, Kon = c("1+2"),
          `SNI2007` = c("D+E"), Fodelseregion = c("tot"),
          ContentsCode = c("0000054D"),
          Tid = manadskoder
        ),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      # Bygg (F)
      list(
        url = SCB_DAG_URL, kpi_id = "K_DAG_BYG",
        query = list(
          Region = scb_regioner, Kon = c("1+2"),
          `SNI2007` = c("F"), Fodelseregion = c("tot"),
          ContentsCode = c("0000054D"),
          Tid = manadskoder
        ),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      # Handel (G)
      list(
        url = SCB_DAG_URL, kpi_id = "K_DAG_HAND",
        query = list(
          Region = scb_regioner, Kon = c("1+2"),
          `SNI2007` = c("G"), Fodelseregion = c("tot"),
          ContentsCode = c("0000054D"),
          Tid = manadskoder
        ),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      # Transport (H)
      list(
        url = SCB_DAG_URL, kpi_id = "K_DAG_TRANS",
        query = list(
          Region = scb_regioner, Kon = c("1+2"),
          `SNI2007` = c("H"), Fodelseregion = c("tot"),
          ContentsCode = c("0000054D"),
          Tid = manadskoder
        ),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      # Hotell & restaurang (I)
      list(
        url = SCB_DAG_URL, kpi_id = "K_DAG_HOTEL",
        query = list(
          Region = scb_regioner, Kon = c("1+2"),
          `SNI2007` = c("I"), Fodelseregion = c("tot"),
          ContentsCode = c("0000054D"),
          Tid = manadskoder
        ),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      # IT och kommunikation (J)
      list(
        url = SCB_DAG_URL, kpi_id = "K_DAG_IT",
        query = list(
          Region = scb_regioner, Kon = c("1+2"),
          `SNI2007` = c("J"), Fodelseregion = c("tot"),
          ContentsCode = c("0000054D"),
          Tid = manadskoder
        ),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      # Finans och försäkring (K)
      list(
        url = SCB_DAG_URL, kpi_id = "K_DAG_FINANS",
        query = list(
          Region = scb_regioner, Kon = c("1+2"),
          `SNI2007` = c("K"), Fodelseregion = c("tot"),
          ContentsCode = c("0000054D"),
          Tid = manadskoder
        ),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      # Fastigheter (L)
      list(
        url = SCB_DAG_URL, kpi_id = "K_DAG_FAST",
        query = list(
          Region = scb_regioner, Kon = c("1+2"),
          `SNI2007` = c("L"), Fodelseregion = c("tot"),
          ContentsCode = c("0000054D"),
          Tid = manadskoder
        ),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      # Företagstjänster (M+N)
      list(
        url = SCB_DAG_URL, kpi_id = "K_DAG_FORETJ",
        query = list(
          Region = scb_regioner, Kon = c("1+2"),
          `SNI2007` = c("M+N"), Fodelseregion = c("tot"),
          ContentsCode = c("0000054D"),
          Tid = manadskoder
        ),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      # Offentlig förvaltning (O) — temp, summeras i bearbeta.R
      list(
        url = SCB_DAG_URL, kpi_id = "K_DAG_O_",
        query = list(
          Region = scb_regioner, Kon = c("1+2"),
          `SNI2007` = c("O"), Fodelseregion = c("tot"),
          ContentsCode = c("0000054D"),
          Tid = manadskoder
        ),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      # Utbildning (P) — temp, summeras i bearbeta.R
      list(
        url = SCB_DAG_URL, kpi_id = "K_DAG_P_",
        query = list(
          Region = scb_regioner, Kon = c("1+2"),
          `SNI2007` = c("P"), Fodelseregion = c("tot"),
          ContentsCode = c("0000054D"),
          Tid = manadskoder
        ),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      # Vård och omsorg (Q) — temp, summeras i bearbeta.R
      list(
        url = SCB_DAG_URL, kpi_id = "K_DAG_Q_",
        query = list(
          Region = scb_regioner, Kon = c("1+2"),
          `SNI2007` = c("Q"), Fodelseregion = c("tot"),
          ContentsCode = c("0000054D"),
          Tid = manadskoder
        ),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      # Kultur, nöje, fritid m.m. (R+S+T+U)
      list(
        url = SCB_DAG_URL, kpi_id = "K_DAG_KULT",
        query = list(
          Region = scb_regioner, Kon = c("1+2"),
          `SNI2007` = c("R+S+T+U"), Fodelseregion = c("tot"),
          ContentsCode = c("0000054D"),
          Tid = manadskoder
        ),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),

      # ══════════════════════════════════════════════
      # TABELL 3: ManadBefStatRegion (folkmängd per månad, gammal tabell)
      # ══════════════════════════════════════════════
      list(
        url = "https://api.scb.se/OV0104/v1/doris/sv/ssd/BE/BE0101/BE0101G/ManadBefStatRegion",
        kpi_id = "K_BEF_TOT_OLD",
        query = list(
          Region = scb_regioner, Kon = c("1+2"),
          Forandringar = c("100"),
          ContentsCode = c("000003KD"),
          Tid = generera_manadskoder(2020, 2024)
        ),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      # TABELL 4: MBefStatRegionCKM (folkmängd per månad, ny tabell fr.o.m. 2025)
      list(
        url = "https://api.scb.se/OV0104/v1/doris/sv/ssd/BE/BE0101/BE0101G/MBefStatRegionCKM",
        kpi_id = "K_BEF_TOT_NEW",
        query = list(
          Region = scb_regioner, Kon = c("TotSa"),
          Forandringar = c("100"),
          ContentsCode = c("000007SR"),
          Tid = generera_manadskoder(2025)
        ),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),

      # ══════════════════════════════════════════════
      # TABELL 5: LagenhetNyKv16 (påbörjade lägenheter, kvartal, alla kommuner)
      # ══════════════════════════════════════════════

      # Småhus
      list(
        url = "https://api.scb.se/OV0104/v1/doris/sv/ssd/START/BO/BO0101/BO0101C/LagenhetNyKv16",
        kpi_id = "K_BYGG_SMAHUS",
        query = list(
          Region = scb_regioner, Hustyp = c("SM\u00c5HUS"),
          ContentsCode = c("BO0101A4"),
          Tid = generera_kvartalskoder(2020)
        ),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      # Flerbostadshus
      list(
        url = "https://api.scb.se/OV0104/v1/doris/sv/ssd/START/BO/BO0101/BO0101C/LagenhetNyKv16",
        kpi_id = "K_BYGG_FLERBO",
        query = list(
          Region = scb_regioner, Hustyp = c("FLERBO"),
          ContentsCode = c("BO0101A4"),
          Tid = generera_kvartalskoder(2020)
        ),
        region_kolumn = "Region", ar_kolumn = "Tid"
      )
    ),

    # Sektioner för frontend
    sektioner = list(
      # ── Arbetsmarknad ──
      list(
        id = "nattbefolkning",
        namn = "Sysselsatta nattbefolkning 15\u201374 \u00e5r (prelim.)",
        kpi_ids = c("K_NATT_ANT"),
        undersektioner = list(
          list(namn = "Syssels\u00e4ttningsgrad", kpi_ids = c("K_NATT_GRAD"))
        )
      ),
      list(
        id = "sysselsattning",
        namn = "Syssels\u00e4ttningsgrad 20\u201364 \u00e5r (prelim.)",
        kpi_ids = c("K_SYSS_TOT"),
        undersektioner = list(
          list(namn = "F\u00f6delseregion", kpi_ids = c("K_SYSS_INR", "K_SYSS_UTR")),
          list(namn = "Kvinnor och m\u00e4n", kpi_ids = c("K_SYSS_KV", "K_SYSS_MAN"))
        )
      ),
      list(
        id = "arbetsloshet",
        namn = "Arbetsl\u00f6shet 20\u201364 \u00e5r (prelim.)",
        kpi_ids = c("K_ARBL_TOT"),
        undersektioner = list(
          list(namn = "F\u00f6delseregion", kpi_ids = c("K_ARBL_INR", "K_ARBL_UTR")),
          list(namn = "Kvinnor och m\u00e4n", kpi_ids = c("K_ARBL_KV", "K_ARBL_MAN"))
        )
      ),
      list(
        id = "arbetskraft",
        namn = "Arbetskraftsdeltagande 20\u201364 \u00e5r (prelim.)",
        kpi_ids = c("K_ARKR_TOT"),
        undersektioner = list(
          list(namn = "Kvinnor och m\u00e4n", kpi_ids = c("K_ARKR_KV", "K_ARKR_MAN"))
        )
      ),
      list(
        id = "arbetsmarknad-forandring",
        namn = "\u00c5rsf\u00f6r\u00e4ndring arbetsmarknad",
        kpi_ids = c("K_SYSS_FORANDR", "K_ARBL_FORANDR")
      ),
      # ── N\u00e4ringsliv (dagbefolkning) ──
      list(
        id = "dagbefolkning",
        namn = "Sysselsatta dagbefolkning 15\u201374 \u00e5r (prelim.)",
        kpi_ids = c("K_DAG_TOT"),
        undersektioner = list(
          list(namn = "Branscher", kpi_ids = c(
            "K_DAG_JORD", "K_DAG_IND", "K_DAG_ENMI", "K_DAG_BYG",
            "K_DAG_HAND", "K_DAG_TRANS", "K_DAG_HOTEL", "K_DAG_IT",
            "K_DAG_FINANS", "K_DAG_FAST", "K_DAG_FORETJ", "K_DAG_OFF",
            "K_DAG_KULT"
          ))
        )
      ),
      list(
        id = "naringsliv-forandring",
        namn = "\u00c5rsf\u00f6r\u00e4ndring dagbefolkning",
        kpi_ids = c("K_DAG_TILLVAXT")
      ),
      # ── Befolkningsutveckling ──
      list(
        id = "befolkning",
        namn = "Befolkningsutveckling",
        kpi_ids = c("K_BEF_TOT", "K_BEF_FORANDR")
      ),
      # ── G\u00e4stn\u00e4tter ──
      list(
        id = "gastnatter",
        namn = "G\u00e4stn\u00e4tter",
        kpi_ids = c("K_GAST_TOT"),
        undersektioner = list(
          list(namn = "Marknad", kpi_ids = c("K_GAST_SVE", "K_GAST_UTL", "K_ANDEL_UTL")),
          list(namn = "\u00c5rsf\u00f6r\u00e4ndring", kpi_ids = c("K_GAST_TILLVAXT"))
        )
      ),
      # ── Bostadsmarknad ──
      list(
        id = "byggnation",
        namn = "Bostadsmarknad",
        kpi_ids = c("K_BYGG_TOT"),
        undersektioner = list(
          list(namn = "Hustyp", kpi_ids = c("K_BYGG_SMAHUS", "K_BYGG_FLERBO"))
        )
      )
    ),

    # KPI-metadata
    kpi_meta = tribble(
      ~kpi_id,            ~enhet,           ~tema,          ~par_kpi_id,
      # Sysselsättningsgrad
      "K_SYSS_TOT",       "procent",        "konjunktur",   "K_SYSS_ANT",
      "K_SYSS_ANT",       "antal",          "konjunktur",   "K_SYSS_TOT",
      "K_SYSS_INR",       "procent",        "konjunktur",   NA_character_,
      "K_SYSS_UTR",       "procent",        "konjunktur",   NA_character_,
      "K_SYSS_KV",        "procent",        "konjunktur",   NA_character_,
      "K_SYSS_MAN",       "procent",        "konjunktur",   NA_character_,
      # Nattbefolkning 15–74
      "K_NATT_ANT",       "antal",          "konjunktur",   "K_NATT_GRAD",
      "K_NATT_GRAD",      "procent",        "konjunktur",   "K_NATT_ANT",
      # Arbetslöshet
      "K_ARBL_TOT",       "procent",        "konjunktur",   "K_ARBL_ANT",
      "K_ARBL_ANT",       "antal",          "konjunktur",   "K_ARBL_TOT",
      "K_ARBL_INR",       "procent",        "konjunktur",   NA_character_,
      "K_ARBL_UTR",       "procent",        "konjunktur",   NA_character_,
      "K_ARBL_KV",        "procent",        "konjunktur",   NA_character_,
      "K_ARBL_MAN",       "procent",        "konjunktur",   NA_character_,
      # Arbetskraftsdeltagande
      "K_ARKR_TOT",       "procent",        "konjunktur",   NA_character_,
      "K_ARKR_KV",        "procent",        "konjunktur",   NA_character_,
      "K_ARKR_MAN",       "procent",        "konjunktur",   NA_character_,
      # Dagbefolkning
      "K_DAG_TOT",        "antal",          "konjunktur",   NA_character_,
      "K_DAG_JORD",       "antal",          "konjunktur",   NA_character_,
      "K_DAG_IND",        "antal",          "konjunktur",   NA_character_,
      "K_DAG_ENMI",       "antal",          "konjunktur",   NA_character_,
      "K_DAG_BYG",        "antal",          "konjunktur",   NA_character_,
      "K_DAG_HAND",       "antal",          "konjunktur",   NA_character_,
      "K_DAG_TRANS",      "antal",          "konjunktur",   NA_character_,
      "K_DAG_HOTEL",      "antal",          "konjunktur",   NA_character_,
      "K_DAG_IT",         "antal",          "konjunktur",   NA_character_,
      "K_DAG_FINANS",     "antal",          "konjunktur",   NA_character_,
      "K_DAG_FAST",       "antal",          "konjunktur",   NA_character_,
      "K_DAG_FORETJ",     "antal",          "konjunktur",   NA_character_,
      "K_DAG_OFF",        "antal",          "konjunktur",   NA_character_,
      "K_DAG_KULT",       "antal",          "konjunktur",   NA_character_,
      # Temp-KPI:er för O+P+Q — tas bort i bearbeta.R
      "K_DAG_O_",         "antal",          "konjunktur",   NA_character_,
      "K_DAG_P_",         "antal",          "konjunktur",   NA_character_,
      "K_DAG_Q_",         "antal",          "konjunktur",   NA_character_,
      # Förändring mot föregående år
      "K_SYSS_FORANDR",   "procentenheter", "konjunktur",   NA_character_,
      "K_ARBL_FORANDR",   "procentenheter", "konjunktur",   NA_character_,
      "K_DAG_TILLVAXT",   "procent",        "konjunktur",   NA_character_,
      # Turism (gästnätter)
      "K_GAST_TOT",       "antal",          "konjunktur",   NA_character_,
      "K_GAST_SVE",       "antal",          "konjunktur",   NA_character_,
      "K_GAST_UTL",       "antal",          "konjunktur",   NA_character_,
      "K_ANDEL_UTL",      "procent",        "konjunktur",   NA_character_,
      "K_GAST_TILLVAXT",  "procent",        "konjunktur",   NA_character_,
      # Befolkning
      "K_BEF_TOT",        "antal",          "konjunktur",   NA_character_,
      "K_BEF_TOT_OLD",    "antal",          "konjunktur",   NA_character_,
      "K_BEF_TOT_NEW",    "antal",          "konjunktur",   NA_character_,
      "K_BEF_FORANDR",    "antal",          "konjunktur",   NA_character_,
      # Byggnation
      "K_BYGG_TOT",       "antal",          "konjunktur",   NA_character_,
      "K_BYGG_SMAHUS",    "antal",          "konjunktur",   NA_character_,
      "K_BYGG_FLERBO",    "antal",          "konjunktur",   NA_character_
    ),

    # Beräknade KPI:er — beskrivningar
    beraknade_kpier = tribble(
      ~kpi_id,            ~kpi_namn,                                              ~beskrivning,
      # Sysselsättningsgrad
      "K_SYSS_TOT",       "Sysselsättningsgrad (prelim.)",                        "Andel sysselsatta av befolkningen 20–64 år. Prelimin\u00e4r statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 m\u00e5natliga administrativa uppgifter och publiceras med cirka sex m\u00e5naders efters\u00e4lpning. Syssels\u00e4ttningen tenderar att underskattas n\u00e5got j\u00e4mf\u00f6rt med den slutliga statistiken, men utvecklingen \u00f6ver tid st\u00e4mmer v\u00e4l \u00f6verens.",
      "K_SYSS_ANT",       "Antal sysselsatta (prelim.)",                          "Antal sysselsatta 20–64 år. Prelimin\u00e4r statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 m\u00e5natliga administrativa uppgifter och publiceras med cirka sex m\u00e5naders efters\u00e4lpning. Syssels\u00e4ttningen tenderar att underskattas n\u00e5got j\u00e4mf\u00f6rt med den slutliga statistiken, men utvecklingen \u00f6ver tid st\u00e4mmer v\u00e4l \u00f6verens.",
      "K_SYSS_INR",       "Sysselsättningsgrad, inrikes födda (prelim.)",         "Andel sysselsatta bland inrikes födda 20–64 år. Prelimin\u00e4r statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 m\u00e5natliga administrativa uppgifter och publiceras med cirka sex m\u00e5naders efters\u00e4lpning. Syssels\u00e4ttningen tenderar att underskattas n\u00e5got j\u00e4mf\u00f6rt med den slutliga statistiken, men utvecklingen \u00f6ver tid st\u00e4mmer v\u00e4l \u00f6verens.",
      "K_SYSS_UTR",       "Sysselsättningsgrad, utrikes födda (prelim.)",         "Andel sysselsatta bland utrikes födda 20–64 år. Prelimin\u00e4r statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 m\u00e5natliga administrativa uppgifter och publiceras med cirka sex m\u00e5naders efters\u00e4lpning. Syssels\u00e4ttningen tenderar att underskattas n\u00e5got j\u00e4mf\u00f6rt med den slutliga statistiken, men utvecklingen \u00f6ver tid st\u00e4mmer v\u00e4l \u00f6verens.",
      "K_SYSS_KV",        "Sysselsättningsgrad, kvinnor (prelim.)",               "Andel sysselsatta kvinnor 20–64 år. Prelimin\u00e4r statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 m\u00e5natliga administrativa uppgifter och publiceras med cirka sex m\u00e5naders efters\u00e4lpning. Syssels\u00e4ttningen tenderar att underskattas n\u00e5got j\u00e4mf\u00f6rt med den slutliga statistiken, men utvecklingen \u00f6ver tid st\u00e4mmer v\u00e4l \u00f6verens.",
      "K_SYSS_MAN",       "Sysselsättningsgrad, män (prelim.)",                   "Andel sysselsatta män 20–64 år. Prelimin\u00e4r statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 m\u00e5natliga administrativa uppgifter och publiceras med cirka sex m\u00e5naders efters\u00e4lpning. Syssels\u00e4ttningen tenderar att underskattas n\u00e5got j\u00e4mf\u00f6rt med den slutliga statistiken, men utvecklingen \u00f6ver tid st\u00e4mmer v\u00e4l \u00f6verens.",
      # Nattbefolkning 15–74
      "K_NATT_ANT",       "Sysselsatta nattbefolkning 15\u201374 \u00e5r, antal (prelim.)",  "Antal sysselsatta i \u00e5ldern 15\u201374 \u00e5r, nattbefolkning (boende i kommunen). Prelimin\u00e4r statistik fr\u00e5n SCB BAS.",
      "K_NATT_GRAD",      "Syssels\u00e4ttningsgrad 15\u201374 \u00e5r (prelim.)",            "Andel sysselsatta av befolkningen 15\u201374 \u00e5r, nattbefolkning. Prelimin\u00e4r statistik fr\u00e5n SCB BAS.",
      # Arbetslöshet
      "K_ARBL_TOT",       "Arbetslöshetsgrad (prelim.)",                          "Andel arbetslösa av arbetskraften 20–64 år. Prelimin\u00e4r statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 m\u00e5natliga administrativa uppgifter och publiceras med cirka sex m\u00e5naders efters\u00e4lpning. Syssels\u00e4ttningen tenderar att underskattas n\u00e5got j\u00e4mf\u00f6rt med den slutliga statistiken, men utvecklingen \u00f6ver tid st\u00e4mmer v\u00e4l \u00f6verens.",
      "K_ARBL_ANT",       "Antal arbetslösa (prelim.)",                           "Antal arbetslösa 20–64 år. Prelimin\u00e4r statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 m\u00e5natliga administrativa uppgifter och publiceras med cirka sex m\u00e5naders efters\u00e4lpning. Syssels\u00e4ttningen tenderar att underskattas n\u00e5got j\u00e4mf\u00f6rt med den slutliga statistiken, men utvecklingen \u00f6ver tid st\u00e4mmer v\u00e4l \u00f6verens.",
      "K_ARBL_INR",       "Arbetslöshetsgrad, inrikes födda (prelim.)",           "Andel arbetslösa av arbetskraften bland inrikes födda 20–64 år. Prelimin\u00e4r statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 m\u00e5natliga administrativa uppgifter och publiceras med cirka sex m\u00e5naders efters\u00e4lpning. Syssels\u00e4ttningen tenderar att underskattas n\u00e5got j\u00e4mf\u00f6rt med den slutliga statistiken, men utvecklingen \u00f6ver tid st\u00e4mmer v\u00e4l \u00f6verens.",
      "K_ARBL_UTR",       "Arbetslöshetsgrad, utrikes födda (prelim.)",           "Andel arbetslösa av arbetskraften bland utrikes födda 20–64 år. Prelimin\u00e4r statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 m\u00e5natliga administrativa uppgifter och publiceras med cirka sex m\u00e5naders efters\u00e4lpning. Syssels\u00e4ttningen tenderar att underskattas n\u00e5got j\u00e4mf\u00f6rt med den slutliga statistiken, men utvecklingen \u00f6ver tid st\u00e4mmer v\u00e4l \u00f6verens.",
      "K_ARBL_KV",        "Arbetslöshetsgrad, kvinnor (prelim.)",                 "Andel arbetslösa kvinnor av arbetskraften 20–64 år. Prelimin\u00e4r statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 m\u00e5natliga administrativa uppgifter och publiceras med cirka sex m\u00e5naders efters\u00e4lpning. Syssels\u00e4ttningen tenderar att underskattas n\u00e5got j\u00e4mf\u00f6rt med den slutliga statistiken, men utvecklingen \u00f6ver tid st\u00e4mmer v\u00e4l \u00f6verens.",
      "K_ARBL_MAN",       "Arbetslöshetsgrad, män (prelim.)",                     "Andel arbetslösa män av arbetskraften 20–64 år. Prelimin\u00e4r statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 m\u00e5natliga administrativa uppgifter och publiceras med cirka sex m\u00e5naders efters\u00e4lpning. Syssels\u00e4ttningen tenderar att underskattas n\u00e5got j\u00e4mf\u00f6rt med den slutliga statistiken, men utvecklingen \u00f6ver tid st\u00e4mmer v\u00e4l \u00f6verens.",
      # Arbetskraftsdeltagande
      "K_ARKR_TOT",       "Arbetskraftsdeltagande (prelim.)",                     "Andel av befolkningen 20–64 år i arbetskraften. Prelimin\u00e4r statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 m\u00e5natliga administrativa uppgifter och publiceras med cirka sex m\u00e5naders efters\u00e4lpning. Syssels\u00e4ttningen tenderar att underskattas n\u00e5got j\u00e4mf\u00f6rt med den slutliga statistiken, men utvecklingen \u00f6ver tid st\u00e4mmer v\u00e4l \u00f6verens.",
      "K_ARKR_KV",        "Arbetskraftsdeltagande, kvinnor (prelim.)",            "Andel kvinnor 20–64 år i arbetskraften. Prelimin\u00e4r statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 m\u00e5natliga administrativa uppgifter och publiceras med cirka sex m\u00e5naders efters\u00e4lpning. Syssels\u00e4ttningen tenderar att underskattas n\u00e5got j\u00e4mf\u00f6rt med den slutliga statistiken, men utvecklingen \u00f6ver tid st\u00e4mmer v\u00e4l \u00f6verens.",
      "K_ARKR_MAN",       "Arbetskraftsdeltagande, män (prelim.)",                "Andel män 20–64 år i arbetskraften. Prelimin\u00e4r statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 m\u00e5natliga administrativa uppgifter och publiceras med cirka sex m\u00e5naders efters\u00e4lpning. Syssels\u00e4ttningen tenderar att underskattas n\u00e5got j\u00e4mf\u00f6rt med den slutliga statistiken, men utvecklingen \u00f6ver tid st\u00e4mmer v\u00e4l \u00f6verens.",
      # Dagbefolkning
      "K_DAG_TOT",        "Sysselsatta dagbefolkning (prelim.)",                  "Antal sysselsatta efter arbetsställets kommun, alla branscher. Prelimin\u00e4r statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 m\u00e5natliga administrativa uppgifter och publiceras med cirka sex m\u00e5naders efters\u00e4lpning. Syssels\u00e4ttningen tenderar att underskattas n\u00e5got j\u00e4mf\u00f6rt med den slutliga statistiken, men utvecklingen \u00f6ver tid st\u00e4mmer v\u00e4l \u00f6verens.",
      "K_DAG_JORD",       "Sysselsatta, jordbruk m.m. (prelim.)",                 "Antal sysselsatta inom jordbruk, skogsbruk och fiske (SNI A) efter arbetsställets kommun. Prelimin\u00e4r statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 m\u00e5natliga administrativa uppgifter och publiceras med cirka sex m\u00e5naders efters\u00e4lpning. Syssels\u00e4ttningen tenderar att underskattas n\u00e5got j\u00e4mf\u00f6rt med den slutliga statistiken, men utvecklingen \u00f6ver tid st\u00e4mmer v\u00e4l \u00f6verens.",
      "K_DAG_IND",        "Sysselsatta, tillverkning (prelim.)",                  "Antal sysselsatta inom tillverkning (SNI B+C) efter arbetsställets kommun. Prelimin\u00e4r statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 m\u00e5natliga administrativa uppgifter och publiceras med cirka sex m\u00e5naders efters\u00e4lpning. Syssels\u00e4ttningen tenderar att underskattas n\u00e5got j\u00e4mf\u00f6rt med den slutliga statistiken, men utvecklingen \u00f6ver tid st\u00e4mmer v\u00e4l \u00f6verens.",
      "K_DAG_ENMI",       "Sysselsatta, energi och miljö (prelim.)",              "Antal sysselsatta inom energi och miljö (SNI D+E) efter arbetsställets kommun. Prelimin\u00e4r statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 m\u00e5natliga administrativa uppgifter och publiceras med cirka sex m\u00e5naders efters\u00e4lpning. Syssels\u00e4ttningen tenderar att underskattas n\u00e5got j\u00e4mf\u00f6rt med den slutliga statistiken, men utvecklingen \u00f6ver tid st\u00e4mmer v\u00e4l \u00f6verens.",
      "K_DAG_BYG",        "Sysselsatta, bygg (prelim.)",                          "Antal sysselsatta inom byggindustrin (SNI F) efter arbetsställets kommun. Prelimin\u00e4r statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 m\u00e5natliga administrativa uppgifter och publiceras med cirka sex m\u00e5naders efters\u00e4lpning. Syssels\u00e4ttningen tenderar att underskattas n\u00e5got j\u00e4mf\u00f6rt med den slutliga statistiken, men utvecklingen \u00f6ver tid st\u00e4mmer v\u00e4l \u00f6verens.",
      "K_DAG_HAND",       "Sysselsatta, handel (prelim.)",                        "Antal sysselsatta inom handel (SNI G) efter arbetsställets kommun. Prelimin\u00e4r statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 m\u00e5natliga administrativa uppgifter och publiceras med cirka sex m\u00e5naders efters\u00e4lpning. Syssels\u00e4ttningen tenderar att underskattas n\u00e5got j\u00e4mf\u00f6rt med den slutliga statistiken, men utvecklingen \u00f6ver tid st\u00e4mmer v\u00e4l \u00f6verens.",
      "K_DAG_TRANS",      "Sysselsatta, transport (prelim.)",                     "Antal sysselsatta inom transport (SNI H) efter arbetsställets kommun. Prelimin\u00e4r statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 m\u00e5natliga administrativa uppgifter och publiceras med cirka sex m\u00e5naders efters\u00e4lpning. Syssels\u00e4ttningen tenderar att underskattas n\u00e5got j\u00e4mf\u00f6rt med den slutliga statistiken, men utvecklingen \u00f6ver tid st\u00e4mmer v\u00e4l \u00f6verens.",
      "K_DAG_HOTEL",      "Sysselsatta, hotell & restaurang (prelim.)",           "Antal sysselsatta inom hotell och restaurang (SNI I) efter arbetsställets kommun. Prelimin\u00e4r statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 m\u00e5natliga administrativa uppgifter och publiceras med cirka sex m\u00e5naders efters\u00e4lpning. Syssels\u00e4ttningen tenderar att underskattas n\u00e5got j\u00e4mf\u00f6rt med den slutliga statistiken, men utvecklingen \u00f6ver tid st\u00e4mmer v\u00e4l \u00f6verens.",
      "K_DAG_IT",         "Sysselsatta, IT och kommunikation (prelim.)",          "Antal sysselsatta inom IT och kommunikation (SNI J) efter arbetsställets kommun. Prelimin\u00e4r statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 m\u00e5natliga administrativa uppgifter och publiceras med cirka sex m\u00e5naders efters\u00e4lpning. Syssels\u00e4ttningen tenderar att underskattas n\u00e5got j\u00e4mf\u00f6rt med den slutliga statistiken, men utvecklingen \u00f6ver tid st\u00e4mmer v\u00e4l \u00f6verens.",
      "K_DAG_FINANS",     "Sysselsatta, finans och försäkring (prelim.)",         "Antal sysselsatta inom finans och försäkring (SNI K) efter arbetsställets kommun. Prelimin\u00e4r statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 m\u00e5natliga administrativa uppgifter och publiceras med cirka sex m\u00e5naders efters\u00e4lpning. Syssels\u00e4ttningen tenderar att underskattas n\u00e5got j\u00e4mf\u00f6rt med den slutliga statistiken, men utvecklingen \u00f6ver tid st\u00e4mmer v\u00e4l \u00f6verens.",
      "K_DAG_FAST",       "Sysselsatta, fastigheter (prelim.)",                   "Antal sysselsatta inom fastighetsverksamhet (SNI L) efter arbetsställets kommun. Prelimin\u00e4r statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 m\u00e5natliga administrativa uppgifter och publiceras med cirka sex m\u00e5naders efters\u00e4lpning. Syssels\u00e4ttningen tenderar att underskattas n\u00e5got j\u00e4mf\u00f6rt med den slutliga statistiken, men utvecklingen \u00f6ver tid st\u00e4mmer v\u00e4l \u00f6verens.",
      "K_DAG_FORETJ",     "Sysselsatta, företagstjänster (prelim.)",              "Antal sysselsatta inom företagstjänster (SNI M+N) efter arbetsställets kommun. Prelimin\u00e4r statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 m\u00e5natliga administrativa uppgifter och publiceras med cirka sex m\u00e5naders efters\u00e4lpning. Syssels\u00e4ttningen tenderar att underskattas n\u00e5got j\u00e4mf\u00f6rt med den slutliga statistiken, men utvecklingen \u00f6ver tid st\u00e4mmer v\u00e4l \u00f6verens.",
      "K_DAG_OFF",        "Sysselsatta, offentlig sektor (prelim.)",              "Antal sysselsatta inom offentlig förvaltning, utbildning och vård (SNI O+P+Q) efter arbetsställets kommun. Prelimin\u00e4r statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 m\u00e5natliga administrativa uppgifter och publiceras med cirka sex m\u00e5naders efters\u00e4lpning. Syssels\u00e4ttningen tenderar att underskattas n\u00e5got j\u00e4mf\u00f6rt med den slutliga statistiken, men utvecklingen \u00f6ver tid st\u00e4mmer v\u00e4l \u00f6verens.",
      "K_DAG_KULT",       "Sysselsatta, kultur m.m. (prelim.)",                   "Antal sysselsatta inom kultur, nöje, fritid m.m. (SNI R+S+T+U) efter arbetsställets kommun. Prelimin\u00e4r statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 m\u00e5natliga administrativa uppgifter och publiceras med cirka sex m\u00e5naders efters\u00e4lpning. Syssels\u00e4ttningen tenderar att underskattas n\u00e5got j\u00e4mf\u00f6rt med den slutliga statistiken, men utvecklingen \u00f6ver tid st\u00e4mmer v\u00e4l \u00f6verens.",
      # Förändring mot föregående år
      "K_SYSS_FORANDR",   "Sysselsättningsgrad, årsförändring (procentenheter)",   "Förändring i procentenheter mot samma månad föregående år. Prelimin\u00e4r statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 m\u00e5natliga administrativa uppgifter och publiceras med cirka sex m\u00e5naders efters\u00e4lpning. Syssels\u00e4ttningen tenderar att underskattas n\u00e5got j\u00e4mf\u00f6rt med den slutliga statistiken, men utvecklingen \u00f6ver tid st\u00e4mmer v\u00e4l \u00f6verens.",
      "K_ARBL_FORANDR",   "Arbetslöshet, årsförändring (procentenheter)",          "Förändring i procentenheter mot samma månad föregående år. Prelimin\u00e4r statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 m\u00e5natliga administrativa uppgifter och publiceras med cirka sex m\u00e5naders efters\u00e4lpning. Syssels\u00e4ttningen tenderar att underskattas n\u00e5got j\u00e4mf\u00f6rt med den slutliga statistiken, men utvecklingen \u00f6ver tid st\u00e4mmer v\u00e4l \u00f6verens.",
      # Befolkning
      "K_BEF_TOT",        "Folkmängd (prelim.)",                                     "Folkmängd per kommun och månad. Preliminär statistik från SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras på månatliga administrativa uppgifter och publiceras med cirka sex månaders eftersläpning. Sysselsättningen tenderar att underskattas något jämfört med den slutliga statistiken, men utvecklingen över tid stämmer väl överens.",
      "K_BEF_FORANDR",    "Befolkningsförändring mot samma månad fg. år",             "Absolut förändring i folkmängd jämfört med samma månad föregående år. Preliminär statistik från SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras på månatliga administrativa uppgifter och publiceras med cirka sex månaders eftersläpning. Sysselsättningen tenderar att underskattas något jämfört med den slutliga statistiken, men utvecklingen över tid stämmer väl överens.",
      "K_DAG_TILLVAXT",   "Dagbefolkning, årsförändring (procent)",               "Procentuell förändring i antal sysselsatta dagbefolkning mot samma månad f\u00f6reg\u00e5ende \u00e5r. Prelimin\u00e4r statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 m\u00e5natliga administrativa uppgifter och publiceras med cirka sex m\u00e5naders efters\u00e4lpning. Syssels\u00e4ttningen tenderar att underskattas n\u00e5got j\u00e4mf\u00f6rt med den slutliga statistiken, men utvecklingen \u00f6ver tid st\u00e4mmer v\u00e4l \u00f6verens.",
      # Turism (gästnätter)
      "K_GAST_TOT",       "Gästnätter totalt (prelim.)",                             "Antal gästnätter på samtliga inkvarteringsanläggningar. Källa: Tillväxtverkets inkvarteringsstatistik.",
      "K_GAST_SVE",       "Gästnätter svenska gäster",                               "Antal gästnätter av svenska gäster. Källa: Tillväxtverkets inkvarteringsstatistik.",
      "K_GAST_UTL",       "Gästnätter utländska gäster",                             "Antal gästnätter av utländska gäster. Källa: Tillväxtverkets inkvarteringsstatistik.",
      "K_ANDEL_UTL",      "Andel utländska gästnätter (%)",                          "Andel utländska gästnätter av totala gästnätter. Källa: Tillväxtverkets inkvarteringsstatistik.",
      "K_GAST_TILLVAXT",  "Gästnätter, årsförändring (%)",                           "Procentuell förändring i antal gästnätter mot samma månad föregående år. Källa: Tillväxtverkets inkvarteringsstatistik.",
      # Byggnation (kvartal)
      "K_BYGG_TOT",       "P\u00e5b\u00f6rjade l\u00e4genheter, alla hustyper (kvartal)",   "Antal p\u00e5b\u00f6rjade l\u00e4genheter i nybyggda hus per kvartal. K\u00e4lla: SCB BO0101.",
      "K_BYGG_SMAHUS",    "P\u00e5b\u00f6rjade l\u00e4genheter, sm\u00e5hus (kvartal)",     "Antal p\u00e5b\u00f6rjade l\u00e4genheter i nybyggda sm\u00e5hus per kvartal. K\u00e4lla: SCB BO0101.",
      "K_BYGG_FLERBO",    "P\u00e5b\u00f6rjade l\u00e4genheter, flerbostadshus (kvartal)",  "Antal p\u00e5b\u00f6rjade l\u00e4genheter i nybyggda flerbostadshus per kvartal. K\u00e4lla: SCB BO0101."
    ),

    # Inga beräknade antal-KPI:er (hanteras direkt)
    berakna_antal = list(),

    # Visningsnamn för frontend
    visningsnamn = list(
      "K_SYSS_TOT"       = "Sysselsatta bland befolkningen 20\u201364 \u00e5r, andel (%) (prelim.)",
      "K_SYSS_ANT"       = "Sysselsatta i befolkningen 20\u201364 \u00e5r, antal (prelim.)",
      "K_SYSS_INR"       = "Sysselsatta bland inrikes f\u00f6dda 20\u201364 \u00e5r, andel (%) (prelim.)",
      "K_SYSS_UTR"       = "Sysselsatta bland utrikes f\u00f6dda 20\u201364 \u00e5r, andel (%) (prelim.)",
      "K_SYSS_KV"        = "Sysselsatta bland kvinnor 20\u201364 \u00e5r, andel (%) (prelim.)",
      "K_SYSS_MAN"       = "Sysselsatta bland m\u00e4n 20\u201364 \u00e5r, andel (%) (prelim.)",

      "K_NATT_ANT"       = "Sysselsatta nattbefolkning 15\u201374 \u00e5r, antal (prelim.)",
      "K_NATT_GRAD"      = "Syssels\u00e4ttningsgrad 15\u201374 \u00e5r (prelim.)",

      "K_ARBL_TOT"       = "Arbetsl\u00f6sa i arbetskraften 20\u201364 \u00e5r, andel (%) (prelim.)",
      "K_ARBL_ANT"       = "Arbetsl\u00f6sa i arbetskraften 20\u201364 \u00e5r, antal (prelim.)",
      "K_ARBL_INR"       = "Arbetsl\u00f6sa bland inrikes f\u00f6dda 20\u201364 \u00e5r, andel (%) (prelim.)",
      "K_ARBL_UTR"       = "Arbetsl\u00f6sa bland utrikes f\u00f6dda 20\u201364 \u00e5r, andel (%) (prelim.)",
      "K_ARBL_KV"        = "Arbetsl\u00f6sa bland kvinnor 20\u201364 \u00e5r, andel (%) (prelim.)",
      "K_ARBL_MAN"       = "Arbetsl\u00f6sa bland m\u00e4n 20\u201364 \u00e5r, andel (%) (prelim.)",

      "K_ARKR_TOT"       = "I arbetskraften bland befolkningen 20\u201364 \u00e5r, andel (%) (prelim.)",
      "K_ARKR_KV"        = "I arbetskraften bland kvinnor 20\u201364 \u00e5r, andel (%) (prelim.)",
      "K_ARKR_MAN"       = "I arbetskraften bland m\u00e4n 20\u201364 \u00e5r, andel (%) (prelim.)",

      "K_DAG_TOT"        = "Sysselsatta dagbefolkning 15\u201374 \u00e5r, antal (prelim.)",
      "K_DAG_JORD"       = "Sysselsatta inom jordbruk och skogsbruk (prelim.)",
      "K_DAG_IND"        = "Sysselsatta inom tillverkning (prelim.)",
      "K_DAG_ENMI"       = "Sysselsatta inom energi och milj\u00f6 (prelim.)",
      "K_DAG_BYG"        = "Sysselsatta inom byggverksamhet (prelim.)",
      "K_DAG_HAND"       = "Sysselsatta inom handel (prelim.)",
      "K_DAG_TRANS"      = "Sysselsatta inom transport (prelim.)",
      "K_DAG_HOTEL"      = "Sysselsatta inom hotell och restaurang (prelim.)",
      "K_DAG_IT"         = "Sysselsatta inom IT och kommunikation (prelim.)",
      "K_DAG_FINANS"     = "Sysselsatta inom finans och f\u00f6rs\u00e4kring (prelim.)",
      "K_DAG_FAST"       = "Sysselsatta inom fastighetsverksamhet (prelim.)",
      "K_DAG_FORETJ"     = "Sysselsatta inom f\u00f6retagstj\u00e4nster (prelim.)",
      "K_DAG_OFF"        = "Sysselsatta inom offentlig sektor (prelim.)",
      "K_DAG_KULT"       = "Sysselsatta inom kultur, n\u00f6je och fritid (prelim.)",

      "K_SYSS_FORANDR"   = "Syssels\u00e4ttningsgrad, \u00e5rsf\u00f6r\u00e4ndring (procentenheter)",
      "K_ARBL_FORANDR"   = "Arbetsl\u00f6shet, \u00e5rsf\u00f6r\u00e4ndring (procentenheter)",
      "K_GAST_TOT"       = "Gästnätter totalt (prelim.)",
      "K_GAST_SVE"       = "Gästnätter svenska gäster",
      "K_GAST_UTL"       = "Gästnätter utländska gäster",
      "K_ANDEL_UTL"      = "Andel utländska gästnätter (%)",
      "K_GAST_TILLVAXT"  = "Gästnätter, årsförändring (%)",
      "K_DAG_TILLVAXT"   = "Dagbefolkning, \u00e5rsf\u00f6r\u00e4ndring (procent)",

      "K_BEF_TOT"        = "Folkmängd (prelim.)",
      "K_BEF_FORANDR"    = "Befolkningsförändring mot samma månad fg. år",

      "K_BYGG_TOT"       = "P\u00e5b\u00f6rjade l\u00e4genheter, alla hustyper (kvartal)",
      "K_BYGG_SMAHUS"    = "P\u00e5b\u00f6rjade l\u00e4genheter, sm\u00e5hus (kvartal)",
      "K_BYGG_FLERBO"    = "P\u00e5b\u00f6rjade l\u00e4genheter, flerbostadshus (kvartal)"
    )
  )
}
