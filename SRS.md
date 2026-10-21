# Splitly

# Splitly — Software Requirements Specification

## 1. Problem Statement

Groups of friends need a simple way to record shared expenses, calculate balances, and settle debts without manually calculating who owes whom.

---

## 2. Target Users

### Primary Users

- Travelling friends

- People on dates or hangouts

- Friend groups

- Couples

- Families

- Roommates
  
  ### Secondary Users

- Event organizers

- Vacation planners

---

## 3. Core Value

### Without the Application

Target users may need to use multiple applications such as WhatsApp for communication, spreadsheets for record keeping, and calculators for expense calculations. This can lead to confusion, duplicated information, and mismanagement.

### With the Application

Users can manage contacts, groups, group members, expenses, expense splits, balances, and settlements in one application.

---

## 4. Scope of the Project

### 4.1 In Scope

1. Authentication

2. User profile management

3. Email verification

4. Contact management

5. Registered and unregistered group members

6. Group creation

7. Group member management

8. Expense management

9. Equal expense splitting

10. Exact-amount expense splitting

11. Percentage-based expense splitting

12. Balance calculation and display

13. Settlements

14. Expense history

15. User avatar/profile image

16. Notifications and reminders
    
    ### 4.2 Out of Scope

17. Payment gateways

18. Charts and visual analytics

19. Receipt uploads

20. Advanced analytics

21. Direct payment integrations

22. Recurring expenses
    
    ### 4.3 Deferred / Not Yet Reflected in the Current Data Model

23. Group events/occasions

24. Multiple-currency support and currency conversion

---

## 5. Stakeholders

1. **User:** A person who registers for and uses the application.
2. **System Administrator:** The person responsible for platform-level administration and moderation.
3. **Product Developer:** The person responsible for development, maintenance, and technical operation of the application.
4. **Product Owner:** The person responsible for the product's overall direction and business decisions.

---

## 6. Actors

1. **Registered User:** A registered user who interacts with the application to manage contacts, groups, expenses, balances, and settlements.

2. **Group Admin:** A registered user with additional privileges to manage a specific group. A group may have more than one group admin.

3. **System Administrator:** An actor responsible for platform-level administrative operations.

4. **Notification Service:** An external service responsible for delivering email and notification messages.
   
   > **Note:** Group Admin is a role performed by a Registered User; it is not a separate type of person or account.

---

## 7. Use Cases

### 7.1 Registered User

1. Register an account

2. Log in

3. Log out

4. Reset password

5. Verify email address

6. Manage user profile

7. Manage profile avatar

8. Add and manage contacts

9. Add registered users or contacts as group members

10. View groups

11. Create a group

12. View group details

13. Create an expense

14. View expense history

15. Split an expense

16. View balances

17. Record a settlement

18. View settlement history

19. Delete an account
    
    ### 7.2 Group Admin

20. Add group members

21. Remove group members

22. Modify group information

23. Assign another group admin

24. Remove group-admin privileges where permitted

25. Manage group expenses where authorized

26. Remove the group
    
    ### 7.3 System Administrator

27. View system status

28. View users

29. View user details

30. Suspend/deactivate a user

31. Reactivate a user

32. Manage reported users

33. View reported groups

34. Manage groups

35. Manage notifications or notification-related administration
    
    ### 7.4 Notification Service
    
    The Notification Service supports application workflows by delivering:
- Email verification messages
- Expense notifications
- Settlement notifications
- Group-related notifications
- Due-date or overdue reminders
- Other system-generated alerts

---

## 8. Functional Requirements

### 8.1 Authentication & User Account Management

- **FR1:** The system shall allow a user to register and log in using the supported authentication credentials.

- **FR2:** The system shall verify the email address of a newly registered user before enabling account functionality that requires verification.

- **FR3:** The system shall allow a registered user to reset a forgotten password through the supported password-reset process.

- **FR4:** The system shall allow a registered user to update their profile information.

- **FR6:** The system shall allow a registered user to delete their account.
  
  ### 8.2 Contact Management

- **FR7:** The system shall allow a registered user to create and manage contacts containing supported identifying information such as name, phone number, or email address.

- **FR8:** The system shall allow a registered user to add either a registered user or an unregistered contact as a member of a group.

- **FR9:** The system shall keep contact information separate from group-membership records so that contact details are not duplicated in the group-membership relationship.
  
  ### 8.3 Group Management

