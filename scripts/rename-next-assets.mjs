import { existsSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outDir = join(process.cwd(), "out");
const fromDir = join(outDir, "_next");
const toDir = join(outDir, "next");

if (!existsSync(fromDir)) {
  console.log("No out/_next directory; skipping rename.");
  process.exit(0);
}

if (existsSync(toDir)) {
  console.error("out/next already exists");
  process.exit(1);
}

renameSync(fromDir, toDir);

function rewrite(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      rewrite(path);
      continue;
    }
    if (!/\.(html|js|css|json|txt|map)$/.test(name)) continue;
    const before = readFileSync(path, "utf8");
    const after = before.replaceAll("/_next/", "/next/");
    if (after !== before) writeFileSync(path, after);
  }
}

rewrite(outDir);
writeFileSync(join(outDir, ".nojekyll"), "");
console.log("Renamed out/_next -> out/next for static hosts.");
