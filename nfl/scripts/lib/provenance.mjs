/* ============================================================
   provenance.mjs — HVER MAELINGARSKRA SEGIR HVERNIG HUN VARD TIL.

   ASTAEDAN, OG HUN VAR RAUNVERULEG (9.8.2026):

   `data/arank_ppr.json` a disknum sagdi `mean: 59.9, n: 3000`. Sama
   skrifta a somu gognum gaf `mean: 57.7, n: 2400` — tvisvar i rod, svo
   hun er ENDURGERANLEG. Munurinn var `--runs=25` a moti sjalfgefnum 20.

   Ekkert i skranni sagdi fra thvi. Hun bar `scoring`, `teams` og
   `rounds` en EKKI vidfongin sem raedu keyrslunni, svo tvaer skrar sem
   litu ut fyrir ad vera sambaerilegar voru thad ekki — og talan sem
   README vitnadi i var ur hinni.

   Fyrsta agiskunin var ad slembitolur vaeru ofraedjadar. Thaer voru thad
   ekki; fraekornid var fast allan timann. **Agiskunin var trulegri en
   satt var, og thad er einmitt astaedan til ad skra stadreyndina i
   stad thess ad alykta hana eftir a.**

   REGLAN SEM AF THESSU LEIDIR: mælingarskra sem ekki ber vidfongin sin
   er ekki maeling heldur mynd af einni keyrslu. `stamp()` faerir thau
   inn asamt fingrafari inntaksins, svo haegt se ad sja strax hvort
   tvaer skrar seu samanburdarhaefar.
   ============================================================ */

import { readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

/**
 * Odyrt fingrafar a gagnaskra: staerd + sha1 af innihaldinu.
 * Bæði er haft med af thvi ad staerdin ein greinir ekki breytingu sem
 * heldur lengdinni, og hash ein segir ekki hve mikid breyttist.
 */
export function fingerprint(file) {
  try {
    const buf = readFileSync(file);
    return {
      bytes: buf.length,
      sha1: createHash("sha1").update(buf).digest("hex").slice(0, 12),
      mtime: statSync(file).mtime.toISOString(),
    };
  } catch { return null; }
}

/**
 * Skilar `provenance`-blokk til ad setja i utkomuskrana.
 *
 * `argv`    process.argv.slice(2) — ORDRETT, ekki thattad, svo
 *           `--runs=25` sjaist eins og thad var skrifad.
 * `defaults` gildin sem skriftan notadi THEGAR vidfang vantadi. Ann-
 *           ars veit lesandi ekki hvort `runs` var 20 af thvi ad thad
 *           var beðid um thad eda af thvi ad thad er sjalfgefid.
 * `inputs`  skraaheiti i `data/` sem keyrslan las.
 */
export function stamp({ argv = [], defaults = {}, inputs = [], dataDir } = {}) {
  const dir = dataDir || path.resolve(process.cwd(), "data");
  return {
    generated: new Date().toISOString(),
    argv: argv.slice(),
    /* Aull raunverulega notud gildi — sjalfgefin lika, merkt sem slik. */
    params: Object.fromEntries(Object.entries(defaults).map(([k, v]) => {
      const given = argv.find((a) => a.startsWith(`--${k}=`));
      return [k, { value: given ? given.split("=")[1] : v, fromDefault: !given }];
    })),
    inputs: Object.fromEntries(inputs.map((f) => [f, fingerprint(path.join(dir, f))])),
    node: process.version,
  };
}

/**
 * Ber saman tvaer `provenance`-blokkir og skilar theim vidfongum og
 * inntokum sem eru ekki eins. Tomur listi = skrarnar eru samanburdar-
 * haefar. Notad i profunum.
 */
export function differs(a, b) {
  const out = [];
  if (!a || !b) return ["provenance vantar"];
  for (const k of new Set([...Object.keys(a.params || {}), ...Object.keys(b.params || {})])) {
    const x = (a.params[k] || {}).value, y = (b.params[k] || {}).value;
    if (String(x) !== String(y)) out.push(`${k}: ${x} vs ${y}`);
  }
  for (const f of new Set([...Object.keys(a.inputs || {}), ...Object.keys(b.inputs || {})])) {
    const x = (a.inputs[f] || {}).sha1, y = (b.inputs[f] || {}).sha1;
    if (x !== y) out.push(`${f}: ${x} vs ${y}`);
  }
  return out;
}
