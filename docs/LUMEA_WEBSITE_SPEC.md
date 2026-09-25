# Luméa Flower Studio — Website Product Specification

**Status:** Foundation specification  
**Scope:** V1 public website and administration experience  
**Audience:** Product owner, designer, developers, reviewers, and future operators  
**Working name:** Luméa Flower Studio  
**Tagline:** “Hoa cho những điều khó nói thành lời.”

## 1. Context and positioning

Luméa Flower Studio is a boutique florist positioned in the mid-to-near-premium segment. The website must feel romantic, editorial, botanical, elegant, warm, refined, and handmade while remaining approachable.

The experience must not feel excessively cute, intimidatingly luxurious, like a SaaS product, or like a generic AI-generated template. Glassmorphism, neon treatments, and decorative effects that compete with the flowers are outside the visual direction.

The site is both a product discovery experience and a practical ordering tool. It should help a customer move from an emotional intent—celebrating, comforting, apologizing, or expressing affection—to a confident order with as little friction as possible.

## 2. Product principles

1. **Start from customer intent.** Occasion, budget, urgency, and recipient matter more than botanical expertise.
2. **Show enough to decide.** Product photography, price, availability, size, and tone must be clear before checkout.
3. **Offer guided choices.** Florist's Choice and Custom Bouquet support customers who cannot find or do not want to choose a fixed design.
4. **Protect the emotional moment.** Copy, delivery expectations, surprise-gift handling, and order confirmation must be calm and trustworthy.
5. **Keep business content editable.** Content that changes with operations belongs in Admin, not in frontend source code.
6. **Prefer clarity over decoration.** Photography and typography lead; interface chrome stays quiet.

## 3. Brand and visual system

### 3.1 Brand feeling

- Romantic, never overly sweet.
- Editorial, with deliberate composition rather than catalog-grid sameness.
- Botanical and handmade, with natural variation acknowledged.
- Elegant and refined, without exclusivity or intimidation.
- Warm and human in both copy and service cues.

### 3.2 Color palette

| Token | Value | Intended role |
|---|---:|---|
| Ivory | `#F7F3ED` | Primary page background |
| Rose Dust | `#C9959D` | Soft accents, selected states, supporting surfaces |
| Sage | `#A8B19A` | Botanical accent, status/supporting surfaces |
| Burgundy | `#70444C` | Primary actions and strong editorial accents |
| Charcoal | `#332F2D` | Primary text and high-contrast UI |
| White | `#FFFFFF` | Cards, contrast surfaces, image breathing room |

All final foreground/background combinations must meet the accessibility contrast requirements in section 16. Color must not be the only way a state or error is communicated.

### 3.3 Typography

- **Headings:** Cormorant Garamond or Fraunces.
- **Body and UI:** Inter or DM Sans.
- Use large serif type for emotional statements and editorial hierarchy.
- Use the sans-serif family for long-form reading, prices, inputs, labels, buttons, and operational information.
- Final font selection must account for Vietnamese glyph quality, loading performance, and consistent numeral display.

### 3.4 Photography and composition

- Use editorial florist photography with flowers as the main visual language.
- Favor asymmetric compositions, generous whitespace, close botanical details, and a mix of product and in-context imagery.
- Product images must still show the bouquet clearly enough for purchase decisions.
- Avoid repetitive stock-photo styling, heavy overlays, synthetic-looking imagery, and visual effects that reduce flower color accuracy.

## 4. Users and needs

### 4.1 Primary users

1. A customer buying birthday flowers.
2. A customer marking love, an anniversary, or another intimate moment.
3. A customer sending congratulations for graduation, an opening, or an achievement.
4. A customer who needs eligible flowers delivered the same day.
5. A customer who does not know what to choose and wants the florist to advise or design for them.

### 4.2 Shared user needs

- Understand quickly whether Luméa serves their occasion, budget, location, and date.
- Browse without knowing flower names.
- See representative images and a clear price before committing.
- Choose a useful level of customization without decision overload.
- Distinguish product availability from same-day eligibility.
- Send flowers to another person and preserve a surprise when requested.
- Know what happens after a bank transfer or cash order.
- Reach a florist quickly when the fixed catalog is not enough.

