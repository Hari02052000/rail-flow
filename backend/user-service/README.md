# RailFlow User Service

The User Service is the identity and access-management service for RailFlow, a train-booking
microservices application. It is responsible for user identity, authentication, authorization,
and profile management.

This is an independent backend service. Other microservices must not connect directly to the
User Service PostgreSQL database. They must use the service's APIs or another explicitly agreed
service-to-service communication mechanism.

## Documentation status

This README describes both the current implementation and the planned target design. Planned
features are labelled as such and must not be assumed to exist. The authoritative source for
what works today is the repository code and the **Current project status** section below.

## Technology stack

| Technology                        | Status                | Notes                                                                                       |
| --------------------------------- | --------------------- | ------------------------------------------------------------------------------------------- |
| Node.js                           | Implemented           | `package.json` requires Node.js `>=20`.                                                     |
| TypeScript                        | Implemented           | Strict TypeScript, NodeNext ESM, compiled to `dist/`.                                       |
| Express                           | Implemented           | Express 5 application with health, 404, and error middleware.                               |
| PostgreSQL                        | Partially implemented | `pg` pool configuration and startup connectivity check exist. No schema or migrations yet.  |
| Redis                             | Planned               | Intended for temporary OTP challenges and other ephemeral data. Not declared or configured. |
| Argon2id                          | Planned               | Intended for password hashing. Not declared or configured for application use.              |
| JWT (asymmetric signing and JWKS) | Planned               | No signing keys, JWT middleware, or JWKS endpoint exist.                                    |
| Zod                               | Partially implemented | Used to validate environment variables. Request-body/path/query validation is planned.      |
| `node-pg-migrate`                 | Implemented           | SQL migration commands are configured. No migration files have been created.                |
| Docker                            | Planned               | No Dockerfile or Compose configuration exists.                                              |
| Automated tests                   | Planned               | No test script, test framework, or test files are configured in the project.                |

> Dependency warning: `node_modules` currently contains packages that are not declared in
> `package.json` or `package-lock.json`, including Redis, JWT, Argon2, email, and testing-related
> packages. They are reported by npm as extraneous. Do not rely on them until they are deliberately
> added to the project and the lockfile is updated. A clean `npm ci` would remove them.

## User roles

### PASSENGER

A passenger is a normal RailFlow customer.

- Can register, verify their email, authenticate, manage their own tokens and sessions, and view
  or update their own permitted profile information.
- Cannot access administrative user-management capabilities.
- May only act on resources they own unless an API explicitly allows otherwise.

### ADMIN

An administrator is a trusted operator with elevated user-management responsibilities.

- Has all normal authenticated-user capabilities unless explicitly restricted.
- Can manage users where required, for example viewing accounts, updating account status, or
  assigning roles.
- Must still authenticate normally. Administrative access is never granted by client-side role
  claims alone.
- Role checks must be enforced server-side on every protected administrative operation.
- Role changes are sensitive operations and must be audited or otherwise traceable when the
  supporting design is introduced.

## Functional requirements

All capabilities in this section are planned. None of the domain APIs described here are
implemented yet.

### A. User registration

- Register using email and password.
- Validate and normalize email addresses consistently before uniqueness checks and storage.
- Hash passwords securely with Argon2id using reviewed parameters.
- Prevent duplicate accounts through application checks and database constraints.
- Send and require email verification before allowing verified-user-only behavior.
- Never return password hashes or sensitive credential material.

### B. Email verification

- Send an OTP to the registered email address.
- Verify the submitted OTP against the active challenge.
- Expire challenges after a short, configured lifetime.
- Prevent OTP reuse by consuming a challenge atomically after successful verification.
- Limit verification attempts and reject challenges after the configured maximum.
- Allow controlled resend with a cooldown and rate limits.
- Do not reveal whether an arbitrary email address is registered unless an approved flow requires it.

### C. Authentication

