#!/usr/bin/env node
/**
 * Generates favicon.ico and apple-icon.png from src/app/icon.svg.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svgPath = join(root, "src/app/icon.svg");
const svg = readFileSync(svgPath);

async function main() {
  const png32 = await sharp(svg).resize(32, 32).png().toBuffer();
  const png180 = await sharp(svg).resize(180, 180).png().toBuffer();

  writeFileSync(join(root, "src/app/favicon.ico"), png32);
  writeFileSync(join(root, "public/favicon.ico"), png32);
  writeFileSync(join(root, "src/app/apple-icon.png"), png180);

  console.log("Generated src/app/favicon.ico, public/favicon.ico, src/app/apple-icon.png");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
