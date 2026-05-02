# skills-market

[English](README.md) · [简体中文](README.zh-CN.md)

一个开放的 **Claude Code & Codex CLI skills 市场** —— 以 git 为后端，
单条 CLI 命令安装。一份 skill，两个 agent 都能用。

```bash
# 1. 一台机器安装一次 CLI
git clone https://github.com/Equality-Machine/skills-market ~/code/skills-market
cd ~/code/skills-market && npm install && npm run build
npm --workspace packages/installer link

# 2. 浏览 + 安装（默认装到所有检测到的 agent）
skills-market catalog
skills-market install hello-world
# → ~/.claude/skills/hello-world/SKILL.md   （如果你装了 Claude Code）
# → ~/.codex/skills/hello-world/SKILL.md    （如果你装了 Codex CLI）

# 3. 同步到第二台机器（manifest 在 ~/.skills-market/installed.json）
skills-market list
skills-market sync             # 在新机器上跑

# 4. 本地镜像（离线 / 加速安装）
skills-market mirror init
skills-market mirror update
```

## 设计理念

每个 skill 住在本仓库的 [`skills/<id>/`](skills/) 目录下。贡献者通过 PR
新增目录；用户通过 `git` 的稀疏检出（sparse checkout）只拉自己想要的那个
目录。无需为每个 skill 单独发布 npm 包，无需中心化注册服务，无需鉴权 —— 一
个公开的 git 仓库 + 一个 CLI 而已。

**Claude Code** 和 **Codex CLI** 读取 skill 的格式是一样的：都是
`<id>/SKILL.md`，只是父目录不同（`~/.claude/skills/` vs
`~/.codex/skills/`）。`skills-market install` 会自动检测你机器上装了哪几个
agent，全部写入；不想这样可以加 `--target=claude` / `--target=codex` /
`--target=all` 显式指定。

```
skills-market/
├── skills/                        # ← skill 主体，单一可信来源
│   ├── hello-world/
│   │   ├── skill.json             # 元数据
│   │   └── SKILL.md               # Claude 读取的实际 prompt
│   ├── git-helper/
│   ├── design-critic/
│   ├── k8s-doctor/
│   └── translate-cn-en/
├── registry/
│   └── skills.json                # ← 自动生成的 catalog（不要手改）
├── apps/
│   ├── web/                       # Next.js 静态站点 → GitHub Pages
│   └── mcp-server/                # Claude Code 的 @skills 桥（stdio MCP）
├── packages/
│   ├── registry/                  # 共享 TS 类型与 loader
│   └── installer/                 # `skills-market` CLI
└── scripts/
    ├── build-registry.mjs         # skills/* → registry/skills.json
    ├── validate-registry.mjs      # CI 校验
    └── submit-skill.mjs           # 交互式 scaffold
```

## 安装 CLI

当前通过本仓库分发（npm 包名预留给未来发布）。每台机器一次性 setup：

```bash
git clone https://github.com/Equality-Machine/skills-market ~/code/skills-market
cd ~/code/skills-market
npm install
npm run build
npm --workspace packages/installer link
```

`npm link` 会创建一个全局 `skills-market` 软链，指向你本地的 clone。
之后只需 `git pull` 就能更新 CLI。

卸载：`npm --workspace packages/installer unlink`。

## 使用方式（消费侧）

### CLI 命令

```bash
skills-market install <id>                  # 装到所有检测到的 agent
skills-market install <id> --target=codex   # 只装到 ~/.codex/skills/<id>/
skills-market install <id> --target=all     # 两个都装（即使某个 home 还不存在）
skills-market update                        # git pull 最新 catalog，显示新增
skills-market list                          # 列出 manifest，按 target 显示在/缺
skills-market remove <id>                   # 卸载（默认按 manifest 记录的 target）
skills-market remove <id> --target=codex    # 只从 Codex 卸载
skills-market sync                          # 按 manifest 重装所有 skill
skills-market mirror init                   # 本地 clone 一份完整仓库
skills-market mirror update                 # 拉取最新（git pull）
skills-market mirror status
skills-market search <关键词>                # 全文搜索 catalog
skills-market catalog                       # 列出整个 catalog
```

