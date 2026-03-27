# kap01-hamta-kolada.R — Hämta data från Kolada
# VIKTIGT: Skriptet har inbyggd cache och hämtar INTE om data redan finns
# och är uppdaterad. Vid uppdatering hämtas bara nya perioder.
#
# Principer:
# 1. Specificera municipality-koder EXPLICIT (inte "hämta allt")
# 2. Filtrera kön=T direkt efter hämtning — minskar data med 2/3
# 3. Cacha med metadata (tidsstämpel, senaste period)
# 4. Inkrementell uppdatering — bara nya år hämtas
#
# Sätt force <- TRUE i .GlobalEnv innan source() för att tvinga omhämtning.

source("R/paket.R")

# ============================================================
# KONFIGURATION
# ============================================================

CACHE_DIR <- "data"
CACHE_META_FIL <- file.path(CACHE_DIR, "hamtning-meta.rds")
RADATA_FIL <- file.path(CACHE_DIR, "radata-befolkning.rds")
KOMMUN_REG_FIL <- file.path(CACHE_DIR, "kommun-register.rds")

# Minsta antal dagar mellan uppdateringskontroller
MIN_DAGAR_MELLAN_HAMTNINGAR <- 30

# KPI:er för befolkning & demografi
# Varje andel-KPI paras med sin antal-version
KPI_BEFOLKNING <- c(
  # Grundläggande
  "N01951",  # Invånare totalt, antal
  "N01963",  # Befolkningsförändring sedan fg. år, procent
  "N00927",  # Demografisk försörjningskvot
  "N00959",  # Medelålder, år

  # Åldersstruktur — andel + antal
  "N01994",  # Invånare 0-19 år, andel (%)
  "N01919",  # Invånare 0-19 år, antal
  "N01961",  # Invånare 20-64 år, andel (%)
  "N01955",  # Invånare 20-64 år, antal
  "N01812",  # Invånare 65-79 år, andel (%)
  "N01956",  # Invånare 65-79 år, antal
  "N01813",  # Invånare 80+, andel (%)
  "N01957",  # Invånare 80+, antal

  # Befolkningsförändring — procent + antal
  "N02012",  # Befolkningsförändring, antal

  # Befolkningsrörelse — andel + antal
  "N02100",  # Födelsenetto, andel (%)
  "N01803",  # Födelsenetto, antal
  "N02101",  # Inrikes flyttnetto, andel (%)
  "N01964",  # Inrikes flyttnetto, antal
  "N02102",  # Utrikes flyttnetto, andel (%)
  "N01806",  # Utrikes flyttnetto, antal

  # Befolkningens sammansättning
  "N02923",  # Kvinnor i befolkningen, andel (%)
  "N02926",  # Utrikes födda, andel (%) — inget antal-par i Kolada

  # Folkmängd — kompletterande
  "N01770",  # Summerad fruktsamhet, antal barn/kvinna
  "N02937"   # Invånare per kvadratkilometer, inv/kvm
)

STARTÅR <- 2010

# ============================================================
# HJÄLPFUNKTIONER
# ============================================================

hamta_kommun_register <- function() {
  if (file.exists(KOMMUN_REG_FIL)) {
    message("  Kommunregister finns cachat, läser från disk")
    return(readRDS(KOMMUN_REG_FIL))
  }
  message("  Hämtar kommunregister från Kolada (engångshämtning)...")
  kommun_df <- get_municipality(cache = TRUE)
  saveRDS(kommun_df, KOMMUN_REG_FIL)
  message(glue("  {nrow(kommun_df)} enheter sparade"))
  kommun_df
}

las_cache_meta <- function() {
  if (!file.exists(CACHE_META_FIL)) return(NULL)
  readRDS(CACHE_META_FIL)
}

spara_cache_meta <- function(kpi_ids, perioder, antal_rader) {
  meta <- list(
    tidsstampel = Sys.time(),
    kpi_ids = kpi_ids,
    perioder = perioder,
    senaste_period = max(as.integer(perioder)),
    antal_rader = antal_rader
  )
  saveRDS(meta, CACHE_META_FIL)
}

hamta_och_filtrera <- function(kpi_ids, kommun_koder, perioder) {
  # Hämta med explicita kommun-koder och filtrera direkt
  message(glue("  Hämtar {length(kpi_ids)} KPI:er × {length(perioder)} perioder × {length(kommun_koder)} kommuner..."))
  radata <- get_values(
    kpi = kpi_ids,
    municipality = kommun_koder,
    period = perioder,
    simplify = TRUE
  )
  message(glue("  Rådata: {nrow(radata)} rader"))

  # Filtrera till kön=T och kända kommuner direkt
  filtrerad <- radata |>
    filter(gender == "T", municipality_id %in% kommun_koder)
  message(glue("  Efter filtrering (kön=T): {nrow(filtrerad)} rader"))
  filtrerad
}

