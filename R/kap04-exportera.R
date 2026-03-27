# kap04-exportera.R — Exportera alla teman till JSON för frontend
# Sammanfogar bearbetad data och metadata från alla teman till
# tre JSON-filer: data, meta, senaste.

source("R/paket.R")
source("R/teman/register.R")

message("=== kap04-exportera.R ===\n")

# Ladda alla tema-konfigurationer
tema_configs <- ladda_alla_teman()

# --- Samla data och metadata från alla teman ---
alla_bearbetade <- list()
alla_meta <- list()

for (tema_id in names(tema_configs)) {
  bearbetad_fil <- file.path("data", glue("bearbetad-{tema_id}.rds"))
  meta_fil <- file.path("data", glue("kpi-meta-{tema_id}.rds"))

  if (!file.exists(bearbetad_fil)) {
    warning(glue("Bearbetad data saknas för '{tema_id}' — hoppar över"))
    next
  }

  alla_bearbetade[[tema_id]] <- readRDS(bearbetad_fil)

  if (file.exists(meta_fil)) {
    alla_meta[[tema_id]] <- readRDS(meta_fil)
  }
}

bearbetad <- bind_rows(alla_bearbetade)
kpi_meta <- bind_rows(alla_meta)

message(glue("Totalt: {nrow(bearbetad)} rader, {nrow(kpi_meta)} KPI-metadata"))

# --- 1. Huvuddata (intern, exporteras inte till frontend) ---
halland_data <- bearbetad |>
  select(
    kpi_id, kpi_namn, enhet, tema,
    kommun_kod, kommun_namn, kommun_typ,
    ar, varde, riksvarde, diff_riket, diff_riket_pct,
    halland, rang_total, antal_kommuner,
    trend_1ar, trend_5ar, trend_10ar, trend_riktning,
    any_of(c("ki_lower", "ki_upper"))
  ) |>
  mutate(across(where(is.numeric), \(x) round(x, 2)))

# --- 1b. Kommun-register (för frontend-hydratisering) ---
kommun_reg <- bearbetad |>
  distinct(kommun_kod, kommun_namn, kommun_typ) |>
  select(k = kommun_kod, n = kommun_namn, t = kommun_typ)
write_json(kommun_reg, "data/kommun-register.json", pretty = FALSE)
message(glue("kommun-register.json: {nrow(kommun_reg)} enheter"))

# --- 2. Metadata ---
meta <- kpi_meta |>
  select(kpi_id, kpi_namn, beskrivning, enhet, tema, par_kpi_id)

write_json(meta, "data/halland-meta.json", pretty = TRUE)
message(glue("halland-meta.json: {nrow(meta)} KPI:er"))

# --- 3. Senaste år per KPI och kommun (för snabbladdning) ---
# Olika teman kan ha olika senaste år (t.ex. befolkning 2025, arbetsmarknad 2024)
senaste_per_kpi <- bearbetad |>
  group_by(kpi_id) |>
  summarise(senaste_ar = max(ar, na.rm = TRUE), .groups = "drop")

senaste <- bearbetad |>
  inner_join(senaste_per_kpi, by = "kpi_id") |>
  filter(ar == senaste_ar, halland == TRUE) |>
  select(
    kpi_id, kpi_namn, enhet,
    kommun_kod, kommun_namn, kommun_typ,
    ar, varde, riksvarde, diff_riket, diff_riket_pct,
    rang_total, antal_kommuner,
    trend_1ar, trend_5ar, trend_10ar, trend_riktning,
    any_of(c("ki_lower", "ki_upper"))
  ) |>
  mutate(across(where(is.numeric), \(x) round(x, 2)))

write_json(senaste, "data/halland-senaste.json", pretty = TRUE, na = "null")
message(glue("halland-senaste.json: {nrow(senaste)} rader (Halland, senaste per KPI)"))

# --- 4. Tema-konfiguration för frontend ---
# Exportera sektioner, visningsnamn och temafärger till JSON
tema_frontend <- list()
for (tema_id in names(tema_configs)) {
  config <- tema_configs[[tema_id]]
  tema_frontend[[length(tema_frontend) + 1]] <- list(
    tema_id       = config$tema_id,
    tema_namn     = config$tema_namn,
    tema_farg     = config$tema_farg,
    sektioner     = config$sektioner,
    visningsnamn  = config$visningsnamn
  )
}

write_json(tema_frontend, "data/halland-teman.json", pretty = TRUE, auto_unbox = TRUE)
message(glue("halland-teman.json: {length(tema_frontend)} teman"))

# --- 5. Per-tema data (slim-format för lazy loading) ---
# Korta nyckelnamn + bara kolumner som inte finns i meta/kommun-register.
# Frontend hydrerar kpi_namn, enhet, tema, kommun_namn, halland etc. vid laddning.
n01951_rader <- halland_data |> filter(kpi_id %in% c("N01951", "S_BEF_TOTALT"))
tema_filer <- character()
for (tid in names(alla_bearbetade)) {
  tema_data <- halland_data |> filter(tema == tid)
  if (tid != "befolkning" && nrow(n01951_rader) > 0) {
    tema_data <- bind_rows(tema_data, n01951_rader)
  }
  # Slim: korta nycklar, inga redundanta kolumner
  # Baskolumner + KI om det finns
  bas_kol <- c(k = "kpi_id", m = "kommun_kod", t = "kommun_typ", a = "ar",
               v = "varde", r = "riksvarde", rg = "rang_total",
               n = "antal_kommuner", t1 = "trend_1ar", t5 = "trend_5ar", t10 = "trend_10ar")
  if ("ki_lower" %in% names(tema_data)) {
    bas_kol <- c(bas_kol, kl = "ki_lower", kh = "ki_upper")
  }
  slim <- tema_data |> select(all_of(bas_kol))
  # Konjunkturdata: alla perioder från jan 2020, men begränsa enheter
  # för att hålla filstorleken hanterbar (Hallands kommuner + regioner + Riket)
  if (tid == "konjunktur") {
    hallands_koder <- c("1315", "1380", "1381", "1382", "1383", "1384")
    slim <- slim |>
      filter(a >= 202001) |>
      filter(t == "L" | m == "0000" | m %in% hallands_koder)
  }
  fil_namn <- glue("halland-data-{tid}.json")
  write_json(slim, file.path("data", fil_namn), pretty = FALSE, na = "null")
  tema_filer <- c(tema_filer, fil_namn)
  # Visa filstorlek
  mb <- round(file.size(file.path("data", fil_namn)) / 1e6, 1)
  message(glue("{fil_namn}: {nrow(slim)} rader ({mb} MB)"))
}

# --- Kopiera till frontend ---
app_data_dir <- "app/public/data"
if (dir.exists("app")) {
  dir.create(app_data_dir, recursive = TRUE, showWarnings = FALSE)
  filer <- c("halland-meta.json", "halland-senaste.json",
             "halland-teman.json", "kommun-register.json",
             tema_filer)
  for (f in filer) {
    file.copy(file.path("data", f), file.path(app_data_dir, f), overwrite = TRUE)
  }
  message(glue("\nKopierat {length(filer)} filer till app/public/data/"))
}

message("\nExport klar!")
