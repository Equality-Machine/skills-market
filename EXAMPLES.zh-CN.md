# 示例

[English](EXAMPLES.md) · [简体中文](EXAMPLES.zh-CN.md)

每个 CLI 功能点的实际命令 + 真实输出片段。所有命令都在隔离的临时目录里
跑过 [`Equality-Machine/skills-market`](https://github.com/Equality-Machine/skills-market)
真实仓库，可以直接复制使用。

> 约定：
> - `$` 表示你输入的命令
> - 紧接着的代码块是真实捕获的输出

---

## 1. 安装 CLI

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
…
```

如果 `~/.local/bin` 不在 `PATH` 里，脚本会打印你需要往 `~/.zshrc`、
`~/.bashrc` 或 fish 加哪一行。

---

## 2. 浏览 catalog

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

## 3. 搜索

```bash
$ skills-market search regex
```

```text
regex-explainer  v0.1.0  [development]  Regex Explainer
  Breaks down regular expressions into plain-English, token by token, and flags common pitfalls like greedy quantifiers and unanchored patterns.
```

`search` 大小写不敏感，匹配 id、name、description、category 和 tags。

---

## 4. 安装（自动检测两个 agent）

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

CLI 检测哪些 agent home 存在，全部写入。只装了 Claude 的机器只会看到第一行。

---

## 5. 列出已装

```bash
$ skills-market list
```

```text
Installed skills (manifest: /Users/you/.skills-market/installed.json):

  hello-world @ v0.1.0    [✓ claude, ✓ codex]    (installed 2026-05-02T13:02:24.805Z)
```

`✓` = 该 target 当前在磁盘上；`✗` = manifest 写着装了但目录消失了。

---

## 6. 只装到指定 agent

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

可选值：`--target=claude` / `--target=codex` / `--target=all`。

---

## 7. update — 拉最新 catalog

无新内容时：

```bash
$ skills-market update
```

```text
[skills-market] git pull on working copy: /Users/you/.skills-market/repo
Already up to date.

[skills-market] No catalog changes. (6 skills)
```

有新 commit 时：

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

## 8. sync — 跨机器还原

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

manifest 在 `~/.skills-market/installed.json`，跨机方式随意（iCloud、scp、
gist 都行）。每个条目记着自己装到哪几个 target，`sync` 会按原样还原。

---

## 9. 只从某个 target 卸载

```bash
$ skills-market remove git-helper --target=codex
```

```text
[skills-market] Removed Codex CLI: /Users/you/.codex/skills/git-helper
[skills-market] Removed git-helper from manifest (all targets gone)
```

不加 `--target` 就按 manifest 记录的 target 全部卸载。

---

## 10. init — 从零 scaffold 一个新 skill

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

生成的 `skill.json`：

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

`SKILL.md`（开头）：

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

## 11. 发布单个 `.md` 文件（无需 scaffold）

这是最简单的发布路径 —— 你只要有一个 markdown 文件。

### 11a. happy path

`./awesome-tool.md`：

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

刚才发生了什么：

- 在 `.md` 文件同级建了 `./awesome-tool/` 目录
- 原 `awesome-tool.md` **复制**（不改原文件）成 `./awesome-tool/SKILL.md`
- `./awesome-tool/skill.json` 由 frontmatter（`name`、`description`）+
  flag + `git config --global` 派生写出
- 后续 publish 流程在这个 staging 目录上跑

生成的 `skill.json`：

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

### 11b. `.md` 没有 frontmatter —— 自动注入

没写 YAML header 的纯 markdown 也能发布；CLI 会合成一份 frontmatter 写到
staging 后的 `SKILL.md`。这种情况你需要传 `--description`（以及 `--category`）。

`./no-fm.md`：

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

staging 后的 SKILL.md（顶部插入了 frontmatter，正文不变）：

```markdown
---
name: no-fm
description: Test skill that has no frontmatter; we inject one.
---

# No Frontmatter Skill

You are helpful when asked about no-frontmatter situations.
```

### 11c. 已经是目录格式 —— 直接传

如果你的 `SKILL.md` 已经在某个目录里（最典型：`~/.claude/skills/<id>/`），
传文件或目录都行：

```bash
skills-market publish ~/.claude/skills/cool-skill --category development
skills-market publish ~/.codex/skills/cool-skill/SKILL.md --category development
```

两种写法都跳过 staging 步骤（不会建新目录）。

### 11d. 缺 `--category` —— 友好报错

```bash
$ skills-market publish ./awesome-tool.md --dry-run
```

```text
[skills-market] Staged ./awesome-tool.md → ./awesome-tool/SKILL.md
[skills-market] No skill.json found at ./awesome-tool/skill.json. Auto-deriving from SKILL.md, but the following are still missing:
  - category (pass --category one of: demo, development, design, devops, writing, data, security, productivity, other)

Flags supported: --id --display --description --category --version --author --email --license --tags
```

`--category` 是唯一必填 flag（frontmatter 里通常没有，CLI 不瞎猜）。

### 11e. 真发（去掉 `--dry-run`）

去掉 `--dry-run` 后，11a 之后会继续：

1. `git push --set-upstream origin <branch>` —— 你是 maintainer 时直接成功
2. 权限不够时自动 `gh repo fork` 然后 push 到你 fork
3. `gh pr create --repo Equality-Machine/skills-market --title "add <id> skill" --base main` —— 自动开 PR

只需 `gh auth login` 一次。

---

## 12. mirror（离线 / 加速）

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

mirror 就是一份普通 `git clone`，存在时 `install` / `sync` 优先用它，避免
反复网络 sparse-clone。

---

## 13. MCP server — Claude Code 内的 `@skills`

注册一次：

```bash
$ claude mcp add skills-market -s user \
    -e SKILLS_MARKET_REGISTRY_URL=https://raw.githubusercontent.com/Equality-Machine/skills-market/main/registry/skills.json \
    -- node "$HOME/.skills-market/repo/apps/mcp-server/dist/server.js"
```

`tools/list`（Claude Code 内部自动调，这里给原始 stdio 输出展示）：

```text
- list_skills        List all skills available on skills-market. Returns a markdown summary of every
- search_skills      Full-text search across the skill catalog by name, description, category, and ta
- get_skill          Fetch full metadata and install command for a single skill by id or name.
- install_skill      Run the NPX install command for a given skill. By default returns the command wi
- list_categories    List all categories present in the registry.
```

`tools/call` 调 `search_skills`：

```bash
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"search_skills","arguments":{"query":"translation"}}}
```

```text
Found 1 skill(s) for "translation":

