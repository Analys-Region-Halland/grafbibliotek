# kap03-ai-analys.R — Underlag, kontroll och sammanställning av analystexterna
#
# Texterna skrivs av Claude Code i en session (Max-planen), inte via API. Skriptet gör
# allt runt omkring:
#
#   1. Bygger ett sifferunderlag per tema × enhet (Halland + sex kommuner) ur
#      data/bearbetad-<tema>.rds, med exakt de KPI:er som visas på sidan (frontendens
#      tema-config). Underlaget sparas i data/analys-underlag/<kod>_<tema>.md.
#   2. När alla tematexter för en enhet är klara byggs även underlaget för enhetens
#      översikt (<kod>_oversikt.md) ur temaanalyserna.
#   3. Listar texter som saknas eller är inaktuella (underlaget har ändrats) i
#      data/analys-uppdrag.md. Be Claude Code skriva dem: "skriv analystexterna i
#      data/analys-uppdrag.md". Stilreglerna står i R/analys/systemprompt.md.
#   4. Kontrollerar varje text: alla siffror ska finnas i underlaget, inga tankstreck,
#      inga procenttecken. Utfallet loggas i data/analys-kontroll.md.
#   5. Sammanställer aktuella texter till data/halland-analys.json (kap04 kopierar den
#      till app/public/data/).
#
# En text i data/analys-cache/<id>.json har formatet
#   { "hash": "<från uppdragslistan>", "period": "<från uppdragslistan>",
#     "res": { "rubrik": "", "ingress": "", "i_korthet": [{"ledtext": "", "text": ""}],
#              "stycken": [""] } }
# Hashen knyter texten till underlaget; ändras datan blir texten inaktuell.
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
system2("node", c("app/scripts/exportera-teman.mjs", "data/frontend-teman.json"))
TEMAN <- fromJSON("data/frontend-teman.json", simplifyVector = FALSE)

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
  hall  <- varde_for(rows, "0013", p)
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

  # Förändring över tid (månadsdata: samma månad året innan)
  steg <- if (manad) c(`1 år (samma månad året innan)` = 100) else
    if (kompakt) c(`5 år` = 5) else c(`1 år` = 1, `5 år` = 5, `10 år` = 10)
  for (i in seq_along(steg)) {
    p0 <- p - steg[[i]]
    v0 <- varde_for(rows, kod, p0)
    if (is.na(v0)) next
    rad <- glue("- Förändring {names(steg)[i]}: {f(v - v0, TRUE)} {diff_enhet(enhet)} (från {f(v0)} år {fmt_period(p0)})")
    if (enhet == "antal" && v0 != 0) {
      rad <- glue("{rad}, det vill säga {fmt_sv(100 * (v - v0) / abs(v0), 1, TRUE)} procent")
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
    for (k in unlist(s$kpiIds)) {
      if (is.null(rows_by[[k]])) next
      m <- meta[meta$kpi_id == k, ][1, ]
      beskr <- str_trim(sub("\\s*Källa:.*$", "", m$beskrivning %||% ""))
      txt <- kpi_fakta(rows_by[[k]], k, namn_for(k), beskr, m$enhet, kod, enhet_namn)
      if (!is.null(txt)) sek <- c(sek, txt)
    }
    for (us in s$undersektioner %||% list()) {
      for (k in unlist(us$kpiIds)) {
        if (is.null(rows_by[[k]])) next
        m <- meta[meta$kpi_id == k, ][1, ]
        txt <- kpi_fakta(rows_by[[k]], k, glue("{namn_for(k)} [{us$namn}]"), "", m$enhet,
                         kod, enhet_namn, kompakt = TRUE)
        if (!is.null(txt)) sek <- c(sek, txt)
      }
    }
    if (length(sek) > 0) {
      rubrik <- if (!is.null(s$gruppRubrik)) glue("{s$gruppRubrik}: {s$namn}") else s$namn
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
  ar <- sort(unique(x$ar[x$kpi_id == ids[["total"]]]), decreasing = TRUE)[1:5]
  ar <- sort(ar[!is.na(ar)])
  f <- function(z) fmt_sv(z, 0, TRUE)
  rader <- vapply(ar, function(a) glue(
    "- {a}: total förändring {f(v(ids[['total']], a))}; födelsenetto {f(v(ids[['fodelse']], a))}; ",
    "inrikes flyttnetto {f(v(ids[['inrikes']], a))}; utrikes flyttnetto (invandringsöverskott) {f(v(ids[['utrikes']], a))}"), "")
  summa <- function(id) sum(vapply(ar, function(a) v(id, a), 0), na.rm = TRUE)
  c("## Befolkningsförändringens komponenter (antal personer)", "",
    glue("Förändringen av folkmängden i {enhet_namn} = födelsenetto + inrikes flyttnetto + utrikes flyttnetto ",
         "(SCB:s justeringar gör att summan kan avvika något). Påståenden om vad som bär tillväxten ska väga alla tre."),
    "", rader,
    glue("- Summa {min(ar)}–{max(ar)}: total förändring {f(summa(ids[['total']]))}; födelsenetto {f(summa(ids[['fodelse']]))}; ",
         "inrikes flyttnetto {f(summa(ids[['inrikes']]))}; utrikes flyttnetto {f(summa(ids[['utrikes']]))}"),
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

poster <- list()          # id -> kod, tid, hash, period, tillatna
underlag_alla <- list()   # kod -> alla temaunderlag (för översiktens sifferkontroll)

lagg_till <- function(id, kod, tid, instr, period, tillatna) {
  write_file(instr, file.path("data", "analys-underlag", paste0(id, ".md")))
  poster[[id]] <<- list(id = id, kod = kod, tid = tid, hash = text_hash(instr),
                        period = period, tillatna = tillatna)
}

aktuell <- function(id) {
  c <- las_cache(id)
  !is.null(c) && identical(c$hash, poster[[id]]$hash)
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
    underlag_alla[[kod]] <- c(underlag_alla[[kod]], underlag)
    perioder <- str_match_all(underlag, "\\((?:[^,()]+), ([a-zåäö]+ \\d{4}|\\d{4})\\)")[[1]][, 2]
    period <- if (length(perioder)) perioder[length(perioder)] else ""
    instr <- glue(
      "Skriv analysen av temat \"{tema$temaNamn}\" för {enamn}. ",
      if (kod == "0013") "Halland analyseras som län: jämför med riket och övriga regioner och beskriv skillnaderna mellan kommunerna. "
      else "Jämför med Halland, de andra halländska kommunerna och riket. ",
      "Välj ut det som bär berättelsen; alla indikatorer behöver inte nämnas.\n\n",
      "{BAKGRUND}\n\n{underlag}")
    lagg_till(glue("{kod}_{tid}"), kod, tid, instr, period, tillatna_tal(instr))
  }
}

# --- 2. Översiktsunderlag (när enhetens alla tematexter är aktuella) ---
for (e in seq_len(nrow(ENHETER))) {
  kod <- ENHETER$kod[e]; enamn <- ENHETER$namn[e]
  tema_ids <- vapply(TEMAN, `[[`, "", "temaId")
  klara <- vapply(tema_ids, function(tid) aktuell(glue("{kod}_{tid}")), logical(1))
  if (!all(klara)) {
    message(glue("Översikt {enamn}: väntar på {sum(!klara)} temaanalys(er)"))
    next
  }
  sammandrag <- paste(vapply(TEMAN, function(t) {
    r <- las_cache(glue("{kod}_{t$temaId}"))$res
    paste0("## ", t$temaNamn, "\n", r$rubrik, ". ", r$ingress, "\n",
           paste0("- ", vapply(r$i_korthet, function(p) paste0(p$ledtext, ": ", p$text), ""), collapse = "\n"))
  }, ""), collapse = "\n\n")
  instr <- glue(
    "Skriv en översikt över {enamn} som väger ihop temaanalyserna nedan till en helhetsbild. ",
    "Lyft de tre eller fyra mönster som säger mest om {enamn} och hur de hänger ihop mellan teman ",
    "(till exempel hur befolkning, arbetsmarknad och bostäder påverkar varandra). Upprepa inte varje tema. ",
    "I korthet får ha fyra punkter. Siffror får bara hämtas från temaanalyserna nedan och temaunderlagen ",
    "i data/analys-underlag/{kod}_*.md.\n\n",
    "{BAKGRUND}\n\n# Temaanalyser\n\n{sammandrag}")
  lagg_till(glue("{kod}_oversikt"), kod, "oversikt", instr, "",
            tillatna_tal(paste(c(instr, underlag_alla[[kod]]), collapse = "\n")))
}

# --- 3. Status och uppdragslista ---
status <- vapply(names(poster), function(id) {
  c <- las_cache(id)
  if (is.null(c)) "saknas" else if (!identical(c$hash, poster[[id]]$hash)) "inaktuell" else "klar"
}, "")

att_gora <- names(status)[status != "klar"]
uppdrag <- c(
  "# Uppdrag: analystexter att skriva", "",
  glue("Uppdaterad {format(Sys.time(), '%Y-%m-%d %H:%M')}. {length(att_gora)} text(er) saknas eller är inaktuella."), "",
  "Läs R/analys/systemprompt.md (stil, sifferregler, format) och underlaget för varje text.",
  "Skriv svaret som data/analys-cache/<id>.json enligt formatet överst i R/kap03-ai-analys.R,",
  "med hash och period exakt som nedan. Kör sedan Rscript R/kap03-ai-analys.R för kontroll.", "",
  "| id | status | underlag | hash | period |", "|---|---|---|---|---|")
for (id in att_gora) {
  uppdrag <- c(uppdrag, glue("| {id} | {status[[id]]} | data/analys-underlag/{id}.md | {poster[[id]]$hash} | {poster[[id]]$period} |"))
}
write_lines(uppdrag, "data/analys-uppdrag.md")

# --- 4. Kontroll ---
logg <- c("# Kontrollogg: analystexter", "", glue("Kontrollerad {format(Sys.time(), '%Y-%m-%d %H:%M')}."), "",
          "| Text | Status | Kontroll |", "|---|---|---|")
problem_per_id <- list()
for (id in names(poster)) {
  if (status[[id]] != "klar") { logg <- c(logg, glue("| {id} | {status[[id]]} | |")); next }
  p <- kontrollera(las_cache(id)$res, poster[[id]]$tillatna)
  problem_per_id[[id]] <- p
  logg <- c(logg, glue("| {id} | klar | {if (length(p)) paste(p, collapse = '; ') else '✓'} |"))
  if (length(p)) message(glue("  ⚠ {id}: {paste(p, collapse = ' | ')}"))
}
write_lines(logg, "data/analys-kontroll.md")

# --- 5. Sammanställning (bara aktuella texter) ---
alla <- list()
for (id in names(poster)[status == "klar"]) {
  po <- poster[[id]]; c <- las_cache(id)
  post <- c(c$res, list(period = c$period %||% po$period,
                        kontrollerad = length(problem_per_id[[id]]) == 0))
  if (po$tid == "oversikt") alla[[po$kod]]$oversikt <- post else alla[[po$kod]]$teman[[po$tid]] <- post
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
