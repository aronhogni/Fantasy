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
import { S } from "./appStyles.js";




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


/* ---- ANDLITSMYNDIR: TVAER FOTUR, EKKI EIN ------------------------------
   MAELT 16.8.2026 a OLLUM 587 leikmonnum i `data/players.json` (HEAD-koll,
   engin urtaksstaerd — heil talning):

     slod                                              200      vantar
     premierleague/photos/players/110x140/p{code}.png  381      206 (35,1%)
     premierleague25/photos/players/110x140/{code}.png 411      176
     ONNUR HVOR                                        478      109 (18,6%)

   Sviðid vantar TAKID "p" i nyju fotunni og hun heitir eftir timabili.
   HVORUG er yfirfota hinnar: 97 menn eru ADEINS i premierleague25 og 67
   ADEINS i gomlu (their sem skiptu um felag — Meslier, Bruno G., Garnacho,
   Rogers, Lacroix). Thess vegna KEDJA, ekki skipti.

   Hja theim sem skipta mali er batinn storstur: af theim sem meira en 5%
   eiga fer vantandi mynd ur 11 i 1, og af theim sem spiladu einhverjar
   minutur ur 106 i 19. Their 109 sem eftir standa eru raunverulega
   myndalausir hja FPL: 90 theirra hafa NULL minutur i deildinni og 52 eru
   hja COV/HUL/IPS. Thad er RETT nidurstada og treyju-fallbackid a vid.

   PROFADAR OG FELLDAR (403 fyrir bædi virkan og vantandi leikmann):
   `.webp` i ollum staerdum · `photo-2/` · pulselive-lenid · premierleague24
   · premierleague26 (thess vegna er hun EKKI sett inn "fyrirfram" — hun
   svarar 403 fyrir alla i dag og myndi adeins baeta vid einu tomu kalli).

   Myndamirrun i repo-id var maeld og HAFNAD: 478 myndir eru 44,7 MB
   (medaltal 91 KB — "110x140"-slodin skilar 220x280 skra), hun getur
   hvort ed er ekki naad i thad sem er ekki til, og repo-id er PUBLIC.  */
const PHOTO_URLS = [
  code => `https://resources.premierleague.com/premierleague25/photos/players/110x140/${code}.png`,
  code => `https://resources.premierleague.com/premierleague/photos/players/110x140/p${code}.png`,
];
export const photoUrl = code => code ? PHOTO_URLS[0](code) : null;

/* NAESTA SLOD UT FRA THEIRRI SEM BRAST — tekur adeins `src`, thvi allir
   fjorir notendur (PlayerImg, RowPhoto, SafeImg, ImmPhoto) fa slodina
   senda, ekki `code`. Skilar null thegar ekkert er eftir ad reyna, og tha
   — og ADEINS tha — a kallandinn ad falla a treyju/staf.               */
export function photoNext(src) {
  const m = /^(.*)\/premierleague25\/photos\/players\/([^/]+)\/(\d+)\.png$/.exec(String(src || ""));
  return m ? `${m[1]}/premierleague/photos/players/${m[2]}/p${m[3]}.png` : null;
}

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

/* ============================================================
   BILUD MYND MA EKKI SMITA A NAESTA LEIKMANN (25.8.2026)

   `ok` er teljara-state og lifir i KOMPONENT-SAETINU, ekki i myndinni.
   Overlay-ith skiptir um leikmann UTAN thess ad skipta um saeti (enginn
   `key`), svo `ok: false` — sett af manni sem A ENGA mynd hja FPL —
   hekk afram og NAESTI madur fekk treyju-fallbackid thott hans mynd se
   til. MAELT i CLAUDE.md kafla 8: 109 leikmenn eru raunverulega
   myndalausir, svo kveikjan er algeng.

   LAGAD I KOMPONENTINUM, EKKI A KALLSTODUM. `key={p.id}` a hverjum
   fjorum kallstodum hefdi virkad lika — og fimmta kallstodin sem
   baettist vid seinna hefdi gleymt honum. Thetta er sama laerdomur og
   `avail === 0` i MyTeam: reglan a heima thar sem hun getur ekki
   gleymst.

   ENGINN `useEffect`: state sem er leidrett i teikningu er endurstillt
   ADUR en vafrinn malar, svo enginn rammi synir ranga mynd. Effect
   hefdi gefid eitt blikk af treyju a hverjum skiptum.
   ============================================================ */
export function Crest({ team, size = 16, style }) {
  const id = team?.code ?? team?.short ?? null;
  const [st, setSt] = useState({ id, ok: true });
  if (st.id !== id) setSt({ id, ok: true });
  const ok = st.id === id ? st.ok : true;
  const setOk = v => setSt({ id, ok: v });
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


/* Sama regla og i `Crest` her ad ofan — sja rokstudninginn thar.
   ThETTA VAR TILFELLID SEM NOTANDINN GAT SED: detail-overlay-ith
   skiptir um leikmann an thess ad skipta um komponent-saeti.        */
export function PlayerImg({ code, short, size = 34 }) {
  const [st, setSt] = useState({ code, ok: true });
  if (st.code !== code) setSt({ code, ok: true });
  const ok = st.code === code ? st.ok : true;
  const setOk = v => setSt({ code, ok: v });
  const url = photoUrl(code);
  if (!url || !ok) return <Kit short={short} size={size} />;
  return <img src={url} alt="" style={{ height:size, width:"auto", objectFit:"contain" }}
    onError={e => { const n = photoNext(e.target.src); if (n) e.target.src = n; else setOk(false); }}
    loading="lazy" />;
}
