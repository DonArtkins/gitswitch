# 🔀 GitSwitch v2.0

> **Multi-GitHub Account Manager for Linux**  
> Seamlessly switch between multiple GitHub accounts using SSH — no more logging in and out.

---

## ✨ What's New in v2.0

| Feature | v1 | v2 |
|---|---|---|
| Color UI | ❌ | ✅ |
| Test SSH Connections | ❌ | ✅ |
| Edit Account | ❌ | ✅ |
| Import Existing SSH Key | ❌ | ✅ |
| Backup Accounts & SSH Config | ❌ | ✅ |
| Auto SSH Agent Persistence | ❌ | ✅ |
| Auto-fix Remote URLs | ❌ | ✅ |
| Email Validation | ❌ | ✅ |
| GitHub API v3 (Bearer token) | ❌ | ✅ |
| Dependency Installer | ❌ | ✅ |
| fzf account picker | ❌ | ✅ |
| Upgrade support | ❌ | ✅ |

---

## 📋 Requirements

| Tool | Purpose |
|---|---|
| `git` | Version control |
| `ssh` / `ssh-keygen` | SSH key management |
| `jq` | JSON data storage |
| `curl` | GitHub API calls |
| `fzf` *(optional)* | Better interactive account selection |

---

## 🚀 Installation

```bash
# 1. Clone or copy the gitswitch folder to your machine
git clone https://github.com/DonArtkins/gitswitch.git
cd gitswitch

# 2. Make scripts executable
chmod +x install.sh uninstall.sh gitswitch.sh

# 3. Run the installer (installs dependencies automatically)
./install.sh

# 4. Start the tool from anywhere
gitswitch
```

---

## 📁 File Structure

```
gitswitch/                  ← Project folder (keep this)
├── gitswitch.sh            ← Main script
├── install.sh              ← Installer
├── uninstall.sh            ← Uninstaller
└── README.md               ← This file

~/.gitswitch/               ← Runtime data (auto-created)
├── accounts.json           ← Stored account data
└── backups/                ← Auto-backups of accounts & SSH config

~/.ssh/                     ← SSH keys (auto-managed)
├── config                  ← SSH config (managed by GitSwitch)
├── id_ed25519_DonArtkins   ← Private key per account
└── id_ed25519_DonArtkins.pub
```

---

## 🎮 Usage

Run `gitswitch` from any terminal:

```
  ╔══════════════════════════════════════════╗
  ║        GitSwitch v2.0  🔀                ║
  ║   Multi-GitHub Account Manager           ║
  ╚══════════════════════════════════════════╝

  Accounts configured: 2

  Account Management
  1) Add GitHub Account
  2) List Accounts
  3) Test SSH Connections
  4) Edit Account
  5) Delete Account

  Repository Tools
  6) Init New Project
  7) Clone Repository
  8) Attach Identity To Existing Repo

  System
  9) Backup Accounts & SSH Config
  0) Exit
```

---

## 📖 Feature Guide

### 1️⃣ Add GitHub Account

Walks you through:
- Entering your GitHub username and email
- Optionally adding a PAT token (for auto-creating repos via API)
- Generating a fresh SSH key **or** importing an existing one
- Automatically updating `~/.ssh/config`
- Displaying the public key ready to paste into GitHub
- Testing the SSH connection immediately after setup

> 💡 **PAT Token** needs the `repo` scope.  
> Get one at: [github.com/settings/tokens](https://github.com/settings/tokens)

---

### 2️⃣ List Accounts

Shows all configured accounts with:
- Username and email
- SSH key file status (found / missing)
- PAT token status (set / not set)

---

### 3️⃣ Test SSH Connections

Tests all accounts at once and reports:
- ✅ Connected — key is working
- ❌ Failed — with error message for debugging

---

### 4️⃣ Edit Account

Update email or PAT token for any account without recreating the SSH key.

---

### 5️⃣ Delete Account

Removes account from storage and its block from `~/.ssh/config`.  
Optionally deletes the SSH key files too.

---

### 6️⃣ Init New Project

From inside any folder:
- Runs `git init`
- Sets identity (name + email) for the selected account
- Creates the repo on GitHub via API *(if PAT token is set)*
- Adds the correct SSH-aliased remote URL

---

### 7️⃣ Clone Repository

- Select account
- Enter `username/repo`
- GitSwitch clones using the correct SSH alias and sets identity automatically

```bash
# What GitSwitch does under the hood:
git clone git@github.com-DonArtkins:DonArtkins/myrepo.git
```

---

### 8️⃣ Attach Identity To Existing Repo

Run inside any existing git repo to:
- Set `user.name` and `user.email` for that repo
- Auto-update the remote URL to use the correct SSH alias

---

### 9️⃣ Backup

Creates timestamped backups of:
- `~/.gitswitch/accounts.json`
- `~/.ssh/config`

Saved to `~/.gitswitch/backups/`

---

## 🔧 How SSH Aliasing Works

GitSwitch adds an entry to `~/.ssh/config` for each account:

```
# DonArtkins GitHub account
Host github.com-DonArtkins
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_DonArtkins
```

This means instead of `git@github.com:user/repo.git`, you use:
```
git@github.com-DonArtkins:DonArtkins/repo.git
```

Git knows exactly which SSH key to use — no conflicts between accounts.

---

## 🐛 Troubleshooting

### SSH connection failing
```bash
# Check your keys are loaded
ssh-add -l

# Re-add manually
ssh-add ~/.ssh/id_ed25519_DonArtkins

# Test connection directly
ssh -T git@github.com-DonArtkins
```

### Wrong identity on commits
```bash
# Inside your repo
git config user.name
git config user.email

# Fix it — run gitswitch and use option 8
gitswitch
```

### Permission errors
```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_ed25519_*
chmod 644 ~/.ssh/id_ed25519_*.pub
chmod 600 ~/.ssh/config
```

### Check SSH config is correct
```bash
cat ~/.ssh/config
```

---

## 🔄 Upgrading

Just re-run the installer — it handles upgrades automatically without touching your account data:

```bash
cd gitswitch
./install.sh
```

---

## 🗑 Uninstalling

```bash
./uninstall.sh
```

Choose whether to keep or delete your stored accounts.

---

## 📄 License

MIT — Free to use, modify, and share.

---

> Built by **DonArtkins** for developers managing multiple GitHub identities on Linux.
