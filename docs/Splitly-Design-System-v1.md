# Splitly Design System

**Version:** 1.0  
**Product:** Splitly — group-expense management  
**Frontend stack:** React, Vite, TypeScript, Tailwind CSS, shadcn/ui

---

## 1. Brand direction

### Product positioning

Splitly is a group-expense management application for tracking shared expenses, calculating balances, and managing settlements.

**Working tagline:** Shared expenses. Clear balances.

### Brand personality

- Trustworthy
- Clear
- Approachable
- Practical

### Design principle

Make the financial state immediately understandable, then make the next action obvious.

### Visual direction

Use a calm, warm-neutral interface with deep teal as the primary brand color, clean typography, lightly bordered surfaces, and restrained semantic color for balances and feedback.

Avoid excessive gradients, overly rounded cards, decorative charts without a clear purpose, and using error-like colors to imply that owing money is a mistake.

### Logo concept

A simple geometric mark built from a rounded rectangular outline and a split/flow motif, paired with a clean wordmark. The logo concept is preliminary; final artwork and trademark clearance are not part of this specification.

---

## 2. Color system

### Core brand and surfaces

| Token | Hex | Usage |
|---|---|---|
| Primary teal | `#0F766E` | Primary actions, active navigation, focus accents |
| Teal hover | `#115E59` | Hover and pressed states |
| App background | `#F7FAF8` | Main application background |
| Surface | `#FFFFFF` | Cards, dialogs, forms |
| Soft mint | `#DDF5EC` | Selected states and subtle highlights |
| Primary text | `#1B2C29` | Headings, body copy, important amounts |

### Semantic colors

| Purpose | Hex | Usage |
|---|---|---|
| Positive balance | `#15803D` | Money owed to the current user, successful settlement |
| Amount owed | `#B45309` | Outstanding amount the current user needs to pay, pending settlement |
| Destructive | `#B42318` | Delete actions, failed requests, critical errors |
| Informational | `#1D4ED8` | Helpful notices and informational states |
| Muted text | `#586A66` | Secondary labels, timestamps, helper text |
| Border | `#DDE5E2` | Dividers, input boundaries, card outlines |

### Color usage rules

- A negative balance is not an application error. Use the semantic `amount owed` color for normal financial obligations.
- Reserve destructive red for destructive actions and actual errors.
- Never communicate status through color alone; include descriptive text, an icon, or both.
- Check contrast in the rendered UI before release. The listed palette is a starting point, not a claim that every possible foreground/background combination has been audited.

---

## 3. Typography

Use **Inter** as the primary interface typeface. It is a neutral, legible choice for expense lists, forms, and financial information.

| Token | Size | Weight | Usage |
|---|---:|---:|---|
| Page title | 30 px | 650–700 | Dashboard and page headings |
| Section heading | 22 px | 600 | Groups, balances, activity sections |
| Card heading | 18 px | 600 | Card titles |
| Body | 15–16 px | 400 | General content |
| Label | 14 px | 500 | Input labels and compact UI |
| Caption | 12–13 px | 400–500 | Dates, metadata, helper text |
| Financial amount | 24–32 px | 600–700 | Balance summaries |

### Typography rules

- Use tabular numerals for financial figures so amounts align consistently.
- Keep body text left-aligned.
- Use sentence case for labels and controls.
- Avoid all-caps headings.
- Maintain clear visual hierarchy without making every card title oversized.

---

## 4. Spacing, radius, and elevation

### Spacing scale

Use a 4 px base spacing grid.

| Token | Value | Typical use |
|---|---:|---|
| `space-1` | 4 px | Icon-to-label gap |
| `space-2` | 8 px | Compact content spacing |
| `space-3` | 12 px | Form and row spacing |
| `space-4` | 16 px | Standard component padding |
| `space-6` | 24 px | Card padding and section gaps |
| `space-8` | 32 px | Major section separation |
| `space-12` | 48 px | Large layout separation |
| `space-16` | 64 px | Major page sections |

### Radius scale

| Token intent | Radius | Typical use |
|---|---:|---|
| Compact | 6 px | Small badges and compact elements |
| Controls | 10 px | Buttons and form controls |
| Cards | 16 px | Cards and common content surfaces |
| Dialogs | 22 px | Large dialogs and focused overlays |

