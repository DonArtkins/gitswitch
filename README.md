# 🔀 GitSwitch

> **Multi-GitHub Account Manager for Linux**  
> Seamlessly switch between multiple GitHub accounts using SSH — no more logging in and out.  
> Now available on npm as **`gitswitch-wizard`**, with an install/update wizard that never touches SSH configs it doesn't own.

---

## 🚀 Install (global — run from anywhere)

**One command, installed globally so `gitswitch` works from any directory on your machine:**

```bash
npm install -g gitswitch-wizard
```

The `-g` global flag puts the `gitswitch` binary on your system PATH (e.g. `/usr/local/bin/gitswitch` or `~/.local/bin`), so you can call it from **any folder and any terminal** — no `cd` into a project, no `npx` prefix:

```bash
gitswitch            # open the interactive wizard (self-update check → install/repair → menu)
gitswitch use <name> # switch to an account (alias: switch)
gitswitch whoami     # see your active account (aliases: active, status)
gitswitch list       # list stored accounts (alias: accounts)
gitswitch doctor     # health-check your install
gitswitch upgrade    # check for & install the latest npm version
gitswitch repair     # re-install the engine binary (fixes a broken install)
gitswitch uninstall  # remove it entirely (incl. the npm package)
gitswitch version    # print the version (flags: -v, -V, --version)
gitswitch help       # show all commands (flags: -h, --help)
```

> 💡 Already installed? The global command is also the upgrade path — npm's **global** install gracefully installs the latest version while preserving all of your accounts, SSH keys and SSH config:
>
> ```bash
> npm install -g gitswitch-wizard@latest
> ```

> 🧰 Prefer a zero-install, inspect-only run (no permanent install)? Use the wizard directly:
>
> ```bash
> npx gitswitch-wizard
> ```

---

## ✨ v2.2.3 — complete uninstall

| Feature | Details |
|---|---|
| 🗑️ **Uninstall removes EVERYTHING** | `gitswitch uninstall` now removes the engine binary from **every** known location (`/usr/local/bin` AND `~/.local/bin`), deletes **ALL** accounts & backups (`~/.gitswitch`), strips GitSwitch-managed SSH config blocks (with a timestamped backup), removes the `gitswitch-wizard` npm package and every PATH / SSH-agent marker |
| ✅ **`command not found` guaranteed** | After uninstall, `gitswitch` exists nowhere on PATH — typing it returns `bash: gitswitch: command not found`, exactly like any tool you never installed |
| 🔒 **One confirmation** | A single confirmation covers the whole removal (accounts, SSH entries, binary, npm package — no piecemeal prompts) |
| 🩹 **Regression-tested** | `removeBinary` (direct + sudo fallback across both bin dirs) is covered by tests |

## ✨ v2.2.2 — uninstall crash hotfix

| Feature | Details |
|---|---|
| 🩹 **`ReferenceError: path is not defined` fixed** | The v2.2.1 uninstall crashed while stripping PATH/SSH-agent markers from `~/.bashrc`/`~/.zshrc` — `cleanRcMarkers` used `path`/`os`/`fs` without importing them. Now fixed with proper `node:` imports and guarded by regression tests. |
| 🔄 **Engine lockstep to v2.2.2** | Bundled engine `GS_VERSION` bumped to match the npm package — no more "update available" nag after a fresh install. |

## ✨ v2.2.1 — complete command surface & zero-trace uninstall

| Feature | Details |
|---|---|
| 🏷️ **npm CLI answers `version`** | `gitswitch version` / `-v` / `-V` / `--version` now print the **npm package** version directly (no longer forwarded to the engine), so it always matches `npm view gitswitch-wizard version` |
| 💬 **`gitswitch help`** | Shows the full npm CLI usage (all commands + aliases), not just the engine's |
| ♻️ **Aliases** | `switch` (use), `status`/`active` (whoami), `accounts` (list) |
| 🧹 **Zero-trace uninstall** | Uninstall removes the engine, the npm package **and** strips leftover `# gitswitch-wizard PATH` + `# GitSwitch SSH Agent` blocks from `~/.bashrc`/`~/.zshrc` — after which `gitswitch` gives a normal `command not found` |
| 🔄 **Engine lockstep** | Bundled engine `GS_VERSION` kept aligned with the npm package so the wizard stops nagging to update every run |
| 🩹 **Uninstall crash fixed** | The previous uninstall could crash with `ReferenceError: path is not defined` (missing `path` import in rc-marker cleanup) — fixed & covered by regression tests |

## ✨ v2.1.3 — update & version-alignment fixes

