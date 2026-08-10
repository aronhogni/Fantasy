/* ============================================================
   chrome.mjs — RAUNVERULEGT UTLIT, AN NOKKURRA PAKKA.

   jsdom REIKNAR EKKERT UTLIT. Breiddir eru null, ekkert brotnar,
   ekkert skarast, og `matchMedia` er ekki til. Utlitsprof i jsdom
   getur thvi aldrei sed thad sem notandinn ser — og graent prof thar
   er ekki sonnun fyrir neinu um utlit.

   HER ER KEYRDUR ALVORU CHROME i headless-ham og talad vid hann um
   DevTools-bokunina yfir WebSocket. Node 22+ ber `WebSocket` innbyggt,
   svo THETTA THARF ENGA NYJA PAKKA — sem skiptir mali i verkefni sem
   heldur `dependencies` i tveimur (react, react-dom).

   Thar med er haegt ad maela thad sem raunverulega skiptir mali:
   breidd dalka, hvort haus komist fyrir, hvort sidan skruni larett,
   simahaminn med raunverulegri `matchMedia`, og skjamyndir.
   ============================================================ */

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";

const CHROME = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].find((p) => existsSync(p));

export const chromeAvailable = () => CHROME != null;

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
};

/**
 * Kyrrstaedur thjonn fyrir byggda appid. Slodin er `/Fantasy/nfl/`
 * eins og a GitHub Pages — annars leysast eignirnar ekki og profid
 * vaeri ad maela adra sidu en fer i loftid.
 *
 * `dataDir` er borid fram undir `/Fantasy/nfl/data/` svo appid lesi
 * RAUNVERULEGU gognin en ekki hermd.
 */
