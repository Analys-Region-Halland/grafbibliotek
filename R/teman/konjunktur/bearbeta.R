# teman/konjunktur/bearbeta.R — Förbearbetning av konjunkturdata
#
# Behåller ALLA månader som separata datapunkter.
# Perioden kodas som YYYYMM-heltal (t.ex. 202512) i year-fältet,
# vilket ger månatlig upplösning i sparklines och tidsserier.
#
# Beräknar:
#   - K_DAG_OFF: summa av O + P + Q (offentlig sektor)
#   - K_BYGG_TOT: summa av SMAHUS + FLERBO (bygglov alla hustyper)
#   - K_SYSS_FORANDR: förändring i pp mot samma månad föregående år
#   - K_ARBL_FORANDR: förändring i pp mot samma månad föregående år
#   - K_DAG_TILLVAXT: procentuell förändring mot samma månad föregående år

source("R/paket.R")

forbearbeta_konjunktur <- function(radata) {

  message("  Bearbetar månadsdata (alla månader behålls)...")

  # --- 1. Summera O + P + Q till K_DAG_OFF ---
  opq_kpier <- c("K_DAG_O_", "K_DAG_P_", "K_DAG_Q_")

  opq_data <- radata |>
    filter(kpi %in% opq_kpier) |>
    group_by(municipality_id, municipality, municipality_type, year, month,
             period, gender) |>
    summarise(value = sum(value, na.rm = TRUE), .groups = "drop") |>
    mutate(kpi = "K_DAG_OFF")

  message(glue("  K_DAG_OFF: {nrow(opq_data)} rader (summerat O+P+Q)"))

  radata <- radata |>
    filter(!kpi %in% opq_kpier) |>
    bind_rows(opq_data)

  # --- 1b. Slå ihop gamla + nya befolkningstabellen till K_BEF_TOT ---
  bef_old <- radata |> filter(kpi == "K_BEF_TOT_OLD")
  bef_new <- radata |> filter(kpi == "K_BEF_TOT_NEW")
  if (nrow(bef_old) > 0 || nrow(bef_new) > 0) {
    bef_tot <- bind_rows(bef_old, bef_new) |>
      mutate(kpi = "K_BEF_TOT")
    message(glue("  K_BEF_TOT: {nrow(bef_tot)} rader (sammanslaget gammal+ny tabell)"))
    radata <- radata |>
      filter(!kpi %in% c("K_BEF_TOT_OLD", "K_BEF_TOT_NEW")) |>
      bind_rows(bef_tot)
  }

  # --- 1c. Summera SMAHUS + FLERBO till K_BYGG_TOT ---
  bygg_kpier <- c("K_BYGG_SMAHUS", "K_BYGG_FLERBO")
  bygg_data <- radata |> filter(kpi %in% bygg_kpier)
  if (nrow(bygg_data) > 0) {
    bygg_tot <- bygg_data |>
      group_by(municipality_id, municipality, municipality_type, year, month,
               period, gender) |>
      summarise(value = sum(value, na.rm = TRUE), .groups = "drop") |>
      mutate(kpi = "K_BYGG_TOT")
    message(glue("  K_BYGG_TOT: {nrow(bygg_tot)} rader (summerat SMAHUS+FLERBO)"))
    radata <- bind_rows(radata, bygg_tot)
  }

  # --- 2. Koda period som YYYYMM i year-fältet ---
  # T.ex. 2025 + månad 12 → 202512
  radata <- radata |>
    mutate(year = year * 100L + month)

  message(glue("  {nrow(radata)} rader, period {min(radata$year)}–{max(radata$year)}"))

  # --- 3. Förändring mot samma månad föregående år (12-månadsdiff) ---

  # Procentenheter för andels-KPI:er
  pp_specs <- list(
    list(bas_kpi = "K_SYSS_TOT", ny_kpi = "K_SYSS_FORANDR"),
    list(bas_kpi = "K_ARBL_TOT", ny_kpi = "K_ARBL_FORANDR")
  )

  forandrings_rader <- list()
  for (spec in pp_specs) {
    forandrings_rader[[spec$ny_kpi]] <- radata |>
      filter(kpi == spec$bas_kpi) |>
      arrange(municipality_id, year) |>
      group_by(municipality_id, month) |>
      mutate(
        fg_ar_varde = lag(value, order_by = year),
        value = if_else(
          !is.na(fg_ar_varde),
          round(value - fg_ar_varde, 1),
          NA_real_
        ),
        kpi = spec$ny_kpi
      ) |>
      ungroup() |>
      filter(!is.na(value)) |>
      select(-fg_ar_varde)
  }

  # Procentuell förändring för antal-KPI:er
  forandrings_rader[["K_DAG_TILLVAXT"]] <- radata |>
    filter(kpi == "K_DAG_TOT") |>
    arrange(municipality_id, year) |>
    group_by(municipality_id, month) |>
    mutate(
      fg_ar_varde = lag(value, order_by = year),
      value = if_else(
        !is.na(fg_ar_varde) & fg_ar_varde > 0,
        round((value - fg_ar_varde) / fg_ar_varde * 100, 1),
        NA_real_
      ),
      kpi = "K_DAG_TILLVAXT"
    ) |>
    ungroup() |>
    filter(!is.na(value)) |>
    select(-fg_ar_varde)

  # K_BEF_FORANDR: absolut förändring mot 12 månader tidigare
  bef_data <- radata |> filter(kpi == "K_BEF_TOT")
  if (nrow(bef_data) > 0) {
    forandrings_rader[["K_BEF_FORANDR"]] <- bef_data |>
      arrange(municipality_id, year) |>
      group_by(municipality_id, month) |>
      mutate(
        fg_ar_varde = lag(value, order_by = year),
        value = if_else(
          !is.na(fg_ar_varde),
          round(value - fg_ar_varde),
          NA_real_
        ),
        kpi = "K_BEF_FORANDR"
      ) |>
      ungroup() |>
      filter(!is.na(value)) |>
      select(-fg_ar_varde)
  }

  # --- Turism: beräkna andel utländska och årsförändring ---
  # K_ANDEL_UTL: andel utländska gästnätter
  gast_sve <- radata |> filter(kpi == "K_GAST_SVE")
  gast_utl <- radata |> filter(kpi == "K_GAST_UTL")

  if (nrow(gast_sve) > 0 && nrow(gast_utl) > 0) {
    andel_utl <- gast_sve |>
      select(municipality_id, year, month, sve = value) |>
      inner_join(
        gast_utl |> select(municipality_id, year, month, utl = value),
        by = c("municipality_id", "year", "month")
      ) |>
      mutate(
        totalt = sve + utl,
        value = if_else(totalt > 0, round(utl / totalt * 100, 1), NA_real_)
      ) |>
      filter(!is.na(value)) |>
      transmute(
        kpi = "K_ANDEL_UTL", municipality_id, year, month,
        value,
        municipality = NA_character_, municipality_type = NA_character_,
        period = NA_character_, gender = "T"
      )

    # Hämta kommun-metadata
    if (nrow(andel_utl) > 0) {
      meta_ref <- radata |>
        distinct(municipality_id, municipality, municipality_type)
      andel_utl <- andel_utl |>
        select(-municipality, -municipality_type) |>
        left_join(meta_ref, by = "municipality_id")
    }

    forandrings_rader[["K_ANDEL_UTL"]] <- andel_utl
  }

  # K_GAST_TILLVAXT: procentuell förändring mot samma månad föregående år
  gast_tot <- radata |> filter(kpi == "K_GAST_TOT")
  if (nrow(gast_tot) > 0) {
    forandrings_rader[["K_GAST_TILLVAXT"]] <- gast_tot |>
      arrange(municipality_id, year) |>
      group_by(municipality_id, month) |>
      mutate(
        fg_ar_varde = lag(value, order_by = year),
        value = if_else(
          !is.na(fg_ar_varde) & fg_ar_varde > 0,
          round((value - fg_ar_varde) / fg_ar_varde * 100, 1),
          NA_real_
        ),
        kpi = "K_GAST_TILLVAXT"
      ) |>
      ungroup() |>
      filter(!is.na(value)) |>
      select(-fg_ar_varde)
  }

  nya_rader <- bind_rows(forandrings_rader)
  message(glue("  {nrow(nya_rader)} härledda rader ({n_distinct(nya_rader$kpi)} KPI:er)"))

  # --- 4. Sammanfoga och rensa ---
  resultat <- bind_rows(radata, nya_rader) |>
    select(-month, -period)

  message(glue("  Totalt: {nrow(resultat)} rader, {n_distinct(resultat$kpi)} KPI:er, {n_distinct(resultat$year)} månader"))

  resultat
}
