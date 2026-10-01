// Build helper used by `npm run build`:
//   node scripts/build.mjs clean  -> wipe dist/
//   node scripts/build.mjs copy   -> copy static assets (manifest, popup HTML, icons) from public/ into dist/
// TypeScript compilation (tsc) runs between the two steps and emits into dist/.
// Load dist/ as an unpacked extension.
import { rmSync, cpSync } from "node:fs";

const step = process.argv[2];

if (step === "clean") {
  rmSync("dist", { recursive: true, force: true });
} else if (step === "copy") {
  cpSync("public", "dist", { recursive: true });
  console.log("Built extension into dist/");
} else {
  console.error("Usage: node scripts/build.mjs <clean|copy>");
  process.exit(1);
}
