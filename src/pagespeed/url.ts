/**
 * URL validation and the stable page key used by the history.
 *
 * PageSpeed Insights runs on Google's servers, so it cannot reach
 * `localhost`, private networks, link-local or CGNAT addresses (Tailscale
 * included) or internal-only names. Refusing them up front saves a slow
 * round trip that would fail anyway.
 */
import { error } from "../app/errors.ts";

/** IPv4 ranges PageSpeed Insights cannot reach. */
const PRIVATE_V4 = [
  /^0\./,
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
];

/** Host suffixes that only resolve inside a private network. */
const PRIVATE_SUFFIXES = ["localhost", ".localhost", ".local", ".internal", ".lan", ".home.arpa"];

/** Tells whether a hostname is unreachable from the public internet. */
export function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.+$/, "");
  // A single label (`intranet`, `router`) only resolves inside a network.
  if (!host.includes(".") && !host.includes(":")) return true;
  if (PRIVATE_SUFFIXES.some((s) => host === s.replace(/^\./, "") || host.endsWith(s))) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) && PRIVATE_V4.some((r) => r.test(host))) return true;
  if (host.includes(":")) {
    // IPv6: loopback, unspecified, unique local (fc00::/7) and link-local (fe80::/10).
    if (host === "::1" || host === "::") return true;
    // IPv4-mapped IPv6 (::ffff:10.0.0.1, or ::ffff:a00:1 once the URL parser normalizes it).
    const mapped = /^::ffff:(.+)$/.exec(host)?.[1];
    if (mapped) {
      const v4 = mapped.includes(".") ? mapped : hexToIpv4(mapped);
      if (!v4 || PRIVATE_V4.some((r) => r.test(v4))) return true;
    }
    if (/^f[cd][0-9a-f]{0,2}:/.test(host)) return true;
    if (/^fe[89ab][0-9a-f]?:/.test(host)) return true;
  }
  return false;
}

/** Converts the `a00:1` tail of an IPv4-mapped IPv6 address to `10.0.0.1`. */
function hexToIpv4(tail: string): string | undefined {
  const parts = tail.split(":");
  if (parts.length !== 2) return undefined;
  const [hi, lo] = parts.map((p) => Number.parseInt(p, 16));
  if (hi === undefined || lo === undefined || Number.isNaN(hi) || Number.isNaN(lo)) return undefined;
  return [hi >> 8, hi & 255, lo >> 8, lo & 255].join(".");
}

/**
 * Validates the URL given by the user: absolute, http or https and public.
 * Raises USAGE (2) with an actionable message otherwise.
 */
export function validateUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw error.usage(`Invalid URL: ${input}. Give the full URL, with https://.`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw error.usage(`Unsupported protocol: ${url.protocol}. Use http or https.`);
  }
  if (isPrivateHost(url.hostname)) {
    throw error.usage(`PageSpeed Insights cannot reach ${url.hostname}. Publish the page (preview or production) and give the public URL.`);
  }
  return url;
}

/**
 * Key that identifies a page in the history: the URL without the fragment.
 * Query strings stay, since they can change what the page renders.
 */
export function pageKey(url: URL): string {
  const copy = new URL(url.toString());
  copy.hash = "";
  return copy.toString();
}

/** Decodes percent-encoding, keeping the raw text when it is not valid UTF-8 (`/%FF`). */
function safeDecode(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

/** Turns the URL path into a stable folder name (`/` becomes `home`). */
export function routeSlug(url: URL): string {
  const parts = safeDecode(url.pathname).split("/").filter(Boolean);
  const base = parts.length === 0 ? "home" : parts.join("--");
  const query = url.search ? `--q-${url.search.slice(1)}` : "";
  return `${base}${query}`
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .slice(0, 120);
}
