/**
 * Cloudflare Pages Function: /api/telemetry
 *
 * Receives first-party anonymous telemetry events and routes them to
 * Cloudflare Workers Analytics Engine (if bound), with zero IP persistence.
 */

interface Env {
  ANALYTICS_ENGINE?: {
    writeDataPoint(data: {
      blobs?: string[];
      doubles?: number[];
      indexes?: string[];
    }): void;
  };
}

interface TelemetryRequest {
  event?: string;
  step?: string;
  durationSec?: number;
  errorCode?: string;
  ts?: number;
  locale?: string;
  goodPosturePct?: number;
  alertCount?: number;
  clientId?: string;
  sessionId?: string;
}

const ANON_ID_PATTERN = /^[a-z0-9-]{8,64}$/i;

export const onRequestPost = async (context: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  try {
    const raw = await context.request.json().catch(() => null);
    if (!raw || typeof raw !== 'object') {
      return new Response(null, { status: 400 });
    }

    const body = raw as TelemetryRequest;
    const event = typeof body.event === 'string' ? body.event.slice(0, 64) : 'unknown';
    const step = typeof body.step === 'string' ? body.step.slice(0, 64) : '';
    const rawDuration = typeof body.durationSec === 'number' && Number.isFinite(body.durationSec) ? body.durationSec : 0;
    // Bound duration between 0 and 86400 (24 hours) to prevent metrics corruption
    const duration = Math.min(Math.max(0, rawDuration), 86400);
    const errorCode = typeof body.errorCode === 'string' ? body.errorCode.slice(0, 64) : '';

    // Extract country from Cloudflare Request cf object if available (never IP)
    const cf = (context.request as { cf?: { country?: string } }).cf;
    const country = typeof cf?.country === 'string' ? cf.country.slice(0, 8) : '';

    // Sanitize locale (allow standard short codes like en, ja, ko)
    const rawLocale = typeof body.locale === 'string' ? body.locale.toLowerCase().slice(0, 8) : '';
    const locale = /^[a-z]{2}(-[a-z]{2,4})?$/.test(rawLocale) ? rawLocale : '';

    // Sanitize anonymous clientId and ephemeral sessionId (random UUID/token format only, never PII)
    const rawClientId = typeof body.clientId === 'string' ? body.clientId.trim().slice(0, 64) : '';
    const clientId = ANON_ID_PATTERN.test(rawClientId) ? rawClientId : '';

    const rawSessionId = typeof body.sessionId === 'string' ? body.sessionId.trim().slice(0, 64) : '';
    const sessionId = ANON_ID_PATTERN.test(rawSessionId) ? rawSessionId : '';

    // Bound goodPosturePct (0..100)
    const rawGoodPct = typeof body.goodPosturePct === 'number' && Number.isFinite(body.goodPosturePct)
      ? Math.round(body.goodPosturePct)
      : -1;
    const goodPosturePct = rawGoodPct >= 0 && rawGoodPct <= 100 ? rawGoodPct : 0;

    // Bound alertCount (>=0, max 1000)
    const rawAlerts = typeof body.alertCount === 'number' && Number.isFinite(body.alertCount)
      ? Math.round(body.alertCount)
      : 0;
    const alertCount = Math.min(Math.max(0, rawAlerts), 1000);

    // Write to Cloudflare Workers Analytics Engine if binding is configured
    if (context.env?.ANALYTICS_ENGINE?.writeDataPoint) {
      context.env.ANALYTICS_ENGINE.writeDataPoint({
        blobs: [event, step, errorCode, country, locale, clientId, sessionId],
        doubles: [duration, goodPosturePct, alertCount],
        indexes: [event.slice(0, 32)],
      });
    }

    return new Response(null, {
      status: 204,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch {
    // Fail closed with 204 to never disrupt client
    return new Response(null, { status: 204 });
  }
};

export const onRequestOptions = async (): Promise<Response> => {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: 'POST, OPTIONS',
      'Cache-Control': 'no-store',
    },
  });
};
