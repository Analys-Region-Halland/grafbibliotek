# teman/arbetsmarknad/config.R — Arbetsmarknad och kompetensförsörjning
# Källa: SCB tabell ArRegArbStatus (BAS årsregister, ersätter RAMS)
# Åldersgrupp: 20-64 år
#
# Hämtar antal (sysselsatta, arbetslösa, arbetskraft, totalt) per:
#   - Totalt (kön=totalt, födelseregion=totalt)
#   - Inrikes födda (kön=totalt, födelseregion=inrikes)
#   - Utrikes födda (kön=totalt, födelseregion=utrikes)
#   - Kvinnor (kön=kvinnor, födelseregion=totalt)
#   - Män (kön=män, födelseregion=totalt)
#
# Beräknar sedan andelsmått i bearbeta.R:
#   - Sysselsättningsgrad = sysselsatta / totalt × 100
#   - Andel i arbetskraften = arbetskraft / totalt × 100
#   - Arbetslöshetsgrad = arbetslösa / arbetskraft × 100

source("R/paket.R")

# SCB-tabellens URL
SCB_TABELL_URL <- "https://api.scb.se/OV0104/v1/doris/sv/ssd/AM/AM0210/AM0210D/ArRegArbStatus"

# Alla kommuner + regioner + riket — hämtas dynamiskt vid körning
# (vi behöver alla för ranking)

# ContentsCode-mappning:
# 000002NT = antal sysselsatta
# 000002NM = antal arbetslösa
# 000002NL = antal i arbetskraften (sysselsatta + arbetslösa)
# 000002NU = antal totalt i befolkningen
# 000002NS = sysselsättningsgrad (redan beräknad av SCB)
# 000002NN = arbetslöshet (redan beräknad av SCB)
# 000002NK = arbetskraftsdeltagande (redan beräknad av SCB)

# Vi hämtar de beräknade andelarna direkt från SCB (enklare, färre beräkningar)
# plus antalen för toggle i frontend.

