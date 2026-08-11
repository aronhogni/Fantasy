/* ============================================================
   FELAGSMERKI, TREYJA OG ANDLITSMYND — ThRJU LITIL VIDMOT

   Flutt ur `App.jsx` 11.8.2026 (F1). Thau voru dreifd um skrana: gognin
   (`CREST_FALLBACK`, `KIT`) i efstu 60 linunum, `crestUrl` i midjunni og
   vidmotin sjalf 3.400 linum sidar. Ekkert af thvi haekkir skilning.

   TVAER REGLUR SEM ERU I ThESSUM KODA:

   1. `CREST_FALLBACK` ER NOTAD ThEGAR `code` VANTAR I teams.json. Nyliðar
      koma inn an `code` i fyrstu sokn tímabilsins, og an thessarar toflu
      hefdi merkid theirra einfaldlega ekki teiknast. Taflan er handskrifud
      og verdur ad vera thad — sbr. `BSD_TEAM` i bsd.js.

   2. `Kit` ER VARALEID, EKKI SKRAUT. Andlitsmyndir eru sottar af
      resources.premierleague.com og ThAER BRESTA fyrir nyja leikmenn
      (myndin er ekki komin inn). Teiknuð treyja i lidslitunum les eins og
      "vid vitum hver thetta er en hofum ekki mynd", medan brotid img-tag
      les eins og bilun. Thess vegna er `onError` -> `Kit`, ekki tomt.

   `Crest` byggir sina eigin slod ur `crestUrl`/`CREST_FALLBACK`. `crestFor`
   — prop sem var thraedd i thrju vidmot og notud i engu — var fjarlaegd
   11.8.2026; ekki setja hana inn aftur.
   ============================================================ */
/* `useState` VERDUR AD FYLGJA MED (11.8.2026). Fyrsta utgafa thessarar skrar
   flutti adeins `React` inn — og `npm run build` VAR GRAENT, thvi esbuild
   ThATTAR en LEYSIR EKKI NOFN. Appid hrundi svo vid fyrstu teikningu med
   "useState is not defined" i `<PlayerImg>`: nakvaemlega hviti skjarinn sem
   CLAUDE.md kafla 2 lysir eftir flutning ur Leaderboard.jsx.
   ThAD SEM FANN ThAD VAR EKKI BYGGINGIN heldur profin sem OPNA flipana
   (data-resilience, player-cards, ffdr-table, smoke, monkey, react-warnings —
   sex sofn i einu). Bædi `Crest` og `PlayerImg` halda `ok`-astandi til ad
   falla i `Kit`/skammstofun thegar myndin brestur.                        */
import React, { useState } from "react";
import { C, S } from "./appStyles.js";




/* ---- Lið-kóðar fyrir félagsmerki (notað ef 'code' vantar í teams.json) ---- */
export const CREST_FALLBACK = {
  ARS:3, AVL:7, BOU:91, BRE:94, BHA:36, CHE:8, CRY:31, EVE:11, FUL:54,
  LIV:14, MCI:43, MUN:1, NEW:4, NFO:17, TOT:6, SUN:56, COV:9, HUL:88, IPS:40, LEE:2,
};

/* ---- Treyjulitir fyrir fallback-mynd ---- */
const KIT = {
  ARS:["#EF0107","#ffffff"], AVL:["#670E36","#95BFE5"], BOU:["#DA291C","#000000"],
  BRE:["#E30613","#ffffff"], BHA:["#0057B8","#ffffff"], CHE:["#034694","#ffffff"],
  COV:["#78D0F3","#ffffff"], CRY:["#1B458F","#C4122E"], EVE:["#003399","#ffffff"],
  FUL:["#ffffff","#000000"], HUL:["#F18A01","#000000"], IPS:["#0044A9","#ffffff"],
  LEE:["#ffffff","#1D428A"], LIV:["#C8102E","#ffffff"], MCI:["#6CABDD","#ffffff"],
  MUN:["#DA020E","#ffffff"], NEW:["#241F20","#ffffff"], NFO:["#DD0000","#ffffff"],
  TOT:["#ffffff","#132257"], SUN:["#EB172B","#ffffff"],
};


export const photoUrl = code => code ? `https://resources.premierleague.com/premierleague/photos/players/110x140/p${code}.png` : null;
export const crestUrl = code => code ? `https://resources.premierleague.com/premierleague/badges/50/t${code}.png` : null;


/* ---- Teiknuð treyja (fallback ef mynd næst ekki) ---- */
export function Kit({ short, size = 34 }) {
  const [a, b] = KIT[short] || ["#9aa", "#fff"];
  return (
    <svg width={size} height={size * 0.9} viewBox="0 0 40 36" aria-hidden="true">
      <path d="M13 3 L20 6 L27 3 L34 8 L31 14 L28 12 L28 33 L12 33 L12 12 L9 14 L6 8 Z"
        fill={a} stroke="rgba(0,0,0,0.18)" strokeWidth="0.7" strokeLinejoin="round" />
      <path d="M13 3 L9 14 L6 8 Z" fill={b} opacity="0.9" />
      <path d="M27 3 L31 14 L34 8 Z" fill={b} opacity="0.9" />
    </svg>
  );
}

export function Crest({ team, size = 16, style }) {
  const [ok, setOk] = useState(true);
  const url = crestUrl(team?.code ?? CREST_FALLBACK[team?.short]);
  if (!url || !ok) return (
    <span style={{ ...S.crestFallback, fontSize: Math.max(7, size * 0.5), ...style }}>
      {team?.short || "?"}
    </span>
  );
  return <img src={url} alt="" loading="lazy"
    style={{ width:size, height:size, objectFit:"contain", ...style }}
    onError={() => setOk(false)} />;
}


export function PlayerImg({ code, short, size = 34 }) {
  const [ok, setOk] = useState(true);
  const url = photoUrl(code);
  if (!url || !ok) return <Kit short={short} size={size} />;
  return <img src={url} alt="" style={{ height:size, width:"auto", objectFit:"contain" }}
    onError={() => setOk(false)} loading="lazy" />;
}
