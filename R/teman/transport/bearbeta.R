# teman/transport/bearbeta.R — Tema-specifik förbearbetning
#
# Beräknar pendlingsmått:
#   1. Pendlingskvot och nettopendling från dag/nattbefolkning (alla nivåer)
#   2. In/utpendlingsandel per kommun (från ArRegPend1)
#   3. Regional in/utpendling från OD-matris (ArRegPend2) — korrekt utan
#      dubbelräkning av inomregional pendling

source("R/paket.R")
source("R/gemensam/hamta-scb.R")

HALLAND_KOMMUNER <- c("1315", "1380", "1381", "1382", "1383", "1384")
OD_URL <- "https://api.scb.se/OV0104/v1/doris/sv/ssd/AM/AM0210/AM0210F/ArRegPend2"
OD_CACHE <- "data/od-pendling-halland.rds"

forbearbeta_transport <- function(radata) {

  # ── 1. Hämta/cacha OD-matris och beräkna regional in/utpendling ──
  message("  Beräknar regional pendling från OD-matris...")

  if (file.exists(OD_CACHE) &&
      difftime(Sys.time(), file.info(OD_CACHE)$mtime, units = "days") < 30) {
    od_data <- readRDS(OD_CACHE)
    message("    Läser cachad OD-matris")
  } else {
    # Hämta: bor i Halland → arbetar var som helst
    od_ut_raw <- hamta_scb_data(OD_URL, list(
      Kon = "1+2",
      Bostadskommun = HALLAND_KOMMUNER,
      Arbetsstallekommun = c("*"),
      ContentsCode = "000000QT",
      Tid = as.character(2020:2024)
    ))
    Sys.sleep(1.5)
    # Hämta: arbetar i Halland ← bor var som helst
    od_in_raw <- hamta_scb_data(OD_URL, list(
      Kon = "1+2",
      Bostadskommun = c("*"),
      Arbetsstallekommun = HALLAND_KOMMUNER,
      ContentsCode = "000000QT",
      Tid = as.character(2020:2024)
    ))
    od_data <- list(ut = od_ut_raw, inn = od_in_raw)
    saveRDS(od_data, OD_CACHE)
  }

  # Beräkna per år:
  # Regional utpendlare = bor i Halland, arbetar UTANFÖR Halland
  # Regional inpendlare = bor UTANFÖR Halland, arbetar i Halland
  # Inomregional pendling = bor i Halland kommun A, arbetar i Halland kommun B

  varde_kol <- setdiff(names(od_data$ut), c("Kon", "Bostadskommun", "Arbetsstallekommun", "Tid"))
  varde_kol <- varde_kol[1]

  regional_ut <- od_data$ut |>
    mutate(
      ar = as.integer(Tid),
      antal = as.numeric(.data[[varde_kol]]),
      utanfor = !Arbetsstallekommun %in% HALLAND_KOMMUNER
    ) |>
    filter(!is.na(antal)) |>
    group_by(ar) |>
    summarise(
      utpendlare = sum(antal[utanfor]),
      inomregion_ut = sum(antal[!utanfor & Bostadskommun != Arbetsstallekommun]),
      .groups = "drop"
    )

  regional_in <- od_data$inn |>
    mutate(
      ar = as.integer(Tid),
      antal = as.numeric(.data[[varde_kol]]),
      utanfor = !Bostadskommun %in% HALLAND_KOMMUNER
    ) |>
    filter(!is.na(antal)) |>
    group_by(ar) |>
    summarise(
      inpendlare = sum(antal[utanfor]),
      .groups = "drop"
    )

  regional <- regional_ut |>
    inner_join(regional_in, by = "ar")

  message(glue("    Regional pendling {nrow(regional)} år:"))
  for (i in seq_len(nrow(regional))) {
    r <- regional[i, ]
    message(glue("    {r$ar}: in={r$inpendlare} ut={r$utpendlare} inom={r$inomregion_ut}"))
  }

  # Skapa KPI-rader för Region Halland
  region_kpier <- list()

  region_kpier[["S_INPENDL"]] <- regional |>
    mutate(kpi = "S_INPENDL", value = inpendlare, gender = "T",
           municipality_id = "0013", municipality = "Region Halland", municipality_type = "L",
           year = ar) |>
    select(kpi, municipality_id, year, gender, value, municipality, municipality_type)

  region_kpier[["S_UTPENDL"]] <- regional |>
    mutate(kpi = "S_UTPENDL", value = utpendlare, gender = "T",
           municipality_id = "0013", municipality = "Region Halland", municipality_type = "L",
           year = ar) |>
    select(kpi, municipality_id, year, gender, value, municipality, municipality_type)

  radata <- bind_rows(radata, bind_rows(region_kpier))

  # Ta bort eventuella OD-rader (de ska inte visas)
  radata <- radata |> filter(!kpi %in% c("S_OD_UT", "S_OD_IN"))

  # ── 2. Pendlingskvot och nettopendling (alla nivåer) ──
  message("  Beräknar pendlingskvot och nettopendling...")

  pendling <- radata |>
    filter(gender == "T", kpi %in% c("S_DAG_TOT", "S_NATT_TOT")) |>
    select(kpi, municipality_id, municipality, municipality_type, year, value) |>
    filter(!is.na(value)) |>
    pivot_wider(id_cols = c(municipality_id, municipality, municipality_type, year),
                names_from = kpi, values_from = value) |>
    filter(!is.na(S_DAG_TOT), !is.na(S_NATT_TOT), S_NATT_TOT > 0)

  netto <- pendling |>
    mutate(kpi = "C_PENDL_NETTO", value = round(S_DAG_TOT - S_NATT_TOT), gender = "T") |>
    select(kpi, municipality_id, municipality, municipality_type, year, gender, value)

  kvot <- pendling |>
    mutate(kpi = "C_PENDLKVOT", value = round(S_DAG_TOT / S_NATT_TOT, 2), gender = "T") |>
    select(kpi, municipality_id, municipality, municipality_type, year, gender, value)

  # ── 3. In/utpendlingsandel (kommun + region) ──
  inpendl <- radata |> filter(kpi == "S_INPENDL", gender == "T") |>
    select(municipality_id, year, inpendl = value)
  utpendl <- radata |> filter(kpi == "S_UTPENDL", gender == "T") |>
    select(municipality_id, year, utpendl = value)

  andelar <- pendling |>
    left_join(inpendl, by = c("municipality_id", "year")) |>
    left_join(utpendl, by = c("municipality_id", "year"))

  inandel <- andelar |>
    filter(!is.na(inpendl), S_DAG_TOT > 0) |>
    mutate(kpi = "C_INPENDL_ANDEL", value = round(inpendl / S_DAG_TOT * 100, 1), gender = "T") |>
    select(kpi, municipality_id, municipality, municipality_type, year, gender, value)

  utandel <- andelar |>
    filter(!is.na(utpendl), S_NATT_TOT > 0) |>
    mutate(kpi = "C_UTPENDL_ANDEL", value = round(utpendl / S_NATT_TOT * 100, 1), gender = "T") |>
    select(kpi, municipality_id, municipality, municipality_type, year, gender, value)

  message(glue("  {nrow(netto)} netto, {nrow(kvot)} kvot, {nrow(inandel)} inandel, {nrow(utandel)} utandel"))

  bind_rows(radata, netto, kvot, inandel, utandel)
}
