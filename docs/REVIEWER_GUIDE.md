# Luméa V1 reviewer guide

This tour takes about 10–20 minutes. Admin credentials are private, so the public review does not require a login.

## Links

- [Live site](https://johnathanjjnbao.github.io/lumea-flower-studio/)
- [GitHub repository](https://github.com/Johnathanjjnbao/lumea-flower-studio)
- [Project summary](./FINAL_PROJECT_SUMMARY.md)
- [Technical handoff](./V1_HANDOFF.md)

## What to try

1. Start on the Homepage and switch between Vietnamese and Korean.
2. Open Flowers, use the search/filters and inspect a Product Detail page.
3. Build a bouquet and add it to the Cart.
4. Add a ready-made design so the Cart contains both item types.
5. Open Checkout and review pickup/delivery, date and payment behavior. Please do not submit a production Order.
6. Read the project summary for the private Admin workflow. Admin screenshots and live credentials are intentionally not published because Orders contain personal data.

## What to review

- Product completeness and the customer path from discovery to Checkout
- Mobile and desktop UI/UX, content clarity and VI/KO behavior
- Admin-to-database-to-storefront architecture
- Checkout pricing, authorization and abuse-protection boundaries
- Testing, release and production-verification discipline
- How the owner used ChatGPT/Codex while retaining human review and acceptance

## Known limitations

- Dynamic deep links rely on GitHub Pages `404.html` recovery.
- Bank transfer/VietQR is off pending real bank configuration.
- Logistics values still require owner confirmation before commercial launch.
- The release did not include specialist load testing or a full browser/device matrix.

## Review questions

1. Is the architecture appropriate for this product and stage?
2. Do the security boundaries cover the important risks?
3. Which product or engineering decision is strongest?
4. Where does the implementation appear overbuilt or underbuilt?
5. Is the QA evidence credible and proportionate?
6. Does the project demonstrate useful skills for an entry-level AI Evaluator or LLM Analyst role?
7. What are the three highest-value next improvements if the project continues?
