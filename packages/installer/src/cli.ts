#!/usr/bin/env node
import { mkdir, cp, writeFile, readFile, stat, rm, mkdtemp } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { resolve, join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

const HOME = homedir();
const SKILLS_MARKET_HOME = process.env.SKILLS_MARKET_HOME ?? join(HOME, ".skills-market");
const MANIFEST_PATH = join(SKILLS_MARKET_HOME, "installed.json");
const MIRROR_DIR = join(SKILLS_MARKET_HOME, "mirror");
const DEFAULT_REGISTRY_URL =
  process.env.SKILLS_MARKET_REGISTRY_URL ??
  "https://raw.githubusercontent.com/Equality-Machine/skills-market/main/registry/skills.json";

// Targets are agent runtimes that read skills from a local directory in the
// same `<id>/SKILL.md` shape. Both Claude Code and Codex CLI use this layout.
type TargetName = "claude" | "codex";

interface Target {
  name: TargetName;
  home: string;
  skillsDir: string;
  label: string;
}

const TARGETS: Record<TargetName, Target> = {
  claude: {
    name: "claude",
    home: process.env.CLAUDE_HOME ?? join(HOME, ".claude"),
    skillsDir: process.env.CLAUDE_SKILLS_DIR ?? join(HOME, ".claude", "skills"),
    label: "Claude Code",
  },
  codex: {
    name: "codex",
    home: process.env.CODEX_HOME ?? join(HOME, ".codex"),
    skillsDir: process.env.CODEX_SKILLS_DIR ?? join(HOME, ".codex", "skills"),
    label: "Codex CLI",
  },
};

const ALL_TARGETS: TargetName[] = ["claude", "codex"];

function resolveTargets(explicit: TargetName[] | null): Target[] {
  if (explicit && explicit.length) return explicit.map((n) => TARGETS[n]);
  // Auto-detect: any agent home that already exists on disk.
  const detected = ALL_TARGETS.filter((n) => existsSync(TARGETS[n].home));
  if (detected.length) return detected.map((n) => TARGETS[n]);
  // Fallback: install to Claude (the original target) so we never silently no-op.
  return [TARGETS.claude];
}

function parseTargets(value: string): TargetName[] {
  const parts = value
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (parts.includes("all")) return ALL_TARGETS;
  const valid: TargetName[] = [];
  for (const p of parts) {
    if (p === "claude" || p === "codex") valid.push(p);
    else throw new Error(`Unknown target "${p}". Valid: claude, codex, all.`);
  }
  return valid;
}

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
  targets?: TargetName[];
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
  targets: TargetName[] | null;
}

function help(): void {
  console.log(
    `skills-market — agent skills marketplace (Claude Code + Codex CLI)

Usage:
  npx skills-market <command> [args]

Commands:
  install <id>          Install a skill into every detected agent's skills dir
  update                Pull latest catalog (git pull) and report new skills
  list                  List skills tracked in the personal manifest
  remove <id>           Uninstall a skill (from every recorded target)
  sync                  Reinstall every skill in the personal manifest
  init <id>             Scaffold a new skill folder (skill.json + SKILL.md)
  publish <path>        One-shot PR a skill back upstream. <path> can be:
                          - a directory containing SKILL.md (or just SKILL.md)
                          - a single .md file (auto-staged into a sibling dir)
                        skill.json is auto-derived from frontmatter and flags
                        (--id --description --category --tags …) when missing.
  mirror init           Clone the marketplace repo into ~/.skills-market/mirror
  mirror update         git pull the local mirror
  mirror status         Show mirror state
  search <query>        Search the catalog
  catalog               List the full catalog from the registry

Common options:
  --target <list>          Comma-separated target list: claude,codex,all
                           (default: auto — every agent home that exists)
  --registry-url <url>     Catalog URL (default ${DEFAULT_REGISTRY_URL})
  --registry-path <file>   Local catalog file
  --mirror                 Prefer ~/.skills-market/mirror over network for installs
  --dry-run                Print actions without changing the filesystem

Targets (where SKILL.md gets copied):
  claude   ~/.claude/skills/<id>/   (override with CLAUDE_SKILLS_DIR / CLAUDE_HOME)
  codex    ~/.codex/skills/<id>/    (override with CODEX_SKILLS_DIR  / CODEX_HOME)

Environment:
  SKILLS_MARKET_HOME             Personal data dir (default ~/.skills-market)
  SKILLS_MARKET_REGISTRY_URL     Override registry URL
  SKILLS_MARKET_REGISTRY_PATH    Override registry path
  SKILLS_MARKET_TARGETS          Default --target list (e.g. "claude,codex")
`
  );
}

