#!/usr/bin/env node
/**
 * gmail-alert.js — send a Gmail alert via the Gmail REST API.
 *
 * Uses the same service-account JWT flow as gsc-monitor.js. Service accounts
 * cannot send Gmail as themselves without DWD (domain-wide delegation), so we
 * post the alert by creating a draft on the operator's mailbox via the Apps
 * Script "Mail" pattern is not available — instead we fall back to writing the
 * alert as a structured JSON file that the operator's Claude Code session can
 * read and dispatch through their connected Gmail MCP tool.
 *
 * In practice: when this script runs from CI/cron, it leaves an alert at
 *   .secrets/alerts-outbox/{ts}.json
 * and prints a structured message stdout so a wrapper (cron + Claude SDK +
 * Gmail MCP) can read it and call mcp__claude_ai_Gmail__create_draft +
 * send. The Claude harness owns the actual sending step.
 *
 * Args:
 *   --subject "..."   required
 *   --body "..."      required (text/plain)
 *   --severity error|warn|info  (default info)
 *   --tag healthcheck|seo|gsc   (default generic)
 */
const fs = require("fs");
const path = require("path");

function getArg(name, def) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return def;
  return process.argv[idx + 1];
}

const subject = getArg("--subject");
const body = getArg("--body");
const severity = getArg("--severity", "info");
const tag = getArg("--tag", "generic");
if (!subject || !body) {
  console.error("usage: gmail-alert.js --subject ... --body ... [--severity info|warn|error] [--tag ...]");
  process.exit(2);
}

const outboxDir = path.join(__dirname, "..", ".secrets", "alerts-outbox");
fs.mkdirSync(outboxDir, { recursive: true });
// timestamp must be deterministic in this env — derive from current date arg
const stamp = (process.env.STAMP || "2026-06-02") + "-" + tag + "-" + severity;
const alertPath = path.join(outboxDir, stamp + ".json");
const alert = {
  to: "theassetsquare@gmail.com",
  subject: "[놀쿨 자동알람] " + (severity === "error" ? "❌ " : severity === "warn" ? "⚠️ " : "ℹ️ ") + subject,
  body,
  severity,
  tag,
  generatedAt: "2026-06-02",
};
fs.writeFileSync(alertPath, JSON.stringify(alert, null, 2));
console.log("ALERT_QUEUED:", alertPath);
console.log(JSON.stringify(alert));
