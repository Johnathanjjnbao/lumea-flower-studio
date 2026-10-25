# Luméa V2.2 — Production release runbook

**Updated 2026-10-20. Status: NO-GO.** This is not authorization to export protected live data, purchase a plan, mutate production, publish policies, merge, or deploy. Production is `nihhynwvltttadlfatdm`; staging is `puzuubnxarmviwgpjclj`. Never substitute one ref for the other. Use [the V2.2 acceptance record](V2_2_PRODUCT_DETAIL_POLICIES.md) for staging evidence; do not repeat those tests merely to follow this runbook.

## Evidence and current state

- Feature branch `v2-product-detail-policies` at `f7531ba383b0ed6a8e42673471afc99467f919c9`; `origin/main` at `fcad2ee11abb3058f0fc53c0053922a53fc627da` when inspected. The feature is 15 commits ahead. Hosted Actions [run 39291238658](https://github.com/Johnathanjjnbao/lumea-flower-studio/actions/runs/39291238658) passed its quality and database-security gates; production deploy did not run. Recheck heads and CI immediately before release.
- Production is healthy and remains at V2.1: `supabase_migrations` has 30 records through `20261008090500`; none of the four V2.2 migrations is recorded. No V2.2 policy schema or published content exists there. PostgreSQL reports 17.6 and `pg_database_size(current_database()) = 17,411,219` bytes. Enabled extensions observed: `pg_stat_statements`, `pgcrypto`, `plpgsql`, `supabase_vault`, `uuid-ossp`.
- Production Dashboard is on the Free plan: no scheduled database backup was shown; PITR is not enabled. No protected live-data dump or independent production-data restore has been performed. **Database recovery: NOT VERIFIED. Storage recovery: NOT VERIFIED.** Supabase CLI 2.120.0 and PostgreSQL 17.11 portable tools are now available outside the repo; no Docker or Windows service was installed. A migration dry-run has not been run. Do not infer recoverability from successful CI, tool installation, or a synthetic restore.
- Production has 10 Published Products with three active variants each. Site Profile contact is configured; delivery and pickup are enabled; three delivery zones and four windows are active, with observed delivery fees 30,000–60,000 VND. Cash on delivery/pickup is enabled; bank transfer is disabled. These are technical observations, not owner approval that the business settings or public promises are correct. Product VI/KO translation and primary-media references were present in the bounded inspection.

## Price integrity — owner decision before Gate B

`Pink Garden` (`13826e3d-00dc-50a6-8949-dab793cf0553`) currently has:

| Variant | Variant ID | SKU | Stored/final VND | Difference from Standard |
| --- | --- | --- | ---: | ---: |
| Standard | `7ea5e972-73fe-5b42-bb37-67900eec896c` | `LUM-PINK-GARDEN-STANDARD` | 120,000,000 | — |
| Large | `e9ca126f-3362-5164-9fa5-0311c5d71c8d` | `LUM-PINK-GARDEN-LARGE` | 130,000,000 | +10,000,000 |
| Premium | `35399deb-cb21-54a9-b71e-b4f0c7c1821d` | `LUM-PINK-GARDEN-PREMIUM` | 1,400,000,000 | +1,280,000,000 |

The public Product Detail page displayed those amounts and the Premium difference. The catalog maps integer `product_variants.price_amount` directly; `formatVnd` formats VND and the PDP subtracts the lowest active variant price for the difference. Admin's variant field is labeled `Giá VND` and saves the integer as `price_amount`. No multiplication, floating-point conversion, or currency-unit defect was found in that path. The source of the unusual values is **not established**; treating them as test data would be an inference. Checkout revalidates current variant pricing server-side and writes `order_items.unit_price_snapshot`, so a future Admin correction changes new purchases, not historical snapshots. Do not edit price directly in SQL.

Observed Published Product variant ranges (min–max VND): Pink Garden 120,000,000–1,400,000,000; Hydrangea Cloud 1,280,000–1,630,000; Velvet Promise 1,180,000–1,530,000; Amber Afternoon 980,000–1,330,000; Warm Embrace 890,000–1,240,000; Morning Peony 820,000–1,170,000; Spring Note 760,000–1,110,000; White Poetry 720,000–1,070,000; Rose Letter 560,000–910,000; Quiet Calla 480,000–830,000. Pink Garden is the only material outlier relative to this actual distribution; no business price ceiling was assumed. Owner must approve the three intended prices and whether the Product should remain Published. If correction is approved separately, use Admin Product Editor, save, refresh PDP and Checkout price preview, and read back database rows; do not place a test Order.

## Gate A — recoverability, before any production migration

### Choose a strategy

| | A. Controlled logical backup | B. Managed backup / isolated clone |
| --- | --- | --- |
| Cost | No Supabase plan purchase required; operator time and encrypted storage, plus any isolated-target cost | Paid plan and independent project compute; confirm current invoice impact before purchase. PITR is an optional, additional cost, not a substitute for a restore rehearsal. |
| Method | Export roles/schema/data and migration history, protect the files, then prove a restore into a fresh isolated Supabase-compatible project | Wait for the first successful scheduled backup, then restore **to a new project** and verify it. Do not restore over production or staging. |
| Strength | Lowest recurring cost if the complete rehearsal works | Managed clone includes database/Auth users and encryption root key; simpler fidelity for Supabase-managed features. |
| Gap | Supabase-managed roles/schemas, Auth, Vault root key, grants, extensions, triggers and migration history need explicit verification; a dump alone is insufficient | Paid plan/clone does not transfer Storage object bytes/settings, Edge Functions, Auth/API settings, Realtime settings, or all extension settings. Separate configuration and Storage recovery still required. |

**Recommendation:** try A only with a separately approved, secure live export and a successful isolated restore that demonstrates the complete required service behavior. If that cannot be achieved, choose B rather than calling an untested dump a recovery path. Neither option is currently PASS. Supabase recommends regular off-site logical exports for Free projects and states that paid projects have daily backups; confirm current commercial terms in Dashboard before authorizing a purchase. [Database backups](https://supabase.com/docs/guides/platform/backups), [CLI backup/restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore), [restore to a new project](https://supabase.com/docs/guides/platform/clone-project).

### Tooling and evidence obtained in this preparation task

- Verified Supabase CLI `2.120.0` from the official release (archive SHA-256 `0DB5224FC5D92AE5F15E675ED65DAD376967326921122AB8D9A78E790874C92E`); it is not installed into project dependencies. PostgreSQL `psql`, `pg_dump`, `pg_restore`, `initdb` report `17.11` from the vendor's portable binaries. Node.js reports `24.20.0`. Docker and WSL remain absent; no global system service was registered. The signed EDB installer was downloaded and hash-checked but could not be executed in this environment, so the official portable binaries were used instead. No credentials were copied into the repo.
- New local-only toolkit: `scripts/ops/v2_2_recovery/lib.mjs`, `recovery.mjs`, `recovery.test.mjs`, and `synthetic-restore.mjs`. `recovery.mjs plan` and `doctor` are safe defaults; `export` requires an exact production link, a new output directory outside Git, `--execute EXPORT_LIVE_DATA`, and a separate environment opt-in. `restore` rejects production/staging/source refs, verifies the five-file manifest and a private target service identity, requires an empty target and separate opt-in. No production export/restore mode was enabled or run. Storage download accepts only exact public-media URLs on the production ref, rejects redirects, and verifies MIME, size, image signature and SHA-256; it cannot read private uploads.
- `node --test scripts/ops/v2_2_recovery/recovery.test.mjs`: 9/9 safety tests PASS, including wrong ref, missing credentials, tampering and partial-file detection. A **real PostgreSQL 17.11 synthetic-toolchain restore** on two distinct local loopback clusters PASS: Product/Variant/VI-KO rows `1/1/2`, integer price 1,200,000 VND, role SELECT grant, RLS policy, function, constraints and one synthetic migration-history row survived. Both local clusters were stopped. This exercises native PostgreSQL dump/psql and manifest logic, **not** Supabase's production `db dump`, Auth/Vault compatibility, or a real production backup. Thus the production recovery gate remains open.

Safe local commands, requiring no production credential or database mutation:

```powershell
node scripts/ops/v2_2_recovery/recovery.mjs doctor --supabase-cli <absolute-supabase-exe> --psql <absolute-psql-exe>
node scripts/ops/v2_2_recovery/recovery.mjs plan --source-ref nihhynwvltttadlfatdm --destination-ref <new-isolated-project-ref>
node --test scripts/ops/v2_2_recovery/recovery.test.mjs
node scripts/ops/v2_2_recovery/synthetic-restore.mjs <absolute-postgresql-bin-directory>
node scripts/ops/v2_2_recovery/recovery.mjs report --backup-dir <absolute-existing-backup-directory-outside-git>
```

The synthetic script uses only ephemeral loopback PostgreSQL clusters and stops them; it leaves its synthetic evidence directory in the OS temp area for inspection. `recovery.mjs` never cleans up a live backup or isolated project automatically. Its `export` and `restore` modes require separate owner authorization and explicit opt-in variables; `validate-target` is a read-only metadata smoke for a separately approved isolated target, not a substitute for full service validation.

### Option A — export and isolated rehearsal, future approval only

The official `supabase db dump` guide uses Docker Desktop locally. The owner does not want Docker on this PC. A controlled, ephemeral GitHub-hosted runner may use Docker, but sending live PII into runner artifacts/logs needs **separate explicit authorization and an approved encrypted destination/retention policy**; never attach raw dumps to GitHub Actions. Supabase's CLI applies Supabase-specific filters: a generic raw `pg_dump` is **not a drop-in substitute** for its roles/schema/data workflow. Local CLI and PostgreSQL clients are now installed outside the repo, but `supabase db dump` still requires a container runtime. The following is a future command template for an authorized controlled runner, not an executed export. Obtain `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` from protected secret storage; do not echo either, put a database URL/password on a command line, or store output in the repository.

```powershell
# FUTURE ONLY: isolated host with Docker and pinned, reviewed Supabase CLI.
supabase link --project-ref nihhynwvltttadlfatdm
supabase db dump --linked --role-only -f '<encrypted-path>/roles.sql'
supabase db dump --linked -f '<encrypted-path>/schema.sql'
supabase db dump --linked --use-copy --data-only -x 'storage.buckets_vectors' -x 'storage.vector_indexes' -f '<encrypted-path>/data.sql'
supabase db dump --linked --schema supabase_migrations -f '<encrypted-path>/history_schema.sql'
supabase db dump --linked --schema supabase_migrations --use-copy --data-only -f '<encrypted-path>/history_data.sql'
Get-FileHash '<encrypted-path>/roles.sql','<encrypted-path>/schema.sql','<encrypted-path>/data.sql','<encrypted-path>/history_schema.sql','<encrypted-path>/history_data.sql' -Algorithm SHA256
```

The linked ref and output path must be verified before every command; the files contain protected live data. For the **isolated** target, provision a private `PGSERVICEFILE`/`PGPASSFILE` entry named `lumea_rehearsal` pointing to a *different* project, with official PostgreSQL client tools. After reviewing the exported SQL, managed-role conflicts and Vault usage, the [official CLI restore guide](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) supplies this ordered, fail-fast template. It is not safe to run merely because the syntax is valid:

```powershell
# FUTURE ONLY: point exclusively at the newly created isolated rehearsal project.
$env:PGSERVICEFILE = '<private-path>\pg_service.conf'
$env:PGPASSFILE = '<private-path>\pgpass.conf'
psql -X --no-password --dbname='service=lumea_rehearsal' --single-transaction --set=ON_ERROR_STOP=1 --file='<encrypted-path>/roles.sql' --file='<encrypted-path>/schema.sql' --command='SET session_replication_role = replica' --file='<encrypted-path>/data.sql'
# Preserve migration history separately only after checking the target's existing history/schema.
psql -X --no-password --dbname='service=lumea_rehearsal' --single-transaction --set=ON_ERROR_STOP=1 --file='<encrypted-path>/history_schema.sql' --file='<encrypted-path>/history_data.sql'
```

The target service mapping, actual SQL, extensions, Auth/Storage customizations, history import and Supabase Vault encryption-root-key limitations require expert review before execution. A manual logical restore does not automatically copy the encryption root key. If the archive requires undocumented edits or privileged operations, pause; do not weaken grants or skip errors just to obtain a green rehearsal. The templates are preparation, not a claim of readiness.

For a future authorized operation, prefer `node scripts/ops/v2_2_recovery/recovery.mjs export|verify|restore` over manually typing the sequence. Read `recovery.mjs` options and set the opt-in variables **only after** the separate owner approval. The script cannot decide business/privacy authorization, guarantee a full Supabase clone, or validate Vault root-key portability; the operator must still inspect the export and rehearse Auth/service behavior. Keep PostgreSQL service/password files and all backup outputs outside Git.

For the rehearsal: create a new restricted Supabase project with compatible PostgreSQL major version and capacity greater than the observed ~17.4 MB database plus WAL/index/workspace overhead; verify target ref and access controls before receiving any PII. Inventory the archive's roles/schema/data, extensions, `supabase_migrations`, Auth requirements and possible Vault usage. Record source count/checksum baselines **without exporting private rows into the report**. Restore only to that target following the selected official method, halting on errors; verify roles/grants/RLS/function definitions, migration versions, Product/variant/media counts, Auth compatibility, representative public reads and a non-mutating access check. If Vault data is used, show that encrypted values remain usable or explicitly fail A. Compare counts and scoped hashes, archive SHA-256, and Recovery Time Objective; document expected Recovery Point Objective between exports. Isolate network access, prevent emails/webhooks/third-party calls from the rehearsal, and do not point the storefront at it. Retain encrypted archive only under an owner-approved period; remove the disposable environment and local copies **only under a separate cleanup authorization**, recording what was removed. Synthetic fixture restoration can validate tooling but cannot satisfy this live-production recovery gate.

### Option B — managed route, future approval only

Owner approves cost and plan change separately. After upgrade, verify the *first actual completed* backup and its timestamp/retention; a plan badge is not backup evidence. Restore that backup to a new project (paid feature), not over production; verify source backup ID, target project ref, roles/grants/Auth/encryption behavior, data counts and service configuration. Confirm the cost of the clone and delete/retention process before creation. PITR is optional if the owner accepts daily-backup data-loss exposure; if that exposure is unacceptable, assess PITR cost and compute prerequisites separately. Storage and non-database settings need their own work under either option. [Supabase backup coverage](https://supabase.com/docs/guides/platform/backups), [clone scope](https://supabase.com/docs/guides/platform/clone-project).

### Storage is an independent recovery gate

Read-only production inventory: `public-media` is public and has 51 `storage.objects` records with known metadata sizes totaling 11,467,507 bytes (~10.94 MiB); `private-uploads` is private and currently has zero objects. Both buckets allow JPEG/PNG/WebP/AVIF. Published Products have exactly **10 active `product_images` rows and 10 distinct media assets**; each is the primary image in the scoped query. All ten had matching Storage metadata (1,872,536 bytes total), and all ten catalog images decoded after lazy-loading in a bounded live-browser check. A scoped backup of **all 10 active Published Product images** was completed outside the repo: 10/10 objects, 1,872,536 bytes, HTTP MIME and byte sizes matched metadata, JPEG signatures and SHA-256 verified from the saved files. The local manifest records each public key and hash without credentials. The remaining 41 public objects were not downloaded; no private assets were touched. Current Product-image availability and this partial public-media backup are **not** full Storage recovery; no object restore has been tested.

For a future approved full export, enumerate every bucket/key into a private manifest with metadata version, MIME, byte size, object checksum, source bucket visibility and access rules. Download all object bytes to encrypted owner-controlled storage using the official Storage API/CLI or a separately approved S3 client; verify each byte count and SHA-256 after download, reconcile 51/0 counts and the 10 Product references, and avoid treating `storage.objects` rows as file contents. In an isolated restore, recreate bucket settings/policies first, then upload bytes to **matching keys without overwrite**, verify checksums and representative authorized GET/decoding, and only then allow Product/media references to be exposed. Recheck private-bucket policy before any private object restore. Apart from the 10 scoped public Product-image downloads above, no full or privileged object export, upload, or restore has been authorized or done. [Storage download methods](https://supabase.com/docs/guides/storage/management/download-objects); [database backups exclude object bytes](https://supabase.com/docs/guides/platform/backups).

## Gate B — business and content approval

Owner makes one consolidated decision on: (1) Pink Garden's three variant prices and Published state, plus the rest of the public price list; (2) live contact phone/email/Instagram accuracy; (3) delivery zones, 30k–60k fees, windows, pickup and same-day capacity; (4) enabled payment methods and no copy promising disabled bank transfer; (5) final six VI/KO policies, including returns/refunds and substitution commitments, with appropriate business/legal review; (6) real Product imagery and the fact that staging QA PNGs/identities/Products are **not** production assets. Check that public copy describes actual options and that Checkout remains authoritative for availability, fees and final eligibility. Owner approves final production policy text separately from migration and deployment. Do not seed staging content into production.

## Gate C — exact migration preflight and explicit migration authorization

Four **local** files were SHA-256 checked against the approved baseline. Expected ordered set:

| Version/file | SHA-256 |
| --- | --- |
| `20261016090000_v2_2_commercial_content.sql` | `085F3CC713098E39514F08A16BCD5F7BF4984199E419BA1945FBA59075A26D6C` |
| `20261016090100_v2_2_atomic_product_guidance.sql` | `3E9FC55C30CC5BF200FCF7A4D70CFA95FB8A0B14371AB0F2962EE095BA24E5E7` |
| `20261017090000_v2_2_preserve_omitted_product_guidance.sql` | `4445168134858D1BA74D575E524A2A97F13BF38A8A1F275D254C7CA6264AAE9A` |
| `20261018090000_v2_2_normalize_product_guidance_ascii_whitespace.sql` | `20DA6668044273905F6D290C58065ADBD40792A044C021D17D7C78D7A42D482C` |

**Dry-run status: BLOCKED / NOT EXECUTED.** In a separate detached worktree at the verified feature HEAD, CLI `2.120.0` linked to `nihhynwvltttadlfatdm`, and `migration list --linked` showed 30 local/remote matches through `20261008090500` plus **exactly the four local-only V2.2 versions** above. However the CLI printed `Initialising login role...` during this nominally read-only list. A read-only `pg_roles` query subsequently found `cli_login_postgres` with LOGIN; whether that role pre-existed is unknown. Because this authentication path may create or modify a temporary database role, **do not run `db push --linked --dry-run` under the present no-production-write authorization**. The temporary worktree was unlinked locally and removed; the main feature checkout stayed linked to staging and was not changed. A future preflight needs owner approval for the CLI's role-initialization side effect, or an operator-provided official database-password flow that avoids it, stored securely outside chat. Then capture redacted dry-run output and require exactly four pending versions, in order, with no seed, repair, missing prior version or drift. A correct dry-run does not waive Gate A or B. Obtain **specific owner authorization for production migration**, distinct from merge/deployment permission, before applying exactly that set. After apply, read back history, RPC definitions/security attributes/grants/RLS, VI/KO policy tables, V2.1 Checkout compatibility, Product guidance and public Draft visibility without writing Orders or owner Products. Halt on any discrepancy; do not attempt automatic migration reversal or repair.

## Gate D — production policy content

After schema and security read-back PASS, owner separately approves exact production VI/KO wording and an actual ADMIN publishes six sections through the supported Policy RPC. Verify Site Profile contact first. Publish one section, read back both translations/state and public visibility, then continue one by one. Do not use QA placeholder text or staging operational values. Verify six Published sections and twelve intended translations, PDP same-locale fallback, and no Product/Checkout mutation. Stop on missing copy, wrong channel, role/grant failure or unexpected write; no automatic cleanup.

## Gate E — feature merge, automatic deploy, smoke and handoff

Prepare PR against main only after Gates A–D are satisfied and owner separately authorizes Git delivery. Proposed summary: V2.2 adds Admin-managed VI/KO commercial policies, Product guidance with legacy/whitespace-safe atomic save, and accessible PDP/policy routes; staging acceptance and hosted CI passed; four forward-only migrations were applied and verified separately before frontend rollout. Review the exact 15-commit diff for secrets, fixture promotion and compatibility. GitHub Actions runs quality and local database-security on feature/main; **a push to `main` automatically starts GitHub Pages deployment** after those jobs PASS. PR review/CI and explicit owner **merge/deploy** approval are required; a migration approval is not a merge approval. Confirm GitHub main public variables target production, not staging; do not print publishable or private values. No migration step is embedded in the workflow.

Post-deploy smoke: confirm expected revision and production Supabase ref; `/` and `/ko`, `/flowers`, representative READY/SEASONAL PDPs, `/policies` and `/ko/policies`, all six policy sections and exact locale fallback, image decode, no broken links/console errors, responsive 390/768/1440, Admin read-only policy state, no public Draft access, and Cart/Checkout navigation without creating an Order. Validate real pricing—including owner-approved Pink Garden—and dynamic delivery/payment wording. Record timestamp, commit, checks, owner sign-off and any limitation in release notes.

## Hard stops and incident response

**NO-GO** if backup + isolated restore (including Storage) is not verified; prices/business copy are unapproved; target ref/history/hash/dry-run differs; security/RPC grants drift; CI/PR review fails; deployment variables point elsewhere; or any unplanned data change occurs. Freeze further writes, preserve logs, version hashes, read-only snapshots and failed query/result. Do not reset or repair history speculatively. A frontend failure may be addressed by a reviewed revert/fix-forward and fresh CI/deploy; its prior GitHub Pages artifact is not a database rollback. A database failure requires a reviewed forward-fix or a separately authorized restore from a **verified** backup, with explicit downtime and data-loss decision. Never assume a forward-only migration can be safely reversed. Align with [Owner Runbook](OWNER_RUNBOOK.md) and [Workflow](WORKFLOW.md).

## Owner approvals still required

1. Choose A or B and authorize its actual data export **or** paid-plan/clone spend; approve protected backup destination, PII handling, isolated target, retention and later cleanup. No current recovery path is PASS.
   The executable next recovery action is a separate approval for a protected production logical export (or managed-plan purchase) and a fresh isolated restore target; synthetic results alone do not authorize it.
2. Approve or correct Pink Garden and other business pricing, live contact, fulfillment/payment settings, imagery and final VI/KO legal/commercial copy.
3. After recovery proof and exact migration dry-run, authorize **production migration** specifically.
   Before that dry-run, authorize the CLI's possible temporary-login-role side effect **or** provision the database password through the official local secure channel so the CLI need not initialize that role; do not send a password/token in chat.
4. After migration verification, authorize **production policy publication** specifically.
5. After content verification and PR/CI review, authorize **merge/main push and automatic production deploy** specifically; later approve any actual recovery or cleanup operation separately.

**Final current verdict: production V2.2 NO-GO.** Staging PASS and code/CI readiness do not override unverified recovery or pending owner business decisions.