| Feature | Details |
|---|---|
| 🧙 **Unbreakable wizard updates** | The `sudo` prompt during install/update is now interactive & interruptible — no more "update never finishes" with a frozen spinner |
| ⌨️ **Ctrl+C / Ctrl+Z / Ctrl+X work** | A terminal signal safety net restores the cursor and exits cleanly instead of hanging |
| 🔧 **Uninstall hardening** | Removes user-local binaries directly; only escalates to sudo when actually needed |
| 🔄 **Version convergence** | Engine + npm package kept in lockstep so the wizard stops nagging to update every run |
| 📖 **Docs** | New troubleshooting guide: `gitswitch version` lagging behind npm, and how to resync the system engine |
| 🔁 **Self-manage (v2.2+)** | `gitswitch upgrade` / `gitswitch repair`; the wizard auto-checks for npm updates on launch |
| 🗑 **Complete uninstall (v2.2+)** | Removes the engine binary AND the `gitswitch-wizard` npm package, and strips leftover PATH / SSH-agent markers from `~/.bashrc` / `~/.zshrc` — after which `gitswitch` gives a normal `command not found` |

## ✨ What's New in v2.1 (npm wizard release)

| Feature | Details |
|---|---|
| 📦 **npm package** | Install or update via `npx gitswitch-wizard` — zero clone needed |
| 🧙 **Install/Update Wizard** | Detects existing installs, updates in place, preserves all data |
| 🛡 **SSH safety guarantee** | Only ever *appends* its own `Host github.com-<user>` blocks; foreign hosts stay byte-for-byte untouched |
| 🏢 **Organization accounts** | First-class org support; repos auto-create under `orgs/<org>/repos` API |
| 🔗 **Org ↔ Personal linking** | Orgs display grouped under the personal account that owns them |
| ⭐ **Active account switching** | One keypress / one command to flip between personal and org identities |
| 🩺 **`gitswitch doctor`** | Diagnose installation, accounts, SSH config health & dependencies |
| 🏷️ **Versioning** | `gitswitch version` reports the **npm package** version (falling back to the engine when run through `npx`); wizard compares it against bundled |

## ✨ What was new in v2.0


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

## 🔍 Also available: classic shell installer

Prefer to skip npm? The source installer also places `gitswitch` **globally on your PATH**, so it's reachable from anywhere:

```bash
# Clone or copy the gitswitch folder to your machine
git clone https://github.com/DonArtkins/gitswitch.git
cd gitswitch

# Make scripts executable
chmod +x install.sh uninstall.sh gitswitch.sh

# Run the installer (also installs dependencies automatically → global install)
./install.sh

# Start the tool — from anywhere, like the npm version
gitswitch
```

### 🛡 SSH safety guarantee

Whether installed via npm or the shell script, GitSwitch **never touches SSH entries it doesn't own**. It only ever appends clearly-marked blocks of this form to `~/.ssh/config`, and only removes those exact blocks when you delete an account:

```
# <user> GitHub account
Host github.com-<user>
    ...
```

Existing hosts, keys and settings are left byte-for-byte untouched.

---

## 📁 File Structure

```
gitswitch/                  ← Project folder (keep this)
├── gitswitch.sh            ← Bash engine (source of truth)
├── install.sh              ← Classic shell installer
├── uninstall.sh            ← Classic uninstaller
├── package.json            ← npm package manifest (gitswitch-wizard)
├── bin/gitswitch.js        ← npx entry point
├── vendor/gitswitch.sh     ← Engine copy bundled into the npm tarball
├── src/                    ← Node wizard (installer/updater CLI)
│   ├── cli.js              ← citty command router
│   ├── core/engine.js      ← Locates installed binary or runs bundled engine
│   ├── core/ssh-config.js  ← Safe ~/.ssh/config parsing & managed-block surgery
│   ├── installer/          ← Dependency checks, binary install, PATH helpers
│   ├── wizard/             ← @clack/prompts install/update flow
│   └── commands/manage.js  ← `doctor` and `uninstall` wizards
├── test/core.test.js       ← Unit tests (`npm test`)
└── .github/workflows/      ← CI + npm Trusted Publishing

~/.gitswitch/               ← Runtime data (auto-created, preserved across updates)
├── accounts.json           ← Stored account data (+ type & parent for orgs)
├── active                  ← Currently active ⭐ account
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
  ║   Multi-GitHub Account Manager v2.1.3    ║
  ╚══════════════════════════════════════════╝

  Accounts configured: 2
  Active account:      ⭐ DonArtkins

  Account Management
  1) Add GitHub Account
  2) List Accounts
  3) Test SSH Connections
  4) Edit Account
  5) Delete Account
  10) ⭐ Switch Active Account

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

### `gitswitch version` reports an older version than npm

GitSwitch uses a **two-layer design**, so there are two different `gitswitch`
binaries on disk:

| **Binary** | **What it is** | **Version it reports** |
|---|---|---|
| **npm wrapper** | the Node.js CLI (`gitswitch-wizard` → `bin/gitswitch.js`) | the npm package version |
| **system engine** | the Bash engine installed at `/usr/local/bin/gitswitch` | `gitswitch version` |

The node wrapper is usually first on your `PATH`, but `gitswitch version` is
**forwarded to the system engine**. That root-owned file is refreshed only when
a wizard update actually completes. If an update is interrupted (or the legacy
version of the wizard couldn't reach an interactive `sudo` prompt), the engine
is left behind even though the npm package updated.

**Diagnose the mismatch:**
```bash
gitswitch version                    # installed version (matches npm when globally installed)
npm view gitswitch-wizard version    # npm package version
ls -la /usr/local/bin/gitswitch      # engine path + timestamp
grep -n GS_VERSION /usr/local/bin/gitswitch
```

**Fix it (one-time):** run the wizard and **accept** the update — the `[sudo]`
prompt is now interactive and usable:
```bash
gitswitch
```
…or refresh straight from the npm package:
```bash
sudo install -m 755 \
  "$(npm prefix -g)/lib/node_modules/gitswitch-wizard/vendor/gitswitch.sh" \
  /usr/local/bin/gitswitch
