#!/usr/bin/env node
// Interactive scaffolder for new skills.
// Creates skills/<id>/{skill.json, SKILL.md} and (optionally) regenerates the
// registry. The intended workflow is:
//
//   git checkout -b add-<id>
//   node scripts/submit-skill.mjs
//   # (edit SKILL.md as needed)
//   npm run registry:build
//   git commit -am "add <id>"
//   gh pr create
import { createInterface } from "node:readline";
import { stdin as input, stdout as output, env, argv } from "node:process";
import { mkdir, writeFile, access } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const SKILLS_DIR = join(ROOT, "skills");

const CATEGORIES = [
  "demo",
  "development",
  "design",
  "devops",
  "writing",
  "data",
  "security",
  "productivity",
  "other",
];

const REGEN = argv.includes("--rebuild") || argv.includes("--regen");

const rl = createInterface({ input, output });
const ask = (q, def) =>
  new Promise((res) =>
    rl.question(def ? `${q} [${def}] ` : `${q} `, (a) => res((a || "").trim() || def || ""))
  );

async function askValid(q, def, validate) {
  for (;;) {
    const v = await ask(q, def);
    const ok = validate(v);
    if (ok === true) return v;
    console.log(`  ⚠ ${ok}`);
  }
}

async function main() {
  console.log("\n📦 skills-market — scaffold a new skill\n");

  const id = await askValid(
    "id (lowercase kebab-case)",
    null,
    (v) => /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(v) || "must match a-z0-9 with optional dashes"
  );
  const targetDir = join(SKILLS_DIR, id);
  if (existsSync(targetDir)) {
    rl.close();
    console.error(`✗ skills/${id}/ already exists. Pick a different id or delete the directory first.`);
    process.exit(1);
  }

  const displayName = await ask("display name", id);
  const description = await askValid(
    "description (10–500 chars)",
    null,
    (v) => (v.length >= 10 && v.length <= 500) || "10–500 chars"
  );
  const version = await askValid(
    "version",
    "0.1.0",
    (v) => /^[0-9]+\.[0-9]+\.[0-9]+/.test(v) || "semver-like"
  );
  const authorName = await askValid(
    "author name",
    env.USER || "anonymous",
    (v) => v.length > 0 || "required"
  );
  const authorEmail = await ask("author email (optional)");
  const category = await askValid(
    `category (${CATEGORIES.join(", ")})`,
    "other",
    (v) => CATEGORIES.includes(v) || `one of ${CATEGORIES.join(", ")}`
  );
  const tagsRaw = await ask("tags (comma-separated)");
  const homepage = await ask("homepage (optional)");
  const license = await ask("license", "MIT");

  rl.close();

  const tags = tagsRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 10);

  const meta = {
    id,
    displayName,
    description,
    version,
    author: authorEmail ? { name: authorName, email: authorEmail } : { name: authorName },
    category,
    tags,
    license,
    ...(homepage ? { homepage } : {}),
    createdAt: new Date().toISOString(),
  };

  await mkdir(targetDir, { recursive: true });
  await writeFile(join(targetDir, "skill.json"), JSON.stringify(meta, null, 2) + "\n", "utf-8");
  await writeFile(
    join(targetDir, "SKILL.md"),
    `---
name: ${id}
description: ${description}
---

# ${displayName}

<!-- TODO: write the prompt Claude Code should follow when this skill is active. -->

## Activation

Activate when ...

## What to do

1. Step one.
2. Step two.

## Output

Describe the desired output format.
`,
    "utf-8"
  );

  console.log(`\n✓ Created skills/${id}/skill.json`);
  console.log(`✓ Created skills/${id}/SKILL.md`);

  if (REGEN) {
    console.log("\n[skills-market] Regenerating registry...");
    const r = spawnSync("node", [join(HERE, "build-registry.mjs")], { stdio: "inherit" });
    if (r.status !== 0) process.exit(r.status ?? 1);
  } else {
    console.log("\nNext:");
    console.log("  1. Edit skills/" + id + "/SKILL.md");
    console.log("  2. npm run registry:build");
    console.log("  3. git checkout -b add-" + id);
    console.log("  4. git add skills/" + id + " registry/skills.json");
    console.log("  5. git commit && gh pr create");
  }
}

main().catch((err) => {
  rl.close();
  console.error(err);
  process.exit(1);
});
