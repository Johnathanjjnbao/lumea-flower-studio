# Luméa Admin Scope Lock

**Status:** Functional and ownership boundary for future Admin implementation

**Principle:** Admin manages business content, operations, and media; React code owns layout, design, validation presentation, and interaction structure.

## 1. Purpose

Luméa Admin is the operational interface for one shared commerce platform. It is not a mock dashboard, a separate source of truth, or a visual page builder.

An authorized save follows this path:

**Admin → trusted command → Postgres/Storage → public repository query → Storefront refresh**

No business-content change should require editing source code or redeploying the frontend once its vertical slice has migrated.

## 2. Roles and authentication

### MVP authentication

- Supabase Auth protects Admin access.
- Public Storefront access and guest checkout do not require an account.
- Optional Customer authentication is deferred and must not block V1 Orders.

### Roles

| Capability | `ADMIN` | `STAFF` |
|---|---:|---:|
| Manage staff access and roles | Yes | No |
| Manage payment/bank settings | Yes | No |
| Manage delivery/site settings | Yes | Read or limited update, pending owner approval |
| Create/edit/publish/archive catalog | Yes | Yes, if granted by policy |
| Manage Builder flower/wrapping data | Yes | Yes, if granted by policy |
| Manage homepage content/media | Yes | Yes, if granted by policy |
| View Orders and fulfillment data | Yes | Yes |
| Change Order/Payment/Delivery status | Yes | Only allowed operational transitions |
| View private custom-request uploads | Yes | Yes when assigned/authorized |
| Read audit history | Yes | Own/relevant operational history only |

The database/trusted API enforces permissions. Hiding buttons is not authorization. The exact STAFF permissions are an owner decision before Admin implementation.

## 3. Admin modules

### 3.1 Products

Admin can:

- Create a draft ready-made or configurable Product.
- Edit canonical slug/stable code subject to uniqueness and redirect policy.
- Enter VI and KO name, description, composition, and SEO copy.
- Create, price, reorder, publish, hide, and archive variants.
- Manage visibility separately from availability.
- Set same-day eligibility, featured, bestseller, and display order.
- Assign occasions and tones.
- Upload/reuse/reorder primary and gallery media.
- Preview publication readiness and resolve missing required content.
- Publish, hide/unhide, and archive without destroying historical Orders.

Publication validation must reject missing Vietnamese required copy, missing purchasable ready-made variants, invalid prices, missing primary media, or invalid taxonomy relationships.

### 3.2 Flower stems

Admin can:

- Create/edit stable flower records.
- Enter VI/KO name, description, and image alt text.
- Set price per stem as an integer VND amount.
- Set `AVAILABLE`, `UNAVAILABLE`, or `SEASONAL` independently from visibility.
- Publish, hide, unhide, archive, and reorder.
- Manage image and optional tone/color metadata.

Hiding or archiving a FlowerStem removes it from new Builder sessions. It does not remove it from locked BouquetConfigurations or Order history.

### 3.3 Wrapping

Admin can:

- Manage wrapping types and localized labels/descriptions.
- Manage color/finish variants, swatches, and media.
- Set option, variant, or validated combination price modifiers.
- Define compatible option/variant pairs.
- Publish, hide, archive, and reorder.

Admin cannot create a publicly selectable invalid combination. Database constraints and trusted commands enforce compatibility independently of the UI.

### 3.4 Taxonomy and discovery

Admin can manage:

- Occasion stable identity, VI/KO copy, imagery, visibility, and order.
- Tone stable identity, VI/KO labels, swatch, visibility, and order.
- Product relationships to occasions and tones.
- Budget range bounds, labels, imagery, visibility, and order.

Changing an editable label does not change URLs or relationships. Slug changes require a redirect policy before they are enabled.

### 3.5 Orders

Admin Order Detail must show:

- Internal UUID only where operationally useful and the human-readable Order number prominently.
- Buyer contact separately from recipient contact.
- Surprise-delivery flag and approved handling notes.
- Delivery/pickup details, date, window, zone, address, fee, and notes.
- Independent Order, Payment, and Delivery statuses and their event history.
- Subtotal, delivery fee, discount placeholder, total, and currency.
- Ready-made item: Product/variant/tone/name/price snapshots and card message.
- Custom item: exact flower rows, quantities, unit price snapshots, wrapping, modifiers, total stems, total price, and notes.

Admin may perform only documented transitions. Editing a status column, historical price, or snapshot directly is not a supported operation.

### 3.6 Payments

Authorized Admin can:

- Manage current bank-transfer/VietQR inputs and customer instructions.
- Manage approved cash instructions/eligibility.
- View Order-specific payment reference, amount, method, and safe instruction snapshot.
- Manually move a Payment through allowed states with an actor and reason.

Admin does not claim automatic reconciliation in V1. Secret credentials are held in approved secret storage, never site content or browser-readable settings.

### 3.7 Delivery settings and operations

Admin can:

- Manage delivery zones, fees, same-day eligibility, and localized help text.
- Manage available delivery windows and pickup information.
- Manage same-day enabled state and cutoff time.
- View delivery-specific recipient/address/surprise/notes.
- Move Delivery through allowed states with an actor and reason.

Advanced inventory, courier assignment, route optimization, and live tracking remain out of scope.

### 3.8 Florist-led custom requests

Admin can view the submitted brief, approved contact fields, delivery date, and private reference media. V1 starts with `PENDING`; later statuses, quotation, assignment, response promises, and conversion into an Order require a separate owner decision.

This request flow remains distinct from the self-service Create Your Bouquet configuration.