function parseCommon(args: string[]): { common: CommonOpts; rest: string[] } {
  const common: CommonOpts = {
    registryUrl: process.env.SKILLS_MARKET_REGISTRY_URL ?? DEFAULT_REGISTRY_URL,
    registryPath: process.env.SKILLS_MARKET_REGISTRY_PATH,
    useMirror: false,
    targets: null,
  };
  const envTargets = process.env.SKILLS_MARKET_TARGETS;
  if (envTargets) common.targets = parseTargets(envTargets);
  const rest: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--registry-url" && args[i + 1]) common.registryUrl = args[++i];
    else if (a === "--registry-path" && args[i + 1]) common.registryPath = args[++i];
    else if (a === "--mirror") common.useMirror = true;
    else if (a === "--target" && args[i + 1]) common.targets = parseTargets(args[++i]);
    else if (a.startsWith("--target=")) common.targets = parseTargets(a.slice("--target=".length));
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
  const targets = resolveTargets(opts.targets);
  console.log(
    `[skills-market] Installing ${skill.displayName ?? skill.name} (${skill.id}) v${skill.version}`
  );
  console.log(`[skills-market] Targets: ${targets.map((t) => t.label).join(", ")}`);

  const { dir: sourceDir, cleanup } = await resolveSourceDir(skill, opts);
  console.log(`[skills-market] Source: ${sourceDir}`);

  try {
    if (opts.dryRun) {
      for (const t of targets) {
        console.log(
          `[skills-market] DRY RUN — would copy ${sourceDir} → ${join(t.skillsDir, skill.id)}`
        );
      }
      return;
    }

    const stats = await stat(sourceDir);
    if (!stats.isDirectory()) throw new Error(`Source is not a directory: ${sourceDir}`);

    for (const t of targets) {
      const targetDir = join(t.skillsDir, skill.id);
      await mkdir(t.skillsDir, { recursive: true });
      await rm(targetDir, { recursive: true, force: true });
      await cp(sourceDir, targetDir, { recursive: true, force: true });
      const receipt = {
        installedAt: new Date().toISOString(),
        target: t.name,
        skill,
      };
      await writeFile(join(targetDir, ".skills-market.json"), JSON.stringify(receipt, null, 2));
      console.log(`[skills-market]   ✓ ${t.label}: ${targetDir}`);
    }
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
      targets: targets.map((t) => t.name),
    };
    if (idx >= 0) manifest.installed[idx] = entry;
    else manifest.installed.push(entry);
    await writeManifest(manifest);
  }
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
    const recorded = (e.targets && e.targets.length ? e.targets : ["claude"]) as TargetName[];
    const states = recorded.map((n) => {
      const t = TARGETS[n];
      return existsSync(join(t.skillsDir, e.id)) ? `✓ ${t.label.toLowerCase().split(" ")[0]}` : `✗ ${t.label.toLowerCase().split(" ")[0]}`;
    });
    console.log(`  ${e.id} @ v${e.version}    [${states.join(", ")}]    (installed ${e.installedAt})`);
  }
}

