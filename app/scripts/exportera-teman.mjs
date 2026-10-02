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
writeFileSync(ut, JSON.stringify(TEMAN, null, 2), "utf8");
console.log(`Exporterade ${TEMAN.length} teman till ${ut}`);
