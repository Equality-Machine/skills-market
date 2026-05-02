#!/usr/bin/env node
import { mkdir, cp, writeFile, readFile, stat, rm, mkdtemp } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

const HOME = homedir();
const CLAUDE_SKILLS_DIR = process.env.CLAUDE_SKILLS_DIR ?? join(HOME, ".claude", "skills");
const SKILLS_MARKET_HOME = process.env.SKILLS_MARKET_HOME ?? join(HOME, ".skills-market");
const MANIFEST_PATH = join(SKILLS_MARKET_HOME, "installed.json");
const MIRROR_DIR = join(SKILLS_MARKET_HOME, "mirror");
const DEFAULT_REGISTRY_URL =
  process.env.SKILLS_MARKET_REGISTRY_URL ??
  "https://raw.githubusercontent.com/Equality-Machine/skills-market/main/registry/skills.json";

interface SkillEntry {
  id: string;
  name: string;
  displayName?: string;
  description: string;
  version: string;
  author: { name: string; email?: string };
  category: string;
  tags: string[];
  install: any;
  source: any;
  homepage?: string;
  license?: string;
  createdAt: string;
  downloads: number;
  verified: boolean;
}

interface InstalledEntry {
  id: string;
  version: string;
  installedAt: string;
  source: any;
  install: any;
}

interface PersonalManifest {
  version: number;
  updatedAt: string;
  installed: InstalledEntry[];
}

interface CommonOpts {
  registryUrl?: string;
  registryPath?: string;
  useMirror: boolean;
}

function help(): void {
  console.log(
    `skills-market — Claude Code skills marketplace

Usage:
  npx skills-market <command> [args]

Commands:
  install <id>          Install a skill into ~/.claude/skills/<id>/
  list                  List skills tracked in the personal manifest
  remove <id>           Uninstall a skill
  sync                  Reinstall every skill in the personal manifest
  mirror init           Clone the marketplace repo into ~/.skills-market/mirror
  mirror update         git pull the local mirror
  mirror status         Show mirror state
  search <query>        Search the catalog
  catalog               List the full catalog from the registry

Common options:
  --registry-url <url>     Catalog URL (default ${DEFAULT_REGISTRY_URL})
  --registry-path <file>   Local catalog file
  --mirror                 Prefer ~/.skills-market/mirror over network for installs
  --dry-run                Print actions without changing the filesystem

Environment:
  CLAUDE_SKILLS_DIR              Target dir for skills (default ~/.claude/skills)
  SKILLS_MARKET_HOME             Personal data dir (default ~/.skills-market)
  SKILLS_MARKET_REGISTRY_URL     Override registry URL
  SKILLS_MARKET_REGISTRY_PATH    Override registry path
`
  );
}

function parseCommon(args: string[]): { common: CommonOpts; rest: string[] } {
  const common: CommonOpts = {
    registryUrl: process.env.SKILLS_MARKET_REGISTRY_URL ?? DEFAULT_REGISTRY_URL,
    registryPath: process.env.SKILLS_MARKET_REGISTRY_PATH,
    useMirror: false,
  };
  const rest: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--registry-url" && args[i + 1]) common.registryUrl = args[++i];
    else if (a === "--registry-path" && args[i + 1]) common.registryPath = args[++i];
    else if (a === "--mirror") common.useMirror = true;
    else rest.push(a);
  }
  return { common, rest };
}