- Email and password login.
- OTP-based login.
- Google OAuth login.
- Issue access tokens only after successful authentication.
- Apply account-status and email-verification checks according to approved policy.
- Return generic authentication failures that do not leak which credential was incorrect.

### D. Token management

- Sign JWTs asymmetrically with a private key.
- Publish public verification keys through a JWKS endpoint.
- Support key identifiers and a controlled key-rotation strategy.
- Rotate refresh tokens on use.
- Detect refresh-token reuse and revoke the affected token family/session.
- Support explicit token revocation and logout.
- Keep access tokens short-lived; keep refresh-token lifetime bounded and configurable.
- Store only the minimum refresh-token material needed for rotation, reuse detection, and revocation.

### E. Password management

- Forgot-password initiation without leaking account existence.
- OTP-based password reset.
- Secure password updates using Argon2id.
- Revoke relevant refresh tokens/sessions after a password reset.
- Rate-limit reset initiation and verification attempts.

### F. User profile

- Get the authenticated user's own profile.
- Update only explicitly permitted profile fields.
- Prevent users from changing protected fields such as role or verification status.
- Provide admin user-management capabilities where required.
- Return a deliberate public/self/admin representation; never serialize internal records blindly.

## OTP design requirements

OTP is a planned shared capability. All OTP use cases must use reusable OTP infrastructure rather
than separate implementations per feature.

Supported purposes:

- `EMAIL_VERIFICATION`
- `LOGIN`
- `PASSWORD_RESET`

Redis is intended to store temporary OTP challenges. The final key design and record format must
be reviewed before implementation.

Security expectations:

- Generate OTPs with a cryptographically secure random source.
- Store an HMAC-based digest of the OTP, not the plaintext OTP, where the approved design permits.
- Use random, unguessable challenge identifiers.
- Enforce expiration and maximum attempt limits.
- Enforce a resend cooldown and rate limiting.
- Verify and consume a challenge atomically to prevent races and reuse.
- Apply account-based and IP-based rate limiting.
- Never log OTP values, OTP digests, challenge secrets, or other sensitive challenge material.
- Return generic responses where revealing challenge existence would create an account-enumeration risk.
- Make behavior deterministic and testable, including clock-dependent expiration logic.

## Architecture principles

The service uses a practical, feature-first organization rather than theoretical Clean
Architecture. The architecture should evolve from actual requirements, not speculative layers.

Responsibilities:

- **Routes:** endpoint definitions and route-level middleware composition.
- **Controllers:** HTTP request and response handling; translating service results into responses.
- **Services:** application and business logic.
- **Repositories:** database access and persistence concerns.
- **Middleware:** authentication, authorization, validation, and error handling.
- **Infrastructure:** PostgreSQL, Redis, email, and security integrations.
- **Configuration:** validated environment configuration.

Guidelines:

- Use dependency injection where it provides practical value, such as testable services or
  swappable infrastructure clients.
- Keep business logic out of routes and controllers.
- Keep HTTP concerns out of repositories.
- Avoid unnecessary layers, interfaces for every class or function, factories, and overengineering.
- Avoid duplicated business logic and premature abstractions.
- Avoid large files containing unrelated responsibilities.
- Prefer explicit, readable code over architectural ceremony.
- Add abstractions only when a real requirement or repeated pattern justifies them.

## Database ownership

PostgreSQL is the persistent database owned by this service. It is expected to store:

- Users and account information.
- Password credentials or linked identity records.
- Refresh-token lifecycle records needed for rotation, reuse detection, and revocation.
- Other persistent authentication records only when justified by a reviewed design.

Redis is intended for temporary OTP challenges and other appropriate ephemeral data. Redis must
not become an unplanned source of durable business records.

No final database schema is assumed here. Tables, constraints, indexes, and relationships must be
designed, migrated, and reviewed before implementation. Other services must not access this
database directly.

## API roadmap

All API groups below are planned. No `/api/v1` endpoints are implemented yet.