## 4. Homepage and site-content ownership

### 4.1 Admin-editable content

| Area | Editable data |
|---|---|
| Hero | VI/KO eyebrow, heading, supporting copy, CTA labels/destinations within allowed link types, primary/detail media, visibility. |
| Shop by Occasion | Section copy, occasion membership/order, occasion copy/media, visibility. |
| Best Sellers | Section copy, curated Product slots/order, visibility. |
| Budget | Section copy, managed budget bands, media, order, visibility. |
| Same-day | Current service copy, image, CTA, visibility; operational truth comes from delivery settings. |
| Florist's Choice | VI/KO explanatory copy, representative media, allowed tone/occasion/budget data, visibility. |
| Create Bouquet promotion | VI/KO promotional copy, images, CTA destination, visibility. Builder rules remain in domain data. |
| Why Luméa | Approved promises, copy, images, order, visibility. |
| Gallery | Images, alt/caption, destination links, order, active state. |
| Visit/Contact | Address, phone, email, hours, map details, social links, copy, visibility. |
| Global operational copy | Delivery/payment/contact instructions that are explicitly modeled and permissioned. |

### 4.2 Code-owned layout and behavior

Admin cannot edit:

- React component hierarchy, responsive breakpoints, grid algorithms, animation code, or design tokens.
- Arbitrary HTML, JavaScript, CSS, SQL, or executable templates.
- Route implementation, accessibility semantics, validation behavior, or security policies.
- Unbounded component schemas or drag-and-drop section construction.
- Client-side pricing formulas as a substitute for trusted business logic.

Admin may reorder or hide known homepage sections where the fixed section contract allows it. It does not create new component types.

## 5. Content model rules

- `homepage_sections.section_key` selects a known React section contract.
- Translation rows hold typed copy fields for that contract.
- Media placement rows hold role and order; curated Product rows hold Product references and order.
- Site profile, business hours, social links, delivery settings, and payment settings remain separate typed records.
- Do not collapse the entire homepage into one JSON document.
- Small bounded snapshots may use validated JSON when their historical shape is versioned; arbitrary browser-provided JSON is not accepted.

## 6. Media management

Admin media flow:

1. Select a supported image.
2. Trusted upload validates MIME, extension, size, dimensions, and access class.
3. File is stored under a generated immutable key in `public-media` or `private-uploads`.
4. A `media_assets` row records the storage key and metadata.
5. Admin enters VI/KO alt text/caption where required.
6. A typed placement row assigns the asset as Product primary/gallery, flower image, wrapping media, homepage role, gallery item, or private custom-request reference.
7. Replacing media creates a new asset/placement change; cleanup archives the old record until it is unreferenced and eligible for deletion.

Public media queries must never expose private custom-request assets. Signed private URLs are short-lived and restricted to authorized users.

## 7. Publication and deletion policy

### Publish

- Publishing is an explicit trusted command, not merely setting a checkbox in the browser.
- Required translations, price/configuration, media, and relationships are validated first.
- Public queries include only `PUBLISHED` records and safe fields.

### Hide

- `HIDDEN` removes a record from new public discovery without erasing it.
- Existing Cart items are revalidated and may become unavailable.
- Existing Order snapshots remain unchanged.

### Archive

- `ARCHIVED` is the end of normal business use and prevents new relations/selections.
- Archived records remain readable by authorized historical queries.
- Hard delete is reserved for safe draft/orphan cleanup after reference and retention checks.

## 8. Admin → Storefront acceptance slice

The first Admin milestone is complete only when all steps pass:

1. ADMIN signs in through real Auth.
2. ADMIN creates one draft Product.
3. ADMIN uploads a real public image and enters required VI/KO copy.
4. ADMIN creates a priced variant, sets availability/taxonomy, and publishes.
5. Database and Storage contain the persisted records.
6. Public Catalog shows the Product without a rebuild.
7. Product Detail opens by canonical slug and displays the same data/media.
8. ADMIN hides the Product.
9. Catalog and Product Detail no longer expose it after refresh/cache invalidation.
10. Unauthorized writes and unpublished public reads are rejected.

This vertical slice must be implemented before broad Admin navigation or placeholder dashboards.

## 9. Operational flow after later steps

Customer selects ready-made/Builder item → Cart revalidates → Checkout records buyer and recipient separately → trusted Order creation snapshots all prices/configuration/fulfillment → Payment and Delivery records are created independently → Admin sees one complete Order view → staff performs valid transitions → customer-facing status reflects authorized data.

## 10. Audit and privacy

- Record actor, action, entity, time, and a safe change summary for publication, availability, pricing, permissions, and operational status changes.
- Never log full addresses, phone numbers, card messages, bank secrets, tokens, or private media contents.
- Limit private Order/custom-request/media access to operational need.
- Role changes and payment-setting changes are ADMIN-only and auditable.
- Data export, correction, deletion, retention, backup, and incident procedures are required before accepting production customer data.

## 11. Owner decisions required before dependent implementation

1. Exact STAFF permissions and whether content publication needs ADMIN approval.
2. Variant pricing/valid combinations and seasonal-purchase behavior.
3. Delivery zones, fees, cutoff, capacity, pickup, and time-window promise.
4. Surprise-delivery contact policy.
5. Cash eligibility/collection timing and bank-transfer verification/deadline.
6. Cancellation, refund, reschedule, privacy, and retention policies.
7. Upload types, size/dimension limits, derivative generation, and moderation.
8. Custom-request contact/response/quotation/conversion workflow.

These decisions do not authorize broader scope in Step 8 and do not block the documented Product vertical slice from being planned.