# ============================================================
# HUVUDLOGIK
# ============================================================

message("=== kap01-hamta-kolada.R ===\n")

# Tvinga omhämtning?
tvinga <- exists("force", envir = .GlobalEnv) && isTRUE(get("force", envir = .GlobalEnv))

# 1. Kommunregister
kommun_df <- hamta_kommun_register()
alla_kommun_koder <- kommun_df$id

# 2. Perioder
nuvarande_ar <- as.integer(format(Sys.Date(), "%Y"))
alla_perioder <- as.character(STARTÅR:nuvarande_ar)

# 3. Bestäm åtgärd
cache_meta <- las_cache_meta()
behover_hamta <- "full"  # full, inkrementell, eller ingen

if (!tvinga && !is.null(cache_meta) && file.exists(RADATA_FIL)) {
  dagar_sedan <- as.numeric(difftime(Sys.time(), cache_meta$tidsstampel, units = "days"))
  samma_kpier <- setequal(cache_meta$kpi_ids, KPI_BEFOLKNING)
  nya_perioder <- setdiff(alla_perioder, cache_meta$perioder)

  message(glue("Cache finns från {format(cache_meta$tidsstampel, '%Y-%m-%d %H:%M')}"))
  message(glue("  {cache_meta$antal_rader} rader, perioder {min(cache_meta$perioder)}-{max(cache_meta$perioder)}"))
  message(glue("  {round(dagar_sedan, 1)} dagar sedan senaste hämtning"))

  if (!samma_kpier) {
    message("\nKPI-listan har ändrats — fullständig omhämtning krävs")
    behover_hamta <- "full"
  } else if (length(nya_perioder) > 0) {
    message(glue("\nNya perioder att hämta: {paste(nya_perioder, collapse=', ')}"))
    behover_hamta <- "inkrementell"
  } else if (dagar_sedan < MIN_DAGAR_MELLAN_HAMTNINGAR) {
    message(glue("\n** Data är uppdaterad — HOPPAR ÖVER hämtning **"))
    message(glue("  (Sätt force <- TRUE innan körning för att tvinga, eller vänta {round(MIN_DAGAR_MELLAN_HAMTNINGAR - dagar_sedan)} dagar)"))
    behover_hamta <- "ingen"
  } else {
    # Gammal cache — snabbkontroll mot API (1 KPI, 1 kommun, 1 år)
    message("\nCache äldre än 30 dagar — kontrollerar mot API...")
    kontroll <- get_values(
      kpi = KPI_BEFOLKNING[1],
      municipality = "0000",
      period = as.character(nuvarande_ar),
      simplify = TRUE
    )
    if (nrow(kontroll) > 0) {
      message("  Ny data finns — inkrementell uppdatering")
      nya_perioder <- as.character(nuvarande_ar)
      behover_hamta <- "inkrementell"
    } else {
      message("  Ingen ny data — uppdaterar tidsstämpel")
      spara_cache_meta(KPI_BEFOLKNING, cache_meta$perioder, cache_meta$antal_rader)
      behover_hamta <- "ingen"
    }
  }
}

if (tvinga) {
  message("\nforce=TRUE — tvingar fullständig omhämtning")
  behover_hamta <- "full"
}

# 4. Utför åtgärd
if (behover_hamta == "full") {
  message(glue("\nFullständig hämtning: {length(KPI_BEFOLKNING)} KPI:er × {length(alla_perioder)} år × {length(alla_kommun_koder)} kommuner"))

  filtrerad <- hamta_och_filtrera(KPI_BEFOLKNING, alla_kommun_koder, alla_perioder)
  saveRDS(filtrerad, RADATA_FIL)
  spara_cache_meta(KPI_BEFOLKNING, alla_perioder, nrow(filtrerad))

  message(glue("\nUnika KPI:er: {length(unique(filtrerad$kpi))}"))
  message(glue("Unika kommuner/regioner: {length(unique(filtrerad$municipality_id))}"))
  message(glue("Perioder: {min(filtrerad$year)}-{max(filtrerad$year)}"))

} else if (behover_hamta == "inkrementell") {
  ny_data <- hamta_och_filtrera(KPI_BEFOLKNING, alla_kommun_koder, nya_perioder)

  befintlig <- readRDS(RADATA_FIL)
  kombinerad <- bind_rows(befintlig, ny_data)
  saveRDS(kombinerad, RADATA_FIL)
  spara_cache_meta(KPI_BEFOLKNING, alla_perioder, nrow(kombinerad))

  message(glue("\nUppdaterad: {nrow(kombinerad)} rader totalt (+{nrow(ny_data)} nya)"))
}

message("Klart!")
