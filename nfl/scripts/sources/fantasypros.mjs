/* ============================================================
   fantasypros.mjs — SERFRAEDINGALAGID.

   Notandinn spurdi tveggja spurninga sem eru ekki sama spurningin:
     (a) "hver er draft-rodin hja helstu serfraedingum?"  -> ECR
     (b) "hverjum er haegt ad treysta / hver er klarastur?" -> MAELING

   FantasyPros svarar (a) beint. Thad svarar (b) EKKI — thad birtir
   sinar eigin nakvaemniseinkunnir, en thaer eru theirra maeling a
   sjalfum ser med theirra adferd. Vid tokum thaer med SEM HEIMILD,
   en vid REIKNUM OKKAR EIGIN lika, ur sogulegum bordum theirra gegn
   raunverulegum stigum ur nflverse. Sja `scripts/accuracy.mjs`.

   THRJAR OPNAR LEIDIR (stadfestar 9.8.2026, engir lyklar):

   1. partners.fantasypros.com/api/v1/consensus-rankings.php ... &export=json
      Hreint JSON. `filters=<expert_id>` skilar BORDI THESS EINA
      SERFRAEDINGS (`total_experts: 1`, `rank_std: 0`). Thetta er
      lykillinn ad ollu — an thess vaeri adeins samsteypan til.
      `year=2025` skilar ARKIVERADA forleiks-bordinu. Thad thydir ad
      vid getum MAELT hvern serfraeding gegn thvi sem gerdist.

   2. www.fantasypros.com/nfl/rankings/*.php -> `var ecrData = {...}`
      Samsteypan MED THREPUM (`tier`). Threpin eru theirra klasa-
      greining og eru gagnleg sem ONNUR skodun vid okkar eigin.

   3. www.fantasypros.com/nfl/accuracy/ -> innfellt JSON
      Their eigin nakvaemniseinkunnir, per stodu.

   VARNAGLI SEM SKIPTIR MALI: `filters` med OGILDU id fellur ekki
   heldur skilar ALLRI samsteypunni (94 serfraedingar). Their virdist
   hunsa ogild id. Ef vid saektum lista i einu og eitt id vaeri
   ogilt fengjum vid samsteypuna og HELDUM ad thad vaeri sa
   serfraedingur. Thess vegna er SOTT EITT ID I EINU og radir med
   `total_experts !== 1` eru FELLDAR, ekki notadar.
   ============================================================ */

import { getText, getJSON, record, pool, tryGet } from "../lib/http.mjs";
import { normPos } from "../../src/scoring.js";

const PARTNERS = "https://partners.fantasypros.com/api/v1/consensus-rankings.php";
const WWW = "https://www.fantasypros.com";

/* ---------- 1. samsteypa (ECR) med threpum ---------- */

/**
 * Sækir `var ecrData` ur radningarsidu.
 * `page` t.d. "ppr-cheatsheets", "half-point-ppr-cheatsheets",
 * "consensus-cheatsheets" (standard), "ros-ppr-overall" (rest of season).
 */
export async function ecrPage(page) {
  const html = await getText(`${WWW}/nfl/rankings/${page}.php`);
  const m = html.match(/var\s+ecrData\s*=\s*(\{[\s\S]*?\});\s*\n/);
  if (!m) throw new Error("fann ekki ecrData i sidunni");
  const d = JSON.parse(m[1]);
  const players = (d.players || []).map((p) => ({
    fpId: String(p.player_id),
    name: p.player_name,
    pos: normPos(p.player_position_id),
    team: p.player_team_id || null,
    ecr: numOrNull(p.rank_ecr),
    posRank: p.pos_rank || null,
    tier: numOrNull(p.tier),
    // sd/best/worst er DREIFING SKODANA. Hun er jafn mikilvaeg og
    // rodin sjalf: leikmadur med ecr 30 og sd 12 er ALLT ANNAD mal
    // en leikmadur med ecr 30 og sd 2. Sja `disagreement` i model.
    sd: numOrNull(p.rank_std),
    best: numOrNull(p.rank_min), worst: numOrNull(p.rank_max),
    bye: numOrNull(p.player_bye_week),
    owned: numOrNull(p.player_owned_avg),
    yahooId: p.player_yahoo_id ? String(p.player_yahoo_id) : null,
    espnStr: p.player_owned_espn ?? null,
  })).filter((p) => p.name);
  /* SERFRAEDINGALISTINN ER I `filters`, EKKI I `experts`.
     Fyrsta utgafan las `d.experts` og fekk TOMT FYLKI — thad felldi
     ekkert profa, thad skiladi bara 10 serfraedingum i stad 94 og
     leit ut eins og ad svo margir vaeru til. Thogul rýrnun a urtaki
     er nakvaemlega sama aett af villu og daudur markadslidur i
     FPL-appinu: formulan var rett, faedid var thad ekki.
     `ecrData.filters` er kommu-strengur med audkennum theirra allra. */
  const experts = String(d.filters || "")
    .split(",").map((s) => Number(s.trim())).filter((x) => Number.isFinite(x) && x > 0);

  record(`fp_ecr_${page}`, true,
    `${players.length} players, ${d.total_experts} experts ` +
    `(${experts.length} ids), updated ${d.last_updated}`);
  return { players, experts, totalExperts: d.total_experts,
           updated: d.last_updated, type: d.type, scoring: d.scoring };
}