async function cmdRemove(args: string[]): Promise<void> {
  const { common, rest } = parseCommon(args);
  const id = rest.find((a) => !a.startsWith("--") && a !== "remove");
  if (!id) {
    console.error("Usage: skills-market remove <skill-id> [--target=claude,codex]");
    process.exit(2);
  }
  const dryRun = rest.includes("--dry-run");
  // If user passed --target, only remove from those; otherwise remove from
  // every target the manifest says it was installed to (fallback: all known).
  const manifest = await readManifest();
  const entry = manifest.installed.find((e) => e.id === id);
  const recordedTargets = entry?.targets?.length ? entry.targets : ALL_TARGETS;
  const targets = common.targets ? common.targets.map((n) => TARGETS[n]) : recordedTargets.map((n) => TARGETS[n]);

  for (const t of targets) {
    const targetDir = join(t.skillsDir, id);
    if (existsSync(targetDir)) {
      if (dryRun) console.log(`[skills-market] DRY RUN — would rm -rf ${targetDir}`);
      else {
        await rm(targetDir, { recursive: true, force: true });
        console.log(`[skills-market] Removed ${t.label}: ${targetDir}`);
      }
    } else {
      console.log(`[skills-market] Not on disk (${t.label}): ${targetDir}`);
    }
  }

  if (!dryRun) {
    if (common.targets && entry) {
      // Targeted removal: keep manifest entry but trim its targets list.
      const remaining = (entry.targets ?? recordedTargets).filter((n) => !common.targets!.includes(n));
      if (remaining.length === 0) {
        manifest.installed = manifest.installed.filter((e) => e.id !== id);
        console.log(`[skills-market] Removed ${id} from manifest (all targets gone)`);
      } else {
        entry.targets = remaining;
        console.log(`[skills-market] Manifest now records targets: ${remaining.join(", ")}`);
      }
      await writeManifest(manifest);
    } else {
      const before = manifest.installed.length;
      manifest.installed = manifest.installed.filter((e) => e.id !== id);
      if (manifest.installed.length !== before) {
        await writeManifest(manifest);
        console.log(`[skills-market] Removed ${id} from manifest`);
      }
    }
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
    // Use the manifest's recorded targets so reinstall mirrors the original
    // setup; user-supplied --target on `sync` overrides that.
    const perEntryTargets = common.targets ?? (entry.targets && entry.targets.length ? entry.targets : null);
    try {
      await installSkill(skill, { ...common, targets: perEntryTargets, dryRun, noTrack: true });
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

function detectWorkingCopy(): string | null {
  // CLI lives at <repo>/packages/installer/dist/cli.js when installed via `npm link`
  // from a clone. Walk three levels up and check for a .git directory.
  const candidate = resolve(HERE, "..", "..", "..");
  if (existsSync(join(candidate, ".git"))) return candidate;
  return null;
}

function diffSkills(before: SkillEntry[], after: SkillEntry[]): { added: SkillEntry[]; removed: SkillEntry[]; updated: { from: SkillEntry; to: SkillEntry }[] } {
  const beforeMap = new Map(before.map((s) => [s.id, s]));
  const afterMap = new Map(after.map((s) => [s.id, s]));
  const added: SkillEntry[] = [];
  const removed: SkillEntry[] = [];
  const updated: { from: SkillEntry; to: SkillEntry }[] = [];
  for (const s of after) {
    const prev = beforeMap.get(s.id);
    if (!prev) added.push(s);
    else if (prev.version !== s.version) updated.push({ from: prev, to: s });
  }
  for (const s of before) {
    if (!afterMap.has(s.id)) removed.push(s);
  }
  return { added, removed, updated };
}

async function cmdUpdate(args: string[]): Promise<void> {
  const { common } = parseCommon(args);
  const dryRun = args.includes("--dry-run");

  let beforeRegistry: { skills: SkillEntry[] };
  try {
    beforeRegistry = await loadRegistry(common);
  } catch {
    beforeRegistry = { skills: [] };
  }

  const workingCopy = detectWorkingCopy();
  let updated = false;

  if (workingCopy) {
    console.log(`[skills-market] git pull on working copy: ${workingCopy}`);
    if (dryRun) {
      console.log("[skills-market] DRY RUN — would `git pull --ff-only` and rebuild");
    } else {
      const beforeSha = (await run("git", ["rev-parse", "HEAD"], workingCopy)).stdout.trim();
      const r = await run("git", ["pull", "--ff-only"], workingCopy);
      if (r.stdout) process.stdout.write(r.stdout);
      if (r.stderr) process.stderr.write(r.stderr);
      if (r.code !== 0) {
        console.error(`[skills-market] git pull failed (exit ${r.code}). Resolve and retry.`);
        process.exit(r.code);
      }
      const afterSha = (await run("git", ["rev-parse", "HEAD"], workingCopy)).stdout.trim();
      // If anything actually changed, rebuild so the dist that this CLI is run
      // out of stays in sync with the source. Without this step `update` would
      // pull new src/ but keep the old compiled CLI in dist/.
      if (beforeSha !== afterSha) {
        console.log(`[skills-market] Rebuilding CLI (${beforeSha.slice(0, 7)} → ${afterSha.slice(0, 7)}) …`);
        const inst = await run("npm", ["install", "--silent", "--no-audit", "--no-fund"], workingCopy);
        if (inst.code !== 0) {
          console.warn(`[skills-market] npm install warning: ${inst.stderr.trim()}`);
        }
        const build = await run("npm", ["run", "build", "--silent"], workingCopy);
        if (build.code !== 0) {
          console.warn(`[skills-market] Rebuild failed (exit ${build.code}). Old CLI may still be in use.`);
          if (build.stderr) process.stderr.write(build.stderr);
        } else {
          console.log(`[skills-market] ✓ Rebuilt`);
        }
      }
      updated = true;
    }
  }

  if (!updated && existsSync(MIRROR_DIR)) {
    console.log(`[skills-market] git pull on mirror: ${MIRROR_DIR}`);
    if (!dryRun) {
      const r = await run("git", ["pull", "--ff-only"], MIRROR_DIR);
      if (r.stdout) process.stdout.write(r.stdout);
      if (r.stderr) process.stderr.write(r.stderr);
      if (r.code !== 0) process.exit(r.code);
      updated = true;
    }
  }

  if (!updated) {
    // No working copy and no mirror — fetch the registry into a cache so
    // subsequent calls can still see it.
    const url = common.registryUrl ?? DEFAULT_REGISTRY_URL;
    console.log(`[skills-market] No working copy or mirror — fetching ${url}`);
    if (!dryRun) {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const text = await res.text();
      const cachePath = join(SKILLS_MARKET_HOME, "cache", "skills.json");
      await mkdir(dirname(cachePath), { recursive: true });
      await writeFile(cachePath, text, "utf-8");
      console.log(`[skills-market] Cached registry → ${cachePath}`);
      console.log(`[skills-market] Tip: pass --registry-path ${cachePath} or set SKILLS_MARKET_REGISTRY_PATH to use it.`);
    }
  }

  let afterRegistry: { skills: SkillEntry[] };
  try {
    afterRegistry = await loadRegistry(common);
  } catch {
    afterRegistry = beforeRegistry;
  }

  const { added, removed, updated: bumped } = diffSkills(beforeRegistry.skills, afterRegistry.skills);
  if (!added.length && !removed.length && !bumped.length) {
    console.log(`\n[skills-market] No catalog changes. (${afterRegistry.skills.length} skill${afterRegistry.skills.length !== 1 ? "s" : ""})`);
    return;
  }

  if (added.length) {
    console.log(`\nNew skills (${added.length}):`);
    for (const s of added) {
      console.log(`  + ${s.id.padEnd(20)} v${s.version}  [${s.category}]`);
      console.log(`      ${s.description}`);
    }
  }
  if (bumped.length) {
    console.log(`\nVersion bumps (${bumped.length}):`);
    for (const { from, to } of bumped) {
      console.log(`  * ${to.id.padEnd(20)} v${from.version} → v${to.version}`);
    }
  }
  if (removed.length) {
    console.log(`\nRemoved (${removed.length}):`);
    for (const s of removed) console.log(`  - ${s.id}`);
  }
  console.log(`\nNext: \`skills-market install <id>\` to add a new skill, or \`skills-market sync\` to apply version bumps to already-installed skills.`);
}

// ---------------------------------------------------------------------------
// init — scaffold a local skill directory.
// ---------------------------------------------------------------------------

const ID_PATTERN = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
const ALLOWED_CATEGORIES = [
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

interface InitFlags {
  id?: string;
  display?: string;
  description?: string;
  category?: string;
  version?: string;
  author?: string;
  email?: string;
  license?: string;
  tags?: string[];
  dir?: string;
  force?: boolean;
}

function parseInitFlags(args: string[]): InitFlags {
  const f: InitFlags = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    const next = args[i + 1];
    if (a === "init") continue;
    if (a === "--display" && next) (f.display = next), i++;
    else if (a === "--description" && next) (f.description = next), i++;
    else if (a === "--category" && next) (f.category = next), i++;
    else if (a === "--version" && next) (f.version = next), i++;
    else if (a === "--author" && next) (f.author = next), i++;
    else if (a === "--email" && next) (f.email = next), i++;
    else if (a === "--license" && next) (f.license = next), i++;
    else if (a === "--tags" && next) (f.tags = next.split(",").map((t) => t.trim()).filter(Boolean)), i++;
    else if (a === "--dir" && next) (f.dir = next), i++;
    else if (a === "--force") f.force = true;
    else if (a.startsWith("--")) {
      console.error(`Unknown option: ${a}`);
      process.exit(2);
    } else if (!f.id) {
      f.id = a;
    }
  }
  return f;
}

async function cmdInit(args: string[]): Promise<void> {
  const f = parseInitFlags(args);
  if (!f.id) {
    console.error("Usage: skills-market init <id> [--display ...] [--description ...] [--category ...] [--tags a,b] [--dir <path>]");
    process.exit(2);
  }
  if (!ID_PATTERN.test(f.id)) {
    console.error(`Invalid id "${f.id}". Must match ${ID_PATTERN}`);
    process.exit(1);
  }
  const category = f.category ?? "other";
  if (!ALLOWED_CATEGORIES.includes(category)) {
    console.error(`Invalid category "${category}". Must be one of: ${ALLOWED_CATEGORIES.join(", ")}`);
    process.exit(1);
  }

  const targetDir = resolve(f.dir ?? f.id);
  if (existsSync(targetDir) && !f.force) {
    if ((await readdirSafe(targetDir)).length > 0) {
      console.error(`Directory exists and is not empty: ${targetDir} (use --force to overwrite)`);
      process.exit(1);
    }
  }

  const meta = {
    id: f.id,
    displayName: f.display ?? f.id,
    description: f.description ?? `TODO: describe ${f.id} (10–500 chars).`,
    version: f.version ?? "0.1.0",
    author: f.email ? { name: f.author ?? "Anonymous", email: f.email } : { name: f.author ?? "Anonymous" },
    category,
    tags: f.tags ?? [],
    license: f.license ?? "MIT",
    createdAt: new Date().toISOString(),
  };

  const skillMd = `---
name: ${f.id}
description: ${meta.description}
---

# ${meta.displayName}

<!-- TODO: write the prompt Claude Code / Codex CLI should follow when this skill is active. -->

## Activation

Activate when ...

## What to do

1. Step one.
2. Step two.

## Output

Describe the desired output format.
`;

  await mkdir(targetDir, { recursive: true });
  await writeFile(join(targetDir, "skill.json"), JSON.stringify(meta, null, 2) + "\n", "utf-8");
  await writeFile(join(targetDir, "SKILL.md"), skillMd, "utf-8");
  console.log(`[skills-market] ✓ Scaffolded ${targetDir}`);
  console.log(`  ${join(targetDir, "skill.json")}`);
  console.log(`  ${join(targetDir, "SKILL.md")}`);
  console.log(`\nNext: edit SKILL.md, then run \`skills-market publish ${targetDir}\` to send a PR upstream.`);
}

async function readdirSafe(dir: string): Promise<string[]> {
  try {
    return await (await import("node:fs/promises")).readdir(dir);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// publish — one-shot PR a local skill into the marketplace.
// ---------------------------------------------------------------------------

interface PublishFlags {
  dir?: string;
  dryRun?: boolean;
  noPr?: boolean;
  // skill.json fields — used only when skill.json is missing.
  id?: string;
  display?: string;
  description?: string;
  category?: string;
  version?: string;
  author?: string;
  email?: string;
  license?: string;
  tags?: string[];
}

function parsePublishFlags(args: string[]): PublishFlags {
  const f: PublishFlags = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    const next = args[i + 1];
    if (a === "publish") continue;
    if (a === "--dry-run") f.dryRun = true;
    else if (a === "--no-pr") f.noPr = true;
    else if (a === "--id" && next) (f.id = next), i++;
    else if (a === "--display" && next) (f.display = next), i++;
    else if (a === "--description" && next) (f.description = next), i++;
    else if (a === "--category" && next) (f.category = next), i++;
    else if (a === "--version" && next) (f.version = next), i++;
    else if (a === "--author" && next) (f.author = next), i++;
    else if (a === "--email" && next) (f.email = next), i++;
    else if (a === "--license" && next) (f.license = next), i++;
    else if (a === "--tags" && next) (f.tags = next.split(",").map((t) => t.trim()).filter(Boolean)), i++;
    else if (a.startsWith("--")) {
      console.error(`Unknown option: ${a}`);
      process.exit(2);
    } else if (!f.dir) f.dir = a;
  }
  return f;
}

/** Parse a tiny subset of YAML frontmatter — string scalars only. */
function parseFrontmatter(md: string): Record<string, string> {
  const m = md.match(/^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/);
  if (!m) return {};
  const out: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^\s*([A-Za-z0-9_-]+)\s*:\s*(.*?)\s*$/);
    if (!kv) continue;
    let v = kv[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[kv[1]] = v;
  }
  return out;
}

async function cmdPublish(args: string[]): Promise<void> {
  const f = parsePublishFlags(args);
  let skillDir = resolve(f.dir ?? ".");

  if (!existsSync(skillDir)) {
    console.error(`[skills-market] Path not found: ${skillDir}`);
    console.error(
      `Tip: pass either a directory containing SKILL.md or a single .md file. Cwd: ${process.cwd()}`
    );
    process.exit(1);
  }

  // 0. File-mode: accept a single .md file. Stage it into a sibling directory
  //    so the rest of the flow (which works on directories) is unchanged.
  const inputStat = await stat(skillDir);
  if (inputStat.isFile()) {
    skillDir = await stageFromMarkdownFile(skillDir, f);
  }

  // 1. SKILL.md is mandatory. skill.json is auto-derived from frontmatter +
  //    flags when missing, so users can publish a skill they've already
  //    written without a separate `init` step.
  const skillJsonPath = join(skillDir, "skill.json");
  const skillMdPath = join(skillDir, "SKILL.md");
  if (!existsSync(skillMdPath)) {
    console.error(`[skills-market] No SKILL.md at ${skillMdPath}.`);
    console.error(`Tip: pass either a directory containing SKILL.md, or a single .md file.`);
    process.exit(1);
  }
  const skillMd = await readFile(skillMdPath, "utf-8");
  const fm = parseFrontmatter(skillMd);

  let meta: any;
  if (existsSync(skillJsonPath)) {
    try {
      meta = JSON.parse(await readFile(skillJsonPath, "utf-8"));
    } catch (err: any) {
      console.error(`[skills-market] skill.json is not valid JSON: ${err.message}`);
      process.exit(1);
    }
  } else {
    // Derive metadata: flags ⊃ SKILL.md frontmatter ⊃ defaults.
    const dirName = basename(skillDir);
    const id = f.id ?? fm.name ?? dirName;
    const description = f.description ?? fm.description;
    // Category is optional — frontmatter can declare it, otherwise default to
    // "other". The validator still enforces the enum below.
    const category = (f.category ?? fm.category ?? "other").toLowerCase();
    const author = await deriveAuthor(f.author);
    const email = f.email ?? (await deriveEmail());
    if (!description) {
      console.error(`[skills-market] No skill.json found at ${skillJsonPath}, and SKILL.md doesn't define a description.`);
      console.error(`  Either add \`description: …\` to the YAML frontmatter, or pass --description "<text>".`);
      console.error(`\nFlags supported: --id --display --description --category --version --author --email --license --tags`);
      process.exit(1);
    }
    if (!ALLOWED_CATEGORIES.includes(category)) {
      console.error(`[skills-market] Invalid category "${category}". Valid: ${ALLOWED_CATEGORIES.join(", ")}.`);
      process.exit(1);
    }
    meta = {
      id,
      displayName: f.display ?? fm.name ?? id,
      description,
      version: f.version ?? "0.1.0",
      author: email ? { name: author, email } : { name: author },
      category,
      tags: f.tags ?? [],
      license: f.license ?? "MIT",
      createdAt: new Date().toISOString(),
    };
    // Persist into the user's source dir so subsequent edits / republishes don't ask again.
    await writeFile(skillJsonPath, JSON.stringify(meta, null, 2) + "\n", "utf-8");
    console.log(`[skills-market] ✓ Wrote ${skillJsonPath} (derived from SKILL.md + flags)`);
  }

  if (!meta.id || !ID_PATTERN.test(meta.id)) {
    console.error(`[skills-market] Invalid id "${meta.id ?? "<missing>"}". Must match ${ID_PATTERN}.`);
    process.exit(1);
  }
  if (!meta.description || meta.description.length < 10 || meta.description.length > 500) {
    console.error(`[skills-market] description must be 10–500 chars (got ${meta.description?.length ?? 0})`);
    process.exit(1);
  }
  if (!ALLOWED_CATEGORIES.includes(meta.category)) {
    console.error(`[skills-market] category "${meta.category}" must be one of: ${ALLOWED_CATEGORIES.join(", ")}`);
    process.exit(1);
  }

  console.log(`[skills-market] Publishing skill "${meta.id}" v${meta.version}`);
  console.log(`[skills-market] From: ${skillDir}`);

  // 2. Ensure gh CLI is present + authenticated.
  const ghCheck = await run("gh", ["auth", "status"]);
  if (ghCheck.code !== 0) {
    console.error(`[skills-market] gh CLI is not authenticated. Run: gh auth login`);
    process.exit(1);
  }

  const repoUrl = process.env.SKILLS_MARKET_REPO_URL ?? "https://github.com/Equality-Machine/skills-market.git";
  const repoFull = repoUrlToFullName(repoUrl); // "Equality-Machine/skills-market"

  // 3. Set up scratch clone.
  const scratch = join(SKILLS_MARKET_HOME, "publish", `${meta.id}-${Date.now().toString(36)}`);
  await mkdir(dirname(scratch), { recursive: true });
  console.log(`[skills-market] Cloning ${repoUrl} → ${scratch}`);
  let r = await run("git", ["clone", "--quiet", "--depth=20", repoUrl, scratch]);
  if (r.code !== 0) {
    console.error(`[skills-market] Clone failed: ${r.stderr.trim()}`);
    process.exit(1);
  }

  // Use the gh user's verified name+email as the commit author.
  const ghUser = (await run("gh", ["api", "user", "--jq", ".login"])).stdout.trim();

  try {
    // 4. Copy skill into skills/<id>/, regenerate registry, validate.
    const targetSubdir = join(scratch, "skills", meta.id);
    await rm(targetSubdir, { recursive: true, force: true });
    await mkdir(dirname(targetSubdir), { recursive: true });
    await cp(skillDir, targetSubdir, { recursive: true });
    // Strip files contributors aren't supposed to ship (prior install receipts).
    await rm(join(targetSubdir, ".skills-market.json"), { force: true });

    r = await run("node", [join(scratch, "scripts/build-registry.mjs")], scratch);
    if (r.code !== 0) {
      console.error(`[skills-market] registry:build failed:\n${r.stderr}`);
      process.exit(1);
    }
    r = await run("node", [join(scratch, "scripts/validate-registry.mjs")], scratch);
    if (r.code !== 0) {
      console.error(`[skills-market] registry:validate failed:\n${r.stdout}\n${r.stderr}`);
      process.exit(1);
    }
    console.log(`[skills-market] ✓ Registry validated`);

    // 5. Branch + commit.
    const branch = `skill/${meta.id}-${Date.now().toString(36)}`;
    await run("git", ["checkout", "-b", branch], scratch);
    await run("git", ["add", "skills", "registry"], scratch);
    const commitMsg = `add ${meta.id} skill\n\n${meta.description}`;
    r = await run("git", ["-c", `user.name=${ghUser}`, "-c", `user.email=${ghUser}@users.noreply.github.com`, "commit", "-m", commitMsg], scratch);
    if (r.code !== 0) {
      console.error(`[skills-market] git commit failed:\n${r.stderr}`);
      process.exit(1);
    }

    if (f.dryRun) {
      console.log(`[skills-market] DRY RUN — would push and open PR`);
      console.log(`  Branch: ${branch}`);
      console.log(`  Repo:   ${repoFull}`);
      return;
    }

    // 6. Try direct push (maintainer path), fall back to fork-and-push.
    let pushTarget = "origin";
    let prHead = branch;
    r = await run("git", ["push", "--set-upstream", "origin", branch], scratch);
    if (r.code !== 0) {
      console.log(`[skills-market] Direct push denied — forking ${repoFull}`);
      const forkRes = await run("gh", ["repo", "fork", repoFull, "--clone=false", "--remote=true", "--remote-name=fork"], scratch);
      if (forkRes.code !== 0 && !/already exists/i.test(forkRes.stderr)) {
        console.error(`[skills-market] gh repo fork failed:\n${forkRes.stderr}`);
        process.exit(1);
      }
      r = await run("git", ["push", "--set-upstream", "fork", branch], scratch);
      if (r.code !== 0) {
        console.error(`[skills-market] Fork push failed:\n${r.stderr}`);
        process.exit(1);
      }
      pushTarget = "fork";
      prHead = `${ghUser}:${branch}`;
    }
    console.log(`[skills-market] ✓ Pushed branch "${branch}" to ${pushTarget}`);

    if (f.noPr) {
      console.log(`[skills-market] Skipping PR creation (--no-pr).`);
      console.log(`Open one at: https://github.com/${repoFull}/compare/main...${prHead}`);
      return;
    }

    // 7. Open PR via gh.
    const prTitle = `add ${meta.id} skill`;
    const prBody = [
      `Adds the \`${meta.id}\` skill (v${meta.version}, ${meta.category}).`,
      "",
      `**Description:** ${meta.description}`,
      "",
      `Submitted via \`skills-market publish\`.`,
    ].join("\n");
    const prArgs = [
      "pr",
      "create",
      "--repo",
      repoFull,
      "--title",
      prTitle,
      "--body",
      prBody,
      "--head",
      prHead,
      "--base",
      "main",
    ];
    r = await run("gh", prArgs, scratch);
    if (r.code !== 0) {
      console.error(`[skills-market] gh pr create failed:\n${r.stderr}`);
      console.log(`Manual link: https://github.com/${repoFull}/compare/main...${prHead}`);
      process.exit(1);
    }
    process.stdout.write(r.stdout);
    console.log(`[skills-market] ✓ PR opened.`);
  } finally {
    // Clean up scratch dir.
    await rm(scratch, { recursive: true, force: true });
  }
}

/**
 * File-mode publish: accept a single .md file and produce a normal skill
 * directory beside it.
 *
 * - <foo.md>    → create ./<id>/SKILL.md (id from frontmatter.name, --id, or
 *                  filename-without-extension), keep the original .md untouched.
 * - <SKILL.md>  → just shift up to the parent directory; no copy.
 *
 * If the source file lacks frontmatter, we synthesize one from frontmatter
 * defaults (id and description) so agents can read the skill correctly.
 */
async function stageFromMarkdownFile(filePath: string, f: PublishFlags): Promise<string> {
  if (!filePath.toLowerCase().endsWith(".md")) {
    console.error(`[skills-market] Expected a .md file, got: ${filePath}`);
    process.exit(1);
  }
  const fileBase = basename(filePath);
  if (fileBase.toLowerCase() === "skill.md") {
    // Already named SKILL.md — its parent directory is the skill dir.
    return dirname(filePath);
  }

  const md = await readFile(filePath, "utf-8");
  const fm = parseFrontmatter(md);
  const fallbackId = fileBase.replace(/\.md$/i, "");
  const id = f.id ?? fm.name ?? fallbackId;
  if (!ID_PATTERN.test(id)) {
    console.error(
      `[skills-market] Cannot derive a valid skill id from "${fileBase}".\n` +
        `Either rename the file (e.g. \`${fallbackId.replace(/[^a-z0-9-]/gi, "-").toLowerCase()}.md\`), add \`name: <id>\` to its YAML frontmatter, or pass --id <id>.`
    );
    process.exit(1);
  }

  const stagedDir = resolve(dirname(filePath), id);
  if (existsSync(stagedDir)) {
    const isDir = (await stat(stagedDir)).isDirectory();
    if (!isDir) {
      console.error(`[skills-market] ${stagedDir} exists and is not a directory. Pass --id to choose a different name.`);
      process.exit(1);
    }
  }
  await mkdir(stagedDir, { recursive: true });

  const stagedSkillMd = join(stagedDir, "SKILL.md");
  // Always sync the body from the source .md, so re-publishes pick up edits.
  // Inject frontmatter if missing (use fm.* if any, otherwise we'll let the
  // skill.json-derivation step error out for missing description).
  const description = f.description ?? fm.description;
  let staged = md;
  if (!hasFrontmatter(md)) {
    const lines: string[] = [`name: ${id}`];
    if (description) lines.push(`description: ${description}`);
    const block = `---\n${lines.join("\n")}\n---\n\n`;
    staged = block + md.replace(/^\s+/, "");
  }
  await writeFile(stagedSkillMd, staged, "utf-8");
  console.log(`[skills-market] Staged ${filePath} → ${stagedSkillMd}`);
  return stagedDir;
}

function hasFrontmatter(md: string): boolean {
  return /^---\s*\n[\s\S]*?\n---\s*(?:\n|$)/.test(md);
}

async function deriveAuthor(explicit?: string): Promise<string> {
  if (explicit) return explicit;
  const r = await run("git", ["config", "--global", "user.name"]);
  if (r.code === 0 && r.stdout.trim()) return r.stdout.trim();
  return process.env.USER ?? "Anonymous";
}

async function deriveEmail(): Promise<string | undefined> {
  const r = await run("git", ["config", "--global", "user.email"]);
  if (r.code === 0 && r.stdout.trim()) return r.stdout.trim();
  return undefined;
}

function repoUrlToFullName(url: string): string {
  // Accepts https://github.com/<owner>/<repo>.git or git@github.com:<owner>/<repo>.git
  const m = url.match(/[/:]([^/:]+)\/([^/]+?)(?:\.git)?$/);
  if (!m) throw new Error(`Cannot parse repo from URL: ${url}`);
  return `${m[1]}/${m[2]}`;
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
    case "update":
    case "pull":
    case "refresh":
      return cmdUpdate(rest);
    case "init":
    case "new":
      return cmdInit(rest);
    case "publish":
    case "submit":
      return cmdPublish(rest);
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
