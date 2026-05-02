# Contributing to skills-market

[English](CONTRIBUTING.md) · [简体中文](CONTRIBUTING.zh-CN.md)

Thanks for adding a skill. The whole flow is one PR: a new directory under
[`skills/`](skills/) plus a regenerated `registry/skills.json`.

## TL;DR

```bash
git clone https://github.com/Equality-Machine/skills-market
cd skills-market
npm install

node scripts/submit-skill.mjs --rebuild     # interactive scaffolder
# now edit skills/<id>/SKILL.md to suit

npm run registry:build       # regenerate registry/skills.json
npm run registry:validate    # schema check (also runs in CI)

git checkout -b add-<id>
git add skills/<id> registry/skills.json
git commit -m "add <id>"
gh pr create
```

CI will block the PR unless:

- `registry/skills.json` matches what `build-registry.mjs` would emit
- the schema validator passes

## Skill layout

```
skills/<id>/
├── skill.json    # metadata (your authoring surface)
├── SKILL.md      # the prompt Claude Code reads
└── README.md     # optional, for human readers
```

### `skill.json`

```jsonc
{
  "id": "git-helper",                // must match the directory name
  "displayName": "Git Helper",
  "description": "Smart git workflow helper that drafts commits and explains conflicts.",
  "version": "0.1.0",
  "author": { "name": "Your Name", "email": "you@example.com" },
  "category": "development",         // demo | development | design | devops | writing | data | security | productivity | other
  "tags": ["git", "productivity"],   // up to 10
  "license": "MIT",
  "homepage": "https://github.com/you/some-repo",
  "createdAt": "2026-05-02T00:00:00Z"
}
```

> ⚠️ The fields `source`, `install`, `verified`, and `downloads` are **reserved** —
> they are filled in by `build-registry.mjs`. Don't put them in `skill.json`.

### `SKILL.md`

Standard SKILL frontmatter, then the prompt body. The simplest valid file:

```markdown
---
name: git-helper
description: Smart git workflow helper that drafts commits and explains conflicts.
---

# Git Helper

You assist the user with day-to-day git operations.

## Activation

When the user asks about commits, diffs, branches, or merge conflicts.

## Output

…
```

## Validation rules (enforced in CI)

| Field         | Rule                                                              |
| ------------- | ----------------------------------------------------------------- |
| `id`          | unique, lowercase kebab-case, 2–64 chars (`^[a-z0-9][a-z0-9-]*[a-z0-9]$`); must match directory name |
| `description` | 10–500 chars                                                      |
| `version`     | semver-like `MAJOR.MINOR.PATCH`                                   |
| `category`    | one of `demo / development / design / devops / writing / data / security / productivity / other` |
| `tags`        | string array, max 10                                              |
| reserved      | `source`, `install`, `verified`, `downloads` must NOT be set      |

## Maintainer review

Maintainers may, in a follow-up PR, set `"verified": true` for skills they have
reviewed. This is a manual signal of "someone vetted this", not a security
guarantee. Always read a skill before installing it.

## Testing locally

```bash
# install your in-progress skill into ~/.claude/skills/<id>/ from the working copy
node packages/installer/dist/cli.js install <id>

# remove it
node packages/installer/dist/cli.js remove <id>
```

The installer will detect that you're inside the repo and copy directly from
`skills/<id>/` (no git clone needed).

## Asking the registry catalog

```bash
node packages/installer/dist/cli.js catalog
node packages/installer/dist/cli.js search <query>
```
