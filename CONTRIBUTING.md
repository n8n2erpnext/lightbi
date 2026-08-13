# Contributing to LightBI

LightBI accepts focused changes that preserve evidence governance and source continuity.

## Development setup

```bash
pnpm install --frozen-lockfile
pnpm --filter @lightbi/desktop dev
```

## Before opening a pull request

```bash
pnpm --filter @lightbi/desktop build
pnpm --filter @lightbi/desktop test
```

## Pull request expectations

- Explain the user-visible problem and the evidence for the change.
- Keep semantic IDs independent from translated display text.
- Add positive and adversarial tests for semantic or grain changes.
- Preserve physical source columns for drill-through and export.
- Do not weaken source fingerprint, handoff identity, guarded aggregation, or decision-use blockers.
- Do not add real customer data, credentials, generated installers, logs, or test output.
- Update English and Vietnamese UI resources together when adding user-facing copy.

## Data fixtures

Only synthetic or sanitized fixtures may be committed. Private operational fixtures belong outside the public repository.
