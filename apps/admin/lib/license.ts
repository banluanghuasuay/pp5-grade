import type { SupabaseClient } from "@supabase/supabase-js";

// ─── Key format: XXXX-XXXX-XXXX-XXXX (16 base32 chars = 80 bits) ─────────────
//
//  bit layout:  [plan:1][expiryDay:15][hmac:64]
//
//  plan      = 0 → paid (lifetime), 1 → trial
//  expiryDay = days from 2024-01-01 (UTC) when the trial expires; 0 for paid
//  hmac      = first 8 bytes of HMAC-SHA256(secret, `${schoolName}|${plan}|${expiryDay}`)
//
//  Base32 alphabet: A-H J-N P-Z 2-9  (no I O 0 1 — ambiguous in print)

const B32 = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

// Days from UTC epoch used by the key format
const KEY_EPOCH_MS = Date.UTC(2024, 0, 1);

function todayDays(): number {
  return Math.floor((Date.now() - KEY_EPOCH_MS) / 86_400_000);
}

// ─── Bit packing ──────────────────────────────────────────────────────────────

function pack(
  plan: "paid" | "trial",
  expiryDay: number,  // days from KEY_EPOCH_MS; 0 for paid
  hmac8: Uint8Array   // first 8 bytes of HMAC
): bigint {
  const planBit = BigInt(plan === "trial" ? 1 : 0);
  const expBits = BigInt(expiryDay & 0x7fff); // 15 bits → max ~89 years from 2024
  let hmacBig = 0n;
  for (const b of hmac8) hmacBig = (hmacBig << 8n) | BigInt(b);
  return (planBit << 79n) | (expBits << 64n) | hmacBig;
}

function unpack(bits: bigint): {
  plan: "paid" | "trial";
  expiryDay: number;
  hmac8: Uint8Array;
} {
  const planBit  = Number(bits >> 79n) & 1;
  const expiryDay = Number((bits >> 64n) & 0x7fffn);
  const hmacBig  = bits & ((1n << 64n) - 1n);
  const hmac8 = new Uint8Array(8);
  let tmp = hmacBig;
  for (let i = 7; i >= 0; i--) { hmac8[i] = Number(tmp & 0xffn); tmp >>= 8n; }
  return { plan: planBit === 1 ? "trial" : "paid", expiryDay, hmac8 };
}

// ─── Base32 encode / decode ───────────────────────────────────────────────────

function b32Encode(bits80: bigint): string {
  let n = bits80;
  let s = "";
  for (let i = 0; i < 16; i++) { s = B32[Number(n & 31n)] + s; n >>= 5n; }
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}`;
}

function b32Decode(key: string): bigint | null {
  const s = key.replace(/-/g, "").toUpperCase();
  if (s.length !== 16) return null;
  let n = 0n;
  for (const ch of s) {
    const idx = B32.indexOf(ch);
    if (idx < 0) return null;
    n = (n << 5n) | BigInt(idx);
  }
  return n;
}

// ─── HMAC-SHA256 ──────────────────────────────────────────────────────────────

// ฝัง secret ในโค้ดตายตัว — ไม่ต้องตั้งค่า env
const BUILT_IN_SECRET = "PP5-Grade-License-2024";

async function computeHmac(
  schoolName: string,
  plan: string,
  expiryDay: number
): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw", enc.encode(BUILT_IN_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC", cryptoKey,
    enc.encode(`${schoolName}|${plan}|${expiryDay}`)
  );
  return new Uint8Array(sig);
}

// ─── Public types ─────────────────────────────────────────────────────────────

export type LicensePayload = {
  school_name: string;
  plan: "trial" | "paid";
  /** Unix seconds of expiry (trial only) */
  exp?: number;
};

export type LicenseResult =
  | { valid: true; payload: LicensePayload }
  | { valid: false; reason: "missing" | "invalid" | "expired" | "school_mismatch" };

// ─── Verify short key ─────────────────────────────────────────────────────────

/**
 * ตรวจสอบ license key รูปแบบ XXXX-XXXX-XXXX-XXXX
 * ต้องการ env var: LICENSE_HMAC_SECRET
 */
export async function verifyShortKey(
  key: string,
  schoolName: string
): Promise<LicenseResult> {
  const bits = b32Decode(key);
  if (bits === null) return { valid: false, reason: "invalid" };

  const { plan, expiryDay, hmac8 } = unpack(bits);

  const expected = await computeHmac(schoolName, plan, expiryDay);
  const match = hmac8.every((b, i) => b === expected[i]);
  if (!match) return { valid: false, reason: "invalid" };

  if (plan === "trial" && todayDays() > expiryDay) {
    return { valid: false, reason: "expired" };
  }

  return {
    valid: true,
    payload: {
      school_name: schoolName,
      plan,
      exp:
        plan === "trial"
          ? Math.floor((KEY_EPOCH_MS + expiryDay * 86_400_000) / 1000)
          : undefined,
    },
  };
}

// ─── Trial / Access Level ─────────────────────────────────────────────────────

export const TRIAL_DAYS = 90;

export type AccessLevel = "full" | "trial" | "readonly";

export type AccessInfo =
  | { level: "full"; plan: "paid" | "trial-license" }
  | { level: "trial"; daysRemaining: number }
  | { level: "readonly"; expiredDaysAgo: number };

export async function getAccessLevel(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>
): Promise<AccessInfo> {
  const { data: school } = await supabase
    .from("schools")
    .select("license_key, name_th, created_at")
    .maybeSingle();

  // 1. ตรวจ license key ก่อน
  if (school?.license_key && school?.name_th) {
    const result = await verifyShortKey(school.license_key, school.name_th);
    if (result.valid) {
      const plan = result.payload.plan === "paid" ? "paid" : "trial-license";
      return { level: "full", plan };
    }
  }

  // 2. ไม่มี license — ตรวจ trial period จาก created_at
  const installedAt = school?.created_at
    ? new Date(school.created_at)
    : new Date();
  const daysSince = Math.floor(
    (Date.now() - installedAt.getTime()) / 86_400_000
  );
  const daysRemaining = TRIAL_DAYS - daysSince;

  if (daysRemaining > 0) return { level: "trial", daysRemaining };
  return { level: "readonly", expiredDaysAgo: Math.abs(daysRemaining) };
}
