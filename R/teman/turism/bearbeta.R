# teman/turism/bearbeta.R — Förbearbetning av turismdata
# Beräknar härledda KPI:er som kräver lag-operationer eller data från andra teman:
#   - Tillväxttakt (år-över-år-förändring)
#   - Gästnätter per invånare (kräver befolkningsdata)

source("R/paket.R")

forbearbeta_turism <- function(radata) {

  # --- Tillväxtmått (år-över-år, procent) ---
  tillvaxt_specs <- list(
    list(bas_kpi = "T_GAST_TOT",   ny_kpi = "T_GAST_TILLVAXT"),
    list(bas_kpi = "T_LOGIINTAKT", ny_kpi = "T_INTAKT_TILLVAXT")
  )

  tillvaxt_rader <- list()
  for (spec in tillvaxt_specs) {
    tillvaxt_rader[[spec$ny_kpi]] <- radata |>
      filter(kpi == spec$bas_kpi) |>
      arrange(municipality_id, year) |>
      group_by(municipality_id) |>
      mutate(
        fg_ar = lag(value),
        value = if_else(
          !is.na(fg_ar) & fg_ar > 0,
          round((value - fg_ar) / fg_ar * 100, 1),
          NA_real_
        ),
        kpi = spec$ny_kpi
      ) |>
      ungroup() |>
      filter(!is.na(value)) |>
      select(-fg_ar)
  }

  # --- Gästnätter per invånare (kräver befolkningsdata) ---
  per_inv_rader <- NULL
  bef_fil <- "data/radata-befolkning.rds"
  if (file.exists(bef_fil)) {
    bef_radata <- readRDS(bef_fil)
    pop_data <- bef_radata |>
      filter(kpi == "N01951", gender == "T") |>
      select(municipality_id, year, pop = value) |>
      filter(!is.na(pop), pop > 0)

    gast_tot <- radata |>
      filter(kpi == "T_GAST_TOT") |>
      select(municipality_id, year, gastnatter = value)

    per_inv_rader <- gast_tot |>
      inner_join(pop_data, by = c("municipality_id", "year")) |>
      mutate(
        kpi = "T_GAST_PER_INV",
        value = round(gastnatter / pop, 1)
      ) |>
      select(-gastnatter, -pop)

    # Hämta municipality/type från befintliga rader
    meta_cols <- radata |>
      filter(kpi == "T_GAST_TOT") |>
      select(municipality_id, municipality, municipality_type, gender) |>
      distinct()

    per_inv_rader <- per_inv_rader |>
      left_join(meta_cols, by = "municipality_id") |>
      filter(!is.na(municipality))

    message(glue("  {nrow(per_inv_rader)} rader gästnätter per invånare"))
  } else {
    message("  OBS: Befolkningsdata saknas — hoppar över gästnätter per invånare")
  }

  # Sammanfoga allt
  nya_rader <- bind_rows(c(tillvaxt_rader, list(per_inv_rader)))
  message(glue("  {nrow(nya_rader)} härledda rader ({n_distinct(nya_rader$kpi)} KPI:er)"))

  bind_rows(radata, nya_rader)
}