- **FR10:** The system shall allow a registered user to create a group.

- **FR11:** The system shall automatically add the user who creates a group as a member of that group.

- **FR12:** The system shall allow a group admin to add contacts as members of the group.

- **FR13:** The system shall allow a group admin to remove members, subject to applicable business rules regarding unresolved financial obligations.

- **FR14:** The system shall allow a group admin to modify the group's name.

- **FR16:** The system shall allow a registered user to view all groups to which they belong.

- **FR17:** The system shall allow authorized users to view relevant group information.

- **FR18:** The system shall allow an authorized group admin to remove a group.
  
  ### 8.4 Expense Management

- **FR19:** The system shall allow only the group admin to create an expense.

- **FR20:** The system shall allow the expense creator to specify the expense amount.

- **FR21:** The system shall allow the expense creator to designate a payer from the members of the relevant group.

- **FR22:** The system shall allow the expense creator to specify the group members who share the expense.

- ### 8.5 Expense Splitting & Calculation

- **FR26:** The system shall support equal expense splitting among selected group members.

- **FR27:** The system shall support exact-amount expense splitting by allowing a specific amount to be assigned to each group member.

- **FR28:** The system shall support percentage-based expense splitting.

- **FR29:** The system shall validate that the participant shares satisfy the rules of the selected splitting method before an expense is saved.

- **FR30:** The system shall calculate each participant's share based on the selected splitting method.

- **FR31:** The system shall calculate and display the resulting amount each relevant group member owes or is owed, while registered users can view their own applicable balances.
  
  ### 8.6 Balance Management

- **FR32:** The system shall maintain the balance impact of recorded expenses and settlements.

- **FR33:** The system shall display a user's current net balance within a group.

- **FR34:** The system shall distinguish between amounts owed by the user and amounts owed to the user.

- **FR35:** The system shall update affected balances when an expense is created, modified, deleted, or settled, according to the applicable business rules.
  
  ### 8.7 Settlement Management

- **FR36:** The system shall allow a user to record a settlement for an outstanding financial obligation.

- **FR37:** The system shall validate a settlement amount before it is recorded.

- **FR38:** The system shall update the relevant outstanding balance when a settlement is recorded.

- **FR39:** The system shall maintain a traceable settlement history.

- **FR40:** The system shall notify relevant users when a settlement is recorded, subject to notification availability.
  
  ### 8.8 Notifications & Reminders

- **FR41:** The system shall notify relevant group members when a group is created or a relevant member is added.

- **FR42:** The system shall notify relevant users when an expense is added or modified, where notification is applicable.

- **FR43:** The system shall notify relevant users about settlements.

- **FR44:** The system shall send due-date or overdue reminders when such dates are defined for the relevant transaction or obligation.

- **FR45:** The system shall generate email verification and other required account-related notifications.
  
  ### 8.9 Administrative Functions

- **FR46:** The system shall allow a system administrator to view registered users.

- **FR47:** The system shall allow a system administrator to view relevant user details needed for administrative operations.

- **FR48:** The system shall allow a system administrator to suspend or deactivate a user.

- **FR49:** The system shall allow a system administrator to reactivate a previously deactivated user, where permitted.

- **FR50:** The system shall allow a system administrator to view reported users and groups.

- **FR51:** The system shall allow a system administrator to perform permitted group-management and moderation actions.

---

## 8.10 Data Model Alignment

The current relational data model represents people participating in a group through the **GroupMember** entity. A group member may reference either a registered user or an unregistered contact, but not both. Contact information remains stored in **Contact** rather than being duplicated in **GroupMember**. Expenses reference the **GroupMember** who paid the expense, and **ExpenseParticipant** records the **GroupMember** records that owe shares of an expense.

## 9. Non-Functional Requirements

### 9.1 Performance

- **NFR1:** At least 95% of normal API requests shall be completed within 2 seconds under the defined operating conditions.

- **NFR2:** An expense creation operation, including validation and balance calculation, shall complete within 3 seconds under the defined operating conditions.

- **NFR3:** The user dashboard shall load its required data within 3 seconds under the defined operating conditions.

- **NFR4:** A user's current balances shall be retrieved and displayed within 2 seconds under the defined operating conditions.
  
  ### 9.2 Security

- **NFR5:** The system shall authenticate users before allowing access to protected resources.

