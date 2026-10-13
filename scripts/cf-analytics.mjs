#!/usr/bin/env node
/**
 * scripts/cf-analytics.mjs
 *
 * Cloudflare Analytics CLI for SitRight.me.
 * Queries:
 * 1. Cloudflare Workers Analytics Engine (First-party privacy telemetry)
 * 2. Cloudflare GraphQL Analytics API (Zone Uniques, Requests, Web Analytics RUM)
 *
 * Usage:
 *   node scripts/cf-analytics.mjs [--days 7] [--json]
 *   npm run analytics
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Simple .env parser for convenience if present
function loadEnv() {
  const envPath = resolve(process.cwd(), '.env');
  if (existsSync(envPath)) {
    try {
      const content = readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const [k, ...v] = trimmed.split('=');
        if (k && v.length && !process.env[k.trim()]) {
          process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    } catch {
      // ignore
    }
  }
}
loadEnv();

const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN;
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;

const argv = process.argv.slice(2);
const isJson = argv.includes('--json');
const daysIndex = argv.indexOf('--days');
const days = daysIndex !== -1 && argv[daysIndex + 1] ? parseInt(argv[daysIndex + 1], 10) : 7;
const showHelp = argv.includes('--help') || argv.includes('-h');

if (showHelp) {
  console.log(`
SitRight.me Cloudflare Analytics CLI

Usage:
  node scripts/cf-analytics.mjs [options]
  npm run analytics -- [options]

Options:
  --days <number>   Lookback period in days (default: 7)
  --json            Output raw aggregated JSON
  --help, -h        Show this help message

Required Environment Variables:
  CLOUDFLARE_API_TOKEN   Cloudflare API Token with Analytics:Read permissions
  CLOUDFLARE_ACCOUNT_ID  Your Cloudflare Account ID (for Workers Analytics Engine)
  CLOUDFLARE_ZONE_ID     (Optional) Cloudflare Zone ID for Edge/Domain Uniques
`);
  process.exit(0);
}

async function queryAnalyticsEngine(dataset, sql) {
  if (!API_TOKEN || !ACCOUNT_ID) return null;
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/analytics_engine/sql`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
      },
      body: sql,
    });
    if (!res.ok) {
      const errText = await res.text();
      return { error: `HTTP ${res.status}: ${errText}` };
    }
    const data = await res.json();
    return data;
  } catch (err) {
    return { error: err.message };
  }
}

async function queryGraphQL(query, variables) {
  if (!API_TOKEN) return null;
  const url = 'https://api.cloudflare.com/client/v4/graphql';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) {
      const errText = await res.text();
      return { error: `HTTP ${res.status}: ${errText}` };
    }
    const data = await res.json();
    return data;
  } catch (err) {
    return { error: err.message };
  }
}

async function run() {
  const report = {
    generatedAt: new Date().toISOString(),
    lookbackDays: days,
    analyticsEngine: null,
    zoneAnalytics: null,
    warnings: [],
  };

  if (!API_TOKEN) {
    report.warnings.push(
      'CLOUDFLARE_API_TOKEN is not set. Set it in .env or your shell environment to fetch live metrics.'
    );
  }

  // 1. Query Workers Analytics Engine for SitRight App Telemetry
  if (API_TOKEN && ACCOUNT_ID) {
    const sql = `
      SELECT
        blob1 AS event,
        blob2 AS step,
        blob3 AS errorCode,
        blob4 AS country,
        count() AS count,
        avg(double1) AS avgDuration
      FROM sitright_telemetry
      WHERE timestamp > NOW() - INTERVAL '${days}' DAY
      GROUP BY event, step, errorCode, country
      ORDER BY count DESC
    `;
    const result = await queryAnalyticsEngine('sitright_telemetry', sql);
    report.analyticsEngine = result;
  } else if (!ACCOUNT_ID) {
    report.warnings.push('CLOUDFLARE_ACCOUNT_ID is not set (needed for Workers Analytics Engine).');
  }

  // 2. Query Zone Analytics (Unique IPs, Requests, Cached)
  if (API_TOKEN && ZONE_ID) {
    const sinceDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
    const gql = `
      query GetZoneAnalytics($zoneTag: string!, $since: string!) {
        viewer {
          zones(filter: { zoneTag: $zoneTag }) {
            httpRequests1dGroups(
              limit: ${days}
              filter: { date_geq: $since }
            ) {
              dimensions {
                date
              }
              uniq {
                uniques
              }
              sum {
                requests
                pageViews
                bytes
                cachedRequests
              }
            }
          }
        }
      }
    `;
    const result = await queryGraphQL(gql, { zoneTag: ZONE_ID, since: sinceDate });
    report.zoneAnalytics = result;
  }

  if (isJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  // Pretty Console Output
  console.log('\n📊 === SitRight.me Cloudflare Analytics Summary ===');
  console.log(`📅 Period: Last ${days} days (${new Date().toLocaleDateString()})\n`);

  if (report.warnings.length > 0) {
    console.log('⚠️  Notice / Setup Guidance:');
    for (const w of report.warnings) {
      console.log(`   - ${w}`);
    }
    console.log('\n💡 To configure environment variables:');
    console.log('   export CLOUDFLARE_API_TOKEN="<your_token>"');
    console.log('   export CLOUDFLARE_ACCOUNT_ID="<your_account_id>"');
    console.log('   export CLOUDFLARE_ZONE_ID="<your_zone_id>"\n');
  }

  // Display Analytics Engine Telemetry
  if (report.analyticsEngine && !report.analyticsEngine.error) {
    const rows = report.analyticsEngine.data || [];
    console.log('🎯 [Workers Analytics Engine — Posture & Funnel Telemetry]');
    if (rows.length === 0) {
      console.log('   No events recorded in this period yet (or dataset newly bound).');
    } else {
      console.table(
        rows.map((r) => ({
          Event: r.event,
          Step: r.step || '-',
          Country: r.country || '-',
          Count: r.count,
          'Avg Duration (s)': r.avgDuration ? Number(r.avgDuration).toFixed(1) : '-',
          'Error Code': r.errorCode || '-',
        }))
      );
    }
    console.log('');
  } else if (report.analyticsEngine?.error) {
    console.log(`❌ Analytics Engine Error: ${report.analyticsEngine.error}\n`);
  }

  // Display Zone Analytics
  if (report.zoneAnalytics && !report.zoneAnalytics.error) {
    const groups =
      report.zoneAnalytics.data?.viewer?.zones?.[0]?.httpRequests1dGroups || [];
    console.log('🌐 [Edge Zone Analytics — Daily Visitors & Requests]');
    if (groups.length === 0) {
      console.log('   No zone metrics returned.');
    } else {
      console.table(
        groups.map((g) => ({
          Date: g.dimensions?.date,
          'Unique Visitors': g.uniq?.uniques ?? 0,
          'Page Views': g.sum?.pageViews ?? 0,
          'Total Requests': g.sum?.requests ?? 0,
          'Cache Hit %': g.sum?.requests
            ? `${Math.round(((g.sum.cachedRequests ?? 0) / g.sum.requests) * 100)}%`
            : '0%',
        }))
      );
    }
    console.log('');
  } else if (report.zoneAnalytics?.error) {
    console.log(`❌ Zone Analytics Error: ${report.zoneAnalytics.error}\n`);
  }

  console.log('===================================================\n');
}

run().catch((err) => {
  console.error('Fatal analytics error:', err);
  process.exit(1);
});