- 中英互译 (translate-cn-en) v0.3.0 — 在 Claude Code 内提供中英互译，保留代码块、技术术语，和 Markdown 结构。
  category: writing, tags: translation, i18n, chinese, install: `npx -y skills-market install translate-cn-en`
```

实际在 Claude Code 里你不会看到这堆 JSON —— 直接说"列出所有 skill"或
"安装 hello-world"，模型会自动调对应工具。

---

## 14. 端到端 happy path（一屏看完）

```bash
# 安装（每台机器一次）
curl -fsSL https://equality-machine.github.io/skills-market/install.sh | sh

# 浏览
skills-market catalog
skills-market search regex

# 下载
skills-market install hello-world regex-explainer

# 发布自己的 —— 单个 .md / 目录 / 已装好的 skill 都行
skills-market publish ./my-tool.md --category development
skills-market publish ~/.claude/skills/my-tool --category development

# 跟上游
skills-market update

# 换机器
# → 把 ~/.skills-market/installed.json 拷过去，然后
skills-market sync
```

---

## 相关链接

- [README.zh-CN.md](README.zh-CN.md) — 项目总览、安装、设计理念
- [CONTRIBUTING.zh-CN.md](CONTRIBUTING.zh-CN.md) — 提交规则与手动 PR 流程
- [Catalog 站点](https://equality-machine.github.io/skills-market/) —— 浏览器查看
- [registry.json](https://equality-machine.github.io/skills-market/registry.json) — 原始机器可读 catalog
