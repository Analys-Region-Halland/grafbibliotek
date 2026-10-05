# kap03-ai-analys.R — Underlag, kontroll och sammanställning av analystexterna
#
# Texterna skrivs av Claude Code i en session (Max-planen), inte via API. Skriptet gör
# allt runt omkring:
#
#   1. Bygger ett sifferunderlag per tema × enhet (Halland + sex kommuner) ur
#      data/bearbetad-<tema>.rds, med exakt de KPI:er som visas på sidan (frontendens
#      tema-config). Underlaget sparas i data/analys-underlag/<kod>_<tema>.md.
#   2. Listar texter som saknas eller är inaktuella (underlaget har ändrats) i
#      data/analys-uppdrag.md. Be Claude Code skriva dem: "skriv analystexterna i
#      data/analys-uppdrag.md". Stilreglerna står i R/analys/systemprompt.md.
#   3. Kontrollerar varje text: alla siffror ska finnas i underlaget, inga tankstreck,
#      inga procenttecken. Utfallet loggas i data/analys-kontroll.md.
#   4. Sammanställer aktuella texter till data/halland-analys.json (kap04 kopierar den
#      till app/public/data/).
#
# En text i data/analys-cache/<id>.json har formatet
#   { "hash": "<från uppdragslistan>", "period": "<från uppdragslistan>",
#     "res": { "rubrik": "", "ingress": "", "i_korthet": [{"ledtext": "", "text": ""}],
#              "stycken": [""],
#              "figurer": [{"efter": 0, "typ": "utveckling", "kpi": ["<id>"], "rubrik": ""}] } }
# Hashen knyter texten till underlaget; ändras datan blir texten inaktuell. Figurerna följer
# R/analys/figurregler.md och får bara använda KPI:erna i data/analys-underlag/<id>.figurer.json.
#
# Användning:  Rscript R/kap03-ai-analys.R

source("R/paket.R")
source("R/analys/kontroll.R")

message("=== kap03-ai-analys.R ===\n")

ENHETER <- tibble::tribble(
  ~kod,   ~namn,        ~typ,
  "0013", "Halland",    "L",
  "1380", "Halmstad",   "K",
  "1381", "Laholm",     "K",
  "1382", "Falkenberg", "K",
  "1383", "Varberg",    "K",
  "1384", "Kungsbacka", "K",
  "1315", "Hylte",      "K",
)
HALLAND_KOMMUNER <- ENHETER$kod[ENHETER$typ == "K"]

MANADER <- c("januari", "februari", "mars", "april", "maj", "juni", "juli",
             "augusti", "september", "oktober", "november", "december")

# --- Konfiguration från frontend (samma KPI:er som visas på sidan) ---
if (system2("node", c("app/scripts/exportera-teman.mjs", "data/frontend-teman.json")) != 0) {
  stop("Temainställningarna har fel, se utskriften ovan")
}
TEMAN <- fromJSON("data/frontend-teman.json", simplifyVector = FALSE)
# KPI:er där länets värde mäter något annat än kommunernas (pendling över länsgränsen):
# länet redovisas då inte som jämförelse i kommunernas underlag
LAN_EJ_JAMFORBAR <- unique(unlist(lapply(TEMAN, function(t) unlist(t$lanEjJamforbar))))

SYSTEMPROMPT <- read_file("R/analys/systemprompt.md")
BAKGRUND     <- read_file("R/analys/bakgrund.md")

dir.create("data/analys-underlag", showWarnings = FALSE)
dir.create("data/analys-cache", showWarnings = FALSE)

# ============================================================
# FORMATERING (samma decimalregler som KPI-korten)
# ============================================================

decimaler <- function(v, enhet) {
  if (is.na(v)) return(1)
  if (enhet == "antal" || abs(v) >= 1000) return(0)
  if (abs(v) < 10) return(2)
  1
}

fmt_sv <- function(x, dec, tecken = FALSE) {
  if (is.na(x)) return("uppgift saknas")
  s <- formatC(abs(x), format = "f", digits = dec, big.mark = " ", decimal.mark = ",")
  if (x < 0) paste0("-", s) else if (tecken && x > 0) paste0("+", s) else s
}

