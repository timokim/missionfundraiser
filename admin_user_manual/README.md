# Admin User Manual

This guide explains how to use the fundraiser admin app from an organizer's perspective.

It covers:

- logging in
- creating a fundraiser
- setting up the public order form
- adding menu items
- adding form fields
- publishing and sharing links
- adding collaborators
- reviewing and managing orders

## What This App Does

The app lets church or event admins create a public order form for a fundraiser.

Admins can:

- create and manage multiple fundraisers
- configure public fundraiser details such as title, description, hero image, and payment email
- add menu items with pricing, stock caps, and images
- add custom form fields to collect buyer information
- publish a public order form link
- close a fundraiser while keeping the public page visible in read-only mode
- invite collaborators to help manage the fundraiser
- review submitted orders in spreadsheet and detail views
- mark orders as paid
- delete orders when needed

## Admin Flow Overview

The typical workflow is:

1. Log in.
2. Create a new fundraiser.
3. Fill in the fundraiser basics.
4. Add menu items.
5. Add custom order form fields.
6. Set the fundraiser status to `Published`.
7. Copy and share the public order form link.
8. Monitor incoming orders from the orders page.
9. Mark orders as paid and remove incorrect orders if necessary.
10. Add collaborators if others need to help manage the fundraiser.
11. When the fundraiser is finished, set it to `Closed`.

## Logging In

Go to the app homepage and click `로그인`.

After login:

- you will be taken to `/admin/fundraisers`
- if you already have fundraisers, you will see them listed there
- if you have been added as a collaborator on someone else's fundraiser, shared fundraisers will appear in the same list with a `(shared)` label

## Fundraisers List

The `Your fundraisers` page shows:

- all fundraisers you own
- all fundraisers shared with you
- each fundraiser's current status
- the current order count

From this page you can:

- click `New fundraiser` to create a new fundraiser
- click an existing fundraiser to open its editor

## Creating a New Fundraiser

Click `New fundraiser`.

The app creates a new fundraiser immediately with default values:

- title: `Untitled fundraiser`
- status: `Draft`

You will be redirected straight to that fundraiser's editor page.

## Editing Fundraiser Basics

At the top of the fundraiser editor, you can configure the core fundraiser settings.

### Title

Use this for the fundraiser name shown:

- in the admin area
- on the public form page

### Description

This appears near the top of the public fundraiser page. Use it for:

- fundraiser purpose
- pickup or delivery instructions
- important notes for buyers

### E-transfer Email

If menu items have prices, this email is shown near the total on the public order form so buyers know where to send payment.

### Hero Image

You can upload a main image for the fundraiser. This is shown at the top of the public page.

### Status

Each fundraiser has three states:

- `Draft`: not public
- `Published`: public and accepting orders
- `Closed`: public page stays visible, but no new orders can be submitted

### Closed Message

When the fundraiser is `Closed`, visitors still see the page title, image, and description, but they cannot order.

Use the closed message to explain:

- that ordering has ended
- pickup details
- thank-you notes

## Public Link and Orders Link

At the top of the fundraiser editor you will see:

- `View orders`
- `Copy public link`

### Copy Public Link

This copies the public customer-facing order form URL.

Use this link when you want buyers to:

- browse menu items
- fill out the form
- submit an order

Important:

- the public link only works when the fundraiser is `Published` or `Closed`
- `Draft` fundraisers are not intended for public access

### View Orders

This opens the admin orders page for that fundraiser.

## Adding and Managing Menu Items

In the `Items` section, click `Add item` to create a new menu item.

Each item supports the following fields.

### Name

The item name buyers will see.

Examples:

- Kimchi
- Mandu
- Cookie box

### Unit Label

Optional text describing the unit.

Examples:

- `box`
- `jar`
- `plate`

This may appear next to price and inventory information.

### Description

Optional supporting text shown to buyers.

Use it for:

- flavor or size details
- ingredients
- pickup notes

### Quantity Cap

If left blank, the item is unlimited.

If a number is entered, the app limits how many total units can be sold for that item.

This is useful when:

- you only have limited stock
- you only want to accept a fixed number of preorders

### Price (CAD)

Optional item price in Canadian dollars.

If price is blank:

- the item can still be ordered
- it will not contribute to the order total

If price is set:

- the public form calculates order totals automatically
- the public page shows the payment email and total amount

### Active on Public Form

If checked:

- the item appears on the public form

If unchecked:

- the item is hidden from new public submissions
- old orders still keep their historical line items

This is useful when an item is no longer available but you do not want to delete its order history.

### Item Image

Optional image shown on the public form next to the item.

### Ordering Menu Items

Use the `Up` and `Down` buttons to reorder items.

The public form follows this order.

### Removing a Menu Item

Use `Remove Menu Item` if you want to delete it entirely.

Be careful:

- deleting is stronger than deactivating
- if you just want to stop accepting new orders for an item, it is usually safer to turn off `Active on public form`

## Adding and Managing Custom Order Form Fields

In the `Order form fields` section, click `Add field` to create fields that buyers must fill out.

These fields appear in the `Your details` section of the public order form.

Each field supports:

- label
- internal key
- field type
- options for select fields
- required or optional
- ordering

### Common Use Cases

Typical fields include:

- name
- phone number
- email
- service number
- pickup notes

### Supported Field Types

The app supports:

