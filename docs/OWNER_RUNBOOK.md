# Luméa Owner Runbook

This guide covers routine V1 operation. Use Admin for business changes; do not edit production tables, Auth metadata, Storage records, or SQL by hand.

## Sign in and recover access

1. Open `/admin/login` (or `/ko/admin/login`) and sign in with the owner Admin account.
2. If the password is lost, choose **Quên mật khẩu**, submit the Admin email, and use the newest link in the mailbox.
3. Set a password of at least 15 characters. After reset, sign in again. Do not forward reset links or paste their contents into support messages.
4. V1 is `ADMIN`-only. `STAFF` accounts are deliberately blocked until their exact permissions are approved.

MFA with an authenticator app is available in the production Auth service and is recommended for the owner account. Enrollment is an owner action because it requires the owner's device and recovery-code storage.

## Manage the storefront

- **Cấu hình → Hồ sơ studio:** update the public business name, phone, email, and Instagram pair.
- **Trang chủ:** edit fixed-section VI/KO copy, media, featured content, and Visit details. Enter a normal Google Maps link and structured map query; never paste iframe HTML.
- **Khám phá:** manage occasions, tones, and budget ranges.
- **Sản phẩm:** create/edit a draft, add VI/KO content, variants and media, then publish, hide, or archive it. Do not delete records that may be referenced by an Order.
- **Builder:** manage flower stems, wrapping options, colours, prices, compatibility, availability, and publication state.

Saved Admin content is stored in Supabase and appears on the storefront after refresh; a website rebuild is not required.

## Delivery and payment

Use **Vận hành** to manage delivery zones, areas, fees, windows, pickup details, same-day availability/cutoff, and payment methods.

- Review all delivery values as real business promises before launch.
- Keep an option disabled until its copy, price, timing, and operational process are correct.
- Bank transfer/VietQR is manual payment presentation, not automatic confirmation. Enable it only after the bank fields and verification process are approved.
- Cash can remain enabled independently. Pickup and delivery can be enabled or disabled independently, subject to the safety checks in Admin.
- To stop new Checkout safely, disable all fulfillment choices in Admin. Do not restore anonymous access to the internal Checkout RPC.

## Orders

1. Open **Đơn hàng** to search and filter by Order, customer, status, payment status, or requested date.
2. Open an Order to review the immutable items, customer/recipient, fulfillment, total, and history.
3. Use only the offered status actions. The system rejects stale or invalid transitions.
4. Mark a bank payment paid only after verifying it outside the website. Repeating the action does not create a second valid payment transition.
5. Cancel a QA or real Order through the Order detail action. Add a clear reason when appropriate; never delete the row from the database.

## Personal data

Buyer/recipient names, phones, email, address, message, delivery notes, Payment and Order history are stored in protected Supabase tables. Only an active `ADMIN` can read them through Admin. Do not export or copy them unless operationally necessary. The owner still needs to approve a retention/deletion policy; a practical starting point is periodic review with legal/accounting needs considered, rather than indefinite retention by default.

## If something fails

- **Website deploy fails:** the previous GitHub Pages release remains the recovery point. Review the failed Actions job; do not bypass its quality or database gates. Fix forward and redeploy, or revert the frontend commit through Git and run the same gates.
- **Checkout fails:** leave the secure gateway fail-closed. Preserve the customer's Cart, verify the Edge Function/secrets and Supabase status, and roll forward. Do not expose the service-role key or grant the order RPC to browsers.
- **Bad delivery/payment configuration:** disable the affected option in Admin, correct it, then re-enable it after a storefront review.
- **Database migration issue:** do not run a destructive production rollback. Stop the release, take/confirm a backup, prepare a reviewed forward migration, apply it, and repeat SQL/runtime checks.
- **Suspected credential leak:** disable the affected path, rotate the secret in its owning service, redeploy, review logs without copying PII, and check GitHub secret alerts.

Production backup/PITR availability depends on the Supabase plan and owner configuration. Confirm it before accepting irreplaceable production Orders; never assume a backup exists because a deployment succeeded.
