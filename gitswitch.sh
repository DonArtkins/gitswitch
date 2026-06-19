#!/usr/bin/env bash

# ================================================================
#   GitSwitch v2.0 — Multi-GitHub Account Manager
#   Author  : DonArtkins
#   GitHub  : https://github.com/DonArtkins
#   Desc    : Manage multiple GitHub accounts with SSH on Linux
# ================================================================

# Colors
RED='\033[0;31m';    GREEN='\033[0;32m';   YELLOW='\033[1;33m'
BLUE='\033[0;34m';   CYAN='\033[0;36m';    MAGENTA='\033[0;35m'
BOLD='\033[1m';      DIM='\033[2m';        RESET='\033[0m'

# Paths
DATA_DIR="$HOME/.gitswitch"
DATA="$DATA_DIR/accounts.json"
BACKUP_DIR="$DATA_DIR/backups"
SSH_DIR="$HOME/.ssh"
SSH_CONFIG="$SSH_DIR/config"

# Bootstrap
mkdir -p "$DATA_DIR" "$BACKUP_DIR" "$SSH_DIR"
touch "$SSH_CONFIG"
chmod 700 "$SSH_DIR"
chmod 600 "$SSH_CONFIG"

# Print helpers
ok()   { echo -e "${GREEN}✅  $1${RESET}"; }
err()  { echo -e "${RED}❌  $1${RESET}"; }
warn() { echo -e "${YELLOW}⚠️   $1${RESET}"; }
info() { echo -e "${BLUE}ℹ️   $1${RESET}"; }
step() { echo -e "${MAGENTA}🔧  $1${RESET}"; }
sep()  { echo -e "${DIM}────────────────────────────────────────────${RESET}"; }
pause(){ read -rp "$(echo -e "${DIM}Press Enter to continue...${RESET}")"; }

print_header() {
    clear
    echo ""
    echo -e "${CYAN}${BOLD}  ╔══════════════════════════════════════════╗${RESET}"
    echo -e "${CYAN}${BOLD}  ║        GitSwitch v2.0  🔀                ║${RESET}"
    echo -e "${CYAN}${BOLD}  ║   Multi-GitHub Account Manager           ║${RESET}"
    echo -e "${CYAN}${BOLD}  ╚══════════════════════════════════════════╝${RESET}"
    echo ""
}

