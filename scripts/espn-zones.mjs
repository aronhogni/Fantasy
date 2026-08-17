/* ============================================================
   ESPN SKOT-SVAEDI — EIN UTFAERSLA, TVEIR NOTENDUR

   AF HVERJU SER SKRA: `ZONE_RE`, `IN_BOX` og `shotZone` voru AFRITUD
   ORDRETT i `scripts/fetch.mjs` og `scripts/fetch-team-shots.mjs`. Baedi
   afritin badu um sama hlutinn og baedi voru jafn rong — og thar sem
   afritin geta rekid i sundur getur onnur skrain byrjad ad telja svaedi
   sem hin telur ekki, an thess ad neitt segi fra thvi. Sama rok og fyrir
   `buildTeamMetrics` (CLAUDE.md kafli 7) og `startFeatures`.

   VILLAN SEM ThETTA LAGAR (maeld 16.8.2026)
   -----------------------------------------
   ESPN skrifar svaedid i textann og gamla taflan hafdi ENGAN arm fyrir
   „the left/right side of the six yard box". Thau skot fengu `zone: null`
   og `if (zone && IN_BOX.has(zone))` taldi thau thvi sem EKKI-I-TEIG.
   Markteigurinn er innsti hluti vitateigsins — thad er ekki jadartilfelli
   heldur naesta-vissa faerid.

   MAELING A ORDAFORDANUM (1.166 skot, 50 leikir, ESPN eng.1 2025/26 —
   `scoreboard` + `summary`, hnit ur `fieldPositionX`, x = hlutfall af
   HALFUM velli svo metrar = x * 52,5):

     n     x: min   p50    max    metrar(medal)  ordasamband
     404   0.120  0.220  0.384    11,8 m         the centre of the box
     366   0.340  0.436  0.632    23,4 m         outside the box
     103   0.138  0.246  0.322    12,6 m         the right side of the box
     100   0.122  0.248  0.370    12,5 m         the left side of the box
      74   0.024  0.080  0.114     3,9 m         very close range
      31   0.024  0.072  0.110     3,7 m         the left side of the six yard box   <- VANTADI
      26   0.020  0.066  0.100     3,4 m         the right side of the six yard box  <- VANTADI
      16   0.034  0.084  0.110     4,1 m         a difficult angle on the left       <- VANTADI
      15   0.036  0.082  0.108     4,2 m         a difficult angle on the right      <- VANTADI
       9   0.230  0.230  0.230    12,1 m         (converts the penalty)              <- VANTADI
       4   0.662  0.938  0.946    43,2 m         more than 35 yards
       4   0.358  0.404  0.510    21,4 m         long range on the right             <- VANTADI
       4   0.344  0.432  0.560    22,8 m         long range on the left              <- VANTADI
       3   0.438  0.440  0.484    23,8 m         outside the box from a direct free kick
       2   0.840  0.884  0.884    45,3 m         more than 40 yards on the right wing <- VANTADI
       1   0.454  0.454  0.454    23,8 m         a free kick                          (aframhaldandi null)
       1   0.014                   0,7 m         a difficult angle and long range on the right
       1   0.800                  42,0 m         more than 40 yards on the left wing  <- VANTADI
       1   0.010                   0,5 m         a difficult angle and long range on the left
       1   0.098                   5,1 m         (ekkert „from"-lidur)                (aframhaldandi null)

   HNITIN ERU STADFESTING, EKKI FLOKKUN. Skotin eru flokkud UR TEXTANUM
   eins og adur (sja hausinn a `fetch-team-shots.mjs`: textinn er ohadur
   kvardanum); hnitin voru adeins notud til ad SANNREYNA ad nyju armarnir
   liggi thar sem their eiga ad liggja. Vitateigurinn er x <= 0,314 og
   markteigurinn x <= 0,105:
     - six yard box: 57 skot, ALLT bilid 0,020-0,110 -> markteigur. Staerd-
       fraedilega ogreinanlegt fra „very close range" (0,024-0,114).
     - difficult angle (an „and long range"): 31 skot, 0,034-0,110 -> lika
       inni i markteigs-fjarlaegd. EKKERT theirra naer 0,314.
     - converts the penalty: 9 skot, x = 0,230 hja OLLUM NIU (vitapunktur;
       ESPN negldir hann a fastan punkt). Inni i teig, aetlar ser thad.
     - a difficult angle AND long range: ESPN segir sjalft „long range", svo
       thau eru UTAN teigs. Hnitin tvo (0,010/0,014) stangast a vid textann
       og TEXTINN RAEDUR — thad er reglan sem skrain hefur alltaf haft.

   TVEIR ARMAR SEM ERU EKKI I MAELINGUNNI OG ERU SAMT HER:
     `the penalty spot`  — 0 af 1.166 (og 0 af 290 i GW38). Hann er DAUDUR
       i dag en er LATINN STANDA: kostnadurinn er enginn og bilunarhamurinn
       ef hann hverfur er nakvaemlega sa sem thessi skra er ad laga (null
       sem er talid sem ekki-i-teig).
     `more than \d+ yards` — taflan hafdi harkodad 35 og ESPN skrifar LIKA
       40, svo threfaldur armur var ordinn ad tveimur ordum sem passa ekki.

   ThAD SEM ER AFRAM null OG A AD VERA: „a free kick" (aukaspyrna getur
   verid hvadan sem er a vellinum — 23,8 m i thessu urtaki en thad segir
   ekkert um naesta) og skot an „from"-lidar. null hér thydir „ESPN sagdi
   thad ekki", ekki „utan teigs".
   ============================================================ */

