/**
 * Cloud Functions for Budget Tracker.
 *
 * sendMonthlyReports — scheduled on the 1st of each month. For every user
 * who enabled "Email reports" in Settings, builds a rich summary of last
 * month's activity from Firestore and emails it: income/expenses/top
 * categories, a comparison against the prior month, a spending heatmap,
 * a budget history trend, and a look-ahead at upcoming recurring expenses.
 *
 * Requires two secrets (Gmail SMTP works with an App Password):
 *   firebase functions:secrets:set SMTP_USER   # e.g. you@gmail.com
 *   firebase functions:secrets:set SMTP_PASS   # app password
 */

const { setGlobalOptions } = require("firebase-functions");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

admin.initializeApp();
setGlobalOptions({ maxInstances: 10 });

const SMTP_USER = defineSecret("SMTP_USER");
const SMTP_PASS = defineSecret("SMTP_PASS");

// Mirrors src/config/constants.ts DEFAULT_BUDGET_LIMIT (functions/ is a
// standalone Node package and can't import from the app bundle).
const DEFAULT_BUDGET_LIMIT = 1000;

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function createMailTransport() {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: SMTP_USER.value(), pass: SMTP_PASS.value() },
  });
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value) {
  return /^\S+@\S+\.\S+$/.test(value);
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function toDateString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function monthKeyOf(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabelOf(date, style = "long") {
  return date.toLocaleDateString("en-US", { month: style, year: "numeric" });
}

/** Previous month (relative to now) as YYYY-MM plus a human label. */
function previousMonth() {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { date: prev, key: monthKeyOf(prev), label: monthLabelOf(prev) };
}

// ---------------------------------------------------------------------------
// Recurring-transaction projection (ported from src/utils/recurring.ts)
// ---------------------------------------------------------------------------

function generateOccurrenceDates(anchor, freq, windowStart, windowEnd, maxCount = 400) {
  const [ay, am, ad] = anchor.split("-").map(Number);
  if (!ay || !am || !ad) return [];

  const dates = [];
  for (let i = 1; i <= maxCount; i++) {
    let date;
    if (freq === "weekly") {
      date = toDateString(new Date(ay, am - 1, ad + 7 * i));
    } else if (freq === "monthly") {
      const absMonth = am - 1 + i;
      const y = ay + Math.floor(absMonth / 12);
      const m = ((absMonth % 12) + 12) % 12;
      date = toDateString(new Date(y, m, Math.min(ad, daysInMonth(y, m))));
    } else {
      const y = ay + i;
      date = toDateString(new Date(y, am - 1, Math.min(ad, daysInMonth(y, am - 1))));
    }
    if (date > windowEnd) break;
    if (date >= windowStart) dates.push(date);
  }
  return dates;
}

/** Latest transaction for each recurring series. */
function getRecurringSeries(transactions) {
  const series = new Map();
  for (const t of transactions) {
    if (!t.isRecurring || !t.recurringFrequency) continue;
    const amount = Number.isInteger(t.amountCents) ? t.amountCents / 100 : Number(t.amount) || 0;
    const key = t.recurringSeriesId || `${t.type}|${t.category}|${t.description}|${amount}|${t.recurringFrequency}`;
    const existing = series.get(key);
    if (!existing || t.date > existing.date) series.set(key, t);
  }
  return [...series.values()];
}

/** Occurrences falling within [windowStart, windowEnd], inclusive. */
function projectUpcoming(transactions, windowStart, windowEnd) {
  const upcoming = [];
  for (const anchor of getRecurringSeries(transactions)) {
    const dates = generateOccurrenceDates(anchor.date, anchor.recurringFrequency, windowStart, windowEnd);
    dates.forEach((date) => {
      upcoming.push({
        type: anchor.type,
        amount: Number.isInteger(anchor.amountCents)
          ? anchor.amountCents / 100
          : Number(anchor.amount) || 0,
        category: anchor.category,
        description: anchor.description,
        date,
      });
    });
  }
  return upcoming.sort((a, b) => a.date.localeCompare(b.date));
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

function aggregateMonth(transactions, monthKey) {
  let income = 0;
  let expenses = 0;
  let count = 0;
  const byCategory = {};
  for (const t of transactions) {
    if (!t.date || !t.date.startsWith(monthKey)) continue;
    // amountCents is canonical for new transactions; amount is retained only
    // as a backwards-compatible read path for existing data.
    const amount = Number.isInteger(t.amountCents)
      ? t.amountCents / 100
      : Number(t.amount) || 0;
    count++;
    if (t.type === "income") {
      income += amount;
    } else {
      expenses += amount;
      byCategory[t.category] = (byCategory[t.category] || 0) + amount;
    }
  }
  return { income, expenses, count, byCategory };
}

function heatColor(amount, maxAmount) {
  if (amount === 0) return "#f3f4f6";
  const ratio = Math.min(amount / Math.max(maxAmount, 1), 1);
  if (ratio < 0.2) return "#d1fae5";
  if (ratio < 0.4) return "#6ee7b7";
  if (ratio < 0.6) return "#f59e0b";
  if (ratio < 0.8) return "#f97316";
  return "#ef4444";
}

// ---------------------------------------------------------------------------
// HTML rendering
// ---------------------------------------------------------------------------

function money(n, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
  }
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

function sectionHeading(text) {
  return `<h3 style="font-size:14px;margin:22px 12px 8px;color:#111;">${text}</h3>`;
}

function buildSummaryHtml(income, expenses, count, currency) {
  const net = income - expenses;
  return `
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:6px 12px;">Income</td><td style="padding:6px 12px;text-align:right;color:#16a34a;font-weight:bold;">${money(income, currency)}</td></tr>
      <tr><td style="padding:6px 12px;">Expenses</td><td style="padding:6px 12px;text-align:right;color:#dc2626;font-weight:bold;">${money(expenses, currency)}</td></tr>
      <tr><td style="padding:6px 12px;">Net</td><td style="padding:6px 12px;text-align:right;font-weight:bold;color:${net >= 0 ? "#16a34a" : "#dc2626"};">${money(net, currency)}</td></tr>
      <tr><td style="padding:6px 12px;">Transactions</td><td style="padding:6px 12px;text-align:right;">${count}</td></tr>
    </table>`;
}

function buildTopCategoriesHtml(byCategory, currency) {
  const rows = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  if (rows.length === 0) return "";
  const trs = rows
    .map(
      ([cat, amt]) =>
        `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;">${escapeHtml(cat)}</td>` +
        `<td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;">${money(amt, currency)}</td></tr>`,
    )
    .join("");
  return `${sectionHeading("Top spending categories")}
    <table style="width:100%;border-collapse:collapse;font-size:14px;">${trs}</table>`;
}

/** Signed delta as a colored "+$X (▲12%)" / "−$X (▼8%)" fragment. */
function deltaFragment(curr, prev, goodDirection, currency) {
  const diff = curr - prev;
  if (diff === 0) return `<span style="color:#888;">no change</span>`;
  const pct = prev !== 0 ? Math.abs((diff / prev) * 100).toFixed(0) : null;
  const up = diff > 0;
  const good = up ? goodDirection === "up" : goodDirection === "down";
  const color = good ? "#16a34a" : "#dc2626";
  const arrow = up ? "▲" : "▼";
  const pctText = pct !== null ? ` (${arrow}${pct}%)` : ` (${arrow} new)`;
  return `<span style="color:${color};font-weight:bold;">${up ? "+" : "−"}${money(Math.abs(diff), currency)}${pctText}</span>`;
}

function buildComparisonHtml(reportLabel, priorLabel, reportAgg, priorAgg, currency) {
  const categorySet = new Set([
    ...Object.keys(reportAgg.byCategory),
    ...Object.keys(priorAgg.byCategory),
  ]);
  const categoryDeltas = [...categorySet]
    .map((cat) => {
      const curr = reportAgg.byCategory[cat] || 0;
      const prev = priorAgg.byCategory[cat] || 0;
      return { cat, curr, prev, diff: curr - prev };
    })
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    .slice(0, 5)
    .filter((r) => r.diff !== 0);

  const categoryRows = categoryDeltas
    .map(
      (r) =>
        `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;">${escapeHtml(r.cat)}</td>` +
        `<td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;">${deltaFragment(r.curr, r.prev, "down", currency)}</td></tr>`,
    )
    .join("");

  return `
    ${sectionHeading(`Compared to ${priorLabel}`)}
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:6px 12px;">Income</td><td style="padding:6px 12px;text-align:right;">${deltaFragment(reportAgg.income, priorAgg.income, "up", currency)}</td></tr>
      <tr><td style="padding:6px 12px;">Expenses</td><td style="padding:6px 12px;text-align:right;">${deltaFragment(reportAgg.expenses, priorAgg.expenses, "down", currency)}</td></tr>
      <tr><td style="padding:6px 12px;">Net</td><td style="padding:6px 12px;text-align:right;">${deltaFragment(reportAgg.income - reportAgg.expenses, priorAgg.income - priorAgg.expenses, "up", currency)}</td></tr>
    </table>
    ${
      categoryRows
        ? `<p style="font-size:12px;color:#888;margin:14px 12px 4px;">Biggest category moves</p>
           <table style="width:100%;border-collapse:collapse;font-size:14px;">${categoryRows}</table>`
        : ""
    }`;
}

function buildUpcomingHtml(upcoming, currency) {
  const expenseOnly = upcoming.filter((o) => o.type === "expense").slice(0, 8);
  if (expenseOnly.length === 0) {
    return `${sectionHeading("Upcoming expenses (next 30 days)")}
      <p style="font-size:13px;color:#888;margin:0 12px;">No recurring expenses due in the next 30 days.</p>`;
  }
  const rows = expenseOnly
    .map((o) => {
      const d = new Date(`${o.date}T00:00:00`);
      const dateLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return `<tr>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;white-space:nowrap;">${dateLabel}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;">${escapeHtml(o.description || o.category)}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;">${money(o.amount, currency)}</td>
      </tr>`;
    })
    .join("");
  return `${sectionHeading("Upcoming expenses (next 30 days)")}
    <table style="width:100%;border-collapse:collapse;font-size:14px;">${rows}</table>`;
}

function buildBudgetHistoryHtml(historyRows, currency) {
  const visible = historyRows.filter((r) => r.hasData);
  if (visible.length === 0) {
    return `${sectionHeading("Budget history")}
      <p style="font-size:13px;color:#888;margin:0 12px;">Not enough history yet.</p>`;
  }
  const rows = visible
    .map((r) => {
      const pct = r.budget > 0 ? Math.min(100, (r.spent / r.budget) * 100) : 0;
      const color = r.under ? "#16a34a" : "#dc2626";
      return `<tr>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;white-space:nowrap;">${r.label}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;">
          <div style="background:#e5e7eb;border-radius:4px;height:8px;width:100%;overflow:hidden;">
            <div style="background:${color};height:8px;width:${pct}%;"></div>
          </div>
        </td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;color:${color};font-weight:bold;">${money(r.spent, currency)} / ${money(r.budget, currency)}</td>
      </tr>`;
    })
    .join("");
  return `${sectionHeading("Budget history (last 6 months)")}
    <table style="width:100%;border-collapse:collapse;font-size:13px;">${rows}</table>`;
}

function buildHeatmapHtml(reportDate, dailyTotals) {
  const year = reportDate.getFullYear();
  const monthIndex = reportDate.getMonth();
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const numDays = daysInMonth(year, monthIndex);
  const maxAmount = Math.max(...Object.values(dailyTotals), 1);

  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: numDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const headerCells = DAY_NAMES.map(
    (d) => `<td style="text-align:center;font-size:10px;color:#888;padding:2px;">${d}</td>`,
  ).join("");

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const bodyRows = weeks
    .map((week) => {
      const tds = week
        .map((day) => {
          if (day === null) return `<td style="padding:2px;"></td>`;
          const amount = dailyTotals[day] || 0;
          const bg = heatColor(amount, maxAmount);
          const textColor = amount > 0 ? "#fff" : "#9ca3af";
          return `<td style="padding:2px;">
            <div style="background:${bg};color:${textColor};border-radius:4px;width:28px;height:28px;line-height:28px;text-align:center;font-size:10px;font-weight:600;">${day}</div>
          </td>`;
        })
        .join("");
      return `<tr>${tds}</tr>`;
    })
    .join("");

  const legend = [0, 0.2, 0.4, 0.6, 0.8, 1]
    .map(
      (r) =>
        `<div style="display:inline-block;width:14px;height:14px;border-radius:2px;background:${heatColor(r * maxAmount, maxAmount)};margin:0 2px;"></div>`,
    )
    .join("");

  return `${sectionHeading("Spending heatmap")}
    <table style="border-collapse:collapse;margin:0 auto;">
      <tr>${headerCells}</tr>
      ${bodyRows}
    </table>
    <div style="text-align:right;margin:8px 12px 0;font-size:10px;color:#888;">
      Less ${legend} More
    </div>`;
}

function buildHtml({
  reportLabel,
  priorLabel,
  reportDate,
  reportAgg,
  priorAgg,
  historyRows,
  upcoming,
  dailyTotals,
  currency,
}) {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;">
    <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:12px;padding:24px;color:#fff;">
      <h1 style="margin:0;font-size:20px;">Budget Tracker — ${reportLabel} report</h1>
    </div>
    <div style="padding:20px 4px;">
      ${buildSummaryHtml(reportAgg.income, reportAgg.expenses, reportAgg.count, currency)}
      ${buildTopCategoriesHtml(reportAgg.byCategory, currency)}
      ${buildComparisonHtml(reportLabel, priorLabel, reportAgg, priorAgg, currency)}
      ${buildHeatmapHtml(reportDate, dailyTotals)}
      ${buildBudgetHistoryHtml(historyRows, currency)}
      ${buildUpcomingHtml(upcoming, currency)}
      <p style="font-size:12px;color:#888;margin:24px 12px 0;">
        You're receiving this because email reports are enabled in your
        Budget Tracker settings. Turn them off in Settings to unsubscribe.
      </p>
    </div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Report-email verification
// ---------------------------------------------------------------------------

/**
 * Sends an ownership-confirmation link for the address that will receive
 * financial summaries. The random token is stored only as a SHA-256 hash.
 */
exports.requestReportEmailVerification = onCall(
  { secrets: [SMTP_USER, SMTP_PASS] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in before verifying a report email address.");
    }

    const email = normalizeEmail(request.data?.email);
    if (!isValidEmail(email)) {
      throw new HttpsError("invalid-argument", "Enter a valid email address.");
    }

    const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
    if (!projectId) {
      throw new HttpsError("failed-precondition", "Project configuration is unavailable.");
    }

    const uid = request.auth.uid;
    const token = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000);
    const db = admin.firestore();

    await Promise.all([
      db.doc(`users/${uid}/settings/preferences`).set(
        {
          reportEmail: email,
          reportEmailVerified: false,
          reportEmailVerifiedFor: "",
        },
        { merge: true },
      ),
      db.collection("reportEmailVerifications").doc(uid).set({
        email,
        tokenHash,
        expiresAt,
      }),
    ]);

    const confirmationUrl =
      `https://us-central1-${projectId}.cloudfunctions.net/confirmVerifiedReportEmail` +
      `?uid=${encodeURIComponent(uid)}&token=${encodeURIComponent(token)}`;
    await createMailTransport().sendMail({
      from: `"Budget Tracker" <${SMTP_USER.value()}>`,
      to: email,
      subject: "Confirm your Budget Tracker report email",
      html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;">
        <h1 style="font-size:20px;">Confirm your report email</h1>
        <p>This address was selected to receive Budget Tracker financial summaries.</p>
        <p><a href="${confirmationUrl}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:600;">Confirm email address</a></p>
        <p style="font-size:12px;color:#666;">This link expires in 24 hours. If you did not request it, you can ignore this email.</p>
      </div>`,
    });

    return { message: "Verification email sent." };
  },
);

/** Public, token-protected endpoint linked from the verification email. */
exports.confirmVerifiedReportEmail = onRequest(async (req, res) => {
  const uid = String(req.query.uid || "");
  const token = String(req.query.token || "");
  const render = (status, title, body) => {
    res.status(status).send(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head>
      <body style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:40px;color:#111;">
        <main style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:28px;box-shadow:0 10px 30px rgba(15,23,42,.08);">
          <h1 style="font-size:22px;margin-top:0;">${title}</h1><p>${body}</p>
        </main></body></html>`);
  };

  if (!uid || !token) {
    render(400, "Confirmation link incomplete", "Request a new report-email verification link from Budget Tracker Settings.");
    return;
  }

  try {
    const db = admin.firestore();
    const verificationRef = db.collection("reportEmailVerifications").doc(uid);
    const verificationSnap = await verificationRef.get();
    const verification = verificationSnap.data();
    const receivedHash = crypto.createHash("sha256").update(token).digest("hex");
    const expired = !verification?.expiresAt || verification.expiresAt.toMillis() < Date.now();

    if (!verification || expired || receivedHash !== verification.tokenHash) {
      render(400, "This link is no longer valid", "Request a new report-email verification link from Budget Tracker Settings.");
      return;
    }

    await Promise.all([
      db.doc(`users/${uid}/settings/preferences`).set(
        {
          reportEmail: verification.email,
          reportEmailVerified: true,
          reportEmailVerifiedFor: verification.email,
        },
        { merge: true },
      ),
      verificationRef.delete(),
    ]);
    render(200, "Report email confirmed", "This address can now receive Budget Tracker financial summaries. You may close this page.");
  } catch (error) {
    logger.error("Report email confirmation failed", error);
    render(500, "Confirmation unavailable", "Please try the link again later or request a new one from Settings.");
  }
});

/** Remove all application data for the authenticated account before Auth deletion. */
exports.purgeAccountData = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in before deleting account data.");
  }

  const uid = request.auth.uid;
  const db = admin.firestore();
  try {
    await Promise.all([
      db.recursiveDelete(db.doc(`users/${uid}`)),
      db.collection("reportEmailVerifications").doc(uid).delete(),
      admin.storage().bucket().deleteFiles({ prefix: `receipts/${uid}/` }),
    ]);
    return { message: "Account data removed." };
  } catch (error) {
    logger.error(`Account data purge failed for ${uid}`, error);
    throw new HttpsError("internal", "Unable to remove account data.");
  }
});

