# Luméa Flower Studio v1.0.0

Luméa Flower Studio V1 is a bilingual VI/KO floral-commerce application with a public storefront, Bouquet Builder, guest Checkout and a Supabase-backed Admin workspace.

## Included in V1

- Storefront, Product Detail and Bouquet Builder
- Persistent mixed Cart and guest Checkout
- Supabase Postgres, Auth, Storage, RPCs and Edge Functions
- Admin CMS and operations settings
- Order search, detail, lifecycle and history
- Delivery, pickup, same-day and payment configuration
- Site Profile, Visit/Maps and discovery management
- Cloudflare Turnstile Checkout gateway
- RLS, direct-RPC restrictions and server-side pricing
- CI, SQL security tests, browser smoke tests and secret scanning
- Vietnamese and Korean customer experience
- GitHub Pages production deployment

## Status

Engineering complete.

Business logistics and payment settings remain owner-configurable and require final owner review before a real commercial launch.

## Known limitations

- Dynamic deep links use GitHub Pages SPA recovery.
- Bank transfer/VietQR remains off until real bank configuration is approved.
- The release did not include specialist load testing or a full browser/device matrix.