/* ROD SKIPTIR MALI: „a difficult angle and long range" verdur ad koma a
   undan „a difficult angle", annars gleypir sa sidari hann og setur 45 m
   skot i markteiginn.                                                   */
export const ZONE_RE = [
  [/a difficult angle and long range/i,          "outside"],
  [/the centre of the box/i,                     "box_centre"],
  [/the left side of the six yard box/i,         "six_yard"],
  [/the right side of the six yard box/i,        "six_yard"],
  [/the six yard box/i,                          "six_yard"],
  [/the left side of the box/i,                  "box_left"],
  [/the right side of the box/i,                 "box_right"],
  [/very close range/i,                          "close_range"],
  [/a difficult angle/i,                         "angle"],
  [/the penalty spot/i,                          "penalty_spot"],
  [/converts the penalty/i,                      "penalty_spot"],
  [/more than \d+ yards/i,                       "far"],
  [/long range/i,                                "outside"],
  [/outside the box/i,                           "outside"],
];

/* I TEIG. `angle` er hér af thvi ad ollum 31 maeldum skotum er skotid ur
   0,034-0,110 (1,8-5,8 m) — thad er markteigs-fjarlaegd, ekki jadar.   */
export const IN_BOX = new Set([
  "box_centre", "box_left", "box_right", "close_range", "six_yard",
  "angle", "penalty_spot",
]);

/* NAERFAERI = MARKTEIGURINN. `close_pg` heitir i hausnum a
   `fetch-team-shots.mjs` „skot ur markteig", svo `six_yard` a heima her
   — thad er markteigurinn ord fyrir ord. `angle` er ThAD EKKI: ESPN
   stadsetur thad eftir HORNI en ekki eftir teig, og ad fella thad inn
   vaeri ad lata dalkinn segja thad sem heimildin sagdi ekki.           */
export const CLOSE = new Set(["close_range", "six_yard"]);

/* UTAN TEIGS — `far` er langskotin sem ESPN telur i yardum.            */
export const OUTSIDE = new Set(["outside", "far"]);

/** Svaedi UR TEXTANUM. null = ESPN sagdi ekkert, EKKI "utan teigs". */
export function shotZone(text) {
  const t = String(text || "");
  for (const [re, z] of ZONE_RE) if (re.test(t)) return z;
  return null;
}
