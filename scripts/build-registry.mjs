#!/usr/bin/env node
// Aggregate skills/<id>/skill.json -> registry/skills.json.
// Source-of-truth for catalog data; the rest of the system reads only the
// generated registry.json. Run with --check to verify the existing registry
// matches the aggregated output (used in CI to enforce regeneration).
import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const SKILLS_DIR = join(ROOT, "skills");
const REGISTRY = join(ROOT, "registry", "skills.json");

// Repo identity used when writing source.git.repo. Override via env when forking.
const REPO_URL =
  process.env.SKILLS_MARKET_REPO_URL ?? "https://github.com/Mel0day/skills-market.git";
const REPO_REF = process.env.SKILLS_MARKET_REPO_REF ?? "main";

const REGISTRY_HEADER = {
  $schema: "https://skills-market.dev/schema/registry-v1.json",
  name: "skills-market",
  version: "0.1.0",
  description: "Open marketplace for Claude Code skills.",
  owner: { name: "Vincent Cheng", email: "nx_meteor@163.com" },
};

// Fields contributors are NOT allowed to set in skill.json — they are derived
// or controlled by maintainers (verified, downloads).
const RESERVED_FIELDS = new Set(["source", "install", "verified", "downloads"]);

async function loadSkillManifest(id) {
  const dir = join(SKILLS_DIR, id);
  const skillJson = join(dir, "skill.json");
  const skillMd = join(dir, "SKILL.md");
  if (!existsSync(skillJson)) {
    throw new Error(`skills/${id}/skill.json missing`);
  }
  if (!existsSync(skillMd)) {
    throw new Error(`skills/${id}/SKILL.md missing`);
  }
  const raw = await readFile(skillJson, "utf-8");
  let meta;
  try {
    meta = JSON.parse(raw);
  } catch (err) {
    throw new Error(`skills/${id}/skill.json: invalid JSON — ${err.message}`);
  }
  if (meta.id && meta.id !== id) {
    throw new Error(`skills/${id}/skill.json: id "${meta.id}" does not match directory "${id}"`);
  }
  for (const f of RESERVED_FIELDS) {
    if (f in meta) {
      throw new Error(
        `skills/${id}/skill.json: field "${f}" is reserved (set by build-registry.mjs)`
      );
    }
  }
  return meta;
}

function deriveEntry(id, meta) {
  const subPath = `skills/${id}`;
  return {
    id,
    name: meta.name ?? id,
    displayName: meta.displayName ?? id,
    description: meta.description,
    version: meta.version,
    author: meta.author,
    category: meta.category,
    tags: meta.tags ?? [],
    install: {
      type: "git-subdir",
      repo: REPO_URL,
      ref: REPO_REF,
      path: subPath,
      command: `npx -y skills-market install ${id}`,
    },
    source: {
      type: "git-subdir",
      repo: REPO_URL,
      ref: REPO_REF,
      path: subPath,
    },
    ...(meta.homepage ? { homepage: meta.homepage } : {}),
    license: meta.license ?? "MIT",
    createdAt: meta.createdAt,
    downloads: 0,
    verified: false,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const check = args.includes("--check");

  const entries = await readdir(SKILLS_DIR, { withFileTypes: true });
  const ids = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();

  const skills = [];
  for (const id of ids) {
    const meta = await loadSkillManifest(id);
    skills.push(deriveEntry(id, meta));
  }

  const registry = {
    ...REGISTRY_HEADER,
    updatedAt: new Date(0).toISOString(), // placeholder, filled in below
    skills,
  };

  // Stable updatedAt: max(createdAt) so re-running with no changes is reproducible.
  const maxCreated = skills.reduce((acc, s) => (s.createdAt > acc ? s.createdAt : acc), "1970-01-01T00:00:00Z");
  registry.updatedAt = maxCreated;

  const next = JSON.stringify(registry, null, 2) + "\n";

  if (check) {
    if (!existsSync(REGISTRY)) {
      console.error(`✗ registry/skills.json missing — run \`npm run build:registry\``);
      process.exit(1);
    }
    const current = await readFile(REGISTRY, "utf-8");
    if (current !== next) {
      console.error(
        `✗ registry/skills.json is out of date.\n  Run \`npm run build:registry\` and commit the result.`
      );
      process.exit(1);
    }
    console.log(`✓ registry/skills.json is up to date (${skills.length} skill${skills.length !== 1 ? "s" : ""}).`);
    return;
  }

  await writeFile(REGISTRY, next, "utf-8");
  console.log(`✓ Wrote ${REGISTRY} (${skills.length} skill${skills.length !== 1 ? "s" : ""}).`);
}

main().catch((err) => {
  console.error(`build-registry: ${err.message ?? err}`);
  process.exit(1);
});