/**
 * Sker ut jafnvaegan `[...]`- eda `{...}`-bút ur texta fra `start`.
 * Telur svig og VIRDIR STRENGI (svig innan gaesalappa telja ekki) og
 * `\\`-flotta. An strengja-medvitundar myndi nafn eins og
 * "Fantasy Life [Pro]" slita talninguna.
 */
function sliceBalanced(text, start) {
  const open = text[start];
  const close = open === "[" ? "]" : open === "{" ? "}" : null;
  if (!close) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) return text.slice(start, i + 1); }
  }
  return null;
}

const numOrNull = (v) => {
  if (v == null || v === "" || v === "-") return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
};

/* ---------- 2. nakvaemniseinkunnir FantasyPros ---------- */

/**
 * Their eigin einkunnir. Skilar { id, name, rank, qb, rb, wr, te, k, dst }
 * thar sem tolurnar eru ROD (1 = bestur), ekki skor.
 *
 * TVAER SIDUR OG THAER MAELA EKKI THAD SAMA:
 *   ""       -> /nfl/accuracy/       VIKULEG nakvaemni a timabili (10 radir)
 *   "draft"  -> /nfl/accuracy/draft.php  FORLEIKS-BORD gegn arinu (215 radir)
 *
 * FYRIR DRAFT ER `draft` RETTA SIDAN. Sa sem hittir a vikulegar
 * start/sit-akvardanir er ekki sami madur og sa sem radadi bordinu
 * rett i agust — og notandinn er ad drafta, ekki ad velja byrjunarlid.
 * Ad nota vikulegu einkunnina sem draft-vog vaeri ad vega med
 * maelingu a annarri spurningu.
 */
export async function accuracy(kind = "draft") {
  const url = kind === "draft" ? `${WWW}/nfl/accuracy/draft.php` : `${WWW}/nfl/accuracy/`;
  const html = await getText(url);
  // Sidan byggir toflu ur innfelldu JSON. `"rows":[` er einkvaemt,
  // en LOKASVIGID ER EKKI FINNANLEGT MED REGLULEGRI SEGD — radirnar
  // bera hreidrada hluti (`expert.track.ga`) og fyrsta `]` er inni i
  // theim. Fyrsta utgafan notadi `[\s\S]*?\]` og skilaði **10 rodum
  // af 100+**, sem leit ut eins og ad FantasyPros hefdi 10 serfraedinga.
  // Thess vegna er svigatalning notud, ekki regluleg segd.
  const tag = `fp_accuracy_${kind || "weekly"}`;
  const at = html.indexOf('"rows":[');
  if (at < 0) { record(tag, false, "could not find the rows block"); return []; }
  const json = sliceBalanced(html, at + '"rows":'.length);
  if (!json) { record(tag, false, "unbalanced brackets in rows"); return []; }
  let rows;
  try { rows = JSON.parse(json); }
  catch (e) { record(tag, false, `JSON error: ${e.message}`); return []; }

  const out = rows.map((r) => ({
    fpExpertId: r.id,
    name: (r.expert && r.expert.label) || null,
    site: (r.expert && r.expert.track && r.expert.track.ga && r.expert.track.ga.action) || null,
    overall: numOrNull(r.rank),
    qb: numOrNull(r.qb), rb: numOrNull(r.rb), wr: numOrNull(r.wr),
    te: numOrNull(r.te), k: numOrNull(r.k), dst: numOrNull(r.dst),
  })).filter((r) => r.fpExpertId && r.name);

  // Ar-merkid stendur i titli sidunnar ("2025 Fantasy Football Draft Accuracy").
  const yr = (html.match(/<title>\s*(\d{4})\s+Fantasy Football/) || [])[1] || null;
  record(tag, out.length > 0,
    `${out.length} experts, seasons ${yr || "unknown"}`);
  return out.map((r) => ({ ...r, season: yr ? Number(yr) : null, kind }));
}

