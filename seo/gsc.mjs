#!/usr/bin/env node
// Read-only Google Search Console client for the SEO autopilot. No dependencies (Node 18+).
// Auth: a service account key in env GSC_SA_KEY_B64 (base64 of the JSON key file).
// Output: JSON on stdout. Never prints the key.
//
// Usage: node seo/gsc.mjs <command> --site https://example.com/ [options]
//   queries      top queries                      [--days 28] [--limit 100]
//   pages        top pages                        [--days 28] [--limit 100]
//   page-queries query + page pairs               [--days 28] [--limit 250]
//   striking     queries at position 8-20 (page 2 -> page 1 candidates) [--days 28]
//   compare      queries, last N days vs the N days before   [--days 28] [--limit 100]
//   sitemaps     submitted sitemaps and their status
//   inspect      index status of one URL          --url https://example.com/page

import { createSign } from "node:crypto";

const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const API = "https://searchconsole.googleapis.com";
const DATA_LAG_DAYS = 3;

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const opts = {};
  for (let i = 0; i < rest.length; i += 2) {
    if (!rest[i]?.startsWith("--")) fail(`Unexpected argument: ${rest[i]}`);
    opts[rest[i].slice(2)] = rest[i + 1];
  }
  return { command, opts };
}

function fail(message) {
  console.error(`gsc: ${message}`);
  process.exit(1);
}

function loadKey() {
  const raw = process.env.GSC_SA_KEY_B64;
  if (!raw) fail("GSC_SA_KEY_B64 is not set. Search Console is not available in this run.");
  try {
    const key = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
    if (!key.client_email || !key.private_key) throw new Error("missing fields");
    return key;
  } catch {
    fail("GSC_SA_KEY_B64 is not a valid base64-encoded service account key.");
  }
}

const b64url = (input) => Buffer.from(input).toString("base64url");

async function getAccessToken(key) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({ iss: key.client_email, scope: SCOPE, aud: key.token_uri, iat: now, exp: now + 3600 }),
  );
  const signature = createSign("RSA-SHA256").update(`${header}.${claims}`).sign(key.private_key, "base64url");
  const res = await fetch(key.token_uri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${signature}`,
    }),
  });
  if (!res.ok) fail(`token request failed: HTTP ${res.status}`);
  return (await res.json()).access_token;
}

async function api(token, method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) fail(`${method} ${path} failed: HTTP ${res.status} ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

function isoDay(offsetDays) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - offsetDays);
  return d.toISOString().slice(0, 10);
}

function range(days, periodsBack = 0) {
  const end = DATA_LAG_DAYS + periodsBack * days;
  return { startDate: isoDay(end + days - 1), endDate: isoDay(end) };
}

const round = (n, digits) => Math.round(n * 10 ** digits) / 10 ** digits;

async function searchAnalytics(token, site, { dimensions, days, limit, periodsBack = 0, filters }) {
  const { startDate, endDate } = range(days, periodsBack);
  const body = { startDate, endDate, dimensions, rowLimit: limit, dataState: "final" };
  if (filters) body.dimensionFilterGroups = [{ filters }];
  const data = await api(token, "POST", `/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, body);
  const rows = (data.rows ?? []).map((r) => ({
    ...Object.fromEntries(dimensions.map((dim, i) => [dim, r.keys[i]])),
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: round(r.ctr * 100, 2),
    position: round(r.position, 1),
  }));
  return { site, startDate, endDate, rows };
}

async function main() {
  const { command, opts } = parseArgs(process.argv.slice(2));
  if (!command) fail("missing command (queries | pages | page-queries | striking | compare | sitemaps | inspect)");
  const site = opts.site;
  if (!site) fail("missing --site (exact property URL, e.g. https://example.com/)");
  const days = Number(opts.days ?? 28);
  const limit = Number(opts.limit ?? 100);
  const token = await getAccessToken(loadKey());
  let out;

  switch (command) {
    case "queries":
      out = await searchAnalytics(token, site, { dimensions: ["query"], days, limit });
      break;
    case "pages":
      out = await searchAnalytics(token, site, { dimensions: ["page"], days, limit });
      break;
    case "page-queries":
      out = await searchAnalytics(token, site, { dimensions: ["query", "page"], days, limit: Number(opts.limit ?? 250) });
      break;
    case "striking": {
      const all = await searchAnalytics(token, site, { dimensions: ["query", "page"], days, limit: 1000 });
      all.rows = all.rows
        .filter((r) => r.position >= 8 && r.position <= 20)
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, limit);
      out = all;
      break;
    }
    case "compare": {
      const [now, before] = await Promise.all([
        searchAnalytics(token, site, { dimensions: ["query"], days, limit: 1000 }),
        searchAnalytics(token, site, { dimensions: ["query"], days, limit: 1000, periodsBack: 1 }),
      ]);
      const prev = new Map(before.rows.map((r) => [r.query, r]));
      const rows = now.rows.slice(0, limit).map((r) => {
        const p = prev.get(r.query);
        return {
          query: r.query,
          clicks: r.clicks,
          clicksBefore: p?.clicks ?? 0,
          impressions: r.impressions,
          impressionsBefore: p?.impressions ?? 0,
          position: r.position,
          positionBefore: p?.position ?? null,
        };
      });
      const total = (list, field) => list.reduce((sum, r) => sum + r[field], 0);
      out = {
        site,
        current: { startDate: now.startDate, endDate: now.endDate },
        previous: { startDate: before.startDate, endDate: before.endDate },
        totals: {
          clicks: total(now.rows, "clicks"),
          clicksBefore: total(before.rows, "clicks"),
          impressions: total(now.rows, "impressions"),
          impressionsBefore: total(before.rows, "impressions"),
        },
        rows,
      };
      break;
    }
    case "sitemaps":
      out = await api(token, "GET", `/webmasters/v3/sites/${encodeURIComponent(site)}/sitemaps`);
      break;
    case "inspect":
      if (!opts.url) fail("inspect needs --url");
      out = await api(token, "POST", "/v1/urlInspection/index:inspect", { inspectionUrl: opts.url, siteUrl: site });
      break;
    default:
      fail(`unknown command: ${command}`);
  }
  console.log(JSON.stringify(out, null, 2));
}

main().catch((err) => fail(err.message));
