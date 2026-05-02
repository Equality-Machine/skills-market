# skills-market

The CLI for [skills-market](https://github.com/Mel0day/skills-market) — an
open marketplace for Claude Code skills, backed by a public git repository.

## Install

```bash
npx -y skills-market <command>
# or
npm install -g skills-market
```

## Commands

```bash
skills-market install <id>          # install a skill into ~/.claude/skills/<id>/
skills-market list                  # list skills tracked in your personal manifest
skills-market remove <id>           # uninstall a skill
skills-market sync                  # reinstall every skill in your manifest (cross-machine)
skills-market mirror init           # clone the marketplace repo into ~/.skills-market/mirror/
skills-market mirror update         # git pull the local mirror
skills-market mirror status
skills-market search <query>        # full-text search the catalog
skills-market catalog               # list the full catalog
```

## How install works

`install <id>` resolves the source in this order:

1. **Local repo working copy** — if you're inside a clone of the
   skills-market repo, copies directly from `skills/<id>/`.
2. **Local mirror** — if you previously ran `skills-market mirror init`,
   copies from `~/.skills-market/mirror/skills/<id>/`.
3. **Sparse `git clone`** of just the skill's subdirectory from the public
   repo (default: `https://github.com/Mel0day/skills-market.git`). Fetches
   ~50KB instead of the whole repo.

The result is copied into `~/.claude/skills/<id>/` and tracked in your
personal manifest at `~/.skills-market/installed.json`.

## Cross-machine sync

```bash
# Machine A
skills-market install hello-world
skills-market install translate-cn-en
skills-market list

# Copy ~/.skills-market/installed.json to Machine B (iCloud, scp, gist, ...)

# Machine B
skills-market sync   # reinstalls everything from the manifest
```

## Environment variables

| Variable                       | Default                                                                          | Purpose                          |
| ------------------------------ | -------------------------------------------------------------------------------- | -------------------------------- |
| `CLAUDE_SKILLS_DIR`            | `~/.claude/skills`                                                               | Where skills get installed       |
| `SKILLS_MARKET_HOME`           | `~/.skills-market`                                                               | Personal data dir (manifest, mirror) |
| `SKILLS_MARKET_REGISTRY_URL`   | `https://raw.githubusercontent.com/Mel0day/skills-market/main/registry/skills.json` | Catalog URL                  |
| `SKILLS_MARKET_REGISTRY_PATH`  | (none)                                                                           | Local catalog file (overrides URL) |
| `SKILLS_MARKET_REPO_URL`       | `https://github.com/Mel0day/skills-market.git`                                   | Repo for sparse clones / mirror  |

## Contribute a skill

See the [main repository](https://github.com/Mel0day/skills-market/blob/main/CONTRIBUTING.md).
The whole flow is one PR: a new directory under `skills/`.

## License

MIT
