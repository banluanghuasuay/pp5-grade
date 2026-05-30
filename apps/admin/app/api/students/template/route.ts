import { getCurrentUser } from "@pp5/database/queries";
import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

/**
 * GET /api/students/template
 *
 * Returns an empty Excel template for bulk student import. Headers:
 *
 *   | เลขประจำตัว | คำนำหน้า | ชื่อ | นามสกุล | ชั้น | ห้อง |
 *
 * One example row is included so the admin sees the expected format.
 * Admin-only.
 */
export async function GET() {
  const auth = await getCurrentUser();
  if (!auth || auth.profile.role !== "admin") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "ระบบ ปพ.5";
  wb.created = new Date();

  const ws = wb.addWorksheet("นักเรียน");
  ws.columns = [
    { header: "เลขประจำตัว", key: "student_code", width: 14 },
    { header: "คำนำหน้า", key: "title", width: 10 },
    { header: "ชื่อ", key: "first_name", width: 16 },
    { header: "นามสกุล", key: "last_name", width: 18 },
    { header: "ชั้น", key: "grade", width: 8 },
    { header: "ห้อง", key: "room", width: 6 },
  ];

  // Style the header row
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0F2FE" }, // sky-100
  };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };
  headerRow.height = 22;

  // Sample data row to demonstrate the format. Use the full form for the
  // example since that's how the system stores them; abbreviations are
  // accepted on input but normalized to full form.
  ws.addRow({
    student_code: "67001",
    title: "เด็กชาย",
    first_name: "สมชาย",
    last_name: "ใจดี",
    grade: "ป.1",
    room: 1,
  });

  // Add borders to the first two rows so the format is clear
  for (let r = 1; r <= 2; r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= 6; c++) {
      row.getCell(c).border = {
        top: { style: "thin", color: { argb: "FF9CA3AF" } },
        left: { style: "thin", color: { argb: "FF9CA3AF" } },
        bottom: { style: "thin", color: { argb: "FF9CA3AF" } },
        right: { style: "thin", color: { argb: "FF9CA3AF" } },
      };
    }
  }

  // Notes sheet — explains valid values to the user
  const notes = wb.addWorksheet("คำอธิบาย");
  notes.columns = [
    { header: "หัวข้อ", key: "key", width: 14 },
    { header: "รายละเอียด", key: "detail", width: 60 },
  ];
  notes.getRow(1).font = { bold: true };
  notes.addRows([
    {
      key: "เลขประจำตัว",
      detail: "รหัสประจำตัวนักเรียนแบบไม่ซ้ำ (ตัวเลข/ตัวอักษร) — ห้ามซ้ำกับที่มีในระบบ",
    },
    {
      key: "คำนำหน้า",
      detail:
        "ใช้ได้ทั้งตัวเต็มและตัวย่อ:  เด็กชาย หรือ ด.ช.  ·  เด็กหญิง หรือ ด.ญ.  ·  นางสาว หรือ น.ส.  ·  นาย  ·  นาง  (ระบบจะเก็บเป็นตัวเต็มอัตโนมัติ)",
    },
    { key: "ชั้น", detail: "ใช้ตัวย่อ เช่น ป.1 ป.2 … ป.6 ม.1 ม.2 ม.3" },
    {
      key: "ห้อง",
      detail:
        "เลขห้อง เช่น 1, 2, 3 (ต้องมีห้องนั้นในปีการศึกษาปัจจุบัน) · ถ้าชั้นนั้นมีห้องเดียว เว้นว่างไว้ก็ได้",
    },
  ]);

  const buffer = await wb.xlsx.writeBuffer();

  const filename = "student-import-template.xlsx";
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
