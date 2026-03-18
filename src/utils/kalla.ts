/** Extrahera källhänvisning från KPI-beskrivning */
export function extractKalla(beskrivning: string | undefined): string {
  if (!beskrivning) return "RKA Kolada";
  const match = beskrivning.match(/Källa:\s*([^.]+)/);
  const bas = match ? match[1].trim() : "RKA Kolada";
  return bas;
}

/** Full källtext med Region Halland-tillägg */
export function fullKalla(beskrivning: string | undefined): string {
  return `${extractKalla(beskrivning)} och bearbetningar av Region Halland`;
}
