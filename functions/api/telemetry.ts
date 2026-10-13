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
}

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
    const duration = typeof body.durationSec === 'number' && Number.isFinite(body.durationSec) ? body.durationSec : 0;
    const errorCode = typeof body.errorCode === 'string' ? body.errorCode.slice(0, 64) : '';

    // Extract country from Cloudflare Request cf object if available (never IP)
    const cf = (context.request as { cf?: { country?: string } }).cf;
    const country = typeof cf?.country === 'string' ? cf.country.slice(0, 8) : '';

    // Write to Cloudflare Workers Analytics Engine if binding is configured
    if (context.env?.ANALYTICS_ENGINE?.writeDataPoint) {
      context.env.ANALYTICS_ENGINE.writeDataPoint({
        blobs: [event, step, errorCode, country],
        doubles: [duration],
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