## 5. Goals and success signals

### 5.1 Primary goal

Convert a person looking for flowers into a completed order with the least practical and emotional friction possible.

### 5.2 Supporting goals

- Make occasion, budget, and same-day routes visible from Home.
- Give uncertain customers a confident path through Florist's Choice.
- Capture qualified custom requests with the information the florist needs.
- Set accurate fulfillment and payment expectations.
- Let staff update business content without engineering work or redeployment.

### 5.3 Initial success signals

Specific numeric targets require owner baselines. V1 should at minimum be able to observe:

- Product-view to add-to-cart progression.
- Checkout completion and abandonment by step.
- Usage and completion of Florist's Choice.
- Custom request submissions.
- Same-day entry and successful eligible orders.
- Contact actions from high-intent pages.
- Operational errors caused by invalid dates, zones, payment details, or unavailable products.

No complex analytics platform is required in V1.

## 6. Information architecture

### 6.1 Public sitemap

- Home
- Flowers
  - Birthday
  - Love & Anniversary
  - Congratulations
  - Graduation
  - Opening Ceremony
  - Sympathy
- Product Detail
- Custom Bouquet
- Same-day Delivery
- About
- Contact
- Cart
- Checkout
- Order Success

Occasion pages may be filtered catalog views, but each must have a stable, shareable URL and appropriate editorial context.

### 6.2 Admin sitemap

- Dashboard
- Products
- Categories
- Occasions
- Custom Requests
- Orders
- Homepage
- Delivery Settings
- Site Settings
- Payment Settings

## 7. Core user journeys

### 7.1 Shop by occasion

Home or navigation → choose occasion → browse relevant available products → open product → choose size and tone → add card and fulfillment preferences → cart → checkout → order success.

The customer must never need to understand category taxonomy to complete this path.

### 7.2 Shop by budget

Home → choose an Admin-managed budget range → see matching available products → refine if needed → product → cart → checkout.

Displayed prices and selected size pricing must make it obvious why a product does or does not fit the chosen range.

### 7.3 Same-day delivery

Home or navigation → Same-day Delivery → see current availability, cut-off, service area, and eligible products → choose an allowed delivery window → checkout → order success.

If same-day service is unavailable, the page must say so clearly and offer the nearest viable next action, such as another date or florist contact.

### 7.4 Florist's Choice

Entry point → choose budget → choose tone → choose occasion → provide message and fulfillment details as applicable → add to cart → checkout.

The customer delegates floral selection to Luméa. The flow must not ask them to choose individual flower varieties.

### 7.5 Custom Bouquet

Custom Bouquet → provide brief and optional reference image → submit → receive clear confirmation that the request is pending and is not yet a confirmed order.

### 7.6 Gift checkout

Cart → identify buyer → identify recipient → optionally mark as a surprise → choose delivery → confirm date/window/address/fee → choose payment → place order → follow order-success instructions.

## 8. Homepage storyboard

The homepage tells a sequence: emotional promise → relevant way to shop → confidence from popular choices → price fit → urgency support → expert delegation → custom service → trust → visual proof → human contact.

| Order | Section | Purpose and primary behavior |
|---:|---|---|
| 1 | Hero | Establish the brand promise with the heading “Hoa cho những điều khó nói thành lời.” CTAs: **Xem bộ sưu tập** and **Đặt hoa theo yêu cầu**. |
| 2 | Shop by Occasion | Route users into the six occasion collections using imagery and plain labels. |
| 3 | Best Sellers | Show a concise, curated set of available bestsellers with image, name, starting/current price, and availability. |
| 4 | Shop by Budget | Provide Admin-managed price ranges that lead to filtered results. |
| 5 | Same-day Delivery | Explain current eligibility, cut-off, and area at a glance; lead to the same-day page. |
| 6 | Florist's Choice | Present the low-friction budget → tone → occasion flow and explain that the florist chooses the flowers. |
| 7 | Custom Bouquet | Position bespoke requests for needs not met by the catalog; lead to the request form. |
| 8 | Why Luméa | Build trust through a small number of owner-approved service promises, not generic marketing claims. |
| 9 | Instagram / Gallery | Show recent editorial work and social proof. Images and links are Admin-managed. |
| 10 | Visit Luméa / Contact / Google Maps | Make address, hours, phone, messaging/contact action, social link, and map easy to use. |

