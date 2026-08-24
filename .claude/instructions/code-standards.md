# Code standards

Non-negotiable rules for all code in this project. `CLAUDE.md` and the
`reviewer` agent both point here instead of restating these — this file is
the single source, edit it in place rather than forking a copy elsewhere.

- **DTOs everywhere.** Every client-facing service boundary (controller
  input and output) is shaped by a DTO class — no inline types, no raw
  `any` / `Record<string, unknown>` at a boundary.
- **Swagger docs from the DTOs.** Set up `@nestjs/swagger` and derive the
  API docs from `@ApiProperty()` (and friends) descriptions on DTO fields —
  don't hand-write API documentation separately from the DTOs.
- **Every service gets a unit test and an e2e test.** Not just the ones
  that feel risky — all of them.
- **Zero comments, zero `console.log`, zero unresolved TS/ESLint errors
  or warnings.** This is stricter than the general "comment only the
  non-obvious" default — for this project, no comments at all. Before
  considering any change finished, the type checker and linter must be
  clean and there must be no leftover debug logging.
- **No unused code.** No unused variables, functions, exports, or files
  left behind after a change — remove them rather than leaving them for
  later.
