/**
 * Cloud Functions for Budget Tracker.
 *
 * sendMonthlyReports — scheduled on the 1st of each month. For every user
 * who enabled "Email reports" in Settings, builds a summary of last month's
 * income/expenses/top categories from Firestore and emails it.
 *
 * Requires two secrets (Gmail SMTP works with an App Password):
 *   firebase functions:secrets:set SMTP_USER   # e.g. you@gmail.com
 *   firebase functions:secrets:set SMTP_PASS   # app password
 */

const { setGlobalOptions } = require("firebase-functions");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();
setGlobalOptions({ maxInstances: 10 });

const SMTP_USER = defineSecret("SMTP_USER");
const SMTP_PASS = defineSecret("SMTP_PASS");

/** Previous month as YYYY-MM plus a human label. */
function previousMonth() {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const key = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
  const label = prev.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  return { key, label };
}

function money(n) {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function buildHtml(label, income, expenses, topCategories, count) {
  const net = income - expenses;
  const rows = topCategories
    .map(
      ([cat, amt]) =>
        `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;">${cat}</td>` +
        `<td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;">${money(amt)}</td></tr>`,
    )
    .join("");
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;">
    <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:12px;padding:24px;color:#fff;">
      <h1 style="margin:0;font-size:20px;">Budget Tracker — ${label} report</h1>
    </div>
    <div style="padding:20px 4px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:6px 12px;">Income</td><td style="padding:6px 12px;text-align:right;color:#16a34a;font-weight:bold;">${money(income)}</td></tr>
        <tr><td style="padding:6px 12px;">Expenses</td><td style="padding:6px 12px;text-align:right;color:#dc2626;font-weight:bold;">${money(expenses)}</td></tr>
        <tr><td style="padding:6px 12px;">Net</td><td style="padding:6px 12px;text-align:right;font-weight:bold;color:${net >= 0 ? "#16a34a" : "#dc2626"};">${money(net)}</td></tr>
        <tr><td style="padding:6px 12px;">Transactions</td><td style="padding:6px 12px;text-align:right;">${count}</td></tr>
      </table>
      ${
        rows
          ? `<h3 style="font-size:14px;margin:18px 12px 8px;">Top spending categories</h3>
             <table style="width:100%;border-collapse:collapse;font-size:14px;">${rows}</table>`
          : ""
      }
      <p style="font-size:12px;color:#888;margin:20px 12px 0;">
        You're receiving this because email reports are enabled in your
        Budget Tracker settings. Turn them off in Settings to unsubscribe.
      </p>
    </div>
  </div>`;
}

exports.sendMonthlyReports = onSchedule(
  {
    schedule: "0 8 1 * *", // 08:00 UTC on the 1st of each month
    timeZone: "UTC",
    secrets: [SMTP_USER, SMTP_PASS],
  },
  async () => {
    const db = admin.firestore();
    const { key: monthKey, label } = previousMonth();

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: SMTP_USER.value(), pass: SMTP_PASS.value() },
    });

    // users/{uid} docs are "virtual" (subcollections only), so list refs
    const userRefs = await db.collection("users").listDocuments();
    logger.info(`Monthly report run for ${monthKey}: ${userRefs.length} users`);

    let sent = 0;
    for (const userRef of userRefs) {
      try {
        const prefsSnap = await userRef
          .collection("settings")
          .doc("preferences")
          .get();
        const prefs = prefsSnap.data();
        if (!prefs || !prefs.emailReports || !prefs.reportEmail) continue;

        const txSnap = await userRef
          .collection("transactions")
          .where("date", ">=", `${monthKey}-01`)
          .where("date", "<=", `${monthKey}-31`)
          .get();
        if (txSnap.empty) continue;

        let income = 0;
        let expenses = 0;
        const byCategory = {};
        txSnap.forEach((docSnap) => {
          const t = docSnap.data();
          const amount = Number(t.amount) || 0;
          if (t.type === "income") income += amount;
          else {
            expenses += amount;
            byCategory[t.category] = (byCategory[t.category] || 0) + amount;
          }
        });
        const topCategories = Object.entries(byCategory)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);

        await transporter.sendMail({
          from: `"Budget Tracker" <${SMTP_USER.value()}>`,
          to: prefs.reportEmail,
          subject: `Your ${label} budget report`,
          html: buildHtml(label, income, expenses, topCategories, txSnap.size),
        });
        sent++;
      } catch (err) {
        logger.error(`Report failed for ${userRef.id}`, err);
      }
    }
    logger.info(`Monthly reports sent: ${sent}`);
  },
);