fmt_period <- function(p) {
  if (p > 9999) paste(MANADER[p %% 100], p %/% 100) else as.character(p)
}

enhet_text <- function(enhet) {
  switch(enhet, procent = "procent", antal = "antal", enhet)
}

diff_enhet <- function(enhet) if (enhet == "procent") "procentenheter" else enhet_text(enhet)

# ============================================================
# UNDERLAG
# ============================================================

#' Ett värde för en enhet och period
varde_for <- function(rows, kod, p) {
  v <- rows$varde[rows$kommun_kod == kod & rows$ar == p]
  if (length(v) == 0) NA_real_ else v[1]
}

#' Faktarader för en KPI och enhet
kpi_fakta <- function(rows, kpi_id, namn, beskr, enhet, kod, enhet_namn, kompakt = FALSE) {
  egna <- rows |> filter(kommun_kod == kod, !is.na(varde)) |> arrange(ar)
  if (nrow(egna) == 0) return(NULL)
  p <- max(egna$ar)
  manad <- p > 9999
  v <- varde_for(rows, kod, p)
  dec <- decimaler(v, enhet)
  f <- function(x, tecken = FALSE) fmt_sv(x, dec, tecken)

  riket <- varde_for(rows, "0000", p)
  hall  <- if (kpi_id %in% LAN_EJ_JAMFORBAR) NA_real_ else varde_for(rows, "0013", p)
  ut <- c(glue("### {namn} ({enhet_text(enhet)}, {fmt_period(p)})"))
  if (!kompakt && nzchar(beskr)) ut <- c(ut, glue("Mäter: {beskr}"))

  ut <- c(ut, glue("- {enhet_namn}: {f(v)}"))
  if (kod != "0013" && !is.na(hall)) ut <- c(ut, glue("- Halland (länet): {f(hall)}"))
  if (!is.na(riket)) ut <- c(ut, glue("- Riket: {f(riket)}"))
  if (!is.na(riket) && riket != v && enhet != "antal") {
    ut <- c(ut, glue("- Skillnad {enhet_namn} mot riket: {f(v - riket, TRUE)} {diff_enhet(enhet)}"))
  }
  if (kod != "0013" && !is.na(hall) && hall != v && enhet != "antal") {
    ut <- c(ut, glue("- Skillnad {enhet_namn} mot Halland: {f(v - hall, TRUE)} {diff_enhet(enhet)}"))
  }

  # Rangordning: kommuner bland 290, Halland bland 21 regioner (1 = högsta värdet)
  if (kod == "0013") {
    reg <- rows |> filter(kommun_typ == "L", kommun_kod != "0000", ar == p, !is.na(varde))
    if (nrow(reg) > 1) {
      rang <- sum(reg$varde > v) + 1
      ut <- c(ut, glue("- Plats bland landets {nrow(reg)} regioner: {rang} (1 = högsta värdet)"))
    }
  } else {
    r <- egna$rang_total[egna$ar == p]
    n <- egna$antal_kommuner[egna$ar == p]
    if (length(r) && !is.na(r) && !is.na(n) && n > 1) {
      ut <- c(ut, glue("- Plats bland landets {n} kommuner: {r} (1 = högsta värdet)"))
    }
  }

  # Hallands kommuner samma period, sorterade
  hk <- rows |> filter(kommun_kod %in% HALLAND_KOMMUNER, ar == p, !is.na(varde)) |>
    left_join(ENHETER, by = c("kommun_kod" = "kod")) |> arrange(desc(varde))
  if (nrow(hk) >= 2) {
    lista <- paste(glue("{hk$namn} {sapply(hk$varde, f)}"), collapse = "; ")
    ut <- c(ut, glue("- Hallands kommuner {fmt_period(p)} (högst först): {lista}"))
    if (kod != "0013") {
      ut <- c(ut, glue("- Plats bland Hallands {nrow(hk)} kommuner: {which(hk$kommun_kod == kod)}"))
    }
  }

  # Förändring i flera tidsperspektiv, från lång sikt till senaste året, så att ett enskilt
  # år kan sättas i relation till trenden (månadsdata: samma månad tidigare år)
  forsta <- min(egna$ar)
  steg <- if (manad) c(`5 år (samma månad)` = 500, `3 år (samma månad)` = 300, `1 år (samma månad året innan)` = 100)
    else c(`10 år` = 10, `5 år` = 5, `1 år` = 1)
  if (!manad && !kompakt && p - forsta >= 15) {
    steg <- c(setNames(p - forsta, glue("hela serien sedan {forsta}")), steg)
  }
  for (i in seq_along(steg)) {
    p0 <- p - steg[[i]]
    v0 <- varde_for(rows, kod, p0)
    if (is.na(v0)) next
    rad <- glue("- Förändring {names(steg)[i]}: {f(v - v0, TRUE)} {diff_enhet(enhet)} (från {f(v0)} {if (manad) 'i' else 'år'} {fmt_period(p0)})")
    if (enhet == "antal" && v0 != 0) {
      rad <- glue("{rad}, det vill säga {fmt_sv(100 * (v - v0) / abs(v0), 1, TRUE)} procent")
      ar_n <- if (manad) steg[[i]] / 100 else steg[[i]]
      if (ar_n >= 3 && v > 0 && v0 > 0) {
        rad <- glue("{rad} eller i genomsnitt {fmt_sv(100 * ((v / v0)^(1 / ar_n) - 1), 2, TRUE)} procent per år")
      }
    }
    r0 <- varde_for(rows, "0000", p0)
    if (!is.na(r0) && !is.na(riket) && kod != "0000") {
      if (enhet == "antal" && r0 != 0) {
        rad <- glue("{rad}; riket {fmt_sv(100 * (riket - r0) / abs(r0), 1, TRUE)} procent")
      } else if (enhet != "antal") {
        rad <- glue("{rad}; riket {fmt_sv(riket - r0, decimaler(riket, enhet), TRUE)} {diff_enhet(enhet)}")
      }
    }
    ut <- c(ut, rad)
  }

  # Värdena år för år (månadsdata: samma månad varje år), så att trendens form syns:
  # ett enskilt avvikande år ska kunna skiljas från ett trendbrott
  if (!kompakt) {
    serie <- if (manad) egna |> filter(ar %% 100 == p %% 100, ar >= p - 500) else egna |> filter(ar >= p - 10)
    if (nrow(serie) >= 3) {
      varden <- paste(vapply(seq_len(nrow(serie)), function(j) glue("{fmt_period(serie$ar[j])} {f(serie$varde[j])}"), ""),
                      collapse = "; ")
      ut <- c(ut, glue("- {enhet_namn} år för år: {varden}"))
    }
  }

  # Seriens yttervärden (bär påståenden som "högsta sedan")
  if (!kompakt && nrow(egna) >= 4) {
    mx <- egna[length(egna$varde) + 1 - which.max(rev(egna$varde)), ]
    mn <- egna[which.min(egna$varde), ]
    ut <- c(ut, glue("- Serien för {enhet_namn} {fmt_period(min(egna$ar))}–{fmt_period(p)}: högst {f(mx$varde)} ({fmt_period(mx$ar)}), lägst {f(mn$varde)} ({fmt_period(mn$ar)})"))
  }

  # Konfidensintervall (enkätdata)
  if ("ki_lower" %in% names(egna)) {
    kl <- egna$ki_lower[egna$ar == p]; kh <- egna$ki_upper[egna$ar == p]
    if (length(kl) && !is.na(kl) && !is.na(kh)) {
      ut <- c(ut, glue("- Enkätdata med 95 procents konfidensintervall {f(kl)}–{f(kh)}; skillnader inom intervallet ska inte tolkas som säkra"))
    }
  }
  paste(ut, collapse = "\n")
}

