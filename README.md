# skills-market

[English](README.md) · [简体中文](README.zh-CN.md)

An open marketplace for **Claude Code skills** — git-backed, install via a
single CLI.

```bash
# 1. Install the CLI once per machine
git clone https://github.com/Mel0day/skills-market ~/code/skills-market
cd ~/code/skills-market && npm install && npm run build
npm --workspace packages/installer link

# 2. Browse + install
skills-market catalog
skills-market install hello-world
# → ~/.claude/skills/hello-world/SKILL.md

# 3. Sync to a second machine (manifest at ~/.skills-market/installed.json)
skills-market list
skills-market sync             # on the new machine

# 4. Mirror the catalog locally for offline / fast installs
skills-market mirror init
skills-market mirror update
```

## Why this shape

Each skill lives at [`skills/<id>/`](skills/) in this repo. Contributors PR a
new directory; consumers `git`-fetch only the directory they want via sparse
checkout. No per-skill npm publish, no central registry server, no auth — just
a public git repo with a CLI in front of it.

```
skills-market/
├── skills/                        # ← skill bodies, the source of truth
│   ├── hello-world/
│   │   ├── skill.json             # metadata
│   │   └── SKILL.md               # the prompt Claude reads
│   ├── git-helper/
│   ├── design-critic/
│   ├── k8s-doctor/
│   └── translate-cn-en/
├── registry/
│   └── skills.json                # ← auto-generated catalog (do not hand-edit)
├── apps/
│   ├── web/                       # Next.js static catalog → GitHub Pages
│   └── mcp-server/                # Claude Code @skills bridge (stdio MCP)
├── packages/
│   ├── registry/                  # shared TS types + loader
│   └── installer/                 # the `skills-market` CLI
└── scripts/
    ├── build-registry.mjs         # skills/* → registry/skills.json
    ├── validate-registry.mjs      # CI gate
    └── submit-skill.mjs           # interactive scaffolder
```

## Install the CLI

skills-market is distributed via this repository (the npm package is reserved
for a future release). Setup is one-time per machine:

```bash
git clone https://github.com/Mel0day/skills-market ~/code/skills-market
cd ~/code/skills-market
npm install
npm run build
npm --workspace packages/installer link
```

`npm link` creates a global `skills-market` symlink that always points at
your local clone, so `git pull` is enough to update the CLI.

To uninstall: `npm --workspace packages/installer unlink`.

## Use it (consumer side)

### CLI commands

```bash
skills-market install <id>          # install a skill into ~/.claude/skills/<id>/
skills-market list                  # list skills tracked in your manifest
skills-market remove <id>           # uninstall a skill
skills-market sync                  # reinstall everything in the manifest
skills-market mirror init           # clone the marketplace repo locally
skills-market mirror update         # git pull the local mirror
skills-market mirror status
skills-market search <query>        # full-text search the catalog
skills-market catalog               # list the full catalog
```

`install` resolves the source in this order:

1. **Local repo working copy** — if you're inside a clone of this repo,
   copies directly from `skills/<id>/`.
2. **Local mirror** at `~/.skills-market/mirror/` if it exists.
3. **Sparse `git clone`** of just the skill's subdirectory from the public
   repo. Fetches ~50KB instead of the whole repo.

### From Claude Code (`@skills`)

Register the MCP server once:

```bash
claude mcp add skills-market -s user \
  -e SKILLS_MARKET_REGISTRY_URL=https://raw.githubusercontent.com/Mel0day/skills-market/main/registry/skills.json \
  -- node "$HOME/code/skills-market/apps/mcp-server/dist/server.js"
```

In a fresh Claude Code session, type `@` → `skills-market` to attach the
catalog as a resource, or just say "list skills" / "install hello-world".

The MCP tools available:

- `list_skills`, `search_skills`, `get_skill`, `install_skill`, `list_categories`

### Cross-machine sync (laptop ↔ desktop)

Every `skills-market install` writes to `~/.skills-market/installed.json`. To
mirror your skill set to another machine:

```bash
# copy ~/.skills-market/installed.json across (iCloud, scp, gist, anything)
skills-market sync
# → reinstalls every skill in the manifest
```

## Contribute a skill

See [CONTRIBUTING.md](CONTRIBUTING.md). Short version:

```bash
git clone https://github.com/Mel0day/skills-market
cd skills-market && npm install
node scripts/submit-skill.mjs --rebuild   # interactive scaffolder
# edit skills/<id>/SKILL.md as needed
npm run registry:build
npm run registry:validate
git checkout -b add-<id>
git commit -am "add <id>"
gh pr create
```

CI runs:

- `node scripts/build-registry.mjs --check` — fails the PR if `registry/skills.json` doesn't match `skills/*/skill.json`
- `node scripts/validate-registry.mjs` — schema check

## Hosted catalog (GitHub Pages)

`.github/workflows/deploy-pages.yml` builds the Next.js site as a static
export on every push to `main` and deploys to GitHub Pages:

- `index.html` — the catalog UI
- `skills/<id>/index.html` — per-skill detail
- `registry.json` — the raw catalog. The canonical URL for tooling:
  ```
  https://mel0day.github.io/skills-market/registry.json
  ```

## Roadmap

- **`verified` flag**: maintainers flip after review
- **Tarball cache**: cache release tarballs alongside the manifest
- **Signed skills**: each `skill.json` countersigned by the publisher
- **Cloud sync for `installed.json`**: opt-in private gist backend, so `sync` works without manual file shuffling
- **npm publish**: optional second distribution channel (`npx -y skills-market`)

## License

MIT — see [LICENSE](LICENSE).
