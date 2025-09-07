"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useClerk, useUser, SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";
import { ChevronDown, LogOut, Settings, User } from "lucide-react";

type Props = {
  /** 우선순위 1: 이 prop으로 전달한 이미지 URL 사용 */
  imageUrl?: string;
  /** 우선순위 2: Clerk 사용자 publicMetadata.avatarUrl 사용 */
};

export default function AvatarMenu({ imageUrl }: Props) {
  const { user } = useUser();
  const { signOut } = useClerk();

  // 이미지 선택 우선순위: prop -> user.publicMetadata.avatarUrl -> user.imageUrl -> 이니셜
  const metadataUrl = (user?.publicMetadata as any)?.avatarUrl as string | undefined;
  const finalUrl = imageUrl ?? metadataUrl ?? user?.imageUrl;

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClickAway = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <SignedOut>
        <div className="flex items-center gap-2">
          <SignInButton mode="modal">
            <button className="rounded-md px-3 py-1.5 text-sm text-white/90 ring-1 ring-inset ring-white/15 hover:bg-white/5">
              Sign in
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-black">
              Sign up
            </button>
          </SignUpButton>
        </div>
      </SignedOut>

      <SignedIn>
        <button
          onClick={() => setOpen(v => !v)}
          className="inline-flex items-center gap-2 rounded-full px-2 py-1 ring-1 ring-inset ring-white/10 hover:bg-white/5"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          {finalUrl ? (
            <img
              src={finalUrl}
              alt="avatar"
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-white/15 grid place-items-center text-xs font-semibold">
              {(user?.firstName?.[0] ?? "U").toUpperCase()}
            </div>
          )}
          <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-zinc-950/95 p-1 shadow-2xl backdrop-blur"
          >
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/90 hover:bg-white/5"
              onClick={() => setOpen(false)}
            >
              <User className="h-4 w-4" /> Profile
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/90 hover:bg-white/5"
              onClick={() => setOpen(false)}
            >
              <Settings className="h-4 w-4" /> Settings
            </Link>
            <div className="my-1 h-px bg-white/10" />
            <button
              onClick={() => { setOpen(false); signOut(); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/90 hover:bg-white/5"
            >
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </div>
        )}
      </SignedIn>
    </div>
  );
}
