/* ============================================================
   args.mjs — VIDFONG ERU STADFEST ADUR EN THAU RATA I SKRAARNAFN.

   ÞETTA BJO TIL RAUNVERULEGT RUSL A DISKINUM. Thrjar skrar med BILUM
   i nafni urdu til:

     data/board_ppr sleeper_sleeper.json
     data/board_standard sleeper_sleeper.json
     data/board_standard fftoday_sleeper.json

   Rotin sest i `provenance`-blokkinni sem thaer bera sjalfar:

     argv: ["--scoring=ppr sleeper", "--proj=", "--runs=8"]

   — skel sem klofnadi ekki rett, og skriftan lim di gildid OSTADFEST
   inn i utkomu-skraarnafnid. Verra: "ppr sleeper" fann NULL RADIR og
   skriftan skrifadi SAMT, med `seasons: []`. Tom maelingarskra er
   verri en engin: hun litur ut eins og maeling.

   TVAER REGLUR SEM AF THESSU LEIDA:
     1. Gildi sem raedur skraarnafni verdur ad koma ur LEYFDUM LISTA.
     2. Maeling sem finnur ekkert skrifar EKKI. Hun deyr og segir
        hvers vegna — sama regla og "tom keyrsla ma aldrei thurrka ut
        god gogn" i pipeline-inu.
   ============================================================ */

/**
 * Thattar `--lykill=gildi` og stadfestir gegn leyfdum listum.
 *
 * `spec` er `{ lykill: [leyfd gildi] }` fyrir strengi, eda
 * `{ lykill: "number" }` fyrir tolur. Lyklar utan `spec` eru leyfdir
 * obreyttir (t.d. `--runs`), en their rata ekki i skraarnofn.
 */
export function parseArgs(argv, spec = {}, defaults = {}) {
  const out = { ...defaults };
  for (const a of argv) {
    const m = /^--([^=]+)=?(.*)$/.exec(a);
    if (!m) die(`Oskiljanlegt vidfang: ${a}`);
    const [, k, raw] = m;
    const v = raw === "" ? true : raw;
    if (Array.isArray(spec[k])) {
      if (!spec[k].includes(v)) {
        die(`--${k}=${JSON.stringify(v)} er ekki leyft gildi.\n` +
            `   Leyfd: ${spec[k].map((x) => `--${k}=${x}`).join(" · ")}\n` +
            `   (Vantar gaesalappir i skelinni? "--scoring=ppr sleeper" varð til thannig.)`);
      }
    } else if (spec[k] === "number") {
      const n = Number(v);
      if (!Number.isFinite(n)) die(`--${k} verdur ad vera tala, fekk ${JSON.stringify(v)}`);
      out[k] = n;
      continue;
    }
    out[k] = v;
  }
  return out;
}

/**
 * MAELING SEM FINNUR EKKERT SKRIFAR EKKI.
 *
 * Kallad adur en utkoma er skrifud. Tom skra med `seasons: []` litur
 * ut eins og maeling og er thad ekki — og hun situr a disknum thangad
 * til einhver tekur eftir, sem gerdist ekki fyrr en uttekt fann hana.
 */
export function requireSeasons(ys, what = "timabil") {
  if (!Array.isArray(ys) || ys.length === 0) {
    die(`ENGIN ${what} fundust — skrifa EKKERT.\n` +
        "   Tom maelingarskra er verri en engin: hun litur ut eins og maeling.\n" +
        "   Athugadu --scoring og --proj, og hvort features.json beri thau gogn.");
  }
  return ys;
}

function die(msg) {
  console.error(`\n  ${msg}\n`);
  process.exit(2);
}
