# Plaid security questionnaire answer key

**Updated:** 2026-07-24
**Use:** Preparation and evidence review only. Do not submit an answer that describes a control that is not operating in production.

## Answers 1–11

| # | Choose in Plaid | Current status and evidence | Before submitting a stronger answer |
| --- | --- | --- | --- |
| 1 | **Tony De Sisso — `computer.fieldtech@gmail.com`** | Use the security contact already entered in the questionnaire. | Confirm that this mailbox is monitored; replace it with a monitored group mailbox if needed. |
| 2 | **Yes — documented policy, procedures, and an operational information-security program that is continuously matured** | `SECURITY.md` documents the baseline; RLS, server-only Plaid tokens, the consent gate, scan workflow, and review procedure are implemented or prepared. | Attach `SECURITY.md`, adopt the policy, and retain dated review/remediation evidence. |
| 3 | **A defined and documented access-control policy is in place** and **Role-based access control (RBAC)** | `SECURITY.md` defines least privilege. Supabase RLS limits owner rows, and Plaid tokens are service-role-only. | Do not select periodic audits, automated employee deprovisioning, zero trust, centralized workforce IAM, or non-human OAuth/TLS controls without separate evidence. |
| 4 | **No — we do not currently deploy MFA on consumer-facing applications** | BillMaster does not yet complete an MFA enrollment/challenge before Plaid Link opens. | Enable Supabase MFA enrollment and challenge/verification, then prove Plaid Link is blocked for an AAL1 session. |
| 5 | **No — MFA is not yet verified for every critical system** | MFA settings for Plaid, Supabase, GitHub, hosting, and secret-management administrators have not been evidenced. | Enable and test MFA for every critical administrator account; keep dated settings evidence and recovery-code procedures. |
| 6 | **Yes** | BillMaster, Supabase, and Plaid requests use HTTPS/TLS. | Keep a dated production configuration check. |
| 7 | **No until every storage path is verified encrypted at rest** | Supabase/Plaid managed storage is expected to provide encryption at rest, but BillMaster also persists workspace data in browser storage and that path is not yet covered by an encryption decision. | Verify provider/database/storage/backups and either encrypt local financial-data persistence or remove Plaid-derived data from local persistence. |
| 8 | **None of the above** (current truthful choice) | GitHub Actions runs dependency audit, syntax, and smoke checks. It does not yet scan every employee/contractor machine and production asset. | Add endpoint and production-asset scanning, a patching SLA, end-of-life monitoring, and dated remediation evidence. |
| 9 | **Yes — this policy is displayed to end-users within the application** | BillMaster displays its privacy notice before Plaid consent. Source: `PRIVACY.md`. | Review and publish the final privacy notice at the production privacy URL. |
| 10 | **Yes** | BillMaster requires an explicit consent checkbox before Plaid Link and records a consent timestamp. | Keep the consent wording/version and QA evidence with the release record. |
| 11 | **Conditional Yes — select Yes only after the remaining evidence is attached and reviewed** | `plaid-sync` is deployed with `delete_user_data` and `purge_expired_data`; the daily `billmaster-plaid-retention` cron job is active; zero expired workspaces were found at the deployment check. | Attach `RETENTION_AND_DELETION.md`, run and record an approved test deletion, verify provider backup/log retention, and record the first quarterly review. Until those are complete, choose No rather than attesting prematurely. |

## Attachments

- Q2: `SECURITY.md`
- Q3: `SECURITY.md`
- Q11: `RETENTION_AND_DELETION.md` and, if useful, `RETENTION_DEPLOYMENT_2026-07-21.md`
- Q9: `PRIVACY.md` if Plaid requests supporting documentation

## Fast selection sequence

1. Complete Q1–Q3 with the exact answers above and attach `SECURITY.md` where requested.
2. Choose Yes for Q6, Q9, and Q10.
3. Keep Q4, Q5, Q7, and Q8 at their current truthful answers.
4. Finish the three Q11 evidence items, then change Q11 to Yes and attach the retention documents.
5. Save progress. Do not click Submit until the owner has reviewed every attestation and all attachments are accepted by Plaid.

## Copy-and-paste explanations for answers that are No or None

Use the numbered response in the matching Plaid explanation box. These responses are written to be accurate about the current state; they do not claim that a planned control is already operating.

### 4. Consumer-facing MFA - explanation

BillMaster does not currently require multi-factor authentication (MFA) on its consumer-facing web application before Plaid Link is displayed. BillMaster does require an explicit privacy-consent step before Plaid Link opens, but consumer MFA enrollment and challenge verification are not yet enforced. We will update this answer after MFA enrollment, challenge verification, and blocking of an unauthenticated session have been tested in production.

### 5. Critical-system MFA - explanation

BillMaster has not yet completed and documented MFA for every critical system that can store or process consumer financial data or access production secrets. The remaining evidence covers administrator access to Plaid, Supabase, GitHub, hosting/DNS, and secret-management systems. We are completing provider MFA setup and will update this answer after dated settings evidence, recovery procedures, and an access review are retained.

### 7. Encryption at rest - explanation

BillMaster has not yet verified encryption at rest for every production storage path that may contain Plaid-derived consumer data, including the database, object storage, backups, logs, and browser/device persistence. Supabase and Plaid managed encryption is expected, but provider verification and the decision about local browser persistence are still outstanding. We will select Yes only after every in-scope path is verified and documented, or the local financial-data path is removed or replaced with an encrypted design.

### 8. Vulnerability-management controls - explanation

BillMaster currently runs dependency, JavaScript syntax, and application smoke checks in GitHub Actions. It does not yet scan every employee or contractor device and production asset, enforce a defined patching service-level agreement, and monitor end-of-life software with retained remediation evidence. Therefore, none of the listed vulnerability-management practices can yet be attested as fully in place. The endpoint and production-asset scanning work is a documented remediation item.

### 11. Retention and deletion - explanation

The retention and deletion policy and its automated enforcement have now been created and deployed: the delete_user_data action is live and the billmaster-plaid-retention job runs daily. We are selecting No for now because the approved test deletion, provider backup and log-retention verification, first periodic review, and owner/legal compliance review are not yet documented. This is a temporary evidence gap, not an absence of the policy or deletion workflow. We will change this answer to Yes after those checks are completed and retained.

## What has changed since the prior answer key

- Q11 moved from "implementation prepared" to "enforcement deployed." The supporting records are `RETENTION_AND_DELETION.md` and `RETENTION_DEPLOYMENT_2026-07-21.md`. The Plaid answer should remain No until the evidence items listed in the Q11 explanation are complete.
- Q4, Q5, Q7, and Q8 are still No/None because the required production evidence has not been completed. No other No answer can honestly be upgraded based on the work completed so far.
- Q6, Q9, and Q10 remain Yes. Q9 still needs a public privacy-policy URL; do not paste a local file path into Plaid.
