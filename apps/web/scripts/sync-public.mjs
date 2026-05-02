#!/usr/bin/env node
// Copy registry/skills.json -> apps/web/public/registry.json before Next.js build,
// so the static site serves it as a public asset (works on GitHub Pages).
import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(HERE, "..", "..", "..", "registry", "skills.json");
const DEST = resolve(HERE, "..", "public", "registry.json");

await mkdir(dirname(DEST), { recursive: true });
await copyFile(SRC, DEST);
console.log(`[skills-market/web] synced ${SRC} → ${DEST}`);