async function loadRegistry(opts: CommonOpts): Promise<{ skills: SkillEntry[] }> {
  // Mirror first if requested and present.
  if (opts.useMirror && existsSync(join(MIRROR_DIR, "registry", "skills.json"))) {
    const raw = await readFile(join(MIRROR_DIR, "registry", "skills.json"), "utf-8");
    return JSON.parse(raw);
  }
  if (opts.registryPath) {
    const raw = await readFile(opts.registryPath, "utf-8");
    return JSON.parse(raw);
  }
  // Local repo dev path: when running from inside the repo, prefer the working copy.
  const local = resolve(HERE, "..", "..", "..", "registry", "skills.json");
  if (existsSync(local) && !process.env.SKILLS_MARKET_FORCE_NETWORK) {
    const raw = await readFile(local, "utf-8");
    return JSON.parse(raw);
  }
  const url = opts.registryUrl!;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch registry: ${res.status} ${url}`);
  return (await res.json()) as { skills: SkillEntry[] };
}

async function readManifest(): Promise<PersonalManifest> {
  if (!existsSync(MANIFEST_PATH)) {
    return { version: 1, updatedAt: new Date().toISOString(), installed: [] };
  }
  const raw = await readFile(MANIFEST_PATH, "utf-8");
  return JSON.parse(raw) as PersonalManifest;
}

async function writeManifest(m: PersonalManifest): Promise<void> {
  m.updatedAt = new Date().toISOString();
  await mkdir(SKILLS_MARKET_HOME, { recursive: true });
  await writeFile(MANIFEST_PATH, JSON.stringify(m, null, 2) + "\n", "utf-8");
}

function run(cmd: string, args: string[], cwd?: string): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolveRun) => {
    const child = spawn(cmd, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (b) => (stdout += b.toString()));
    child.stderr.on("data", (b) => (stderr += b.toString()));
    child.on("close", (code) => resolveRun({ code: code ?? -1, stdout, stderr }));
  });
}

/**
 * Sparse-clone a single subdirectory of a remote repo into a temp dir, then
 * return that subdir path. Caller is responsible for cleaning up the tmp root.
 */
async function sparseClone(
  repo: string,
  ref: string,
  subPath: string
): Promise<{ tmpRoot: string; subDir: string }> {
  const tmpRoot = await mkdtemp(join(tmpdir(), "skills-market-"));
  const args = [
    "clone",
    "--filter=blob:none",
    "--no-checkout",
    "--depth=1",
    `--branch=${ref}`,
    repo,
    tmpRoot,
  ];
  let r = await run("git", args);
  if (r.code !== 0) throw new Error(`git clone failed: ${r.stderr.trim()}`);
  r = await run("git", ["sparse-checkout", "init", "--cone"], tmpRoot);
  if (r.code !== 0) throw new Error(`sparse-checkout init failed: ${r.stderr.trim()}`);
  r = await run("git", ["sparse-checkout", "set", subPath], tmpRoot);
  if (r.code !== 0) throw new Error(`sparse-checkout set failed: ${r.stderr.trim()}`);
  r = await run("git", ["checkout", ref], tmpRoot);
  if (r.code !== 0) throw new Error(`git checkout failed: ${r.stderr.trim()}`);
  const subDir = join(tmpRoot, subPath);
  if (!existsSync(subDir)) {
    throw new Error(`Path "${subPath}" not found in repo at ref ${ref}`);
  }
  return { tmpRoot, subDir };
}

async function resolveSourceDir(
  skill: SkillEntry,
  opts: CommonOpts
): Promise<{ dir: string; cleanup?: () => Promise<void> }> {
  const src = skill.source ?? {};

  // 1. Local repo working copy (dev): when run from this repo and source is git-subdir
  //    pointing at this repo, prefer the working copy.
  if (src.type === "git-subdir" && src.path) {
    const repoRoot = resolve(HERE, "..", "..", "..");
    const candidate = join(repoRoot, src.path);
    if (existsSync(join(candidate, "SKILL.md"))) {
      return { dir: candidate };
    }

    // 2. Local mirror (~/.skills-market/mirror) if requested OR present.
    if ((opts.useMirror || existsSync(MIRROR_DIR)) && existsSync(MIRROR_DIR)) {
      const mirrorPath = join(MIRROR_DIR, src.path);
      if (existsSync(join(mirrorPath, "SKILL.md"))) {
        return { dir: mirrorPath };
      }
    }

    // 3. Remote sparse-clone (the common case for end users).
    const { tmpRoot, subDir } = await sparseClone(src.repo, src.ref ?? "main", src.path);
    return { dir: subDir, cleanup: async () => rm(tmpRoot, { recursive: true, force: true }) };
  }

  // Legacy local source.
  if (src.type === "local" && src.path) {
    const repoRoot = resolve(HERE, "..", "..", "..");
    const candidate = resolve(repoRoot, src.path, "skill");
    return { dir: existsSync(candidate) ? candidate : resolve(repoRoot, src.path) };
  }

  throw new Error(
    `Unsupported source.type "${src.type}" for skill "${skill.id}". This installer supports git-subdir and local.`
  );
}

async function installSkill(
  skill: SkillEntry,
  opts: CommonOpts & { dryRun?: boolean; noTrack?: boolean }
): Promise<void> {
  const targetDir = join(CLAUDE_SKILLS_DIR, skill.id);
  console.log(`[skills-market] Installing ${skill.displayName ?? skill.name} (${skill.id}) v${skill.version}`);
  console.log(`[skills-market] Target: ${targetDir}`);

  const { dir: sourceDir, cleanup } = await resolveSourceDir(skill, opts);
  console.log(`[skills-market] Source: ${sourceDir}`);

  try {
    if (opts.dryRun) {
      console.log(`[skills-market] DRY RUN — would copy ${sourceDir} → ${targetDir}`);
      return;
    }

    const stats = await stat(sourceDir);
    if (!stats.isDirectory()) throw new Error(`Source is not a directory: ${sourceDir}`);
    await mkdir(targetDir, { recursive: true });
    // Replace any prior install (keep parent ~/.claude/skills/).
    await rm(targetDir, { recursive: true, force: true });
    await cp(sourceDir, targetDir, { recursive: true, force: true });

    const receipt = {
      installedAt: new Date().toISOString(),
      skill,
    };
    await writeFile(join(targetDir, ".skills-market.json"), JSON.stringify(receipt, null, 2));
  } finally {
    if (cleanup) await cleanup();
  }

  if (!opts.noTrack) {
    const manifest = await readManifest();
    const idx = manifest.installed.findIndex((e) => e.id === skill.id);
    const entry: InstalledEntry = {
      id: skill.id,
      version: skill.version,
      installedAt: new Date().toISOString(),
      source: skill.source,
      install: skill.install,
    };
    if (idx >= 0) manifest.installed[idx] = entry;
    else manifest.installed.push(entry);
    await writeManifest(manifest);
  }

  console.log(`[skills-market] ✓ Installed.`);
}

async function cmdInstall(args: string[]): Promise<void> {
  const { common, rest } = parseCommon(args);
  let id: string | undefined;
  let dryRun = false;
  let noTrack = false;
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === "--dry-run") dryRun = true;
    else if (a === "--no-track") noTrack = true;
    else if (a === "install") continue;
    else if (a.startsWith("--")) {
      console.error(`Unknown option: ${a}`);
      process.exit(2);
    } else if (!id) id = a;
  }
  if (!id) {
    help();
    process.exit(2);
  }
  const registry = await loadRegistry(common);
  const skill = registry.skills.find((s) => s.id === id || s.name === id);
  if (!skill) {
    console.error(`[skills-market] Skill not found: ${id}`);
    console.error(`Available: ${registry.skills.map((s) => s.id).join(", ")}`);
    process.exit(1);
  }
  await installSkill(skill, { ...common, dryRun, noTrack });
}

async function cmdList(): Promise<void> {
  const manifest = await readManifest();
  if (!manifest.installed.length) {
    console.log("No skills installed via skills-market on this machine.");
    console.log(`(Manifest: ${MANIFEST_PATH})`);
    return;
  }
  console.log(`Installed skills (manifest: ${MANIFEST_PATH}):\n`);
  for (const e of manifest.installed) {
    const here = existsSync(join(CLAUDE_SKILLS_DIR, e.id)) ? "✓" : "✗ missing on disk";
    console.log(`  ${here}  ${e.id} @ v${e.version}    (installed ${e.installedAt})`);
  }
}

async function cmdRemove(args: string[]): Promise<void> {
  const id = args.find((a) => !a.startsWith("--") && a !== "remove");
  if (!id) {
    console.error("Usage: skills-market remove <skill-id>");
    process.exit(2);
  }
  const dryRun = args.includes("--dry-run");
  const targetDir = join(CLAUDE_SKILLS_DIR, id);
  if (existsSync(targetDir)) {
    if (dryRun) console.log(`[skills-market] DRY RUN — would rm -rf ${targetDir}`);
    else {
      await rm(targetDir, { recursive: true, force: true });
      console.log(`[skills-market] Removed ${targetDir}`);
    }
  } else {
    console.log(`[skills-market] Not on disk: ${targetDir}`);
  }
  const manifest = await readManifest();
  const before = manifest.installed.length;
  manifest.installed = manifest.installed.filter((e) => e.id !== id);
  if (manifest.installed.length !== before && !dryRun) {
    await writeManifest(manifest);
    console.log(`[skills-market] Removed ${id} from manifest`);
  }
}

async function cmdSync(args: string[]): Promise<void> {
  const { common, rest } = parseCommon(args);
  const dryRun = rest.includes("--dry-run");
  const manifest = await readManifest();
  if (!manifest.installed.length) {
    console.log("[skills-market] Manifest is empty — nothing to sync.");
    console.log(`Tip: install something on your other machine first, then copy ${MANIFEST_PATH} here.`);
    return;
  }
  const registry = await loadRegistry(common);
  console.log(`[skills-market] Sync target: ${CLAUDE_SKILLS_DIR}`);
  console.log(`[skills-market] Manifest:    ${MANIFEST_PATH} (${manifest.installed.length} skills)`);
  let installed = 0;
  let skipped = 0;
  let failed = 0;
  for (const entry of manifest.installed) {
    const skill = registry.skills.find((s) => s.id === entry.id);
    if (!skill) {
      console.warn(`  ⚠ ${entry.id}: not in registry, skipping`);
      skipped++;
      continue;
    }
    try {
      await installSkill(skill, { ...common, dryRun, noTrack: true });
      installed++;
    } catch (err: any) {
      console.error(`  ✗ ${entry.id}: ${err.message ?? err}`);
      failed++;
    }
  }
  console.log(
    `\n[skills-market] sync done — installed ${installed}, skipped ${skipped}, failed ${failed}.`
  );
}

async function cmdMirror(args: string[]): Promise<void> {
  const sub = args[0];
  const repoUrl =
    process.env.SKILLS_MARKET_REPO_URL ??
    "https://github.com/Equality-Machine/skills-market.git";

  if (sub === "init") {
    if (existsSync(MIRROR_DIR)) {
      console.log(`[skills-market] Mirror already exists at ${MIRROR_DIR}. Use \`mirror update\`.`);
      return;
    }
    await mkdir(SKILLS_MARKET_HOME, { recursive: true });
    console.log(`[skills-market] Cloning ${repoUrl} → ${MIRROR_DIR}`);
    const r = await run("git", ["clone", repoUrl, MIRROR_DIR]);
    if (r.code !== 0) {
      console.error(`[skills-market] git clone failed: ${r.stderr.trim()}`);
      process.exit(1);
    }
    console.log(`[skills-market] ✓ Mirror ready. Future installs prefer the mirror.`);
    return;
  }
  if (sub === "update" || sub === "pull") {
    if (!existsSync(MIRROR_DIR)) {
      console.error(`[skills-market] No mirror at ${MIRROR_DIR}. Run \`skills-market mirror init\` first.`);
      process.exit(1);
    }
    const r = await run("git", ["pull", "--ff-only"], MIRROR_DIR);
    process.stdout.write(r.stdout);
    process.stderr.write(r.stderr);
    if (r.code !== 0) process.exit(r.code);
    console.log(`[skills-market] ✓ Mirror updated.`);
    return;
  }
  if (sub === "status") {
    if (!existsSync(MIRROR_DIR)) {
      console.log(`[skills-market] No mirror. Run \`skills-market mirror init\`.`);
      return;
    }
    const head = await run("git", ["rev-parse", "--short", "HEAD"], MIRROR_DIR);
    const branch = await run("git", ["rev-parse", "--abbrev-ref", "HEAD"], MIRROR_DIR);
    const remote = await run("git", ["remote", "get-url", "origin"], MIRROR_DIR);
    console.log(`Mirror: ${MIRROR_DIR}`);
    console.log(`Origin: ${remote.stdout.trim()}`);
    console.log(`Branch: ${branch.stdout.trim()} @ ${head.stdout.trim()}`);
    return;
  }
  console.error(`Usage: skills-market mirror <init | update | status>`);
  process.exit(2);
}

