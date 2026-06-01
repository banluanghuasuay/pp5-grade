import type { MetadataRoute } from "next";

/**
 * PWA manifest — makes the admin app installable ("Add to Home Screen" /
 * "Install app"). Next.js serves this at /manifest.webmanifest and injects
 * the <link rel="manifest"> tag automatically.
 *
 * theme_color = the logo's dominant blue (rgb 72,184,216 = #48b8d8).
 * Icons live in apps/admin/public/ (generated from the logo by resize-icons).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EasyGrade — ระบบบันทึกผลการเรียน",
    short_name: "EasyGrade",
    description: "ระบบบันทึกผลการเรียนและออกเอกสาร ปพ.5 / ปพ.6",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#48b8d8",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // Maskable variant for Android adaptive icons (safe-zone crop).
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
