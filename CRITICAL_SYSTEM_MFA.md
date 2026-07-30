# Critical-system MFA setup record

**Status:** Setup checklist; not an attestation that MFA is enabled
**Scope:** Plaid Dashboard, Supabase Dashboard, GitHub, hosting, and any administrator account that can access consumer financial data or production secrets

## Required control

Enable phishing-resistant MFA (passkey or hardware security key) wherever the provider supports it. If a provider cannot support that method, use its strongest available authenticator-based MFA and keep recovery codes offline. Require MFA for every administrator and remove unused administrator accounts.

## Evidence checklist

- Plaid production account: MFA enabled and tested.
- Supabase organization/project administrators: MFA enabled and tested.
- GitHub repository administrators: MFA enabled and tested.
- Hosting/DNS and secret-management administrators: MFA enabled and tested.
- A dated access review lists the reviewer, accounts checked, changes made, and next review date.

## Questionnaire boundary

Do not choose “Yes” for Plaid question 5 until the settings pages or provider audit exports show that this control is operating for every critical system. A policy document or a planned setup is not evidence of deployment.
