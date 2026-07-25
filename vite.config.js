import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/* base = "/Fantasy/" því GitHub Pages þjónar frá undirslóð
   (aronhogni.github.io/Fantasy). Án þess finnur síðan ekki assets/.
   Ef eigið heiti er sett upp síðar, breytist þetta í "/".            */
export default defineConfig({
  base: "/Fantasy/",
  plugins: [react()],
  build: { outDir: "dist", sourcemap: false },
});
