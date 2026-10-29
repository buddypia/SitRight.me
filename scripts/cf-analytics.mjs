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
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Simple .env parser for convenience if present
function loadEnv() {
  const envFiles = ['.env', '.env.local'];
  for (const file of envFiles) {
    const envPath = resolve(process.cwd(), file);
    if (!existsSync(envPath)) continue;
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

// Resolve from cf CLI config profile if environment variables are not explicitly set
function resolveFromCfProfile() {
  const home = homedir();
  const candidates = [
    process.env.XDG_CONFIG_HOME ? join(process.env.XDG_CONFIG_HOME, 'cloudflare/config/default.json') : null,
    join(home, 'Library/Preferences/cloudflare/config/default.json'), // macOS
    join(home, '.config/cloudflare/config/default.json'), // Linux
  ].filter(Boolean);

  for (const p of candidates) {
    if (existsSync(p)) {
      try {
        const parsed = JSON.parse(readFileSync(p, 'utf8'));
        const token =
          parsed.oauth_token ||
          parsed.token ||
          parsed.access_token ||
          parsed.api_token ||
          null;
        return {
          token,
          accountId: parsed.account_id || parsed.accountId || null,
          source: p,
        };
      } catch {
        // ignore
      }
    }
  }
  return { token: null, accountId: null, source: null };
}

async function resolveCredentials() {
  const profile = resolveFromCfProfile();
  const token = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN || profile.token;
  let accountId = process.env.CLOUDFLARE_ACCOUNT_ID || profile.accountId;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const authSource = profile.source ? `cf profile (${profile.source})` : 'environment variables';

  // Auto-fetch account ID from Cloudflare accounts API if token exists but account ID is unset
  if (token && !accountId) {
    try {
      const res = await fetch('https://api.cloudflare.com/client/v4/accounts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.result && data.result.length > 0) {
          accountId = data.result[0].id;
        }
      }
    } catch {
      // silent fallback
    }
  }

  return { token, accountId, zoneId, authSource };
}

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

Authentication:
  Automatically uses your 'cf' CLI login profile if authenticated (cf auth login).
  Alternatively accepts environment variables:
    CLOUDFLARE_API_TOKEN   Cloudflare API Token
    CLOUDFLARE_ACCOUNT_ID  Cloudflare Account ID
    CLOUDFLARE_ZONE_ID     (Optional) Cloudflare Zone ID
`);
  process.exit(0);
}

async function queryAnalyticsEngine(token, accountId, dataset, sql) {
  if (!token || !accountId) return null;
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
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

async function queryGraphQL(token, query, variables) {
  if (!token) return null;
  const url = 'https://api.cloudflare.com/client/v4/graphql';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
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

export const DEFAULT_RUM_SITE_TAG = '879498ce72e148db9d904495ca055bd9';

/**
 * @param {Record<string, string | undefined>} [env]
 */
export function resolveRumSiteTag(env = process.env) {
  const configured = env?.CLOUDFLARE_RUM_SITE_TAG;
  if (typeof configured === 'string' && configured.trim().length > 0) {
    return configured.trim();
  }
  return DEFAULT_RUM_SITE_TAG;
}

export function summarizeRumAnalytics(rumResult) {
  if (!rumResult || rumResult.error) return null;
  const account = rumResult.data?.viewer?.accounts?.[0];
  if (!account) return null;

  const pageloads = account.rumPageloadEventsAdaptiveGroups || [];
  const vitalsGroup = account.rumWebVitalsEventsAdaptiveGroups?.[0] || null;

  let totalPageViews = 0;
  let totalVisits = 0;
  const countryMap = new Map();

  for (const row of pageloads) {
    const pv = Number(row.count ?? 0);
    const visits = Number(row.sum?.visits ?? 0);
    const country = row.dimensions?.countryName || '-';
    totalPageViews += pv;
    totalVisits += visits;
    const prev = countryMap.get(country) || { country, visits: 0, pageViews: 0 };
    prev.visits += visits;
    prev.pageViews += pv;
    countryMap.set(country, prev);
  }

  const byCountry = [...countryMap.values()].sort(
    (a, b) => b.pageViews - a.pageViews || a.country.localeCompare(b.country)
  );

  const q = vitalsGroup?.quantiles;
  const toMs = (us) => (typeof us === 'number' ? Math.round(us / 1000) : null);
  const webVitals = vitalsGroup
    ? {
        sampleCount: Number(vitalsGroup.count ?? 0),
        lcpMsP75: toMs(q?.largestContentfulPaintP75),
        inpMsP75: toMs(q?.interactionToNextPaintP75),
        clsP75:
          typeof q?.cumulativeLayoutShiftP75 === 'number'
            ? Number(q.cumulativeLayoutShiftP75.toFixed(3))
            : null,
        fcpMsP75: toMs(q?.firstContentfulPaintP75),
        ttfbMsP75: toMs(q?.timeToFirstByteP75),
      }
    : null;

  return {
    totalPageViews,
    totalVisits,
    byCountry,
    webVitals,
  };
}

async function queryRumAnalytics(token, accountId, siteTag, lookbackDays) {
  if (!token || !accountId || !siteTag) return null;
  const since = new Date(Date.now() - lookbackDays * 86400000).toISOString();
  const until = new Date().toISOString();
  const gql = `
    query GetRumAnalytics($accountId: string!, $siteTag: string!, $since: Time!, $until: Time!) {
      viewer {
        accounts(filter: { accountTag: $accountId }) {
          rumPageloadEventsAdaptiveGroups(
            limit: 500
            filter: { siteTag: $siteTag, datetime_geq: $since, datetime_leq: $until }
          ) {
            count
            sum {
              visits
            }
            dimensions {
              date
              countryName
            }
          }
          rumWebVitalsEventsAdaptiveGroups(
            limit: 10
            filter: { siteTag: $siteTag, datetime_geq: $since, datetime_leq: $until }
          ) {
            count
            quantiles {
              largestContentfulPaintP75
              interactionToNextPaintP75
              cumulativeLayoutShiftP75
              firstContentfulPaintP75
              timeToFirstByteP75
            }
          }
        }
      }
    }
  `;
  return queryGraphQL(token, gql, { accountId, siteTag, since, until });
}

async function run() {
  const { token, accountId, zoneId, authSource } = await resolveCredentials();
  const rumSiteTag = resolveRumSiteTag();

  const report = {
    generatedAt: new Date().toISOString(),
    lookbackDays: days,
    authSource: token ? authSource : 'none',
    accountId: accountId || null,
    rumSiteTag: rumSiteTag || null,
    summary: null,
    analyticsEngine: null,
    rumAnalytics: null,
    zoneAnalytics: null,
    warnings: [],
  };

  if (!token) {
    report.warnings.push(
      'Not authenticated. Run "npx cf auth login" or set CLOUDFLARE_API_TOKEN.'
    );
  }

  // 1. Query Workers Analytics Engine for SitRight App Telemetry
  // Unifies legacy rows (pre-PR#53 where blob6/blob7 were empty '') with current UUID-tagged rows
  // using deterministic country + UTC date/hour fallback keys.
  if (token && accountId) {
    const unifiedUserExpr =
      "IF(blob6 != '', blob6, formatDateTime(timestamp, '%Y-%m-%d'))";
    const unifiedSessionExpr =
      "IF(blob7 != '', blob7, formatDateTime(timestamp, '%Y-%m-%d %H'))";

    const summarySql = `
      SELECT
        count() AS totalEvents,
        SUM(IF(blob6 = '', 1, 0)) AS legacyEvents,
        COUNT(DISTINCT ${unifiedUserExpr}) AS totalUniqueUsers,
        COUNT(DISTINCT ${unifiedSessionExpr}) AS totalSessions
      FROM sitright_telemetry
      WHERE timestamp > NOW() - INTERVAL '${days}' DAY
    `;
    const sql = `
      SELECT
        blob1 AS event,
        blob2 AS step,
        blob3 AS errorCode,
        blob4 AS country,
        count() AS count,
        COUNT(DISTINCT ${unifiedUserExpr}) AS uniqueUsers,
        COUNT(DISTINCT ${unifiedSessionExpr}) AS uniqueSessions,
        avg(double1) AS avgDuration
      FROM sitright_telemetry
      WHERE timestamp > NOW() - INTERVAL '${days}' DAY
      GROUP BY event, step, errorCode, country
      ORDER BY count DESC
    `;
    const [summaryResult, result, rumRaw] = await Promise.all([
      queryAnalyticsEngine(token, accountId, 'sitright_telemetry', summarySql),
      queryAnalyticsEngine(token, accountId, 'sitright_telemetry', sql),
      rumSiteTag ? queryRumAnalytics(token, accountId, rumSiteTag, days) : Promise.resolve(null),
    ]);
    report.summary = summaryResult?.data?.[0] || null;
    report.analyticsEngine = result;
    report.rumAnalytics = summarizeRumAnalytics(rumRaw);
  } else if (!accountId && token) {
    report.warnings.push('Cloudflare Account ID could not be resolved automatically.');
  }

  // 2. Query Zone Analytics if zoneId is provided
  if (token && zoneId) {
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
    const result = await queryGraphQL(token, gql, { zoneTag: zoneId, since: sinceDate });
    report.zoneAnalytics = result;
  }

  if (isJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  // Pretty Console Output
  console.log('\n📊 === SitRight.me Cloudflare Analytics Summary ===');
  console.log(`📅 Period: Last ${days} days (${new Date().toLocaleDateString()})`);
  if (token) {
    console.log(`🔑 Auth: Authenticated via ${authSource}`);
    if (accountId) console.log(`🏢 Account ID: ${accountId}`);
    if (rumSiteTag) console.log(`📡 Web Analytics (RUM) Site Tag: ${rumSiteTag}`);
  }
  if (report.summary) {
    const totalEvents = Number(report.summary.totalEvents ?? 0);
    const legacyEvents = Number(report.summary.legacyEvents ?? 0);
    const currentEvents = totalEvents - legacyEvents;
    console.log(
      `👥 App Telemetry Totals: ${report.summary.totalUniqueUsers ?? 0} Unique Users (UU) | ${report.summary.totalSessions ?? 0} Sessions | ${totalEvents} Events (${currentEvents} UUID + ${legacyEvents} legacy unified)`
    );
  }
  console.log('');

  if (report.warnings.length > 0) {
    console.log('⚠️  Notice / Setup Guidance:');
    for (const w of report.warnings) {
      console.log(`   - ${w}`);
    }
    console.log('');
  }

  // Display Analytics Engine Telemetry
  if (report.analyticsEngine && !report.analyticsEngine.error) {
    const rows = report.analyticsEngine.data || [];
    console.log('🎯 [Workers Analytics Engine — Posture & Funnel Telemetry]');
    if (rows.length === 0) {
      console.log('   No events recorded in this period yet (dataset bound; waiting for first production events).');
    } else {
      console.table(
        rows.map((r) => ({
          Event: r.event,
          Step: r.step || '-',
          Country: r.country || '-',
          'Unique Users': Number(r.uniqueUsers ?? 0),
          Sessions: Number(r.uniqueSessions ?? 0),
          Count: Number(r.count ?? 0),
          'Avg Duration (s)': r.avgDuration ? Number(r.avgDuration).toFixed(1) : '-',
          'Error Code': r.errorCode || '-',
        }))
      );
    }
    console.log('');
  } else if (report.analyticsEngine?.error) {
    console.log(`ℹ️  Workers Analytics Engine: ${report.analyticsEngine.error}`);
    console.log('   (Note: If dataset is freshly bound, first events will activate the table.)\n');
  }

  // Display Cloudflare Web Analytics (RUM)
  if (report.rumAnalytics) {
    const { totalVisits, totalPageViews, byCountry, webVitals } = report.rumAnalytics;
    console.log('⚡ [Cloudflare Web Analytics (RUM) — Visits & Core Web Vitals]');
    console.log(`   Visits: ${totalVisits} | Page Views: ${totalPageViews}`);
    if (webVitals && webVitals.sampleCount > 0) {
      console.table([
        {
          Samples: webVitals.sampleCount,
          'LCP P75 (ms)': webVitals.lcpMsP75 ?? '-',
          'INP P75 (ms)': webVitals.inpMsP75 ?? '-',
          'CLS P75': webVitals.clsP75 ?? '-',
          'FCP P75 (ms)': webVitals.fcpMsP75 ?? '-',
          'TTFB P75 (ms)': webVitals.ttfbMsP75 ?? '-',
        },
      ]);
    }
    if (byCountry.length > 0) {
      console.table(
        byCountry.map((c) => ({
          Country: c.country,
          Visits: c.visits,
          'Page Views': c.pageViews,
        }))
      );
    } else if (!webVitals || webVitals.sampleCount === 0) {
      console.log('   No RUM beacon events recorded in this period yet.');
    }
    console.log('');
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

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  run().catch((err) => {
    console.error('Fatal analytics error:', err);
    process.exit(1);
  });
}
