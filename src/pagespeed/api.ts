/**
 * PageSpeed Insights API v5 client (`runPagespeed`).
 *
 * Reference:
 * https://developers.google.com/speed/docs/insights/v5/reference/pagespeedapi/runpagespeed
 *
 * The API key travels in the `X-Goog-Api-Key` header, never in the query
 * string, so it does not show up in URLs, proxies or error messages.
 */
import { AppError, error } from "../app/errors.ts";
import { ExitCode } from "../app/exit-codes.ts";
import type { Category, Strategy } from "./report.ts";

/** Public v5 endpoint. */
export const ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

/** Variable that replaces the endpoint (local test servers and mirrors). */
export const ENDPOINT_VARIABLE = "PAGESPEEDFY_API_ENDPOINT";

/** Endpoint in effect: `PAGESPEEDFY_API_ENDPOINT` when set, else the public one. */
export function endpoint(): string {
  return process.env[ENDPOINT_VARIABLE]?.trim() || ENDPOINT;
}

/** Parameters of one query. */
export interface QueryParameters {
  url: string;
  apiKey: string;
  strategy: Strategy;
  categories: readonly Category[];
  locale: string;
  timeoutMs: number;
  retries: number;
}

/** Transport function; replaced in tests so they never touch the network. */
export type Transport = (url: string, init: RequestInit) => Promise<Response>;

/** Sleep function; replaced in tests to skip the back-off. */
export type Sleep = (ms: number) => Promise<void>;

const defaultSleep: Sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Builds the query URL with one `category` parameter per category. The key is not part of it. */
export function buildUrl(p: Pick<QueryParameters, "url" | "strategy" | "categories" | "locale">): string {
  const search = new URLSearchParams();
  search.set("url", p.url);
  search.set("strategy", p.strategy.toUpperCase());
  search.set("locale", p.locale);
  for (const category of p.categories) search.append("category", category.replace("-", "_").toUpperCase());
  return `${endpoint()}?${search.toString()}`;
}

/** Removes the key from any text before it is shown or logged. */
export function hideKey(text: string, apiKey: string): string {
  return apiKey ? text.split(apiKey).join("***") : text;
}

/**
 * Removes the key from every string of a parsed JSON value, keys included,
 * keeping the JSON types. Applied to successful responses before anything
 * is saved or normalized, so an echoed key never reaches the raw files,
 * the history database, `--json`, MCP results or the TUI. Keys shorter
 * than 8 characters are left alone: no Google key is that short, and
 * replacing a tiny string would corrupt unrelated JSON fields.
 */
export function redactKey(value: unknown, apiKey: string): unknown {
  if (apiKey.length < 8) return value;
  if (typeof value === "string") return hideKey(value, apiKey);
  if (Array.isArray(value)) return value.map((v) => redactKey(v, apiKey));
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [hideKey(k, apiKey), redactKey(v, apiKey)]));
  }
  return value;
}

/** HTTP status codes worth another attempt. */
function shouldRetry(status: number): boolean {
  return status === 429 || status >= 500;
}

/**
 * Runs `runPagespeed` and returns the raw API JSON.
 *
 * Retries 429 and 5xx with growing waits (2 s, 4 s, ...), except when the
 * daily quota is gone, since retrying changes nothing. 400 and 403 become
 * messages with the likely cause. Every failure is an `AppError` with
 * NETWORK_OR_API (5), or CREDENTIALS (4) when the key is refused.
 */
export async function queryPagespeed(
  p: QueryParameters,
  transport: Transport = fetch,
  sleep: Sleep = defaultSleep,
): Promise<Record<string, unknown>> {
  const url = buildUrl(p);
  let lastError = "";

  for (let attempt = 1; attempt <= p.retries; attempt += 1) {
    let response: Response;
    try {
      response = await transport(url, {
        headers: { accept: "application/json", "x-goog-api-key": p.apiKey },
        signal: AbortSignal.timeout(p.timeoutMs),
      });
    } catch (e) {
      const name = (e as Error).name;
      lastError =
        name === "TimeoutError" ? `the API did not answer within ${Math.round(p.timeoutMs / 1000)} s` : hideKey((e as Error).message, p.apiKey);
      if (attempt < p.retries) await sleep(2000 * attempt);
      continue;
    }

    const body = await response.text();
    if (response.ok) {
      try {
        return redactKey(JSON.parse(body), p.apiKey) as Record<string, unknown>;
      } catch {
        throw error.network("The API returned a response that is not JSON.");
      }
    }

    const apiMessage = hideKey(extractMessage(body), p.apiKey);
    lastError = `HTTP ${response.status}: ${apiMessage}`;
    if (response.status === 429 && /per day/i.test(apiMessage)) {
      throw error.network(
        `The daily API quota is exhausted (${lastError}). Save your own key with \`pagespeedfy credentials set pagespeed.api_key\` or wait for the quota to reset.`,
      );
    }
    if (!shouldRetry(response.status)) throw explain(response.status, lastError);
    if (attempt < p.retries) await sleep(2000 * attempt);
  }

  throw error.network(`The ${p.strategy} query failed after ${p.retries} attempt(s): ${lastError}`);
}

/** Reads `error.message` from Google's standard error body. */
function extractMessage(body: string): string {
  try {
    const json = JSON.parse(body) as { error?: { message?: string } };
    return json.error?.message ?? body.slice(0, 300);
  } catch {
    return body.slice(0, 300);
  }
}

/** Adds the likely cause to the most common final failures. */
function explain(status: number, detail: string): AppError {
  if (status === 400) {
    return error.network(`The API refused the query (${detail}). Check that the URL is public, answers HTTP 200 and needs no login.`);
  }
  if (status === 403) {
    return new AppError(
      ExitCode.CREDENTIALS,
      `The API key was refused (${detail}). Check that the PageSpeed Insights API is enabled in the Google Cloud project and that the key has no incompatible restriction.`,
    );
  }
  return error.network(`The API refused the query (${detail}).`);
}
