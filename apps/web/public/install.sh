#!/usr/bin/env bash
# skills-market one-line installer.
#   curl -fsSL https://equality-machine.github.io/skills-market/install.sh | sh
# What it does:
#   1. checks deps (git, node>=18, npm)
#   2. clones the marketplace repo into ~/.skills-market/repo (or pulls if present)
#   3. installs deps + builds the CLI
#   4. symlinks `skills-market` into ~/.local/bin/
#   5. prints the next step (PATH check, first command)
set -euo pipefail

REPO_URL=${SKILLS_MARKET_REPO_URL:-https://github.com/Equality-Machine/skills-market.git}
INSTALL_DIR=${SKILLS_MARKET_INSTALL_DIR:-$HOME/.skills-market/repo}
BIN_DIR=${SKILLS_MARKET_BIN_DIR:-$HOME/.local/bin}

C_BLUE='\033[1;36m'; C_GREEN='\033[1;32m'; C_YELLOW='\033[1;33m'; C_RED='\033[1;31m'; C_RESET='\033[0m'
say()  { printf "${C_BLUE}==>${C_RESET} %s\n" "$*"; }
ok()   { printf "${C_GREEN}✓${C_RESET}  %s\n" "$*"; }
warn() { printf "${C_YELLOW}!${C_RESET}  %s\n" "$*"; }
err()  { printf "${C_RED}✗${C_RESET}  %s\n" "$*" >&2; }

require() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "Missing dependency: $1"
    case "$1" in
      git)  err "  Install with: brew install git  (macOS) or  sudo apt install git" ;;
      node) err "  Install with: brew install node (macOS) or  https://nodejs.org/" ;;
      npm)  err "  npm comes with node — reinstall node." ;;
    esac
    exit 1
  fi
}

say "Checking dependencies"
require git
require node
require npm

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 18 ]; then
  err "Node $NODE_MAJOR is too old. Need >= 18.17."
  exit 1
fi
ok "git $(git --version | awk '{print $3}'), node $(node -v), npm $(npm -v)"

if [ -d "$INSTALL_DIR/.git" ]; then
  say "Updating existing clone at $INSTALL_DIR"
  git -C "$INSTALL_DIR" pull --ff-only --quiet
else
  say "Cloning $REPO_URL → $INSTALL_DIR"
  mkdir -p "$(dirname "$INSTALL_DIR")"
  git clone --depth=1 --quiet "$REPO_URL" "$INSTALL_DIR"
fi
ok "Repository ready"

cd "$INSTALL_DIR"
say "Installing dependencies (this can take a minute)"
npm install --silent --no-audit --no-fund
ok "Dependencies installed"

say "Building CLI"
npm --workspace packages/installer run build --silent
ok "CLI built"

mkdir -p "$BIN_DIR"
LINK_TARGET="$INSTALL_DIR/packages/installer/dist/cli.js"
chmod +x "$LINK_TARGET"
ln -sf "$LINK_TARGET" "$BIN_DIR/skills-market"
ok "Linked $BIN_DIR/skills-market → $LINK_TARGET"

case ":$PATH:" in
  *":$BIN_DIR:"*)
    ok "$BIN_DIR is on your PATH"
    ;;
  *)
    warn "$BIN_DIR is NOT on your PATH yet. Add this line to your shell rc:"
    case "$(basename "${SHELL:-bash}")" in
      zsh)  printf "    echo 'export PATH=\"%s:\$PATH\"' >> ~/.zshrc && source ~/.zshrc\n" "$BIN_DIR" ;;
      bash) printf "    echo 'export PATH=\"%s:\$PATH\"' >> ~/.bashrc && source ~/.bashrc\n" "$BIN_DIR" ;;
      fish) printf "    fish_add_path %s\n" "$BIN_DIR" ;;
      *)    printf "    export PATH=\"%s:\$PATH\"\n" "$BIN_DIR" ;;
    esac
    ;;
esac

cat <<EOF

${C_GREEN}skills-market is installed.${C_RESET}

Try:
  skills-market catalog               # list all skills
  skills-market install hello-world   # install a skill
  skills-market init my-skill         # scaffold a new skill in ./my-skill/
  skills-market publish my-skill      # one-shot PR your skill back upstream

Docs: https://github.com/Equality-Machine/skills-market
EOF