async function cmdSearch(args: string[]): Promise<void> {
  const { common, rest } = parseCommon(args);
  const query = rest.find((a) => !a.startsWith("--") && a !== "search");
  const registry = await loadRegistry(common);
  const q = (query ?? "").toLowerCase();
  const matches = registry.skills.filter((s) =>
    [s.id, s.name, s.displayName ?? "", s.description, s.category, ...s.tags]
      .join(" ")
      .toLowerCase()
      .includes(q)
  );
  if (!matches.length) {
    console.log(`No skills matched "${query}".`);
    return;
  }
  for (const s of matches) {
    console.log(`${s.id}  v${s.version}  [${s.category}]  ${s.displayName ?? s.name}`);
    console.log(`  ${s.description}`);
    console.log("");
  }
}

async function cmdCatalog(args: string[]): Promise<void> {
  const { common } = parseCommon(args);
  const registry = await loadRegistry(common);
  for (const s of registry.skills) {
    console.log(`${s.id.padEnd(24)} v${s.version.padEnd(8)} [${s.category}]`);
    console.log(`  ${s.description}`);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  if (!argv.length || argv[0] === "--help" || argv[0] === "-h" || argv[0] === "help") {
    help();
    return;
  }
  const cmd = argv[0];
  const rest = argv.slice(1);
  switch (cmd) {
    case "install":
      return cmdInstall(rest);
    case "list":
    case "ls":
      return cmdList();
    case "remove":
    case "rm":
    case "uninstall":
      return cmdRemove(rest);
    case "sync":
      return cmdSync(rest);
    case "mirror":
      return cmdMirror(rest);
    case "search":
      return cmdSearch(rest);
    case "catalog":
      return cmdCatalog(rest);
    default:
      console.error(`Unknown command: ${cmd}`);
      help();
      process.exit(2);
  }
}

main().catch((err) => {
  console.error(`[skills-market] ${err.message ?? err}`);
  process.exit(1);
});
