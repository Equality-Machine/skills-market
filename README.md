# skills-market

[English](README.md) · [简体中文](README.zh-CN.md)

An open marketplace for **Claude Code & Codex CLI skills** — git-backed,
one-line install, one-line publish.

> Looking for runnable examples for every CLI feature? See
> [**EXAMPLES.md**](EXAMPLES.md).

## Install (one line)

```bash
curl -fsSL https://equality-machine.github.io/skills-market/install.sh | sh
```

This clones the marketplace repo into `~/.skills-market/repo`, builds the CLI,
and symlinks `skills-market` into `~/.local/bin/`. If `~/.local/bin` isn't on
your `PATH` yet, the installer prints the one-liner you need to add.

> ℹ️ Need to inspect the script before running? Either open
> [install.sh](apps/web/public/install.sh) in this repo, or do
> `curl -fsSL https://equality-machine.github.io/skills-market/install.sh | less`
> first. The script doesn't need sudo.

## Use

```bash
skills-market catalog                  # list every skill
skills-market search regex             # full-text search
skills-market install hello-world      # install into every detected agent
skills-market list                     # show what you have, per agent
skills-market update                   # pull latest catalog, show what's new
skills-market sync                     # on a new machine: replay your manifest
```

`install` auto-detects which agent homes already exist and writes to all of
them — `~/.claude/skills/<id>/SKILL.md` for Claude Code,
`~/.codex/skills/<id>/SKILL.md` for Codex CLI. Override with
`--target=claude`, `--target=codex`, or `--target=all`.

## Publish your own skill

The simplest case — you've got a markdown file:

```bash
skills-market publish ./awesome-tool.md
```

That's it. `publish` does the rest: stages the file into a sibling
`./awesome-tool/` directory, auto-derives `skill.json` from frontmatter +
your git config, runs the same schema validation CI runs, branches, pushes
(or forks then pushes), opens the PR via `gh`. The only hard requirement is
that the file's frontmatter has a `description:` line (or you pass
`--description "…"`).

`category` is optional now — defaults to `other`. Add `category: design`
(etc.) to your frontmatter, or pass `--category design`, if you want it
classified.

You can pass anything that resolves to a SKILL.md:

```bash
skills-market publish ./awesome-tool.md             # bare .md file
skills-market publish ./awesome-tool/               # directory with SKILL.md
skills-market publish ~/.claude/skills/awesome-tool # already-installed skill
skills-market publish ~/.codex/skills/awesome-tool/SKILL.md
```

Starting from scratch and want a template? `init` is a convenience scaffolder:

```bash
skills-market init my-skill            # scaffold ./my-skill/{skill.json, SKILL.md}
$EDITOR my-skill/SKILL.md
skills-market publish my-skill
```

`publish` flags (any of these populate the auto-generated `skill.json`):

```
--id <id>            (default: SKILL.md frontmatter `name`, or directory name)
--display <name>     (default: id)
--description <text> (default: SKILL.md frontmatter `description` — required)
--category <cat>     REQUIRED if not in skill.json: one of
                     demo / development / design / devops / writing /
                     data / security / productivity / other
--version <semver>   (default: 0.1.0)
--author <name>      (default: git config user.name)
--email <email>      (default: git config user.email)
--license <SPDX>     (default: MIT)
--tags <a,b,c>       (default: empty)
--dry-run            print actions without pushing
--no-pr              push the branch but don't open a PR
```

What `publish` does end-to-end:

1. ensures `SKILL.md` exists (and `skill.json`, or auto-generates one)
2. runs the same registry build + schema validation CI runs
3. creates a fresh branch in a scratch clone
4. tries `git push origin` first (maintainer fast-path); on permission
   denied falls back to `gh repo fork` + push to your fork
5. opens the PR via `gh pr create`

You only need `gh auth login` once.

## Cross-machine sync

```bash
# laptop
skills-market install hello-world translate-cn-en
skills-market list                     # writes ~/.skills-market/installed.json

# desktop (after the same one-line install)
# → copy ~/.skills-market/installed.json across (iCloud / scp / gist / …)
skills-market sync                     # replays everything in the manifest
```

## Use it from Claude Code (`@skills`)

The repo also ships an MCP server. Register it once and your editor can list,
search, and install skills directly:

```bash
claude mcp add skills-market -s user \
  -e SKILLS_MARKET_REGISTRY_URL=https://raw.githubusercontent.com/Equality-Machine/skills-market/main/registry/skills.json \
  -- node "$HOME/.skills-market/repo/apps/mcp-server/dist/server.js"
```

Tools exposed: `list_skills`, `search_skills`, `get_skill`, `install_skill`,
`list_categories`.

## Repository layout

```
skills-market/
├── skills/                        # ← skill bodies, the source of truth
│   ├── hello-world/
│   │   ├── skill.json             # metadata
│   │   └── SKILL.md               # the prompt the agent reads
│   └── …
├── registry/skills.json           # ← auto-generated catalog (do not hand-edit)
├── apps/
│   ├── web/                       # Next.js static catalog → GitHub Pages
│   └── mcp-server/                # Claude Code @skills bridge
├── packages/
│   ├── registry/                  # shared TS types + loader
│   └── installer/                 # the `skills-market` CLI
└── scripts/
    ├── build-registry.mjs         # skills/* → registry/skills.json
    └── validate-registry.mjs      # CI gate
```

## Hosted catalog

Pushed to `main` → automatically deployed by
`.github/workflows/deploy-pages.yml`:

- catalog UI: <https://equality-machine.github.io/skills-market/>
- raw registry JSON: <https://equality-machine.github.io/skills-market/registry.json>
- raw on GitHub: <https://raw.githubusercontent.com/Equality-Machine/skills-market/main/registry/skills.json>

## Manual / advanced workflows

If you'd rather not run the install script, you can do it by hand:

```bash
git clone https://github.com/Equality-Machine/skills-market ~/code/skills-market
cd ~/code/skills-market && npm install && npm run build
npm --workspace packages/installer link
```

If you'd rather not use `publish`, see [CONTRIBUTING.md](CONTRIBUTING.md) for
the manual PR flow (drop a directory under `skills/`, run
`npm run registry:build`, commit, push, open PR).

## Roadmap

- **`verified` flag**: maintainers flip after review
- **Tarball cache**: cache release tarballs alongside the manifest
- **Signed skills**: each `skill.json` countersigned by the publisher
- **Cloud sync for `installed.json`**: opt-in private gist backend
- **npm publish**: optional second distribution channel (`npx -y skills-market`)

## License

MIT — see [LICENSE](LICENSE).
