# teman/befolkning/hamta.R — Hamtar befolkningsdata fran SCB
# Ersatter Kolada-hamtning med direkta SCB-anrop via pxweb.
# Beraknar alla KPI:er fran grunddata och sparar i standard-format.
#
# Tabeller som hamtas:
#   1. BefolkningNy       — folkmagd per alder (for aldersgrupper + total)
#   2. BefolkningNy       — folkmagd per kon (for kvinnoandel)
#   3. BefforandrKvRLK    — forandringskomponenter (fodda, doda, flytt)
#   4. FkvotHVD           — forsorjningskvot (forberaknad av SCB)
#   5. BefolkningMedelAlder — medelalder
#   6. FruktsamhetSum     — summerad fruktsamhet
#   7. BefArealTathetKon  — befolkningstathet
#   8. InrUtrFoddaRegAlKon — utrikes/inrikes fodda

source("R/paket.R")
source("R/gemensam/cache.R")

# === Konstanter ===

SCB_BASE <- "https://api.scb.se/OV0104/v1/doris/sv/ssd/BE/BE0101/"

SCB_TABELLER <- list(
  befolkning    = paste0(SCB_BASE, "BE0101A/BefolkningNy"),
  forandringar  = paste0(SCB_BASE, "BE0101G/BefforandrKvRLK"),
  forsorjning   = paste0(SCB_BASE, "BE0101A/FkvotHVD"),
  medelalder    = paste0(SCB_BASE, "BE0101B/BefolkningMedelAlder"),
  fruktsamhet   = paste0(SCB_BASE, "BE0101H/FruktsamhetSum"),
  tathet        = paste0(SCB_BASE, "BE0101C/BefArealTathetKon"),
  utrikes_fodda = paste0(SCB_BASE, "BE0101E/InrUtrFoddaRegAlKon"),
  fodda          = paste0(SCB_BASE, "BE0101H/FoddaK"),
  fodda_ckm      = paste0(SCB_BASE, "BE0101H/FoddaKCKM"),
  doda           = paste0(SCB_BASE, "BE0101I/DodaFodelsearK"),
  doda_ckm       = paste0(SCB_BASE, "BE0101I/DodaFodelsearKCKM"),
  flytt          = paste0(SCB_BASE, "BE0101J/Flyttningar97"),
  flytt_ckm      = paste0(SCB_BASE, "BE0101J/Flyttningar97CKM")
)

# === Hjalpfunktioner ===

#' Hamta data fran en SCB-tabell via pxweb
#' @param url Full URL till SCB-tabellen
#' @param query Namngiven lista med variabelfilter
#' @return data.frame med kodformat (column.name.type = "code")
hamta_scb <- function(url, query) {
  px <- pxweb::pxweb_get(url = url, query = pxweb::pxweb_query(query))
  as.data.frame(px,
    column.name.type    = "code",
    variable.value.type = "code",
    stringsAsFactors    = FALSE
  )
}

#' Hamta metadata fran en SCB-tabell
#' Returnerar en lista med variabelkoder, vardelistan och tidsperioder.
#' @param url Full URL till SCB-tabellen
#' @return Lista med: regioner, alder_koder, tid
hamta_scb_meta <- function(url) {
  meta <- pxweb::pxweb_get(url)
  resultat <- list()
  for (v in meta$variables) {
    resultat[[v$code]] <- v$values
  }
  resultat
}

#' Konvertera SCB-regionkoder till Kolada-format (4-siffrigt)
#' SCB: "00" (riket), "13" (lan), "1380" (kommun)
#' Kolada: "0000", "0013", "1380"
scb_till_kolada_kod <- function(scb_kod) {
  dplyr::case_when(
    scb_kod == "00" ~ "0000",
    nchar(scb_kod) == 2 ~ paste0("00", scb_kod),
    TRUE ~ scb_kod
  )
}

#' Skapa KPI-rader i standard radata-format
#' @param df data.frame fran SCB (med Region, Tid, vardekolumn)
#' @param kpi_id KPI-identifierare att tilldela
#' @param varde_kol Namn pa vardekolumnen
#' @param namn_map Namngiven vektor: kommun_kod -> kommunnamn
skapa_kpi_rader <- function(df, kpi_id, varde_kol, namn_map) {
  df |>
    transmute(
      kpi             = kpi_id,
      municipality_id = scb_till_kolada_kod(Region),
      year            = as.integer(Tid),
      gender          = "T",
      value           = as.numeric(.data[[varde_kol]]),
      municipality_type = if_else(nchar(Region) <= 2, "L", "K")
    ) |>
    mutate(municipality = unname(namn_map[municipality_id])) |>
    filter(!is.na(value))
}