### 看别人发布的新 skill（同步上游）

```bash
skills-market update      # git pull 上游，自动列出"New skills (N):"
skills-market catalog     # 看更新后的完整 catalog
skills-market install <id>
```

`update` 会按你的 CLI 安装方式自动选择路径：clone + npm link 模式下
`git pull` 你的工作副本；如果你跑过 `mirror init` 则 pull 镜像；都没有时
回落到从 GitHub fetch `registry/skills.json` 到本地 cache。

`install` 会按以下顺序解析 skill 来源：

1. **本地仓库工作副本** —— 如果你正处于本仓库的 clone 内部，直接从
   `skills/<id>/` 拷贝。
2. **本地镜像** `~/.skills-market/mirror/`（如果跑过 `mirror init`）。
3. **远程 sparse `git clone`** —— 从公共仓库拉取仅指定 skill 的子目录，
   只下载约 50KB，而不是整个 repo。

### 在 Claude Code 内使用（`@skills`）

注册 MCP server（一次性）：

```bash
claude mcp add skills-market -s user \
  -e SKILLS_MARKET_REGISTRY_URL=https://raw.githubusercontent.com/Equality-Machine/skills-market/main/registry/skills.json \
  -- node "$HOME/code/skills-market/apps/mcp-server/dist/server.js"
```

在新开的 Claude Code 会话里，输入 `@` 选 `skills-market` 把 catalog
作为资源附上，或直接说"列出所有 skill" / "安装 hello-world"。

可用的 MCP 工具：

- `list_skills`、`search_skills`、`get_skill`、`install_skill`、`list_categories`

### 跨机同步（公司机 ↔ 家里机）

每次 `skills-market install` 会写入 `~/.skills-market/installed.json`。
要把已装 skill 同步到另一台机器：

```bash
# 把 ~/.skills-market/installed.json 拷贝过去（iCloud / scp / gist 都行）
skills-market sync
# → 自动重装 manifest 里所有 skill
```

## 贡献一个 skill

详见 [CONTRIBUTING.zh-CN.md](CONTRIBUTING.zh-CN.md)。简版：

```bash
git clone https://github.com/Equality-Machine/skills-market
cd skills-market && npm install
node scripts/submit-skill.mjs --rebuild   # 交互式 scaffold
# 按需编辑 skills/<id>/SKILL.md
npm run registry:build
npm run registry:validate
git checkout -b add-<id>
git commit -am "add <id>"
gh pr create
```

CI 会自动跑：

- `node scripts/build-registry.mjs --check` —— 检查 `registry/skills.json` 是否和 `skills/*/skill.json` 一致；不一致直接 fail
- `node scripts/validate-registry.mjs` —— 校验 schema

## 静态站点（GitHub Pages）

`.github/workflows/deploy-pages.yml` 在每次 push 到 `main` 时把 Next.js
站点静态导出并部署到 GitHub Pages：

- `index.html` —— catalog 浏览页
- `skills/<id>/index.html` —— 单个 skill 的详情页
- `registry.json` —— 原始 catalog，第三方工具直接拉取的官方地址：
  ```
  https://equality-machine.github.io/skills-market/registry.json
  ```

## Roadmap

- **`verified` 标记**：maintainer review 后翻 true
- **Tarball 缓存**：把 skill 的 release tarball 缓存进仓库，安装不依赖 GitHub 在线
- **签名 skill**：每份 `skill.json` 由发布者反签
- **`installed.json` 云同步**：可选私有 gist 后端，无需手工拷贝 manifest
- **npm publish**：可选的第二条分发渠道（`npx -y skills-market`）

## License

MIT —— 见 [LICENSE](LICENSE)。
