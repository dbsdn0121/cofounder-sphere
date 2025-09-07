"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  ChevronDown,
  Menu,
  LogOut,
  Settings,
  User,
} from "lucide-react";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  SignOutButton,
  useUser,
} from "@clerk/nextjs";

import AvatarMenu from "@/components/AvatarMenu";

// ---------- Types ----------
export type NavItem = {
  label: string;
  href: string;
  intent?: "highlight";
};

// A tiny, typed className combiner
export type ClassValue = string | false | null | undefined;
function clsx(...classes: ClassValue[]): string {
  return classes.filter((c): c is string => typeof c === "string" && !!c).join(" ");
}

// ---------- Data ----------
export const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/home" },
  { label: "Find", href: "/find" },
  { label: "Projects", href: "/projects" },
  { label: "Messages", href: "/messages" },
  { label: "Community", href: "/community" },
  { label: "Guides", href: "/guides" },
  { label: "Pricing", href: "/pricing", intent: "highlight" },
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname() ?? "/";
  const { user } = useUser();

  const isActivePath = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-3 sm:h-16 sm:px-4">
        {/* Left: Logo */}
        <Link href="/home" className="group inline-flex items-center gap-2 px-2 py-1">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 overflow-hidden">
            <Image
              src="/favicon-32x32.png" // 👉 네 파비콘 이미지
              alt="CoFounderSphere Logo"
              width={20}
              height={20}
              className="opacity-90 transition-transform group-hover:scale-110"
            />
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-5 md:flex [&_a]:rounded-none [&_a]:bg-transparent [&_a]:ring-0 [&_a]:px-0 [&_a]:py-0 [&_a]:shadow-none">
          {NAV_ITEMS.map((item) =>
            item.label === "Pricing" ? (
              <Link key={item.label} href={item.href}>
                <button className="relative inline-flex h-9 overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50">
                  <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
                  <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium text-white backdrop-blur-3xl">
                    {item.label}
                  </span>
                </button>
              </Link>
            ) : (
              <Link
                key={item.label}
                href={item.href}
                className={clsx(
                  "text-sm font-medium transition",
                  isActivePath(item.href) ? "text-white" : "text-white/70 hover:text-white"
                )}
              >
                {item.label}
              </Link>
            )
          )}
        </nav>

        {/* Mobile menu button */}
        <button
          className="inline-flex items-center justify-center rounded-full p-2 text-white/80 ring-1 ring-inset ring-white/10 md:hidden"
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* Center: Search (desktop only) */}
        <div className="mx-auto hidden w-full max-w-xl items-center md:flex">
          <label htmlFor="global-search" className="sr-only">
            Search
          </label>
          <div className="relative w-full">
            <input
              id="global-search"
              placeholder="Search for a co-founder by keyword"
              className="w-full rounded-full bg-zinc-900/90 px-11 py-2 text-sm text-white placeholder:text-white/40 shadow-inner ring-1 ring-inset ring-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
            />
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
          </div>
        </div>

        {/* Right: Auth / Profile */}
        <div className="ml-auto flex items-center">
          <SignedOut>
            <div className="hidden items-center gap-2 md:flex">
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
            <div className="hidden md:block">
              <AvatarMenu />
            </div>
            <div className="relative md:hidden">
              <button
                onClick={() => setOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-white/90 ring-1 ring-inset ring-white/10 hover:bg-white/5"
              >
                <span className="inline-grid h-7 w-7 place-items-center rounded-full bg-black border border-white/80">
                  <User className="h-4 w-4 text-white" strokeWidth={2} />
                </span>
                <ChevronDown className={clsx("h-4 w-4 transition", open && "rotate-180")} />
              </button>

              {open && (
                <div
                  onMouseLeave={() => setOpen(false)}
                  className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-zinc-950/95 p-1 shadow-2xl backdrop-blur"
                >
                  <Link
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/90 hover:bg-white/5"
                    href="/profile"
                  >
                    <User className="h-4 w-4" /> Profile
                  </Link>
                  <Link
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/90 hover:bg-white/5"
                    href="/settings"
                  >
                    <Settings className="h-4 w-4" /> Settings
                  </Link>
                  <div className="my-1 h-px bg-white/10" />
                  <SignOutButton>
                    <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/90 hover:bg-white/5">
                      <LogOut className="h-4 w-4" /> Log out
                    </button>
                  </SignOutButton>
                </div>
              )}
            </div>
          </SignedIn>
        </div>
      </div>

      {/* Mobile sheet menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute right-2 top-2 w-[92vw] rounded-2xl border border-white/10 bg-zinc-950/95 p-3 shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between pb-2">
              <div className="inline-flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 overflow-hidden">
                  <Image
                    src="/favicon-32x32.png"
                    alt="CoFounderSphere Logo"
                    width={20}
                    height={20}
                  />
                </span>
                <span className="text-sm font-semibold text-white/90">Co-Founder Sphere</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-full px-2 py-1 text-sm text-white/70 ring-1 ring-inset ring-white/10"
              >
                Close
              </button>
            </div>

            {/* 검색창, 메뉴 등은 동일 */}
          </div>
        </div>
      )}
    </header>
  );
}
