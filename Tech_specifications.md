# Splitly — Technology Specification

## 1. Document Purpose

This document defines the technologies currently selected or planned for the development of **Splitly**, an expense-sharing web application.

The purpose of this document is to record technology-level decisions without prematurely fixing the internal API or backend architecture. Those decisions will be made during the API and backend design phase.

This document complements the Splitly Software Requirements Specification (SRS) and the database/ERD design.

---

## 2. Project Overview

**Project Name:** Splitly

**Application Type:** Full-stack web application

**Primary Purpose:**  
Splitly is an expense-sharing application that allows people to manage groups, record shared expenses, assign participants, calculate financial balances, and manage settlements.

The data model supports both:

- Registered Splitly users
- Unregistered people represented through contacts

---

## 3. Technology Stack

| Layer | Technology | Status | Purpose |
|---|---|---|---|
| Frontend | React.js | Selected | User interface |
| Backend Runtime | Node.js | Selected | Server-side JavaScript runtime |
| Backend Framework | Express.js | Selected | Backend/API development |
| Database | PostgreSQL | Selected | Relational data storage |
| Database Access | PostgreSQL driver/library | To be finalized | Backend-to-database connectivity |
| API Style | REST/HTTP API | Planned | Client-server communication |
| Data Format | JSON | Planned | API data exchange |
| Version Control | Git | Selected | Source-code version control |
| Remote Repository | GitHub | Selected | Repository hosting |
| Containerization | Docker | Planned | Consistent development and deployment environments |
| API Testing | Postman | Planned | API testing during development |

Technologies such as the authentication mechanism, validation library, deployment platform, email provider, monitoring tools, and frontend styling solution will be finalized later.

---

## 4. High-Level Technology Architecture

The current planned technology flow is:

```text
React.js
    |
    | HTTP / JSON
    v
Node.js + Express.js
    |
    | Database access
    v
PostgreSQL
```

This represents the current technology direction only.

The internal architecture of the Node.js/Express.js backend has **not yet been finalized**.

---

## 5. Frontend Technology

### 5.1 React.js

React.js will be used to build the Splitly frontend.

The frontend will be responsible for:

- User interface rendering
- User interaction
- Form handling
- Client-side validation where appropriate
- Calling backend APIs
- Displaying groups and expenses
- Displaying balances and settlement information
- Managing frontend application state as required

The exact frontend architecture, state-management approach, routing solution, and styling technology will be finalized during frontend design and implementation.

---

## 6. Backend Technology

### 6.1 Node.js

Node.js will be used as the server-side runtime.

It will provide the execution environment for the Splitly backend.

### 6.2 Express.js

Express.js will be used as the backend web framework.

It will provide the foundation for:

- HTTP request handling
- API routing
- Middleware
- Request/response processing

The detailed structure of routes, controllers, services, repositories, middleware, modules, and other backend components has **not yet been finalized**.

Those decisions will be made during API and backend design.

---

## 7. Database Technology

### 7.1 PostgreSQL

PostgreSQL will be used as the primary database.

PostgreSQL is suitable for Splitly because the application requires:

- Relational data
- Foreign-key relationships
- Composite relationships
- Unique constraints
- Check constraints
- Transactions
- Consistent financial data

### 7.2 Current Core Entities

The current database model contains:

```text
User
Contact
Group
GroupMember
Expense
ExpenseParticipant
```

### 7.3 Current Data-Modelling Decisions

The database design currently follows these principles:

- `User` represents a registered Splitly account.
- `Contact` represents a person stored by a user who may not have a Splitly account.
- `GroupMember` represents membership in a specific group.
- A `GroupMember` can reference either a registered user or an unregistered contact.
- `Expense` identifies its payer through `paid_by_group_member_id`.
- `ExpenseParticipant` references `group_member_id`.
- Contact information is not duplicated inside `GroupMember`.
- PostgreSQL constraints are used for important data-integrity rules.

---

## 8. Database Data Standards

### 8.1 Primary Keys

Generated identifiers will use PostgreSQL identity columns where appropriate.

Example:

```sql
BIGINT GENERATED ALWAYS AS IDENTITY
```

### 8.2 Monetary Values

Expense and participant monetary values will use an exact numeric type rather than floating-point types.

Current design:

```sql
NUMERIC(12,2)
```

### 8.3 Time Values

Timestamp fields will use:

```sql
TIMESTAMPTZ
```

where timezone-aware timestamps are required.

### 8.4 Constraints

The database will use:

- Primary keys
- Foreign keys
- Unique constraints
- Check constraints
- Not-null constraints

Foreign-key constraints are explicitly named to make database maintenance and debugging easier.

---

## 9. API Technology

The current project direction is to expose backend functionality through an HTTP API using JSON.

However, the API specification has **not yet been finalized**.

The following items will be decided during API design:

- Endpoint structure
- Resource naming
- HTTP methods
- URL conventions
- Request body structure
- Response structure
- Error response format
- Authentication mechanism
- Authorization strategy
- Validation approach
- Pagination and filtering
- API versioning
- Idempotency requirements where relevant

