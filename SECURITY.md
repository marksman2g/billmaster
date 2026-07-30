# BillMaster Information Security Policy

**Status:** Draft for owner adoption
**Version:** 1.0
**Scope:** BillMaster, its Supabase project, and its Plaid integration.

This policy is the operating baseline for protecting the financial and scheduling information that BillMaster uses to show where a user's money and time go. It is not, by itself, proof that every control is already operating. The owner must adopt the policy, configure the external services, perform the recurring checks, and keep the evidence described below before attesting to a mature security program.

## 1. Information classification

- **Restricted:** Plaid access tokens, Supabase service-role keys, function secrets, authentication credentials, and recovery codes. These stay in server-side secret storage and are never committed to the repository, placed in browser code, or pasted into chat.
- **Private:** Bank and card account metadata, balances, transactions, bills, liabilities, schedules, notes, and workspace data. Access is limited to the signed-in owner and the server operations needed to provide the requested feature.
- **Public:** Product documentation and marketing content that contains no customer or secret data.

## 2. Access control

BillMaster uses least privilege. Supabase Row Level Security (RLS) limits workspace, connection, liability, and private-media rows to their owner. Plaid access tokens are stored in the service-role-only token table and are handled by the Plaid Edge Function; browser clients do not receive that table's grants.

Before production, the owner must:

1. Enable multi-factor authentication for Plaid, Supabase, GitHub, and any other administrator account.
2. Keep separate administrator and everyday-use accounts where the provider supports it.
3. Review administrator, function, database, and repository access at least quarterly and remove access that is no longer needed.
4. Rotate secrets after a suspected disclosure, personnel change, or provider-directed incident.

## 3. Data and network protection

BillMaster sends requests over HTTPS/TLS. It does not ask users to give BillMaster their bank password or full card number. Plaid Link collects the institution credentials, and the server exchanges the short-lived public token for a Plaid access token.

Supabase and Plaid provide encryption at rest for their managed services; the owner must verify the production project's settings and retain the provider evidence. Local exports and downloaded backups are private data and must be stored only in a protected location.

## 4. Secure development and vulnerability management

Every release should record the result of:

- `node --check app.js`
- `node smoke-test.js`
- device or browser QA for the affected flow
- `npm audit --audit-level=high` (or a documented reason and remediation plan when the check cannot run)

The owner reviews dependencies and hosting/function configuration before production releases, prioritizes high-severity findings, and keeps a short remediation log with the finding, owner, due date, and resolution.

The repository workflow in `SECURITY_SCANS.md` runs the locked-dependency audit and application checks on pushes, pull requests, and weekly. This does not replace endpoint and production-asset scanning; those scanners, a patching SLA, and end-of-life monitoring still need to be enabled and evidenced before claiming the strongest vulnerability-management answer.

## 5. Incident response

When a secret, account, or private-data control may be compromised, the owner will: (1) stop or disable the affected integration, (2) revoke and rotate exposed credentials, (3) preserve relevant logs and timestamps, (4) assess affected users and providers, (5) make any required notifications, and (6) document the root cause and corrective action. The owner keeps an incident contact and escalation path outside the application.

## 6. Privacy, consent, retention, and deletion

BillMaster shows a data-use notice and records consent before Plaid Link opens. Users choose the institution and accounts in Plaid Link, and imported recurring charges first go to Review Inbox rather than silently becoming bills.

The owner must publish a privacy-policy URL that accurately describes Plaid, Supabase, data use, user rights, and support contact information. `PRIVACY.md` is the prepared draft; it must be reviewed, given a monitored contact, published, and kept aligned with production. `RETENTION_AND_DELETION.md` defines the proposed schedule and evidence. The deployed `delete_user_data` action and the daily `supabase/plaid-retention.sql` job must enforce retention periods for raw transaction data, imported workspace data, logs, backups, and Plaid connections. Provide a documented export and deletion path, including deletion of the corresponding provider connection and server-side token when a user disconnects or deletes their workspace.

## 7. Continuous improvement

At least monthly, the owner reviews access, incidents, vulnerabilities, backups, consent/privacy language, and outstanding remediation items. At least quarterly, the owner reviews this policy and records the date, reviewer, changes, and next actions. A policy revision is required when the Plaid flow, data types, providers, or legal obligations materially change.

## Evidence checklist

| Control | Current state | Evidence to keep |
| --- | --- | --- |
| Supabase RLS and private media rules | Implemented in `supabase/schema.sql`; verify in the production project | SQL migration result and policy review |
| Server-only Plaid token storage | Implemented in the Edge Function/schema | Function deploy record and table grants |
| Consent before Plaid Link | Implemented in BillMaster | QA screenshot/test result and consent wording version |
| MFA for administrator/provider accounts | Owner action required | Provider security settings or audit export |
| Vulnerability scanning and patching cadence | Owner action required | Scan output and remediation log |
| Privacy policy URL and support contact | Owner action required | Published URL and revision history |
| Retention, export, and deletion procedure | Edge Function and daily scheduled job deployed; evidence and owner/legal review outstanding | Scheduled-job result, test deletion, provider retention settings, and quarterly review |
| Monthly/quarterly control review | Owner action required | Dated review notes and action list |

## Plaid questionnaire boundary

This document and the code changes support option 1, but they do not make option 1 truthful automatically. Select the documented-policy/operational-program answer only after the owner has adopted this policy and can show that the required controls are operating and being reviewed. If any required control is still only planned, keep the questionnaire answer truthful and record the gap instead of guessing.