// ---------------------------------------------------------------------------
// Scheduled function
// ---------------------------------------------------------------------------

exports.sendMonthlyReports = onSchedule(
  {
    schedule: "0 8 1 * *", // 08:00 UTC on the 1st of each month
    timeZone: "UTC",
    secrets: [SMTP_USER, SMTP_PASS],
  },
  async () => {
    const db = admin.firestore();
    const { date: reportDate, key: reportMonth, label: reportLabel } = previousMonth();
    const priorDate = new Date(reportDate.getFullYear(), reportDate.getMonth() - 1, 1);
    const priorMonth = monthKeyOf(priorDate);
    const priorLabel = monthLabelOf(priorDate);

    // Trailing 6 months ending with the reported month, oldest first.
    const historyMonths = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(reportDate.getFullYear(), reportDate.getMonth() - (5 - i), 1);
      return { key: monthKeyOf(d), label: monthLabelOf(d, "short") };
    });
    const rangeStart = `${historyMonths[0].key}-01`;
    const rangeEnd = `${reportMonth}-31`;

    const today = new Date();
    const tomorrow = toDateString(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1));
    const in30Days = toDateString(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30));

    const transporter = createMailTransport();

    // users/{uid} docs are "virtual" (subcollections only), so list refs
    const userRefs = await db.collection("users").listDocuments();
    logger.info(`Monthly report run for ${reportMonth}: ${userRefs.length} users`);

    let sent = 0;
    for (const userRef of userRefs) {
      try {
        const prefsSnap = await userRef.collection("settings").doc("preferences").get();
        const prefs = prefsSnap.data();
        const reportEmail = normalizeEmail(prefs?.reportEmail);
        if (
          !prefs ||
          !prefs.emailReports ||
          !reportEmail ||
          prefs.reportEmailVerified !== true ||
          prefs.reportEmailVerifiedFor !== reportEmail
        ) continue;
        const currency = prefs.currency || "USD";

        const [txSnap, recurringSnap, budgetsSnap, historySnap] = await Promise.all([
          userRef
            .collection("transactions")
            .where("date", ">=", rangeStart)
            .where("date", "<=", rangeEnd)
            .get(),
          userRef.collection("transactions").where("isRecurring", "==", true).get(),
          userRef.collection("settings").doc("budgets").get(),
          userRef.collection("budgetHistory").get(),
        ]);

        const reportAgg = aggregateMonth(
          txSnap.docs.map((d) => d.data()),
          reportMonth,
        );
        if (reportAgg.count === 0) continue;

        const transactions = txSnap.docs.map((d) => d.data());
        const priorAgg = aggregateMonth(transactions, priorMonth);

        const currentBudgetLimit = budgetsSnap.data()?.budgetLimit ?? DEFAULT_BUDGET_LIMIT;
        const snapshotByMonth = new Map(
          historySnap.docs.map((d) => [d.id, d.data()?.budgetLimit ?? currentBudgetLimit]),
        );
        const historyRows = historyMonths.map(({ key, label }) => {
          const agg = aggregateMonth(transactions, key);
          const budget = snapshotByMonth.get(key) ?? currentBudgetLimit;
          return {
            label,
            spent: agg.expenses,
            budget,
            under: agg.expenses <= budget,
            hasData: agg.income > 0 || agg.expenses > 0,
          };
        });

        const recurringTransactions = recurringSnap.docs.map((d) => d.data());
        const upcoming = projectUpcoming(recurringTransactions, tomorrow, in30Days);

        const dailyTotals = {};
        transactions
          .filter((t) => t.type === "expense" && t.date && t.date.startsWith(reportMonth))
          .forEach((t) => {
            const day = parseInt(t.date.substring(8, 10), 10);
            const amount = Number.isInteger(t.amountCents)
              ? t.amountCents / 100
              : Number(t.amount) || 0;
            dailyTotals[day] = (dailyTotals[day] || 0) + amount;
          });

        await transporter.sendMail({
          from: `"Budget Tracker" <${SMTP_USER.value()}>`,
          to: reportEmail,
          subject: `Your ${reportLabel} budget report`,
          html: buildHtml({
            reportLabel,
            priorLabel,
            reportDate,
            reportAgg,
            priorAgg,
            historyRows,
            upcoming,
            dailyTotals,
            currency,
          }),
        });
        sent++;
      } catch (err) {
        logger.error(`Report failed for ${userRef.id}`, err);
      }
    }
    logger.info(`Monthly reports sent: ${sent}`);
  },
);
