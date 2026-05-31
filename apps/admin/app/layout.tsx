import type { Metadata } from "next";
import { Sarabun } from "next/font/google";
import "./globals.css";

const sarabun = Sarabun({
  variable: "--font-sarabun",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  // Constant title on every tab — user spec 2026-05-31: "ใช้แบบนี้ทุกหน้า".
  // No template (which would prefix child titles); pages drop their own
  // `title` so they inherit this default verbatim.
  title: "ระบบบันทึกผลการเรียนออนไลน์",
  description: "ระบบบันทึกผลการเรียนตามหลักสูตรแกนกลาง 2551 — หลังบ้าน (admin + ครู)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${sarabun.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
