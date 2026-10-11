const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function setup({ authFails = false, failRecipient = null } = {}) {
  const ledger = new Map();
  const deliveries = [];
  let options;
  let handler;
  const users = ["alice", "bob"].map((id) => ({
    id,
    collection(name) {
      if (name === "settings") return { doc(key) { return { async get() {
        return { data: () => key === "preferences" ? {
          emailReports: true, reportEmail: `${id}@example.com`,
          reportEmailVerified: true, reportEmailVerifiedFor: `${id}@example.com`,
        } : {} };
      } }; } };
      if (name === "budgetHistory") return { get: async () => ({ docs: [] }) };
      const query = {
        where: () => query,
        get: async () => ({ docs: [{ data: () => ({
          date: "2026-09-15", type: "expense", amount: 20, category: "Food",
        }) }] }),
      };
      return query;
    },
  }));
  const db = {
    collection(name) {
      if (name === "users") return { listDocuments: async () => users };
      assert.equal(name, "monthlyReportDeliveries");
      return { doc: (id) => ({ id, set: async (data) => ledger.set(id, data) }) };
    },
    runTransaction: async (fn) => fn({
      get: async (ref) => ({ data: () => ledger.get(ref.id) }),
      set: (ref, data) => ledger.set(ref.id, data),
    }),
  };
  const firestore = () => db;
  firestore.Timestamp = { fromMillis: (value) => ({ toMillis: () => value }) };
  firestore.FieldValue = { serverTimestamp: () => "timestamp" };
  const modules = {
    "firebase-functions": { setGlobalOptions() {} },
    "firebase-functions/v2/scheduler": { onSchedule(config, fn) {
      options = config; handler = fn; return fn;
    } },
    "firebase-functions/v2/https": { onCall() {}, onRequest() {}, HttpsError: Error },
    "firebase-functions/params": { defineSecret: () => ({ value: () => "unused" }) },
    "firebase-functions/logger": { info() {}, error() {} },
    "firebase-admin": { initializeApp() {}, firestore },
    nodemailer: { createTransport: () => ({
      verify: async () => { if (authFails) throw new Error("SMTP auth rejected"); },
      sendMail: async (mail) => {
        if (mail.to === failRecipient) throw Object.assign(new Error("SMTP failed"), { code: "EAUTH" });
        deliveries.push(mail);
      },
    }) },
    crypto: require("node:crypto"),
  };
  vm.runInNewContext(fs.readFileSync(require.resolve("../index.js"), "utf8"), {
    require: (name) => modules[name], exports: {}, process, Date, console,
  });
  return { ledger, deliveries, options, run: () => handler({ scheduleTime: "2026-10-01T08:00:00Z" }),
    recover: () => { failRecipient = null; } };
}

test("SMTP authentication failure rejects the job before sending", async () => {
  const app = setup({ authFails: true });
  await assert.rejects(app.run(), /SMTP auth rejected/);
  assert.equal(app.deliveries.length, 0);
  assert.equal(app.ledger.size, 0);
});

test("retry sends only the previously failed recipient", async () => {
  const app = setup({ failRecipient: "bob@example.com" });
  await assert.rejects(app.run(), /1 monthly report deliveries failed/);
  assert.equal(app.deliveries.length, 1);
  app.recover();
  await app.run();
  await app.run();
  assert.equal(app.deliveries.length, 2);
  assert.equal(app.deliveries[1].subject, "Your September 2026 budget report");
  assert.equal(app.options.retryCount, 3);
});

test("an overlapping run leaves an active claim alone and requests a retry", async () => {
  const app = setup();
  app.ledger.set("2026-09_alice", {
    status: "sending", leaseUntil: { toMillis: () => Date.now() + 600000 },
  });
  await assert.rejects(app.run(), /1 monthly report deliveries failed/);
  assert.equal(app.deliveries.length, 1);
  assert.equal(app.deliveries[0].to, "bob@example.com");
});
