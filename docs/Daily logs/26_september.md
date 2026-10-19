# Splitly — Project Log

## Project
**Project:** Splitly  
**Date:** 26 September 2026  
**Stack:** PERN (PostgreSQL, Express.js, React, Node.js) + TypeScript  
**Session:** Backend Foundation, PostgreSQL Integration, Git Workflow & Error Handling

---

## Phase 1 — Backend Project Initialization

### Work Completed
- Initialized the Splitly backend as a dedicated Node.js project.
- Confirmed TypeScript as the backend language.
- Established VS Code + Git Bash as the development environment for the TypeScript backend.
- Installed Express 5.
- Created the initial backend directory structure manually using Bash.
- Created separate `app.ts` and `server.ts` files.
- Configured TypeScript using `tsconfig.json`.
- Created initial backend configuration, middleware, routes, utilities, database, and test directories.

### Initial Backend Structure

```text
backend/
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── config/
│   │   ├── env.ts
│   │   └── database.ts
│   ├── db/
│   │   ├── migrations/
│   │   └── seeds/
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── validation.middleware.ts
│   ├── modules/
│   ├── routes/
│   │   └── index.ts
│   ├── types/
│   │   └── express.d.ts
│   └── utils/
│       ├── app-error.ts
│       └── logger.ts
├── tests/
│   ├── integration/
│   └── unit/
├── .env
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
└── tsconfig.json
```

### Architectural Decision
Feature-specific module files such as users, contacts, groups, expenses, group members, and expense participants were not created as empty placeholders. They will be added when the corresponding API implementation begins.

---

## Phase 2 — TypeScript & Express Configuration

### TypeScript Configuration
Configured `tsconfig.json` with the following major settings:
- `target: ES2022`
- `module: CommonJS`
- `moduleResolution: Node`
- `rootDir: ./src`
- `outDir: ./dist`
- `strict: true`
- `esModuleInterop: true`
- `forceConsistentCasingInFileNames: true`
- `skipLibCheck: true`
- `sourceMap: true`

### Express Application Setup

`src/app.ts` is responsible for:
- Creating the Express application.
- Registering middleware.
- Registering application routes.

`src/server.ts` is responsible for:
- Startup logic.
- Infrastructure checks.
- Starting the HTTP server.

### Health Endpoint
Implemented and tested:

```text
GET /
```

Response:

```json
{
  "success": true,
  "message": "Splitly backend is running"
}
```

This confirmed that the Express server was functioning correctly.

---

## Phase 3 — Development Server

### Work Completed
- Installed `tsx` for TypeScript execution during development.
- Configured the development command to use watch mode.

Development command:

```bash
npm run dev
```

Configured to run:

```text
tsx watch src/server.ts
```

### Architectural Decision
Nodemon was deliberately not added.

Reason:
- The project uses TypeScript.
- `tsx watch` already provides automatic restart behavior.
- Adding Nodemon would introduce an unnecessary extra layer.

---

## Phase 4 — Git & GitHub Setup

### Work Completed
- Initialized Git in the backend project.
- Created the GitHub repository for the backend.
- Connected the local repository to GitHub.
- Configured GitHub SSH authentication.
- Resolved an initial SSH authentication problem.
- Generated a dedicated GitHub SSH key:

```text
~/.ssh/github_ed25519
```

- Added the public key to GitHub.
- Successfully tested authentication using:

```bash
ssh -T git@github.com
```

### Git Branching Strategy
Established the following structure:

```text
main
  ↑
develop
  ↑
feature/*
```

Supporting branch types:

```text
feature/*
fix/*
hotfix/*
```

### Branch Responsibilities

`main`
- Production-ready branch.
- Intended to represent production deployment state.

`develop`
- Integration branch.
- Used to combine completed features before production release.

`feature/*`
- Used for individual development tasks.

`fix/*`
- Used for normal bug fixes.

`hotfix/*`
- Reserved for urgent production fixes.

### Development Flow

```text
feature/*
    ↓
develop
    ↓
staging
    ↓
main
    ↓
production
```

CI/CD, staging infrastructure, branch protection, and automated deployment were intentionally deferred until the application has enough functionality to justify them.

---

## Phase 5 — PostgreSQL Integration

### Work Completed
- Installed the PostgreSQL Node.js client:

```text
pg
```

- Installed TypeScript type definitions:

```text
@types/pg
```

- Connected the backend to the existing Splitly PostgreSQL database.
- Implemented a PostgreSQL connection pool.
- Added a startup connectivity check.

### Existing Database
The Splitly PostgreSQL database and schema had already been designed and created before backend implementation.

Therefore:
- No tables were recreated.
- No relationships were recreated.
- The backend connects to the existing Splitly database schema.

### Connection Architecture

```text
Node.js / Express
       ↓
    pg Pool
       ↓
Existing Splitly PostgreSQL Database
```

### Connection Pool
The pool uses:
- Host
- Port
- Database
- User
- Password
- Maximum connections
- Idle timeout
- Connection timeout