export async function serve(distDir, dataDir, base = "/Fantasy/nfl/") {
  const server = createServer(async (req, res) => {
    try {
      let url = decodeURIComponent(req.url.split("?")[0]);
      if (!url.startsWith(base)) { res.writeHead(404); return res.end(); }
      let rel = url.slice(base.length) || "index.html";
      if (rel.endsWith("/")) rel += "index.html";
      const root = rel.startsWith("data/") ? dataDir : distDir;
      const file = rel.startsWith("data/")
        ? path.join(dataDir, rel.slice(5)) : path.join(distDir, rel);
      /* Slodir sem eru ekki til fara i index.html — SPA-hegdun. */
      const body = await readFile(file).catch(() =>
        rel.includes(".") ? null : readFile(path.join(distDir, "index.html")));
      if (!body) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { "content-type": MIME[path.extname(file)] || "text/plain" });
      res.end(body);
    } catch { res.writeHead(500); res.end(); }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { server, port: server.address().port,
           url: `http://127.0.0.1:${server.address().port}${base}` };
}

/**
 * Raest Chrome og skilar CDP-tengingu.
 *
 * BIDTIMINN ER RUMUR AF ASTAEDU. Fyrsta utgafan beid 60 x 120 ms = 7,2 s
 * og STOÐST eitt og ser — en fell thegar hun keyrdi a eftir threttan
 * odrum sofnum, thvi Chrome raesist haegar undir alagi. Su bilun sagdi
 * "appid hledst ekki", sem er RONG greining: appid var i lagi og
 * vafrinn var enn ad vakna.
 *
 * FLOKTANDI PROF ER VERRA EN EKKERT — thad kennir manni ad hunsa
 * rautt. Thess vegna: rumur bidtimi, ONNUR TILRAUN ef su fyrsta
 * brestur, og villuskilabod sem segja HVAD brast (raesing vafrans) svo
 * enginn lesi thad sem utlitsvillu.
 */
export async function launch(opts = {}) {
  try { return await launchOnce(opts); }
  catch (e) {
    /* Ein onnur tilraun med hreint bord — port getur verid upptekid
       af Chrome sem er enn ad loka ser. */
    await new Promise((r) => setTimeout(r, 1500));
    return launchOnce(opts);
  }
}

async function launchOnce({ width = 1440, height = 900 } = {}) {
  if (!CHROME) throw new Error("Chrome fannst ekki");
  /* Portid er dregid af ferli-audkenni OG tima svo tvaer keyrslur i
     rod lendi ekki a sama porti. */
  const port = 9000 + ((process.pid * 7919 + Number(process.hrtime.bigint() % 997n)) % 900);
  const proc = spawn(CHROME, [
    "--headless=new", `--remote-debugging-port=${port}`,
    `--window-size=${width},${height}`,
    "--no-first-run", "--no-default-browser-check", "--disable-gpu",
    "--disable-extensions", "--disable-background-networking",
    "--user-data-dir=" + path.join(process.env.TMPDIR || "/tmp", `nfl-chrome-${port}`),
    "about:blank",
  ], { stdio: "ignore" });

  /* Bidum eftir ad bokunin svari. Chrome tekur ~0,3-1,5 s ad raesa. */
  let info = null;
  for (let i = 0; i < 80 && !info; i++) {
    await new Promise((r) => setTimeout(r, 250));
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (r.ok) info = await r.json();
    } catch { /* enn ad raesa */ }
  }
  if (!info) {
    proc.kill();
    throw new Error(`Chrome svaradi ekki a porti ${port} eftir 20 s — RAESINGARBILUN, ekki utlitsvilla`);
  }

  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = targets.find((t) => t.type === "page") || targets[0];
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = () => rej(new Error("WebSocket-tenging brast"));
  });

  let id = 0;
  const pending = new Map();
  const events = [];
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else if (msg.method) events.push(msg);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const mid = ++id;
    pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable");

  return {
    send, events, port,
    /** Keyrir JS a sidunni og skilar gildinu. */
    async eval(expr) {
      const r = await send("Runtime.evaluate", {
        expression: `(async () => { ${expr} })()`,
        awaitPromise: true, returnByValue: true,
      });
      if (r.exceptionDetails) {
        throw new Error(r.exceptionDetails.exception?.description ||
                        r.exceptionDetails.text);
      }
      return r.result.value;
    },
    /**
     * BIDID EFTIR `load` ER NAUÐSYNLEGT, EKKI KURTEISI.
     *
     * Fyrsta utgafan flakkadi og byrjadi strax ad spyrja um DOM. Thad
     * STOÐST eitt og ser en fell thegar prófið keyrdi a eftir threttan
     * odrum sofnum: `Runtime.evaluate` var bundid vid keyrsluhengi sem
     * flakkid hafdi eytt, svo hvert kall skiladi 0 — i 30 sekundur —
     * og PROFID SAGDI "appid hledst ekki" thott appid vaeri i lagi.
     * Naesta kall a eftir fann flipana umsvifalaust, sem var visbend-
     * ingin: thetta var HENGI-vandamal, ekki hledslu-vandamal.
     *
     * Rong greining i profi er verri en fall — hun sendir mann af stad
     * ad leita ad villu sem er ekki til. Nu er beðið eftir `load` fra
     * vafranum sjalfum adur en nokkud er spurt.
     */
    async goto(url) {
      const before = events.length;
      await send("Page.navigate", { url });
      /* Bidum eftir ad vafrinn segi ad sidan se hladin. */
      for (let i = 0; i < 100; i++) {
        if (events.slice(before).some((e) =>
          e.method === "Page.loadEventFired" || e.method === "Page.frameStoppedLoading")) break;
        await new Promise((r) => setTimeout(r, 100));
      }
      /* Og sidan eftir ad React hafi teiknad i thad hengi. */
      for (let i = 0; i < 120; i++) {
        await new Promise((r) => setTimeout(r, 200));
        try {
          const ready = await this.eval(
            "return !!document.querySelector('#root')?.children.length");
          if (ready) return true;
        } catch { /* hengi enn ad skipta um — reynt aftur */ }
      }
      return false;
    },
    async resize(w, h) {
      await send("Emulation.setDeviceMetricsOverride", {
        width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 });
    },
    async screenshot() {
      const r = await send("Page.captureScreenshot", { format: "png" });
      return Buffer.from(r.data, "base64");
    },
    close() { try { ws.close(); } catch { /* lokad */ } proc.kill(); },
  };
}
