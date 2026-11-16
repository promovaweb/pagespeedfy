/**
 * Locates the user's project and its `.pagespeedfy/` directory.
 *
 * Unlike settings and the vault, which live in `~/.pagespeedfy/`, the
 * measurement history belongs to the project being optimized: it sits in
 * `<project>/.pagespeedfy/`, next to the site code, so the improvement
 * history travels with the repository when the team wants it to.
 *
 * Layout:
 *
 * - `history.db`  SQLite database with pages and measurements;
 * - `reports/<host>/<route>/<YYYYMMDD-HHMMSS>/<strategy>-<n>.raw.json`
 *   raw API responses, one per sample;
 * - `.gitignore`  ignores the raw reports and SQLite side files, so only
 *   `history.db` can be committed.
 *
 * Resolution order: `--project <dir>`, the `PAGESPEEDFY_PROJECT` variable,
 * the nearest ancestor of the current directory that already has a
 * `.pagespeedfy/` folder (the home folder is skipped, since `~/.pagespeedfy`
 * is the app data directory), the nearest ancestor with `.git` or
 * `package.json`, and finally the current directory.
 */
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { classifyFsError } from "../app/errors.ts";
import { ExitCode } from "../app/exit-codes.ts";
import { exists } from "../config/paths.ts";

/** Name of the project data directory. */
export const PROJECT_DIR_NAME = ".pagespeedfy";

/** Environment variable that points to the project root. */
export const PROJECT_VARIABLE = "PAGESPEEDFY_PROJECT";

/** Content of the generated `.pagespeedfy/.gitignore`. */
export const PROJECT_GITIGNORE = [
  "# Created by pagespeedfy. history.db can be committed to share the history.",
  "reports/",
  "*.db-wal",
  "*.db-shm",
  "*.bak",
  "",
].join("\n");

/** Paths of one project. */
export interface ProjectPaths {
  /** Project root. */
  root: string;
  /** `<root>/.pagespeedfy`. */
  dataDir: string;
  /** `<root>/.pagespeedfy/history.db`. */
  database: string;
  /** `<root>/.pagespeedfy/reports`. */
  reports: string;
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/** Builds the paths for a known root. */
export function projectPaths(root: string): ProjectPaths {
  const dataDir = join(root, PROJECT_DIR_NAME);
  return { root, dataDir, database: join(dataDir, "history.db"), reports: join(dataDir, "reports") };
}

/**
 * Finds the project root following the resolution order in the header.
 * Pure lookup: nothing is created.
 */
export function findProjectRoot(explicit?: string, cwd = process.cwd(), home = homedir()): string {
  if (explicit && explicit.trim()) return resolve(cwd, explicit);
  const env = process.env[PROJECT_VARIABLE]?.trim();
  if (env) return resolve(cwd, env);

  const start = resolve(cwd);
  const homeDir = resolve(home);
  let marker: string | undefined;
  for (let dir = start; ; dir = dirname(dir)) {
    if (dir !== homeDir && isDirectory(join(dir, PROJECT_DIR_NAME))) return dir;
    if (!marker && (exists(join(dir, ".git")) || exists(join(dir, "package.json")))) marker = dir;
    if (dirname(dir) === dir) break;
  }
  return marker ?? start;
}

/** Resolves the project and returns its paths. Nothing is created. */
export function resolveProject(explicit?: string, cwd?: string): ProjectPaths {
  return projectPaths(findProjectRoot(explicit, cwd));
}

/**
 * Creates `.pagespeedfy/` and its `.gitignore` when missing. Raises
 * PERMISSION (7) when the folder cannot be written.
 */
export function ensureProjectDir(project: ProjectPaths): ProjectPaths {
  try {
    mkdirSync(project.dataDir, { recursive: true });
    const ignore = join(project.dataDir, ".gitignore");
    if (!exists(ignore)) writeFileSync(ignore, PROJECT_GITIGNORE, "utf8");
    return project;
  } catch (e) {
    throw classifyFsError(e, ExitCode.CONFIG, `Could not create ${project.dataDir}`);
  }
}

/** Local timestamp in the `YYYYMMDD-HHMMSS` form. */
export function stamp(date = new Date()): string {
  const d = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${d(date.getMonth() + 1)}${d(date.getDate())}-${d(date.getHours())}${d(date.getMinutes())}${d(date.getSeconds())}`;
}
