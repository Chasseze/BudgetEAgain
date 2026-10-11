# Monthly report delivery

The report runs at 08:00 UTC on the first of each month and covers the previous
month. Recipients must have reports enabled, an exact verified report email,
and at least one transaction in the reported month.

Gmail authentication uses Secret Manager's SMTP_USER and SMTP_PASS. SMTP_PASS
must be a Gmail App Password for the SMTP_USER account. Formatting spaces are
removed before authentication. Never commit passwords or paste them into logs.

To rotate credentials, use:

```sh
firebase functions:secrets:set SMTP_PASS --project budget-expense-app-c8262
firebase deploy --only functions:sendMonthlyReports,functions:requestReportEmailVerification --project budget-expense-app-c8262
```

Functions bind specific secret versions; saving a new version alone does not
update the running function. Verify SMTP authentication before retrying delivery.

The report job verifies SMTP authentication before processing users, rejects
failed runs, and retries up to three times with backoff. A server-only
monthlyReportDeliveries collection records successful sends and claims active
deliveries for ten minutes. Retries use the original scheduleTime to choose
the reporting month. Logs contain run totals and safe error codes.

The ledger prevents normal retry duplicates. SMTP and Firestore cannot commit
atomically: a process crash after SMTP acceptance but before recording success
can still cause a duplicate after the lease expires. Gmail acceptance also does
not prove inbox delivery.

Do not blindly run the scheduler to backfill an older month: manual executions
use the current schedule time and target the preceding month. Check the ledger
and intended recipients before any backfill.

Run regression tests with:

```sh
node --test functions/test/monthly-reports.test.js
```
