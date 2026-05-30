"use client";

import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@pp5/ui";
import {
  removeSchoolLogo,
  type SchoolLogoState,
  uploadSchoolLogo,
} from "./actions";

const initialState: SchoolLogoState = { error: null, success: false };

function UploadButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" pending={pending}>
      {pending ? "กำลังอัปโหลด..." : "อัปโหลด"}
    </Button>
  );
}

function RemoveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="ghost" size="sm" pending={pending}>
      {pending ? "กำลังลบ..." : "ลบโลโก้"}
    </Button>
  );
}

/**
 * Logo upload widget — sits ABOVE the main school form on /setup/school.
 *
 * Why separate from <SchoolForm>: HTML doesn't allow nested <form> elements,
 * and the logo upload needs its own multipart/form-data form (= separate
 * server action). Keeping it as a sibling top-level form lets each form
 * handle its own concerns without state-spillage.
 *
 * Layout:
 *   ┌─────────┐ Logo preview (96×96 contain-fit)
 *   │  logo   │
 *   └─────────┘  [Choose file]  [อัปโหลด]      ← upload form
 *                 PNG/JPG/WebP · max 2MB
 *                 [ลบโลโก้]                      ← remove form (only if a logo exists)
 */
export function SchoolLogoUploader({
  schoolId,
  currentUrl,
}: {
  schoolId: string;
  currentUrl: string | null;
}) {
  const [uploadState, uploadAction] = useActionState(
    uploadSchoolLogo,
    initialState,
  );
  const [removeState, removeAction] = useActionState(
    removeSchoolLogo,
    initialState,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prefer the latest URL from action state over the prop, so the preview
  // updates immediately after upload/remove without waiting for a re-render
  // from the server-side revalidatePath.
  const displayUrl =
    removeState.success && removeState.logoUrl === null
      ? null
      : (uploadState.logoUrl ?? currentUrl);
  const hasLogo = !!displayUrl;

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold text-zinc-900">
        โลโก้โรงเรียน
      </legend>
      <p className="text-xs text-zinc-500">
        แสดงในหน้าปก ปพ.5 · header รายงานต่าง ๆ · sidebar ของระบบ
      </p>

      <div className="flex items-start gap-4">
        {/* Preview */}
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-zinc-200 bg-zinc-50">
          {hasLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayUrl}
              alt="โลโก้โรงเรียน"
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <span className="px-1 text-center text-[10px] leading-tight text-zinc-400">
              ยังไม่มี
              <br />
              โลโก้
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          {/* Upload form */}
          <form action={uploadAction} className="space-y-2">
            <input type="hidden" name="id" value={schoolId} />
            <input
              ref={fileInputRef}
              type="file"
              name="file"
              accept="image/png,image/jpeg,image/webp"
              required
              className="block w-full text-sm text-zinc-700
                file:mr-3 file:cursor-pointer file:rounded-md file:border-0
                file:bg-zinc-900 file:px-3 file:py-1.5
                file:text-sm file:font-medium file:text-white
                hover:file:bg-zinc-800"
            />
            <div className="flex flex-wrap items-center gap-3">
              <UploadButton />
              <span className="text-xs text-zinc-500">
                PNG / JPG / WebP · ไม่เกิน 2 MB
              </span>
            </div>
          </form>

          {/* Remove form (only when there's actually a logo to remove) */}
          {hasLogo && (
            <form action={removeAction}>
              <input type="hidden" name="id" value={schoolId} />
              <RemoveButton />
            </form>
          )}

          {/* Status messages — share visual space below the upload/remove
              controls. Show whichever action ran most recently. */}
          {uploadState.error && (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900"
            >
              {uploadState.error}
            </div>
          )}
          {uploadState.success && (
            <div
              role="status"
              className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-900"
            >
              ✅ อัปโหลดโลโก้สำเร็จ
            </div>
          )}
          {removeState.error && (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900"
            >
              {removeState.error}
            </div>
          )}
          {removeState.success && (
            <div
              role="status"
              className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700"
            >
              ลบโลโก้แล้ว
            </div>
          )}
        </div>
      </div>
    </fieldset>
  );
}
