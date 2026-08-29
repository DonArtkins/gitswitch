# Contributing to gitswitch

Thanks for considering a contribution to **gitswitch** — a multi-GitHub-account
manager for SSH published on npm as **`gitswitch-wizard`**.

## Platform scope

gitswitch relies on **OpenSSH** (via `~/.ssh`, `ssh`, `ssh-keygen`, `ssh-agent`),
so it is supported on **Linux and macOS**. The CLI guard refuses other OSes.
Contributions should keep those two platforms in mind; CI runs on both.

## Getting Started

1. Fork the repository on GitHub (`DonArtkins/gitswitch`).
2. Clone your fork locally.
3. Install dependencies: `npm install`
4. Make your changes and test them locally.

## Project layout

- `src/cli.js` — command router + signal safety net + platform guard
- `src/commands/manage.js` — doctor / update / upgrade / repair / uninstall
- `src/core/engine.js` — path resolution for the bash engine
- `src/installer/` — deps (apt), installer (binary + rc markers)
- `src/wizard/` — install-flow.js, safety.js (SSH safety)
- `vendor/gitswitch.sh` — the bundled bash engine
- `test/` — unit tests (`node --test`)

## Very important: SSH safety

**Never touch SSH keys or SSH config blocks that gitswitch doesn't own.** The
tool only ever appends/strips its own `Host github.com-<user>` blocks to
`~/.ssh/config` and only manages its own data under `~/.gitswitch`. Any change
to the uninstall flow must preserve existing keys and foreign hosts, and write a
backup before editing `~/.ssh/config`. Tests must cover this.

## Key conventions

- **Engine lockstep**: keep `GS_VERSION` in `gitswitch.sh` and
  `vendor/gitswitch.sh` in sync with the npm `package.json` version.
- **`gitswitch update` contract**: check the npm registry first (offer a newer
  CLI), then update the engine binary via the wizard — never `rm` SSH data.
- Keep cross-platform (Linux + macOS) in mind.

## Testing

```bash
npm test          # syntax-check the bash engine + node --test
npm run publish:dry-run
```

## Pull Request Process

1. Keep README install/update instructions up to date.
2. Ensure `npm test` passes.
3. Update README, CHANGELOG, and command help for user-visible changes.
4. Open a pull request against the `master` branch.

## Maintainer Releases

Use the GitHub Actions `Publish to NPM` workflow (OIDC), or release locally
from a clean `master`:

```bash
npm run release:patch   # or minor / major
npm publish --access public
```

## Code of Conduct

Please be respectful and considerate. Harassment or abusive behavior will not
be tolerated.
