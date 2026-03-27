# gemensam/bearbeta.R — Gemensam bearbetningslogik för alla teman
# Tar rådata + KPI-metadata → bearbetad data med rikssnitt, trender, ranking.
# Anropas av kap02-bearbeta.R per tema.

source("R/paket.R")

HALLAND_KODER <- c("1380", "1381", "1382", "1383", "1384", "1315", "0013")

#' Bearbeta ett tema: rikssnitt, differenser, trender, ranking
#' @param tema_config Lista med tema-konfiguration (tema_id, kpi_meta, beraknade_kpier)
#' @return Sparar bearbetad data till data/bearbetad-{tema_id}.rds
bearbeta_tema <- function(tema_config) {
  tema_id <- tema_config$tema_id
  message(glue("\n=== Bearbetar tema: {tema_config$tema_namn} ==="))

  # --- Läs in rådata ---
  radata_fil <- file.path("data", glue("radata-{tema_id}.rds"))
  if (!file.exists(radata_fil)) {
    stop(glue("Rådata saknas: {radata_fil}. Kör kap01-hamta.R först."))
  }
  radata <- readRDS(radata_fil)

  # --- Tema-specifik förbearbetning (summering, härledning, andelar) ---
  forbearbeta_fil <- file.path("R", "teman", tema_id, "bearbeta.R")
  if (file.exists(forbearbeta_fil)) {
    message(glue("  Kör förbearbetning: {forbearbeta_fil}"))
    source(forbearbeta_fil, local = TRUE)
    fn_namn <- paste0("forbearbeta_", tema_id)
    if (exists(fn_namn, inherits = FALSE)) {
      radata <- get(fn_namn)(radata)
    }
  }

  # Läs eventuell Excel-data och sammanfoga
  excel_fil <- file.path("data", glue("radata-{tema_id}-excel.rds"))
  if (file.exists(excel_fil)) {
    excel_data <- readRDS(excel_fil)
    radata <- bind_rows(radata, excel_data)
    message(glue("  Lade till {nrow(excel_data)} rader från Excel"))
  }

  kommun_df <- readRDS("data/kommun-register.rds")

  # --- Hämta KPI-beskrivningar från Kolada ---
  kpi_meta <- tema_config$kpi_meta
  # Kolada-KPI:er börjar med N eller U följt av siffra (t.ex. N07913, U15410).
  # Utesluter egna ID:n som N_SEK_TOT, B_TOT, S_SYSS_TOT etc.
  kolada_kpier <- kpi_meta$kpi_id[grepl("^[NU]\\d", kpi_meta$kpi_id)]

  if (length(kolada_kpier) > 0) {
    message("  Hämtar KPI-beskrivningar från Kolada...")
    kpi_kolada <- get_kpi(id = kolada_kpier)
    kpi_beskrivningar <- kpi_kolada |>
      select(kpi_id = id, kpi_namn = title, beskrivning = description) |>
      mutate(
        beskrivning = if_else(
          !is.na(beskrivning) & !grepl("Källa:", beskrivning),
          paste0(beskrivning, " Källa: RKA Kolada."),
          beskrivning
        )
      )
  } else {
    kpi_beskrivningar <- tibble(kpi_id = character(), kpi_namn = character(), beskrivning = character())
  }

  # Sammanfoga med beräknade/lokala KPI:er — lokala beskrivningar ÖVERSKRIVER Kolada
  if (!is.null(tema_config$beraknade_kpier) && nrow(tema_config$beraknade_kpier) > 0) {
    kpi_beskrivningar <- kpi_beskrivningar |>
      filter(!kpi_id %in% tema_config$beraknade_kpier$kpi_id) |>
      bind_rows(tema_config$beraknade_kpier)
  }

  # Koppla enheter och par från tema-config
  kpi_meta_full <- kpi_beskrivningar |>
    left_join(
      kpi_meta |> select(kpi_id, enhet, tema, par_kpi_id),
      by = "kpi_id"
    )

  # --- Könsuppdelade varianter (före gender-filtrering) ---
  kon_varianter <- NULL
  if (!is.null(tema_config$konuppdelning) && length(tema_config$konuppdelning) > 0) {
    message("  Skapar könsuppdelade KPI-varianter...")
    kon_varianter <- radata |>
      filter(
        kpi %in% tema_config$konuppdelning,
        gender %in% c("K", "M"),
        municipality_id %in% kommun_df$id
      ) |>
      mutate(
        kpi = paste0(kpi, ifelse(gender == "K", "_KV", "_MAN")),
        gender = "T"
      )
    message(glue("  {nrow(kon_varianter)} könsuppdelade rader"))
  }

  # --- Filtrera och strukturera ---
  kanda_koder <- kommun_df$id
  message(glue("  Filtrerar till {length(kanda_koder)} kända enheter"))

  # Sammanfoga basdata (gender=T) med eventuella könsvarianter
  bas_radata <- radata |>
    filter(gender == "T", municipality_id %in% kanda_koder)

  if (!is.null(kon_varianter) && nrow(kon_varianter) > 0) {
    bas_radata <- bind_rows(bas_radata, kon_varianter)
  }

  bearbetad <- bas_radata |>
    select(
      kpi_id = kpi,
      kommun_kod = municipality_id,
      kommun_namn = municipality,
      kommun_typ = municipality_type,
      ar = year,
      varde = value,
      any_of(c("ki_lower", "ki_upper"))
    ) |>
    left_join(kpi_meta_full, by = "kpi_id") |>
    filter(!is.na(varde))

  message(glue("  {nrow(bearbetad)} rader efter filtrering"))

  # --- Beräknade KPI:er (antal från andel × totalbefolkning) ---
  if (!is.null(tema_config$berakna_antal) && length(tema_config$berakna_antal) > 0) {
    message("  Beräknar antal-KPI:er...")

    # Hämta totalbefolkning — antingen från detta tema eller separat
    pop_data <- bearbetad |>
      filter(kpi_id %in% c("N01951", "S_BEF_TOTALT")) |>
      select(kommun_kod, ar, pop = varde)

    if (nrow(pop_data) == 0) {
      # Forsok lasa befolkningsdata fran befolknings-temat
      bef_fil <- "data/radata-befolkning.rds"
      if (file.exists(bef_fil)) {
        bef_radata <- readRDS(bef_fil)
        pop_data <- bef_radata |>
          filter(kpi %in% c("N01951", "S_BEF_TOTALT"), gender == "T") |>
          select(kommun_kod = municipality_id, ar = year, pop = value) |>
          filter(!is.na(pop))
      }
    }

    if (nrow(pop_data) > 0) {
      beraknade_rader <- list()
      for (spec in tema_config$berakna_antal) {
        andel_id <- spec$andel_kpi_id
        antal_id <- spec$antal_kpi_id
        antal_meta <- kpi_meta_full |> filter(kpi_id == antal_id)

        nya <- bearbetad |>
          filter(kpi_id == andel_id) |>
          inner_join(pop_data, by = c("kommun_kod", "ar")) |>
          mutate(
            kpi_id      = antal_id,
            kpi_namn    = if (nrow(antal_meta) > 0) antal_meta$kpi_namn[1] else NA_character_,
            beskrivning = if (nrow(antal_meta) > 0) antal_meta$beskrivning[1] else NA_character_,
            enhet       = "antal",
            par_kpi_id  = andel_id,
            varde       = round(varde / 100 * pop)
          ) |>
          select(-pop)

        beraknade_rader[[antal_id]] <- nya
      }
      beraknade <- bind_rows(beraknade_rader)
      message(glue("  {nrow(beraknade)} beräknade antal-rader"))
      bearbetad <- bind_rows(bearbetad, beraknade)
    } else {
      warning("  Kunde inte hitta totalbefolkning (N01951) — hoppar över beräknade KPI:er")
    }
  }

  # --- Rikssnitt ---
  rikssnitt <- bearbetad |>
    filter(kommun_kod == "0000") |>
    select(kpi_id, ar, riksvarde = varde)

  bearbetad <- bearbetad |>
    left_join(rikssnitt, by = c("kpi_id", "ar")) |>
    mutate(
      diff_riket = varde - riksvarde,
      diff_riket_pct = if_else(
        riksvarde != 0,
        round((varde - riksvarde) / riksvarde * 100, 1),
        NA_real_
      )
    )

  # --- Hallandsflagga ---
  bearbetad <- bearbetad |>
    mutate(
      halland = kommun_kod %in% HALLAND_KODER,
      region_halland = kommun_kod == "0013"
    )

  # --- Trender (1 år, 5 år och 10 år, per KPI) ---
  message("  Beräknar trender...")

  # Senaste år/månad per KPI (olika KPI:er kan ha olika senaste period)
  senaste_per_kpi <- bearbetad |>
    group_by(kpi_id) |>
    summarise(senaste_ar = max(ar, na.rm = TRUE), .groups = "drop")

  # Hämta senaste värde per KPI + kommun
  senaste_varden <- bearbetad |>
    inner_join(senaste_per_kpi, by = "kpi_id") |>
    filter(ar == senaste_ar) |>
    select(kpi_id, kommun_kod, v_nu = varde, senaste_ar)

  # Månadsdata (YYYYMM > 9999): N år tillbaka = senaste_ar - N*100
  # Årsdata (YYYY): N år tillbaka = senaste_ar - N
  senaste_varden <- senaste_varden |>
    mutate(ar_steg = if_else(senaste_ar > 9999L, 100L, 1L))

  # Hitta motsvarande period vid 1, 5 resp. 10 år tillbaka
  trend_1 <- senaste_varden |>
    mutate(mal_ar = senaste_ar - 1L * ar_steg) |>
    inner_join(
      bearbetad |> select(kpi_id, kommun_kod, ar, v_1 = varde),
      by = c("kpi_id", "kommun_kod", "mal_ar" = "ar")
    ) |>
    mutate(trend_1ar = v_nu - v_1) |>
    select(kpi_id, kommun_kod, trend_1ar)

  trend_5 <- senaste_varden |>
    mutate(mal_ar = senaste_ar - 5L * ar_steg) |>
    inner_join(
      bearbetad |> select(kpi_id, kommun_kod, ar, v_5 = varde),
      by = c("kpi_id", "kommun_kod", "mal_ar" = "ar")
    ) |>
    mutate(trend_5ar = v_nu - v_5) |>
    select(kpi_id, kommun_kod, trend_5ar)

  trend_10 <- senaste_varden |>
    mutate(mal_ar = senaste_ar - 10L * ar_steg) |>
    inner_join(
      bearbetad |> select(kpi_id, kommun_kod, ar, v_10 = varde),
      by = c("kpi_id", "kommun_kod", "mal_ar" = "ar")
    ) |>
    mutate(trend_10ar = v_nu - v_10) |>
    select(kpi_id, kommun_kod, trend_10ar)

  # Sammanfoga trender
  trend <- trend_1 |>
    full_join(trend_5, by = c("kpi_id", "kommun_kod")) |>
    full_join(trend_10, by = c("kpi_id", "kommun_kod")) |>
    mutate(
      trend_riktning = case_when(
        !is.na(trend_1ar) & trend_1ar > 0 ~ "upp",
        !is.na(trend_1ar) & trend_1ar < 0 ~ "ned",
        TRUE ~ "oforandrad"
      )
    )

  bearbetad <- bearbetad |>
    left_join(trend, by = c("kpi_id", "kommun_kod"))

  # --- Rangordning ---
  message("  Beräknar rangordning...")
  rangordning <- bearbetad |>
    filter(kommun_typ == "K") |>
    group_by(kpi_id, ar) |>
    mutate(
      rang_total = rank(-varde, ties.method = "min"),
      antal_kommuner = n()
    ) |>
    ungroup() |>
    select(kpi_id, kommun_kod, ar, rang_total, antal_kommuner)

  bearbetad <- bearbetad |>
    left_join(rangordning, by = c("kpi_id", "kommun_kod", "ar"))

  # --- Spara ---
  bearbetad_fil <- file.path("data", glue("bearbetad-{tema_id}.rds"))
  kpi_meta_fil <- file.path("data", glue("kpi-meta-{tema_id}.rds"))

  saveRDS(bearbetad, bearbetad_fil)
  saveRDS(kpi_meta_full, kpi_meta_fil)

  message(glue("  Klart! {nrow(bearbetad)} rader, senaste år: {max(bearbetad$ar, na.rm = TRUE)}"))
  invisible(bearbetad)
}