Every homepage section, including text, media, links, display order, visibility, and featured items, must be Admin-managed where business-mutable.

## 9. Public page requirements

### 9.1 Home

- Follow the storyboard in section 8.
- Preserve a clear primary route to the collection and a secondary route to Custom Bouquet.
- Do not overload the hero with operational detail; surface urgent same-day status in a clear but secondary way.

### 9.2 Flowers and occasion listings

- Show only active products appropriate to the current collection.
- Support useful discovery by occasion, budget, availability, same-day eligibility, and tone where data permits.
- Each card shows an image, name, price or honest “from” price, and meaningful availability state.
- Empty states explain why nothing is shown and offer a relevant alternative: another date, Florist's Choice, Custom Bouquet, or contact.
- Listing filters must remain usable on mobile and must not erase a user's context unexpectedly.

### 9.3 Product Detail

- Show product name, image gallery, description, price behavior, availability, and seasonal expectations.
- Let the customer select size and tone from valid options.
- Accept a card message, delivery date, and preferred delivery window.
- Clearly identify same-day eligibility without implying that same-day delivery is guaranteed before the address, cut-off, capacity, and date are validated.
- Explain that handmade floral work and seasonal materials may create natural variation; the owner must approve final substitution language.
- Prevent unavailable or inactive products from being added to cart.
- Preserve selections and show validation errors next to the relevant field.

### 9.4 Custom Bouquet

- Explain the difference between a custom request and a confirmed order.
- Form fields: Occasion, Budget, Color tone, Preferred flowers, Flowers to avoid, Delivery date, Message/note, and optional reference image.
- On submission, create a `CUSTOM REQUEST` with initial status `PENDING` and make it visible in Admin.
- Confirmation must state the expected next step and response channel once the owner defines them.
- Validate uploaded file type and size and handle it as untrusted content.

Future direction, not implemented by the current homepage migration: a separate Create Your Bouquet experience may let customers choose individual flowers and quantities, select wrapping, preview the composition, see the updated price, and add the completed configuration to cart. It does not replace the florist-led Custom Bouquet request unless the owner later approves that product decision.

### 9.5 Same-day Delivery

- Display current Admin-controlled availability, cut-off time, delivery help text, service constraints, and eligible products.
- Re-evaluate eligibility at checkout; a page badge alone must not guarantee fulfillment.
- When unavailable, keep contact and next-date options accessible.

### 9.6 About

- Tell the studio story, floral philosophy, and handmade approach with owner-managed copy and imagery.
- Keep commercial next steps visible without turning the page into another product grid.

### 9.7 Contact

- Present Admin-managed address, phone, email, opening hours, social channels, and Google Maps location/embed.
- Phone, email, map, and supported messaging actions must be actionable on mobile.
- State expected response timing only when the owner has supplied an operational commitment.

### 9.8 Cart

- Show each item with image, selected size, tone, price, quantity if supported, card message, delivery date, and preferred window.
- Allow editing or removing items and show an accurate subtotal.
- Revalidate price and availability before checkout.
- Explain that final delivery fee depends on fulfillment choice and zone when it is not yet known.

### 9.9 Checkout

- Separate buyer, recipient, fulfillment, delivery, payment, and final review into clear logical groups; the final interaction pattern may be one page or a short staged flow after prototyping.
- Buyer fields: name, phone, and email.
- Recipient fields: name, phone, and address for delivery.
- Option: **Người nhận là tôi**. When selected, reuse appropriate buyer data without blocking later edits.
- Option: **Đây là quà bất ngờ**. The confirmation must explain how recipient contact will be handled; exact operating policy is an owner decision.
- Fulfillment choices: `PICKUP` and `DELIVERY`.
- For pickup, hide or disable irrelevant delivery fields and show Admin-managed pickup details.
- For delivery, validate address/zone, fee, date, and preferred window before order placement.
- Show an order review with products, options, message, fulfillment details, fees, total, and payment method before the final action.
- Checkout is guest-based in V1; no customer account is required.

### 9.10 Order Success

