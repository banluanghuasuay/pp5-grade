import { createClient } from "@pp5/database/server";
import { Card, PageHeader } from "@pp5/ui";
import { Download, Upload } from "lucide-react";
import Link from "next/link";
import { ImportWizard } from "./import-wizard";

export const metadata = {
  title: "นำเข้านักเรียน · ระบบ ปพ.5",
};

/**
 * Bulk import students from an Excel file.
 *
 * Phase 1 — skeleton with template download.
 * Phase 2 (next) — upload + parse + preview tabs (valid / duplicate / invalid).
 * Phase 3 — confirm + commit + result summary.
 */
export default async function StudentsImportPage() {
  const supabase = await createClient();

  // Show the current year so admin knows which year imports will target
  const { data: currentYear } = await supabase
    .from("academic_years")
    .select("year_be")
    .eq("is_current", true)
    .maybeSingle();

  return (
    <>
      <PageHeader
        icon={Upload}
        iconBg="bg-sky-100 text-sky-700"
        title="นำเข้านักเรียนจาก Excel"
        description={
          <>
            อัปโหลดไฟล์ <code>.xlsx</code>{" "}
            เพื่อสร้างข้อมูลนักเรียนหลายคนพร้อมกัน
            {currentYear && (
              <>
                {" · ปีปัจจุบัน "}
                <strong className="font-mono">{currentYear.year_be}</strong>
              </>
            )}
          </>
        }
        action={
          <Link
            href="/setup/students"
            className="shrink-0 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
          >
            ← กลับไปหน้านักเรียน
          </Link>
        }
      />

      {/* Step 1: Template download */}
      <Card padding="md" className="mb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-zinc-900">
              1. ดาวน์โหลด Template
            </h3>
            <p className="mt-1 text-sm text-zinc-600">
              คอลัมน์: <strong>เลขประจำตัว · คำนำหน้า · ชื่อ · นามสกุล · ชั้น · ห้อง</strong>
              <br />
              คำนำหน้าใช้ได้ทั้งตัวเต็ม (<code>เด็กชาย</code>) และตัวย่อ
              (<code>ด.ช.</code>) · ชั้น <code>ป.1</code>–<code>ม.3</code> ·
              ห้องเป็นตัวเลข เช่น <code>1</code>
              <br />
              <span className="text-zinc-500">
                💡 <strong>ห้อง</strong>: ถ้าชั้นนั้นมีห้องเดียว เว้นว่างไว้ก็ได้
                (ระบบจะกำหนดให้อัตโนมัติ)
              </span>
            </p>
          </div>
          <a
            href="/api/students/template"
            download
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
          >
            <Download className="size-4" aria-hidden />
            ดาวน์โหลด Template
          </a>
        </div>
      </Card>

      {/* Step 2: Upload + Preview + Commit (handled by the client wizard) */}
      <ImportWizard />
    </>
  );
}
