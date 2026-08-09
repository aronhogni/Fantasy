import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/* base = "/Fantasy/" því GitHub Pages þjónar frá undirslóð
   (aronhogni.github.io/Fantasy). Án þess finnur síðan ekki assets/.
   Ef eigið heiti er sett upp síðar, breytist þetta í "/".            */

/* NFL-appid var flutt i `nfl/` sem SJALFSTAETT verkefni med eigin
   `package.json`, `vite.config.js` og profakeyrara — sja nfl/README.md.
   Astaedan var arekstrar milli tveggja lota sem unnu samtimis a somu
   skram. Thessi stilling byggir thvi ADEINS FPL-appid; Pages-flaedid
   byggir hitt i eigin skrefi og setur i `dist/nfl/`.               */
export default defineConfig({
  base: "/Fantasy/",
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
