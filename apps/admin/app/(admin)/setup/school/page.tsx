import { createClient } from "@pp5/database/server";
import { requireAdmin } from "@/lib/teacher-scope";
import { Card, PageHeader } from "@pp5/ui";
import { Building2 } from "lucide-react";
import { SchoolForm } from "./school-form";
import { SchoolLogoUploader } from "./school-logo-uploader";

export const metadata = {
  title: "ระบบบันทึกผลการเรียนออนไลน์",
};

export default async function SchoolSettingsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: school, error } = await supabase
    .from("schools")
    .select(
      "id, name_th, name_en, affiliation, address, district, province, phone, logo_url, director_name, director_title, deputy_director_name, academic_head_name, assessment_officer_name",
    )
    .maybeSingle();

  return (
    <>
      <PageHeader
        icon={Building2}
        iconBg="bg-indigo-100 text-indigo-700"
        title="ตั้งค่าโรงเรียน"
        description="ข้อมูลโรงเรียน · ชื่อ ผอ. · รอง ผอ. · ฝ่ายวิชาการ · งานวัดผล — ใช้ในเอกสาร ปพ.5"
      />

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-semibold">❌ Error:</p>
          <pre className="mt-2">{error.message}</pre>
        </div>
      )}

      {!error && !school && (
        <Card variant="warning" className="text-sm text-amber-900">
          <p className="font-semibold">⚠️ ยังไม่มี record โรงเรียนในระบบ</p>
          <p className="mt-2">รัน SQL นี้ใน Supabase SQL Editor:</p>
          <pre className="mt-2 rounded bg-amber-100 p-2 text-xs">
            {`INSERT INTO schools (name_th) VALUES ('โรงเรียน');`}
          </pre>
        </Card>
      )}

      {!error && school && (() => {
        // Separate logo_url from the rest — the main form doesn't render
        // or submit it (the dedicated uploader does). Doing it inside an
        // IIFE here so TS keeps `school` narrowed to non-null.
        const { logo_url: logoUrl, ...schoolFormValues } = school;
        return (
          <div className="max-w-3xl space-y-4">
            {/* Logo uploader — sibling top-level form (NOT nested inside
                the SchoolForm <form>, since HTML disallows nested forms
                and the upload action wants its own multipart payload). */}
            <Card>
              <SchoolLogoUploader
                schoolId={school.id}
                currentUrl={logoUrl}
              />
            </Card>

            <Card>
              <SchoolForm defaultValues={schoolFormValues} />
            </Card>
          </div>
        );
      })()}
    </>
  );
}
