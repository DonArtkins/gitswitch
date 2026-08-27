#!/usr/bin/env bash

# ================================================================
#   GitSwitch v2.0 — Installer
# ================================================================

GREEN='\033[0;32m'; RED='\033[0;31m'; CYAN='\033[0;36m'
YELLOW='\033[1;33m'; BOLD='\033[1m'; RESET='\033[0m'

BIN_TARGET="/usr/local/bin/gitswitch"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${CYAN}${BOLD}  Installing GitSwitch v2.0 🔀${RESET}"
echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""

# Check for upgrade
if [ -f "$BIN_TARGET" ]; then
    echo -e "${YELLOW}⚠️   GitSwitch already installed. Upgrading...${RESET}"
fi

# Install dependencies
echo -e "🔍  Checking dependencies..."
MISSING=()
for dep in git ssh jq curl; do
    command -v "$dep" &>/dev/null || MISSING+=("$dep")
done

if [ ${#MISSING[@]} -gt 0 ]; then
    echo -e "${YELLOW}Installing: ${MISSING[*]}${RESET}"
    # A single broken THIRD-PARTY repository must not abort the whole install
    # (seen in the wild: Parrot OS writes its codename "echo" into docker.list,
    #  which makes `apt-get update` exit non-zero on every machine).
    if ! sudo apt-get update -qq; then
        echo -e "${YELLOW}⚠️   apt-get update failed — a third-party apt source is misconfigured.${RESET}"
        echo    "    Continuing with cached indexes…"
        echo    "    Tip: check /etc/apt/sources.list.d/ for bad entries (e.g. a docker.list 'echo' suite)."
    fi
    if sudo apt-get install -y "${MISSING[@]}"; then
        echo -e "${GREEN}✅  Dependencies installed.${RESET}"
    else
        echo -e "${RED}❌  Could not install required dependencies automatically.${RESET}"
        echo    "    Install them manually, then re-run this installer:"
        echo    "      sudo apt install ${MISSING[*]}"
        exit 1
    fi
fi

# Optional fzf
if ! command -v fzf &>/dev/null; then
    echo ""
    read -rp "Install fzf for better account selection? (recommended) (y/N): " INST_FZF
    if [[ "$INST_FZF" =~ ^[Yy]$ ]]; then
        sudo apt-get install -y fzf \
            || echo -e "${YELLOW}⚠️   fzf install failed — basic menus will be used. (sudo apt install fzf later)${RESET}"
    fi
fi

# Setup directories
mkdir -p "$HOME/.gitswitch/backups" "$HOME/.ssh"
chmod 700 "$HOME/.ssh"

# Install script
sudo install -m 755 "$SCRIPT_DIR/gitswitch.sh" "$BIN_TARGET"
sudo chmod +x "$BIN_TARGET"

# Persist SSH agent in ~/.bashrc
if ! grep -q "GitSwitch SSH Agent" "$HOME/.bashrc" 2>/dev/null; then
    echo ""
    cat >> "$HOME/.bashrc" << 'BASHRC'

# GitSwitch SSH Agent — auto-start
if [ -z "$SSH_AUTH_SOCK" ]; then
    eval "$(ssh-agent -s)" > /dev/null 2>&1
fi
BASHRC
    echo -e "${GREEN}✅  SSH agent persistence added to ~/.bashrc${RESET}"
fi

echo ""
echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${GREEN}${BOLD}  ✅  GitSwitch installed successfully!${RESET}"
echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""
echo -e "  Run ${BOLD}gitswitch${RESET} from anywhere to start."
echo -e "  Data stored in: ${BOLD}~/.gitswitch/${RESET}"
echo ""