```
Then confirm they agree:
```bash
gitswitch version    # now matches npm
```

> 💡 This is a one-time migration step after an interrupted update. Future
> updates refresh the engine automatically.

---

## 🏢 Adding an Organization Account

GitHub organizations don't have their own SSH keys — only users do. GitSwitch handles this for you:

1. Run `gitswitch` → **1) Add GitHub Account**
2. Enter the org name (e.g. `LyncxsIndustries`)
3. When asked *"Is this an Organization account?"* → answer **y**
4. Generate the SSH key when prompted
5. When asked, **link the org to the personal account that owns it** (e.g. `DonArtkins`) — linked orgs show grouped under their parent in List Accounts
6. **Add the public key to YOUR personal GitHub account** (`github.com/settings/ssh/new`) — since you're a member/owner of the org, that key can then push to all org repos you have access to
7. Make sure your personal account has at least **write** access in the organization

When using **Init New Project** on an org account, GitSwitch automatically creates the repo via the `/orgs/<org>/repos` API endpoint instead of under your personal account.

> Note: your PAT token must have the `repo` scope, and the org must allow personal access tokens / not block them via SSO or app-access policies.

---

## ⭐ Seamless Switching

GitSwitch supports an **active account**, so flipping between your personal account and its organizations takes one command or one keypress:

### From the terminal
```bash
gitswitch use LyncxsIndustries   # switch to your org identity
gitswitch use DonArtkins         # ...and back to personal
gitswitch whoami                 # see which account is active
gitswitch list                   # list all stored accounts
```

### From the menu
- **10) ⭐ Switch Active Account** — pick any account; it becomes the default everywhere
- The header always shows the current active account
- Every account picker (Clone, Init New Project, Attach Identity…) marks the active account with ⭐ — just press **Enter** to confirm it, or pick another

Switching also pre-loads that account's SSH key into the agent, so pushes work immediately.

> Note: the active account changes defaults for *new* clones/repos. Existing repos keep their own local identity — re-stamp them anytime with **Attach Identity**.

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

## ⌨️ CLI Reference (`gitswitch-wizard`)

| Command | Description |
|---|---|
| `npx gitswitch-wizard` | Run the install / update wizard (no install needed) |
| `gitswitch` *(no args)* | Open the interactive GitSwitch menu |
| `gitswitch use <account>` | ⭐ Set the active account (quick switch) |
| `gitswitch whoami` | Show the currently active account |
| `gitswitch list` | List stored accounts |
| `gitswitch doctor` | Diagnose installation, accounts, SSH config & dependencies |
| `gitswitch uninstall` | Remove everything — accounts, SSH entries, binary, npm package & rc markers |
| `gitswitch version` | Print the installed version (npm package; falls back to engine under `npx`) |

---

## 🧑‍💻 Development

### Architecture

GitSwitch is a **two-layer** tool:

1. **Bash engine** (`gitswitch.sh`) — all account management: SSH keys, config blocks, git identities, GitHub API calls. This is the source of truth.
2. **Node wizard** (`src/`) — an npm-distributed installer/updater built with [citty](https://github.com/unjs/citty) + [@clack/prompts](https://github.com/bombshell-dev/clack). It detects existing installs, updates the engine binary in place, and guarantees existing SSH data is never touched. If no engine is installed yet, it runs the bundled copy from `vendor/` straight through bash — so `npx gitswitch-wizard` works even on a fresh machine.

### Workflow

```bash
# 1. Edit the bash engine
vim gitswitch.sh

