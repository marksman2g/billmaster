# Security scan procedure

BillMaster now runs a locked-dependency audit, JavaScript syntax check, and smoke test on pushes, pull requests, and every Monday through GitHub Actions at `.github/workflows/security-checks.yml`.

This is a concrete application/dependency control, but it does not by itself prove that employee or contractor machines and every production asset are scanned. Before selecting the strongest Plaid vulnerability-management answer, the owner must add and operate an endpoint/asset scanner, define the patching SLA, monitor end-of-life software, and retain dated scan/remediation evidence.

For each finding, record the severity, affected asset, owner, due date, mitigation, and closure evidence in the security review log described in `SECURITY.md`.