No detailed endpoint structure is considered final at this stage.

---

## 10. Authentication and Authorization

Authentication and authorization are required by the SRS, but their technical implementation has not yet been finalized.

The following decisions remain open:

- Token/session mechanism
- Token storage strategy
- Password hashing library
- Refresh-token strategy, if required
- Email-verification implementation
- Password-reset implementation
- Authorization middleware/architecture

The final decisions will be recorded during backend and API design.

---

## 11. Validation and Error Handling

Input validation will be required at the application level, with PostgreSQL constraints providing an additional integrity layer.

The exact validation library and validation architecture have not yet been selected.

The backend will eventually define a consistent approach for:

- Required-field validation
- Type validation
- Format validation
- Business-rule validation
- Database errors
- Authentication errors
- Authorization errors
- Not-found errors
- Conflict errors

---

## 12. Transaction and Financial Data Handling

Splitly contains financial data, so operations that modify related financial records must maintain consistency.

Operations such as creating an expense and its participants should be treated as coordinated database operations.

The final transaction boundaries and service-level implementation will be determined during backend design.

The database must prevent partial persistence of critical financial operations.

---

## 13. Business Logic Considerations

The technology implementation must support the project's expense-splitting rules:

### Equal Split

The expense is divided among the selected participants according to the equal-split calculation.

### Exact Split

Specific amounts are assigned to participants.

The participant amounts must collectively equal the expense amount.

### Percentage Split

Participants receive percentage-based shares.

The participant percentages must collectively equal 100%.

The final implementation structure for this business logic will be decided during backend design.

---

## 14. Version Control

Git will be used for source-code version control.

GitHub will be used as the remote repository.

The project will maintain version history for:

- Source code
- Database migrations/schema changes
- API documentation
- Configuration templates
- Other project documentation

The exact branching strategy will be finalized as development progresses.

---

## 15. Containerization and DevOps

Docker is planned for Splitly to provide a consistent development environment and support future deployment workflows.

The exact Docker architecture has not yet been finalized.

Potentially containerized components include:

```text
React frontend
Node.js/Express backend
PostgreSQL database
```

The final production architecture, deployment provider, CI/CD platform, monitoring solution, and database hosting strategy will be decided later.

---

## 16. Development and Testing Tools

The current development toolset includes:

```text
IDE:
IntelliJ IDEA / VS Code

Database:
PostgreSQL

Database Administration:
pgAdmin or equivalent PostgreSQL client

API Testing:
Postman

Version Control:
Git

Repository Hosting:
GitHub

Containerization:
Docker
```

The exact tool used for each task may be refined during implementation.

---

## 17. Security Principles

The implementation will follow these principles:

1. Passwords must never be stored in plaintext.
2. Database credentials and application secrets must not be committed to the repository.
3. User input must be validated before processing.
4. Database queries must use parameterized values.
5. Protected resources must require appropriate authentication.
6. Authorization must be enforced on protected operations.
7. Sensitive information must not be unnecessarily returned through APIs.
8. Production communication must use secure transport.
9. Financial and personal data must be protected from unauthorized access.

Specific security technologies and implementation details will be finalized during backend design.

---

## 18. Maintainability Principles

The implementation should maintain clear separation between:

```text
Frontend
    |
Backend/API
    |
Business Logic
    |
Database Access
    |
PostgreSQL
```

The exact internal backend pattern is intentionally not prescribed yet.

The architecture should favor:

- Clear responsibilities
- Low coupling
- Reusable modules
- Testable business logic
- Consistent error handling
- Clear API contracts
- Maintainable database access

---

## 19. Current Technology Decisions

### Finalized

- React.js
- Node.js
- Express.js
- PostgreSQL
- Git
- GitHub

### Planned

- HTTP/JSON API
- REST-oriented API
- Docker
- Postman/API testing

### Not Yet Finalized

- Backend folder structure
- Controller/service/repository pattern
- Authentication mechanism
- Authorization architecture
- Validation library
- Error-handling architecture
- Exact API endpoints
- API response contract
- API versioning
- Deployment platform
- CI/CD platform
- Email provider
- Monitoring solution
- Frontend styling technology
- Frontend state-management solution

---

## 20. Relationship to Other Project Documents

The Technology Specification should be read together with:

```text
Software Requirements Specification
        |
        v
Data Model / ERD
        |
        v
Database Schema
        |
        v
Technology Specification
        |
        v
API & Backend Design
```

The Technology Specification defines the technology choices while the later API and backend design documents will define the detailed implementation architecture.

---

## 21. Current Development Stage

The current project status is:

```text
Requirements / SRS          ✅
Data Modelling              ✅
ERD                         ✅
PostgreSQL Schema           ✅
Technology Specification    ✅
API Design                  ← Current next phase
Backend Architecture        ← To be finalized
Implementation              ← Later
Testing                     ← Later
Deployment                  ← Later
```

The next major technical document is the **Splitly API & Backend Design Specification**.
