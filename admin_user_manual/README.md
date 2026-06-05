# Admin User Manual

This guide explains how to use the fundraiser admin app from an organizer's perspective. It documents every major feature in the app as of the current codebase.

For a shorter Korean quick-start guide, see [`simple_manual/HOW_TO.ko.md`](simple_manual/HOW_TO.ko.md).

## Table of Contents

1. [What This App Does](#what-this-app-does)
2. [URLs and Pages](#urls-and-pages)
3. [Admin Flow Overview](#admin-flow-overview)
4. [Logging In and Out](#logging-in-and-out)
5. [Fundraisers List](#fundraisers-list)
6. [Creating a New Fundraiser](#creating-a-new-fundraiser)
7. [Editing Fundraiser Basics](#editing-fundraiser-basics)
8. [Fundraiser Status](#fundraiser-status)
9. [Public Links](#public-links)
10. [Menu Items](#menu-items)
11. [Order Form Fields](#order-form-fields)
12. [Collaborators](#collaborators)
13. [Public Pre-Order Form](#public-pre-order-form)
14. [Public On-Site Form (현장주문)](#public-on-site-form-현장주문)
15. [Order Confirmation Page](#order-confirmation-page)
16. [Orders Management](#orders-management)
17. [Order Detail Page](#order-detail-page)
18. [Public Orders Page (Share Link)](#public-orders-page-share-link)
19. [Recommended Admin Workflow](#recommended-admin-workflow)
20. [Tips and Best Practices](#tips-and-best-practices)
21. [Troubleshooting](#troubleshooting)

---

## What This App Does

The app lets church or event admins create and manage public order forms for fundraisers.

Admins can:

- sign in with a magic link (no password)
- create and manage multiple fundraisers
- configure title, description, hero image, e-transfer email, and custom messages
- add menu items with pricing, quantity caps, images, and display order
- add custom form fields to collect buyer information
- publish **pre-order** and **on-site (현장주문)** links separately
- control ordering with four statuses: Draft, Published, On-site, and Closed
- invite collaborators to help manage a fundraiser
- review orders in a spreadsheet view with filters, sorting, and revenue summaries
- mark orders as paid
- delete incorrect orders
- export orders to CSV
- share a read-only public orders page with people who do not need admin access

Buyers (no login required) can:

- submit pre-orders through the public form
- submit on-site orders through the 현장주문 form
- see an order confirmation page after submitting

---

## URLs and Pages

| URL | Who | Purpose |
|-----|-----|---------|
| `/` | Anyone | Landing page with login button |
| `/login` | Admin | Magic-link sign-in |
| `/admin/fundraisers` | Admin | Fundraiser list |
| `/admin/fundraisers/[id]` | Admin | Fundraiser editor |
| `/admin/fundraisers/[id]/orders` | Admin | Orders spreadsheet |
| `/admin/fundraisers/[id]/orders/[orderId]` | Admin | Order detail |
| `/f/[publicId]` | Public | Pre-order form |
| `/f/[publicId]/onsite` | Public | On-site order form |
| `/f/[publicId]/confirmation/[orderId]` | Public | Post-submit confirmation |
| `/f/[publicId]/orders` | Public | Read-only orders report (share link) |

All `/admin/*` routes require login. Public `/f/*` routes do not.

---

## Admin Flow Overview

A typical workflow:

1. Log in via magic link.
2. Create a new fundraiser.
3. Fill in basics (title, description, e-transfer email, images, messages).
4. Add menu items and form fields.
5. Test links while still in `Draft` is not possible publicly — switch to `Published` first (or test after publishing).
6. Set status to `Published` and share the pre-order link.
7. Monitor orders from the orders page; mark paid as payments arrive.
8. On event day, switch to `On-site` and share the 현장주문 link.
9. Share the orders report link if others need visibility without admin access.
10. Add collaborators if needed.
11. Set status to `Closed` when finished.

---

## Logging In and Out

### Sign in

1. Go to the app homepage and click **로그인**.
2. Enter your email address.
3. Click **Send magic link**.
4. Check your inbox and click the link in the email.
5. You are redirected to `/admin/fundraisers` (or the page you were trying to open).

There is no password. Each sign-in uses a one-time email link.

If sign-in fails, you may see **Sign-in failed. Try again.** on the login page.

### Admin header

While logged in, the admin header shows:

- app title (큰빛 다운타운 선교 펀드레이징)
- your email address
- **Sign out** button

### Sign out

Click **Sign out** in the admin header to end your session.

---

## Fundraisers List

The **Your fundraisers** page shows:

- fundraisers you own
- fundraisers shared with you (marked **(shared)**)
- each fundraiser's status badge (Draft, Published, On-site, Closed)
- order count per fundraiser

Fundraisers are sorted by most recently updated.

From this page you can:

- click **New fundraiser** to create one
- click a fundraiser row to open its editor

If the list fails to load, an error box appears with setup hints (environment variables, migrations, Supabase schema exposure).

There is no delete-fundraiser button in the UI.

---

## Creating a New Fundraiser

Click **New fundraiser**.

The app immediately creates a fundraiser with:

- title: `Untitled fundraiser`
- status: `Draft`

You are redirected to the editor page.

---

## Editing Fundraiser Basics

The **Basics** section at the top of the editor configures core settings.

Most fields **auto-save when you leave the field** (on blur). Status changes save immediately when you pick a new value from the dropdown.

### Title

Shown in the admin area and on public order pages.

### Description

Shown at the top of the **pre-order** public form only. Not shown on the on-site form.

Use it for fundraiser purpose, pickup instructions, and important notes.

### E-transfer email

If any menu item has a price, this email is shown on the pre-order form near the total so buyers know where to send payment.

On the pre-order form the app displays Korean copy: **"{email}으로 e-transfer 부탁드립니다!"**

### Hero image

Upload a main image for the fundraiser. Shown at the top of the **pre-order** form only (not on the on-site form).

Images are stored in Supabase storage (`fundraiser-assets`).

### Status

See [Fundraiser Status](#fundraiser-status) below.

### Message when closed

Shown on the **pre-order** form when ordering is closed (status `on_site` or `closed` for that link).

Use it for end-of-ordering notices, pickup details, or thank-you messages.

If left blank on a closed pre-order page, a default English message is shown: *"This order form is no longer accepting responses."*

### Order confirmation text

Optional message shown at the top of the **order confirmation page** after a buyer submits (under **⚠️ 안내 ⚠️**).

Use it for payment reminders, pickup instructions, or next steps.

---

## Fundraiser Status

Each fundraiser has **four** statuses:

| Status | Label in UI | Meaning |
|--------|-------------|---------|
| `draft` | Draft (not public) | Not visible to the public |
| `published` | Published (pre-order and on-site open) | Both links accept orders |
| `on_site` | On-site (pre-order closed, on-site open) | Pre-order link closed; 현장주문 link open |
| `closed` | Closed (read-only public page) | No new orders on either link |

### What each link does per status

| Status | Pre-order `/f/...` | On-site `/f/.../onsite` | Public orders `/f/.../orders` |
|--------|-------------------|-------------------------|-------------------------------|
| Draft | **404** (not found) | **404** | **404** |
| Published | Open | Open | Visible |
| On-site | Closed (shows closed message) | Open | Visible |
| Closed | Closed (shows closed message) | Closed (fixed Korean message) | Visible |

### When to use each status

- **Draft** — building and testing in the admin editor only.
- **Published** — accepting pre-orders and on-site orders.
- **On-site** — event day: stop pre-orders but keep 현장주문 open.
- **Closed** — ordering finished; pages stay visible as read-only.

The editor shows a hint under the closed message field explaining how Published, On-site, and Closed affect the two order links.

---

## Public Links

At the top of the fundraiser editor:

| Button | Copies |
|--------|--------|
| **Copy public link** | Pre-order form URL: `/f/{publicId}` |
| **Copy 현장주문 link** | On-site form URL: `/f/{publicId}/onsite` |
| **View orders →** | Opens the admin orders page |

If clipboard copy fails, the URL may appear in a message banner on the page instead.

### Important notes

- Links copied while in **Draft** will not work for the public (404) until the fundraiser is at least **Published**, **On-site**, or **Closed**.
- **Closed** fundraisers still have working public URLs, but forms do not accept submissions.
- Collaborators can copy and share these links the same as the owner.

---

## Menu Items

In the **Items** section, click **Add item** to create a menu item (default name: `New item`).

### Fields per item

| Field | Description |
|-------|-------------|
| **Name** | Label buyers see |
| **Unit label** | Optional unit (e.g. `box`, `jar`) — shown with price and remaining stock |
| **Description** | Optional detail text on the public form |
| **Quantity cap** | Max total units sold; blank = unlimited |
| **Price (CAD)** | Optional; blank items can be ordered but do not add to the total |
| **Active on public form** | Uncheck to hide from new orders while keeping history on old orders |
| **Item image** | Optional image beside the item on the public form |

### Stock and sold-out behavior

- Remaining stock = quantity cap minus all orders already placed (across pre-order and on-site).
- On the **pre-order** form, sold-out items stay visible but grayed out with **Sold out**.
- On the **on-site** form, sold-out items are **hidden** entirely.
- If stock changes while someone is ordering, submit may fail with a message to refresh and try again.

### Reordering items

Use **Up** and **Down** on each item row. The public form follows this order.

### Removing items

**Remove Menu Item** permanently deletes the item.

Prefer unchecking **Active on public form** once real orders exist, rather than deleting.

---

## Order Form Fields

In **Order form fields**, click **Add field** to create a buyer input.

These fields appear in the **Your details** section of the **pre-order** form only. The on-site form does **not** use custom fields (only a required **Name** field).

### Fields per form field

| Setting | Description |
|---------|-------------|
| **Label** | Text shown to buyers |
| **Key (CSV column)** | Internal storage key; spaces become `_` on save. Used in orders spreadsheet and CSV export. |
| **Type** | `text`, `email`, `phone`, `textarea` (Paragraph), or `select` (Dropdown) |
| **Required** | Buyer must fill before submitting |
| **Options** | For select fields: one option per line |

New fields get an auto-generated key from the label (with deduplication like `key_1` if needed).

### Field order

Fields are ordered by `sort_order` at creation time. There is **no Up/Down reorder UI** for fields in the editor — only menu items can be reordered with buttons.

### Removing fields

Click **Remove field** to delete a field. Avoid major changes after many orders are collected.

### Service number filter

If you add a field with key `service_no`, the orders page **Service no** filter will work against that response.

---

## Collaborators

The **Collaborators** section lets the **owner** invite other admins by email.

### Adding a collaborator

1. Enter their email.
2. Click **Add**.

They must already have an account (have signed in at least once). Otherwise you see: *"No account with that email. They must sign up once before you can add them."*

### What collaborators can do

| Action | Owner | Collaborator |
|--------|-------|--------------|
| Edit basics, items, fields | ✓ | ✓ |
| View and manage orders (paid, delete) | ✓ | ✓ |
| Copy public / on-site links | ✓ | ✓ |
| Add or remove collaborators | ✓ | ✗ |

Shared fundraisers appear in the collaborator's list with **(shared)**.

### Removing collaborators

Only the owner can remove a collaborator from the same section.

---

## Public Pre-Order Form

URL: `/f/{publicId}`

When open (status `published`, or `on_site`/`closed` for read-only closed view):

**Header**

- Hero image (if set)
- Title
- Description

**Items**

- Grid of active items with images, descriptions, prices, and remaining stock (`N {unit} 남음` or **Unlimited**)
- +/- quantity controls
- Sold-out items shown grayed out

**Your details**

- All configured form fields

**Payment bar** (if any item has a price)

- E-transfer email with Korean prompt
- Running total in CAD

**Submit**

- Button: **Submit order**
- Double-submit protection via an idempotency key (accidental double-click returns the same order)

### Submit errors buyers may see

| Situation | Message |
|-----------|---------|
| Sold out / stock changed | Refresh and try again |
| Missing required field | Fill in all required fields |
| No items selected | Select at least one item with a quantity |
| Other errors | Generic or server message |

---

## Public On-Site Form (현장주문)

URL: `/f/{publicId}/onsite`

Designed for quick orders at an event. Differences from pre-order:

| Feature | Pre-order | On-site |
|---------|-----------|---------|
| Hero image | Shown | Not shown |
| Description | Shown | Not shown |
| Custom form fields | All configured fields | **Name only** (required) |
| Sold-out items | Grayed out | **Hidden** |
| E-transfer prompt in footer | Shown | Not shown (total still shown if priced) |
| Heading | Title | Title + **현장주문** |

Submissions are stored with the buyer's name in the `name` response field.

### When on-site is closed

If the on-site form is not accepting orders (`closed` status, or pre-order-only closed states), a **fixed Korean/Lao message** is shown (not the admin "Message when closed" field). This message is hardcoded in the app for the on-site closed state.

---

## Order Confirmation Page

URL: `/f/{publicId}/confirmation/{orderId}`

After a successful submit, buyers are redirected here.

The page shows:

1. **⚠️ 안내 ⚠️** — your **Order confirmation text** from the editor (if set)
2. Fundraiser title and **Order Confirmation** heading
3. Buyer name (if provided — always for on-site orders)
4. **Total Price** (large)
5. **Order Summary** — line items with quantities, unit labels, and line totals

There is currently no prominent order ID displayed to buyers and no "back to form" button on this page.

---

## Orders Management

Open from **View orders →** on the fundraiser editor.

### Spreadsheet view

Each row is one order. Columns include:

- **Submitted** — timestamp (sortable)
- **Order** — short order ID link to detail page (sortable)
- **Paid** — checkbox (admin only; sortable)
- **Total (CAD)** (sortable)
- One column per form field key (sortable)
- **Ordered items** — summary text (sortable)
- One column per menu item quantity (sortable)

Click column headers to sort ascending/descending.

### Paid tracking

Check **Paid** in the spreadsheet or on the order detail page. Changes save immediately and persist after refresh.

The public share page shows paid status as read-only (checkmark or empty), not editable.

### Filters

- **Menu item** — show only orders containing that item; narrows visible item columns too
- **Service no** — filter by `service_no` form response (requires a field with that key)

### CSV export

**Download CSV** exports the **currently filtered** spreadsheet.

Columns: `submitted_at`, `order_id`, `total_cad`, all field keys, `ordered_items`, and per-item quantity columns.

**Paid status is not included** in the CSV.

The public orders page also has **Download CSV** with the same format (read-only view).

### Shareable orders link

**Copy share link** copies `/f/{publicId}/orders`.

Anyone with the link can view orders **without logging in**. They can:

- see the spreadsheet and revenue summary
- use filters and sorting
- download CSV

They **cannot**:

- edit paid status
- delete orders
- change fundraiser settings
- open admin order detail pages (order IDs are not links on the public page)

Only share this link with people you trust, since it exposes buyer form responses.

### Revenue summary

Below the spreadsheet, a table shows per-menu-item quantity sold, revenue, and a **Total** row.

---

## Order Detail Page

Click an order ID in the admin spreadsheet.

Shows:

- order ID, submission time, total (CAD), paid status
- all form responses
- line items with names and quantities

Actions:

- toggle **Paid**
- **Remove order** — asks for confirmation; cannot be undone

After deletion, the order disappears from the list and revenue totals.

---

## Public Orders Page (Share Link)

URL: `/f/{publicId}/orders`

Same layout as the admin orders report but:

- read-only paid column
- order IDs are not clickable links
- no **Copy share link** button
- **← Back to fundraiser** returns to the pre-order form

Available when status is `published`, `on_site`, or `closed` (not `draft`).

---

## Recommended Admin Workflow

1. Create the fundraiser.
2. Set title, description, e-transfer email, hero image.
3. Add menu items (prices, caps, images) and form fields (e.g. name, phone, `service_no`).
4. Set **Order confirmation text** if buyers need post-submit instructions.
5. Set status to **Published**.
6. Test the pre-order link yourself.
7. Share **Copy public link** with buyers.
8. Monitor **View orders**; mark **Paid** as payments arrive.
9. On event day, set **On-site** and share **Copy 현장주문 link**.
10. Use **Copy share link** on the orders page if others need read-only visibility.
11. Set **Closed** when ordering ends; set **Message when closed** for visitors.

---

## Tips and Best Practices

- Stay in **Draft** while building; remember public links **404** until published.
- Test both pre-order and on-site links after changing status.
- Use key `service_no` for service-number filtering in orders.
- Prefer deactivating items over deleting once orders exist.
- Confirm collaborators have logged in once before adding them.
- Treat the public orders share link as sensitive (buyer PII in form responses).
- Use **On-site** status to close pre-orders while keeping 현장주문 open.
- Set **Order confirmation text** for payment or pickup instructions buyers see immediately after ordering.

---

## Troubleshooting

### Collaborator cannot be added

- They have never signed in to this app
- Email does not match their account
- They already own the fundraiser

### Public link shows "not found" (404)

- Fundraiser is still **Draft** — publish first
- Wrong or outdated URL

### Pre-order form not accepting orders

| Status | Pre-order behavior |
|--------|-------------------|
| Draft | Not public (404) |
| Published | Accepts orders |
| On-site | Closed (shows closed message) |
| Closed | Closed (shows closed message) |

### On-site form not accepting orders

| Status | On-site behavior |
|--------|------------------|
| Draft | Not public (404) |
| Published | Accepts orders |
| On-site | Accepts orders |
| Closed | Closed (fixed Korean message) |

### Buyer sees "sold out" or stock error on submit

Stock was taken by another order. Refresh the page and try again.

### Service no filter is empty

Add a form field with key exactly `service_no`.

### Paid checkbox does not stay checked

In hosted environments, confirm the latest database migrations are applied.

### Fundraiser list will not load

Check `.env.local`, run migrations, and expose the `fundraiser_app` schema in Supabase API settings (see error message on the page).

---

## Summary

This app supports the full fundraiser admin lifecycle:

- build the fundraiser and menu
- publish pre-order and on-site forms
- collaborate with other admins
- track orders, payments, and revenue
- share read-only order reports
- close ordering when complete
