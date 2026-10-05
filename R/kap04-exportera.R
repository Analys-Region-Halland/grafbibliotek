# kap04-exportera.R — Exportera alla teman till JSON för frontend
# Sammanfogar bearbetad data och metadata från alla teman till JSON-filer:
#   halland-meta.json, kommun-register.json
#   halland-tabell-<tema>.json  kompakt: det sidan laddar (tabellen, tooltipen, jämförelsen)
#   halland-data-<tema>.json    hela temat: laddas först när graf och karta öppnas
#
# Under övergången 2026 (se CLAUDE.md, AI-analys) ska den publicerade analysen inte skrivas
# över: kör då  Rscript -e 'kopiera_analys <- FALSE; source("R/kap04-exportera.R")'

source("R/paket.R")
source("R/teman/register.R")

message("=== kap04-exportera.R ===\n")

# Ladda alla tema-konfigurationer
tema_configs <- ladda_alla_teman()

# Frontendens tema-config: vilka KPI:er varje tabell visar
if (system2("node", c("app/scripts/exportera-teman.mjs", "data/frontend-teman.json")) != 0) {
  stop("Temainställningarna har fel, se utskriften ovan")
}
frontend_teman <- fromJSON("data/frontend-teman.json", simplifyVector = FALSE)
kpier_i_tabellen <- function(t) {
  unique(unlist(c(
    lapply(t$sektioner, function(s) c(s$kpiIds, lapply(s$undersektioner %||% list(), `[[`, "kpiIds"))),
    t$figurKpiIds
  )))
}

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

# Länens rang bland landets 21 regioner (1 = högsta värdet, samma regel som i frontend),
# så att även Hallands plats vid basåret kan visas
reg_rang <- halland_data |>
  filter(kommun_typ == "L", kommun_kod != "0000", !is.na(varde)) |>
  distinct(kpi_id, kommun_kod, ar, .keep_all = TRUE) |>
  group_by(kpi_id, ar) |>
  mutate(rang_l = as.integer(rank(-varde, ties.method = "min")), n_l = n()) |>
  ungroup() |>
  select(kpi_id, kommun_kod, ar, rang_l, n_l)
halland_data <- halland_data |>
  left_join(reg_rang, by = c("kpi_id", "kommun_kod", "ar")) |>
  mutate(rang_total = coalesce(rang_total, rang_l), antal_kommuner = coalesce(antal_kommuner, n_l)) |>
  select(-rang_l, -n_l)

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

# --- 3. Per-tema data (slim-format, laddas när graf och karta öppnas) ---
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
               v = "varde", r = "riksvarde", rg = "rang_total", n = "antal_kommuner")
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

# --- 4. Kompakta tabellfiler (det sidan laddar) ---
# Riket, Halland och de sex kommunerna med alla perioder och fält; övriga kommuner och
# regioner bara vid de perioder som någon av de åtta enheterna har som senaste, och bara
# värdet. Det räcker för tabellen (spår, plats, förändring), tooltipen och jämförelsen.
ATTA <- c("0000", "0013", "1315", "1380", "1381", "1382", "1383", "1384")
for (t in frontend_teman) {
  tid <- t$temaId
  kalla <- halland_data |>
    filter(kpi_id %in% kpier_i_tabellen(t)) |>
    distinct(kpi_id, kommun_kod, ar, .keep_all = TRUE)
  if (tid == "konjunktur") {
    # Samma urval av enheter och perioder som i hela temafilen
    kalla <- kalla |> filter(ar >= 202001, kommun_typ == "L" | kommun_kod %in% ATTA)
  }
  perioder <- kalla |>
    filter(kommun_kod %in% ATTA, !is.na(varde)) |>
    group_by(kpi_id, kommun_kod) |>
    summarise(ar = max(ar), .groups = "drop") |>
    distinct(kpi_id, ar)
  egna <- kalla |>
    filter(kommun_kod %in% ATTA) |>
    select(k = kpi_id, m = kommun_kod, t = kommun_typ, a = ar, v = varde, r = riksvarde,
           rg = rang_total, n = antal_kommuner, any_of(c(kl = "ki_lower", kh = "ki_upper")))
  ovriga <- kalla |>
    filter(!kommun_kod %in% ATTA, !is.na(varde)) |>
    semi_join(perioder, by = c("kpi_id", "ar")) |>
    select(k = kpi_id, m = kommun_kod, t = kommun_typ, a = ar, v = varde)
  fil_namn <- glue("halland-tabell-{tid}.json")
  # Saknade värden utelämnas (frontend läser dem som null)
  write_json(bind_rows(egna, ovriga), file.path("data", fil_namn), pretty = FALSE)
  tema_filer <- c(tema_filer, fil_namn)
  kb <- round(file.size(file.path("data", fil_namn)) / 1e3)
  message(glue("{fil_namn}: {nrow(egna) + nrow(ovriga)} rader ({kb} kB)"))
}

# --- Kopiera till frontend ---
app_data_dir <- "app/public/data"
if (dir.exists("app")) {
  dir.create(app_data_dir, recursive = TRUE, showWarnings = FALSE)
  filer <- c("halland-meta.json", "kommun-register.json", tema_filer)
  # AI-analysen (kap03) följer med om den finns, utom när kopiera_analys <- FALSE
  if (file.exists("data/halland-analys.json") && isTRUE(get0("kopiera_analys", ifnotfound = TRUE))) {
    filer <- c(filer, "halland-analys.json")
  }
  for (f in filer) {
    file.copy(file.path("data", f), file.path(app_data_dir, f), overwrite = TRUE)
  }
  message(glue("\nKopierat {length(filer)} filer till app/public/data/"))
}

message("\nExport klar!")
