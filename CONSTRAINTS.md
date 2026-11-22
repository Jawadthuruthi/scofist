# Constraints

Last reviewed: 2026-11-22 by @system
Environment: Vercel Hobby (Free Tier) & MongoDB Atlas M0 (Free Tier)

## Floor (always enforced, blocks on violation)

- No new suppression comments: `@ts-ignore`, `@ts-nocheck`, `eslint-disable`, `biome-ignore`
- No unimplemented stubs: `throw new Error("Not implemented")`, empty `catch {}`, or raw `TODO` placeholders in shipped code
- No skipped or deleted tests without tracked justification
- No hardcoded secrets, connection strings, or cron keys in source code (must read from `process.env`)
- This file does not get weakened to make a change pass

## Enforced with numbers

| Dimension | Rule | Checked by | Runs at |
|-----------|------|-----------|---------|
| Floor integrity | Zero floor violations | `node scripts/floor-guard.mjs` | every edit |
| Code quality | Zero lint errors | `npm.cmd run lint` | task end |
| Vercel execution timeout | Function duration ≤ 10s budget | static review / route audit | review |
| Vercel payload limit | Request/Response payload ≤ 4.5MB | payload validation | review |
| Vercel Active CPU budget | Monthly ceiling ≤ 4.0 hours (no in-memory PDF/heavy rasterization in serverless) | route audit | review |
| MongoDB Atlas connections | Singleton connection, maxPoolSize ≤ 5, bufferCommands = false | `@/lib/db.js` check | review |
| Mongoose read optimization | 100% read-only queries must use `.lean()` and pagination `limit` | static check | task end |

> **Enforcement Policy:** Block immediately on the Floor. For performance budgets and external metrics, warn during the initial 2-week transition period, then hard-block. Max check duration budget is 90 seconds.

## Measured, not yet enforced (Ratchets)

| Metric | Today | Direction |
|--------|-------|-----------|
| Dependency vulnerabilities (high/critical) | 0 | must not grow |
| Middleware matcher coverage | Explicit asset exclusion | must not fall |
| Route handler response time (p95) | ≤ 1500 ms | must not grow |

## Exceptions

| ID | Rule | Path | Reason | Owner | Expires |
|----|------|------|--------|-------|---------|
