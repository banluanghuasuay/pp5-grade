import { importSPKI, jwtVerify } from "jose";
import type { SupabaseClient } from "@supabase/supabase-js";

const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtCS5BGklxzTPUhuoatCw
cze5banEd8QJ8YvAxt03gIZP41HoTr92HFnfznRMmrKciFKc+bPN698B3ltPJnyx
WMeUF7qBdMGxr3NjZrV7sJupwkM+JYFTHfVjoZmqUVuJWbmYyxBFUPLBoK7vuQay
19Dp+5/Ck4teWA4kB2Tol8f6+rCe3FGt4LdjmFSklUFof6EBS/HHw23Cr7hO6+qw
4QggzYkMVV9WXzbrEHrfpVNKy6tyYOVHO3r+saeEZoLpvMZspY7FCgDSG5h0j8hQ
zcVcbH938pbC3eLWKe/aaUNmERaW9MRTSaMD5EIZtOO7yIuxSS81zTJMBHw2wLM6
DwIDAQAB
-----END PUBLIC KEY-----`;

export type LicensePayload = {
  school_id: string;
  school_name: string;
  plan: "trial" | "paid";
  exp?: number;
};

export type LicenseResult =
  | { valid: true; payload: LicensePayload }
  | { valid: false; reason: "missing" | "invalid" | "expired" | "school_mismatch" };

let _publicKey: CryptoKey | null = null;

async function getPublicKey(): Promise<CryptoKey> {
  if (!_publicKey) {
    _publicKey = await importSPKI(PUBLIC_KEY_PEM, "RS256");
  }
  return _publicKey;
}

export async function verifyToken(token: string): Promise<LicenseResult> {
  try {
    const publicKey = await getPublicKey();
    const { payload } = await jwtVerify(token, publicKey, { algorithms: ["RS256"] });

    const licensePayload: LicensePayload = {
      school_id: payload.school_id as string,
      school_name: payload.school_name as string,
      plan: payload.plan as "trial" | "paid",
      exp: payload.exp,
    };

    return { valid: true, payload: licensePayload };
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("exp")) {
      return { valid: false, reason: "expired" };
    }
    return { valid: false, reason: "invalid" };
  }
}

// อ่าน license key จาก DB แล้ว verify
export async function verifyLicenseFromDb(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>
): Promise<LicenseResult> {
  const { data } = await supabase
    .from("schools")
    .select("license_key, name_th")
    .maybeSingle();

  if (!data?.license_key) return { valid: false, reason: "missing" };

  const result = await verifyToken(data.license_key);

  if (result.valid && data.name_th && result.payload.school_name !== data.name_th) {
    return { valid: false, reason: "school_mismatch" };
  }

  return result;
}

// ใช้ใน proxy.ts (อ่านจาก cookie cache หรือ env fallback)
export async function verifyLicense(): Promise<LicenseResult> {
  const token = process.env.LICENSE_KEY;
  if (!token) return { valid: false, reason: "missing" };
  return verifyToken(token);
}

// ─── Trial / Access Level ────────────────────────────────────────────────────

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
  if (school?.license_key) {
    const result = await verifyToken(school.license_key);
    if (result.valid) {
      const plan = result.payload.plan === "paid" ? "paid" : "trial-license";
      return { level: "full", plan };
    }
  }

  // 2. ไม่มี license — ตรวจ trial period จาก created_at
  const installedAt = school?.created_at ? new Date(school.created_at) : new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysSince = Math.floor((Date.now() - installedAt.getTime()) / msPerDay);
  const daysRemaining = TRIAL_DAYS - daysSince;

  if (daysRemaining > 0) {
    return { level: "trial", daysRemaining };
  }

  return { level: "readonly", expiredDaysAgo: Math.abs(daysRemaining) };
}
