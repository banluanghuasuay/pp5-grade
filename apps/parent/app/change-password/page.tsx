import { getCurrentStudent } from "@pp5/database/queries";
import { Card } from "@pp5/ui";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "./change-password-form";

export const metadata = { title: "เปลี่ยนรหัสผ่าน" };

export default async function ChangePasswordPage() {
  // Defensive: proxy.ts should already redirect unauthenticated visitors
  const auth = await getCurrentStudent();
  if (!auth) redirect("/login");

  const { student } = auth;

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
          >
            <ArrowLeft className="size-4" aria-hidden />
            กลับ
          </Link>
          <h1 className="text-base font-bold sm:text-lg">เปลี่ยนรหัสผ่าน</h1>
        </div>
      </header>

      <main className="mx-auto max-w-md p-4 sm:p-6">
        <Card className="rounded-lg p-5 shadow-sm" padding={false}>
          <p className="text-sm text-zinc-500">
            {student.title}
            {student.first_name} {student.last_name}
          </p>
          <p className="mb-4 font-mono text-sm font-medium text-zinc-900">
            {student.student_code}
          </p>
          <ChangePasswordForm />
        </Card>
      </main>
    </div>
  );
}
