# RailFlow User Service — Agent Instructions

These instructions apply to anyone, human or AI, modifying `backend/user-service`.

## First steps for every task

1. Read `README.md` in this directory before doing anything else.
2. Inspect the existing source code, `package.json`, configuration, migrations, and tests relevant
   to the task.
3. Check the actual Git status and diff so you understand existing uncommitted work.
4. Confirm what is implemented from the code. Documentation, roadmap entries, empty directories,
   and undeclared packages in `node_modules` are not evidence that a feature exists.
5. If documentation and code disagree, trust the code and update the documentation as part of the
   task.

## Mandatory rules

1. Read `README.md` and inspect the existing code before starting work.
2. Never assume that a planned feature has already been implemented.
3. Never replace working code without a clear reason.
4. Implement only the feature explicitly authorized by the developer.
5. Before implementation, explain the feature's scope, API contract, database changes, and
   important design decisions.
6. Use practical, production-oriented engineering decisions.
7. Follow the existing project conventions.
8. Avoid theoretical Clean Architecture and unnecessary abstractions.
9. Validate all external input.
10. Handle expected errors and unexpected failures properly.
11. Never expose passwords, password hashes, tokens, or sensitive information in responses or logs.
12. Use parameterized database queries.
13. Use database transactions where multiple related writes must succeed or fail together.
14. Add appropriate tests for implemented behavior.
15. Do not mock everything. Use real PostgreSQL/Redis integration tests where appropriate.
16. Do not claim a test passed unless it was executed successfully.
17. Run typecheck, lint, tests, and build before declaring a feature complete.
18. Update documentation when behavior or APIs change.
19. Review the final Git diff and avoid unrelated modifications.
20. Do not proceed to the next feature until the current feature is reviewed and approved.

## Scope and current state

The service is at its foundation stage. Do not infer implemented capabilities from the roadmap.

Currently implemented:

- Express app factory, `GET /health`, 404 handling, and centralized error handling.
- Zod-validated environment configuration.
- PostgreSQL pool creation, startup connectivity verification, and graceful shutdown.
- ESLint, Prettier, strict TypeScript, and `node-pg-migrate` scripts.

Currently absent:

- Any `/api/v1` endpoint.
- Database tables or migration files.
- User entities, repositories, services, controllers, or routes.
- Password hashing, JWT/JWKS, Redis, OTP, email delivery, OAuth, or RBAC implementation.
- Automated tests and a test script.

Do not implement later roadmap milestones while working on an earlier authorized feature.

## Architecture conventions

Use a practical, feature-first structure. Keep responsibilities clear:

- **Routes** define endpoints and compose route-level middleware.
- **Controllers** handle HTTP request/response concerns only.
- **Services** contain application and business logic.
- **Repositories** handle database access.
- **Middleware** handles authentication, authorization, validation, and error concerns.
- **Infrastructure** contains PostgreSQL, Redis, email, and security integrations.
- **Configuration** contains validated environment configuration.

Additional conventions:

- Use dependency injection where it provides practical testability or replaceability.
- Do not create an interface for every class or function.
- Do not add factories, generic wrappers, base classes, or layers without a concrete need.
- Do not duplicate business logic across controllers, services, or routes.
- Do not create large files with unrelated responsibilities.
- Keep planned but empty directories empty until a feature needs them.
- Prefer explicit, readable code and straightforward data flow.

## Security requirements

- Validate request bodies, params, query strings, headers used as input, and other external data.
- Use Argon2id for password hashing once password authentication is implemented. Use reviewed
  parameters and never lower them without approval.
- Use asymmetric JWT signing and JWKS as specified in the roadmap. Never commit private keys or
  secrets. Load them from validated configuration or a secure secret source.
- Treat refresh tokens, access tokens, OTPs, password hashes, and challenge secrets as sensitive.
- Use generic authentication and account-recovery errors where revealing account existence or
  which credential failed would create a security risk.
- Enforce authorization server-side. Client-provided roles or claims are never sufficient.
- Apply account/IP rate limiting to authentication, OTP, resend, and password-reset flows.
- Do not log request bodies, tokens, cookies, authorization headers, OTPs, or password material.
- Consume OTP challenges atomically and enforce expiration, attempt limits, resend cooldowns, and
  reuse prevention.