#' Hamta data i chunk:ar for stora tabeller (>100 000 celler)
#' Delar upp regioner i grupper och hamtar sekventiellt.
#' @param url SCB-tabell-URL
#' @param base_query Query utan Region (laggs till per chunk)
#' @param region_koder Alla regionkoder att hamta
#' @param chunk_storlek Max regioner per API-anrop
hamta_chunked <- function(url, base_query, region_koder, chunk_storlek = 35) {
  grupper <- split(region_koder, ceiling(seq_along(region_koder) / chunk_storlek))
  message(glue("    Delar upp i {length(grupper)} chunk:ar a ~{chunk_storlek} regioner"))

  purrr::map_dfr(seq_along(grupper), function(i) {
    if (i > 1) Sys.sleep(1)  # Respektera SCB:s rate limit
    query <- base_query
    query$Region <- grupper[[i]]
    message(glue("    Chunk {i}/{length(grupper)}: {length(grupper[[i]])} regioner"))
    hamta_scb(url, query)
  })
}


# === Huvudfunktion ===

#' Hamta all befolkningsdata fran SCB
#' @param config Tema-konfiguration fran befolkning_config()
#' @param tvinga Tvinga omhamtning (ignorera cache)
hamta_befolkning <- function(config, tvinga = FALSE) {
  tema_id <- config$tema_id
  message(glue("\n--- SCB-hamtning: {config$tema_namn} ---"))

  # Perioder
  startar <- config$startar
  slutar <- as.integer(format(Sys.Date(), "%Y"))
  alla_perioder <- as.character(startar:slutar)

  # Cache-kontroll
  kpi_ids <- config$kpi_meta$kpi_id
  cache_status <- kontrollera_cache(tema_id, kpi_ids, alla_perioder,
                                     min_dagar = 30, tvinga = tvinga)
  if (cache_status$behov == "ingen") return(invisible(NULL))

  # Kommun-register for namnuppslag
  kommun_df <- readRDS("data/kommun-register.rds")
  namn_map <- setNames(kommun_df$title, kommun_df$id)

  # Hamta metadata fran BefolkningNy (referenstabell)
  message("  Hamtar metadata fran SCB...")
  bef_meta <- hamta_scb_meta(SCB_TABELLER$befolkning)
  alla_regioner <- bef_meta$Region
  alder_koder <- bef_meta$Alder
  bef_ar <- intersect(alla_perioder, bef_meta$Tid)

  # Filtrera bort storstad-aggregeringar (finns i vissa tabeller)
  alla_regioner <- alla_regioner[!alla_regioner %in% c("0010", "0020", "0030")]

  # Filtrera bort "tot" (totalt alder) — annars dubbelraknas folkmagden
  alder_koder <- alder_koder[alder_koder != "tot"]

  message(glue("  {length(alla_regioner)} regioner, {length(bef_ar)} ar ({min(bef_ar)}-{max(bef_ar)})"))

  # Samla alla KPI-rader
  alla_kpier <- list()


  # ================================================================
  # A. FOLKMAGD PER ALDER (BefolkningNy)
  #    Ger: S_BEF_TOTALT + 4 aldersgrupper (andel + antal) = 9 KPI:er
  # ================================================================
  message("\n  [A] Folkmagd per alder (BefolkningNy)...")

  alder_query <- list(
    Alder        = alder_koder,       # Alla ettarsklasser (0-100+)
    ContentsCode = "BE0101N1",        # Folkmagd
    Tid          = bef_ar
    # Civilstand och Kon UTELAMNADE -> eliminerade (summerade)
  )

  alder_df <- hamta_chunked(SCB_TABELLER$befolkning, alder_query, alla_regioner,
                             chunk_storlek = 35)
  message(glue("  Hamtat: {nrow(alder_df)} rader"))

  # Konvertera alderskoder till heltal (hanterar "100+" etc.)
  alder_df <- alder_df |>
    mutate(
      alder_num = suppressWarnings(as.integer(Alder)),
      alder_num = if_else(is.na(alder_num), 100L, alder_num)
    )

  # Tilldela aldersgrupper
  alder_df <- alder_df |>
    mutate(aldersgrupp = case_when(
      alder_num <= 19 ~ "0_19",
      alder_num <= 64 ~ "20_64",
      alder_num <= 79 ~ "65_79",
      TRUE            ~ "80_plus"
    ))

  # Aggregera per region, ar, aldersgrupp
  grupp_summa <- alder_df |>
    group_by(Region, Tid, aldersgrupp) |>
    summarise(antal = sum(BE0101N1, na.rm = TRUE), .groups = "drop")

  # Total folkmagd per region + ar (summa av alla alder)
  total_pop <- alder_df |>
    group_by(Region, Tid) |>
    summarise(total = sum(BE0101N1, na.rm = TRUE), .groups = "drop")

  # Berakna andelar
  grupp_med_andel <- grupp_summa |>
    left_join(total_pop, by = c("Region", "Tid")) |>
    mutate(andel = round(antal / total * 100, 1))

  # KPI: S_BEF_TOTALT
  alla_kpier[["S_BEF_TOTALT"]] <- total_pop |>
    transmute(
      kpi = "S_BEF_TOTALT",
      municipality_id = scb_till_kolada_kod(Region),
      year = as.integer(Tid), gender = "T",
      value = as.numeric(total),
      municipality_type = if_else(nchar(Region) <= 2, "L", "K")
    ) |>
    mutate(municipality = unname(namn_map[municipality_id]))

  # KPI: aldersgrupper (andel + antal)
  grupp_mappning <- tribble(
    ~aldersgrupp, ~andel_id,          ~antal_id,
    "0_19",       "S_BEF_0_19_ANDEL",  "S_BEF_0_19_ANTAL",
    "20_64",      "S_BEF_20_64_ANDEL", "S_BEF_20_64_ANTAL",
    "65_79",      "S_BEF_65_79_ANDEL", "S_BEF_65_79_ANTAL",
    "80_plus",    "S_BEF_80_ANDEL",    "S_BEF_80_ANTAL"
  )

  for (i in seq_len(nrow(grupp_mappning))) {
    g <- grupp_mappning$aldersgrupp[i]
    sub_df <- grupp_med_andel |> filter(aldersgrupp == g)

    alla_kpier[[grupp_mappning$antal_id[i]]] <- sub_df |>
      transmute(
        kpi = grupp_mappning$antal_id[i],
        municipality_id = scb_till_kolada_kod(Region),
        year = as.integer(Tid), gender = "T",
        value = as.numeric(antal),
        municipality_type = if_else(nchar(Region) <= 2, "L", "K")
      ) |>
      mutate(municipality = unname(namn_map[municipality_id]))

    alla_kpier[[grupp_mappning$andel_id[i]]] <- sub_df |>
      transmute(
        kpi = grupp_mappning$andel_id[i],
        municipality_id = scb_till_kolada_kod(Region),
        year = as.integer(Tid), gender = "T",
        value = andel,
        municipality_type = if_else(nchar(Region) <= 2, "L", "K")
      ) |>
      mutate(municipality = unname(namn_map[municipality_id]))
  }

  message(glue("  -> 9 KPI:er fran aldersdata"))


  # ================================================================
  # B. FOLKMAGD PER KON (BefolkningNy, Kon=2)
  #    Ger: S_KVINNOR_ANTAL, S_KVINNOR_ANDEL = 2 KPI:er
  # ================================================================
  message("\n  [B] Folkmagd per kon (BefolkningNy, kvinnor)...")
  Sys.sleep(1)

  kon_query <- list(
    Region       = alla_regioner,
    Kon          = "2",               # Kvinnor
    ContentsCode = "BE0101N1",
    Tid          = bef_ar
    # Civilstand och Alder UTELAMNADE -> summerade
  )

  kvinnor_df <- hamta_scb(SCB_TABELLER$befolkning, kon_query)
  message(glue("  Hamtat: {nrow(kvinnor_df)} rader"))

  # Berakna andel med total fran steg A
  kvinnor_med_andel <- kvinnor_df |>
    left_join(total_pop, by = c("Region", "Tid")) |>
    mutate(andel = round(BE0101N1 / total * 100, 1))

  alla_kpier[["S_KVINNOR_ANTAL"]] <- skapa_kpi_rader(
    kvinnor_df, "S_KVINNOR_ANTAL", "BE0101N1", namn_map)

  alla_kpier[["S_KVINNOR_ANDEL"]] <- kvinnor_med_andel |>
    transmute(
      kpi = "S_KVINNOR_ANDEL",
      municipality_id = scb_till_kolada_kod(Region),
      year = as.integer(Tid), gender = "T",
      value = andel,
      municipality_type = if_else(nchar(Region) <= 2, "L", "K")
    ) |>
    mutate(municipality = unname(namn_map[municipality_id])) |>
    filter(!is.na(value))

  message(glue("  -> 2 KPI:er"))


  # ================================================================
  # C. BEFOLKNINGSFORANDRINGAR (BefforandrKvRLK)
  #    Ger: forandring (antal + %), fodelsenetto, inrikes/utrikes netto
  #         (antal + promille) = 8 KPI:er
  # ================================================================
  message("\n  [C] Befolkningsforandringar (BefforandrKvRLK)...")
  Sys.sleep(1)

  forandr_meta <- hamta_scb_meta(SCB_TABELLER$forandringar)
  forandr_ar <- intersect(alla_perioder, forandr_meta$Tid)
  forandr_regioner <- intersect(alla_regioner, forandr_meta$Region)
  message(glue("  Perioder: {min(forandr_ar)}-{max(forandr_ar)}, {length(forandr_regioner)} regioner"))

  forandr_query <- list(
    Region       = forandr_regioner,
    Forandringar = c("100", "110", "135", "230", "260"),
    Period       = "hel",
    Kon          = "1+2",
    ContentsCode = "000002Z9",
    Tid          = forandr_ar
  )

  # Cellkontroll: regioner x 5 komponenter x ar
  forandr_celler <- length(forandr_regioner) * 5 * length(forandr_ar)
  if (forandr_celler > 90000) {
    forandr_df <- hamta_chunked(SCB_TABELLER$forandringar,
      list(Forandringar = c("100", "110", "135", "230", "260"),
           Period = "hel", Kon = "1+2", ContentsCode = "000002Z9",
           Tid = forandr_ar),
      forandr_regioner, chunk_storlek = 70)
  } else {
    forandr_df <- hamta_scb(SCB_TABELLER$forandringar, forandr_query)
  }
  message(glue("  Hamtat: {nrow(forandr_df)} rader"))

  # Pivotera forandringskomponenter till bred form
  varde_kol <- names(forandr_df)[sapply(forandr_df, is.numeric)][1]

  forandr_bred <- forandr_df |>
    select(Region, Tid, Forandringar, varde = all_of(varde_kol)) |>
    pivot_wider(
      id_cols     = c(Region, Tid),
      names_from  = Forandringar,
      values_from = varde,
      names_prefix = "f_"
    ) |>
    rename(
      folkmagd              = f_100,
      folkokning            = f_110,
      fodelseoverskott      = f_135,
      flyttoverskott_totalt = f_230,
      invandringsoverskott  = f_260
    ) |>
    mutate(
      # Inrikes netto = totalt flyttoverskott minus invandringsoverskott
      inrikes_netto = flyttoverskott_totalt - invandringsoverskott,
      # Foregaende ars folkmagd (for procentberakning)
      pop_prev = folkmagd - folkokning,
      # Procentuell forandring
      forandr_pct = if_else(pop_prev > 0, round(folkokning / pop_prev * 100, 2), NA_real_),
      # Per 1 000 invanare (anvander arets folkmagd som namnare)
      fodelsenetto_promille    = if_else(folkmagd > 0, round(fodelseoverskott / folkmagd * 1000, 1), NA_real_),
      inrikes_netto_promille   = if_else(folkmagd > 0, round(inrikes_netto / folkmagd * 1000, 1), NA_real_),
      utrikes_netto_promille   = if_else(folkmagd > 0, round(invandringsoverskott / folkmagd * 1000, 1), NA_real_)
    )

  # Skapa KPI-rader for varje forandringsindikator
  forandr_kpi_spec <- list(
    list(kol = "folkokning",              id = "S_BEF_FORANDR_ANTAL"),
    list(kol = "forandr_pct",             id = "S_BEF_FORANDR_PCT"),
    list(kol = "fodelseoverskott",        id = "S_FODELSENETTO_ANTAL"),
    list(kol = "fodelsenetto_promille",   id = "S_FODELSENETTO_PROMILLE"),
    list(kol = "inrikes_netto",           id = "S_INRIKES_NETTO_ANTAL"),
    list(kol = "inrikes_netto_promille",  id = "S_INRIKES_NETTO_PROMILLE"),
    list(kol = "invandringsoverskott",    id = "S_UTRIKES_NETTO_ANTAL"),
    list(kol = "utrikes_netto_promille",  id = "S_UTRIKES_NETTO_PROMILLE")
  )

  for (spec in forandr_kpi_spec) {
    alla_kpier[[spec$id]] <- forandr_bred |>
      transmute(
        kpi = spec$id,
        municipality_id = scb_till_kolada_kod(Region),
        year = as.integer(Tid), gender = "T",
        value = .data[[spec$kol]],
        municipality_type = if_else(nchar(Region) <= 2, "L", "K")
      ) |>
      mutate(municipality = unname(namn_map[municipality_id])) |>
      filter(!is.na(value))
  }

  message(glue("  -> 8 KPI:er fran forandringsdata"))


  # ================================================================
  # D. FORSORJNINGSKVOT (FkvotHVD)
  #    Ger: S_FORSORJ_TOTAL, S_FORSORJ_UNG, S_FORSORJ_ALD = 3 KPI:er
  # ================================================================
  message("\n  [D] Forsorjningskvot (FkvotHVD)...")
  Sys.sleep(1)

  fkvot_meta <- hamta_scb_meta(SCB_TABELLER$forsorjning)
  fkvot_ar <- intersect(alla_perioder, fkvot_meta$Tid)
  fkvot_regioner <- intersect(alla_regioner, fkvot_meta$Region)

  fkvot_query <- list(
    Region       = fkvot_regioner,
    ContentsCode = c("00000708", "00000707", "00000709"),
    Tid          = fkvot_ar
  )

  fkvot_df <- hamta_scb(SCB_TABELLER$forsorjning, fkvot_query)
  message(glue("  Hamtat: {nrow(fkvot_df)} rader"))

  # Flera ContentsCode -> separata kolumner i pxweb-output
  fkvot_kpi_spec <- list(
    list(kol = "00000708", id = "S_FORSORJ_TOTAL"),
    list(kol = "00000707", id = "S_FORSORJ_ALD"),
    list(kol = "00000709", id = "S_FORSORJ_UNG")
  )

  for (spec in fkvot_kpi_spec) {
    alla_kpier[[spec$id]] <- skapa_kpi_rader(
      fkvot_df, spec$id, spec$kol, namn_map)
  }

  message(glue("  -> 3 KPI:er"))


  # ================================================================
  # E. MEDELALDER (BefolkningMedelAlder)
  #    Ger: S_MEDELALDER = 1 KPI
  # ================================================================
  message("\n  [E] Medelalder (BefolkningMedelAlder)...")
  Sys.sleep(1)

  medel_meta <- hamta_scb_meta(SCB_TABELLER$medelalder)
  medel_ar <- intersect(alla_perioder, medel_meta$Tid)
  medel_regioner <- intersect(alla_regioner, medel_meta$Region)

  medel_query <- list(
    Region       = medel_regioner,
    Kon          = "1+2",
    ContentsCode = "BE0101G9",
    Tid          = medel_ar
  )

  medel_df <- hamta_scb(SCB_TABELLER$medelalder, medel_query)
  message(glue("  Hamtat: {nrow(medel_df)} rader"))

  alla_kpier[["S_MEDELALDER"]] <- skapa_kpi_rader(
    medel_df, "S_MEDELALDER", "BE0101G9", namn_map)

  message(glue("  -> 1 KPI"))


  # ================================================================
  # F. SUMMERAD FRUKTSAMHET (FruktsamhetSum)
  #    Ger: S_FRUKTSAMHET = 1 KPI
  # ================================================================
  message("\n  [F] Summerad fruktsamhet (FruktsamhetSum)...")
  Sys.sleep(1)

  frukt_meta <- hamta_scb_meta(SCB_TABELLER$fruktsamhet)
  frukt_ar <- intersect(alla_perioder, frukt_meta$Tid)
  frukt_regioner <- intersect(alla_regioner, frukt_meta$Region)

  frukt_query <- list(
    Region       = frukt_regioner,
    Kon          = "2",               # Kvinnor (standard for fruktsamhet)
    ContentsCode = "000001J4",
    Tid          = frukt_ar
  )

  frukt_df <- hamta_scb(SCB_TABELLER$fruktsamhet, frukt_query)
  message(glue("  Hamtat: {nrow(frukt_df)} rader"))

  alla_kpier[["S_FRUKTSAMHET"]] <- skapa_kpi_rader(
    frukt_df, "S_FRUKTSAMHET", "000001J4", namn_map)

  message(glue("  -> 1 KPI"))


  # ================================================================
  # G. BEFOLKNINGSTATHET (BefArealTathetKon)
  #    Ger: S_BEF_TATHET = 1 KPI
  # ================================================================
  message("\n  [G] Befolkningstathet (BefArealTathetKon)...")
  Sys.sleep(1)

  tathet_meta <- hamta_scb_meta(SCB_TABELLER$tathet)
  tathet_ar <- intersect(alla_perioder, tathet_meta$Tid)
  tathet_regioner <- intersect(alla_regioner, tathet_meta$Region)

  tathet_query <- list(
    Region       = tathet_regioner,
    Kon          = "1+2",
    ContentsCode = "BE0101U1",        # Invanare per kvm
    Tid          = tathet_ar
  )

  tathet_df <- hamta_scb(SCB_TABELLER$tathet, tathet_query)
  message(glue("  Hamtat: {nrow(tathet_df)} rader"))

  alla_kpier[["S_BEF_TATHET"]] <- skapa_kpi_rader(
    tathet_df, "S_BEF_TATHET", "BE0101U1", namn_map)

  message(glue("  -> 1 KPI"))


  # ================================================================
  # H. UTRIKES FODDA (InrUtrFoddaRegAlKon)
  #    Ger: S_UTRIKES_FODDA_ANTAL, S_UTRIKES_FODDA_ANDEL = 2 KPI:er
  # ================================================================
  message("\n  [H] Utrikes fodda (InrUtrFoddaRegAlKon)...")
  Sys.sleep(1)

  utrf_meta <- hamta_scb_meta(SCB_TABELLER$utrikes_fodda)
  utrf_ar <- intersect(alla_perioder, utrf_meta$Tid)
  utrf_regioner <- intersect(alla_regioner, utrf_meta$Region)

  # Hamta utrikes fodda (fodelseregion=11), eliminera Alder och Kon
  utrf_query <- list(
    Region         = utrf_regioner,
    Fodelseregion  = "11",            # Utrikes fodd
    ContentsCode   = "000001NS",
    Tid            = utrf_ar
    # Alder och Kon UTELAMNADE -> summerade
  )

  utrf_df <- hamta_scb(SCB_TABELLER$utrikes_fodda, utrf_query)
  message(glue("  Hamtat: {nrow(utrf_df)} rader"))

  # Antal
  alla_kpier[["S_UTRIKES_FODDA_ANTAL"]] <- skapa_kpi_rader(
    utrf_df, "S_UTRIKES_FODDA_ANTAL", "000001NS", namn_map)

  # Andel (behovs total fran steg A, begransat till gemensamma ar+regioner)
  utrf_med_pop <- utrf_df |>
    left_join(total_pop, by = c("Region", "Tid")) |>
    mutate(andel = if_else(!is.na(total) & total > 0,
                            round(`000001NS` / total * 100, 1), NA_real_))

  alla_kpier[["S_UTRIKES_FODDA_ANDEL"]] <- utrf_med_pop |>
    transmute(
      kpi = "S_UTRIKES_FODDA_ANDEL",
      municipality_id = scb_till_kolada_kod(Region),
      year = as.integer(Tid), gender = "T",
      value = andel,
      municipality_type = if_else(nchar(Region) <= 2, "L", "K")
    ) |>
    mutate(municipality = unname(namn_map[municipality_id])) |>
    filter(!is.na(value))

  message(glue("  -> 2 KPI:er"))


  # ================================================================
  # I. FODDA (FoddaK + FoddaKCKM)
  #    Ger: S_FODDA_ANTAL = 1 KPI
  # ================================================================
  message("\n  [I] Antal fodda (FoddaK)...")
  Sys.sleep(1)

  fodda_meta <- hamta_scb_meta(SCB_TABELLER$fodda)
  fodda_ar <- intersect(alla_perioder, fodda_meta$Tid)
  fodda_regioner <- intersect(alla_regioner, fodda_meta$Region)
  message(glue("  Perioder: {min(fodda_ar)}-{max(fodda_ar)}, {length(fodda_regioner)} regioner"))

  # Eliminera AlderModer och Kon -> total fodda per region+ar
  fodda_query <- list(
    Region       = fodda_regioner,
    ContentsCode = "BE0101E2",
    Tid          = fodda_ar
  )

  fodda_df <- hamta_scb(SCB_TABELLER$fodda, fodda_query)
  message(glue("  Hamtat: {nrow(fodda_df)} rader"))

  # Forsok hamta 2025 fran CKM-tabell
  tryCatch({
    fodda_ckm_query <- list(
      Region       = fodda_regioner,
      AlderModer   = "TotSA",
      Kon          = "TotSa",
      ContentsCode = "00000863",
      Tid          = "2025"
    )
    fodda_ckm_df <- hamta_scb(SCB_TABELLER$fodda_ckm, fodda_ckm_query)
    # Byt kolumnnamn sa de matchar
    if ("00000863" %in% names(fodda_ckm_df)) {
      fodda_ckm_df <- fodda_ckm_df |> rename(BE0101E2 = `00000863`)
    }
    fodda_df <- bind_rows(fodda_df, fodda_ckm_df)
    message(glue("  + {nrow(fodda_ckm_df)} rader fran CKM (2025)"))
  }, error = function(e) message(glue("  CKM 2025 ej tillganglig: {e$message}")))

  alla_kpier[["S_FODDA_ANTAL"]] <- skapa_kpi_rader(
    fodda_df, "S_FODDA_ANTAL", "BE0101E2", namn_map)

  message(glue("  -> 1 KPI"))


  # ================================================================
  # J. DODA (DodaFodelsearK + DodaFodelsearKCKM)
  #    Ger: S_DODA_ANTAL = 1 KPI
  # ================================================================
  message("\n  [J] Antal doda (DodaFodelsearK)...")
  Sys.sleep(1)

  doda_meta <- hamta_scb_meta(SCB_TABELLER$doda)
  doda_ar <- intersect(alla_perioder, doda_meta$Tid)
  doda_regioner <- intersect(alla_regioner, doda_meta$Region)
  message(glue("  Perioder: {min(doda_ar)}-{max(doda_ar)}, {length(doda_regioner)} regioner"))

  # Eliminera Alder och Kon -> total doda per region+ar
  doda_query <- list(
    Region       = doda_regioner,
    ContentsCode = "BE0101D8",
    Tid          = doda_ar
  )

  doda_df <- hamta_scb(SCB_TABELLER$doda, doda_query)
  message(glue("  Hamtat: {nrow(doda_df)} rader"))

  # Forsok hamta 2025 fran CKM-tabell
  tryCatch({
    doda_ckm_query <- list(
      Region       = doda_regioner,
      Alder        = "TotSA",
      Kon          = "TotSa",
      ContentsCode = "000008FN",
      Tid          = "2025"
    )
    doda_ckm_df <- hamta_scb(SCB_TABELLER$doda_ckm, doda_ckm_query)
    if ("000008FN" %in% names(doda_ckm_df)) {
      doda_ckm_df <- doda_ckm_df |> rename(BE0101D8 = `000008FN`)
    }
    doda_df <- bind_rows(doda_df, doda_ckm_df)
    message(glue("  + {nrow(doda_ckm_df)} rader fran CKM (2025)"))
  }, error = function(e) message(glue("  CKM 2025 ej tillganglig: {e$message}")))

  alla_kpier[["S_DODA_ANTAL"]] <- skapa_kpi_rader(
    doda_df, "S_DODA_ANTAL", "BE0101D8", namn_map)

  message(glue("  -> 1 KPI"))


  # ================================================================
  # K. FLYTTNINGAR (Flyttningar97 + Flyttningar97CKM)
  #    Ger: S_INVANDRING_ANTAL, S_UTVANDRING_ANTAL,
  #         S_INRIKES_INFLYTT_ANTAL, S_INRIKES_UTFLYTT_ANTAL = 4 KPI:er
  # ================================================================
  message("\n  [K] Flyttningar (Flyttningar97)...")
  Sys.sleep(1)

  flytt_meta <- hamta_scb_meta(SCB_TABELLER$flytt)
  flytt_ar <- intersect(alla_perioder, flytt_meta$Tid)
  flytt_regioner <- intersect(alla_regioner, flytt_meta$Region)
  # Filtrera bort storstad-aggregeringar
  flytt_regioner <- flytt_regioner[!flytt_regioner %in% c("0010", "0020", "0030")]
  message(glue("  Perioder: {min(flytt_ar)}-{max(flytt_ar)}, {length(flytt_regioner)} regioner"))

  # Eliminera Alder och Kon, hamta 4 komponentkoder
  flytt_query <- list(
    Region       = flytt_regioner,
    ContentsCode = c("BE0101AX", "BE0101AY", "BE0101A2", "BE0101A3"),
    Tid          = flytt_ar
  )

  flytt_df <- hamta_scb(SCB_TABELLER$flytt, flytt_query)
  message(glue("  Hamtat: {nrow(flytt_df)} rader"))

  # Forsok hamta 2025 fran CKM-tabell
  tryCatch({
    flytt_ckm_query <- list(
      Region       = flytt_regioner,
      Kon          = "TotSa",
      ContentsCode = c("00000869", "00000867", "0000086D", "0000086E"),
      Tid          = "2025"
    )
    flytt_ckm_df <- hamta_scb(SCB_TABELLER$flytt_ckm, flytt_ckm_query)
    # Byt kolumnnamn till samma som huvudtabellen
    ckm_mappning <- c("00000869" = "BE0101AX", "00000867" = "BE0101AY",
                       "0000086D" = "BE0101A2", "0000086E" = "BE0101A3")
    for (fran in names(ckm_mappning)) {
      if (fran %in% names(flytt_ckm_df)) {
        flytt_ckm_df <- flytt_ckm_df |> rename(!!ckm_mappning[fran] := all_of(fran))
      }
    }
    flytt_df <- bind_rows(flytt_df, flytt_ckm_df)
    message(glue("  + {nrow(flytt_ckm_df)} rader fran CKM (2025)"))
  }, error = function(e) message(glue("  CKM 2025 ej tillganglig: {e$message}")))

  # Skapa KPI-rader for varje flyttkomponent
  flytt_kpi_spec <- list(
    list(kol = "BE0101AX", id = "S_INVANDRING_ANTAL"),
    list(kol = "BE0101AY", id = "S_UTVANDRING_ANTAL"),
    list(kol = "BE0101A2", id = "S_INRIKES_INFLYTT_ANTAL"),
    list(kol = "BE0101A3", id = "S_INRIKES_UTFLYTT_ANTAL")
  )

  for (spec in flytt_kpi_spec) {
    alla_kpier[[spec$id]] <- skapa_kpi_rader(
      flytt_df, spec$id, spec$kol, namn_map)
  }

  message(glue("  -> 4 KPI:er"))


  # ================================================================
  # SAMMANFOGA, VALIDERA OCH SPARA
  # ================================================================
  message("\n  Sammanfogar alla KPI:er...")

  radata <- bind_rows(alla_kpier)

  # Validering
  n_kpier <- n_distinct(radata$kpi)
  n_regioner <- n_distinct(radata$municipality_id)
  n_ar <- n_distinct(radata$year)
  message(glue("  {nrow(radata)} rader: {n_kpier} KPI:er x {n_regioner} regioner x {n_ar} ar"))

  # Kontrollera att alla forvaentade KPI:er finns
  forvaentade_kpier <- config$kpi_meta$kpi_id
  saknade <- setdiff(forvaentade_kpier, unique(radata$kpi))
  if (length(saknade) > 0) {
    warning(glue("Saknade KPI:er: {paste(saknade, collapse = ', ')}"))
  }

  # Kontrollera Hallands kommuner
  halland_koder <- c("1315", "1380", "1381", "1382", "1383", "1384", "0013", "0000")
  saknade_halland <- setdiff(halland_koder, unique(radata$municipality_id))
  if (length(saknade_halland) > 0) {
    warning(glue("Saknade Hallandskommuner: {paste(saknade_halland, collapse = ', ')}"))
  }

  # Spara
  radata_fil <- file.path("data", glue("radata-{tema_id}.rds"))
  saveRDS(radata, radata_fil)
  message(glue("  Sparat: {radata_fil}"))

  # Uppdatera cache-metadata
  faktiska_ar <- as.character(sort(unique(radata$year)))
  spara_cache_meta(tema_id, forvaentade_kpier, faktiska_ar, nrow(radata))

  message(glue("\n  Klar! {nrow(radata)} rader, {n_kpier} KPI:er"))
  invisible(radata)
}
