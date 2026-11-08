# Intent: Scofist Engineering & Operational Contract (README)

## Status
Confirmed via `/agent-skills:interview-me`

## Core Intent
- **Outcome:** A comprehensive, high-density, production-grade `README.md` functioning as an engineering and operational contract for Scofist.
- **User:** Internal engineers and autonomous AI agents working in this codebase.
- **Why now:** The current README is an uninformative `create-next-app` boilerplate, leaving developers and AI agents vulnerable to violating fragile production limits.
- **Success:** A newcomer or AI agent can clone the repository, run the dev server with correct Node memory flags, understand directory boundaries, and adhere strictly to Atlas M0 connection caching and Vercel 10s execution limits without making fatal architectural mistakes.
- **Constraint:** Must explicitly codify non-negotiable backend rules (singleton DB connections, `.lean()` / `.select()` projections, bounded queries, 4.5MB payload limit, Cloudinary/R2 direct uploads, standard API envelope).
- **Out of scope:** End-user UI manuals, feature walkthroughs, marketing copy, and generic Next.js introductory tutorials.
