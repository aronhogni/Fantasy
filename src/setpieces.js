/* ============================================================
   FOST LEIKATRIDI — HREIN ROKFRAEDI (flutt ur SetPieces.jsx 9.9.2026)

   Rodun innan lids, svidin eins og thau eru i dag og merkin a spjoldum.
   Ekkert React her: App.jsx, SetPieces.jsx og tests/set-pieces.mjs flytja
   thetta inn. Ikonin (SVG) eru EKKI her — SetPieces.jsx baetir theim vid
   `SP_KINDS` (`ICON`-vorpunin thar) og sendir tegundirnar inn sem `kinds`.
   ============================================================ */

/* Tegundirnar THRJAR — svidid, heitid og liturinn. `Icon` er baett vid i
   SetPieces.jsx; `short` heldur ser sem texta-fallback (aria/title, prof). */
export const SP_KINDS = [
  { key:"pen", field:"penalties_order",                      tint:"#b3261e", label: "Penalties",  short:"P" },
  { key:"fk",  field:"direct_freekicks_order",               tint:"#1b5e9c", label: "Free kicks", short:"F" },
  { key:"ck",  field:"corners_and_indirect_freekicks_order", tint:"#0a7a4a", label: "Corners",    short:"C" },
];

/* ============================================================
   ROD INNAN LIDS — "FYRSTI TAKI" ER LAEGSTA RODUN LIDSINS, EKKI order===1

   MAELT 31.7.2026 a raungognum (data/players.json, 20 lid):
     penalties_order                        1-5   (1 hja 20/20 lidum)
     direct_freekicks_order                 1-5   (1 hja 20/20 lidum)
     corners_and_indirect_freekicks_order   4-10  (1 hja  0/20 lidum!)
   FPL notar ANNAN GRUNN fyrir horn. Daemi (Arsenal): Rice=5, Saka=6,
   Madueke=7, Odegaard=8 — Rice ER hornataki lidsins thott talan se 5.

   OG SVO ENDURGRUNNADI FPL HORNIN, 13.8.2026: milli dagskeyrslanna 12.8 og
   13.8 fór svidid ur 2-12 (1 hja 0/20) i 1-6 (1 hja 18/20). Pipeline snertir
   ekki toluna (`fetch.mjs:262` afritar hana), svo thetta var FPL sjalft.
   REGLAN LIFDI ThETTA AF OBREYTT — rod innan lids er rett a badum grunnum —
   og tvo lid (FUL, NEW) hafa enn ENGA 1, svo hun er enn NAUDSYNLEG.
   ThAD SEM BROTNADI VAR VORDURINN: fullyrdingin "horn na aldrei 1" var
   fullyrding um FPL, ekki um regluna okkar, og hun fell. Verra: hefdi hun
   verid slokud i stad thess ad vera endurskrifud vaeri ekkert eftir sem
   fellur ef einhver ferdi `order === 1` inn aftur — sú regla virkar nu fyrir
   18 af 20 lidum. Vordurinn er thess vegna TVISKIPTUR i set-pieces.mjs:
   TILBUID lid (rodun 4/7/9) sem getur ALDREI ordid tomt, plus lifandi
   lidin sem hafa enga 1, TALIN.  Sja CLAUDE.md 5b um tomar fullyrdingar.

   TVAER LIFANDI VILLUR SEM THETTA LEIDRETTIR:
     1. "adeins fyrsti taki" (order === 1) syndi EKKERT fyrir horn.
     2. setPieceBadges notadi `order <= 3`, svo HORNATAKAR FENGU ALDREI
        IKON a leikmannaspjaldi — Saka bar ekkert hornamerki.
   Bædi voru thogul: talan var til, hun var bara aldrei <= 3.

   Lausnin er ROD INNAN LIDS: rank 1 = sa sem tekur thau, hvad sem
   FPL-talan er. Thad er rett fyrir ALLAR THRJAR tegundir (fyrir viti og
   aukaspyrnur er laegsta talan 1 hvort sem er) og tholir ad FPL breyti
   grunninum.
   ============================================================ */
export function setPieceRanks(players, kinds = SP_KINDS) {
  const byId = new Map();
  for (const k of kinds) {
    const byTeam = new Map();
    for (const p of players || []) {
      const o = p?.[k.field];
      if (o == null) continue;
      if (!byTeam.has(p.team)) byTeam.set(p.team, []);
      byTeam.get(p.team).push({ p, order: o });
    }
    for (const list of byTeam.values()) {
      list.sort((a, b) => a.order - b.order);
      list.forEach((e, i) => {
        if (!byId.has(e.p.id)) byId.set(e.p.id, []);
        byId.get(e.p.id).push({ ...k, order: e.order, rank: i + 1 });
      });
    }
  }
  return byId;
}

/* SVIDIN EINS OG THAU ERU I DAG — REIKNUD, EKKI SKRIFAD I TEXTA.
   13.8.2026 endurgrunnadi FPL hornarodunina (2-12 med 0/20 lidum a 1 ->
   1-6 med 18/20 a 1) og THRIR STADIR i appinu fullyrtu aframhaldandi
   "4-10 og aldrei 1": thessi haus, skyringin i flipanum og `note` a
   ck-dalkinum — sa sidasti med ordinu MEASURED fyrir framan. Fost tala um
   lifandi gogn urealdist thogult. Skyringin i flipanum les nu ur THESSU
   falli, svo hun getur ekki farid a skjon vid gognin aftur.
   `teamsNoOne` er talan sem SKIPTIR MALI: lid sem hafa ENGA 1 eru einu
   tilvikin thar sem `order === 1` finnur engan taka.                      */
export function spRanges(players, kinds = SP_KINDS) {
  const out = {};
  for (const k of kinds) {
    const vals = [], byTeam = new Map();
    for (const p of players || []) {
      const o = p?.[k.field];
      if (o == null) continue;
      vals.push(o);
      byTeam.set(p.team, Math.min(byTeam.get(p.team) ?? Infinity, o));
    }
    out[k.key] = vals.length ? {
      min: Math.min(...vals), max: Math.max(...vals), n: vals.length,
      teams: byTeam.size,
      teamsWithOne: [...byTeam.values()].filter(m => m === 1).length,
      teamsNoOne:   [...byTeam.values()].filter(m => m > 1).length,
    } : null;
  }
  return out;
}

/* HVERSU MARGAR TEGUNDIR TEKUR HANN FYRSTUR?
   Sa sem tekur BAEDI viti og horn er annad slag i fantasy en sa sem
   tekur adeins horn: hann er a fleiri en einni leid ad stigum og missir
   thaer ekki allar thott ein hverfi. Thess vegna er hann FEITLETRADUR i
   lida-spjaldinu — talan var THEGAR a skjanum (thrjar linur) en hun var
   ekki LAESILEG fyrr en hun var merkt.

   Talid a RODUN INNAN LIDS (rank === 1), ekki a FPL-tolunni: horn na
   aldrei 1 (sja ofar), svo `order === 1` hefdi talid hornin ur.        */
export function setPieceCount(p, ranks) {
  const list = ranks?.get?.(p?.id);
  if (!list) return 0;
  return list.filter(b => b.rank === 1).length;
}

/* Ikon-rod fyrir eitt spjald. `ranks` ur setPieceRanks; an hennar er
   ekkert birt — betra en ad birta rangt (sbr. hornin ofar).            */
export function setPieceBadges(p, ranks, { maxRank = 2 } = {}) {
  const list = ranks?.get?.(p?.id);
  if (!list) return null;
  const out = list.filter(b => b.rank <= maxRank);
  return out.length ? out : null;
}
