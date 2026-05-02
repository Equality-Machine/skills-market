# skills-market

[English](README.md) · [简体中文](README.zh-CN.md)

一个开放的 **Claude Code & Codex CLI skills 市场** —— 以 git 为后端，
一行命令安装，一行命令发布。

## 安装（一行）

```bash
curl -fsSL https://equality-machine.github.io/skills-market/install.sh | sh
```

脚本做的事：clone 仓库到 `~/.skills-market/repo`，build CLI，把
`skills-market` 软链到 `~/.local/bin/`。如果你的 `PATH` 还没包含
`~/.local/bin`，安装脚本会打印需要加的那一行。

> ℹ️ 想先看脚本内容？可以打开 [install.sh](apps/web/public/install.sh)，或者
> 跑 `curl -fsSL https://equality-machine.github.io/skills-market/install.sh | less`。
> 不需要 sudo。

## 使用

```bash
skills-market catalog                  # 列出所有 skill
skills-market search regex             # 全文搜索
skills-market install hello-world      # 装到所有检测到的 agent
skills-market list                     # 已装清单（按 agent 显示）
skills-market update                   # 拉最新 catalog，显示新增
skills-market sync                     # 新机器上：按 manifest 全部还原
```

`install` 会自动检测哪几个 agent home 已经存在，并把 skill 写到全部：
Claude Code 是 `~/.claude/skills/<id>/SKILL.md`，Codex CLI 是
`~/.codex/skills/<id>/SKILL.md`。要显式指定可加 `--target=claude` /
`--target=codex` / `--target=all`。

## 发布你自己的 skill（一行）

```bash
skills-market init my-skill            # 在 ./my-skill/ 下生成 skill.json + SKILL.md
$EDITOR my-skill/SKILL.md              # 写 prompt
skills-market publish my-skill         # 验证 → 必要时 fork → push → 自动开 PR
```

`publish` 会替你做：

- 跑 CI 一样的 registry build + schema 校验
- 在临时 clone 里建新分支
- 先尝试 `git push origin`（maintainer 直接 push）；权限不够时自动
  `gh repo fork` 到你自己 fork 然后 push
- `gh pr create` 开 PR

只需 `gh auth login` 一次即可。

可加 `--dry-run` 预演，加 `--no-pr` 只 push 不开 PR。

## 跨机同步

```bash
# 笔记本
skills-market install hello-world translate-cn-en
skills-market list                     # 写入 ~/.skills-market/installed.json

# 台式机（先跑同样的一行安装）
# → 把 ~/.skills-market/installed.json 拷过去（iCloud / scp / gist / …）
skills-market sync                     # 按 manifest 全部重装
```

## 在 Claude Code 中通过 `@skills` 使用

仓库里附带一个 MCP server，注册一次后编辑器内可直接 list/search/install：

```bash
claude mcp add skills-market -s user \
  -e SKILLS_MARKET_REGISTRY_URL=https://raw.githubusercontent.com/Equality-Machine/skills-market/main/registry/skills.json \
  -- node "$HOME/.skills-market/repo/apps/mcp-server/dist/server.js"
```

暴露的工具：`list_skills`、`search_skills`、`get_skill`、`install_skill`、`list_categories`。

## 仓库结构

```
skills-market/
├── skills/                        # ← skill 主体，单一可信来源
│   ├── hello-world/
│   │   ├── skill.json             # 元数据
│   │   └── SKILL.md               # agent 实际读取的 prompt
│   └── …
├── registry/skills.json           # ← 自动生成的 catalog（不要手改）
├── apps/
│   ├── web/                       # Next.js 站点 → GitHub Pages
│   └── mcp-server/                # Claude Code @skills 桥
├── packages/
│   ├── registry/                  # 共享 TS 类型与 loader
│   └── installer/                 # skills-market CLI
└── scripts/
    ├── build-registry.mjs         # skills/* → registry/skills.json
    └── validate-registry.mjs      # CI 校验
```

## 静态站点

push 到 `main` 后由 `.github/workflows/deploy-pages.yml` 自动部署：

- 浏览页：<https://equality-machine.github.io/skills-market/>
- 原始 registry：<https://equality-machine.github.io/skills-market/registry.json>
- GitHub raw：<https://raw.githubusercontent.com/Equality-Machine/skills-market/main/registry/skills.json>

## 进阶 / 手动方式

不想跑安装脚本？手动等价：

```bash
git clone https://github.com/Equality-Machine/skills-market ~/code/skills-market
cd ~/code/skills-market && npm install && npm run build
npm --workspace packages/installer link
```

不想用 `publish`？见 [CONTRIBUTING.zh-CN.md](CONTRIBUTING.zh-CN.md) 里的
手动 PR 流程（在 `skills/` 下加目录、跑 `npm run registry:build`、commit、push、开 PR）。

## Roadmap

- **`verified` 标记**：maintainer review 后翻 true
- **Tarball 缓存**：把 release tarball 缓存进仓库
- **签名 skill**：每份 `skill.json` 由发布者反签
- **`installed.json` 云同步**：可选私有 gist 后端
- **npm publish**：可选的第二分发渠道（`npx -y skills-market`）

## License

MIT —— 见 [LICENSE](LICENSE)。
