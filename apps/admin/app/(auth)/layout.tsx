/**
 * Auth layout — centers the login card on a soft white→blue gradient
 * background with a faint radial highlight, so the card has visual
 * weight without competing with it.
 *
 * Pure CSS (no images) so it loads instantly and renders identically
 * across browsers. The card itself supplies the strong color via its
 * top accent bar — keeping the background subtle keeps focus on the
 * form.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-white via-primary-50/60 to-primary-100/70 px-4 py-12">
      {/* Soft radial accents — pure CSS, no images. Placed absolute so
          they sit behind the card and add depth without claiming space
          in the layout. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary-200/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-primary-300/20 blur-3xl"
      />

      <div className="relative mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-md items-center justify-center">
        {children}
      </div>
    </div>
  );
}