| API group       | Status  | Intended responsibility                                                                |
| --------------- | ------- | -------------------------------------------------------------------------------------- |
| `/api/v1/auth`  | Planned | Registration, email verification, login, OTP, OAuth, token refresh, logout, passwords. |
| `/api/v1/users` | Planned | Authenticated user profile and self-service account operations.                        |
| `/api/v1/admin` | Planned | Administrative user management and role/status operations.                             |

The only implemented HTTP endpoint is `GET /health`, which is a service health check and is not
part of the versioned public API.

Candidate endpoints for future review include:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/email/verify`
- `POST /api/v1/auth/email/resend`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/otp/request`
- `POST /api/v1/auth/otp/verify`
- `POST /api/v1/auth/google`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/password/forgot`
- `POST /api/v1/auth/password/reset`
- `GET /api/v1/users/me`
- `PATCH /api/v1/users/me`
- Admin user-management endpoints under `/api/v1/admin`

These names are planning aids, not approved contracts. Request/response shapes, status codes, and
security behavior must be defined and reviewed per feature.

## Development roadmap

1. Foundation and database setup.
2. User registration.
3. Password login and access-token authentication.
4. Refresh-token lifecycle.
5. Reusable OTP infrastructure.
6. Email verification, OTP login, and password reset.
7. Google OAuth.
8. User profile APIs.
9. Admin APIs and RBAC.
10. Integration testing, security hardening, and deployment readiness.

Milestones are sequential by default. A later milestone must not be started until the current one
has been reviewed and approved.

## Current project status

### Implemented

- Node.js/TypeScript ESM project with strict compiler settings.
- Express 5 application factory.
- Disabled `x-powered-by` header.
- JSON and URL-encoded body parsing with a 10kb limit.
- `GET /health` endpoint returning service status, timestamp, and uptime.
- Zod-validated environment configuration.
- PostgreSQL connection pool with configurable pool size, SSL, idle timeout, and connection timeout.
- Startup database connectivity check using `SELECT 1`.
- Graceful shutdown on `SIGINT` and `SIGTERM`, including pool closure and a 10-second forced-exit timer.
- Centralized `AppError` hierarchy and JSON error responses.
- 404 handling for unknown routes.
- `node-pg-migrate` scripts configured for SQL migrations in `src/db/migrations`.
- ESLint and Prettier configuration.
- Dependency injection container currently limited to the PostgreSQL pool.
- Project documentation (this README and `AGENTS.md`).

### In progress

None currently.

### Planned

- Database schema and migrations.
- User registration and email verification.
- Email/password login, OTP login, and Google OAuth.
- Asymmetric JWT access tokens, JWKS, refresh-token rotation, reuse detection, and revocation.
- Password reset.
- User profile and admin APIs.
- RBAC enforcement.
- Redis-backed OTP infrastructure.
- Automated tests, security hardening, and deployment tooling.

### Not started

- User domain entities, repositories, services, controllers, and routes.
- Any `/api/v1` endpoint.
- Database tables.
- Redis integration.
- Password hashing integration.
- JWT signing, verification, or JWKS.
- Email delivery integration.
- Test suite and CI.

## Local development

### Prerequisites

- Node.js `>=20`.
- npm.
- A reachable PostgreSQL instance for the service configuration.
- Redis is not required yet because no Redis-backed features are implemented.

No Docker configuration exists in this repository. Docker-based local setup is planned but must
not be documented as working until it is added and verified.

### Setup

Run commands from `backend/user-service`:

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local environment file only if one does not already exist:

   ```bash
   cp .env.example .env
   ```

   Do not overwrite an existing `.env` file. If `.env` is already present, edit it in place.

3. Ensure `.env` contains `DATABASE_URL`.

   The current local `.env` contains only `NODE_ENV`, `HOST`, and `PORT`. The application requires
   `DATABASE_URL`; without it, startup exits during environment validation. Add the missing value
   to the existing file, adjusting it for your PostgreSQL instance:

   ```dotenv
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/railflow_users
   ```

4. Ensure the PostgreSQL database named by `DATABASE_URL` exists, using your local PostgreSQL
   tooling. No database-provisioning command is provided or verified by this repository.

5. Run migrations:

   ```bash
   npm run db:migrate
   ```

   There are currently no migration files, so this does not create a schema yet.

6. Start the development server:

   ```bash
   npm run dev
   ```

7. Check health:

   ```bash
   curl http://localhost:3000/health
   ```

The exact host and port come from `HOST` and `PORT`. The server verifies the database connection
before it starts listening.

### Environment variables

| Variable            | Required | Default       | Notes                                          |
| ------------------- | -------- | ------------- | ---------------------------------------------- |
| `NODE_ENV`          | No       | `development` | One of `development`, `test`, or `production`. |
| `HOST`              | No       | `0.0.0.0`     | HTTP bind address.                             |
| `PORT`              | No       | `3000`        | HTTP port, 1-65535.                            |
| `DATABASE_URL`      | Yes      | None          | PostgreSQL connection string.                  |
| `DATABASE_POOL_MAX` | No       | `10`          | Maximum pool size, 1-100.                      |
| `DATABASE_SSL`      | No       | `false`       | `true` or `false`.                             |

Additional variables for JWT keys, Redis, email, OTP, and OAuth will be introduced with the
features that require them.

### Available scripts

| Script                      | Purpose                                         |
| --------------------------- | ----------------------------------------------- |
| `npm run dev`               | Start the service with `tsx watch`.             |
| `npm run build`             | Compile TypeScript to `dist/`.                  |
| `npm start`                 | Run the compiled service from `dist/server.js`. |
| `npm run typecheck`         | Run TypeScript without emitting output.         |
| `npm run lint`              | Run ESLint.                                     |
| `npm run lint:fix`          | Run ESLint with automatic fixes.                |
| `npm run format`            | Format files with Prettier.                     |
| `npm run format:check`      | Check formatting without writing changes.       |
| `npm run db:migrate`        | Apply pending migrations.                       |
| `npm run db:migrate:down`   | Roll back the latest migration.                 |
| `npm run db:migrate:create` | Create a new SQL migration.                     |
| `npm run db:migrate:redo`   | Roll back and re-apply the latest migration.    |
| `npm run clean`             | Remove `dist/`.                                 |

There is currently no `test` script.

## Project structure

```text
user-service/
  src/
    app.ts                        # Express application factory
    server.ts                     # Startup, DB verification, graceful shutdown
    container.ts                  # Practical dependency container
    config/
      env.ts                      # Zod-validated environment configuration
    db/
      pool.ts                     # PostgreSQL pool creation and connectivity check
      migrations/                 # SQL migrations (currently empty)
    shared/
      errors/app-error.ts         # AppError hierarchy and error codes
      middleware/
        error-handler.ts          # Central error response middleware
        not-found.ts              # 404 middleware
    application/                  # Reserved for application services/ports
    domain/                       # Reserved for domain concepts
    infrastructure/               # Reserved for DB/Redis/email/security integrations
    interfaces/http/              # Reserved for routes, controllers, validation
  test/                           # Reserved for tests (currently empty)
```

The empty directories indicate intended areas, not implemented features. Do not treat their
existence as evidence that code has been written.

## Open design decisions

The following must be decided and reviewed before or during the relevant milestone:

- Final users and credential schema, including email normalization and uniqueness behavior.
- Whether OAuth identities are stored in separate identity rows.
- Refresh-token persistence model, token-family design, and revocation semantics.
- JWT claim set, key identifiers, key storage, and rotation procedure.
- JWKS caching and publication details for other services.
- Email provider and delivery/retry strategy.
- OTP Redis key format, digest strategy, and rate-limit dimensions.
- Account-status model and the exact email-verification enforcement policy.
- Public versus self versus admin user representations.
- Testing strategy, including real PostgreSQL/Redis integration environments.

## Related documentation

- [`AGENTS.md`](./AGENTS.md) contains mandatory development and verification instructions for
  contributors and AI coding agents.
