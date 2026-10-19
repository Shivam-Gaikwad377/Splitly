# Splitly — Project Log

## Date
25 September 2026

## Session Focus
API contract design and database schema cross-verification.

---

## Work Completed

### 1. Authentication API Contracts

Documented:

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
GET  /api/v1/auth/me

POST /api/v1/auth/verify-email/request
POST /api/v1/auth/verify-email
POST /api/v1/auth/resend-verification

POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
```

Important decisions:

- Email is required and verified.
- Phone number is optional during registration.
- Phone number is unique when provided.
- Phone number is currently not verified.
- Phone number can still be used as a login identifier.
- Login uses a single `identifier` field for email or phone.
- Phone can be changed later through the user profile flow.
- Email verification uses a two-step flow:
  1. Request a verification code using the email query parameter.
  2. Submit the code using the email query parameter and request body.
- HTTP status codes were documented with explanations.

### 2. Users & Contacts API Contracts

Documented:

```text
PATCH  /api/v1/users/me
DELETE /api/v1/users/me

POST   /api/v1/contacts
GET    /api/v1/contacts
GET    /api/v1/contacts/:contactId
PATCH  /api/v1/contacts/:contactId
DELETE /api/v1/contacts/:contactId
```

Important decisions:

- `/users/me` is used instead of exposing the authenticated user's ID.
- `owner_user_id` for Contacts is derived from authentication.
- Contacts do not need to correspond to registered Splitly users.
- Contact ownership is enforced server-side.
- `404 Not Found` is used when a Contact is outside the authenticated user's accessible scope.

### 3. Groups API Contracts

Final endpoint set:

```text
POST   /api/v1/groups
GET    /api/v1/groups/:groupId
PATCH  /api/v1/groups/:groupId
DELETE /api/v1/groups/:groupId
```

Corrections made:

- A `PUT /groups/:groupId` endpoint was initially included incorrectly and then removed.
- `description` was initially included incorrectly and then removed because it is not part of the Group schema.
- Group ownership is derived from the authenticated user.
- Group authorization is enforced server-side.

### 4. Database Schema Cross-Verification

The API contracts were compared with the visible PostgreSQL table structures.

#### `contacts`

```text
id
owner_user_id
name
phone
email
created_at
updated_at
```

The existing Contacts contract matches these fields.

#### `expenses`

```text
id
group_id
paid_by_group_member_id
description
amount
split_method
created_at
updated_at
```

The payer is represented by:

```text
paid_by_group_member_id
```

rather than a direct `user_id`.

#### `expense_participant`

```text
expense_id
group_member_id
amount_owed
status
```

#### `group_members`

The visible portion shows:

```text
id
group_id
user_id
contact_id
```

The screenshot was cut off after `contact_id`, so unseen columns and constraints were intentionally not assumed.

---

## Remaining Work

Draft contracts were created for:

```text
Group Members
Expenses
Expense Participants
```

One database detail remains intentionally unresolved.

### Expense Participant Identifier

The visible `expense_participant` table does not show a standalone `id` column.

The current handwritten API design uses:

```text
/expenses/:expenseId/participants/:participantId
```

Before implementation, the table's primary key / unique constraint should be checked to determine whether:

- there is an unseen participant ID, or
- the relationship is identified by a composite key such as:

```text
(expense_id, group_member_id)
```

This will be finalized later.

---

## Technical Decisions

```text
Authentication
→ email required and verified
→ phone optional but unique
→ phone currently unverified
→ phone usable as login identifier

Users
→ /users/me for authenticated-user operations

Contacts
→ user-owned placeholder people
→ no requirement for a Contact to have a Splitly account

Groups
→ POST, GET, PATCH, DELETE
→ no PUT
→ no description field

Expenses
→ payer represented by group_member_id
→ expenses belong to groups

Expense Participants
→ participant references a group member
→ amount owed and status are stored
→ identifier structure still needs confirmation
```

---

## Artifacts Created

```text
splitly-auth-api-contracts-updated.md
splitly-users-contacts-api-contracts.md
splitly-groups-api-contracts-verified.md
splitly-group-members-expenses-participants-api-contracts.md
splitly-schema-cross-verification.md
```

---

## Next Steps

1. Verify the remaining `group_members` columns and constraints.
2. Check the primary key / unique constraint of `expense_participant`.
3. Finalize the Expense Participant route identifier.
4. Review the drafted Group Member, Expense, and Expense Participant contracts against the complete database constraints.
5. Begin implementing the API contracts after the contract/schema review is complete.
