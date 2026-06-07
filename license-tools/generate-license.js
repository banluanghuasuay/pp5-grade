/**
 * PP.5 License Key Generator (HMAC edition)
 *
 * วิธีใช้:
 *   node generate-license.js \
 *     --name="โรงเรียนวัดสมุทร" \
 *     --plan=paid
 *
 *   node generate-license.js \
 *     --name="โรงเรียนวัดสมุทร" \
 *     --plan=trial \
 *     --days=30
 *
 * Secret key อ่านจาก hmac-secret.txt (หรือส่ง --secret=xxx)
 * ต้องตรงกับ LICENSE_HMAC_SECRET ใน .env.local ของโรงเรียน
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// ── Base32 ─────────────────────────────────────────────────────────────────
const B32 = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const KEY_EPOCH_MS = Date.UTC(2024, 0, 1);

function todayDays() {
  return Math.floor((Date.now() - KEY_EPOCH_MS) / 86_400_000);
}

function b32Encode(bits80n) {
  let n = bits80n;
  let s = "";
  for (let i = 0; i < 16; i++) {
    s = B32[Number(n & 31n)] + s;
    n >>= 5n;
  }
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}`;
}

function pack(plan, expiryDay, hmac8) {
  const planBit = BigInt(plan === "trial" ? 1 : 0);
  const expBits = BigInt(expiryDay & 0x7fff);
  let hmacBig = 0n;
  for (const b of hmac8) hmacBig = (hmacBig << 8n) | BigInt(b);
  return (planBit << 79n) | (expBits << 64n) | hmacBig;
}

// ── HMAC ───────────────────────────────────────────────────────────────────
function computeHmac(secret, schoolName, plan, expiryDay) {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(`${schoolName}|${plan}|${expiryDay}`);
  return hmac.digest(); // Buffer (32 bytes)
}

// ── Arguments ──────────────────────────────────────────────────────────────
function getArg(name) {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.split("=").slice(1).join("=") : null;
}

const schoolName = getArg("name");
const plan = getArg("plan") ?? "trial";
const daysArg = getArg("days");
const secretArg = getArg("secret");

if (!schoolName) {
  console.error('❌ ต้องระบุ --name="ชื่อโรงเรียน"');
  process.exit(1);
}
if (!["trial", "paid"].includes(plan)) {
  console.error('❌ --plan ต้องเป็น "trial" หรือ "paid"');
  process.exit(1);
}

// ── Secret ─────────────────────────────────────────────────────────────────
let secret = secretArg;
if (!secret) {
  const secretFile = path.join(__dirname, "hmac-secret.txt");
  if (fs.existsSync(secretFile)) {
    secret = fs.readFileSync(secretFile, "utf8").trim();
  }
}
if (!secret) {
  console.error("❌ ไม่พบ secret — ส่ง --secret=xxx หรือสร้างไฟล์ hmac-secret.txt");
  process.exit(1);
}

// ── Generate ───────────────────────────────────────────────────────────────
const isLifetime = plan === "paid";
const days = isLifetime ? 0 : (daysArg ? parseInt(daysArg, 10) : 30);
const expiryDay = isLifetime ? 0 : todayDays() + days;

const hmacBytes = computeHmac(secret, schoolName, plan, expiryDay);
const bits = pack(plan, expiryDay, hmacBytes.slice(0, 8));
const licenseKey = b32Encode(bits);

const expiryLabel = isLifetime
  ? "ตลอดชีพ (ไม่หมดอายุ)"
  : new Date(KEY_EPOCH_MS + expiryDay * 86_400_000).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }) + ` (${days} วัน)`;

console.log("\n========================================");
console.log("✅ License Key สำหรับโรงเรียน");
console.log("========================================");
console.log(`โรงเรียน : ${schoolName}`);
console.log(`แผน      : ${plan}`);
console.log(`หมดอายุ  : ${expiryLabel}`);
console.log("========================================");
console.log("\n📋 License Key:\n");
console.log(`  ${licenseKey}`);
console.log("\n========================================\n");
