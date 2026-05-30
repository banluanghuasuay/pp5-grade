"use client";

import { Button, Field, Input, Select } from "@pp5/ui";
import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { SubjectFormState } from "./actions";

const initialState: SubjectFormState = { error: null };

type Action = (
  prev: SubjectFormState,
  formData: FormData,
) => Promise<SubjectFormState>;

export type GradeLevelOption = {
  id: string;
  display_name: string;
  /** Primary ใช้ "ชั่วโมง/ปี" · secondary ใช้ "ชั่วโมง/ภาค" (กิจกรรมจะถาม
   *  คนละ unit ระหว่าง 2 ระบบ — DB column เป็น hours_per_year ตัวเดียว
   *  แต่ label/placeholder ต้องเปลี่ยนตามระบบของ grade ที่เลือก). */
  system: "primary" | "secondary";
};
export type LearningAreaOption = { id: string; name_th: string };

type DefaultValues = {
  id?: string;
  code?: string;
  name_th?: string;
  learning_area_id?: string | null;
  grade_level_id?: string;
  category?: "core" | "additional" | "activity";
  credit_hours?: number | null;
  hours_per_year?: number | null;
};

type Props = {
  action: Action;
  defaultValues?: DefaultValues;
  submitLabel?: string;
  gradeLevels: GradeLevelOption[];
  learningAreas: LearningAreaOption[];
  /** When set, grade is locked (read-only) — used when adding from plan context. */
  lockGradeLevel?: boolean;
  /** Plan to link the new subject to. Sent as hidden `plan_id` field. */
  planId?: string;
  /** Where the cancel link goes. Defaults to /setup/subjects. */
  cancelHref?: string;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" pending={pending}>
      {pending ? "กำลังบันทึก..." : label}
    </Button>
  );
}