- Confirm that the order was received, without overstating fulfillment confirmation.
- Show a human-readable order reference, order status, payment status, summary, and next steps.
- For bank transfer, show order-specific VietQR and Admin-managed payment instructions.
- For cash, show owner-approved timing and eligibility instructions.
- Keep a fast florist contact action available.
- Do not expose another customer's order through predictable URLs or client-side-only checks.

## 10. Product model and behavior

### 10.1 Product fields

| Field | Purpose |
|---|---|
| `name` | Customer-facing product name |
| `slug` | Stable, unique URL identifier |
| `description` | Editorial and practical product description |
| `price` | Base or starting price, according to the approved size-pricing rule |
| `images` | Ordered product media with accessible alternative text |
| `category` | Catalog grouping |
| `occasion` | One or more relevant shopping occasions, pending final data design |
| `size` | Available size choices |
| `color/tone` | Available tone choices |
| `featured` | Eligibility for curated placement |
| `bestseller` | Eligibility for Best Sellers placement |
| `same_day_eligible` | Product-level permission for same-day consideration |
| `active` | Whether the product is publishable on the public site |
| `available` | Current V1 availability state |
| `seasonal` | Seasonal indication/behavior |
| `display_order` | Admin-controlled ordering among comparable items |

### 10.2 V1 availability

V1 supports only:

- `AVAILABLE`: may be purchased when all other fulfillment checks pass.
- `UNAVAILABLE`: visible only if the owner chooses, but cannot be purchased.
- `SEASONAL`: requires clear customer-facing context; purchasability depends on the owner-approved seasonal rule.

There is no quantity-on-hand, ingredient-level stock, reservation system, or advanced inventory calculation in V1.

`active`, availability, and `same_day_eligible` are separate concepts. A product may be active but unavailable, or available for future dates but ineligible for same-day delivery.

### 10.3 Product options

Sizes:

- Standard
- Large
- Premium

Tones:

- Pastel
- Pink
- White
- Warm
- Florist's Choice

The customer may also enter:

- Card message
- Delivery date
- Preferred delivery window

Size prices, valid option combinations, lead times, and window availability must come from Admin-managed data or settings. The interface must not present an option that cannot be fulfilled.

## 11. Florist's Choice

Florist's Choice is a first-class product and guided flow, not a buried contact form.

### Required input sequence

1. Budget.
2. Tone.
3. Occasion.
4. Florist designs the arrangement.

### Behavior

- Explain what the customer controls and what is intentionally delegated to the florist.
- Do not require selection of individual flowers.
- Allow the normal card, date/window, pickup/delivery, recipient, and payment journey.
- Confirm the selected budget, tone, and occasion in cart and order records.
- Use representative imagery without implying an exact replicated arrangement.
- The price shown at selection and checkout must be unambiguous.

## 12. Custom Bouquet requests

A Custom Bouquet submission is a service request, not a paid or confirmed order.

### Captured information

- Occasion
- Budget
- Color tone
- Preferred flowers
- Flowers to avoid
- Delivery date
- Message/note
- Optional reference image

### Submission and Admin behavior

- Create a custom request with initial status `PENDING`.
- Store the submitted values and reference-image location safely.
- Show the request in Admin with creation time and contact information collected by the approved follow-up design.
- Preserve a clear distinction between custom-request status, order status, and payment status.
- Later request statuses, assignment, quoting, and conversion to an order require owner decisions and are not assumed in V1.

## 13. Cart and checkout rules

- Buyer and recipient are separate data entities even when they represent the same person.
- The cart must preserve the selections that affect fulfillment and price.
- Server-side order creation must revalidate products, prices, fulfillment eligibility, fees, and settings; client display is not authoritative.
- The customer must consent to the relevant privacy/terms language before placing an order once the owner supplies approved policy copy.
- A placed order starts with order status `PENDING` unless an explicitly approved operational rule says otherwise.
- Payment status starts independently as `UNPAID`.
- An order is not `CONFIRMED` merely because it exists or because a bank transfer method was selected.
- Duplicate submission protection must prevent accidental duplicate orders.

## 14. Delivery and fulfillment

Admin must manage:

