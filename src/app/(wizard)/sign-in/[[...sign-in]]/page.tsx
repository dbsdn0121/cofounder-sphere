// src/app/(wizard)/sign-in/[[...sign-in]]/page.tsx
"use client";

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen grid place-items-center bg-black">
      <SignIn
        appearance={{ elements: { card: "bg-zinc-950/90 text-white" } }}
      />
    </div>
  );
}