- `text`
- `email`
- `phone`
- `textarea`
- `select`

### Required Fields

If marked required, the buyer must fill in the field before submitting.

### Select Fields

If the field type is `select`, you can define a list of allowed options.

This is useful for:

- service numbers
- pickup times
- team or group names

### Field Keys

Each field has an internal key used in stored order data.

Keep keys stable after you start accepting orders, especially for fields you want to filter on later.

For example:

- a field with key `service_no` can be used conveniently in the orders spreadsheet filter

### Reordering and Removing Fields

You can reorder fields and remove them as needed.

As with items, avoid making major structural changes after many orders have already been collected unless necessary.

## Adding Collaborators

The `Collaborators` section lets the fundraiser owner invite other admins.

### Who Can Add Collaborators

Only the owner of the fundraiser can add or remove collaborators.

### How to Add a Collaborator

Enter the collaborator's email address and click `Add`.

Important:

- the person must already have an account in this app
- if they have never logged in before, they must sign up or log in once first

### What Collaborators Can Do

Collaborators can:

- open the fundraiser in their admin list
- edit fundraiser settings
- manage items
- manage form fields
- view and manage orders

### Removing Collaborators

The owner can remove collaborators at any time from the same section.

## Public Order Form Experience

When a fundraiser is `Published`, the public link shows:

- fundraiser title
- hero image
- description
- available menu items
- custom form fields
- calculated total
- e-transfer email if priced items exist

Buyers can:

- adjust quantities for each menu item
- fill out the form
- submit an order

After submission, they receive:

- a thank-you confirmation
- an order reference ID
- the final total

## Closing a Fundraiser

When you switch a fundraiser to `Closed`:

- the public page is still accessible
- buyers can no longer submit orders
- the closed message is shown instead of the order form

This is the best option when:

- ordering has ended
- you still want people to see the page
- you want to keep historical context available

## Orders Management

Open the orders page by clicking `View orders` from the fundraiser editor.

This page provides a spreadsheet-style view of submitted orders.

### Main Spreadsheet View

Each row represents one order.

The spreadsheet includes:

- submitted timestamp
- order ID
- paid checkbox
- total amount
- form field responses
- item quantities

### Paid Tracking

The `Paid` column lets admins track whether payment has been received.

When you check an order as paid:

- the change is saved
- it remains checked after refresh
- the same paid state appears on the order detail page

### Filters

The orders page supports filters for:

- `Menu item`
- `Service no`

Menu item filtering can narrow both:

- the visible rows
- the visible item columns

Service number filtering works when your form includes a field whose key is `service_no`.

### CSV Download

The orders page includes a `Download CSV` button.

Use it to export the current spreadsheet view.

### Shareable Orders Link

The admin orders page includes `Copy share link`.

This produces a public read-only orders page that can be opened without logging in.

Use it when you need to share order visibility with people who should not have full admin access.

### Aggregated Revenue Summary

Below the spreadsheet, the orders page also shows a summary table that includes:

- each menu item
- quantity sold
- revenue generated per item
- total revenue at the bottom

## Order Detail Page

Click an order ID in the spreadsheet to open its detail page.

The order detail page shows:

- order ID
- submission time
- total amount
- paid status
- full form responses
- line items and quantities

From the detail page you can:

- mark the order as paid or unpaid
- remove the order

## Removing an Order

An order can be removed from the order detail page.

Use this carefully for situations such as:

- duplicate orders
- test submissions
- accidental submissions

Once removed:

- it disappears from the orders spreadsheet
- it is no longer included in totals and summaries

## Recommended Admin Workflow

For a typical fundraiser, a good process is:

1. Create the fundraiser.
2. Set title, description, and e-transfer email.
3. Upload a hero image.
4. Add menu items with prices and quantity caps.
5. Add buyer fields such as name, phone, and `service_no`.
6. Review the public form using the copied public link.
7. Change status to `Published`.
8. Share the public link with buyers.
9. Watch incoming orders from the orders page.
10. Mark orders as paid as payments arrive.
11. Use filters and summaries to track sales.
12. Add collaborators if other admins need access.
13. Change the fundraiser to `Closed` when ordering ends.

## Tips and Best Practices

- Use `Draft` while building the fundraiser.
- Only switch to `Published` when the form is ready.
- Use a consistent field key such as `service_no` if you want service number filtering in orders.
- Prefer deactivating items instead of deleting them once real orders have started coming in.
- Test the public link yourself before sharing it widely.
- Use the shareable public orders page if leadership needs visibility without admin login access.
- Add collaborators only after confirming they have logged into the app at least once.

## Troubleshooting

### A collaborator cannot be added

Possible reasons:

- they have never created or accessed an account in the app
- the email address does not match their app account
- they already own the fundraiser

### Public page is not accepting orders

Check the fundraiser status:

- `Draft` is not for public use
- `Closed` shows a read-only closed page
- `Published` is the status that accepts orders

### Service number filter does not show anything

Check whether your form has a field with the key `service_no`.

The orders filter relies on that stored response key.

### Paid checkbox does not stay checked

If this happens in a hosted environment, confirm the latest database migrations have been applied.

## Summary

This app is designed to support the full admin workflow for fundraiser ordering:

- build the fundraiser
- publish the public form
- collaborate with other admins
- track incoming orders
- track payments
- close the fundraiser when ordering is complete
