# paket.R — Paketladdning för kommundata-projektet
# Alla R-skript börjar med source("R/paket.R")

suppressPackageStartupMessages({
  library(rKolada)
  library(pxweb)
  library(dplyr)
  library(tidyr)
  library(stringr)
  library(purrr)
  library(jsonlite)
  library(httr2)
  library(readr)
  library(glue)
})
