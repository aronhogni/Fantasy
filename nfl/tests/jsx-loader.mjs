import { readFileSync } from "node:fs";
import { transformSync } from "esbuild";
export async function load(url, context, next) {
  if (url.endsWith(".jsx")) {
    const src = readFileSync(new URL(url), "utf8");
    const { code } = transformSync(src, { loader: "jsx", jsx: "automatic", format: "esm" });
    return { format: "module", source: code, shortCircuit: true };
  }
  if (url.endsWith(".css")) return { format: "module", source: "export default {}", shortCircuit: true };
  return next(url, context);
}
