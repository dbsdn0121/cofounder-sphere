// src/app/(wizard)/sign-up/[[...sign-up]]/page.tsx
"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen grid place-items-center bg-black">
      <SignUp
        appearance={{ elements: { card: "bg-zinc-950/90 text-white" } }}
      />
    </div>
  );
}
