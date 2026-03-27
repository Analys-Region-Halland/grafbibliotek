# teman/naringsliv/bearbeta.R — Förbearbetning av näringslivsdata
# Anropas av gemensam/bearbeta.R via hook INNAN standardbearbetning.
#
# Tre steg:
# 1. Summera multi-rad-KPI:er (branscher × utb.nivåer, gymnasial 3+4, etc.)
# 2. Beräkna härledda KPI:er (offentlig sektor = totalt − näringsliv)
# 3. Beräkna andels-KPI:er (bransch/total × 100, etc.)

source("R/paket.R")

# KPI:er som har flera rader per (kpi, municipality_id, year) och behöver summeras
SUMMA_KPIS <- c(
  paste0("N_BR_", c("A","BC","DE","F","G","H","I","J","K","L","MN","O","P","Q","RSTU")),
  "N_UTB_TOT", "N_UTB_GYM", "N_UTB_EFTGYM"
)

#' Hjälpfunktion: beräkna andel = täljare / nämnare × 100
berakna_andel <- function(radata, taljare_kpi, namnare_kpi, ny_kpi) {
  taljare <- radata |>
    filter(kpi == taljare_kpi) |>
    select(municipality_id, year, gender, municipality, municipality_type, tal = value)
  namnare <- radata |>
    filter(kpi == namnare_kpi) |>
    select(municipality_id, year, gender, namn = value)

  taljare |>
    inner_join(namnare, by = c("municipality_id", "year", "gender")) |>
    mutate(
      kpi   = ny_kpi,
      value = if_else(namn > 0, round(tal / namn * 100, 1), NA_real_)
    ) |>
    select(kpi, municipality_id, year, gender, value, municipality, municipality_type)
}

#' Hjälpfunktion: beräkna årlig tillväxt (procentuell förändring år för år)
berakna_tillvaxt <- function(radata, bas_kpier) {
  bas <- radata |>
    filter(kpi %in% bas_kpier) |>
    arrange(kpi, municipality_id, gender, year)

  bas |>
    group_by(kpi, municipality_id, gender) |>
    mutate(
      prev_value = lag(value, order_by = year),
      tillvaxt   = if_else(
        !is.na(prev_value) & prev_value > 0,
        round((value - prev_value) / prev_value * 100, 1),
        NA_real_
      )
    ) |>
    ungroup() |>
    filter(!is.na(tillvaxt)) |>
    mutate(
      kpi   = paste0(kpi, "_TILLV"),
      value = tillvaxt
    ) |>
    select(kpi, municipality_id, year, gender, value, municipality, municipality_type)
}

#' Hjälpfunktion: beräkna differens = a − b
berakna_differens <- function(radata, a_kpi, b_kpi, ny_kpi) {
  a <- radata |> filter(kpi == a_kpi) |>
    select(municipality_id, year, gender, municipality, municipality_type, a_val = value)
  b <- radata |> filter(kpi == b_kpi) |>
    select(municipality_id, year, gender, b_val = value)

  a |>
    inner_join(b, by = c("municipality_id", "year", "gender")) |>
    mutate(kpi = ny_kpi, value = a_val - b_val) |>
    select(kpi, municipality_id, year, gender, value, municipality, municipality_type)
}