/* ---------- 3. bord EINSTAKRA serfraedinga ---------- */

/**
 * Bord eins serfraedings. Skilar `null` ef hann a ekkert bord fyrir
 * thetta ar — thad er ALGENGT og er ekki villa (margir birta adeins
 * vikulegar radningar, ekki draft-bord).
 *
 * SKILYRDID `total_experts === 1` ER ORYGGISVENTILL, ekki snyrtimennska:
 * an thess faerum vid samsteypuna i dulargervi eins serfraedings og
 * hver einasta nakvaemnistala vaeri rong OG truverdug.
 */
export async function expertBoard(expertId, { year, scoring = "PPR", pos = "ALL" } = {}) {
  const url = `${PARTNERS}?sport=NFL&year=${year}&week=0&position=${pos}` +
              `&type=ST&scoring=${scoring}&filters=${expertId}&export=json`;
  const d = await tryGet(`fp_expert_${expertId}_${year}`, url);
  if (!d || !Array.isArray(d.players)) return null;
  if (d.total_experts !== 1) return null;          // sja notu ad ofan
  if (!d.players.length) return null;

  return {
    fpExpertId: Number(expertId), year, scoring,
    updated: d.last_updated || null,
    ranks: d.players.map((p) => ({
      fpId: String(p.player_id),
      name: p.player_name,
      pos: normPos(p.player_position_id),
      team: p.player_team_id || null,
      rank: numOrNull(p.rank_ecr),
      tier: numOrNull(p.tier),
      bye: numOrNull(p.player_bye_week),
    })).filter((p) => p.rank != null),
  };
}

/**
 * Sækir bord fyrir marga serfraedinga. Poolad a 4 — partners-endapunkturinn
 * er hradur en thetta eru ~90 kollur og vid erum gestir thar.
 */
export async function expertBoards(ids, opt) {
  const got = await pool(ids, 4, (id) => expertBoard(id, opt).catch(() => null));
  const ok = got.filter(Boolean);
  record(`fp_boards_${opt.year}`, ok.length > 0,
    `${ok.length}/${ids.length} experts with a board ${opt.year}`);
  return ok;
}

/**
 * Full samsteypa (allir serfraedingar) — vidmid til ad bera okkar vid.
 *
 * ENGINN `filters`-parametri. `filters=1:2:3:4:5:7` (sem er i theirra
 * eigin doemum) er STODU-sia, ekki serfraedingasia, og hun skilar
 * `total_experts: 1`. Fyrsta utgafan sendi hana og fekk samsteypu eins
 * serfraedings — tala sem leit ut eins og samsteypa 94 manna.
 */
export async function consensus({ year, scoring = "PPR", pos = "ALL" } = {}) {
  const url = `${PARTNERS}?sport=NFL&year=${year}&week=0&position=${pos}` +
              `&type=ST&scoring=${scoring}&export=json`;
  const d = await getJSON(url);
  record(`fp_consensus_${year}_${scoring}`, true,
    `${d.count} players, ${d.total_experts} experts`);
  return {
    year, scoring, totalExperts: d.total_experts, updated: d.last_updated,
    players: (d.players || []).map((p) => ({
      fpId: String(p.player_id), name: p.player_name,
      pos: normPos(p.player_position_id), team: p.player_team_id || null,
      ecr: numOrNull(p.rank_ecr), sd: numOrNull(p.rank_std),
      best: numOrNull(p.rank_min), worst: numOrNull(p.rank_max),
      tier: numOrNull(p.tier), bye: numOrNull(p.player_bye_week),
    })),
  };
}

/**
 * Vikulegar radningar med start/sit-einkunn (ur DynastyProcess-speglun).
 * Thaer eru ekki til i forleik — skrain ber sidustu viku fyrra timabils
 * og thad er RETT ad syna hana ekki tha, ekki ad syna hana sem "nuna".
 */
export const WEEKLY_MIRROR =
  "https://raw.githubusercontent.com/dynastyprocess/data/master/files/fp_latest_weekly.csv";

/** Audkennisbru fra DynastyProcess: fantasypros_id <-> sleeper/gsis/espn. */
export const IDMAP_MIRROR =
  "https://raw.githubusercontent.com/dynastyprocess/data/master/files/db_playerids.csv";