### Startup Verification
The server checks PostgreSQL connectivity before starting the HTTP server.

Successful result:

```text
PostgreSQL connected successfully
```

---

## Phase 6 — Environment Configuration

### Work Completed
- Installed `dotenv`.
- Configured environment variables through `.env`.
- Created `.env.example` as a safe configuration template.
- Added `.env` to `.gitignore`.
- Added runtime validation for required environment variables.

### Environment Variables

```text
PORT
DB_HOST
DB_PORT
DB_NAME
DB_USER
DB_PASSWORD
```

### Configuration Flow

```text
.env
  ↓
env.ts
  ↓
database.ts
  ↓
PostgreSQL Pool
```

### Runtime Validation
A `requireEnv()` helper was used so required environment variables fail clearly when missing.

A TypeScript non-null assertion such as:

```ts
process.env.DB_HOST!
```

was intentionally not used as the primary validation mechanism because it does not perform actual runtime validation.

### Debugging Issue
The first PostgreSQL connection failed with:

```text
getaddrinfo ENOTFOUND localhost;
```

The error showed that the hostname was being read as:

```text
localhost;
```

The problem was a trailing semicolon in `.env`.

Incorrect:

```env
DB_HOST=localhost;
```

Correct:

```env
DB_HOST=localhost
```

After correcting the environment variable, PostgreSQL connected successfully.

---

## Phase 7 — Centralized Error Handling

### Work Completed
- Created a custom `AppError` class.
- Created centralized error middleware.
- Created 404 route handling middleware.
- Established a consistent API error response structure.
- Tested generic and application-specific errors.
- Removed temporary test routes after verification.

### AppError
`AppError` extends JavaScript's native `Error` class and carries:
- `message`
- `statusCode`
- `code`
- `isOperational`

Example:

```ts
throw new AppError(
  "User not found",
  404,
  "USER_NOT_FOUND"
);
```

### Why a Class Was Used
A TypeScript interface only describes an object shape during compilation.

A class exists at runtime and can:
- Be instantiated.
- Extend `Error`.
- Be thrown.
- Be checked using `instanceof`.

Therefore a class is appropriate for application errors.

### Error Middleware
Two centralized middleware responsibilities were established:

1. `notFoundMiddleware`
   - Handles requests to undefined routes.

2. `errorMiddleware`
   - Handles known `AppError` instances.
   - Handles unexpected unknown errors.
   - Returns safe API responses to clients.

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

### 404 Example

```text
HTTP 404
ROUTE_NOT_FOUND
```

### Unknown Error Example

```text
HTTP 500
INTERNAL_SERVER_ERROR
```

### Security Decision
Internal details must remain server-side.

The API should not expose:
- Database credentials.
- Filesystem paths.
- Stack traces.
- Internal implementation details.

---

## Phase 8 — Express 5 Async Error Handling Decision

An `async-handler` utility was initially considered.

However, the project uses Express 5, which automatically forwards rejected promises from asynchronous route handlers to the centralized error middleware.

Therefore a separate async-handler wrapper was considered unnecessary and removed.

### Decision
Avoid redundant abstraction when Express already provides the required behavior.

---

## Phase 9 — Error Handling Feature Branch

### Feature Branch

```text
feature/error-handling
```

### Workflow Completed
1. Created feature branch from `develop`.
2. Implemented centralized error handling.
3. Tested the implementation.
4. Committed the changes.
5. Pushed the feature branch to GitHub.
6. Created a Pull Request.
7. Merged the Pull Request into `develop`.

### Result

```text
feature/error-handling
          ↓
        develop
```

The error-handling feature is therefore complete and integrated into the development branch.

---

## Phase 10 — Backend Foundation Status

### Completed

```text
Node.js                    ✅
TypeScript                 ✅
Express 5                  ✅
tsx watch                  ✅
Project structure          ✅
Git                        ✅
GitHub                     ✅
SSH authentication         ✅
develop branch             ✅
Environment configuration  ✅
dotenv                     ✅
PostgreSQL / pg            ✅
Database connection pool   ✅
Existing DB connection     ✅
Centralized errors         ✅
404 handling               ✅
500 handling               ✅
AppError                   ✅
Feature branch workflow    ✅
Pull Request workflow      ✅
```

---

## Current Project Status

**Planning & Requirements:** Completed  
**Database Design:** Completed  
**Business Rules:** Completed  
**API Contracts:** Completed  
**Backend Foundation:** Completed  
**PostgreSQL Integration:** Completed  
**Environment Configuration:** Completed  
**Error Handling:** Completed  
**Git/GitHub Workflow:** Established

### Next Phase

Authentication middleware and JWT-based authentication.

Expected next branch:

```text
feature/auth
```

### Next Session Agenda

```text
1. Authentication architecture
2. JWT configuration
3. Authentication middleware
4. Express request-user typing
5. Protected routes
6. Authentication testing
7. Validation setup
```

---

## End of Log — 26 September 2026
