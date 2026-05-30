/**
 * Parent-app auth layout — centers the login card on a soft white→pink
 * gradient background with faint pink radial highlights.
 *
 * The pink palette differentiates the student/parent app from the
 * admin app (which uses primary-blue) — same visual structure, swapped
 * accent color. User spec: "ใช้สีชมพูเข้ม แทนน้ำเงิน".
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-white via-pink-50/60 to-pink-100/70 px-4 py-12">
      {/* Soft radial accents — pure CSS, no images. Placed absolute so
          they sit behind the card and add depth without claiming space
          in the layout. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-pink-200/40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-pink-300/30 blur-3xl"
      />

      <div className="relative mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-md items-center justify-center">
        {children}
      </div>
    </div>
  );
}
