# Splitly Backend — Daily Development Log

**Date:** 2 October 2026  
**Focus:** Continuous Integration with GitHub Actions

## Goal

Set up Continuous Integration (CI) for the Splitly backend so every pushed change can be validated in a clean GitHub Actions environment.

## What We Did

### 1. Learned YAML

Learned the basics of YAML used by GitHub Actions:

- Key-value pairs
- Lists using `-`
- Nested structures using indentation
- Comments
- Workflow configuration

Basic GitHub Actions structure:

```text
Workflow
├── name
├── on
└── jobs
    └── steps
```

### 2. Learned GitHub Actions

Learned the purpose of the main workflow concepts:

- `name` — workflow display name
- `on` — events that trigger the workflow
- `jobs` — units of work
- `runs-on` — runner environment
- `steps` — commands/actions executed sequentially
- `uses` — invokes a reusable GitHub Action
- `run` — executes a shell command on the runner

### 3. Understood CI Runners

Used:

```yaml
runs-on: ubuntu-latest
```

This gives the workflow a GitHub-hosted Ubuntu runner where the backend can be built and tested.

### 4. Reviewed npm Dependency Management

Clarified the difference between:

- `package.json` — project metadata, scripts, and dependency declarations/version ranges
- `package-lock.json` — the resolved dependency tree used for reproducible installations
- `node_modules` — installed dependencies on the local machine

Used `npm ci` in CI because it installs from the lockfile in a clean environment.

### 5. Added `cookie-parser`

The backend uses `cookie-parser` at runtime, so it belongs in `dependencies` rather than only `devDependencies`.

Installed it with:

```bash
npm install cookie-parser
```

This updates both `package.json` and `package-lock.json`.

### 6. Prepared PostgreSQL for CI

The Splitly integration tests use a real PostgreSQL database, so GitHub Actions needs a temporary PostgreSQL environment.

The CI workflow uses a PostgreSQL service container and a dedicated test database:

```text
Database: splitly_test
User: postgres
Port: 5432
```

The CI database is separate from the local development database.

### 7. Created a Schema-Only Database Export

Created a schema-only PostgreSQL SQL export for CI instead of using a dump containing existing database records.

The schema contains tables including:

```text
users
contacts
groups
group_members
expenses
expense_participant
auth_sessions
```

It also contains the relevant identity columns, constraints, indexes, and foreign keys.

### 8. Built the GitHub Actions Workflow

Created:

```text
.github/workflows/ci.yml
```

The workflow performs:

```text
Push / Pull Request
        ↓
Ubuntu runner
        ↓
Checkout repository
        ↓
Setup Node.js 24
        ↓
npm ci
        ↓
npm run build
        ↓
PostgreSQL 18 service
        ↓
Apply database schema
        ↓
npm run test:integration
```

The workflow also uses:

```yaml
permissions:
  contents: read
```

### 9. Debugged the First CI Failure

The first CI run failed during the TypeScript build because TypeScript 7 no longer supports the old `moduleResolution: Node` configuration.

The error was:

```text
TS5108: Option 'moduleResolution=node10' has been removed.
```

Changed `tsconfig.json` from:

```json
"module": "CommonJS",
"moduleResolution": "Node"
```

to:

```json
"module": "NodeNext"
```

and removed the old `moduleResolution` setting.

### 10. Verified the Complete CI Pipeline

The corrected workflow passed successfully.

Final CI result:

```text
Workflow: Splitly Backend CI
Status: Success
Test files: 2 passed / 2 total
Tests: 13 passed / 13 total
```

## Why We Did This

The main purpose of CI is to verify the backend in a clean, reproducible environment instead of relying only on the developer's local machine.

The pipeline now verifies:

1. Dependencies can be installed from the lockfile.
2. The TypeScript backend compiles.
3. A PostgreSQL test environment can be created.
4. The database schema can be applied successfully.
5. The backend's integration tests can communicate with PostgreSQL.
6. The authentication integration tests pass automatically.

The first failed run also demonstrated an important CI benefit: a clean environment exposed a TypeScript configuration problem that had not been caught locally.

## What I Learned

### YAML

Configuration can be represented using indentation, nested keys, and lists.

### GitHub Actions

A workflow is organized around triggers, jobs, runners, and steps.

### `uses` vs `run`

```text
uses → execute a reusable action
run  → execute a shell command
```

### CI

CI is automated verification in a clean environment, not just running tests remotely.

### npm

```text
package.json     → dependency declarations
package-lock.json → exact resolved dependency tree
node_modules     → installed packages
```

### PostgreSQL in CI

Integration tests that depend on PostgreSQL require CI to provision a test database and schema.

### CI Debugging

A failing CI step should be treated as diagnostic information. The first failure identified an outdated TypeScript module-resolution configuration.

## Current CI Architecture

```text
Feature branch
      ↓
Code changes
      ↓
Commit
      ↓
Push
      ↓
GitHub Actions
      ↓
Build
      ↓
PostgreSQL service
      ↓
Schema setup
      ↓
Integration tests
      ↓
✅ / ❌
```

## Next Steps

### Immediate

Continue using the working CI pipeline while developing the backend.

### Next DevOps Step

Configure branch protection so CI must pass before changes can be merged into `main`.

### Later

```text
CI
 ↓
Branch protection
 ↓
Dependency caching
 ↓
Test coverage
 ↓
Security/dependency scanning
 ↓
CD
 ↓
Deployment
```

## Key Milestone

Splitly's backend now has a working GitHub Actions CI pipeline that provisions PostgreSQL, applies the database schema, builds the TypeScript backend, and successfully runs **13/13 integration tests**.
