// exportera-teman.mjs — Skriver frontendens tema-konfiguration (src/teman) till JSON
// så att R-pipelinen (kap03-ai-analys.R) analyserar exakt de KPI:er som visas på sidan.
//
// Användning (från projektroten):  node app/scripts/exportera-teman.mjs data/frontend-teman.json

import { buildSync } from "esbuild";
import { writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { tmpdir } from "os";

const here = dirname(fileURLToPath(import.meta.url));
const ut = process.argv[2] ?? "data/frontend-teman.json";

const tmp = resolve(tmpdir(), `teman-${process.pid}.mjs`);
buildSync({
  entryPoints: [resolve(here, "../src/teman/index.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: tmp,
  logLevel: "error",
});

const { TEMAN } = await import(pathToFileURL(tmp).href);

// Kontroll av strukturen (band → indikator → uppdelning, METODIK.md §8.0)
const fel = [];
for (const t of TEMAN) {
  const sedda = new Map();
  const rubriker = [];
  const notera = (id, var_) => {
    if (sedda.has(id)) fel.push(`${t.temaId}: ${id} förekommer två gånger (${sedda.get(id)} och ${var_})`);
    else sedda.set(id, var_);
  };
  for (const s of t.sektioner) {
    if (!s.kpiIds?.length) fel.push(`${t.temaId}/${s.id}: sektionen saknar indikatorer`);
    s.kpiIds.forEach((id) => notera(id, s.id));
    for (const us of s.undersektioner ?? []) {
      if (s.kpiIds.length > 1 && !us.delAv) fel.push(`${t.temaId}/${s.id}: uppdelningen "${us.namn}" saknar delAv`);
      if (us.delAv && !s.kpiIds.includes(us.delAv)) fel.push(`${t.temaId}/${s.id}: delAv ${us.delAv} finns inte i sektionen`);
      if (!us.kpiIds?.length) fel.push(`${t.temaId}/${s.id}: uppdelningen "${us.namn}" är tom`);
      us.kpiIds.forEach((id) => notera(id, `${s.id}/${us.namn}`));
    }
    const rubrik = s.gruppRubrik ?? (s.kpiIds.length > 1 ? s.namn : null);
    if (rubrik && rubriker.includes(rubrik) && rubriker[rubriker.length - 1] !== rubrik) {
      fel.push(`${t.temaId}: bandet "${rubrik}" är delat av andra band`);
    }
    if (rubrik) rubriker.push(rubrik);
  }
}
if (fel.length) {
  console.error(`Temainställningarna har ${fel.length} fel:\n  ${fel.join("\n  ")}`);
  process.exit(1);
}

writeFileSync(ut, JSON.stringify(TEMAN, null, 2), "utf8");
console.log(`Exporterade ${TEMAN.length} teman till ${ut}`);
