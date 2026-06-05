import localVersion from "@/version.json";

/**
 * Canonical version source = apps/admin/version.json on the upstream `main`
 * branch. Every school deploys from a fork of this repo; their build bakes in
 * whatever version.json existed when they last synced. We fetch the CURRENT
 * upstream version.json at runtime and compare — an un-synced fork has an older
 * baked-in version, so the gap surfaces as an "update available" banner.
 *
 * Hardcoded to the upstream repo on purpose: forks should always compare
 * against the source of truth, not their own (stale) copy.
 */
const UPSTREAM_VERSION_URL =
  "https://raw.githubusercontent.com/WebAppSchool-By-Chanon/pp5-grade/main/apps/admin/version.json";

export type UpdateStatus = {
  /** Version baked into this deployment */
  current: string;
  /** Latest version published upstream */
  latest: string;
  /** Short Thai changelog note for the latest version, if any */
  notes: string | null;
};

/**
 * Semver-ish compare of "1.2.3" strings. Returns >0 if a is newer than b,
 * <0 if older, 0 if equal. Tolerates a leading "v" and missing segments.
 */
function compareVersions(a: string, b: string): number {
  const parse = (v: string) =>
    v.replace(/^v/, "").split(".").map((n) => parseInt(n, 10) || 0);
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Returns update info when upstream is newer than this build, else null.
 *
 * FAILS SILENT (returns null) on any network/parse error — the banner must
 * never break the app, and "can't reach GitHub" should look like "up to date".
 *
 * Cached 1h via Next's fetch revalidate → roughly one GitHub request per hour
 * per server instance, far under the 60/hr unauthenticated rate limit.
 */
export type VersionStatus = {
  /** Version baked into this deployment */
  current: string;
  /** Latest version upstream, or null if upstream couldn't be reached */
  latest: string | null;
  /** True when upstream is strictly newer than this build */
  updateAvailable: boolean;
  /** Changelog note for the newer version (only when updateAvailable) */
  notes: string | null;
};

/**
 * Always-returns version status — drives the dashboard "current version"
 * indicator. `latest` is null when GitHub can't be reached (treated as
 * "can't confirm", NOT "outdated"). Cached 1h via fetch revalidate; the
 * dashboard line and the banner both call into this in one render, so Next
 * dedupes them to a single network request.
 */
export async function getVersionStatus(): Promise<VersionStatus> {
  const current = localVersion.version;
  try {
    const res = await fetch(UPSTREAM_VERSION_URL, {
      next: { revalidate: 3600 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok)
      return { current, latest: null, updateAvailable: false, notes: null };
    const remote = (await res.json()) as { version?: string; notes?: string };
    if (!remote.version)
      return { current, latest: null, updateAvailable: false, notes: null };
    const updateAvailable = compareVersions(remote.version, current) > 0;
    return {
      current,
      latest: remote.version,
      updateAvailable,
      notes: updateAvailable ? (remote.notes ?? null) : null,
    };
  } catch {
    return { current, latest: null, updateAvailable: false, notes: null };
  }
}

/**
 * Returns update info when upstream is newer than this build, else null —
 * thin wrapper over getVersionStatus for the dismissible banner.
 *
 * FAILS SILENT (returns null) on any error — the banner must never break the
 * app, and "can't reach GitHub" should look like "up to date".
 */
export async function checkForUpdate(): Promise<UpdateStatus | null> {
  const status = await getVersionStatus();
  if (!status.updateAvailable || !status.latest) return null;
  return {
    current: status.current,
    latest: status.latest,
    notes: status.notes,
  };
}
