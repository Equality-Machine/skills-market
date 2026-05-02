#!/usr/bin/env node
// Lightweight registry validator — zero deps, runs in CI on every PR.
// Validates required fields, id uniqueness, and install/source consistency.
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REGISTRY = resolve(HERE, "..", "registry", "skills.json");

const ALLOWED_CATEGORIES = new Set([
  "demo",
  "development",
  "design",
  "devops",
  "writing",
  "data",
  "security",
  "productivity",
  "other",
]);
const ALLOWED_INSTALL_TYPES = new Set(["npx", "git", "git-subdir", "local"]);
const ALLOWED_SOURCE_TYPES = new Set(["github", "git-subdir", "url", "local"]);
const ID_PATTERN = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
const SEMVER = /^[0-9]+\.[0-9]+\.[0-9]+/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T/;

function fail(errors, msg) {
  errors.push(msg);
}

function validateAuthor(label, author, errors) {
  if (!author || typeof author !== "object") {
    return fail(errors, `${label}: must be an object`);
  }
  if (typeof author.name !== "string" || !author.name.trim()) {
    fail(errors, `${label}.name: required, non-empty string`);
  }
}

function validateSkill(skill, errors, ids) {
  const where = skill.id ? `skill[${skill.id}]` : `skill[?]`;

  for (const f of [
    "id",
    "name",
    "description",
    "version",
    "author",
    "category",
    "tags",
    "install",
    "source",
    "createdAt",
    "downloads",
    "verified",
  ]) {
    if (skill[f] === undefined || skill[f] === null) {
      fail(errors, `${where}.${f}: required`);
    }
  }

  if (typeof skill.id !== "string" || !ID_PATTERN.test(skill.id)) {
    fail(errors, `${where}.id: must match ${ID_PATTERN}`);
  } else if (ids.has(skill.id)) {
    fail(errors, `${where}.id: duplicate id "${skill.id}"`);
  } else {
    ids.add(skill.id);
  }

  if (typeof skill.name !== "string" || !skill.name.trim()) {
    fail(errors, `${where}.name: required, non-empty string`);
  }

  if (typeof skill.description !== "string" || skill.description.length < 10) {
    fail(errors, `${where}.description: at least 10 characters`);
  } else if (skill.description.length > 500) {
    fail(errors, `${where}.description: at most 500 characters`);
  }

  if (typeof skill.version !== "string" || !SEMVER.test(skill.version)) {
    fail(errors, `${where}.version: must be semver-like (1.2.3)`);
  }

  validateAuthor(`${where}.author`, skill.author, errors);

  if (!ALLOWED_CATEGORIES.has(skill.category)) {
    fail(errors, `${where}.category: must be one of ${[...ALLOWED_CATEGORIES].join(", ")}`);
  }

  if (!Array.isArray(skill.tags)) {
    fail(errors, `${where}.tags: must be an array`);
  } else if (skill.tags.length > 10) {
    fail(errors, `${where}.tags: max 10 tags`);
  } else if (skill.tags.some((t) => typeof t !== "string")) {
    fail(errors, `${where}.tags: all entries must be strings`);
  }

  // install
  if (skill.install && typeof skill.install === "object") {
    if (!ALLOWED_INSTALL_TYPES.has(skill.install.type)) {
      fail(errors, `${where}.install.type: must be one of ${[...ALLOWED_INSTALL_TYPES].join(", ")}`);
    }
    if (skill.install.type === "npx" && !skill.install.package) {
      fail(errors, `${where}.install.package: required when install.type=npx`);
    }
    if (skill.install.type === "git" && !skill.install.url) {
      fail(errors, `${where}.install.url: required when install.type=git`);
    }
    if (skill.install.type === "git-subdir") {
      if (!skill.install.repo) fail(errors, `${where}.install.repo: required when install.type=git-subdir`);
      if (!skill.install.path) fail(errors, `${where}.install.path: required when install.type=git-subdir`);
    }
  }

  // source
  if (skill.source && typeof skill.source === "object") {
    if (!ALLOWED_SOURCE_TYPES.has(skill.source.type)) {
      fail(errors, `${where}.source.type: must be one of ${[...ALLOWED_SOURCE_TYPES].join(", ")}`);
    }
    if (skill.source.type === "github" && !skill.source.repo) {
      fail(errors, `${where}.source.repo: required when source.type=github`);
    }
    if (skill.source.type === "git-subdir") {
      if (!skill.source.repo) fail(errors, `${where}.source.repo: required when source.type=git-subdir`);
      if (!skill.source.path) fail(errors, `${where}.source.path: required when source.type=git-subdir`);
    }
    if (skill.source.type === "local" && !skill.source.path) {
      fail(errors, `${where}.source.path: required when source.type=local`);
    }
  }

  if (typeof skill.createdAt !== "string" || !ISO_DATE.test(skill.createdAt)) {
    fail(errors, `${where}.createdAt: must be an ISO 8601 timestamp`);
  }

  if (!Number.isInteger(skill.downloads) || skill.downloads < 0) {
    fail(errors, `${where}.downloads: non-negative integer`);
  }

  if (typeof skill.verified !== "boolean") {
    fail(errors, `${where}.verified: boolean`);
  }
}

async function main() {
  const errors = [];
  let registry;
  try {
    const raw = await readFile(REGISTRY, "utf-8");
    registry = JSON.parse(raw);
  } catch (err) {
    console.error(`✗ Failed to read or parse ${REGISTRY}: ${err.message}`);
    process.exit(2);
  }

  if (typeof registry.name !== "string") fail(errors, "registry.name: required string");
  if (typeof registry.version !== "string") fail(errors, "registry.version: required string");
  if (typeof registry.updatedAt !== "string" || !ISO_DATE.test(registry.updatedAt)) {
    fail(errors, "registry.updatedAt: required ISO 8601 timestamp");
  }
  if (registry.owner) validateAuthor("registry.owner", registry.owner, errors);

  if (!Array.isArray(registry.skills)) {
    fail(errors, "registry.skills: must be an array");
    console.error(errors.join("\n"));
    process.exit(1);
  }

  const ids = new Set();
  registry.skills.forEach((s) => validateSkill(s, errors, ids));

  if (errors.length) {
    console.error(`✗ Registry validation failed (${errors.length} error${errors.length > 1 ? "s" : ""}):\n`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  console.log(`✓ Registry valid — ${registry.skills.length} skill(s), updated ${registry.updatedAt}`);
}

main().catch((err) => {
  console.error("validator crashed:", err);
  process.exit(2);
});