export function SubjectForm({
  action,
  defaultValues,
  submitLabel = "บันทึก",
  gradeLevels,
  learningAreas,
  lockGradeLevel = false,
  planId,
  cancelHref = "/setup/subjects",
}: Props) {
  const [state, formAction] = useActionState(action, initialState);

  // Track category locally — drives:
  // 1. grading_mode display (activity → pass/fail, others → numeric)
  // 2. which hours field is visible (activity → ชั่วโมง/ปี, others → หน่วยกิตเท่านั้น)
  const [category, setCategory] = useState<
    "core" | "additional" | "activity"
  >(defaultValues?.category ?? "core");

  // Track selected grade level — drives the activity hours label
  // (primary = ชั่วโมง/ปี · secondary = ชั่วโมง/ภาค). lockGradeLevel
  // means the grade is fixed from the URL (plan context) — we still
  // need the value to detect primary/secondary even though the user
  // can't change it.
  const [gradeLevelId, setGradeLevelId] = useState<string>(
    defaultValues?.grade_level_id ?? "",
  );
  const selectedGrade = gradeLevels.find((g) => g.id === gradeLevelId);
  const isSecondary = selectedGrade?.system === "secondary";

  const isActivity = category === "activity";

  // Hours-vs-credits split:
  //   - "หน่วยกิต" (credit_hours column) is a SECONDARY-only concept per
  //     สพฐ. หลักสูตรแกนกลาง 2551 — only secondary core/additional uses it
  //   - everything else uses ชั่วโมง (hours_per_year column):
  //       primary core/additional → ชั่วโมง/ปี
  //       primary activity        → ชั่วโมง/ปี
  //       secondary activity      → ชั่วโมง/ภาค
  // User spec 2026-05-22 — corrected the primary core/additional case
  // which had been incorrectly showing "หน่วยกิต".
  const usesCredits = isSecondary && !isActivity;
  const hoursLabel =
    isSecondary && isActivity ? "ชั่วโมง/ภาค" : "ชั่วโมง/ปี";
  const hoursPlaceholder =
    isSecondary && isActivity ? "ระบุชั่วโมงต่อภาค" : "ระบุชั่วโมงต่อปี";
  const hoursHint = isActivity
    ? isSecondary
      ? "เช่น 20 ชม./ภาค สำหรับลูกเสือ-เนตรนารี · กิจกรรมแนะแนว · ชุมนุม"
      : "เช่น 40 ชม. สำหรับลูกเสือ-เนตรนารี · กิจกรรมแนะแนว · ชุมนุม"
    : "เช่น 40, 80, 120 ชม./ปี (ตามโครงสร้างเวลาเรียน)";

  return (
    <form action={formAction} className="space-y-8">
      {defaultValues?.id && (
        <input type="hidden" name="id" value={defaultValues.id} />
      )}
      {planId && <input type="hidden" name="plan_id" value={planId} />}
      {/* Send grade_level_id as hidden when locked */}
      {lockGradeLevel && defaultValues?.grade_level_id && (
        <input
          type="hidden"
          name="grade_level_id"
          value={defaultValues.grade_level_id}
        />
      )}

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-zinc-900">
          ข้อมูลวิชา
        </legend>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field
            label="รหัสวิชา"
            required
            error={state.fieldErrors?.code}
            hint="เช่น ค13101 (ค=คณิต, 1=ประถม, 3=ป.3, 1=ภาค1, 01=ลำดับ)"
            className="sm:col-span-1"
          >
            <Input
              name="code"
              required
              maxLength={20}
              defaultValue={defaultValues?.code ?? ""}
              placeholder="เช่น ค13101"
              invalid={!!state.fieldErrors?.code}
            />
          </Field>

          <Field
            label="ชื่อวิชา"
            required
            error={state.fieldErrors?.name_th}
            className="sm:col-span-2"
          >
            <Input
              name="name_th"
              required
              defaultValue={defaultValues?.name_th ?? ""}
              placeholder="เช่น คณิตศาสตร์"
              invalid={!!state.fieldErrors?.name_th}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="ระดับชั้น"
            required
            error={state.fieldErrors?.grade_level_id}
            hint={lockGradeLevel ? "ระดับชั้นของแผนนี้ — เปลี่ยนไม่ได้" : undefined}
          >
            {lockGradeLevel ? (
              <Input
                value={selectedGrade?.display_name ?? "—"}
                readOnly
                disabled
              />
            ) : (
              <Select
                name="grade_level_id"
                required
                value={gradeLevelId}
                onChange={(e) => setGradeLevelId(e.target.value)}
                invalid={!!state.fieldErrors?.grade_level_id}
              >
                <option value="">— เลือก —</option>
                {gradeLevels.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.display_name}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="กลุ่มสาระ" hint="optional · 9 กลุ่มตาม สพฐ.">
            <Select
              name="learning_area_id"
              defaultValue={defaultValues?.learning_area_id ?? ""}
            >
              <option value="">—</option>
              {learningAreas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name_th}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-zinc-900">
          ประเภทวิชา
        </legend>

        <Field label="ประเภทวิชา" required>
          <Select
            name="category"
            required
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as typeof category)
            }
          >
            <option value="core">พื้นฐาน (core)</option>
            <option value="additional">เพิ่มเติม (additional)</option>
            <option value="activity">กิจกรรม (activity)</option>
          </Select>
        </Field>

        {/* Hours-vs-credits field — primary uses ชั่วโมง/ปี ALWAYS (สพฐ.
            ไม่มีระบบหน่วยกิตในประถม); secondary uses หน่วยกิต for
            core/additional and ชั่วโมง/ภาค for activity. The DB column
            is `hours_per_year` everywhere except secondary core/additional
            which uses `credit_hours`. User spec 2026-05-22. */}
        {usesCredits ? (
          <Field
            label="หน่วยกิต"
            hint="เช่น 0.5, 1.0, 1.5 (1 หน่วยกิต = 40 ชม./ภาคเรียน)"
            error={state.fieldErrors?.credit_hours}
          >
            <Input
              name="credit_hours"
              type="number"
              step="0.5"
              min={0}
              defaultValue={defaultValues?.credit_hours ?? ""}
              placeholder="ระบุหน่วยกิต"
              className="max-w-xs"
              invalid={!!state.fieldErrors?.credit_hours}
            />
          </Field>
        ) : (
          <Field
            label={hoursLabel}
            hint={hoursHint}
            error={state.fieldErrors?.hours_per_year}
          >
            <Input
              name="hours_per_year"
              type="number"
              min={0}
              defaultValue={defaultValues?.hours_per_year ?? ""}
              placeholder={hoursPlaceholder}
              className="max-w-xs"
              invalid={!!state.fieldErrors?.hours_per_year}
            />
          </Field>
        )}
      </fieldset>

      {/* Show banner whenever there's an error — even alongside field-level errors.
          Makes duplicate-code conflicts (etc.) prominent instead of buried inline. */}
      {state.error && (
        <div
          role="alert"
          className="rounded-md border-2 border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-900"
        >
          ⚠️ {state.error}
        </div>
      )}

      <div className="flex items-center gap-3 border-t border-zinc-200 pt-4">
        <SubmitButton label={submitLabel} />
        <Link
          href={cancelHref}
          className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
        >
          ยกเลิก
        </Link>
      </div>
    </form>
  );
}