### Elevation rules

- Prefer thin borders to visually separate cards.
- Use subtle shadows mainly for popovers, dropdowns, and elevated dialogs.
- Avoid placing every section inside another card.
- Keep elevation consistent across surfaces with the same interaction role.

---

## 5. Component specifications

These rules extend shadcn/ui primitives into Splitly-specific components.

### Buttons

- **Primary:** teal fill with high-contrast text.
- **Secondary:** soft mint fill with dark teal text.
- **Outline/tertiary:** white or transparent surface with a subtle border.
- **Destructive:** clearly distinct styling reserved for consequential destructive actions.
- Default height: **44 px**.
- Compact height: **36 px**.
- Large height: **48 px**.
- Use one visually dominant primary action per section where practical.
- Include disabled, loading, focus, hover, and pressed states.

### Form controls

- Minimum default height: **44 px**.
- Use persistent, programmatically associated labels.
- Provide a visible focus state.
- Show field-level validation near the relevant input.
- Keep error messages descriptive and actionable.
- Do not rely on placeholder text as the only label.

### Cards and financial summaries

- Use a white surface, subtle border, and consistent padding.
- Give the most important balance a clear typographic hierarchy.
- Label whether the value is net balance, total owed to the user, or total the user owes.
- Always format amounts using the currency associated with the relevant expense or group.

Illustrative balance summary:

```text
Your net balance
₹4,250.00
You are owed ₹5,000 · You owe ₹750
```

The figures above are illustrative. They are not a finalized balance formula or real user data.

### Expense rows

An expense row can include:

- A category or merchant icon in a muted container.
- Expense title.
- Group name and payer context.
- Date and optional category metadata.
- Total amount and, where useful, the current user's share.

Example:

```text
Groceries                         ₹1,250.00
Weekend trip · Paid by you        Your share ₹625
19 Oct · Food & groceries
```

### Other reusable components

| Component | Design rule |
|---|---|
| Navigation item | Icon plus label; selected state uses a soft mint background |
| Avatar group | Consistent 32–36 px avatars with an overflow count |
| Balance badge | Compact text with semantic color and optional icon |
| Dialog | Focused content, clear title, explicit primary and cancel actions |
| Toast | Brief confirmation or failure message; dismisses appropriately |
| Skeleton | Match the shape and approximate size of the content being loaded |
| Empty state | Explain what is missing and provide one helpful next action |
| Table/list | Align amounts consistently and adapt for mobile |

---

## 6. Application layout

### Primary navigation

- Dashboard
- Groups
- Expenses / Activity
- Settlements
- Settings

The global **Add expense** action should be easy to find without competing with every other button.

### Layout dimensions

| Property | Guideline |
|---|---|
| Expanded desktop sidebar | 248 px |
| Collapsed desktop sidebar | 72 px |
| Main content maximum width | 1,200 px |
| Desktop page gutter | 32 px |
| Tablet page gutter | 24 px |
| Mobile page gutter | 16 px |

### Responsive behavior

- On desktop, use a persistent sidebar with an optional collapsed state.
- On mobile, replace the sidebar with compact bottom navigation for primary sections.
- Keep key actions easy to reach on small screens.
- Make forms and expense lists usable at narrow widths; do not merely shrink desktop layouts.
- Preserve readable amount alignment and prevent critical financial values from clipping.

---

## 7. Theme tokens for shadcn/ui

Use semantic CSS variables so a theme adjustment does not require rewriting individual components. Merge these values into the generated `src/index.css` after shadcn/ui has been initialized. Retain the `@theme inline` mappings generated by shadcn/ui.

