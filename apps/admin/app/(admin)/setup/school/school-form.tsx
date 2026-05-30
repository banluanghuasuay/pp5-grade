"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button, Field, Input, Textarea } from "@pp5/ui";
import { updateSchool, type SchoolFormState } from "./actions";

const initialState: SchoolFormState = { error: null, success: false };

type DefaultValues = {
  id: string;
  name_th: string;
  name_en: string | null;
  affiliation: string | null;
  address: string | null;
  district: string | null;
  province: string | null;
  phone: string | null;
  // logo_url is handled by <SchoolLogoUploader> (a separate sibling form);
  // intentionally NOT part of this form's payload.
  director_name: string | null;
  director_title: string | null;
  deputy_director_name: string | null;
  academic_head_name: string | null;
  assessment_officer_name: string | null;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" pending={pending}>
      {pending ? "กำลังบันทึก..." : "บันทึก"}
    </Button>
  );
}

export function SchoolForm({ defaultValues }: { defaultValues: DefaultValues }) {
  const [state, formAction] = useActionState(updateSchool, initialState);

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="id" value={defaultValues.id} />

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-zinc-900">
          ข้อมูลโรงเรียน
        </legend>

        <Field
          label="ชื่อโรงเรียน (ภาษาไทย)"
          required
          error={state.fieldErrors?.name_th}
        >
          <Input
            name="name_th"
            required
            defaultValue={defaultValues.name_th}
            placeholder="เช่น โรงเรียนบ้านห้วยใหญ่"
            invalid={!!state.fieldErrors?.name_th}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="ชื่อโรงเรียน (English)" hint="ใช้ใน ปพ.5 ส่วนภาษาอังกฤษ (ถ้ามี)">
            <Input
              name="name_en"
              defaultValue={defaultValues.name_en ?? ""}
              placeholder="optional"
            />
          </Field>
          <Field label="สังกัด" hint="เช่น สพป.​เขต 1, สพม.">
            <Input
              name="affiliation"
              defaultValue={defaultValues.affiliation ?? ""}
              placeholder="optional"
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-zinc-900">
          ที่อยู่และติดต่อ
        </legend>

        <Field label="ที่อยู่">
          <Textarea
            name="address"
            rows={2}
            defaultValue={defaultValues.address ?? ""}
            placeholder="optional"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="อำเภอ" hint="ใช้ในหน้าปก ปพ.5">
            <Input
              name="district"
              defaultValue={defaultValues.district ?? ""}
              placeholder="เช่น ศรีสำโรง"
            />
          </Field>
          <Field label="จังหวัด" hint="ใช้ในหน้าปก ปพ.5">
            <Input
              name="province"
              defaultValue={defaultValues.province ?? ""}
              placeholder="เช่น สุโขทัย"
            />
          </Field>
        </div>

        <Field label="เบอร์โทร" hint="optional">
          <Input
            name="phone"
            type="tel"
            defaultValue={defaultValues.phone ?? ""}
            placeholder="optional"
          />
        </Field>
        {/* Logo block lives in its own sibling <form> outside this one —
            see SchoolLogoUploader on page.tsx. HTML doesn't allow nested
            <form> elements + logo upload is multipart/form-data which is
            cleaner to keep separate from the text-field form submission. */}
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-zinc-900">
          ผู้บริหารและเจ้าหน้าที่
        </legend>
        <p className="text-xs text-zinc-500">
          ชื่อเหล่านี้จะปรากฏใน ปพ.5 เป็นผู้ลงนาม
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="ตำแหน่ง ผอ." hint="default: ผู้อำนวยการ">
            <Input
              name="director_title"
              defaultValue={defaultValues.director_title ?? "ผู้อำนวยการ"}
            />
          </Field>
          <Field label="ชื่อ ผอ.">
            <Input
              name="director_name"
              defaultValue={defaultValues.director_name ?? ""}
              placeholder="เช่น นายสมศักดิ์ ใจดี"
            />
          </Field>
        </div>

        <Field label="ชื่อ รอง ผอ.">
          <Input
            name="deputy_director_name"
            defaultValue={defaultValues.deputy_director_name ?? ""}
            placeholder="ถ้ามี"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="ชื่อหัวหน้าฝ่ายวิชาการ" hint="ลงนาม ปพ.5 รวมห้อง">
            <Input
              name="academic_head_name"
              defaultValue={defaultValues.academic_head_name ?? ""}
              placeholder="เช่น นางสุดา รักเรียน"
            />
          </Field>
          <Field label="ชื่อหัวหน้างานวัดผล" hint="ลงนาม ปพ.5">
            <Input
              name="assessment_officer_name"
              defaultValue={defaultValues.assessment_officer_name ?? ""}
              placeholder="เช่น นายวิชาญ ตรวจดี"
            />
          </Field>
        </div>
      </fieldset>

      {state.error && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
        >
          {state.error}
        </div>
      )}

      {state.success && (
        <div
          role="status"
          className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900"
        >
          ✅ บันทึกข้อมูลโรงเรียนสำเร็จ
        </div>
      )}

      <div className="border-t border-zinc-200 pt-4">
        <SubmitButton />
      </div>
    </form>
  );
}
