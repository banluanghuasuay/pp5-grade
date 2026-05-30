import { getCurrentStudent } from "@pp5/database/queries";
import { Button, Card } from "@pp5/ui";
import { redirect } from "next/navigation";
import { logoutAction } from "./_actions/auth";

const GENDER_LABEL: Record<string, string> = {
  male: "ชาย",
  female: "หญิง",
};

export default async function Home() {
  // Defensive: proxy.ts should already redirect, but check again
  const auth = await getCurrentStudent();
  if (!auth) redirect("/login");

  const { student } = auth;

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-bold sm:text-lg">ระบบรายงานผลการเรียน</h1>
            <p className="text-xs text-zinc-500">นักเรียนและผู้ปกครอง</p>
          </div>
          <form action={logoutAction}>
            <Button type="submit" variant="secondary" size="sm">
              ออกจากระบบ
            </Button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-3xl p-4 sm:p-6">
        <Card className="rounded-lg p-5 shadow-sm" padding={false}>
          <h2 className="text-sm font-medium text-zinc-500">นักเรียน</h2>
          <p className="mt-1 text-2xl font-bold text-zinc-900">
            {student.title}
            {student.first_name} {student.last_name}
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-zinc-500">รหัสนักเรียน</dt>
              <dd className="font-mono font-medium text-zinc-900">
                {student.student_code}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">เพศ</dt>
              <dd className="font-medium text-zinc-900">
                {student.gender ? GENDER_LABEL[student.gender] : "-"}
              </dd>
            </div>
          </dl>
        </Card>

        <Card variant="dashed" padding={false} className="mt-6 rounded-lg p-5 text-center text-sm text-zinc-500">
          ข้อมูลผลการเรียน · เวลาเรียน · คุณลักษณะอันพึงประสงค์
          <br />
          จะแสดงในเฟส 3
        </Card>
      </main>
    </div>
  );
}
