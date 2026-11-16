/**
 * Resolves the PageSpeed Insights API key.
 *
 * Order: the `PAGESPEEDFY_API_KEY` variable (CI and one-off runs), then the
 * encrypted Termfy vault under the name `pagespeed.api_key`. Before reading
 * the vault, a key left by Pagespeedfy 0.3.x in the plain-text file
 * `~/.pagespeedfy/credentials` is moved into the vault and the old file is
 * deleted, so upgrading keeps working without a new login.
 *
 * The key never reaches stdout, `--json`, MCP results or TUI frames; only
 * `mask()` output does.
 */
import { readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { getCredential, listCredentials, mask, setCredential } from "../config/credentials.ts";
import { baseDir, exists, paths } from "../config/paths.ts";

/** Vault entry that holds the API key. */
export const API_KEY_CREDENTIAL = "pagespeed.api_key";

/** Environment variable that overrides the vault. */
export const API_KEY_VARIABLE = "PAGESPEEDFY_API_KEY";

/** Where the API key came from. */
export type KeySource = "env" | "vault";

/** Path of the plain-text credential file used by Pagespeedfy 0.3.x. */
export function legacyCredentialPath(): string {
  return join(baseDir(), "credentials");
}

/**
 * Moves the 0.3.x key into the vault. Returns true when a key was imported.
 *
 * A key already in the vault always wins: the legacy file is then left
 * alone, so a new key saved before the first run is never replaced by an
 * old one. An unreadable vault or legacy file also skips the import; the
 * vault error surfaces later, from `getCredential()`, with its own code.
 */
export function importLegacyKey(warn: (text: string) => void = () => {}): boolean {
  const path = legacyCredentialPath();
  if (!exists(path)) return false;
  if (exists(paths.credentials())) {
    try {
      if (listCredentials().includes(API_KEY_CREDENTIAL)) return false;
    } catch {
      return false;
    }
  }
  let apiKey: string | undefined;
  try {
    const data = JSON.parse(readFileSync(path, "utf8")) as { apiKey?: unknown };
    apiKey = typeof data.apiKey === "string" ? data.apiKey.trim() : undefined;
  } catch {
    return false;
  }
  if (!apiKey) return false;
  setCredential(API_KEY_CREDENTIAL, apiKey);
  unlinkSync(path);
  warn(`Moved the API key ${mask(apiKey)} from ${path} into the encrypted vault (${API_KEY_CREDENTIAL}).\n`);
  return true;
}

/**
 * Returns the key and its source. Raises CREDENTIALS (4) with the command
 * that saves it when neither the variable nor the vault has one.
 */
export function resolveApiKey(warn?: (text: string) => void): { apiKey: string; source: KeySource } {
  const env = process.env[API_KEY_VARIABLE]?.trim();
  if (env) return { apiKey: env, source: "env" };
  importLegacyKey(warn);
  return { apiKey: getCredential(API_KEY_CREDENTIAL), source: "vault" };
}

/** Tells whether the Google key looks like the usual format (AIza + 35 characters). */
export function looksLikeGoogleKey(value: string): boolean {
  return /^AIza[0-9A-Za-z_-]{35}$/.test(value);
}
