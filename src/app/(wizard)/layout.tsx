// src/app/(wizard)/layout.tsx
"use client";

import React from "react";
import "@/app/globals.css"; // 전역 스타일 가져오기

export default function WizardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white min-h-screen flex items-center justify-center">
        {/* wizard 안에서 보여질 페이지 */}
        {children}
      </body>
    </html>
  );
}