- Delivery zones.
- Delivery fee for each applicable zone/rule.
- Same-day availability.
- Same-day cut-off time.
- Delivery help text.
- Customer-visible delivery windows and pickup information when these are business-mutable.

### Required behavior

- Checkout calculates or retrieves the applicable fee from current settings.
- Same-day eligibility considers at least the product flag, selected date, current availability, cut-off, and delivery location; capacity rules remain an owner decision.
- Store the delivery fee and relevant fulfillment snapshot on the order so later setting changes do not rewrite historical totals.
- Preferred delivery windows are preferences unless the owner defines them as guaranteed slots; copy must reflect the actual service promise.
- V1 does not include courier assignment, live driver location, route optimization, or driver tracking.

## 15. Payment and order states

### 15.1 V1 payment methods

- `BANK_TRANSFER`
- `CASH`

No card payment or external payment gateway is included in V1.

### 15.2 Independent statuses

Order status:

`PENDING` → `CONFIRMED`

Payment status:

`UNPAID` → `PAID`

These state machines are independent. Examples:

- A new bank-transfer order may be `PENDING` and `UNPAID`.
- Staff may verify payment and mark it `PAID` while the order remains `PENDING` until fulfillment is accepted.
- A cash order may be `CONFIRMED` and remain `UNPAID` until the owner-approved payment moment.

V1 status transitions are manual in Admin unless a later approved specification changes them.

### 15.3 Bank transfer and VietQR

- Generate a dynamic VietQR for each applicable order using the current Admin-managed payment settings and an order-specific amount/reference.
- Do not hard-code bank account details in frontend source code.
- Store an appropriate payment-setting snapshot on the order or payment record for auditability while protecting sensitive values.
- V1 has no automatic bank webhook or automatic payment reconciliation.
- Staff verify payment and update payment status manually.

## 16. Admin product requirements

### 16.1 Dashboard

Provide a useful operational summary of pending orders, unpaid orders, and pending custom requests. Exact metrics and date ranges require prototyping and owner approval.

### 16.2 Products

Create, edit, activate/deactivate, order, price, classify, image-manage, and set availability, featured, bestseller, seasonal, and same-day properties.

### 16.3 Categories and occasions

Manage names, slugs, descriptions, images, visibility, and display order. Prevent destructive changes from silently breaking product associations or URLs.

### 16.4 Custom Requests

View the complete submitted brief and reference image safely. Support the initial `PENDING` state; additional workflow states are not assumed until approved.

### 16.5 Orders

View buyer, recipient, surprise-gift flag, items/options, message, fulfillment, delivery fee, totals, payment method, and independent order/payment statuses. Allow only valid status changes and preserve an audit-worthy record of operational changes.

### 16.6 Homepage

Manage content, imagery, links, visibility, and display ordering for all storyboard sections, including curated products and gallery items.

### 16.7 Delivery Settings

Manage zones, fees, same-day availability, cut-off, customer help text, and approved delivery/pickup timing choices.

### 16.8 Site Settings

Manage address, phone, email, opening hours, Instagram/social links, Google Maps information, general contact actions, and other owner-approved global content.

### 16.9 Payment Settings

Manage the bank and VietQR inputs, customer-facing transfer instructions, and cash instructions. Access must be restricted to authorized admins.

## 17. Data and content rules

### 17.1 Admin is the origin of business-mutable content

The future content path is:

**Admin → Database/Storage → Public site**

After an authorized Admin save, refreshing the public website must show the change without a frontend rebuild or redeploy, subject only to a defined cache-refresh strategy.

### 17.2 Content that must not be hard-coded in the frontend

- Products, prices, images, categories, and occasions.
- Availability and same-day eligibility.
- Homepage content and curated selections.
- Address, phone, email, opening hours, social links, and Google Maps details.
- Delivery zones, fees, cut-off, availability, and help text.
- Bank/payment settings and customer-facing payment instructions.
- Orders and custom requests.

Stable interface labels, design tokens, and structural rules may remain in application code when they are not business content.

### 17.3 Data integrity

