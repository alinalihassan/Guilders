import { env as cfEnv } from "cloudflare:workers";

/**
 * Cloudflare Workers telemetry integration
 * 
 * This module captures Cloudflare-specific data and correlates it with traces:
 * - Request metadata (region, colo, country)
 * - Performance metrics (wall time, CPU time)
 * - Cache status and analytics
 * - Worker timing information
 */

export interface CloudflareTelemetryData {
  region?: string;
  country?: string;
  colo?: string;
  cacheStatus?: string;
  cpuTime?: number;
  wallTime?: number;
  requestId?: string;
  asn?: string;
}

/**
 * Extract Cloudflare-specific telemetry from request headers
 * These are automatically added by Cloudflare Workers runtime
 */
export function extractCloudflareData(request: Request): CloudflareTelemetryData {
  const headers = request.headers;

  return {
    // Geographic data
    country: headers.get("cf-ipcountry") || undefined,
    region: headers.get("cf-metro-code") || undefined,
    
    // Colo information
    colo: headers.get("cf-ray")?.split("-")[1] || undefined,
    
    // Cache information
    cacheStatus: headers.get("cf-cache-status") || undefined,
    
    // Timing data (from CF-Ray header timing directives)
    requestId: headers.get("cf-ray") || undefined,
    
    // ASN for network analysis
    asn: headers.get("cf-asn") || undefined,
  };
}

/**
 * Add Cloudflare telemetry as span attributes
 * Usage in your span creation:
 * 
 * const cfData = extractCloudflareData(request);
 * span.setAttributes({
 *   "cf.country": cfData.country,
 *   "cf.region": cfData.region,
 *   "cf.colo": cfData.colo,
 *   "cf.cache_status": cfData.cacheStatus,
 *   "cf.request_id": cfData.requestId,
 * });
 */
export const CLOUDFLARE_SPAN_ATTRIBUTES = {
  COUNTRY: "cf.country",
  REGION: "cf.region",
  COLO: "cf.colo",
  CACHE_STATUS: "cf.cache_status",
  REQUEST_ID: "cf.request_id",
  ASN: "cf.asn",
} as const;