- **NFR6:** The system shall enforce authorization so that users can access and modify only resources for which they have permission.

- **NFR7:** The system shall never store passwords in plaintext.

- **NFR8:** Authentication credentials shall be transmitted only through secure communication channels.

- **NFR9:** The system shall securely manage authentication sessions and prevent unauthorized session reuse.

- **NFR10:** The system shall validate and sanitize user-provided input before processing it.

- **NFR11:** The system shall protect against injection attacks, including SQL injection.

- **NFR12:** The system shall prevent users from accessing private expenses, group balances, or settlements belonging to resources they are not authorized to access.

- **NFR13:** The system shall not expose passwords, authentication secrets, or other sensitive credentials through client responses or application logs.

- **NFR14:** The system shall implement appropriate controls to limit repeated unsuccessful authentication attempts.
  
  ### 9.3 Reliability

- **NFR15:** Creation of an expense and all associated balance updates shall be treated as a single atomic operation.

- **NFR16:** If any part of an expense transaction fails, the system shall prevent partial persistence of the related data.

- **NFR17:** The system shall recover gracefully from unexpected application or database failures without silently corrupting financial data.

- **NFR18:** The system shall return appropriate error responses when an operation fails.
  
  ### 9.4 Availability

- **NFR19:** The system shall achieve at least 99.5% availability, excluding planned maintenance.

- **NFR20:** When a non-critical supporting service is unavailable, core expense and balance functionality shall fail gracefully where possible.

- **NFR21:** Planned maintenance shall be performed in a manner that minimizes disruption to users.
  
  ### 9.5 Scalability

- **NFR22:** The system shall support growth in the number of registered users without requiring fundamental architectural changes.

- **NFR23:** The system shall support increasing numbers of groups, expenses, participants, and settlements while maintaining the defined performance requirements.

- **NFR24:** The system shall support the defined target number of concurrent users without exceeding the specified performance thresholds.
  
  ### 9.6 Usability

- **NFR25:** A user shall be able to create a standard equal-split expense without external assistance.

- **NFR26:** The system shall provide clear and understandable validation messages.

- **NFR27:** The application shall use consistent terminology, navigation patterns, and interaction behavior.

- **NFR28:** The application shall remain usable across supported screen sizes.

- **NFR29:** The system shall allow users to correct invalid input without losing previously entered valid information.

- **NFR30:** The interface shall clearly distinguish between amounts owed by the user and amounts owed to the user.
  
  ### 9.7 Maintainability

- **NFR31:** The system shall be organized into modular components with clearly defined responsibilities and interfaces.

- **NFR32:** The system shall maintain clear separation between presentation logic, application/business logic, and data-access concerns.

- **NFR33:** Complex business logic, particularly balance calculation and expense-splitting logic, shall be documented.

- **NFR34:** APIs shall be documented with their inputs, outputs, authentication requirements, and error conditions.

- **NFR35:** Core business logic shall be structured so that it can be independently tested.

- **NFR36:** The expense-splitting architecture shall allow an additional splitting method to be introduced without unnecessary changes to unrelated components.
  
  ### 9.8 Data Integrity & Accuracy

- **NFR37:** Balances shall remain consistent with all recorded expenses and settlements.

- **NFR38:** Participant shares shall correspond correctly to the selected expense-splitting method.

- **NFR39:** The sum of participant amounts shall equal the expense amount before an exact-split expense can be persisted.

- **NFR40:** The sum of participant percentages shall equal 100% before a percentage-split expense can be persisted.

- **NFR41:** Monetary calculations shall use sufficient precision to prevent unacceptable rounding errors.

- **NFR42:** Relationships between users, contacts, groups, group members, expenses, participants, and settlements shall remain internally consistent.

- **NFR43:** Changes to an expense shall correctly propagate to all dependent balance calculations.

- **NFR44:** Deleting or cancelling an expense shall not leave inconsistent balances or orphaned financial records.

- **NFR45:** Recording a settlement shall update the relevant outstanding balance consistently.
  
  ### 9.9 Data Model Integrity

- **NFR52:** The system shall maintain the integrity of group-member relationships so that a group member references either a registered user or an unregistered contact, but never both or neither.

- **NFR53:** The system shall represent expense payers and expense participants through valid group members.

- **NFR54:** The system shall not duplicate contact name, phone, or email data in group-membership records.

