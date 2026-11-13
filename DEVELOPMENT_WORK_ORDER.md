# BillMaster development work order

Status updates use part number, step number, and the verification result.

## Part 1. Install on a phone
1. Verify the branch, install manifest, icons, offline shell and baseline on Animal.
2. Add an install action and browser-specific instructions in Sync Center.
3. Verify the mobile install path and offline launch. Track a physical phone separately.

## Part 2. Reminders and texts
1. Present reminders and record acknowledgment per task occurrence.
2. Add Focus Mode and a daily reminder summary.
3. Connect closed-app push and a 15-minute, opt-in fallback for important alerts.
4. Enforce SMS balances, spending caps and verified delivery accounting before enabling paid sends.

## Part 3. Plan time and money
1. Show bills and scheduled task time for the week, month, quarter and year.
2. Include recurring work and make missing time estimates visible.
3. Reconcile the existing private Gmail intake with the Review Inbox for daily bill and task scanning.
4. Verify behavior with synthetic records and record remaining activation steps.

## Verified checkpoint on Animal

Part 1, steps 1-3 passed on a 412 by 915 Chromium viewport. The manifest and installability checks reported zero errors, and the dashboard loaded offline. Physical handset installation is open.

Part 2, steps 1-2 passed occurrence acknowledgment and Focus Mode tests. Daily summary is available in Review Inbox. Next is step 3, closed-app push and timed SMS fallback. SMS consent, provider delivery, balances and billing are outstanding.

Part 3, steps 1-2 have a tested Budget Analytics view for upcoming saved bills and task occurrences. The private Gmail adapter was located on Animal. Daily scanning and the live inbox connection are outstanding. All 81 behavioral tests passed on Animal.