#' Hela underlaget för ett tema och en enhet
bygg_underlag <- function(tema, d, meta, kod, enhet_namn) {
  vn <- tema$visningsnamn
  delar <- c(glue("# Underlag: {tema$temaNamn}, {enhet_namn}"), "")
  rows_by <- split(d, d$kpi_id)
  namn_for <- function(k) {
    n <- vn[[k]] %||% meta$kpi_namn[meta$kpi_id == k][1]
    if (is.null(n) || is.na(n)) k else str_trim(gsub("\\s*\\(%\\)|%", "", n))
  }
  for (s in tema$sektioner) {
    sek <- c()
    huvud <- unlist(s$kpiIds)
    for (k in huvud) {
      if (is.null(rows_by[[k]])) next
      m <- meta[meta$kpi_id == k, ][1, ]
      beskr <- str_trim(sub("\\s*Källa:.*$", "", m$beskrivning %||% ""))
      txt <- kpi_fakta(rows_by[[k]], k, namn_for(k), beskr, m$enhet, kod, enhet_namn)
      if (!is.null(txt)) sek <- c(sek, txt)
      # Indikatorns uppdelningar direkt efter den (delAv, annars sektionens första indikator)
      for (us in s$undersektioner %||% list()) {
        if (!identical(us$delAv %||% huvud[1], k)) next
        for (u in unlist(us$kpiIds)) {
          if (is.null(rows_by[[u]])) next
          mu <- meta[meta$kpi_id == u, ][1, ]
          txt <- kpi_fakta(rows_by[[u]], u, glue("{namn_for(u)} [uppdelning av {namn_for(k)}: {us$namn}]"), "",
                           mu$enhet, kod, enhet_namn, kompakt = TRUE)
          if (!is.null(txt)) sek <- c(sek, txt)
        }
      }
    }
    if (length(sek) > 0) {
      rubrik <- if (!is.null(s$gruppRubrik) && s$gruppRubrik != s$namn) glue("{s$gruppRubrik}: {s$namn}") else s$namn
      delar <- c(delar, glue("## {rubrik}"), "", paste(sek, collapse = "\n\n"), "")
    }
  }
  if (tema$temaId == "befolkning") delar <- c(delar, befolkningens_komponenter(d, kod, enhet_namn))
  paste(delar, collapse = "\n")
}

