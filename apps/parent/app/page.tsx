import { getCurrentStudent } from "@pp5/database/queries";
import { Card } from "@pp5/ui";
import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "./_actions/auth";
import { LogoutButton } from "./_components/logout-button";
import {
  buildTermReport,
  deriveTerms,
  fetchStudentGrades,
  fetchTermEvals,
  levelLabel,
  pickTerm,
} from "./_data/report-card";
import { TermSelector } from "./term-selector";

const GENDER_LABEL: Record<string, string> = {
  male: "ชาย",
  female: "หญิง",
};

/** Grade → display: "4", "3.5", or "ร"/"มส", or "-". */
function formatGrade(grade: number | null, special: "ร" | "มส" | null): string {
  if (special) return special;
  if (grade == null) return "-";
  return grade % 1 === 0 ? String(grade) : grade.toFixed(1);
}

function EvalRow({ label, level }: { label: string; level: number | null }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-sm">
      <dt className="text-zinc-700">{label}</dt>
      <dd className="shrink-0 font-medium text-zinc-900">
        {levelLabel(level)}
      </dd>
    </div>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ term?: string }>;
}) {
  // Defensive: proxy.ts should already redirect
  const auth = await getCurrentStudent();
  if (!auth) redirect("/login");

  const { student } = auth;

  const grades = await fetchStudentGrades(student.id);
  const terms = deriveTerms(grades);
  const { term: termKey } = await searchParams;
  const term = pickTerm(terms, termKey);
  const report = term ? buildTermReport(grades, term) : null;
  const evals = term
    ? await fetchTermEvals(student.id, term.yearId, term.semester)
    : null;

  const hasSubjects =
    !!report && (report.numeric.length > 0 || report.activity.length > 0);

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-bold sm:text-lg">ระบบรายงานผลการเรียน</h1>
            <p className="text-xs text-zinc-500">นักเรียนและผู้ปกครอง</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/change-password"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
            >
              เปลี่ยนรหัสผ่าน
            </Link>
            <form action={logoutAction}>
              <LogoutButton />
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
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

        {!term || !report ? (
          <Card
            variant="dashed"
            padding={false}
            className="rounded-lg p-5 text-center text-sm text-zinc-500"
          >
            ยังไม่มีผลการเรียนที่ประกาศ
            <br />
            จะแสดงเมื่อครูบันทึกและประกาศผลแล้ว
          </Card>
        ) : (
          <Card className="rounded-lg p-5 shadow-sm" padding={false}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-bold text-zinc-900">ผลการเรียน</h2>
              <TermSelector terms={terms} selectedKey={term.key} />
            </div>

            {!hasSubjects ? (
              <p className="mt-4 text-sm text-zinc-500">
                ภาคเรียนนี้ยังไม่มีรายวิชาที่มีผลการเรียน
              </p>
            ) : (
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                    <th className="py-2 font-medium">รายวิชา</th>
                    <th className="py-2 text-right font-medium">ผลการเรียน</th>
                  </tr>
                </thead>
                <tbody>
                  {report.numeric.map((s) => (
                    <tr
                      key={s.code}
                      className="border-b border-zinc-100 last:border-b-0"
                    >
                      <td className="py-2.5">
                        <div className="font-medium text-zinc-900">{s.name}</div>
                        <div className="font-mono text-xs text-zinc-400">
                          {s.code}
                        </div>
                      </td>
                      <td className="py-2.5 text-right text-base font-semibold text-zinc-900">
                        {formatGrade(s.grade, s.special)}
                      </td>
                    </tr>
                  ))}
                  {report.activity.map((s) => (
                    <tr
                      key={s.code}
                      className="border-b border-zinc-100 last:border-b-0"
                    >
                      <td className="py-2.5">
                        <div className="font-medium text-zinc-900">{s.name}</div>
                        <div className="font-mono text-xs text-zinc-400">
                          {s.code} · กิจกรรม
                        </div>
                      </td>
                      <td className="py-2.5 text-right text-base font-semibold text-zinc-900">
                        {s.result ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {evals && (
              <div className="mt-6">
                <h3 className="text-sm font-bold text-zinc-900">ผลการประเมิน</h3>
                <dl className="mt-1 divide-y divide-zinc-100">
                  <EvalRow
                    label="คุณลักษณะอันพึงประสงค์"
                    level={evals.characteristic}
                  />
                  <EvalRow
                    label="การอ่าน คิดวิเคราะห์ และเขียน"
                    level={evals.reading}
                  />
                  <EvalRow
                    label="สมรรถนะสำคัญของผู้เรียน"
                    level={evals.competency}
                  />
                </dl>
              </div>
            )}

            {report.numeric.length > 0 && (
              <div className="mt-6 flex items-center justify-between rounded-lg bg-pink-50 px-4 py-3">
                <span className="text-sm font-medium text-pink-900">
                  ผลการเรียนเฉลี่ย (GPA)
                </span>
                <span className="font-mono text-xl font-bold text-pink-700">
                  {report.gpa.toFixed(2)}
                </span>
              </div>
            )}
          </Card>
        )}
      </main>
    </div>
  );
}
