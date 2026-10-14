# teman/konjunktur/config.R — Konjunktur (preliminär månadsstatistik)
# Källa: SCB tabeller ArbStatusM (nattbefolkning) och ArbStDoNMNN (dagbefolkning)
# Åldersgrupp: 20–64 år
# Data publiceras månadsvis, normalt två månader efter månadens slut (SCB:s
# kvalitetsdeklaration för preliminär BAS 2026, avsnitt 3.1).
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

  # ── Gemensamma delar av beskrivningarna (beraknade_kpier nedan) ──
  # Bygger på källornas egna texter, kontrollerade 2026-10-14:
  #   BAS: SCB:s kvalitetsdeklaration "Preliminär statistik baserad på månatliga uppgifter" 2026
  #        (avsnitt 1.2, 2.3, 3.1) och "Skillnader mellan preliminär och slutlig statistik från BAS".
  #   Befolkning: fotnoterna i TAB1625/TAB6473 och kvalitetsdeklarationen BE0101 2026 (röjandekontroll).
  #   Bostadsbyggande: fotnoterna i TAB4572 och kvalitetsdeklarationen BO0101 2026.
  #   Gästnätter: Tillväxtverkets sida om inkvarteringsstatistiken (frågor och svar).
  # Källa-delen får inte innehålla punkt före slutet: frontend (utils/kalla.ts) läser fram till första punkten.
  bas_prel <- paste(
    "Statistiken är preliminär: den bygger på månatliga administrativa uppgifter och redovisas normalt två månader efter månadens slut.",
    "SCB:s slutliga statistik, där fler personer räknas som företagare, kommer i november året efter."
  )
  kalla_natt <- "Källa: SCB, Befolkningens arbetsmarknadsstatus (BAS), tabell TAB6260 Arbetsmarknadsstatus efter region, kön, ålder och födelseregion."
  kalla_dag  <- "Källa: SCB, Befolkningens arbetsmarknadsstatus (BAS), tabell TAB3784 Sysselsatta 15–74 år efter region, kön, näringsgren (SNI 2007) och födelseregion."
  # Text för en bransch i dagbefolkningen (SCB:s egen benämning av näringsgrenen)
  dag_bransch <- function(sni) paste0(
    "Antal sysselsatta 15–74 år vars huvudsakliga arbetsställe ligger i kommunen, inom ", sni,
    if (grepl("\\.$", sni)) " " else ". ",
    bas_prel, " ", kalla_dag
  )
  kalla_bef  <- "Källa: SCB, Befolkningsstatistik, tabellerna Befolkningsstatistik efter region och kön, månad (TAB1625 för 2020–2024 och TAB6473 från 2025)."
  kalla_bygg <- "Källa: SCB, Bygglov, nybyggnad och ombyggnad, tabell TAB4572 Lägenheter i nybyggda hus efter region och hustyp."
  bygg_prel  <- "Uppgifterna är preliminära och underskattade för de senaste kvartalen eftersom rapporteringen släpar efter, och äldre kvartal revideras vid varje ny publicering."
  gast_prel  <- "Uppgifterna är preliminära tills den slutliga statistiken publiceras i mars året efter; fram till dess kan anläggningarna revidera sina uppgifter."
  kalla_gast <- "Källa: Tillväxtverkets inkvarteringsstatistik."

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
          Region = scb_regioner, Hustyp = c("SMÅHUS"),
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
        namn = "Sysselsatta som bor i kommunen, 15–74 år (prelim.)",
        kpi_ids = c("K_NATT_ANT"),
        undersektioner = list(
          list(namn = "Sysselsättningsgrad", kpi_ids = c("K_NATT_GRAD"))
        )
      ),
      list(
        id = "sysselsattning",
        namn = "Sysselsättningsgrad 20–64 år (prelim.)",
        kpi_ids = c("K_SYSS_TOT"),
        undersektioner = list(
          list(namn = "Födelseregion", kpi_ids = c("K_SYSS_INR", "K_SYSS_UTR")),
          list(namn = "Kvinnor och män", kpi_ids = c("K_SYSS_KV", "K_SYSS_MAN"))
        )
      ),
      list(
        id = "arbetsloshet",
        namn = "Arbetslöshet 20–64 år (prelim.)",
        kpi_ids = c("K_ARBL_TOT"),
        undersektioner = list(
          list(namn = "Födelseregion", kpi_ids = c("K_ARBL_INR", "K_ARBL_UTR")),
          list(namn = "Kvinnor och män", kpi_ids = c("K_ARBL_KV", "K_ARBL_MAN"))
        )
      ),
      list(
        id = "arbetskraft",
        namn = "Arbetskraftsdeltagande 20–64 år (prelim.)",
        kpi_ids = c("K_ARKR_TOT"),
        undersektioner = list(
          list(namn = "Kvinnor och män", kpi_ids = c("K_ARKR_KV", "K_ARKR_MAN"))
        )
      ),
      list(
        id = "arbetsmarknad-forandring",
        namn = "Årsförändring arbetsmarknad",
        kpi_ids = c("K_SYSS_FORANDR", "K_ARBL_FORANDR")
      ),
      # ── Näringsliv (dagbefolkning) ──
      list(
        id = "dagbefolkning",
        namn = "Sysselsatta som arbetar i kommunen, 15–74 år (prelim.)",
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
        namn = "Årsförändring, sysselsatta som arbetar i kommunen",
        kpi_ids = c("K_DAG_TILLVAXT")
      ),
      # ── Befolkningsutveckling ──
      list(
        id = "befolkning",
        namn = "Befolkningsutveckling",
        kpi_ids = c("K_BEF_TOT", "K_BEF_FORANDR")
      ),
      # ── Gästnätter ──
      list(
        id = "gastnatter",
        namn = "Gästnätter",
        kpi_ids = c("K_GAST_TOT"),
        undersektioner = list(
          list(namn = "Marknad", kpi_ids = c("K_GAST_SVE", "K_GAST_UTL", "K_ANDEL_UTL")),
          list(namn = "Årsförändring", kpi_ids = c("K_GAST_TILLVAXT"))
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
      # Sysselsättningsgrad (TAB6260, efter bostadens belägenhet)
      "K_SYSS_TOT",       "Sysselsättningsgrad (prelim.)",                        paste("Sysselsatta som andel av befolkningen 20–64 år bland de folkbokförda i kommunen; som sysselsatt räknas bland annat den som under månaden fått lön enligt arbetsgivarnas deklarationer (AGI) eller bedöms driva ett verksamt företag.", bas_prel, kalla_natt),
      "K_SYSS_ANT",       "Antal sysselsatta (prelim.)",                          paste("Antal sysselsatta 20–64 år bland de folkbokförda i kommunen.", bas_prel, kalla_natt),
      "K_SYSS_INR",       "Sysselsättningsgrad, inrikes födda (prelim.)",         paste("Sysselsatta som andel av befolkningen bland inrikes födda 20–64 år som är folkbokförda i kommunen.", bas_prel, kalla_natt),
      "K_SYSS_UTR",       "Sysselsättningsgrad, utrikes födda (prelim.)",         paste("Sysselsatta som andel av befolkningen bland utrikes födda 20–64 år som är folkbokförda i kommunen.", bas_prel, kalla_natt),
      "K_SYSS_KV",        "Sysselsättningsgrad, kvinnor (prelim.)",               paste("Sysselsatta som andel av befolkningen bland kvinnor 20–64 år som är folkbokförda i kommunen.", bas_prel, kalla_natt),
      "K_SYSS_MAN",       "Sysselsättningsgrad, män (prelim.)",                   paste("Sysselsatta som andel av befolkningen bland män 20–64 år som är folkbokförda i kommunen.", bas_prel, kalla_natt),
      # Sysselsatta 15–74 år efter bostadens belägenhet (TAB6260)
      "K_NATT_ANT",       "Sysselsatta 15–74 år som bor i kommunen, antal (prelim.)",  paste("Antal sysselsatta 15–74 år bland de folkbokförda i kommunen, det vill säga efter bostadens belägenhet.", bas_prel, kalla_natt),
      "K_NATT_GRAD",      "Sysselsättningsgrad 15–74 år (prelim.)",            paste("Sysselsatta som andel av befolkningen 15–74 år bland de folkbokförda i kommunen.", bas_prel, kalla_natt),
      # Arbetslöshet (TAB6260)
      "K_ARBL_TOT",       "Arbetslöshetsgrad (prelim.)",                          paste("Arbetslösa som andel av arbetskraften (sysselsatta och arbetslösa) 20–64 år bland de folkbokförda i kommunen; som arbetslös räknas den som någon gång under månaden varit inskriven hos Arbetsförmedlingen som öppet arbetslös eller sökande i program med aktivitetsstöd och inte är sysselsatt.", bas_prel, kalla_natt),
      "K_ARBL_ANT",       "Antal arbetslösa (prelim.)",                           paste("Antal arbetslösa 20–64 år bland de folkbokförda i kommunen, det vill säga inskrivna hos Arbetsförmedlingen som öppet arbetslösa eller sökande i program med aktivitetsstöd någon gång under månaden och inte sysselsatta.", bas_prel, kalla_natt),
      "K_ARBL_INR",       "Arbetslöshetsgrad, inrikes födda (prelim.)",           paste("Arbetslösa som andel av arbetskraften bland inrikes födda 20–64 år som är folkbokförda i kommunen.", bas_prel, kalla_natt),
      "K_ARBL_UTR",       "Arbetslöshetsgrad, utrikes födda (prelim.)",           paste("Arbetslösa som andel av arbetskraften bland utrikes födda 20–64 år som är folkbokförda i kommunen.", bas_prel, kalla_natt),
      "K_ARBL_KV",        "Arbetslöshetsgrad, kvinnor (prelim.)",                 paste("Arbetslösa som andel av arbetskraften bland kvinnor 20–64 år som är folkbokförda i kommunen.", bas_prel, kalla_natt),
      "K_ARBL_MAN",       "Arbetslöshetsgrad, män (prelim.)",                     paste("Arbetslösa som andel av arbetskraften bland män 20–64 år som är folkbokförda i kommunen.", bas_prel, kalla_natt),
      # Arbetskraftsdeltagande (TAB6260)
      "K_ARKR_TOT",       "Arbetskraftsdeltagande (prelim.)",                     paste("Personer i arbetskraften (sysselsatta och arbetslösa) som andel av befolkningen 20–64 år bland de folkbokförda i kommunen.", bas_prel, kalla_natt),
      "K_ARKR_KV",        "Arbetskraftsdeltagande, kvinnor (prelim.)",            paste("Personer i arbetskraften (sysselsatta och arbetslösa) som andel av befolkningen bland kvinnor 20–64 år som är folkbokförda i kommunen.", bas_prel, kalla_natt),
      "K_ARKR_MAN",       "Arbetskraftsdeltagande, män (prelim.)",                paste("Personer i arbetskraften (sysselsatta och arbetslösa) som andel av befolkningen bland män 20–64 år som är folkbokförda i kommunen.", bas_prel, kalla_natt),
      # Sysselsatta efter arbetsställets belägenhet, "dagbefolkning" (TAB3784)
      "K_DAG_TOT",        "Sysselsatta 15–74 år som arbetar i kommunen, antal (prelim.)",                  paste("Antal sysselsatta 15–74 år vars huvudsakliga arbetsställe ligger i kommunen, alla näringsgrenar; SCB kallar det sysselsatta efter arbetsställets belägenhet och använder inte ordet dagbefolkning, eftersom statistiken visar var arbetsstället ligger och inte var personerna befinner sig när arbetet utförs.", bas_prel, kalla_dag),
      "K_DAG_JORD",       "Sysselsatta, jordbruk m.m. (prelim.)",                 dag_bransch("SNI A: företag inom jordbruk, skogsbruk och fiske"),
      "K_DAG_IND",        "Sysselsatta, tillverkning (prelim.)",                  dag_bransch("SNI B+C: tillverkningsindustri; gruvor och mineralutvinningsindustri"),
      "K_DAG_ENMI",       "Sysselsatta, energi och miljö (prelim.)",              dag_bransch("SNI D+E: företag inom energi och miljö"),
      "K_DAG_BYG",        "Sysselsatta, bygg (prelim.)",                          dag_bransch("SNI F: byggindustri"),
      "K_DAG_HAND",       "Sysselsatta, handel (prelim.)",                        dag_bransch("SNI G: handel; serviceverkstäder för motorfordon och motorcyklar"),
      "K_DAG_TRANS",      "Sysselsatta, transport (prelim.)",                     dag_bransch("SNI H: transport- och magasineringsföretag"),
      "K_DAG_HOTEL",      "Sysselsatta, hotell & restaurang (prelim.)",           dag_bransch("SNI I: hotell och restauranger"),
      "K_DAG_IT",         "Sysselsatta, IT och kommunikation (prelim.)",          dag_bransch("SNI J: informations- och kommunikationsföretag"),
      "K_DAG_FINANS",     "Sysselsatta, finans och försäkring (prelim.)",         dag_bransch("SNI K: kreditinstitut och försäkringsbolag m.m."),
      "K_DAG_FAST",       "Sysselsatta, fastigheter (prelim.)",                   dag_bransch("SNI L: fastighetsbolag och fastighetsförvaltare"),
      "K_DAG_FORETJ",     "Sysselsatta, företagstjänster (prelim.)",              dag_bransch("SNI M+N: företag inom juridik, ekonomi, vetenskap och teknik; företag inom uthyrning, fastighetsservice, resetjänster och andra stödtjänster"),
      "K_DAG_OFF",        "Sysselsatta inom offentlig förvaltning, utbildning, vård och omsorg (prelim.)",              paste("Antal sysselsatta 15–74 år vars huvudsakliga arbetsställe ligger i kommunen, inom SNI O (civila myndigheter och försvaret), P (utbildningsväsendet) och Q (enheter för vård och omsorg, socialtjänst), summerat av Region Halland; indelningen avser näringsgren och inte sektor, som SCB redovisar i en egen tabell.", bas_prel, kalla_dag),
      "K_DAG_KULT",       "Sysselsatta, kultur m.m. (prelim.)",                   dag_bransch("SNI R+S+T+U: enheter för kultur, nöje och fritid; andra serviceföretag m.m."),
      # Förändring mot samma månad föregående år (beräknade i bearbeta.R)
      "K_SYSS_FORANDR",   "Sysselsättningsgrad, årsförändring i procentenheter (prelim.)",   paste("Sysselsättningsgraden 20–64 år minus sysselsättningsgraden samma månad året innan, i procentenheter, beräknad av Region Halland ur SCB:s månadsvärden.", bas_prel, kalla_natt),
      "K_ARBL_FORANDR",   "Arbetslöshet, årsförändring i procentenheter (prelim.)",          paste("Arbetslösheten 20–64 år minus arbetslösheten samma månad året innan, i procentenheter, beräknad av Region Halland ur SCB:s månadsvärden.", bas_prel, kalla_natt),
      # Befolkning (SCB:s befolkningsstatistik per månad, inte BAS)
      "K_BEF_TOT",        "Folkmängd vid månadens slut (prelim.)",                                     paste("Antal folkbokförda personer i kommunen den sista dagen i månaden, enligt SCB:s befolkningsstatistik per månad (inte BAS).",
                                                                                           "SCB kallar månadsstatistiken preliminär, men folkmängden redovisas cirka 5–6 veckor efter mättidpunkten och revideras inte i efterhand i tabellen; det som revideras under året är födda, döda och flyttningar, som blir slutliga när statistiken för december publicerats.",
                                                                                           "Från 2025 har SCB tillfört varje värde en liten kontrollerad slumpmässig justering på mellan minus 3 och plus 3 personer (Cell Key Method, CKM) för att skydda enskilda personer, och värdena för 2020–2024 kommer från den tidigare tabellen.",
                                                                                           kalla_bef),
      "K_BEF_FORANDR",    "Befolkningsförändring jämfört med samma månad året innan (prelim.)",             paste("Folkmängden vid månadens slut minus folkmängden vid slutet av samma månad året innan, beräknad av Region Halland ur SCB:s befolkningsstatistik per månad (inte BAS).",
                                                                                           "Folkmängden avser antalet folkbokförda den sista dagen i månaden och revideras inte i efterhand i SCB:s tabell; från 2025 har varje värde en liten slumpmässig skyddsjustering på mellan minus 3 och plus 3 personer (CKM), och värdena för 2020–2024 kommer från den tidigare tabellen.",
                                                                                           kalla_bef),
      "K_DAG_TILLVAXT",   "Sysselsatta som arbetar i kommunen, årsförändring i procent (prelim.)",               paste("Procentuell förändring av antalet sysselsatta 15–74 år med huvudsakligt arbetsställe i kommunen, alla näringsgrenar, jämfört med samma månad året innan, beräknad av Region Halland ur SCB:s månadsvärden.", bas_prel, kalla_dag),
      # Turism (gästnätter, Tillväxtverkets öppna data per månad)
      "K_GAST_TOT",       "Gästnätter totalt (prelim.)",                             paste("Antal gästnätter under månaden på hotell, stugbyar, vandrarhem, campingplatser och i kommersiellt förmedlade privata stugor och lägenheter (bokningsplattformar som Airbnb ingår inte).",
                                                                                           gast_prel,
                                                                                           "En kommuns statistik redovisas bara för månader med minst fem öppna anläggningar.",
                                                                                           kalla_gast),
      "K_GAST_SVE",       "Gästnätter, svenska gäster (prelim.)",                               paste("Antal gästnätter under månaden av gäster från Sverige, på samma typer av anläggningar som i gästnätter totalt.", gast_prel, kalla_gast),
      "K_GAST_UTL",       "Gästnätter, utländska gäster (prelim.)",                             paste("Antal gästnätter under månaden av gäster från andra länder än Sverige.",
                                                                                           "Under 2024 underrapporterades utländska gäster på grund av tekniska problem i ett bokningssystem för hotell, så ökningen 2025 ska enligt Tillväxtverket tolkas med försiktighet.",
                                                                                           gast_prel, kalla_gast),
      "K_ANDEL_UTL",      "Andel utländska gästnätter (%) (prelim.)",                          paste("Utländska gästnätter som andel av summan av svenska och utländska gästnätter, beräknad av Region Halland.",
                                                                                           "Under 2024 underrapporterades utländska gäster på grund av tekniska problem i ett bokningssystem för hotell, enligt Tillväxtverket.",
                                                                                           kalla_gast),
      "K_GAST_TILLVAXT",  "Gästnätter, årsförändring i procent (prelim.)",                           paste("Procentuell förändring av antalet gästnätter jämfört med samma månad året innan, beräknad av Region Halland.", gast_prel, kalla_gast),
      # Bostadsbyggande (kvartal, TAB4572)
      "K_BYGG_TOT",       "Påbörjade lägenheter, alla hustyper, per kvartal (prelim.)",   paste("Antal påbörjade lägenheter i nybyggda hus under kvartalet, summan av småhus och flerbostadshus beräknad av Region Halland; som lägenhet räknas enligt SCB även bostaden i ett småhus, och påbörjandet räknas i de flesta fall från kommunens startbesked.",
                                                                                           "Uppgifterna är preliminära och underskattade för de senaste kvartalen eftersom rapporteringen släpar efter: enligt SCB är underskattningen för påbörjade 20 till 60 procent det senaste kvartalet och cirka 2 procent efter ett år.",
                                                                                           "Eftersläpningen ser olika ut i olika kommuner, så jämförelser mellan kommuner för de senaste kvartalen är osäkra.",
                                                                                           kalla_bygg),
      "K_BYGG_SMAHUS",    "Påbörjade lägenheter, småhus, per kvartal (prelim.)",     paste("Antal påbörjade lägenheter i nybyggda småhus under kvartalet; småhus är enligt SCB friliggande en- och tvåbostadshus samt par-, rad- och kedjehus (exklusive fritidshus).", bygg_prel, kalla_bygg),
      "K_BYGG_FLERBO",    "Påbörjade lägenheter, flerbostadshus, per kvartal (prelim.)",  paste("Antal påbörjade lägenheter i nybyggda flerbostadshus under kvartalet; flerbostadshus är enligt SCB bostadsbyggnader med tre eller fler lägenheter, inklusive loftgångshus och specialbostäder som studentbostäder och bostäder för äldre eller funktionshindrade.", bygg_prel, kalla_bygg)
    ),

    # Inga beräknade antal-KPI:er (hanteras direkt)
    berakna_antal = list(),

    # Visningsnamn för frontend
    visningsnamn = list(
      "K_SYSS_TOT"       = "Sysselsatta bland befolkningen 20–64 år, andel (%) (prelim.)",
      "K_SYSS_ANT"       = "Sysselsatta i befolkningen 20–64 år, antal (prelim.)",
      "K_SYSS_INR"       = "Sysselsatta bland inrikes födda 20–64 år, andel (%) (prelim.)",
      "K_SYSS_UTR"       = "Sysselsatta bland utrikes födda 20–64 år, andel (%) (prelim.)",
      "K_SYSS_KV"        = "Sysselsatta bland kvinnor 20–64 år, andel (%) (prelim.)",
      "K_SYSS_MAN"       = "Sysselsatta bland män 20–64 år, andel (%) (prelim.)",

      "K_NATT_ANT"       = "Sysselsatta 15–74 år som bor i kommunen, antal (prelim.)",
      "K_NATT_GRAD"      = "Sysselsättningsgrad 15–74 år (prelim.)",

      "K_ARBL_TOT"       = "Arbetslösa i arbetskraften 20–64 år, andel (%) (prelim.)",
      "K_ARBL_ANT"       = "Arbetslösa i arbetskraften 20–64 år, antal (prelim.)",
      "K_ARBL_INR"       = "Arbetslösa bland inrikes födda 20–64 år, andel (%) (prelim.)",
      "K_ARBL_UTR"       = "Arbetslösa bland utrikes födda 20–64 år, andel (%) (prelim.)",
      "K_ARBL_KV"        = "Arbetslösa bland kvinnor 20–64 år, andel (%) (prelim.)",
      "K_ARBL_MAN"       = "Arbetslösa bland män 20–64 år, andel (%) (prelim.)",

      "K_ARKR_TOT"       = "I arbetskraften bland befolkningen 20–64 år, andel (%) (prelim.)",
      "K_ARKR_KV"        = "I arbetskraften bland kvinnor 20–64 år, andel (%) (prelim.)",
      "K_ARKR_MAN"       = "I arbetskraften bland män 20–64 år, andel (%) (prelim.)",

      "K_DAG_TOT"        = "Sysselsatta 15–74 år som arbetar i kommunen, antal (prelim.)",
      "K_DAG_JORD"       = "Sysselsatta inom jordbruk och skogsbruk (prelim.)",
      "K_DAG_IND"        = "Sysselsatta inom tillverkning (prelim.)",
      "K_DAG_ENMI"       = "Sysselsatta inom energi och miljö (prelim.)",
      "K_DAG_BYG"        = "Sysselsatta inom byggverksamhet (prelim.)",
      "K_DAG_HAND"       = "Sysselsatta inom handel (prelim.)",
      "K_DAG_TRANS"      = "Sysselsatta inom transport (prelim.)",
      "K_DAG_HOTEL"      = "Sysselsatta inom hotell och restaurang (prelim.)",
      "K_DAG_IT"         = "Sysselsatta inom IT och kommunikation (prelim.)",
      "K_DAG_FINANS"     = "Sysselsatta inom finans och försäkring (prelim.)",
      "K_DAG_FAST"       = "Sysselsatta inom fastighetsverksamhet (prelim.)",
      "K_DAG_FORETJ"     = "Sysselsatta inom företagstjänster (prelim.)",
      "K_DAG_OFF"        = "Sysselsatta inom offentlig förvaltning, utbildning, vård och omsorg (prelim.)",
      "K_DAG_KULT"       = "Sysselsatta inom kultur, nöje och fritid (prelim.)",

      "K_SYSS_FORANDR"   = "Sysselsättningsgrad, årsförändring i procentenheter (prelim.)",
      "K_ARBL_FORANDR"   = "Arbetslöshet, årsförändring i procentenheter (prelim.)",
      "K_GAST_TOT"       = "Gästnätter totalt (prelim.)",
      "K_GAST_SVE"       = "Gästnätter, svenska gäster (prelim.)",
      "K_GAST_UTL"       = "Gästnätter, utländska gäster (prelim.)",
      "K_ANDEL_UTL"      = "Andel utländska gästnätter (%) (prelim.)",
      "K_GAST_TILLVAXT"  = "Gästnätter, årsförändring i procent (prelim.)",
      "K_DAG_TILLVAXT"   = "Sysselsatta som arbetar i kommunen, årsförändring i procent (prelim.)",

      "K_BEF_TOT"        = "Folkmängd vid månadens slut (prelim.)",
      "K_BEF_FORANDR"    = "Befolkningsförändring jämfört med samma månad året innan (prelim.)",

      "K_BYGG_TOT"       = "Påbörjade lägenheter, alla hustyper, per kvartal (prelim.)",
      "K_BYGG_SMAHUS"    = "Påbörjade lägenheter, småhus, per kvartal (prelim.)",
      "K_BYGG_FLERBO"    = "Påbörjade lägenheter, flerbostadshus, per kvartal (prelim.)"
    )
  )
}
