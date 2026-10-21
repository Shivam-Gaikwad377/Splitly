# Splitly — Project Log

**Date:** 24 September 2026  
**Project:** Splitly  
**Stack:** PERN  
**Focus:** API Design

## Today's Objective

Design the initial REST API architecture for Splitly before beginning backend implementation.

## Work Completed

### 1. Identified API Resources

Defined the core resources that the API will expose:

- Users
- Contacts
- Groups
- Group Members
- Expenses
- Expense Participants

No separate Settlement resource is included in the current Splitly design.

### 2. Designed Authentication API

Defined the authentication-related endpoints:

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
GET  /api/v1/auth/me

POST /api/v1/auth/verify-email
POST /api/v1/auth/resend-verification

POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
```

Discussed email verification and password-reset workflows, including token expiry and resending reset links.

### 3. Designed User API

Defined account-management operations:

```text
PATCH  /api/v1/users/me
DELETE /api/v1/users/me
```

Established that `GET /auth/me` will be used to identify the currently authenticated user instead of duplicating it with `GET /users/me`.

### 4. Designed Contact API

```text
POST   /api/v1/contacts
GET    /api/v1/contacts
GET    /api/v1/contacts/:contactId
PATCH  /api/v1/contacts/:contactId
DELETE /api/v1/contacts/:contactId
```

### 5. Designed Group API

```text
POST   /api/v1/groups
GET    /api/v1/groups
GET    /api/v1/groups/:groupId
PATCH  /api/v1/groups/:groupId
DELETE /api/v1/groups/:groupId
```

### 6. Designed Group Member API

```text
POST   /api/v1/groups/:groupId/members
GET    /api/v1/groups/:groupId/members
PATCH  /api/v1/groups/:groupId/members/:memberId
DELETE /api/v1/groups/:groupId/members/:memberId
```

Established that `GroupMember` is an independent relationship/resource because members can be added, removed, and have their roles changed after the group is created.

### 7. Designed Expense API

```text
POST   /api/v1/groups/:groupId/expenses
GET    /api/v1/groups/:groupId/expenses
GET    /api/v1/expenses/:expenseId
PATCH  /api/v1/expenses/:expenseId
DELETE /api/v1/expenses/:expenseId
```

Discussed that an expense can be created together with its initial participants while participants can also be modified later.

### 8. Expense Participant Design

Established that expense participants can have their own lifecycle:

```text
Create expense
      ↓
Add participants
      ↓
Update participants
      ↓
Remove participants
```

Therefore, participant-specific endpoints may be exposed as nested resources when implementing the API.

### 9. API Design Principles Discussed

Established the following principles:

- Use `/api/v1` for API versioning.
- API design should represent application behavior rather than blindly mirror database tables.
- Authentication and authorization are separate concerns.
- Financial calculations must be validated server-side.
- Group membership must be verified before performing group operations.
- Expense participants and payers must belong to the relevant group.
- Use consistent HTTP status codes and error responses.
- Password-reset tokens should expire and old tokens should be invalidated when a new one is generated.
- Password-reset tokens should be stored securely rather than as plaintext.

## Current API Structure

```text
/api/v1

AUTH
├── POST /auth/register
├── POST /auth/login
├── POST /auth/logout
├── GET  /auth/me
├── POST /auth/verify-email
├── POST /auth/resend-verification
├── POST /auth/forgot-password
└── POST /auth/reset-password

USERS
├── PATCH  /users/me
└── DELETE /users/me

CONTACTS
├── POST   /contacts
├── GET    /contacts
├── GET    /contacts/:contactId
├── PATCH  /contacts/:contactId
└── DELETE /contacts/:contactId

GROUPS
├── POST   /groups
├── GET    /groups
├── GET    /groups/:groupId
├── PATCH  /groups/:groupId
└── DELETE /groups/:groupId

GROUP MEMBERS
├── POST   /groups/:groupId/members
├── GET    /groups/:groupId/members
├── PATCH  /groups/:groupId/members/:memberId
└── DELETE /groups/:groupId/members/:memberId

EXPENSES
├── POST   /groups/:groupId/expenses
├── GET    /groups/:groupId/expenses
├── GET    /expenses/:expenseId
├── PATCH  /expenses/:expenseId
└── DELETE /expenses/:expenseId
```

## Today's Outcome

The initial API architecture for Splitly has been established. The next step is to **fully specify each endpoint** with:

- Request body
- Response body
- Authentication requirements
- Authorization rules
- Validation rules
- Business rules
- Error responses

Only after the API contract is finalized should Express implementation begin.