- Use stable internal identifiers; do not rely on editable display names as relationships.
- Slugs must be unique and changes must follow an approved redirect policy.
- Orders store price, fee, option, address, recipient, and fulfillment snapshots needed to preserve historical accuracy.
- Dates and cut-off calculations use one explicit business timezone; V1 assumes `Asia/Ho_Chi_Minh` pending owner confirmation.
- User-entered text and uploaded media are untrusted inputs.

## 18. Security and privacy assumptions

These are product constraints for later technical design, not a commitment to a specific platform.

- Public catalog reads expose only published fields; Admin and private order/request data require authenticated authorization.
- Admin authorization must be enforced on the server/data layer, not only by hidden navigation.
- Apply least privilege and row-level/data-access rules before launch.
- Never ship private credentials or privileged keys to the browser.
- Protect buyer and recipient personal data; collect only what the operational flow needs.
- Validate and sanitize all input on trusted boundaries.
- Restrict reference-image type, size, and access; do not execute or trust file metadata.
- Add reasonable anti-abuse controls to order, custom-request, contact, and authentication endpoints.
- Do not reveal whether unrelated order IDs exist, and do not use guessable identifiers as authorization.
- Use HTTPS in production and approved secret storage for deployment credentials.
- Define retention, deletion, backup, and incident procedures before production data is accepted.
- Logging must avoid full card messages, addresses, phone numbers, bank details, secrets, and uploaded private content unless explicitly required and protected.

## 19. Responsive and accessibility requirements

### 19.1 Responsive behavior

- Design mobile-first for common phone widths, then verify tablet, laptop, and wide desktop.
- No horizontal page scrolling at supported widths.
- Navigation, filters, galleries, forms, cart summaries, and Admin tables/actions must remain operable without hover.
- Primary checkout actions and total information must remain easy to find on small screens without hiding essential context.
- Images must use responsive sizing and preserve important crop/focal points.
- Test long Vietnamese copy, validation errors, empty states, large prices, and realistic addresses.

### 19.2 Accessibility

- Target WCAG 2.2 AA for the public and Admin interfaces.
- Use semantic headings, landmarks, labels, buttons, and links.
- Provide keyboard access, visible focus, logical focus order, and appropriate focus handling for dialogs/drawers.
- Provide useful alternative text for meaningful flower/product images; mark decorative images accordingly.
- Meet text and interactive-component contrast requirements.
- Do not communicate availability, selection, or errors through color alone.
- Associate validation messages with their fields and provide a clear error summary when useful.
- Keep touch targets usable and avoid interactions that depend on precision.
- Respect reduced-motion preferences and avoid unnecessary motion.

## 20. SEO and shareability

- Each indexable public page has a unique Vietnamese title and meta description sourced from page/content data where appropriate.
- Product and occasion pages have stable canonical URLs and descriptive slugs.
- Provide structured data appropriate to the final business/product implementation, validated before release.
- Generate sitemap and robots behavior appropriate to the environment; block Admin and non-public transactional pages from indexing.
- Product/social share metadata uses an appropriate image, title, description, and canonical URL.
- Images use descriptive filenames/alt text where useful and are optimized without visibly damaging floral detail.
- Preserve redirects when published slugs change.
- Order, checkout, success, Admin, and private request pages must not be indexed.

## 21. V1 scope

V1 includes:

- The public and Admin information architecture in section 6.
- Occasion and budget discovery.
- Product listing and product detail with the defined options.
- Florist's Choice.
- Custom Bouquet request submission and Admin visibility.
- Cart and guest checkout with separate buyer and recipient.
- Pickup and delivery.
- Admin-managed delivery settings and same-day behavior.
- Bank transfer with dynamic per-order VietQR and cash payment.
- Independent order and payment statuses.
- Admin-managed catalog, homepage, contact, delivery, payment, order, and request data.
- Responsive, accessible, secure foundations suitable for production review.

## 22. V1 non-goals

V1 does not include:

- Customer accounts.
- Loyalty program.
- Reviews.
- Coupon engine.
- Subscription orders.
- Advanced inventory.
- Delivery driver tracking.
- Card payment or payment gateway.
- Automatic bank webhook or payment reconciliation.
- Marketplace behavior.
- Multi-branch operations.
- Complex analytics.

Non-goals must not be implemented incidentally without a separate owner-approved specification and scope change.

