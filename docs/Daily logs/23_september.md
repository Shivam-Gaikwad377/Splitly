### Date: 23 September 2026
### Project: Splitly – Expense Sharing Application
### Work Completed: Database Design and ERD Refinement

Today, I worked extensively on the database design and ER diagram of the Splitly expense-sharing application. The main focus was on improving the relational structure and ensuring that the database correctly represents both registered users and unregistered people involved in groups and expenses.

I finalized the basic database entities including **Users, Contacts, Groups, Group Members, Expenses, and Expense Participants**. I reviewed the relationships between these entities and refined the foreign-key relationships and constraints.

I implemented and reviewed the following database concepts:

- Designed the **Users** table with identity-based primary keys, unique email and phone fields, password hash, timestamps, and email verification-related fields.
- Designed the **Contacts** table so that a registered user can store information about people who may not have a Splitly account.
- Designed the **Groups** table with a reference to the user who created the group.
- Designed the **Group Members** junction table using a relationship between groups and individual members.
- Added support for both **registered users and unregistered contacts** as group members.
- Added a `role` field for group members and restricted it to `member` and `admin`.
- Used a composite primary key where appropriate to prevent duplicate relationships.
- Reviewed the **Expenses** table and changed the payer reference from `paid_by_user_id` to `paid_by_group_member_id`.
- This allows both registered users and unregistered contacts to pay for expenses, while ensuring that the payer is represented as a group member.
- Designed the **Expense Participant** table to reference `group_member_id` instead of directly referencing a registered user.
- Added the concept of storing the amount owed by each participant and tracking settlement status.
- Reviewed foreign-key relationships and distinguished between constraints that should be enforced directly by PostgreSQL and business rules that can be validated during API/database operations.
- Reviewed appropriate use of `CHECK`, `UNIQUE`, `PRIMARY KEY`, and foreign-key constraints.
- Standardized the approach of explicitly naming **foreign-key constraints** while avoiding unnecessary names for other constraints.
- Reviewed timestamp fields and database naming conventions, including the use of `TIMESTAMPTZ`.
- Reviewed monetary fields and the use of `NUMERIC(12,2)` for expense amounts.
- Reviewed the importance of preventing invalid data such as negative expense amounts and invalid member roles.
- Finalized the overall database relationship model and prepared the project to move from database/ERD design toward **API design and backend implementation**.

### Key Design Decision

A major design decision made today was that a **group member does not have to be a registered Splitly user**. A member can either be linked to a registered user or represented through a contact. Therefore, expenses and expense participants reference the **group member**, rather than directly referencing the user.

This makes the data model more flexible and closer to the intended functionality of a Splitwise-style application.

### Current Progress

**ER Diagram:** Completed  
**Database structure:** Completed/refined  
**Relationships and constraints:** Reviewed/refined  
**Expense and participant modeling:** Completed  
**Next phase:** API design and backend implementation