```css
:root {
  color-scheme: light;

  --background: oklch(0.985 0.005 180);
  --foreground: oklch(0.22 0.025 180);

  --card: oklch(1 0 0);
  --card-foreground: oklch(0.22 0.025 180);

  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.22 0.025 180);

  --primary: oklch(0.50 0.085 184);
  --primary-foreground: oklch(0.99 0 0);

  --secondary: oklch(0.95 0.012 175);
  --secondary-foreground: oklch(0.26 0.025 180);

  --muted: oklch(0.965 0.008 175);
  --muted-foreground: oklch(0.48 0.02 180);

  --accent: oklch(0.93 0.04 170);
  --accent-foreground: oklch(0.26 0.03 180);

  --destructive: oklch(0.50 0.16 28);
  --destructive-foreground: oklch(0.99 0 0);

  --border: oklch(0.90 0.012 175);
  --input: oklch(0.90 0.012 175);
  --ring: oklch(0.50 0.085 184);

  --radius: 0.75rem;
}

.dark {
  color-scheme: dark;

  --background: oklch(0.17 0.015 180);
  --foreground: oklch(0.95 0.01 175);

  --card: oklch(0.21 0.018 180);
  --card-foreground: oklch(0.95 0.01 175);

  --popover: oklch(0.21 0.018 180);
  --popover-foreground: oklch(0.95 0.01 175);

  --primary: oklch(0.78 0.12 174);
  --primary-foreground: oklch(0.19 0.02 180);

  --secondary: oklch(0.28 0.018 180);
  --secondary-foreground: oklch(0.95 0.01 175);

  --muted: oklch(0.25 0.016 180);
  --muted-foreground: oklch(0.72 0.02 175);

  --accent: oklch(0.30 0.05 174);
  --accent-foreground: oklch(0.96 0.01 175);

  --destructive: oklch(0.69 0.16 27);
  --destructive-foreground: oklch(0.19 0.02 180);

  --border: oklch(0.30 0.02 180);
  --input: oklch(0.30 0.02 180);
  --ring: oklch(0.75 0.10 174);
}
```

**Implementation note:** These are starter theme values. Validate rendered foreground/background contrast and interaction states before release, especially for muted text, button labels, borders, and semantic status colors.

---

## 8. Accessibility and interaction standards

Splitly handles financial information, so readability and error prevention are core requirements.

- Target WCAG AA contrast: **at least 4.5:1 for normal text** and **3:1 for large text**.
- Never communicate a balance, status, or error through color alone.
- Make keyboard focus clearly visible and preserve a logical tab order.
- Ensure all form controls have accessible names and associated labels.
- Validate fields close to where errors occur, using clear wording.
- Confirm consequential actions, such as deleting an expense or removing a group member.
- Respect `prefers-reduced-motion`; animation should be short and functional.
- Format each amount using the currency for the relevant expense or group instead of hardcoding a currency symbol throughout the interface.
- Check keyboard behavior for dialogs, menus, popovers, and other interactive components.

---

## 9. Frontend implementation rules

1. **Single source of truth:** colors, radii, spacing, and surfaces come from shared tokens rather than arbitrary per-component values.
2. **Composition over duplication:** compose Splitly-specific UI from shadcn/ui primitives.
3. **Consistent states:** define loading, disabled, focus, validation, success, and error states for components.
4. **Responsive by default:** design and test desktop, tablet, and mobile behavior.
5. **Data first:** make financial values, labels, ownership, and settlement status clear before adding decorative elements.
6. **Semantic HTML:** use elements appropriate to the action and content, and preserve keyboard access.
7. **No misleading financial signals:** owing money is a normal state, not a product error.
8. **Reusable formatting:** centralize currency and date formatting rather than repeating ad hoc string formatting.

---

## 10. Recommended implementation sequence

1. Add the color and typography tokens to `frontend/src/index.css` after initializing shadcn/ui.
2. Configure the default font and global layout styles.
3. Build a design-system preview page for buttons, fields, cards, balances, badges, and dark mode.
4. Verify contrast, responsive behavior, and keyboard navigation.
5. Build the authentication screens using the established components.
6. Connect authentication screens to the existing backend API.
7. Build the application shell, then groups, expenses, balances, and settlements.

---

## 11. Scope and status

This document defines the initial visual and interaction direction for Splitly. The palette, type scale, component measurements, and theme variables are **v1.0 design decisions to validate in the running application**. The design system does not yet include finalized logo artwork, a complete icon mapping, production-tested dark-mode contrast, or user-tested responsive layouts.
