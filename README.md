# skills-market

An open marketplace for **Claude Code skills** — git-backed, NPX-installable.

```bash
# 1. browse
npx -y skills-market catalog
npx -y skills-market search git

# 2. install (sparse-clones the single skill from this repo)
npx -y skills-market install hello-world
# → ~/.claude/skills/hello-world/SKILL.md

# 3. sync to a second machine (manifest at ~/.skills-market/installed.json)
npx -y skills-market list
npx -y skills-market sync     # on the new machine

# 4. mirror the catalog locally for offline / fast installs
npx -y skills-market mirror init
npx -y skills-market mirror update
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
│   └── installer/                 # the `skills-market` CLI (this is what npx invokes)
└── scripts/
    ├── build-registry.mjs         # skills/* → registry/skills.json
    ├── validate-registry.mjs      # CI gate
    └── submit-skill.mjs           # interactive scaffolder
```

## Use it (consumer side)

### From Claude Code (MCP)

Register the MCP server once per machine:

```bash
git clone https://github.com/Mel0day/skills-market ~/code/skills-market
cd ~/code/skills-market
npm install
npm run build
claude mcp add skills-market -s user \
  -e SKILLS_MARKET_REGISTRY_URL=https://raw.githubusercontent.com/Mel0day/skills-market/main/registry/skills.json \
  -- node "$PWD/apps/mcp-server/dist/server.js"
```

In a fresh Claude Code session, type `@` → `skills-market` to attach the
catalog as a resource, or just say "list skills" / "install hello-world".

The MCP tools available:

- `list_skills`, `search_skills`, `get_skill`, `install_skill`, `list_categories`

### From the CLI (no Claude Code needed)

```bash
npx -y skills-market install <id>
npx -y skills-market list
npx -y skills-market remove <id>
npx -y skills-market sync
npx -y skills-market mirror {init|update|status}
npx -y skills-market search <query>
npx -y skills-market catalog
```

`install` resolves the source in this order:

1. Local repo working copy (you're inside a clone of this repo)
2. Local mirror at `~/.skills-market/mirror/` if it exists
3. Sparse `git clone` of just the skill's subdirectory from the public repo

That last one is what "git pull a skill" looks like in practice — `git clone`
with `--filter=blob:none --sparse-checkout`, so you fetch ~50KB instead of
the whole repo.

### Cross-machine sync (your laptop ↔ desktop)

`npx skills-market install` writes to `~/.skills-market/installed.json`. On
your other machine:

```bash
# copy ~/.skills-market/installed.json across (iCloud, scp, gist, anything)
npx -y skills-market sync
```

## Contribute a skill

See [CONTRIBUTING.md](CONTRIBUTING.md). Short version:

```bash
git clone https://github.com/Mel0day/skills-market
cd skills-market
npm install
node scripts/submit-skill.mjs --rebuild   # interactive scaffolder
# edits skills/<id>/SKILL.md as needed
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
- `registry.json` — the raw catalog, the canonical URL for tooling:
  ```
  https://<owner>.github.io/skills-market/registry.json
  ```

## Roadmap

- **`verified` flag**: maintainers flip after review (mid-PR script in repo)
- **Tarball cache**: cache release tarballs alongside the manifest so installs survive GitHub outages
- **Signed skills**: each `skill.json` countersigned by publisher
- **Cloud sync for `installed.json`**: opt-in, private gist as backend, so `sync` works without manual file shuffling

## License

MIT — see [LICENSE](LICENSE).
