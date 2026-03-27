# konvertera-kartor.R
# Konverterar kommuner- och län-shapefiles till förenklad GeoJSON
# för D3-kartvisning i frontend.

source("R/paket.R")
library(sf)
library(rmapshaper)

# --- Kommun ---
kommun <- st_read("kartor/Kommun_Sweref99TM.shp", quiet = TRUE)
kommun_wgs <- st_transform(kommun, 4326)
kommun_enkel <- ms_simplify(kommun_wgs, keep = 0.03, keep_shapes = TRUE)

# Byt kolumnnamn: KnKod → kod, KnNamn → namn (matchar frontend-join)
names(kommun_enkel)[names(kommun_enkel) == "KnKod"] <- "kod"
names(kommun_enkel)[names(kommun_enkel) == "KnNamn"] <- "namn"

st_write(kommun_enkel, "app/public/data/kommuner.geojson",
         driver = "GeoJSON", layer_options = "RFC7946=YES", delete_dsn = TRUE)

# --- Län ---
lan <- st_read("kartor/Lan_Sweref99TM_region.shp", quiet = TRUE)
lan_wgs <- st_transform(lan, 4326)
lan_enkel <- ms_simplify(lan_wgs, keep = 0.05, keep_shapes = TRUE)

names(lan_enkel)[names(lan_enkel) == "LnKod"] <- "kod"
names(lan_enkel)[names(lan_enkel) == "LnNamn"] <- "namn"

st_write(lan_enkel, "app/public/data/lan.geojson",
         driver = "GeoJSON", layer_options = "RFC7946=YES", delete_dsn = TRUE)

cat("kommuner.geojson:", round(file.size("app/public/data/kommuner.geojson") / 1024), "KB\n")
cat("lan.geojson:", round(file.size("app/public/data/lan.geojson") / 1024), "KB\n")
