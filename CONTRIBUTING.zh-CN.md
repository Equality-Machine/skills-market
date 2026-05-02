# 贡献 skills-market

[English](CONTRIBUTING.md) · [简体中文](CONTRIBUTING.zh-CN.md)

感谢愿意来贡献 skill。整个流程是一个 PR：在 [`skills/`](skills/) 下新增
一个目录，再重新生成 `registry/skills.json`。

## TL;DR

```bash
git clone https://github.com/Equality-Machine/skills-market
cd skills-market
npm install

node scripts/submit-skill.mjs --rebuild     # 交互式 scaffold
# 按需编辑 skills/<id>/SKILL.md

npm run registry:build       # 重新生成 registry/skills.json
npm run registry:validate    # 校验 schema（CI 也会跑）

git checkout -b add-<id>
git add skills/<id> registry/skills.json
git commit -m "add <id>"
gh pr create
```

CI 会在以下情况 block PR：

- `registry/skills.json` 与 `build-registry.mjs` 输出不一致
- schema 校验不过

## Skill 目录结构

```
skills/<id>/
├── skill.json    # 元数据（你的主要编辑界面）
├── SKILL.md      # Claude Code 实际读取的 prompt
└── README.md     # 可选，给人看的说明
```

### `skill.json`

```jsonc
{
  "id": "git-helper",                // 必须与目录名一致
  "displayName": "Git Helper",
  "description": "智能 git workflow 助手，自动起 commit message、解释合并冲突。",
  "version": "0.1.0",
  "author": { "name": "你的名字", "email": "you@example.com" },
  "category": "development",         // demo | development | design | devops | writing | data | security | productivity | other
  "tags": ["git", "productivity"],   // 最多 10 个
  "license": "MIT",
  "homepage": "https://github.com/you/some-repo",
  "createdAt": "2026-05-02T00:00:00Z"
}
```

> ⚠️ `source`、`install`、`verified`、`downloads` 是**保留字段** —— 由
> `build-registry.mjs` 自动填写，不要写在 `skill.json` 里。

### `SKILL.md`

标准 SKILL frontmatter，下面是 prompt 正文。最简版本：

```markdown
---
name: git-helper
description: 智能 git workflow 助手，自动起 commit message、解释合并冲突。
---

# Git Helper

你协助用户处理日常 git 操作。

## 何时激活

当用户询问 commit、diff、branch、合并冲突等问题时。

## 输出

…
```

## 校验规则（CI 强制）

| 字段          | 规则                                                              |
| ------------- | ----------------------------------------------------------------- |
| `id`          | 唯一，小写 kebab-case，2–64 字符 (`^[a-z0-9][a-z0-9-]*[a-z0-9]$`)；必须与目录名一致 |
| `description` | 10–500 字符                                                       |
| `version`     | semver 格式 `MAJOR.MINOR.PATCH`                                   |
| `category`    | 必须是 `demo / development / design / devops / writing / data / security / productivity / other` 之一 |
| `tags`        | 字符串数组，最多 10 个                                            |
| 保留字段      | `source`、`install`、`verified`、`downloads` 不允许出现           |

## Maintainer Review

Maintainer 可能会在后续 PR 里把已经审核过的 skill 标记为 `"verified": true`。
这只是"有人 review 过"的人工信号，不构成安全保证。**安装任何 skill 之前请先
看一眼源码。**

## 本地测试

```bash
# 把开发中的 skill 从工作副本装到 ~/.claude/skills/<id>/
node packages/installer/dist/cli.js install <id>

# 卸载
node packages/installer/dist/cli.js remove <id>
```

CLI 会检测到你处于本仓库内部，直接从 `skills/<id>/` 拷贝（不走 git clone）。

## 查询 catalog

```bash
node packages/installer/dist/cli.js catalog
node packages/installer/dist/cli.js search <关键词>
```