#' Befolkningsförändringen uppdelad på komponenter (antal), senaste fem åren.
#' Gör det möjligt att väga vad som bär tillväxten i stället för att gissa.
befolkningens_komponenter <- function(d, kod, enhet_namn) {
  ids <- c(total = "S_BEF_FORANDR_ANTAL", fodelse = "S_FODELSENETTO_ANTAL",
           inrikes = "S_INRIKES_NETTO_ANTAL", utrikes = "S_UTRIKES_NETTO_ANTAL")
  x <- d |> filter(kommun_kod == kod, kpi_id %in% ids, !is.na(varde)) |> select(kpi_id, ar, varde)
  if (nrow(x) == 0) return(character())
  v <- function(id, a) { r <- x$varde[x$kpi_id == id & x$ar == a]; if (length(r)) r[1] else NA_real_ }
  ar <- sort(unique(x$ar[x$kpi_id == ids[["total"]]]), decreasing = TRUE)[1:10]
  ar <- sort(ar[!is.na(ar)])
  f <- function(z) fmt_sv(z, 0, TRUE)
  rader <- vapply(ar, function(a) glue(
    "- {a}: total förändring {f(v(ids[['total']], a))}; födelsenetto {f(v(ids[['fodelse']], a))}; ",
    "inrikes flyttnetto {f(v(ids[['inrikes']], a))}; utrikes flyttnetto (invandringsöverskott) {f(v(ids[['utrikes']], a))}"), "")
  summa <- function(id, aren) sum(vapply(aren, function(a) v(id, a), 0), na.rm = TRUE)
  summarad <- function(aren) glue(
    "- Summa {min(aren)}–{max(aren)}: total förändring {f(summa(ids[['total']], aren))}; ",
    "födelsenetto {f(summa(ids[['fodelse']], aren))}; inrikes flyttnetto {f(summa(ids[['inrikes']], aren))}; ",
    "utrikes flyttnetto {f(summa(ids[['utrikes']], aren))}")
  c("## Befolkningsförändringens komponenter (antal personer)", "",
    glue("Förändringen av folkmängden i {enhet_namn} = födelsenetto + inrikes flyttnetto + utrikes flyttnetto ",
         "(SCB:s justeringar gör att summan kan avvika något). Påståenden om vad som bär tillväxten ska väga alla tre, ",
         "och det senaste året ska sättas i relation till hela perioden."),
    "", rader,
    summarad(ar),
    if (length(ar) > 5) summarad(tail(ar, 5)),
    "")
}

