# teman/naringsliv/config.R — Näringsliv
# Blandad källa: SCB BAS årsregister (3 tabeller) + Kolada (nyföretagande)
# SCB ArRegSektorSyss: Sysselsatta efter sektor
# SCB ArRegUtb: Sysselsatta efter bransch och utbildningsnivå
# SCB ArRegYrkStallning: Sysselsatta efter yrkesställning
# Kolada: Nystartade företag, företagsförekomster
#
# OBS: Många KPI:er kräver förbearbetning (summering, andelsberäkning)
# i R/teman/naringsliv/bearbeta.R — anropas via hook i gemensam/bearbeta.R

source("R/paket.R")

# SCB-tabellernas URL:er
SCB_SEKTOR_URL <- "https://api.scb.se/OV0104/v1/doris/sv/ssd/AM/AM0210/AM0210F/ArRegSektorSyss"
SCB_UTB_URL    <- "https://api.scb.se/OV0104/v1/doris/sv/ssd/AM/AM0210/AM0210F/ArRegUtb"
SCB_YRK_URL    <- "https://api.scb.se/OV0104/v1/doris/sv/ssd/AM/AM0210/AM0210F/ArRegYrkStallning"

# SNI2007-koder och korta ID:n (15 branscher)
SNI_BRANSCHER <- c("A", "B+C", "D+E", "F", "G", "H", "I", "J",
                    "K", "L", "M+N", "O", "P", "Q", "R+S+T+U")
SNI_ID <- c("A", "BC", "DE", "F", "G", "H", "I", "J",
            "K", "L", "MN", "O", "P", "Q", "RSTU")

# Branschnamn (för beskrivningar)
BRANSCH_NAMN <- c(
  A    = "Jordbruk, skogsbruk och fiske",
  BC   = "Tillverkning och utvinning",
  DE   = "Energi och milj\u00f6",
  F    = "Byggverksamhet",
  G    = "Handel",
  H    = "Transport och magasinering",
  I    = "Hotell och restaurang",
  J    = "IT och kommunikation",
  K    = "Finans och f\u00f6rs\u00e4kring",
  L    = "Fastighetsverksamhet",

  MN   = "F\u00f6retagstj\u00e4nster",
  O    = "Offentlig f\u00f6rvaltning",
  P    = "Utbildning",
  Q    = "V\u00e5rd och omsorg",
  RSTU = "\u00d6vriga tj\u00e4nster"
)

# Alla utbildningsnivåer (för summering till bransch-total)
ALLA_UTB_NIVA <- c("21", "3", "4", "5", "61", "US")

