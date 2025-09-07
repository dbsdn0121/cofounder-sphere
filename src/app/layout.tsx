// src/app/layout.tsx
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import "@/app/globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CoFounderSphere",
  description: "Find your ideal co-founder",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
  // (선택) PWA/웹매니페스트 쓰면 활성화
  // manifest: "/site.webmanifest",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      afterSignUpUrl="/onboarding"
      signUpFallbackRedirectUrl="/onboarding"
      afterSignInUrl="/find"
      signInFallbackRedirectUrl="/find"
    >
      {/* ✅ html이 확실한 스크롤 컨테이너가 되도록 */}
      <html lang="en" className="min-h-full overflow-y-auto">
        {/* ✅ body도 스크롤 가능 + 높이 상속, 전역 글꼴/색 유지 */}
        <body
          className={[
            geistSans.variable,
            geistMono.variable,
            "antialiased bg-black text-white",
            "min-h-full overflow-y-auto", // ← 핵심
          ].join(" ")}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
