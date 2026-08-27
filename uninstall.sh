#!/usr/bin/env bash

# ================================================================
#   GitSwitch v2.0 — Uninstaller
# ================================================================

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BOLD='\033[1m'; RESET='\033[0m'

BIN_TARGET="/usr/local/bin/gitswitch"

echo ""
echo -e "${RED}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${RED}${BOLD}  Uninstalling GitSwitch${RESET}"
echo -e "${RED}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""

read -rp "Also delete all stored accounts and backups? (y/N): " DEL_DATA
read -rp "Are you sure you want to uninstall? (y/N): " CONFIRM

[[ ! "$CONFIRM" =~ ^[Yy]$ ]] && { echo -e "${YELLOW}Cancelled.${RESET}"; exit 0; }

# Remove binary
sudo rm -f "$BIN_TARGET"
echo -e "${GREEN}✅  Removed $BIN_TARGET${RESET}"

# Remove data
if [[ "$DEL_DATA" =~ ^[Yy]$ ]]; then
    rm -rf "$HOME/.gitswitch"
    echo -e "${RED}🗑   Account data deleted.${RESET}"
else
    echo -e "${YELLOW}ℹ️   Account data kept at ~/.gitswitch/${RESET}"
fi

# Remove bashrc entry.
# IMPORTANT: delete from the marker through its closing `fi` (the auto-start
# block is marker + if/eval/fi). The old ",+2d" range stopped one line early
# and left an orphan `fi` in ~/.bashrc, which errors on every new shell.
if grep -q "GitSwitch SSH Agent" "$HOME/.bashrc" 2>/dev/null; then
    sed -i '/GitSwitch SSH Agent/,/^fi$/d' "$HOME/.bashrc"
    echo -e "${GREEN}✅  Removed SSH agent entry from ~/.bashrc${RESET}"
else
    echo -e "${YELLOW}ℹ️   No GitSwitch SSH agent block found in ~/.bashrc${RESET}"
fi

echo ""
echo -e "${GREEN}${BOLD}GitSwitch uninstalled successfully.${RESET}"
echo ""