#' Huvudfunktion: förbearbeta rådata för näringslivstemat
#' @param radata Tibble med kolumner: kpi, municipality_id, year, gender, value, municipality, municipality_type
#' @return Modifierad tibble med summerade, härledda och andels-KPI:er
forbearbeta_naringsliv <- function(radata) {

  message("  Förbearbetar näringsliv: summering, härledning, andelar...")

  # ── 1. Summera multi-rad-KPI:er ──
  behover_summa <- radata |> filter(kpi %in% SUMMA_KPIS)
  ovriga        <- radata |> filter(!kpi %in% SUMMA_KPIS)

  if (nrow(behover_summa) > 0) {
    summerade <- behover_summa |>
      group_by(kpi, municipality_id, year, gender) |>
      summarise(
        value           = sum(value, na.rm = TRUE),
        municipality      = first(municipality),
        municipality_type = first(municipality_type),
        .groups = "drop"
      )
    n_fore  <- nrow(behover_summa)
    n_efter <- nrow(summerade)
    message(glue("  Summerade {n_fore} → {n_efter} rader ({length(SUMMA_KPIS)} KPI:er)"))
    radata <- bind_rows(ovriga, summerade)
  }

  # ── 2. Härledda KPI:er (offentlig sektor = totalt − näringsliv) ──
  off_suffixer <- c("", "_KV", "_MAN", "_INR", "_UTR")
  off_rader <- list()
  for (suf in off_suffixer) {
    off_rader[[suf]] <- berakna_differens(
      radata,
      paste0("N_SEK_TOT", suf),
      paste0("N_SEK_NARING", suf),
      paste0("N_SEK_OFF", suf)
    )
  }
  alla_off <- bind_rows(off_rader)
  message(glue("  Beräknade N_SEK_OFF-varianter: {nrow(alla_off)} rader ({length(off_suffixer)} KPI:er)"))
  radata <- bind_rows(radata, alla_off)

  # ── 3. Andels-KPI:er ──
  nya_andelar <- list()

  # Sektor-andelar (nämnare: N_SEK_TOT)
  nya_andelar[["N_SEK_NARING_A"]] <- berakna_andel(radata, "N_SEK_NARING", "N_SEK_TOT", "N_SEK_NARING_A")
  nya_andelar[["N_SEK_OFF_A"]]    <- berakna_andel(radata, "N_SEK_OFF",    "N_SEK_TOT", "N_SEK_OFF_A")

  # Bransch-andelar (nämnare: N_UTB_TOT = total sysselsatta från ArRegUtb)
  for (id in c("A","BC","DE","F","G","H","I","J","K","L","MN","O","P","Q","RSTU")) {
    kpi_antal <- paste0("N_BR_", id)
    kpi_andel <- paste0("N_BR_", id, "_A")
    nya_andelar[[kpi_andel]] <- berakna_andel(radata, kpi_antal, "N_UTB_TOT", kpi_andel)
  }

  # Utbildnings-andelar (nämnare: N_UTB_TOT)
  for (utb in c("FORGYM", "GYM", "EFTGYM")) {
    kpi_antal <- paste0("N_UTB_", utb)
    kpi_andel <- paste0("N_UTB_", utb, "_A")
    nya_andelar[[kpi_andel]] <- berakna_andel(radata, kpi_antal, "N_UTB_TOT", kpi_andel)
  }

  # Yrkesställnings-andelar (nämnare: N_YRK_TOT per födelseregion)
  for (yrk in c("ANST", "EGAB", "EGFOR")) {
    for (fr in c("", "_INR", "_UTR")) {
      taljare  <- paste0("N_YRK_", yrk, fr)
      namnare  <- paste0("N_YRK_TOT", fr)
      ny       <- paste0("N_YRK_", yrk, fr, "_A")
      nya_andelar[[ny]] <- berakna_andel(radata, taljare, namnare, ny)
    }
  }

  # Andel kvinnor per yrkesställning (nämnare: totalt antal per kategori)
  for (yrk in c("ANST", "EGAB", "EGFOR")) {
    taljare <- paste0("N_YRK_", yrk, "_KV")
    namnare <- paste0("N_YRK_", yrk)
    ny      <- paste0("N_YRK_", yrk, "_KV_A")
    nya_andelar[[ny]] <- berakna_andel(radata, taljare, namnare, ny)
  }

  alla_andelar <- bind_rows(nya_andelar)
  message(glue("  Beräknade {length(nya_andelar)} andels-KPI:er ({nrow(alla_andelar)} rader)"))

  radata <- bind_rows(radata, alla_andelar)

  # ── 4. Tillväxt-KPI:er (årlig procentuell förändring) ──
  sek_bas_kpier <- paste0("N_SEK_", rep(c("TOT", "NARING", "OFF"), each = 5),
                           rep(c("", "_KV", "_MAN", "_INR", "_UTR"), 3))
  tillvaxt <- berakna_tillvaxt(radata, sek_bas_kpier)
  message(glue("  Beräknade {length(unique(tillvaxt$kpi))} tillväxt-KPI:er ({nrow(tillvaxt)} rader)"))
  radata <- bind_rows(radata, tillvaxt)

  message(glue("  Förbearbetning klar: {nrow(radata)} rader totalt"))
  radata
}