# ============================================================
# KÖRNING
# ============================================================

cache_fil <- function(id) file.path("data", "analys-cache", paste0(id, ".json"))
las_cache <- function(id) {
  f <- cache_fil(id)
  if (file.exists(f)) fromJSON(f, simplifyVector = FALSE) else NULL
}
text_hash <- function(instr) rlang::hash(list(instr, SYSTEMPROMPT))

poster <- list()          # id -> kod, tid, hash, period, tillatna, kpier (för figurerna)

lagg_till <- function(id, kod, tid, instr, period, tillatna, kpier = character()) {
  write_file(instr, file.path("data", "analys-underlag", paste0(id, ".md")))
  poster[[id]] <<- list(id = id, kod = kod, tid = tid, hash = text_hash(instr),
                        period = period, tillatna = tillatna, kpier = kpier)
}

#' Figurunderlaget: KPI:erna som en text får använda i sina figurer (temats tabell och
#' figurKpiIds) med data för enheten, med namn, enhet, roll och perioder. Skrivs till
#' data/analys-underlag/<id>.figurer.json. Ingår inte i hashen och inte i sifferkontrollen.
figurunderlag <- function(tema, d, meta, kod) {
  roller <- list()
  for (s in tema$sektioner) {
    huvud <- unlist(s$kpiIds)
    for (k in huvud) roller[[k]] <- glue("indikator i bandet {s$gruppRubrik %||% s$namn}")
    for (us in s$undersektioner %||% list()) {
      for (u in unlist(us$kpiIds)) roller[[u]] <- glue("uppdelning av {us$delAv %||% huvud[1]} ({us$namn})")
    }
  }
  for (k in unlist(tema$figurKpiIds)) roller[[k]] <- "bara i figurer"
  egna <- d |> filter(kommun_kod == kod, !is.na(varde), kpi_id %in% names(roller)) |>
    group_by(kpi_id) |> summarise(forsta = min(ar), sista = max(ar), .groups = "drop")
  lapply(seq_len(nrow(egna)), function(i) {
    k <- egna$kpi_id[i]
    m <- meta[meta$kpi_id == k, ][1, ]
    list(id = k, namn = tema$visningsnamn[[k]] %||% m$kpi_namn, enhet = m$enhet,
         roll = roller[[k]], forsta = egna$forsta[i], sista = egna$sista[i])
  })
}

meta_alla <- bind_rows(lapply(list.files("data", "^kpi-meta-.*\\.rds$", full.names = TRUE), readRDS))

# --- 1. Temaunderlag ---
for (tema in TEMAN) {
  tid <- tema$temaId
  fil <- file.path("data", glue("bearbetad-{tid}.rds"))
  if (!file.exists(fil)) { warning(glue("Saknar {fil}")); next }
  message(glue("Underlag: {tema$temaNamn}"))
  d <- readRDS(fil)
  for (e in seq_len(nrow(ENHETER))) {
    kod <- ENHETER$kod[e]; enamn <- ENHETER$namn[e]
    underlag <- bygg_underlag(tema, d, meta_alla, kod, enamn)
    perioder <- str_match_all(underlag, "\\((?:[^,()]+), ([a-zåäö]+ \\d{4}|\\d{4})\\)")[[1]][, 2]
    period <- if (length(perioder)) perioder[length(perioder)] else ""
    instr <- glue(
      "Skriv analysen av temat \"{tema$temaNamn}\" för {enamn}. ",
      if (kod == "0013") "Halland analyseras som län: jämför med riket och övriga regioner och beskriv skillnaderna mellan kommunerna. "
      else "Jämför med Halland, de andra halländska kommunerna och riket. ",
      "Välj ut det som bär berättelsen; alla indikatorer behöver inte nämnas.\n\n",
      "{BAKGRUND}\n\n{underlag}")
    fu <- figurunderlag(tema, d, meta_alla, kod)
    write_json(fu, file.path("data", "analys-underlag", glue("{kod}_{tid}.figurer.json")),
               auto_unbox = TRUE, pretty = TRUE)
    lagg_till(glue("{kod}_{tid}"), kod, tid, instr, period, tillatna_tal(instr),
              kpier = vapply(fu, `[[`, "", "id"))
  }
}

