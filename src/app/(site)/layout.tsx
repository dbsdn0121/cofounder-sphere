// app/layout.tsx
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import "@/app/globals.css";
import Header from "@/components/Header";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Co-Founder Sphere",
  description: "Find your co-founder with AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className="h-full overflow-hidden">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white h-full flex flex-col overflow-hidden`}
        >
          {/* ✅ 공통 헤더 (여기서 useUser 사용 가능) */}
          <Header />

          {/* ✅ 페이지별 콘텐츠 */}
          <main className="flex-1 overflow-hidden">{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