naringsliv_config <- function() {

  # Alla region-koder för ranking
  kommun_df <- readRDS("data/kommun-register.rds")
  alla_regioner <- kommun_df$id
  scb_regioner <- sub("^00", "", alla_regioner)
  scb_regioner <- scb_regioner[nchar(scb_regioner) > 0]

  # Perioder
  perioder <- as.character(2020:as.integer(format(Sys.Date(), "%Y")))

  # ── Bygg SCB-tabeller dynamiskt ──
  scb_tabeller <- list()

  # --- ArRegSektorSyss: sysselsatta per sektor × kön × födelseregion ---
  sek_typer <- list(list(arb = "010", id = "TOT"), list(arb = "030", id = "NARING"))
  dim_typer <- list(
    list(kon = "1+2", fr = "tot", suffix = ""),
    list(kon = "2",   fr = "tot", suffix = "_KV"),
    list(kon = "1",   fr = "tot", suffix = "_MAN"),
    list(kon = "1+2", fr = "in",  suffix = "_INR"),
    list(kon = "1+2", fr = "ut",  suffix = "_UTR")
  )
  for (sek in sek_typer) {
    for (dim in dim_typer) {
      kpi_id <- paste0("N_SEK_", sek$id, dim$suffix)
      scb_tabeller[[kpi_id]] <- list(
        url = SCB_SEKTOR_URL, kpi_id = kpi_id,
        query = list(
          Region = scb_regioner, ArbetsSektor = sek$arb,
          Kon = dim$kon, Alder = c("15-74"),
          Fodelseregion = dim$fr, ContentsCode = c("000002XT"),
          Tid = perioder
        ),
        region_kolumn = "Region", ar_kolumn = "Tid"
      )
    }
  }

  # --- ArRegUtb: sysselsatta per bransch ---
  # UtbildningsNiva har elimination=FALSE → måste inkluderas.
  # Varje bransch-query returnerar 6 rader per region×år (en per utb.nivå).
  # Summeras i R/teman/naringsliv/bearbeta.R.
  for (i in seq_along(SNI_BRANSCHER)) {
    kpi_id <- paste0("N_BR_", SNI_ID[i])
    scb_tabeller[[kpi_id]] <- list(
      url = SCB_UTB_URL, kpi_id = kpi_id,
      query = list(
        Region = scb_regioner, SNI2007 = SNI_BRANSCHER[i],
        UtbildningsNiva = ALLA_UTB_NIVA, Kon = c("1+2"),
        ContentsCode = c("000000QE"), Tid = perioder
      ),
      region_kolumn = "Region", ar_kolumn = "Tid"
    )
  }

  # Total sysselsatta från ArRegUtb (nämnare för bransch- och utb-andelar)
  scb_tabeller[["N_UTB_TOT"]] <- list(
    url = SCB_UTB_URL, kpi_id = "N_UTB_TOT",
    query = list(
      Region = scb_regioner, SNI2007 = c("A-U+US"),
      UtbildningsNiva = ALLA_UTB_NIVA, Kon = c("1+2"),
      ContentsCode = c("000000QE"), Tid = perioder
    ),
    region_kolumn = "Region", ar_kolumn = "Tid"
  )

  # --- ArRegUtb: sysselsatta per utbildningsnivå ---
  scb_tabeller[["N_UTB_FORGYM"]] <- list(
    url = SCB_UTB_URL, kpi_id = "N_UTB_FORGYM",
    query = list(
      Region = scb_regioner, SNI2007 = c("A-U+US"),
      UtbildningsNiva = c("21"), Kon = c("1+2"),
      ContentsCode = c("000000QE"), Tid = perioder
    ),
    region_kolumn = "Region", ar_kolumn = "Tid"
  )

  # Gymnasial = kod 3 + 4 → summeras i bearbeta
  scb_tabeller[["N_UTB_GYM"]] <- list(
    url = SCB_UTB_URL, kpi_id = "N_UTB_GYM",
    query = list(
      Region = scb_regioner, SNI2007 = c("A-U+US"),
      UtbildningsNiva = c("3", "4"), Kon = c("1+2"),
      ContentsCode = c("000000QE"), Tid = perioder
    ),
    region_kolumn = "Region", ar_kolumn = "Tid"
  )

  # Eftergymnasial = kod 5 + 61 → summeras i bearbeta
  scb_tabeller[["N_UTB_EFTGYM"]] <- list(
    url = SCB_UTB_URL, kpi_id = "N_UTB_EFTGYM",
    query = list(
      Region = scb_regioner, SNI2007 = c("A-U+US"),
      UtbildningsNiva = c("5", "61"), Kon = c("1+2"),
      ContentsCode = c("000000QE"), Tid = perioder
    ),
    region_kolumn = "Region", ar_kolumn = "Tid"
  )

  # --- ArRegYrkStallning: yrkesställning × födelseregion (15–74 år) ---
  yrk_koder  <- c("ANST",  "EGAB",  "EGF\u00d6R", "TOT")
  yrk_ids    <- c("ANST",  "EGAB",  "EGFOR",       "TOT")
  fr_koder   <- c("tot", "in", "ut")
  fr_suffix  <- c("",    "_INR", "_UTR")

  for (yi in seq_along(yrk_koder)) {
    for (fi in seq_along(fr_koder)) {
      kpi_id <- paste0("N_YRK_", yrk_ids[yi], fr_suffix[fi])
      scb_tabeller[[kpi_id]] <- list(
        url = SCB_YRK_URL, kpi_id = kpi_id,
        query = list(
          Region = scb_regioner, Yrkesstallning = yrk_koder[yi],
          Kon = c("1+2"), Alder = c("15-74"),
          Fodelseregion = fr_koder[fi],
          ContentsCode = c("000002XJ"), Tid = perioder
        ),
        region_kolumn = "Region", ar_kolumn = "Tid"
      )
    }
  }

  # --- ArRegYrkStallning: kvinnor per yrkesställning (andel kvinnor) ---
  for (yi in seq_along(yrk_koder)) {
    if (yrk_ids[yi] == "TOT") next
    kpi_id <- paste0("N_YRK_", yrk_ids[yi], "_KV")
    scb_tabeller[[kpi_id]] <- list(
      url = SCB_YRK_URL, kpi_id = kpi_id,
      query = list(
        Region = scb_regioner, Yrkesstallning = yrk_koder[yi],
        Kon = c("2"), Alder = c("15-74"),
        Fodelseregion = c("tot"),
        ContentsCode = c("000002XJ"), Tid = perioder
      ),
      region_kolumn = "Region", ar_kolumn = "Tid"
    )
  }

  # ── KPI-metadata (dynamiskt genererad) ──
  kpi_rows <- list()

  # Sektor × dimension (antal + andel för bas; tillväxt för alla)
  sek_ids_meta <- c("TOT", "NARING", "OFF")
  dim_suffixer <- c("", "_KV", "_MAN", "_INR", "_UTR")
  for (sek in sek_ids_meta) {
    for (ds in dim_suffixer) {
      kid <- paste0("N_SEK_", sek, ds)
      if (ds == "" && sek %in% c("NARING", "OFF")) {
        andel_id <- paste0(kid, "_A")
        kpi_rows <- c(kpi_rows, list(
          tibble(kpi_id = kid,      enhet = "antal",   tema = "naringsliv", par_kpi_id = andel_id),
          tibble(kpi_id = andel_id, enhet = "procent", tema = "naringsliv", par_kpi_id = kid)
        ))
      } else {
        kpi_rows <- c(kpi_rows, list(
          tibble(kpi_id = kid, enhet = "antal", tema = "naringsliv", par_kpi_id = NA_character_)
        ))
      }
    }
    for (ds in dim_suffixer) {
      tillv_id <- paste0("N_SEK_", sek, ds, "_TILLV")
      bas_id   <- paste0("N_SEK_", sek, ds)
      kpi_rows <- c(kpi_rows, list(
        tibble(kpi_id = tillv_id, enhet = "procent", tema = "naringsliv", par_kpi_id = bas_id)
      ))
    }
  }

  # Branscher (15 × 2: antal + andel)
  for (id in SNI_ID) {
    kpi_rows <- c(kpi_rows, list(
      tibble(kpi_id = paste0("N_BR_", id),      enhet = "antal",   tema = "naringsliv", par_kpi_id = paste0("N_BR_", id, "_A")),
      tibble(kpi_id = paste0("N_BR_", id, "_A"), enhet = "procent", tema = "naringsliv", par_kpi_id = paste0("N_BR_", id))
    ))
  }

  # Utbildning
  kpi_rows <- c(kpi_rows, list(
    tibble(kpi_id = "N_UTB_TOT",       enhet = "antal",   tema = "naringsliv", par_kpi_id = NA_character_),
    tibble(kpi_id = "N_UTB_FORGYM",    enhet = "antal",   tema = "naringsliv", par_kpi_id = "N_UTB_FORGYM_A"),
    tibble(kpi_id = "N_UTB_FORGYM_A",  enhet = "procent", tema = "naringsliv", par_kpi_id = "N_UTB_FORGYM"),
    tibble(kpi_id = "N_UTB_GYM",       enhet = "antal",   tema = "naringsliv", par_kpi_id = "N_UTB_GYM_A"),
    tibble(kpi_id = "N_UTB_GYM_A",     enhet = "procent", tema = "naringsliv", par_kpi_id = "N_UTB_GYM"),
    tibble(kpi_id = "N_UTB_EFTGYM",    enhet = "antal",   tema = "naringsliv", par_kpi_id = "N_UTB_EFTGYM_A"),
    tibble(kpi_id = "N_UTB_EFTGYM_A",  enhet = "procent", tema = "naringsliv", par_kpi_id = "N_UTB_EFTGYM")
  ))

  # Yrkesställning (3 kategorier × 3 födelseregion + 3 totaler)
  for (yrk in c("ANST", "EGAB", "EGFOR")) {
    for (fr in c("", "_INR", "_UTR")) {
      antal_id <- paste0("N_YRK_", yrk, fr)
      andel_id <- paste0("N_YRK_", yrk, fr, "_A")
      kpi_rows <- c(kpi_rows, list(
        tibble(kpi_id = antal_id, enhet = "antal",   tema = "naringsliv", par_kpi_id = andel_id),
        tibble(kpi_id = andel_id, enhet = "procent", tema = "naringsliv", par_kpi_id = antal_id)
      ))
    }
  }
  # Totaler (hjälp-KPI:er, ingen par)
  for (fr in c("", "_INR", "_UTR")) {
    kpi_rows <- c(kpi_rows, list(
      tibble(kpi_id = paste0("N_YRK_TOT", fr), enhet = "antal", tema = "naringsliv", par_kpi_id = NA_character_)
    ))
  }
  # Andel kvinnor per yrkesställning (antal + andel)
  for (yrk in c("ANST", "EGAB", "EGFOR")) {
    kpi_rows <- c(kpi_rows, list(
      tibble(kpi_id = paste0("N_YRK_", yrk, "_KV"),   enhet = "antal",   tema = "naringsliv", par_kpi_id = paste0("N_YRK_", yrk, "_KV_A")),
      tibble(kpi_id = paste0("N_YRK_", yrk, "_KV_A"), enhet = "procent", tema = "naringsliv", par_kpi_id = paste0("N_YRK_", yrk, "_KV"))
    ))
  }

  # Kolada
  kpi_rows <- c(kpi_rows, list(
    tibble(kpi_id = "N00999", enhet = "antal/1 000 inv", tema = "naringsliv", par_kpi_id = "N01003"),
    tibble(kpi_id = "N01003", enhet = "antal",           tema = "naringsliv", par_kpi_id = "N00999"),
    tibble(kpi_id = "N45700", enhet = "antal/1 000 inv", tema = "naringsliv", par_kpi_id = NA_character_)
  ))

  kpi_meta <- bind_rows(kpi_rows)

  # ── Beräknade/SCB-KPI:er (namn och beskrivningar) ──
  beskr_rows <- list()

  # Sektor × dimension + tillväxt
  sek_namn_b <- c(TOT = "totalt", NARING = "i n\u00e4ringslivet", OFF = "i offentlig sektor")
  dim_namn_b <- c(TOT = "", KV = ", kvinnor", MAN = ", m\u00e4n", INR = ", inrikes f\u00f6dda", UTR = ", utrikes f\u00f6dda")
  dim_map_b  <- c(TOT = "", KV = "_KV", MAN = "_MAN", INR = "_INR", UTR = "_UTR")
  for (sek in c("TOT", "NARING", "OFF")) {
    for (dk in c("TOT", "KV", "MAN", "INR", "UTR")) {
      ds  <- dim_map_b[dk]
      kid <- paste0("N_SEK_", sek, ds)
      n   <- paste0("Sysselsatta ", sek_namn_b[sek], dim_namn_b[dk])
      b   <- paste0("Antal sysselsatta dagbefolkning 15\u201374 \u00e5r ", sek_namn_b[sek], dim_namn_b[dk], ", efter arbetsst\u00e4llets bel\u00e4genhet. K\u00e4lla: Slutlig statistik fr\u00e5n SCB BAS \u00e5rsregister. Baseras p\u00e5 \u00e5rliga registeruppgifter.")
      beskr_rows <- c(beskr_rows, list(tibble(kpi_id = kid, kpi_namn = n, beskrivning = b)))
      if (ds == "" && sek %in% c("NARING", "OFF")) {
        beskr_rows <- c(beskr_rows, list(
          tibble(kpi_id = paste0(kid, "_A"),
                 kpi_namn = paste0("Andel ", sek_namn_b[sek]),
                 beskrivning = paste0("Andel av sysselsatta dagbefolkning 15\u201374 \u00e5r ", sek_namn_b[sek], ", efter arbetsst\u00e4llets bel\u00e4genhet. K\u00e4lla: Slutlig statistik fr\u00e5n SCB BAS \u00e5rsregister. Baseras p\u00e5 \u00e5rliga registeruppgifter."))
        ))
      }
      beskr_rows <- c(beskr_rows, list(
        tibble(kpi_id = paste0(kid, "_TILLV"),
               kpi_namn = paste0("\u00c5rlig tillv\u00e4xt, sysselsatta ", sek_namn_b[sek], dim_namn_b[dk]),
               beskrivning = paste0("\u00c5rlig procentuell f\u00f6r\u00e4ndring av antalet sysselsatta dagbefolkning ", sek_namn_b[sek], dim_namn_b[dk], ", efter arbetsst\u00e4llets bel\u00e4genhet. K\u00e4lla: Slutlig statistik fr\u00e5n SCB BAS \u00e5rsregister. Baseras p\u00e5 \u00e5rliga registeruppgifter."))
      ))
    }
  }

  # Branscher
  for (id in SNI_ID) {
    namn <- BRANSCH_NAMN[id]
    beskr_rows <- c(beskr_rows, list(
      tibble(kpi_id = paste0("N_BR_", id),
             kpi_namn = paste0("Sysselsatta, ", tolower(namn)),
             beskrivning = paste0("Antal sysselsatta dagbefolkning inom ", tolower(namn), ", efter arbetsst\u00e4llets bel\u00e4genhet. K\u00e4lla: Slutlig statistik fr\u00e5n SCB BAS \u00e5rsregister. Baseras p\u00e5 \u00e5rliga registeruppgifter.")),
      tibble(kpi_id = paste0("N_BR_", id, "_A"),
             kpi_namn = paste0("Andel ", tolower(namn)),
             beskrivning = paste0("Andel av samtliga sysselsatta dagbefolkning inom ", tolower(namn), ", efter arbetsst\u00e4llets bel\u00e4genhet. K\u00e4lla: Slutlig statistik fr\u00e5n SCB BAS \u00e5rsregister. Baseras p\u00e5 \u00e5rliga registeruppgifter."))
    ))
  }

  # Utbildning
  utb_namn <- c(FORGYM = "f\u00f6rgymnasial", GYM = "gymnasial", EFTGYM = "eftergymnasial")
  for (utb_id in names(utb_namn)) {
    namn <- utb_namn[utb_id]
    beskr_rows <- c(beskr_rows, list(
      tibble(kpi_id = paste0("N_UTB_", utb_id),
             kpi_namn = paste0("Sysselsatta, ", namn, " utbildning"),
             beskrivning = paste0("Antal sysselsatta dagbefolkning med ", namn, " utbildning, efter arbetsst\u00e4llets bel\u00e4genhet. K\u00e4lla: Slutlig statistik fr\u00e5n SCB BAS \u00e5rsregister. Baseras p\u00e5 \u00e5rliga registeruppgifter.")),
      tibble(kpi_id = paste0("N_UTB_", utb_id, "_A"),
             kpi_namn = paste0("Andel ", namn, " utbildning"),
             beskrivning = paste0("Andel av samtliga sysselsatta dagbefolkning med ", namn, " utbildning, efter arbetsst\u00e4llets bel\u00e4genhet. K\u00e4lla: Slutlig statistik fr\u00e5n SCB BAS \u00e5rsregister. Baseras p\u00e5 \u00e5rliga registeruppgifter."))
    ))
  }
  beskr_rows <- c(beskr_rows, list(
    tibble(kpi_id = "N_UTB_TOT", kpi_namn = "Sysselsatta totalt (utb.)", beskrivning = "Totalt antal sysselsatta dagbefolkning, alla utbildningsniv\u00e5er, efter arbetsst\u00e4llets bel\u00e4genhet. K\u00e4lla: Slutlig statistik fr\u00e5n SCB BAS \u00e5rsregister. Baseras p\u00e5 \u00e5rliga registeruppgifter.")
  ))

  # Yrkesställning
  yrk_namn <- c(ANST = "anst\u00e4llda", EGAB = "f\u00f6retagare i AB", EGFOR = "egenf\u00f6retagare", TOT = "totalt")
  fr_namn  <- c(TOT = "", INR = ", inrikes f\u00f6dda", UTR = ", utrikes f\u00f6dda")
  fr_map   <- c(TOT = "", INR = "_INR", UTR = "_UTR")
  for (yrk in c("ANST", "EGAB", "EGFOR")) {
    for (fr_key in c("TOT", "INR", "UTR")) {
      fr <- fr_map[fr_key]
      id_base <- paste0("N_YRK_", yrk, fr)
      namn_del <- paste0(yrk_namn[yrk], fr_namn[fr_key])
      beskr_rows <- c(beskr_rows, list(
        tibble(kpi_id = id_base,
               kpi_namn = paste0("Antal ", namn_del),
               beskrivning = paste0("Antal ", namn_del, " 15\u201374 \u00e5r, dagbefolkning efter arbetsst\u00e4llets bel\u00e4genhet. K\u00e4lla: Slutlig statistik fr\u00e5n SCB BAS \u00e5rsregister. Baseras p\u00e5 \u00e5rliga registeruppgifter.")),
        tibble(kpi_id = paste0(id_base, "_A"),
               kpi_namn = paste0("Andel ", namn_del),
               beskrivning = paste0("Andel ", namn_del, " av samtliga sysselsatta 15\u201374 \u00e5r, dagbefolkning efter arbetsst\u00e4llets bel\u00e4genhet. K\u00e4lla: Slutlig statistik fr\u00e5n SCB BAS \u00e5rsregister. Baseras p\u00e5 \u00e5rliga registeruppgifter."))
      ))
    }
  }
  for (fr_key in c("TOT", "INR", "UTR")) {
    fr <- fr_map[fr_key]
    beskr_rows <- c(beskr_rows, list(
      tibble(kpi_id = paste0("N_YRK_TOT", fr),
             kpi_namn = paste0("Sysselsatta totalt", fr_namn[fr_key]),
             beskrivning = paste0("Totalt antal sysselsatta", fr_namn[fr_key], " 15\u201374 \u00e5r, dagbefolkning efter arbetsst\u00e4llets bel\u00e4genhet. K\u00e4lla: Slutlig statistik fr\u00e5n SCB BAS \u00e5rsregister. Baseras p\u00e5 \u00e5rliga registeruppgifter."))
    ))
  }

  # Andel kvinnor per yrkesställning
  yrk_kv_namn <- c(ANST = "anst\u00e4llda", EGAB = "f\u00f6retagare i AB", EGFOR = "egenf\u00f6retagare")
  for (yrk in c("ANST", "EGAB", "EGFOR")) {
    beskr_rows <- c(beskr_rows, list(
      tibble(kpi_id = paste0("N_YRK_", yrk, "_KV"),
             kpi_namn = paste0("Antal kvinnor, ", yrk_kv_namn[yrk]),
             beskrivning = paste0("Antal kvinnor bland ", yrk_kv_namn[yrk], " 15\u201374 \u00e5r, dagbefolkning efter arbetsst\u00e4llets bel\u00e4genhet. K\u00e4lla: Slutlig statistik fr\u00e5n SCB BAS \u00e5rsregister. Baseras p\u00e5 \u00e5rliga registeruppgifter.")),
      tibble(kpi_id = paste0("N_YRK_", yrk, "_KV_A"),
             kpi_namn = paste0("Andel kvinnor, ", yrk_kv_namn[yrk]),
             beskrivning = paste0("Andel kvinnor bland ", yrk_kv_namn[yrk], " 15\u201374 \u00e5r, dagbefolkning efter arbetsst\u00e4llets bel\u00e4genhet. K\u00e4lla: Slutlig statistik fr\u00e5n SCB BAS \u00e5rsregister. Baseras p\u00e5 \u00e5rliga registeruppgifter."))
    ))
  }

  beraknade_kpier <- bind_rows(beskr_rows)

  # ── Visningsnamn för frontend ──
  visningsnamn <- list(
    N00999 = "Nystartade f\u00f6retag",
    N01003 = "Nystartade f\u00f6retag",
    N45700 = "F\u00f6retagsf\u00f6rekomster"
  )
  # Sektor × dimension + tillväxt
  sek_vis <- c(TOT = "Totalt", NARING = "N\u00e4ringslivet", OFF = "Offentlig sektor")
  dim_vis <- c(TOT = "", KV = ", kvinnor", MAN = ", m\u00e4n", INR = ", inrikes", UTR = ", utrikes")
  for (sek in c("TOT", "NARING", "OFF")) {
    for (dk in c("TOT", "KV", "MAN", "INR", "UTR")) {
      ds   <- dim_map_b[dk]
      kid  <- paste0("N_SEK_", sek, ds)
      namn <- paste0(sek_vis[sek], dim_vis[dk])
      visningsnamn[[kid]] <- namn
      if (ds == "" && sek %in% c("NARING", "OFF")) {
        visningsnamn[[paste0(kid, "_A")]] <- namn
      }
      visningsnamn[[paste0(kid, "_TILLV")]] <- paste0(namn, " (tillv\u00e4xt)")
    }
  }

  # Branscher
  for (id in SNI_ID) {
    visningsnamn[[paste0("N_BR_", id)]]      <- BRANSCH_NAMN[id]
    visningsnamn[[paste0("N_BR_", id, "_A")]] <- BRANSCH_NAMN[id]
  }

  # Utbildning
  utb_visning <- c(FORGYM = "F\u00f6rgymnasial", GYM = "Gymnasial", EFTGYM = "Eftergymnasial")
  for (utb_id in names(utb_visning)) {
    visningsnamn[[paste0("N_UTB_", utb_id)]]      <- utb_visning[utb_id]
    visningsnamn[[paste0("N_UTB_", utb_id, "_A")]] <- utb_visning[utb_id]
  }

  # Yrkesställning
  yrk_visning <- c(ANST = "Anst\u00e4llda", EGAB = "F\u00f6retagare i AB", EGFOR = "Egenf\u00f6retagare")
  fr_visning  <- c(TOT = "", INR = ", inrikes", UTR = ", utrikes")
  for (yrk in c("ANST", "EGAB", "EGFOR")) {
    for (fr_key in c("TOT", "INR", "UTR")) {
      fr <- fr_map[fr_key]
      namn <- paste0(yrk_visning[yrk], fr_visning[fr_key])
      visningsnamn[[paste0("N_YRK_", yrk, fr)]]      <- namn
      visningsnamn[[paste0("N_YRK_", yrk, fr, "_A")]] <- namn
    }
  }
  # Andel kvinnor
  for (yrk in c("ANST", "EGAB", "EGFOR")) {
    kv_namn <- paste0("Andel kvinnor, ", tolower(yrk_visning[yrk]))
    visningsnamn[[paste0("N_YRK_", yrk, "_KV")]]   <- kv_namn
    visningsnamn[[paste0("N_YRK_", yrk, "_KV_A")]] <- kv_namn
  }

  list(
    tema_id    = "naringsliv",
    tema_namn  = "N\u00e4ringsliv",
    tema_farg  = "rod",
    datakalla  = c("kolada", "scb"),
    startar    = 2020,

    kpier = c("N00999", "N01003", "N45700"),
    konuppdelning = character(0),
    scb_tabeller = scb_tabeller,

    sektioner = list(
      list(id = "sektor", namn = "Sysselsatta efter sektor",
           kpi_ids = c("N_SEK_TOT", "N_SEK_NARING", "N_SEK_OFF"),
           undersektioner = list(
             list(namn = "Kvinnor och m\u00e4n",
                  kpi_ids = c("N_SEK_TOT_KV", "N_SEK_TOT_MAN",
                              "N_SEK_NARING_KV", "N_SEK_NARING_MAN",
                              "N_SEK_OFF_KV", "N_SEK_OFF_MAN")),
             list(namn = "F\u00f6delseregion",
                  kpi_ids = c("N_SEK_TOT_INR", "N_SEK_TOT_UTR",
                              "N_SEK_NARING_INR", "N_SEK_NARING_UTR",
                              "N_SEK_OFF_INR", "N_SEK_OFF_UTR"))
           )),
      list(id = "tillvaxt", namn = "\u00c5rlig tillv\u00e4xt, sysselsatta",
           kpi_ids = c("N_SEK_TOT_TILLV", "N_SEK_NARING_TILLV", "N_SEK_OFF_TILLV"),
           undersektioner = list(
             list(namn = "Kvinnor och m\u00e4n",
                  kpi_ids = c("N_SEK_TOT_KV_TILLV", "N_SEK_TOT_MAN_TILLV",
                              "N_SEK_NARING_KV_TILLV", "N_SEK_NARING_MAN_TILLV",
                              "N_SEK_OFF_KV_TILLV", "N_SEK_OFF_MAN_TILLV")),
             list(namn = "F\u00f6delseregion",
                  kpi_ids = c("N_SEK_TOT_INR_TILLV", "N_SEK_TOT_UTR_TILLV",
                              "N_SEK_NARING_INR_TILLV", "N_SEK_NARING_UTR_TILLV",
                              "N_SEK_OFF_INR_TILLV", "N_SEK_OFF_UTR_TILLV"))
           )),
      list(id = "bransch", namn = "Sysselsatta efter bransch",
           kpi_ids = paste0("N_BR_", SNI_ID, "_A")),
      list(id = "utbildningsniva", namn = "Sysselsatta efter utbildningsniv\u00e5",
           kpi_ids = c("N_UTB_FORGYM_A", "N_UTB_GYM_A", "N_UTB_EFTGYM_A")),
      list(id = "yrkesstallning", namn = "Yrkesst\u00e4llning",
           kpi_ids = c("N_YRK_ANST_A", "N_YRK_EGAB_A", "N_YRK_EGFOR_A"),
           undersektioner = list(
             list(namn = "F\u00f6delseregion",
                  kpi_ids = c("N_YRK_ANST_INR_A", "N_YRK_ANST_UTR_A",
                              "N_YRK_EGAB_INR_A", "N_YRK_EGAB_UTR_A",
                              "N_YRK_EGFOR_INR_A", "N_YRK_EGFOR_UTR_A")),
             list(namn = "Kvinnor och m\u00e4n",
                  kpi_ids = c("N_YRK_ANST_KV_A", "N_YRK_EGAB_KV_A", "N_YRK_EGFOR_KV_A"))
           )),
      list(id = "foretagande", namn = "Nyf\u00f6retagande",
           kpi_ids = c("N00999", "N45700"))
    ),

    kpi_meta        = kpi_meta,
    beraknade_kpier = beraknade_kpier,
    berakna_antal   = list(),
    visningsnamn    = visningsnamn
  )
}
