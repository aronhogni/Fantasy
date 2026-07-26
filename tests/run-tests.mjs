/* Keyrari: þýðir JSX með esbuild í minni og keyrir prófin */
import { register } from "node:module";
register("./jsx-loader.mjs", import.meta.url);
await import("./smoke.test.mjs");
