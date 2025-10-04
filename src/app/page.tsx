// src/app/page.tsx
"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black">
      <div className="mx-auto max-w-5xl px-6 py-20 text-center">
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
          Meet your ideal co-founder.
        </h1>
        <p className="mt-5 text-white/70 max-w-2xl mx-auto">
          AI-assisted matching based on skills, values, and working styles.
        </p>

        <div className="mt-10 flex items-center justify-center gap-3">
          <button
            onClick={() => router.push("/sign-up")}
            className="rounded-full bg-white text-black px-6 py-3 font-semibold hover:bg-zinc-200 transition"
          >
            Get started — it’s free
          </button>
          <Link
            href="/sign-in"
            className="rounded-full border border-white/20 px-6 py-3 hover:bg-white/10 transition"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
