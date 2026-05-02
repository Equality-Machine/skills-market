# Examples

[English](EXAMPLES.md) · [简体中文](EXAMPLES.zh-CN.md)

Every CLI feature with a real command and (lightly trimmed) actual output.
All commands below were captured against
[`Equality-Machine/skills-market`](https://github.com/Equality-Machine/skills-market)
in an isolated tempdir; copy them as-is.

> Conventions used in the snippets:
> - `$` prompt = a command you type
> - everything below the next blank line is real captured output

---

## 1. Install the CLI

```bash
$ curl -fsSL https://equality-machine.github.io/skills-market/install.sh | sh
```

```text
==> Checking dependencies
✓  git 2.43.0, node v20.11.1, npm 10.2.4
==> Cloning https://github.com/Equality-Machine/skills-market.git → /Users/you/.skills-market/repo
✓  Repository ready
==> Installing dependencies (this can take a minute)
✓  Dependencies installed
==> Building CLI
✓  CLI built
✓  Linked /Users/you/.local/bin/skills-market → /Users/you/.skills-market/repo/packages/installer/dist/cli.js
✓  /Users/you/.local/bin is on your PATH

skills-market is installed.

Try:
  skills-market catalog               # list all skills
  skills-market install hello-world   # install a skill
  …
```

If `~/.local/bin` isn't on your `PATH`, the script prints the one-liner you
need to add to `~/.zshrc` / `~/.bashrc` / fish.

---

## 2. Browse the catalog

```bash
$ skills-market catalog
```

```text
design-critic            v1.0.0    [design]
  Reviews UI mockups, screenshots, and Figma frames; calls out spacing, hierarchy and accessibility issues.
git-helper               v0.2.1    [development]
  Smart git workflow helper that summarizes diffs, drafts conventional commit messages, and explains merge conflicts.
hello-world              v0.1.0    [demo]
  A friendly demo skill that introduces Claude Code and prints a greeting.
k8s-doctor               v0.4.0    [devops]
  Diagnoses pod crashes, networking issues, and resource pressure across namespaces with redacted kubectl context.
regex-explainer          v0.1.0    [development]
  Breaks down regular expressions into plain-English, token by token, and flags common pitfalls like greedy quantifiers and unanchored patterns.
translate-cn-en          v0.3.0    [writing]
  在 Claude Code 内提供中英互译，保留代码块、技术术语，和 Markdown 结构。
```

---

## 3. Search

```bash
$ skills-market search regex
```

```text
regex-explainer  v0.1.0  [development]  Regex Explainer
  Breaks down regular expressions into plain-English, token by token, and flags common pitfalls like greedy quantifiers and unanchored patterns.
```

`search` runs case-insensitively against id, name, description, category, and
tags.

---

## 4. Install (auto-detect every agent on your machine)

```bash
$ skills-market install hello-world
```

```text
[skills-market] Installing Hello World (hello-world) v0.1.0
[skills-market] Targets: Claude Code, Codex CLI
[skills-market] Source: /Users/you/.skills-market/repo/skills/hello-world
[skills-market]   ✓ Claude Code: /Users/you/.claude/skills/hello-world
[skills-market]   ✓ Codex CLI: /Users/you/.codex/skills/hello-world
```

The CLI checks which agent home directories exist and writes to all of them.
On a Claude-only machine you'd see only the first line; on a Codex-only
machine, only the second.

---

## 5. List installed skills

```bash
$ skills-market list
```

```text
Installed skills (manifest: /Users/you/.skills-market/installed.json):

  hello-world @ v0.1.0    [✓ claude, ✓ codex]    (installed 2026-05-02T13:02:24.805Z)
```

`✓` per target = present on disk. `✗` would mean "manifest says it's
installed, but the directory is gone".

---

## 6. Pin install to a single agent

```bash
$ skills-market install --target=codex git-helper
```

```text
[skills-market] Installing Git Helper (git-helper) v0.2.1
[skills-market] Targets: Codex CLI
[skills-market] Source: /Users/you/.skills-market/repo/skills/git-helper
[skills-market]   ✓ Codex CLI: /Users/you/.codex/skills/git-helper
```

```bash
$ skills-market list
```

```text
Installed skills (manifest: /Users/you/.skills-market/installed.json):

  hello-world @ v0.1.0    [✓ claude, ✓ codex]
  git-helper  @ v0.2.1    [✓ codex]
```

Valid values: `--target=claude`, `--target=codex`, `--target=all`.

---

## 7. Update — pull the latest catalog

When already up to date:

```bash
$ skills-market update
```

```text
[skills-market] git pull on working copy: /Users/you/.skills-market/repo
Already up to date.

[skills-market] No catalog changes. (6 skills)
```

When upstream has new content:

```text
[skills-market] git pull on working copy: /Users/you/.skills-market/repo
Updating 13c729f..52023e7
Fast-forward
 …
 skills/regex-explainer/SKILL.md   |  63 ++++
 skills/regex-explainer/skill.json |  12 +
 …

New skills (1):
  + regex-explainer      v0.1.0  [development]
      Breaks down regular expressions into plain-English, token by token, and flags common pitfalls like greedy quantifiers and unanchored patterns.

Next: `skills-market install <id>` to add a new skill, or `skills-market sync` to apply version bumps to already-installed skills.
```

---

## 8. Sync — replay your manifest on another machine

```bash
$ skills-market sync
```

```text
[skills-market] Manifest:    /Users/you/.skills-market/installed.json (2 skills)
[skills-market] Installing Hello World (hello-world) v0.1.0
[skills-market] Targets: Claude Code, Codex CLI
[skills-market]   ✓ Claude Code: /Users/you/.claude/skills/hello-world
[skills-market]   ✓ Codex CLI:   /Users/you/.codex/skills/hello-world
[skills-market] Installing Git Helper (git-helper) v0.2.1
[skills-market] Targets: Codex CLI
[skills-market]   ✓ Codex CLI:   /Users/you/.codex/skills/git-helper

[skills-market] sync done — installed 2, skipped 0, failed 0.
```

The manifest is at `~/.skills-market/installed.json`. Move it across machines
via iCloud Drive, Dropbox, scp, a private gist — anything. Each entry
remembers its `targets` so `sync` reproduces the original fan-out.

---

## 9. Remove from one target only

```bash
$ skills-market remove git-helper --target=codex
```

```text
[skills-market] Removed Codex CLI: /Users/you/.codex/skills/git-helper
[skills-market] Removed git-helper from manifest (all targets gone)
```

`remove` without `--target` removes from every target the manifest recorded.

---

## 10. Init — scaffold a new skill from scratch

```bash
$ skills-market init my-skill \
    --description "Demo skill that reads code aloud in plain English." \
    --category development --tags "demo,explain"
```

```text
[skills-market] ✓ Scaffolded /Users/you/work/my-skill
  /Users/you/work/my-skill/skill.json
  /Users/you/work/my-skill/SKILL.md

Next: edit SKILL.md, then run `skills-market publish /Users/you/work/my-skill` to send a PR upstream.
```

The generated `skill.json`:

```json
{
  "id": "my-skill",
  "displayName": "my-skill",
  "description": "Demo skill that reads code aloud in plain English.",
  "version": "0.1.0",
  "author": { "name": "Anonymous" },
  "category": "development",
  "tags": ["demo", "explain"],
  "license": "MIT",
  "createdAt": "2026-05-02T13:02:27.811Z"
}
```

`SKILL.md` (head):

```markdown
---
name: my-skill
description: Demo skill that reads code aloud in plain English.
---

# my-skill

<!-- TODO: write the prompt Claude Code / Codex CLI should follow when this skill is active. -->

## Activation

Activate when ...
```

---

## 11. Publish a single `.md` file (no scaffolding needed)

This is the simplest publish path — you literally only need a markdown file.

### 11a. The happy path

`./awesome-tool.md`:

```markdown
---
name: awesome-tool
description: A simple tool that does awesome things; for the e2e test demo.
---

# Awesome Tool

You are awesome.
```

```bash
$ skills-market publish ./awesome-tool.md --category development --dry-run
```

```text
[skills-market] Staged /Users/you/work/awesome-tool.md → /Users/you/work/awesome-tool/SKILL.md
[skills-market] ✓ Wrote /Users/you/work/awesome-tool/skill.json (derived from SKILL.md + flags)
[skills-market] Publishing skill "awesome-tool" v0.1.0
[skills-market] From: /Users/you/work/awesome-tool
[skills-market] Cloning https://github.com/Equality-Machine/skills-market.git → ~/.skills-market/publish/awesome-tool-…
[skills-market] ✓ Registry validated
[skills-market] DRY RUN — would push and open PR
  Branch: skill/awesome-tool-…
  Repo:   Equality-Machine/skills-market
```

What just happened:

- A sibling directory `./awesome-tool/` was created next to your `.md` file.
- The original `awesome-tool.md` was *copied* (untouched) to `./awesome-tool/SKILL.md`.
- `./awesome-tool/skill.json` was generated from the frontmatter (`name`,
  `description`) + your flags + `git config --global`.
- The publish flow continued from that staging directory.

The generated `skill.json`:

```json
{
  "id": "awesome-tool",
  "displayName": "awesome-tool",
  "description": "A simple tool that does awesome things; for the e2e test demo.",
  "version": "0.1.0",
  "author": { "name": "Mel0day", "email": "nx_meteor@163.com" },
  "category": "development",
  "tags": [],
  "license": "MIT",
  "createdAt": "2026-05-02T13:02:…"
}
```

### 11b. `.md` without frontmatter — auto-injected

You can publish a plain markdown file with no YAML header. The CLI synthesizes
frontmatter so the staged `SKILL.md` is well-formed; you just have to supply
`--description` (and `--category`):

`./no-fm.md`:

```markdown
# No Frontmatter Skill

You are helpful when asked about no-frontmatter situations.
```

```bash
$ skills-market publish ./no-fm.md \
    --category development \
    --description "Test skill that has no frontmatter; we inject one." \
    --dry-run
```

```text
[skills-market] Staged /Users/you/work/no-fm.md → /Users/you/work/no-fm/SKILL.md
[skills-market] ✓ Wrote /Users/you/work/no-fm/skill.json (derived from SKILL.md + flags)
[skills-market] Publishing skill "no-fm" v0.1.0
…
[skills-market] ✓ Registry validated
[skills-market] DRY RUN — would push and open PR
```

The staged `SKILL.md` (frontmatter inserted at the top, body unchanged):

```markdown
---
name: no-fm
description: Test skill that has no frontmatter; we inject one.
---

# No Frontmatter Skill

You are helpful when asked about no-frontmatter situations.
```

### 11c. Already-staged directory — pass it directly

If you already have a `SKILL.md` inside a directory (very common for
`~/.claude/skills/<id>/`), pass either the file or the directory:

```bash
skills-market publish ~/.claude/skills/cool-skill --category development
skills-market publish ~/.codex/skills/cool-skill/SKILL.md --category development
```

Both forms skip the staging step (no new directory is created).

### 11d. Missing `--category` → friendly error

```bash
$ skills-market publish ./awesome-tool.md --dry-run
```

```text
[skills-market] Staged ./awesome-tool.md → ./awesome-tool/SKILL.md
[skills-market] No skill.json found at ./awesome-tool/skill.json. Auto-deriving from SKILL.md, but the following are still missing:
  - category (pass --category one of: demo, development, design, devops, writing, data, security, productivity, other)

Flags supported: --id --display --description --category --version --author --email --license --tags
```

`--category` is the only required flag (frontmatter rarely contains it; we
don't guess).

### 11e. Real publish (drop `--dry-run`)

Without `--dry-run`, `publish` does the same flow then continues:

1. `git push --set-upstream origin <branch>` — succeeds if you're a maintainer
2. on permission denied, runs `gh repo fork` and pushes to your fork instead
3. `gh pr create --repo Equality-Machine/skills-market --title "add <id> skill" --base main` — opens the PR

You only need `gh auth login` once.

---

## 12. Mirror (offline / fast installs)

```bash
$ skills-market mirror init
```

```text
[skills-market] Cloning https://github.com/Equality-Machine/skills-market.git → /Users/you/.skills-market/mirror
[skills-market] ✓ Mirror ready. Future installs prefer the mirror.
```

```bash
$ skills-market mirror status
```

```text
Mirror: /Users/you/.skills-market/mirror
Origin: https://github.com/Equality-Machine/skills-market.git
Branch: main @ 52023e7
```

```bash
$ skills-market mirror update
```

```text
Already up to date.
[skills-market] ✓ Mirror updated.
```

The mirror is just a normal `git clone`; if it exists, `install` and
`sync` prefer it over network sparse-clones. Useful on flaky networks or for
batch installs.

---

## 13. MCP server — `@skills` from inside Claude Code

Register once:

```bash
$ claude mcp add skills-market -s user \
    -e SKILLS_MARKET_REGISTRY_URL=https://raw.githubusercontent.com/Equality-Machine/skills-market/main/registry/skills.json \
    -- node "$HOME/.skills-market/repo/apps/mcp-server/dist/server.js"
```

`tools/list` (typed by Claude Code under the hood; here shown via raw stdio):

```text
- list_skills        List all skills available on skills-market. Returns a markdown summary of every
- search_skills      Full-text search across the skill catalog by name, description, category, and ta
- get_skill          Fetch full metadata and install command for a single skill by id or name.
- install_skill      Run the NPX install command for a given skill. By default returns the command wi
- list_categories    List all categories present in the registry.
```

A live `tools/call` for `search_skills`:

```bash
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"search_skills","arguments":{"query":"translation"}}}
```

```text
Found 1 skill(s) for "translation":

- 中英互译 (translate-cn-en) v0.3.0 — 在 Claude Code 内提供中英互译，保留代码块、技术术语，和 Markdown 结构。
  category: writing, tags: translation, i18n, chinese, install: `npx -y skills-market install translate-cn-en`
```

In a Claude Code session you don't see this raw JSON — you just say "list
skills" or "install hello-world" and the model invokes the right tool.

---

## 14. End-to-end happy path (one screen)

```bash
# install (one time, per machine)
curl -fsSL https://equality-machine.github.io/skills-market/install.sh | sh

# discover
skills-market catalog
skills-market search regex

# install
skills-market install hello-world regex-explainer

# publish your own — bare .md, directory, or already-staged skill all work
skills-market publish ./my-tool.md --category development
skills-market publish ~/.claude/skills/my-tool --category development

# stay current
skills-market update

# move to another machine
# → copy ~/.skills-market/installed.json across, then
skills-market sync
```

---

## See also

- [README.md](README.md) — overview, install, design rationale
- [CONTRIBUTING.md](CONTRIBUTING.md) — submission rules and manual PR flow
- [Catalog](https://equality-machine.github.io/skills-market/) — browse in your browser
- [registry.json](https://equality-machine.github.io/skills-market/registry.json) — raw machine-readable catalog