# Dependency check
check_deps() {
    local missing=()
    for dep in git ssh ssh-keygen jq curl; do
        command -v "$dep" &>/dev/null || missing+=("$dep")
    done
    if [ ${#missing[@]} -gt 0 ]; then
        err "Missing required tools: ${missing[*]}"
        info "Install with: sudo apt install ${missing[*]}"
        exit 1
    fi
    if ! command -v fzf &>/dev/null; then
        warn "fzf not found — basic menus in use. Install: sudo apt install fzf"
    fi
}

# SSH Agent
ensure_agent() {
    if [ -z "$SSH_AUTH_SOCK" ] || ! ssh-add -l &>/dev/null; then
        step "Starting SSH agent..."
        eval "$(ssh-agent -s)" >/dev/null 2>&1
    fi
}

load_all_keys() {
    ensure_agent
    while IFS= read -r user; do
        local key="$SSH_DIR/id_ed25519_$user"
        [ -f "$key" ] && ssh-add "$key" 2>/dev/null
    done < <(jq -r '.[].user' "$DATA" 2>/dev/null)
}

# Data store
init_store() {
    [ ! -s "$DATA" ] && echo "[]" > "$DATA"
}

account_exists() {
    local count
    count=$(jq "[.[]|select(.user==\"$1\")] | length" "$DATA" 2>/dev/null || echo 0)
    [ "$count" -gt 0 ]
}

# Account selector
select_account() {
    init_store
    local accounts
    accounts=$(jq -r '.[].user' "$DATA" 2>/dev/null)
    [ -z "$accounts" ] && { err "No accounts found. Add one first (option 1)."; return 1; }

    if command -v fzf &>/dev/null; then
        echo "$accounts" | fzf --prompt="🔍 Select account: " --height=40% --border --ansi
    else
        echo ""
        echo -e "${CYAN}${BOLD}Select an account:${RESET}"
        sep
        local i=1
        local opts=()
        while IFS= read -r acc; do
            echo -e "  ${GREEN}$i)${RESET} $acc"
            opts+=("$acc")
            ((i++))
        done <<< "$accounts"
        echo ""
        read -rp "Choice: " PICK
        local idx=$(( PICK - 1 ))
        if [ -n "${opts[$idx]}" ]; then
            echo "${opts[$idx]}"
        else
            err "Invalid selection."
            return 1
        fi
    fi
}

# Remove SSH config block for a user
remove_ssh_block() {
    local user="$1"
    local tmpfile
    tmpfile=$(mktemp)
    awk -v u="$user" '
        $0 == "Host github.com-" u { skip=1; next }
        $0 == "# " u " GitHub account" { next }
        skip && /^Host / { skip=0 }
        skip { next }
        { print }
    ' "$SSH_CONFIG" > "$tmpfile"
    mv "$tmpfile" "$SSH_CONFIG"
    chmod 600 "$SSH_CONFIG"
}

# ─── 1. Add Account ───────────────────────────────────────────────
save_account() {
    init_store
    echo ""
    echo -e "${BOLD}${CYAN}➕  Add GitHub Account${RESET}"
    sep

    read -rp "$(echo -e "${BOLD}GitHub Username: ${RESET}")" USER
    [ -z "$USER" ] && { err "Username cannot be empty."; return; }

    if account_exists "$USER"; then
        warn "Account '$USER' already exists."
        read -rp "Overwrite? (y/N): " OW
        [[ ! "$OW" =~ ^[Yy]$ ]] && { info "Cancelled."; return; }
        _remove_account_data "$USER"
    fi

    read -rp "$(echo -e "${BOLD}GitHub Email: ${RESET}")" EMAIL
    [[ ! "$EMAIL" =~ ^[^@]+@[^@]+\.[^@]+$ ]] && { err "Invalid email."; return; }

    echo -e "${DIM}  PAT needs 'repo' scope → github.com/settings/tokens${RESET}"
    read -rsp "$(echo -e "${BOLD}GitHub PAT Token (optional — Enter to skip): ${RESET}")" TOKEN
    echo ""

    KEY="$SSH_DIR/id_ed25519_$USER"

    echo ""
    echo -e "${CYAN}SSH Key Setup:${RESET}"
    echo -e "  ${GREEN}1)${RESET} Generate new SSH key"
    echo -e "  ${GREEN}2)${RESET} Import existing key from path"
    read -rp "Choice (1/2) [1]: " KEY_OPT
    KEY_OPT="${KEY_OPT:-1}"

    if [ "$KEY_OPT" = "2" ]; then
        read -rp "Path to existing private key: " KPATH
        KPATH="${KPATH/#\~/$HOME}"
        [ ! -f "$KPATH" ] && { err "Key not found: $KPATH"; return; }
        cp "$KPATH" "$KEY"
        [ -f "${KPATH}.pub" ] && cp "${KPATH}.pub" "${KEY}.pub"
        ok "SSH key imported."
    else
        step "Generating SSH key for $USER..."
        ssh-keygen -t ed25519 -C "$EMAIL" -f "$KEY" -N "" || { err "Key generation failed."; return; }
        ok "SSH key generated."
    fi

    chmod 600 "$KEY"
    chmod 644 "${KEY}.pub"
    ensure_agent
    ssh-add "$KEY"

    step "Updating ~/.ssh/config..."
    remove_ssh_block "$USER"
    cat >> "$SSH_CONFIG" << SSHBLOCK

# $USER GitHub account
Host github.com-$USER
    HostName github.com
    User git
    IdentityFile $KEY
SSHBLOCK
    chmod 600 "$SSH_CONFIG"
    ok "SSH config updated."

    echo ""
    echo -e "${YELLOW}${BOLD}👉  Add this public key to GitHub → Settings → SSH Keys:${RESET}"
    echo -e "${DIM}    https://github.com/settings/ssh/new${RESET}"
    sep
    cat "${KEY}.pub"
    sep
    echo ""
    read -rp "Press ENTER after adding the key to GitHub..."

    step "Testing SSH connection..."
    local result
    result=$(ssh -T -o ConnectTimeout=10 "git@github.com-$USER" 2>&1)
    if echo "$result" | grep -q "successfully authenticated"; then
        ok "SSH verified! Hi $USER 👋"
    else
        warn "Could not verify yet. Try Test Connections (option 3) after setup."
    fi

    local entry
    entry=$(jq -n --arg user "$USER" --arg email "$EMAIL" --arg token "$TOKEN" \
        '{user:$user, email:$email, token:$token}')
    jq ". += [$entry]" "$DATA" > "$DATA.tmp" && mv "$DATA.tmp" "$DATA"
    ok "Account '$USER' saved!"
}

# ─── 2. List Accounts ─────────────────────────────────────────────
list_accounts() {
    init_store
    echo ""
    echo -e "${BOLD}${CYAN}📋  Stored Accounts${RESET}"
    sep
    local count
    count=$(jq 'length' "$DATA" 2>/dev/null || echo 0)
    if [ "$count" -eq 0 ]; then info "No accounts configured yet."; return; fi

    jq -r '.[] | "\(.user)|\(.email)|\(.token)"' "$DATA" | while IFS='|' read -r user email token; do
        local key="$SSH_DIR/id_ed25519_$user"
        local kstat tstat
        [ -f "$key" ] && kstat="${GREEN}✅ Found${RESET}"  || kstat="${RED}❌ Missing${RESET}"
        [ -n "$token" ] && [ "$token" != "null" ] \
            && tstat="${GREEN}✅ Set${RESET}" || tstat="${YELLOW}⚠️  Not set${RESET}"

        echo -e "  ${BOLD}${CYAN}$user${RESET}  ${DIM}<$email>${RESET}"
        echo -e "  SSH Key   : $(eval echo -e \"$kstat\")"
        echo -e "  PAT Token : $(eval echo -e \"$tstat\")"
        sep
    done
}

# ─── 3. Test SSH Connections ──────────────────────────────────────
test_connections() {
    init_store
    echo ""
    echo -e "${BOLD}${CYAN}🔌  Testing SSH Connections${RESET}"
    sep
    local accounts
    accounts=$(jq -r '.[].user' "$DATA" 2>/dev/null)
    [ -z "$accounts" ] && { err "No accounts to test."; return; }

    ensure_agent && load_all_keys

    while IFS= read -r user; do
        echo -ne "  ${BOLD}$user${RESET} ... "
        local result
        result=$(ssh -T -o ConnectTimeout=10 "git@github.com-$user" 2>&1)
        if echo "$result" | grep -q "successfully authenticated"; then
            echo -e "${GREEN}✅ Connected${RESET}"
        else
            echo -e "${RED}❌ Failed${RESET}"
            echo -e "  ${DIM}→ $result${RESET}"
        fi
    done <<< "$accounts"
}

# ─── 4. Edit Account ──────────────────────────────────────────────
edit_account() {
    local USER
    USER=$(select_account) || return
    [ -z "$USER" ] && return

    local cur_email
    cur_email=$(jq -r ".[]|select(.user==\"$USER\")|.email" "$DATA")

    echo ""
    echo -e "${CYAN}${BOLD}✏️   Editing: $USER${RESET}"
    sep
    echo -e "${DIM}Press Enter to keep current value.${RESET}"
    echo ""

    read -rp "New email [$cur_email]: " NEW_EMAIL
    NEW_EMAIL="${NEW_EMAIL:-$cur_email}"
    read -rsp "New PAT Token (Enter to skip): " NEW_TOKEN
    echo ""

    jq "(.[]|select(.user==\"$USER\")|.email) |= \"$NEW_EMAIL\"" \
        "$DATA" > "$DATA.tmp" && mv "$DATA.tmp" "$DATA"

    if [ -n "$NEW_TOKEN" ]; then
        jq "(.[]|select(.user==\"$USER\")|.token) |= \"$NEW_TOKEN\"" \
            "$DATA" > "$DATA.tmp" && mv "$DATA.tmp" "$DATA"
    fi
    ok "Account '$USER' updated."
}

# ─── 5. Delete Account ────────────────────────────────────────────
_remove_account_data() {
    local user="$1"
    jq "del(.[]|select(.user==\"$user\"))" "$DATA" > "$DATA.tmp" && mv "$DATA.tmp" "$DATA"
    remove_ssh_block "$user"
}

delete_account() {
    local USER
    USER=$(select_account) || return
    [ -z "$USER" ] && return

    echo ""
    warn "Removing '$USER' from GitSwitch."
    read -rp "Also delete SSH key files? (y/N): " DEL_KEYS
    read -rp "Are you sure? (y/N): " CONFIRM
    [[ ! "$CONFIRM" =~ ^[Yy]$ ]] && { info "Cancelled."; return; }

    if [[ "$DEL_KEYS" =~ ^[Yy]$ ]]; then
        rm -f "$SSH_DIR/id_ed25519_$USER" "$SSH_DIR/id_ed25519_$USER.pub"
        step "SSH key files deleted."
    fi
    _remove_account_data "$USER"
    ok "Account '$USER' removed."
}

# ─── Identity Helper ──────────────────────────────────────────────
apply_identity() {
    local USERNAME="$1"
    local EMAIL
    EMAIL=$(jq -r ".[]|select(.user==\"$USERNAME\")|.email" "$DATA")
    [ -z "$EMAIL" ] && { err "Could not resolve identity for '$USERNAME'."; return 1; }

    git config user.name  "$USERNAME"
    git config user.email "$EMAIL"

    local remote
    remote=$(git remote get-url origin 2>/dev/null || true)
    if [ -n "$remote" ] && echo "$remote" | grep -q "github.com"; then
        local repo
        repo=$(echo "$remote" \
            | sed 's|.*github\.com[:/]\(.*\)\.git|\1|' \
            | sed 's|.*github\.com[:/]\(.*\)|\1|')
        git remote set-url origin "git@github.com-$USERNAME:$repo.git"
        ok "Remote → git@github.com-$USERNAME:$repo.git"
    fi
    ok "Identity applied: $USERNAME <$EMAIL>"
}

# ─── 6. Init New Project ──────────────────────────────────────────
init_repo() {
    local USER
    USER=$(select_account) || return
    [ -z "$USER" ] && return

    local TOKEN
    TOKEN=$(jq -r ".[]|select(.user==\"$USER\")|.token" "$DATA")

    echo ""
    read -rp "$(echo -e "${BOLD}Repository name: ${RESET}")" REPO
    [ -z "$REPO" ] && { err "Repo name cannot be empty."; return; }
    read -rp "$(echo -e "${BOLD}Private? (y/N): ${RESET}")" PRIV
    read -rp "$(echo -e "${BOLD}Description (optional): ${RESET}")" DESC

    local IS_PRIVATE="false"
    [[ "$PRIV" =~ ^[Yy]$ ]] && IS_PRIVATE="true"

    git init
    apply_identity "$USER"

    if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ] && [ "$TOKEN" != "" ]; then
        step "Creating repository on GitHub..."
        local http_code
        http_code=$(curl -s -o /dev/null -w "%{http_code}" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Accept: application/vnd.github.v3+json" \
            https://api.github.com/user/repos \
            -d "{\"name\":\"$REPO\",\"private\":$IS_PRIVATE,\"description\":\"$DESC\"}")
        [ "$http_code" = "201" ] \
            && ok "Repo '$REPO' created on GitHub!" \
            || warn "GitHub API returned HTTP $http_code. Create repo manually at github.com/new"
    else
        warn "No PAT token — skipping API repo creation."
        info "Create manually at: https://github.com/new"
    fi

    git remote add origin "git@github.com-$USER:$USER/$REPO.git"
    ok "Remote linked."
    echo ""
    info "Next steps:"
    echo -e "  ${DIM}git add .${RESET}"
    echo -e "  ${DIM}git commit -m 'Initial commit'${RESET}"
    echo -e "  ${DIM}git push -u origin main${RESET}"
}

# ─── 7. Clone Repository ──────────────────────────────────────────
clone_repo() {
    local USER
    USER=$(select_account) || return
    [ -z "$USER" ] && return

    echo ""
    read -rp "$(echo -e "${BOLD}Repository (username/repo): ${RESET}")" TARGET
    [ -z "$TARGET" ] && { err "Repository cannot be empty."; return; }

    ensure_agent
    ssh-add "$SSH_DIR/id_ed25519_$USER" 2>/dev/null

    git clone "git@github.com-$USER:$TARGET.git" || {
        err "Clone failed. Run Test Connections (option 3) to diagnose."
        return
    }

    local REPO_DIR
    REPO_DIR=$(basename "$TARGET" .git)
    cd "$REPO_DIR" || return
    apply_identity "$USER"
    ok "Cloned and identity applied!"
}

# ─── 8. Attach Identity ───────────────────────────────────────────
attach_identity() {
    if [ ! -d ".git" ]; then
        err "Not inside a git repository. cd into your project first."
        return
    fi
    local USER
    USER=$(select_account) || return
    [ -z "$USER" ] && return
    apply_identity "$USER"
}

# ─── 9. Backup ────────────────────────────────────────────────────
backup_accounts() {
    local ts
    ts=$(date +%Y%m%d_%H%M%S)
    cp "$DATA" "$BACKUP_DIR/accounts_$ts.json"
    ok "Accounts backed up → $BACKUP_DIR/accounts_$ts.json"
    cp "$SSH_CONFIG" "$BACKUP_DIR/ssh_config_$ts"
    ok "SSH config backed up → $BACKUP_DIR/ssh_config_$ts"
    echo ""
    info "All backups:"
    ls -lh "$BACKUP_DIR"
}

# ─── Main Menu ────────────────────────────────────────────────────
menu() {
    check_deps
    ensure_agent
    load_all_keys

    while true; do
        print_header

        local count
        count=$(jq 'length' "$DATA" 2>/dev/null || echo 0)
        echo -e "  ${DIM}Accounts configured: ${BOLD}${CYAN}$count${RESET}"
        echo ""
        echo -e "  ${BOLD}Account Management${RESET}"
        echo -e "  ${GREEN}1)${RESET} Add GitHub Account"
        echo -e "  ${GREEN}2)${RESET} List Accounts"
        echo -e "  ${GREEN}3)${RESET} Test SSH Connections"
        echo -e "  ${GREEN}4)${RESET} Edit Account"
        echo -e "  ${GREEN}5)${RESET} Delete Account"
        echo ""
        echo -e "  ${BOLD}Repository Tools${RESET}"
        echo -e "  ${CYAN}6)${RESET} Init New Project"
        echo -e "  ${CYAN}7)${RESET} Clone Repository"
        echo -e "  ${CYAN}8)${RESET} Attach Identity To Existing Repo"
        echo ""
        echo -e "  ${BOLD}System${RESET}"
        echo -e "  ${YELLOW}9)${RESET} Backup Accounts & SSH Config"
        echo -e "  ${RED}0)${RESET} Exit"
        echo ""
        sep

        read -rp "$(echo -e "${BOLD}Choose [0-9]: ${RESET}")" CH
        echo ""

        case $CH in
            1) save_account    ;;
            2) list_accounts   ;;
            3) test_connections;;
            4) edit_account    ;;
            5) delete_account  ;;
            6) init_repo       ;;
            7) clone_repo      ;;
            8) attach_identity ;;
            9) backup_accounts ;;
            0) echo -e "${CYAN}Goodbye! 👋${RESET}"; echo ""; exit 0 ;;
            *) err "Invalid option. Enter a number between 0 and 9." ;;
        esac

        echo ""
        pause
    done
}

menu