- Use cryptographically secure randomness for tokens, challenge identifiers, and OTPs.
- Set secure HTTP and token behavior deliberately; do not add insecure development shortcuts to
  production paths.

## Database requirements

- PostgreSQL is owned exclusively by this service. Do not add code that lets other services query
  it directly.
- Use parameterized queries. Never interpolate untrusted values into SQL.
- Design schema changes as reviewed migrations in `src/db/migrations`.
- Do not modify an applied migration; create a new migration instead.
- Use database constraints for uniqueness and referential integrity where appropriate.
- Use transactions when related writes must succeed or fail together.
- Keep persistent refresh-token records minimal and sufficient for rotation, reuse detection, and
  revocation.
- Use Redis only for temporary challenges and other approved ephemeral data once Redis is added.
- Do not assume a final schema before it is designed and approved.

## Testing and verification

- Add tests with each implemented behavior. Prefer meaningful service tests plus HTTP integration
  tests for real endpoints.
- Use a real PostgreSQL instance for repository and integration tests where practical.
- Use a real Redis instance for OTP/rate-limit integration tests once Redis is implemented.
- Mock external services such as email or Google only at their boundaries, not the entire system.
- There is no test script or test framework configured yet. If a task requires tests, add the
  minimum appropriate tooling to `package.json` and update the lockfile.
- Before declaring work complete, run the applicable commands from this directory:

  ```bash
  npm run typecheck
  npm run lint
  npm run build
  # Only when package.json defines a "test" script:
  npm test
  ```

- `npm test` is not currently available. Do not claim it was run until a real test script exists
  and has actually been executed.
- Report exact commands and actual outcomes. Never state or imply that a command passed without
  executing it.
- If a command cannot run because required services or configuration are unavailable, say so
  explicitly and report the limitation.

## Agentic development workflow

For every new feature, follow all five phases.

### Phase 1: Understand

- Inspect relevant source files and configuration.
- Understand existing dependencies and scripts.
- Identify affected modules and existing conventions.
- Verify what is actually implemented rather than relying on the roadmap.

### Phase 2: Plan

- Define acceptance criteria.
- Define API request and response contracts, including status codes and error shapes.
- Identify database changes, migrations, constraints, and transactions.
- Identify validation, security, authorization, and failure cases.
- Identify test strategy and required infrastructure.
- Present a concise implementation plan before writing code.

### Phase 3: Implement

- Implement only the complete approved feature.
- Keep changes focused and minimal.
- Do not add unrelated functionality, refactors, or cleanup.
- Update documentation if behavior, APIs, configuration, or setup changes.

### Phase 4: Verify

- Add and execute appropriate tests.
- Run lint, typecheck, tests, and build as applicable.
- Review the actual code changes and inspect `git diff`.
- Check for secrets, sensitive logging, unsafe SQL, and unrelated modifications.

### Phase 5: Report

- Explain what was implemented.
- List modified files and any added or changed dependencies.
- Show API examples where applicable.
- Report tests, commands, and their actual results.
- Identify remaining limitations, risks, and open decisions.

Stop after each feature and wait for approval before starting the next one.

## Dependency and tooling rules

- Add only dependencies required by the authorized feature.
- Update `package.json` and `package-lock.json` together using npm.
- Do not rely on extraneous packages currently present in `node_modules` until they are declared.
- Prefer the standard library or existing dependencies where they solve the problem cleanly.
- Follow the existing ESM and NodeNext import conventions. Use `.js` extensions in relative
  TypeScript imports as the current source does.
- Follow the existing ESLint and Prettier configuration. Do not reformat unrelated files.
- Do not introduce Docker, CI, or infrastructure files unless the task explicitly authorizes it.

## Documentation rules

- Keep `README.md` accurate about implemented versus planned behavior.
- Update the API roadmap and current status when endpoints are added.
- Document new environment variables and scripts.
- Do not document or invent working commands that have not been verified against the repository.
- Keep this `AGENTS.md` aligned with actual repository conventions when they intentionally change.