arbetsmarknad_config <- function() {

  # Alla region-koder (kommun + län + riket) — byggs dynamiskt
  kommun_df <- readRDS("data/kommun-register.rds")
  alla_regioner <- kommun_df$id
  # SCB-format: ta bort inledande nollor för riket/regioner
  scb_regioner <- sub("^00", "", alla_regioner)
  # Ta bort tomma strängar
  scb_regioner <- scb_regioner[nchar(scb_regioner) > 0]

  # Perioder
  perioder <- as.character(2020:as.integer(format(Sys.Date(), "%Y")))

  list(
    tema_id    = "arbetsmarknad",
    tema_namn  = "Arbetsmarknad",
    tema_farg  = "bla",
    datakalla  = "scb",
    startar    = 2020,

    # Inga Kolada-KPI:er
    kpier = character(0),

    # SCB-tabeller — en per kombination (kön × födelseregion)
    scb_tabeller = list(

      # ── TOTALT (kön=totalt, födelseregion=totalt) ──

      # Sysselsättningsgrad, totalt (andel)
      list(
        url = SCB_TABELL_URL,
        kpi_id = "S_SYSS_TOT",
        query = list(
          Region = scb_regioner,
          Kon = c("1+2"),
          Alder = c("20-64"),
          Fodelseregion = c("tot"),
          ContentsCode = c("000002NS"),
          Tid = perioder
        ),
        region_kolumn = "Region",
        ar_kolumn = "Tid"
      ),
      # Antal sysselsatta, totalt
      list(
        url = SCB_TABELL_URL,
        kpi_id = "S_SYSS_TOT_N",
        query = list(
          Region = scb_regioner,
          Kon = c("1+2"),
          Alder = c("20-64"),
          Fodelseregion = c("tot"),
          ContentsCode = c("000002NT"),
          Tid = perioder
        ),
        region_kolumn = "Region",
        ar_kolumn = "Tid"
      ),
      # Arbetskraftsdeltagande, totalt (andel)
      list(
        url = SCB_TABELL_URL,
        kpi_id = "S_ARKR_TOT",
        query = list(
          Region = scb_regioner,
          Kon = c("1+2"),
          Alder = c("20-64"),
          Fodelseregion = c("tot"),
          ContentsCode = c("000002NK"),
          Tid = perioder
        ),
        region_kolumn = "Region",
        ar_kolumn = "Tid"
      ),
      # Antal i arbetskraften, totalt
      list(
        url = SCB_TABELL_URL,
        kpi_id = "S_ARKR_TOT_N",
        query = list(
          Region = scb_regioner,
          Kon = c("1+2"),
          Alder = c("20-64"),
          Fodelseregion = c("tot"),
          ContentsCode = c("000002NL"),
          Tid = perioder
        ),
        region_kolumn = "Region",
        ar_kolumn = "Tid"
      ),
      # Arbetslöshetsgrad, totalt (andel)
      list(
        url = SCB_TABELL_URL,
        kpi_id = "S_ARBL_TOT",
        query = list(
          Region = scb_regioner,
          Kon = c("1+2"),
          Alder = c("20-64"),
          Fodelseregion = c("tot"),
          ContentsCode = c("000002NN"),
          Tid = perioder
        ),
        region_kolumn = "Region",
        ar_kolumn = "Tid"
      ),
      # Antal arbetslösa, totalt
      list(
        url = SCB_TABELL_URL,
        kpi_id = "S_ARBL_TOT_N",
        query = list(
          Region = scb_regioner,
          Kon = c("1+2"),
          Alder = c("20-64"),
          Fodelseregion = c("tot"),
          ContentsCode = c("000002NM"),
          Tid = perioder
        ),
        region_kolumn = "Region",
        ar_kolumn = "Tid"
      ),

      # ── INRIKES FÖDDA ──

      list(
        url = SCB_TABELL_URL, kpi_id = "S_SYSS_INR",
        query = list(Region = scb_regioner, Kon = c("1+2"), Alder = c("20-64"),
                     Fodelseregion = c("in"), ContentsCode = c("000002NS"), Tid = perioder),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      list(
        url = SCB_TABELL_URL, kpi_id = "S_SYSS_INR_N",
        query = list(Region = scb_regioner, Kon = c("1+2"), Alder = c("20-64"),
                     Fodelseregion = c("in"), ContentsCode = c("000002NT"), Tid = perioder),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      list(
        url = SCB_TABELL_URL, kpi_id = "S_ARKR_INR",
        query = list(Region = scb_regioner, Kon = c("1+2"), Alder = c("20-64"),
                     Fodelseregion = c("in"), ContentsCode = c("000002NK"), Tid = perioder),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      list(
        url = SCB_TABELL_URL, kpi_id = "S_ARKR_INR_N",
        query = list(Region = scb_regioner, Kon = c("1+2"), Alder = c("20-64"),
                     Fodelseregion = c("in"), ContentsCode = c("000002NL"), Tid = perioder),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      list(
        url = SCB_TABELL_URL, kpi_id = "S_ARBL_INR",
        query = list(Region = scb_regioner, Kon = c("1+2"), Alder = c("20-64"),
                     Fodelseregion = c("in"), ContentsCode = c("000002NN"), Tid = perioder),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      list(
        url = SCB_TABELL_URL, kpi_id = "S_ARBL_INR_N",
        query = list(Region = scb_regioner, Kon = c("1+2"), Alder = c("20-64"),
                     Fodelseregion = c("in"), ContentsCode = c("000002NM"), Tid = perioder),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),

      # ── UTRIKES FÖDDA ──

      list(
        url = SCB_TABELL_URL, kpi_id = "S_SYSS_UTR",
        query = list(Region = scb_regioner, Kon = c("1+2"), Alder = c("20-64"),
                     Fodelseregion = c("ut"), ContentsCode = c("000002NS"), Tid = perioder),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      list(
        url = SCB_TABELL_URL, kpi_id = "S_SYSS_UTR_N",
        query = list(Region = scb_regioner, Kon = c("1+2"), Alder = c("20-64"),
                     Fodelseregion = c("ut"), ContentsCode = c("000002NT"), Tid = perioder),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      list(
        url = SCB_TABELL_URL, kpi_id = "S_ARKR_UTR",
        query = list(Region = scb_regioner, Kon = c("1+2"), Alder = c("20-64"),
                     Fodelseregion = c("ut"), ContentsCode = c("000002NK"), Tid = perioder),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      list(
        url = SCB_TABELL_URL, kpi_id = "S_ARKR_UTR_N",
        query = list(Region = scb_regioner, Kon = c("1+2"), Alder = c("20-64"),
                     Fodelseregion = c("ut"), ContentsCode = c("000002NL"), Tid = perioder),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      list(
        url = SCB_TABELL_URL, kpi_id = "S_ARBL_UTR",
        query = list(Region = scb_regioner, Kon = c("1+2"), Alder = c("20-64"),
                     Fodelseregion = c("ut"), ContentsCode = c("000002NN"), Tid = perioder),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      list(
        url = SCB_TABELL_URL, kpi_id = "S_ARBL_UTR_N",
        query = list(Region = scb_regioner, Kon = c("1+2"), Alder = c("20-64"),
                     Fodelseregion = c("ut"), ContentsCode = c("000002NM"), Tid = perioder),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),

      # ── KVINNOR ──

      list(
        url = SCB_TABELL_URL, kpi_id = "S_SYSS_KV",
        query = list(Region = scb_regioner, Kon = c("2"), Alder = c("20-64"),
                     Fodelseregion = c("tot"), ContentsCode = c("000002NS"), Tid = perioder),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      list(
        url = SCB_TABELL_URL, kpi_id = "S_SYSS_KV_N",
        query = list(Region = scb_regioner, Kon = c("2"), Alder = c("20-64"),
                     Fodelseregion = c("tot"), ContentsCode = c("000002NT"), Tid = perioder),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      list(
        url = SCB_TABELL_URL, kpi_id = "S_ARKR_KV",
        query = list(Region = scb_regioner, Kon = c("2"), Alder = c("20-64"),
                     Fodelseregion = c("tot"), ContentsCode = c("000002NK"), Tid = perioder),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      list(
        url = SCB_TABELL_URL, kpi_id = "S_ARKR_KV_N",
        query = list(Region = scb_regioner, Kon = c("2"), Alder = c("20-64"),
                     Fodelseregion = c("tot"), ContentsCode = c("000002NL"), Tid = perioder),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      list(
        url = SCB_TABELL_URL, kpi_id = "S_ARBL_KV",
        query = list(Region = scb_regioner, Kon = c("2"), Alder = c("20-64"),
                     Fodelseregion = c("tot"), ContentsCode = c("000002NN"), Tid = perioder),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      list(
        url = SCB_TABELL_URL, kpi_id = "S_ARBL_KV_N",
        query = list(Region = scb_regioner, Kon = c("2"), Alder = c("20-64"),
                     Fodelseregion = c("tot"), ContentsCode = c("000002NM"), Tid = perioder),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),

      # ── MÄN ──

      list(
        url = SCB_TABELL_URL, kpi_id = "S_SYSS_MAN",
        query = list(Region = scb_regioner, Kon = c("1"), Alder = c("20-64"),
                     Fodelseregion = c("tot"), ContentsCode = c("000002NS"), Tid = perioder),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      list(
        url = SCB_TABELL_URL, kpi_id = "S_SYSS_MAN_N",
        query = list(Region = scb_regioner, Kon = c("1"), Alder = c("20-64"),
                     Fodelseregion = c("tot"), ContentsCode = c("000002NT"), Tid = perioder),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      list(
        url = SCB_TABELL_URL, kpi_id = "S_ARKR_MAN",
        query = list(Region = scb_regioner, Kon = c("1"), Alder = c("20-64"),
                     Fodelseregion = c("tot"), ContentsCode = c("000002NK"), Tid = perioder),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      list(
        url = SCB_TABELL_URL, kpi_id = "S_ARKR_MAN_N",
        query = list(Region = scb_regioner, Kon = c("1"), Alder = c("20-64"),
                     Fodelseregion = c("tot"), ContentsCode = c("000002NL"), Tid = perioder),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      list(
        url = SCB_TABELL_URL, kpi_id = "S_ARBL_MAN",
        query = list(Region = scb_regioner, Kon = c("1"), Alder = c("20-64"),
                     Fodelseregion = c("tot"), ContentsCode = c("000002NN"), Tid = perioder),
        region_kolumn = "Region", ar_kolumn = "Tid"
      ),
      list(
        url = SCB_TABELL_URL, kpi_id = "S_ARBL_MAN_N",
        query = list(Region = scb_regioner, Kon = c("1"), Alder = c("20-64"),
                     Fodelseregion = c("tot"), ContentsCode = c("000002NM"), Tid = perioder),
        region_kolumn = "Region", ar_kolumn = "Tid"
      )
    ),

    # Sektioner för frontend — ämnesbaserade med undersektioner
    sektioner = list(
      list(
        id = "sysselsattning",
        namn = "Sysselsättningsgrad, 20–64 år",
        kpi_ids = c("S_SYSS_TOT"),
        undersektioner = list(
          list(namn = "Födelseregion", kpi_ids = c("S_SYSS_INR", "S_SYSS_UTR")),
          list(namn = "Kvinnor och män", kpi_ids = c("S_SYSS_KV", "S_SYSS_MAN"))
        )
      ),
      list(
        id = "arbetskraft",
        namn = "Arbetskraftsdeltagande, 20–64 år",
        kpi_ids = c("S_ARKR_TOT"),
        undersektioner = list(
          list(namn = "Födelseregion", kpi_ids = c("S_ARKR_INR", "S_ARKR_UTR")),
          list(namn = "Kvinnor och män", kpi_ids = c("S_ARKR_KV", "S_ARKR_MAN"))
        )
      ),
      list(
        id = "arbetsloshet",
        namn = "Arbetslöshet, 20–64 år",
        kpi_ids = c("S_ARBL_TOT"),
        undersektioner = list(
          list(namn = "Födelseregion", kpi_ids = c("S_ARBL_INR", "S_ARBL_UTR")),
          list(namn = "Kvinnor och män", kpi_ids = c("S_ARBL_KV", "S_ARBL_MAN"))
        )
      )
    ),

    # KPI-metadata
    kpi_meta = tribble(
      ~kpi_id,           ~enhet,     ~tema,            ~par_kpi_id,
      # Totalt
      "S_SYSS_TOT",      "procent",  "arbetsmarknad",  "S_SYSS_TOT_N",
      "S_SYSS_TOT_N",    "antal",    "arbetsmarknad",  "S_SYSS_TOT",
      "S_ARKR_TOT",      "procent",  "arbetsmarknad",  "S_ARKR_TOT_N",
      "S_ARKR_TOT_N",    "antal",    "arbetsmarknad",  "S_ARKR_TOT",
      "S_ARBL_TOT",      "procent",  "arbetsmarknad",  "S_ARBL_TOT_N",
      "S_ARBL_TOT_N",    "antal",    "arbetsmarknad",  "S_ARBL_TOT",
      # Inrikes
      "S_SYSS_INR",      "procent",  "arbetsmarknad",  "S_SYSS_INR_N",
      "S_SYSS_INR_N",    "antal",    "arbetsmarknad",  "S_SYSS_INR",
      "S_ARKR_INR",      "procent",  "arbetsmarknad",  "S_ARKR_INR_N",
      "S_ARKR_INR_N",    "antal",    "arbetsmarknad",  "S_ARKR_INR",
      "S_ARBL_INR",      "procent",  "arbetsmarknad",  "S_ARBL_INR_N",
      "S_ARBL_INR_N",    "antal",    "arbetsmarknad",  "S_ARBL_INR",
      # Utrikes
      "S_SYSS_UTR",      "procent",  "arbetsmarknad",  "S_SYSS_UTR_N",
      "S_SYSS_UTR_N",    "antal",    "arbetsmarknad",  "S_SYSS_UTR",
      "S_ARKR_UTR",      "procent",  "arbetsmarknad",  "S_ARKR_UTR_N",
      "S_ARKR_UTR_N",    "antal",    "arbetsmarknad",  "S_ARKR_UTR",
      "S_ARBL_UTR",      "procent",  "arbetsmarknad",  "S_ARBL_UTR_N",
      "S_ARBL_UTR_N",    "antal",    "arbetsmarknad",  "S_ARBL_UTR",
      # Kvinnor
      "S_SYSS_KV",       "procent",  "arbetsmarknad",  "S_SYSS_KV_N",
      "S_SYSS_KV_N",     "antal",    "arbetsmarknad",  "S_SYSS_KV",
      "S_ARKR_KV",       "procent",  "arbetsmarknad",  "S_ARKR_KV_N",
      "S_ARKR_KV_N",     "antal",    "arbetsmarknad",  "S_ARKR_KV",
      "S_ARBL_KV",       "procent",  "arbetsmarknad",  "S_ARBL_KV_N",
      "S_ARBL_KV_N",     "antal",    "arbetsmarknad",  "S_ARBL_KV",
      # Män
      "S_SYSS_MAN",      "procent",  "arbetsmarknad",  "S_SYSS_MAN_N",
      "S_SYSS_MAN_N",    "antal",    "arbetsmarknad",  "S_SYSS_MAN",
      "S_ARKR_MAN",      "procent",  "arbetsmarknad",  "S_ARKR_MAN_N",
      "S_ARKR_MAN_N",    "antal",    "arbetsmarknad",  "S_ARKR_MAN",
      "S_ARBL_MAN",      "procent",  "arbetsmarknad",  "S_ARBL_MAN_N",
      "S_ARBL_MAN_N",    "antal",    "arbetsmarknad",  "S_ARBL_MAN"
    ),

    # Beräknade KPI:er — SCB levererar redan andelarna, så vi sätter
    # egna beskrivningar som KPI-metadata (ingen Kolada-hämtning)
    beraknade_kpier = tribble(
      ~kpi_id,           ~kpi_namn,                                      ~beskrivning,
      # Totalt
      "S_SYSS_TOT",      "Sysselsättningsgrad",                          "Andel sysselsatta av befolkningen 20–64 år. Slutlig statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 \u00e5rliga registeruppgifter och inneh\u00e5ller mer fullst\u00e4ndiga och uppdaterade uppgifter \u00e4n den prelimin\u00e4ra m\u00e5nadsstatistiken. Publiceras med cirka 18 m\u00e5naders efters\u00e4lpning.",
      "S_SYSS_TOT_N",    "Antal sysselsatta",                            "Antal sysselsatta 20–64 år. Slutlig statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 \u00e5rliga registeruppgifter och inneh\u00e5ller mer fullst\u00e4ndiga och uppdaterade uppgifter \u00e4n den prelimin\u00e4ra m\u00e5nadsstatistiken. Publiceras med cirka 18 m\u00e5naders efters\u00e4lpning.",
      "S_ARKR_TOT",      "Andel i arbetskraften",                        "Andel av befolkningen 20–64 år som ingår i arbetskraften (sysselsatta + arbetslösa). Slutlig statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 \u00e5rliga registeruppgifter och inneh\u00e5ller mer fullst\u00e4ndiga och uppdaterade uppgifter \u00e4n den prelimin\u00e4ra m\u00e5nadsstatistiken. Publiceras med cirka 18 m\u00e5naders efters\u00e4lpning.",
      "S_ARKR_TOT_N",    "Antal i arbetskraften",                        "Antal personer 20–64 år i arbetskraften. Slutlig statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 \u00e5rliga registeruppgifter och inneh\u00e5ller mer fullst\u00e4ndiga och uppdaterade uppgifter \u00e4n den prelimin\u00e4ra m\u00e5nadsstatistiken. Publiceras med cirka 18 m\u00e5naders efters\u00e4lpning.",
      "S_ARBL_TOT",      "Arbetslöshetsgrad",                            "Andel arbetslösa av arbetskraften 20–64 år. Slutlig statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 \u00e5rliga registeruppgifter och inneh\u00e5ller mer fullst\u00e4ndiga och uppdaterade uppgifter \u00e4n den prelimin\u00e4ra m\u00e5nadsstatistiken. Publiceras med cirka 18 m\u00e5naders efters\u00e4lpning.",
      "S_ARBL_TOT_N",    "Antal arbetslösa",                             "Antal arbetslösa 20–64 år. Slutlig statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 \u00e5rliga registeruppgifter och inneh\u00e5ller mer fullst\u00e4ndiga och uppdaterade uppgifter \u00e4n den prelimin\u00e4ra m\u00e5nadsstatistiken. Publiceras med cirka 18 m\u00e5naders efters\u00e4lpning.",
      # Inrikes
      "S_SYSS_INR",      "Sysselsättningsgrad, inrikes födda",           "Andel sysselsatta bland inrikes födda 20–64 år. Slutlig statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 \u00e5rliga registeruppgifter och inneh\u00e5ller mer fullst\u00e4ndiga och uppdaterade uppgifter \u00e4n den prelimin\u00e4ra m\u00e5nadsstatistiken. Publiceras med cirka 18 m\u00e5naders efters\u00e4lpning.",
      "S_SYSS_INR_N",    "Antal sysselsatta, inrikes födda",             "Antal sysselsatta inrikes födda 20–64 år. Slutlig statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 \u00e5rliga registeruppgifter och inneh\u00e5ller mer fullst\u00e4ndiga och uppdaterade uppgifter \u00e4n den prelimin\u00e4ra m\u00e5nadsstatistiken. Publiceras med cirka 18 m\u00e5naders efters\u00e4lpning.",
      "S_ARKR_INR",      "Andel i arbetskraften, inrikes födda",         "Andel inrikes födda 20–64 år i arbetskraften. Slutlig statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 \u00e5rliga registeruppgifter och inneh\u00e5ller mer fullst\u00e4ndiga och uppdaterade uppgifter \u00e4n den prelimin\u00e4ra m\u00e5nadsstatistiken. Publiceras med cirka 18 m\u00e5naders efters\u00e4lpning.",
      "S_ARKR_INR_N",    "Antal i arbetskraften, inrikes födda",         "Antal inrikes födda 20–64 år i arbetskraften. Slutlig statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 \u00e5rliga registeruppgifter och inneh\u00e5ller mer fullst\u00e4ndiga och uppdaterade uppgifter \u00e4n den prelimin\u00e4ra m\u00e5nadsstatistiken. Publiceras med cirka 18 m\u00e5naders efters\u00e4lpning.",
      "S_ARBL_INR",      "Arbetslöshetsgrad, inrikes födda",             "Andel arbetslösa av arbetskraften bland inrikes födda 20–64 år. Slutlig statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 \u00e5rliga registeruppgifter och inneh\u00e5ller mer fullst\u00e4ndiga och uppdaterade uppgifter \u00e4n den prelimin\u00e4ra m\u00e5nadsstatistiken. Publiceras med cirka 18 m\u00e5naders efters\u00e4lpning.",
      "S_ARBL_INR_N",    "Antal arbetslösa, inrikes födda",              "Antal arbetslösa inrikes födda 20–64 år. Slutlig statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 \u00e5rliga registeruppgifter och inneh\u00e5ller mer fullst\u00e4ndiga och uppdaterade uppgifter \u00e4n den prelimin\u00e4ra m\u00e5nadsstatistiken. Publiceras med cirka 18 m\u00e5naders efters\u00e4lpning.",
      # Utrikes
      "S_SYSS_UTR",      "Sysselsättningsgrad, utrikes födda",           "Andel sysselsatta bland utrikes födda 20–64 år. Slutlig statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 \u00e5rliga registeruppgifter och inneh\u00e5ller mer fullst\u00e4ndiga och uppdaterade uppgifter \u00e4n den prelimin\u00e4ra m\u00e5nadsstatistiken. Publiceras med cirka 18 m\u00e5naders efters\u00e4lpning.",
      "S_SYSS_UTR_N",    "Antal sysselsatta, utrikes födda",             "Antal sysselsatta utrikes födda 20–64 år. Slutlig statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 \u00e5rliga registeruppgifter och inneh\u00e5ller mer fullst\u00e4ndiga och uppdaterade uppgifter \u00e4n den prelimin\u00e4ra m\u00e5nadsstatistiken. Publiceras med cirka 18 m\u00e5naders efters\u00e4lpning.",
      "S_ARKR_UTR",      "Andel i arbetskraften, utrikes födda",         "Andel utrikes födda 20–64 år i arbetskraften. Slutlig statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 \u00e5rliga registeruppgifter och inneh\u00e5ller mer fullst\u00e4ndiga och uppdaterade uppgifter \u00e4n den prelimin\u00e4ra m\u00e5nadsstatistiken. Publiceras med cirka 18 m\u00e5naders efters\u00e4lpning.",
      "S_ARKR_UTR_N",    "Antal i arbetskraften, utrikes födda",         "Antal utrikes födda 20–64 år i arbetskraften. Slutlig statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 \u00e5rliga registeruppgifter och inneh\u00e5ller mer fullst\u00e4ndiga och uppdaterade uppgifter \u00e4n den prelimin\u00e4ra m\u00e5nadsstatistiken. Publiceras med cirka 18 m\u00e5naders efters\u00e4lpning.",
      "S_ARBL_UTR",      "Arbetslöshetsgrad, utrikes födda",             "Andel arbetslösa av arbetskraften bland utrikes födda 20–64 år. Slutlig statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 \u00e5rliga registeruppgifter och inneh\u00e5ller mer fullst\u00e4ndiga och uppdaterade uppgifter \u00e4n den prelimin\u00e4ra m\u00e5nadsstatistiken. Publiceras med cirka 18 m\u00e5naders efters\u00e4lpning.",
      "S_ARBL_UTR_N",    "Antal arbetslösa, utrikes födda",              "Antal arbetslösa utrikes födda 20–64 år. Slutlig statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 \u00e5rliga registeruppgifter och inneh\u00e5ller mer fullst\u00e4ndiga och uppdaterade uppgifter \u00e4n den prelimin\u00e4ra m\u00e5nadsstatistiken. Publiceras med cirka 18 m\u00e5naders efters\u00e4lpning.",
      # Kvinnor
      "S_SYSS_KV",       "Sysselsättningsgrad, kvinnor",                 "Andel sysselsatta kvinnor 20–64 år. Slutlig statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 \u00e5rliga registeruppgifter och inneh\u00e5ller mer fullst\u00e4ndiga och uppdaterade uppgifter \u00e4n den prelimin\u00e4ra m\u00e5nadsstatistiken. Publiceras med cirka 18 m\u00e5naders efters\u00e4lpning.",
      "S_SYSS_KV_N",     "Antal sysselsatta, kvinnor",                   "Antal sysselsatta kvinnor 20–64 år. Slutlig statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 \u00e5rliga registeruppgifter och inneh\u00e5ller mer fullst\u00e4ndiga och uppdaterade uppgifter \u00e4n den prelimin\u00e4ra m\u00e5nadsstatistiken. Publiceras med cirka 18 m\u00e5naders efters\u00e4lpning.",
      "S_ARKR_KV",       "Andel i arbetskraften, kvinnor",               "Andel kvinnor 20–64 år i arbetskraften. Slutlig statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 \u00e5rliga registeruppgifter och inneh\u00e5ller mer fullst\u00e4ndiga och uppdaterade uppgifter \u00e4n den prelimin\u00e4ra m\u00e5nadsstatistiken. Publiceras med cirka 18 m\u00e5naders efters\u00e4lpning.",
      "S_ARKR_KV_N",     "Antal i arbetskraften, kvinnor",               "Antal kvinnor 20–64 år i arbetskraften. Slutlig statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 \u00e5rliga registeruppgifter och inneh\u00e5ller mer fullst\u00e4ndiga och uppdaterade uppgifter \u00e4n den prelimin\u00e4ra m\u00e5nadsstatistiken. Publiceras med cirka 18 m\u00e5naders efters\u00e4lpning.",
      "S_ARBL_KV",       "Arbetslöshetsgrad, kvinnor",                   "Andel arbetslösa av arbetskraften bland kvinnor 20–64 år. Slutlig statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 \u00e5rliga registeruppgifter och inneh\u00e5ller mer fullst\u00e4ndiga och uppdaterade uppgifter \u00e4n den prelimin\u00e4ra m\u00e5nadsstatistiken. Publiceras med cirka 18 m\u00e5naders efters\u00e4lpning.",
      "S_ARBL_KV_N",     "Antal arbetslösa, kvinnor",                    "Antal arbetslösa kvinnor 20–64 år. Slutlig statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 \u00e5rliga registeruppgifter och inneh\u00e5ller mer fullst\u00e4ndiga och uppdaterade uppgifter \u00e4n den prelimin\u00e4ra m\u00e5nadsstatistiken. Publiceras med cirka 18 m\u00e5naders efters\u00e4lpning.",
      # Män
      "S_SYSS_MAN",      "Sysselsättningsgrad, män",                     "Andel sysselsatta män 20–64 år. Slutlig statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 \u00e5rliga registeruppgifter och inneh\u00e5ller mer fullst\u00e4ndiga och uppdaterade uppgifter \u00e4n den prelimin\u00e4ra m\u00e5nadsstatistiken. Publiceras med cirka 18 m\u00e5naders efters\u00e4lpning.",
      "S_SYSS_MAN_N",    "Antal sysselsatta, män",                       "Antal sysselsatta män 20–64 år. Slutlig statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 \u00e5rliga registeruppgifter och inneh\u00e5ller mer fullst\u00e4ndiga och uppdaterade uppgifter \u00e4n den prelimin\u00e4ra m\u00e5nadsstatistiken. Publiceras med cirka 18 m\u00e5naders efters\u00e4lpning.",
      "S_ARKR_MAN",      "Andel i arbetskraften, män",                   "Andel män 20–64 år i arbetskraften. Slutlig statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 \u00e5rliga registeruppgifter och inneh\u00e5ller mer fullst\u00e4ndiga och uppdaterade uppgifter \u00e4n den prelimin\u00e4ra m\u00e5nadsstatistiken. Publiceras med cirka 18 m\u00e5naders efters\u00e4lpning.",
      "S_ARKR_MAN_N",    "Antal i arbetskraften, män",                   "Antal män 20–64 år i arbetskraften. Slutlig statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 \u00e5rliga registeruppgifter och inneh\u00e5ller mer fullst\u00e4ndiga och uppdaterade uppgifter \u00e4n den prelimin\u00e4ra m\u00e5nadsstatistiken. Publiceras med cirka 18 m\u00e5naders efters\u00e4lpning.",
      "S_ARBL_MAN",      "Arbetslöshetsgrad, män",                       "Andel arbetslösa av arbetskraften bland män 20–64 år. Slutlig statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 \u00e5rliga registeruppgifter och inneh\u00e5ller mer fullst\u00e4ndiga och uppdaterade uppgifter \u00e4n den prelimin\u00e4ra m\u00e5nadsstatistiken. Publiceras med cirka 18 m\u00e5naders efters\u00e4lpning.",
      "S_ARBL_MAN_N",    "Antal arbetslösa, män",                        "Antal arbetslösa män 20–64 år. Slutlig statistik fr\u00e5n SCB BAS (Befolkningens arbetsmarknadsstatus). Baseras p\u00e5 \u00e5rliga registeruppgifter och inneh\u00e5ller mer fullst\u00e4ndiga och uppdaterade uppgifter \u00e4n den prelimin\u00e4ra m\u00e5nadsstatistiken. Publiceras med cirka 18 m\u00e5naders efters\u00e4lpning."
    ),

    # Inga beräknade antal-KPI:er (SCB levererar allt)
    berakna_antal = list(),

    # Visningsnamn för frontend
    visningsnamn = list(
      "S_SYSS_TOT"   = "Sysselsättningsgrad",
      "S_SYSS_TOT_N" = "Antal sysselsatta",
      "S_ARKR_TOT"   = "Andel i arbetskraften",
      "S_ARKR_TOT_N" = "Antal i arbetskraften",
      "S_ARBL_TOT"   = "Arbetslöshetsgrad",
      "S_ARBL_TOT_N" = "Antal arbetslösa",

      "S_SYSS_INR"   = "Sysselsättningsgrad, inrikes födda",
      "S_SYSS_INR_N" = "Antal sysselsatta, inrikes födda",
      "S_ARKR_INR"   = "Andel i arbetskraften, inrikes födda",
      "S_ARKR_INR_N" = "Antal i arbetskraften, inrikes födda",
      "S_ARBL_INR"   = "Arbetslöshetsgrad, inrikes födda",
      "S_ARBL_INR_N" = "Antal arbetslösa, inrikes födda",

      "S_SYSS_UTR"   = "Sysselsättningsgrad, utrikes födda",
      "S_SYSS_UTR_N" = "Antal sysselsatta, utrikes födda",
      "S_ARKR_UTR"   = "Andel i arbetskraften, utrikes födda",
      "S_ARKR_UTR_N" = "Antal i arbetskraften, utrikes födda",
      "S_ARBL_UTR"   = "Arbetslöshetsgrad, utrikes födda",
      "S_ARBL_UTR_N" = "Antal arbetslösa, utrikes födda",

      "S_SYSS_KV"    = "Sysselsättningsgrad, kvinnor",
      "S_SYSS_KV_N"  = "Antal sysselsatta, kvinnor",
      "S_ARKR_KV"    = "Andel i arbetskraften, kvinnor",
      "S_ARKR_KV_N"  = "Antal i arbetskraften, kvinnor",
      "S_ARBL_KV"    = "Arbetslöshetsgrad, kvinnor",
      "S_ARBL_KV_N"  = "Antal arbetslösa, kvinnor",

      "S_SYSS_MAN"   = "Sysselsättningsgrad, män",
      "S_SYSS_MAN_N" = "Antal sysselsatta, män",
      "S_ARKR_MAN"   = "Andel i arbetskraften, män",
      "S_ARKR_MAN_N" = "Antal i arbetskraften, män",
      "S_ARBL_MAN"   = "Arbetslöshetsgrad, män",
      "S_ARBL_MAN_N" = "Antal arbetslösa, män"
    )
  )
}