# --- 2. Status och uppdragslista ---
status <- vapply(names(poster), function(id) {
  c <- las_cache(id)
  if (is.null(c)) "saknas" else if (!identical(c$hash, poster[[id]]$hash)) "inaktuell" else "klar"
}, "")

att_gora <- names(status)[status != "klar"]
uppdrag <- c(
  "# Uppdrag: analystexter att skriva", "",
  glue("Uppdaterad {format(Sys.time(), '%Y-%m-%d %H:%M')}. {length(att_gora)} text(er) saknas eller är inaktuella."), "",
  "Läs R/analys/systemprompt.md (stil, sifferregler, format), R/analys/figurregler.md och underlaget",
  "för varje text (<id>.md, och <id>.figurer.json för vilka KPI:er figurerna får använda).",
  "Skriv svaret som data/analys-cache/<id>.json enligt formatet överst i R/kap03-ai-analys.R,",
  "med hash och period exakt som nedan. Kör sedan Rscript R/kap03-ai-analys.R för kontroll.", "",
  "| id | status | underlag | hash | period |", "|---|---|---|---|---|")
for (id in att_gora) {
  uppdrag <- c(uppdrag, glue("| {id} | {status[[id]]} | data/analys-underlag/{id}.md | {poster[[id]]$hash} | {poster[[id]]$period} |"))
}
write_lines(uppdrag, "data/analys-uppdrag.md")

# --- 3. Kontroll ---
logg <- c("# Kontrollogg: analystexter", "", glue("Kontrollerad {format(Sys.time(), '%Y-%m-%d %H:%M')}."), "",
          "| Text | Status | Kontroll | Figurer |", "|---|---|---|---|")
problem_per_id <- list()
figurer_per_id <- list()
for (id in names(poster)) {
  if (status[[id]] != "klar") { logg <- c(logg, glue("| {id} | {status[[id]]} | | |")); next }
  res <- las_cache(id)$res
  p <- kontrollera(res, poster[[id]]$tillatna)
  fk <- kontrollera_figurer(res, poster[[id]]$kpier)
  problem_per_id[[id]] <- p
  figurer_per_id[[id]] <- fk
  n_fig <- length(res$figurer %||% list())
  fig_text <- if (length(fk$fel)) paste(fk$fel, collapse = "; ") else if (n_fig) glue("✓ ({n_fig})") else "inga"
  logg <- c(logg, glue("| {id} | klar | {if (length(p)) paste(p, collapse = '; ') else '✓'} | {fig_text} |"))
  if (length(p)) message(glue("  ⚠ {id}: {paste(p, collapse = ' | ')}"))
  if (length(fk$fel)) message(glue("  ⚠ {id} figurer: {paste(fk$fel, collapse = ' | ')}"))
}
write_lines(logg, "data/analys-kontroll.md")

# --- 4. Sammanställning (bara aktuella texter; ogiltiga figurer tas bort, texten publiceras) ---
alla <- list()
for (id in names(poster)[status == "klar"]) {
  po <- poster[[id]]; c <- las_cache(id)
  if (length(c$res$figurer)) c$res$figurer <- c$res$figurer[figurer_per_id[[id]]$giltiga]
  if (!length(c$res$figurer)) c$res$figurer <- NULL
  post <- c(c$res, list(period = c$period %||% po$period,
                        kontrollerad = length(problem_per_id[[id]]) == 0))
  alla[[po$kod]]$teman[[po$tid]] <- post
}
for (kod in names(alla)) alla[[kod]]$namn <- ENHETER$namn[ENHETER$kod == kod]
write_json(list(genererad = format(Sys.Date()), enheter = alla),
           "data/halland-analys.json", auto_unbox = TRUE, pretty = FALSE)

n_klar <- sum(status == "klar")
message(glue("\n{n_klar} av {length(status)} texter klara, ",
             "{sum(lengths(problem_per_id) > 0)} med kontrollanmärkning."))
if (length(att_gora) > 0) {
  message(glue("{length(att_gora)} att skriva: se data/analys-uppdrag.md"))
}
message("halland-analys.json skriven. Kontrollogg: data/analys-kontroll.md")
