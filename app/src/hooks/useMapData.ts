import { useState, useEffect } from "react";

export interface MapData {
  kommuner: GeoJSON.FeatureCollection;
  lan: GeoJSON.FeatureCollection;
}

// Modulnivå-cache: laddas en gång, delas mellan alla modaler
let cache: MapData | null = null;
let loadPromise: Promise<MapData> | null = null;

/** Vänd vindningsordningen på exterringar till moturs (counterclockwise).
 *  D3 följer RFC 7946: moturs = interiör. GDAL skriver ofta klockvis,
 *  vilket D3 tolkar som "hela världen minus polygonen" → grön rektangel. */
function fixWinding(fc: GeoJSON.FeatureCollection): GeoJSON.FeatureCollection {
  for (const feature of fc.features) {
    const geom = feature.geometry;
    if (geom.type === "Polygon") {
      // Exterring = index 0, resten = hål
      geom.coordinates[0] = geom.coordinates[0].slice().reverse();
    } else if (geom.type === "MultiPolygon") {
      for (const polygon of geom.coordinates) {
        polygon[0] = polygon[0].slice().reverse();
      }
    }
  }
  return fc;
}

function load(): Promise<MapData> {
  if (cache) return Promise.resolve(cache);
  if (!loadPromise) {
    const base = import.meta.env.BASE_URL;
    loadPromise = Promise.all([
      fetch(`${base}data/kommuner.geojson`).then((r) => r.json()),
      fetch(`${base}data/lan.geojson`).then((r) => r.json()),
    ]).then(([kommuner, lan]) => {
      cache = { kommuner: fixWinding(kommuner), lan: fixWinding(lan) };
      return cache;
    });
  }
  return loadPromise;
}

/** Lazy-ladda kartdata — aktiveras bara när enabled=true */
export function useMapData(enabled: boolean): {
  mapData: MapData | null;
  loading: boolean;
} {
  const [data, setData] = useState<MapData | null>(cache);
  const [loading, setLoading] = useState(!cache && enabled);

  useEffect(() => {
    if (!enabled) return;
    if (cache) {
      setData(cache);
      setLoading(false);
      return;
    }
    setLoading(true);
    load().then((d) => {
      setData(d);
      setLoading(false);
    });
  }, [enabled]);

  return { mapData: data, loading };
}
