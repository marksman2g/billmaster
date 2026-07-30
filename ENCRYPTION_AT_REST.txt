# BillMaster encryption-at-rest decision record

**Status:** Verification required before attestation
**Scope:** Plaid data received by BillMaster, including server database, object storage, backups, and browser/device persistence

## Current architecture

- Plaid access tokens are kept in the service-role-only Supabase table and are never returned to the browser.
- Supabase and Plaid provide managed-service encryption at rest; production settings and provider evidence still need to be checked.
- BillMaster persists workspace data in browser storage for offline use. That browser storage is not a substitute for an encrypted financial-data vault.

## Required decision

Before selecting Plaid question 7, either (a) verify encryption at rest for every production storage path and document the provider evidence, or (b) remove/replace local persistence of Plaid-derived financial data with an encrypted design. Do not select the “all consumer data” answer while an unencrypted storage path remains in scope.

## Evidence

Keep the production Supabase encryption/settings evidence, Plaid provider documentation or contract evidence, backup-retention settings, and a decision record covering browser/device storage. This file records the work needed; it does not itself prove the answer is Yes.
