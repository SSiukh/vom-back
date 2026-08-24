# vom-back — agent instructions

## Language

- Respond to the user in Ukrainian only.
- Write all skills, in-repo instructions/docs, comments, and code in English.

## Git

- Never stage (`git add`), commit, or push in this repository, under any
  circumstances, even if asked in passing. These operations are blocked at
  the tool-permission level in `.claude/settings.json`
  (`permissions.deny: Bash(git add:*)`, `Bash(git commit:*)`,
  `Bash(git push:*)`) — do not attempt to route around that (no
  `--no-verify`, no manual `git` invocations via other tools, no editing the
  deny list). The user handles all git history operations themselves.

## No guessing

- Never invent an answer, a value, or a design decision you don't actually
  know. If something has more than one reasonable answer, stop and ask —
  present concrete options (`AskUserQuestion`) rather than picking one
  silently or asking a bare open-ended question.
- If something required is missing — an env variable, an API key/secret, a
  credential, a config value, an external account resource (e.g. a
  Cloudinary account, a database cluster) — don't fabricate a placeholder
  and move on as if it were real. State exactly what's missing, explain the
  concrete steps to obtain it, and wait for the user to provide it before
  continuing anything that depends on it.

## Workflow for every coding request

For any request that involves writing or changing code (not for plain
questions, discussions, or read-only look-ups), follow this sequence —
don't skip steps or reorder them:

1. **Plan.** Check `.claude/PLAN.md`. Add an entry for this request's work,
   or update the matching existing one — do nothing here if it's already
   accurately tracked.
2. **Research, if needed.** If something is a genuine unknown — a design
   corner case the summarized specs don't cover, or how NestJS itself
   expects something to be built — dispatch the `research` agent before
   writing code, rather than guessing (see "No guessing" above).
3. **Development.** Write the code, consulting whichever skill(s) apply
   (see "Which skill to use for what") as you go. If something still can't
   be decided confidently from those plus the docs, stop and ask me rather
   than filling the gap yourself.
4. **Review.** Run the `reviewer` agent against the change (structure, best
   practices, code standards, database conventions if the schema changed,
   security).
5. **Fix loop.** If `reviewer` finds anything, fix it, then run `reviewer`
   again. Repeat until it comes back clean.
6. **Close out.** Update the entry in `.claude/PLAN.md` to `done`, then
   finish with a short message stating what was actually built — not a
   step-by-step narration of this process.

## Code standards

See `.claude/instructions/code-standards.md` for the non-negotiable code
rules for this project (DTOs everywhere, Swagger docs from DTOs, unit + e2e
test coverage, zero comments/`console.log`/unresolved lint or type errors,
no unused code). The `reviewer` agent enforces these, plus project
structure and NestJS best practices — run it after non-trivial changes
rather than only self-checking.

`.claude/instructions/` is where standing project-wide rules like this one
live, as the single source of truth. When a rule applies broadly (not a
skill-shaped procedure grounded in one specific doc), add it there and
reference it from here and from any skill/agent that needs to enforce it —
don't restate the rule text in more than one place.

## Database conventions

See `.claude/instructions/db-conventions.md` for the non-negotiable rules on
how the schema is built (`createdAt`/`updatedAt` on every collection, images
stored as Cloudinary URLs rather than binary data, explicit cascade
behavior for every reference relation). The `database-architecture` skill
applies these when designing the schema; the `reviewer` agent checks them
against `prisma/schema.prisma` whenever a change touches it.

## Which skill to use for what

- **Project / module / file structure** — use the `nestjs-project-structure`
  skill. Applies to scaffolding a new NestJS project or module, adding a
  feature, deciding where a file belongs, or reviewing existing structure.
- **Database architecture** — use the `database-architecture` skill.
  Applies to adding/changing a Prisma model or collection, embed-vs-reference
  decisions, and dictionary (довідник) collections. Grounded in
  `.claude/artifacts/data-base/DATA-BASE.md` (canonical MongoDB schema).
- **Client-facing services / frontend integration** — use the
  `frontend-design` skill. Applies to building or reviewing any
  controller/service/DTO that a frontend page consumes, or deciding what an
  endpoint should accept/return. Grounded in
  `.claude/artifacts/frontend/VOM_SYSTEMS.md` (page-by-page field spec) and
  `.claude/artifacts/frontend/VOM_DESIGN_INSTRUCTION.md` (layout/UX per
  page).
- **Consuming this API from a frontend/HTTP client** — use the
  `backend-api-integration` skill. Applies when writing or debugging
  frontend code that calls this backend (auth/2FA/token flow, request/
  response conventions, error shape, throttling, file upload), or when
  asked how a given endpoint should be consumed. This is the mirror image
  of `frontend-design` — that skill is for building the backend to serve a
  known frontend spec, this one is for calling the backend that already
  exists. Grounded in `.claude/artifacts/backend/API_REFERENCE.md` (full
  architecture + per-endpoint reference for every module).

## Which agent to use for what

- **Research before/during implementation** — use the `research` agent.
  Applies when a design corner case isn't answered by the `frontend-design`
  skill's summarized spec (needs digging into the actual design source
  under `.claude/artifacts/frontend/Дизайн проекту/`), or when it's unclear
  how NestJS itself expects something to be built and the official docs
  need checking. Read-only — it never writes or edits code.
- **Final check before considering a change done** — use the `reviewer`
  agent. Applies after non-trivial code changes: verifies project structure
  (via the `nestjs-project-structure` skill), NestJS best practices, this
  project's code standards, and — when `schema.prisma` changed — database
  conventions. Read-only — it reports findings back rather than fixing them
  itself.