# 2. Sync it into the npm package
cp gitswitch.sh vendor/gitswitch.sh

# 3. Bump BOTH versions (keep them aligned)
#    - package.json        → npm package version
#    - gitswitch.sh GS_VERSION → engine version

# 4. Test everything
npm test          # bash syntax check + unit tests
npm run publish:dry-run   # inspect the exact tarball that would ship
```

### 🚀 Publishing to npm

**Releases are done from the terminal** using the built-in shortcuts:

```bash
# From a clean master branch:
npm run release:patch   # 2.0.3 -> 2.0.4 (bug fixes)
npm run release:minor   # 2.0.3 -> 2.1.0 (new features)
npm run release:major   # 2.0.3 -> 3.0.0 (breaking changes)

# Then ship it:
npm publish --access public
```

Each `release:*` script automatically runs the full test suite, bumps `package.json` + lockfile, creates the release commit and tags `vX.Y.Z`, and pushes both to GitHub.

> ⚠️ Every publish needs a never-before-used SemVer — npm does not allow overwriting versions.

> ℹ️ The npm name is **`gitswitch-wizard`**; the installed command is **`gitswitch`**.

<details>
<summary><b>Alternative: publishing via GitHub Actions</b></summary>

The repo also ships a **"Publish to NPM"** workflow (`.github/workflows/publish.yml`) that tests, bumps, tags and publishes via **npm Trusted Publishing (OIDC)** — no tokens stored. To use it, configure the Trusted Publisher on your package's npm Settings → Security page:

| Field | Value |
|---|---|
| Organization or user | `DonArtkins` *(your GitHub username)* |
| Repository | `gitswitch` |
| Workflow filename | `publish.yml` |
| Environment name | *(leave blank)* |

⚠️ Never use "Re-run failed jobs" on release workflows — re-runs pin the original stale commit and fail with `fatal: tag 'vX.Y.Z' already exists`. Always dispatch a fresh run.
</details>

---

## 🔐 Post-Deployment Setup (one-time)

Do these **once**, right after the first successful `npm publish`:

### Step 1 — Verify the package is live
```bash
npm view gitswitch-wizard version   # should print the published version
npx gitswitch-wizard@latest doctor  # smoke-test from any directory
```

### Step 2 — Connect GitHub Actions as a Trusted Publisher

This lets the "Publish to NPM" workflow publish **without storing any npm token**:

1. Go to your package page: `https://www.npmjs.com/package/gitswitch-wizard`
2. **Settings** → find the **Security / Publishing access** section → **Trusted Publisher**
3. Fill in EXACTLY:
   | Field | Value |
   |---|---|
   | Organization or user | `DonArtkins` |
   | Repository | `gitswitch` |
   | Workflow filename | `publish.yml` |
   | Environment name | *(leave blank)* |
4. Save.

> The workflow filename must match `.github/workflows/publish.yml` byte-for-byte. A mismatch here is the #1 cause of mysterious `403 Forbidden` errors in CI.

### Step 3 — (Optional) Harden your account
- On the same settings page you can require **2FA to publish** manually — CI releases via Trusted Publishing keep working regardless.
- Releases are published with **provenance** (signed build provenance), which shows a "Verified" badge on npmjs.com.

---

## 🔁 Every Future Release (cheat sheet)

1. Make your changes; if you touched `gitswitch.sh`, sync it:
   ```bash
   cp gitswitch.sh vendor/gitswitch.sh
   ```
2. Commit and push to `master`.
3. Cut the release from the terminal:
   ```bash
   git pull origin master        # start from a clean head
   npm run release:patch         # or minor / major — runs tests + bumps + tags + pushes
   npm publish --access public   # ship it 🚀
   ```
4. Verify:
   ```bash
   npm view gitswitch-wizard version   # shows the new version (~1 min CDN delay)
   npx gitswitch-wizard version        # version under npx (falls back to the engine)
   ```

### Troubleshooting a failed release
| Symptom | Fix |
|---|---|
| `403 Forbidden - name too similar` | Package name conflicts with an existing one — pick another name |
| `EPUBLISHCONFLICT` / version exists | Bump again — versions are immutable on npm |
| `fatal: tag 'vX.Y.Z' already exists` | That version was already bumped/tagged; just run `npm publish --access public`, or bump again |
| `EOTP` / hangs waiting for code | Your account requires 2FA — enter the authenticator code when prompted |

---

## 📄 License

MIT — Free to use, modify, and share.

---

> Built by **DonArtkins** for developers managing multiple GitHub identities on Linux.