## 23. Acceptance criteria

### 23.1 Discovery and presentation

- A first-time mobile user can reach products by occasion, budget, or same-day intent from Home.
- All ten homepage sections appear in the approved order when enabled and use Admin-managed content.
- Product cards and details expose enough image, price, option, and availability information to make a choice.
- Visual implementation uses the specified palette, approved typography pair, editorial imagery, generous whitespace, and asymmetric composition without the prohibited styles.

### 23.2 Product and guided flows

- An available product can be configured with only valid size/tone options and added to cart with its selections preserved.
- Unavailable products cannot be ordered.
- Same-day messaging and checkout eligibility reflect current Admin settings and product rules.
- Florist's Choice collects budget → tone → occasion and never requires individual flower selection.
- A Custom Bouquet form captures every specified field, accepts an optional validated reference image, creates a `PENDING` custom request, and displays it in Admin.

### 23.3 Checkout and fulfillment

- Guest checkout supports distinct buyer and recipient data, **Người nhận là tôi**, and **Đây là quà bất ngờ**.
- Pickup removes irrelevant delivery requirements; delivery validates zone/address, date/window, and fee.
- Final review shows accurate items, options, messages, fulfillment, fees, total, and payment method.
- Order creation safely revalidates current price and fulfillment conditions and prevents accidental duplicates.

### 23.4 Payment and status

- V1 offers only bank transfer and cash.
- Bank-transfer success shows a dynamic, order-specific VietQR based on Admin settings rather than hard-coded account data.
- A new order can be independently `PENDING`/`CONFIRMED` and `UNPAID`/`PAID`.
- Staff can perform only valid manual transitions, and no V1 flow claims automatic bank confirmation.

### 23.5 Admin and data propagation

- Authorized staff can manage every business-mutable content group listed in section 17.2.
- Saving an Admin change persists it to the future data layer and makes it visible on public refresh without rebuilding or redeploying.
- Private orders, settings, and custom requests are not readable or writable by unauthorized users.

### 23.6 Quality

- Critical journeys work at approved mobile, tablet, and desktop breakpoints with keyboard access and no horizontal overflow.
- Relevant automated checks pass, but final approval also includes hands-on copy, control, error-state, mobile, accessibility, and user-flow review.
- V1 non-goals remain absent unless separately approved.

## 24. Development gates

The mandatory sequence is defined in `docs/WORKFLOW.md`.

Before significant implementation, record answers to:

1. Why does this feature or page exist?
2. Who uses it?
3. What is the primary action?
4. Does the proposed structure support that action?

After implementation:

- Use the result as a real customer or staff member would.
- Read every piece of visible copy in context.
- Click and operate every relevant control.
- Test mobile behavior and realistic content.
- Identify unnecessary, confusing, misleading, or inaccessible elements.
- Treat AI review as input; the owner makes the final decision.

No stage is complete solely because the project builds successfully.

## 25. Open owner decisions

These decisions are intentionally not invented by this specification:

1. Final heading/body font pair and licensed font source.
2. Currency/display convention and whether listed prices include tax or other charges.
3. Size-price model, valid option combinations, and whether quantity greater than one is supported.
4. Final budget bands for Home, catalog filters, and Florist's Choice.
5. Seasonal-product purchasability and approved flower-substitution promise.
6. Delivery zones, fees, same-day service area, cut-off time, capacity rule, lead time, and whether windows are preferred or guaranteed.
7. Pickup address, pickup hours, and pickup readiness/confirmation process.
8. Surprise-gift contact policy, especially when the courier cannot reach the recipient.
9. Cash eligibility and collection moment for pickup and delivery orders.
10. Bank/VietQR provider fields, transfer-reference format, payment verification procedure, and payment deadline.
11. Order/custom-request confirmation channels, response-time promise, and customer service channels.
12. Custom-request contact fields, later statuses, quotation flow, and conversion to an order.
13. Cancellation, rescheduling, refund, privacy, terms, and data-retention policies.
14. Product image ratios, upload limits, gallery moderation, and Instagram integration method.
15. Supported browsers, concrete responsive test widths, analytics choice, and launch success targets.
16. Admin roles, permissions, audit requirements, and staff notification rules.