- **NFR55:** The system shall validate that an expense payer and each expense participant belong to the group associated with the expense.

### 9.10 Compatibility

- **NFR46:** The system shall function correctly on supported current versions of major web browsers, including Google Chrome.

- **NFR47:** Core functionality shall remain available across supported desktop, tablet, and mobile screen sizes.

- **NFR48:** Changes to the API shall not unintentionally break supported clients without appropriate versioning or migration procedures where required.
  
  ### 9.11 Privacy

- **NFR49:** Access to users' personal and financial information shall be restricted to authorized parties.

- **NFR50:** The system shall not expose unnecessary personal or financial information.

- **NFR51:** The system shall collect and retain only information necessary to provide the defined functionality and meet applicable operational requirements.

---

## 10. Business Rules

### 10.1 User & Account Rules

- **BR1:** Each registered user shall have a unique email address.

- **BR2:** Only registered and active users may authenticate and perform protected application actions. Unregistered contacts may be represented as group members and expense participants but cannot log in or initiate protected actions.

- **BR3:** A user's account information shall be associated only with that user.

- **BR4:** A deactivated user shall not be permitted to perform normal transactional operations.
  
  ### 10.2 Contact & Group Rules

- **BR5:** A contact belongs to the registered user who created it.

- **BR6:** A group member shall reference either a registered user or an unregistered contact, but not both and not neither.

- **BR7:** The user who creates a group shall automatically become a member and group admin.

- **BR8:** A group may have multiple group admins, subject to the application's authorization rules.

- **BR9:** The same group member shall not be added to the same group more than once.

- **BR10:** A group admin must be a registered user.

- **BR11:** A group admin shall not remove a member in a manner that leaves unresolved financial obligations that violate the application's settlement rules.
  
  ### 10.3 Expense Rules

- **BR12:** An expense must belong to a group.

- **BR13:** An expense amount must be greater than zero.

- **BR14:** Every expense shall have exactly one designated payer.

- **BR15:** The designated payer must be a group member of the group to which the expense belongs.

- **BR16:** All expense participants must be group members of the relevant group.

- **BR17:** Only authorized registered users shall be allowed to create, modify, or delete an expense.
  
  ### 10.4 Expense-Splitting Rules

- **BR18:** For an equal split, the system shall distribute the expense amount among all selected participants according to the equal-split calculation.

- **BR19:** For an exact split, the sum of all participant amounts must equal the expense amount.

- **BR20:** For a percentage split, the total participant percentage must equal 100%.

- **BR21:** A participant's share shall not be negative.

- **BR22:** Participant shares shall collectively represent the entire expense according to the selected splitting method.
  
  ### 10.5 Balance Rules

- **BR23:** A user's net balance shall be determined from the amount the user has paid and the amount the user owes under the recorded expenses and settlements.

- **BR24:** A positive balance means the user is owed money.

- **BR25:** A negative balance means the user owes money.

- **BR26:** Creating an expense shall update the balances of the payer and all relevant participants according to the calculated shares.

- **BR27:** Editing an expense shall reverse its previous financial impact before applying the updated expense values.

- **BR28:** Deleting or cancelling an expense shall reverse its financial impact according to the application's deletion/cancellation rules.
  
  ### 10.6 Settlement Rules

- **BR29:** A settlement must involve supported participants with an outstanding financial relationship under the application's settlement model.

- **BR30:** A settlement amount must be greater than zero.

- **BR31:** A user shall not be able to record a settlement greater than the outstanding amount permitted under the chosen settlement model.

- **BR32:** Recording a settlement shall reduce the corresponding outstanding obligation.

- **BR33:** A recorded settlement shall remain traceable in the transaction history.

---

## 11. Open Product Decisions

The following decisions remain open because the current requirements and data model do not fully define their final behavior:

1. **Payer participation:** Decide whether the payer must also be an expense participant. The current data model only requires the payer to be a group member.
2. **Unregistered contact lifecycle:** Define whether an unregistered contact can hold balances, receive settlements, and later be linked to a registered user account.
3. **Settlement confirmation:** Decide whether recording a settlement immediately marks it as settled or requires confirmation by the receiving user.
4. **Expense permissions:** Define precisely which registered group members may create, edit, and delete expenses within a group.
5. **Currency support:** Define whether currency support will be added to the current data model and whether currency conversion will be required.
