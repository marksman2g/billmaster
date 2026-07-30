# BillMaster Privacy Notice

**Status:** Prepared for owner and legal review
**Last updated:** 2026-07-21

BillMaster is designed around one question: where does your time go, and where does your money go? This notice explains the information the app uses to answer it. Publish this notice at the application's public privacy-policy URL only after the owner reviews the wording, adds a support contact, and confirms that it matches the production configuration and applicable law.

## Information BillMaster uses

Depending on the features you use, BillMaster may store:

- account and sign-in details for your BillMaster workspace;
- bills, subscriptions, transactions, balances, liabilities, schedules, notes, contacts, and goals that you enter or import;
- Plaid connection metadata and the bank data returned for the accounts you choose;
- consent and sync timestamps, error/status information, and security records needed to operate the service.

BillMaster does not ask for or store your bank username, bank password, or full card number. Plaid Link collects institution credentials, and Plaid returns the authorized financial data through the secure server connection.

## How information is used

BillMaster uses this information to provide the requested calendar, bill, spending, income, and Time & Money views; stage imported recurring charges for review; sync the accounts you authorize; protect the service; troubleshoot failures; and honor export or deletion requests.

BillMaster does not sell financial data. Do not add information that you do not want stored in your private workspace.

## Service providers and protection

Plaid provides the bank-linking and financial-data service. Supabase provides authentication, database, storage, and server-function infrastructure. Plaid access tokens are kept in server-only secret storage; Row Level Security limits workspace and connection records to the signed-in owner. Requests use HTTPS/TLS. Provider encryption, access, retention, and incident terms still apply and must be reviewed before production.

## Your choices

You choose which institution and accounts to connect in Plaid Link. You can stop using a connection, export your workspace, or request deletion through the support process published with the production application. Imported recurring charges are placed in Review Inbox for your review rather than silently becoming bills.

Before a Plaid connection opens, BillMaster shows a data-use notice and records your consent. If you do not consent, Plaid Link does not open.

## Retention and deletion

The owner will publish and enforce retention periods for raw Plaid data, imported workspace data, logs, backups, and connection tokens. The schedule and enforcement steps are in `RETENTION_AND_DELETION.md`; the deployed `delete_user_data` action removes the corresponding BillMaster workspace data, Plaid connection metadata, private media, and server-side access token, subject to a documented legal or security hold. The owner must still complete the provider-retention check, approve a test deletion, and record the first periodic review before attesting that the full policy is compliant and reviewed.

## Contact and changes

Privacy/support contact: `computer.fieldtech@gmail.com`. The owner will review this notice before production, confirm that the contact is monitored, and update it when data types, providers, Plaid flows, or legal obligations materially change.
