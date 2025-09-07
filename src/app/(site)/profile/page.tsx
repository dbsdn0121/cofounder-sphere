"use client";

import * as React from "react";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { createBrowserSupabase } from "@/lib/supabase";
import {
  Check,
  Loader2,
  Save,
  User as UserIcon,
  Globe,
  Code,
  Briefcase,
  Link as LinkIcon,
  Image as ImageIcon,
  Rocket,
  CheckCircle,
  Users,
  Target,
  Lightbulb,
  Plus,
  X,
} from "lucide-react";

/* -------------------------------- Types -------------------------------- */

type Role = "Developer" | "Designer" | "Product" | "Biz/Marketing" | "";
type Status = "Student" | "Employee" | "Freelancer" | "Entrepreneur" | "";

type ProjectStatus = "In Progress" | "Recruiting" | "Completed" | "Paused";

type Project = {
  name: string;
  description: string;
  status?: ProjectStatus;
  links?: string[];
};

interface FormState {
  displayName: string;
  headline: string;
  role: Role;
  skills: string[];
  website: string;
  github: string;
  x: string; // twitter
  avatarUrl: string;
  status: Status;
  workStyles: string[];
  industries: string[];
  vision: string;
  qualities: string[];
  currentProjects: Project[];
  completedProjects: Project[];
}

const emptyForm: FormState = {
  displayName: "",
  headline: "",
  role: "",
  skills: [],
  website: "",
  github: "",
  x: "",
  avatarUrl: "",
  status: "",
  workStyles: [],
  industries: [],
  vision: "",
  qualities: [],
  currentProjects: [],
  completedProjects: [],
};

/* ------------------------------- Utilities ------------------------------ */

const toCSV = (arr?: string[]) => (arr && arr.length ? arr.join(", ") : "");
const fromCSV = (v: string) => v.split(",").map(s => s.trim()).filter(Boolean);

/* --------------------------------- UI ---------------------------------- */

function TextRow({ label, value, onChange, placeholder }: { label: React.ReactNode; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="flex items-center gap-2 text-white/80 font-medium">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl bg-zinc-900/80 px-4 py-3 text-sm ring-1 ring-inset ring-white/10 outline-none focus:ring-2 focus:ring-white/30 transition-all"
        placeholder={placeholder}
      />
    </label>
  );
}

function TextAreaRow({ label, value, onChange, placeholder, rows = 4 }: { label: React.ReactNode; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="flex items-center gap-2 text-white/80 font-medium">{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl bg-zinc-900/80 px-4 py-3 text-sm ring-1 ring-inset ring-white/10 outline-none focus:ring-2 focus:ring-white/30 transition-all resize-none"
        placeholder={placeholder}
      />
    </label>
  );
}

function CSVRow({ label, value, onChange, placeholder }: { label: React.ReactNode; value: string; onChange: (arr: string[]) => void; placeholder?: string }) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="flex items-center gap-2 text-white/80 font-medium">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(fromCSV(e.target.value))}
        className="rounded-xl bg-zinc-900/80 px-4 py-3 text-sm ring-1 ring-inset ring-white/10 outline-none focus:ring-2 focus:ring-white/30 transition-all"
        placeholder={placeholder}
      />
    </label>
  );
}

function ProjectList({
  title,
  items,
  setItems,
  withStatus,
}: {
  title: string;
  items: Project[];
  setItems: (fn: (prev: Project[]) => Project[]) => void;
  withStatus?: boolean;
}) {
  const add = () => setItems((prev) => [...prev, { name: "", description: "", status: withStatus ? "In Progress" : undefined, links: [""] }]);
  const remove = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));
  const update = (i: number, patch: Partial<Project>) => setItems((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6 backdrop-blur">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          {withStatus ? <Rocket className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
          {title}
        </h3>
        <button onClick={add} className="flex items-center gap-2 px-3 py-2 text-sm bg-white/10 hover:bg-white/20 rounded-lg transition-all">
          <Plus className="h-4 w-4" /> Add Project
        </button>
      </div>

      {items && items.length ? (
        <div className="space-y-4">
          {items.map((project, index) => (
            <div key={index} className="p-4 rounded-xl bg-zinc-900/50 border border-white/5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    value={project.name}
                    onChange={(e) => update(index, { name: e.target.value })}
                    placeholder="Project name"
                    className="rounded-lg bg-zinc-800/80 px-3 py-2 text-sm ring-1 ring-inset ring-white/10 outline-none focus:ring-2 focus:ring-white/30"
                  />
                  {withStatus && (
                    <select
                      value={project.status}
                      onChange={(e) => update(index, { status: e.target.value as ProjectStatus })}
                      className="rounded-lg bg-zinc-800/80 px-3 py-2 text-sm ring-1 ring-inset ring-white/10 outline-none focus:ring-2 focus:ring-white/30"
                    >
                      <option value="In Progress">In Progress</option>
                      <option value="Recruiting">Recruiting</option>
                      <option value="Completed">Completed</option>
                      <option value="Paused">Paused</option>
                    </select>
                  )}
                </div>
                <button onClick={() => remove(index)} className="p-2 text-white/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <textarea
                value={project.description}
                onChange={(e) => update(index, { description: e.target.value })}
                placeholder="Project description..."
                rows={3}
                className="w-full rounded-lg bg-zinc-800/80 px-3 py-2 text-sm ring-1 ring-inset ring-white/10 outline-none focus:ring-2 focus:ring-white/30 resize-none mb-3"
              />

              <div className="space-y-2">
                {(project.links || [""]).map((link, linkIdx) => (
                  <div key={linkIdx} className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-white/40 shrink-0" />
                    <input
                      value={link}
                      onChange={(e) => {
                        const next = [...(project.links || [])];
                        next[linkIdx] = e.target.value;
                        update(index, { links: next });
                      }}
                      placeholder="https://github.com/... or https://demo.app.com"
                      className="flex-1 rounded-lg bg-zinc-800/80 px-3 py-2 text-sm ring-1 ring-inset ring-white/10 outline-none focus:ring-2 focus:ring-white/30"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-white/50">
          {withStatus ? <Rocket className="h-8 w-8 mx-auto mb-2 opacity-50" /> : <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />}
          <p>No projects yet. Add one to showcase your work!</p>
        </div>
      )}
    </div>
  );
}

/* -------------------------------- Page --------------------------------- */

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const supabase = useMemo(() => createBrowserSupabase(() => getToken({ template: "supabase" })), [getToken]);

  const [tab, setTab] = useState<"public" | "account">("public");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<null | "ok" | "err">(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Ensure scroll unlocked when coming from onboarding
  useEffect(() => {
    document.body.style.overflow = "auto";
    document.body.style.height = "auto";
    document.documentElement.style.overflow = "auto";
    window.scrollTo(0, 0);
  }, []);

  // ---------------------------- Load from DB ----------------------------
  useEffect(() => {
    if (!isLoaded || !user) return;
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        // 1) Fetch profile by clerk_user_id
        const { data: pRows, error: pErr } = await supabase
          .from("profiles")
          .select(
            [
              "id",
              "display_name",
              "headline",
              "role",
              "skills",
              "website",
              "github",
              "x",
              "avatar_url",
              "status",
              "work_styles",
              "industries",
              "vision",
              "qualities",
            ].join(",")
          )
          .eq("clerk_user_id", user.id)
          .limit(1);
        if (pErr) throw pErr;
        const p = Array.isArray(pRows) && pRows.length ? (pRows[0] as any) : null;

        const base: FormState = { ...emptyForm };
        let pid: string | null = null;
        if (p) {
          pid = p.id as string;
          base.displayName = (p.display_name as string) ?? user.fullName ?? "";
          base.headline = p.headline ?? "";
          base.role = (p.role as Role) ?? "";
          base.skills = (p.skills as string[]) ?? [];
          base.website = p.website ?? "";
          base.github = p.github ?? "";
          base.x = p.x ?? "";
          base.avatarUrl = p.avatar_url ?? "";
          base.status = (p.status as Status) ?? "";
          base.workStyles = (p.work_styles as string[]) ?? [];
          base.industries = (p.industries as string[]) ?? [];
          base.vision = p.vision ?? "";
          base.qualities = (p.qualities as string[]) ?? [];
        }

        if (pid) {
          const [{ data: cur, error: curErr }, { data: done, error: doneErr }] = await Promise.all([
            supabase.from("current_projects").select("name, description, status, links").eq("user_id", pid),
            supabase.from("completed_projects").select("name, description, links").eq("user_id", pid),
          ]);
          if (curErr) throw curErr;
          if (doneErr) throw doneErr;
          base.currentProjects = (cur || []).map((r: any) => ({ name: r.name, description: r.description || "", status: (r.status as ProjectStatus) || "In Progress", links: r.links || [] }));
          base.completedProjects = (done || []).map((r: any) => ({ name: r.name, description: r.description || "", links: r.links || [] }));
        }

        if (!alive) return;
        setProfileId(pid);
        setForm(base);
      } catch (e: any) {
        console.error(e);
        if (alive) setLoadError(e?.message || "Failed to load.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [isLoaded, user, supabase]);

  // ----------------------------- Save to DB -----------------------------
  const onSave = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    setSaved(null);
    try {
      const { data: up, error: upErr } = await supabase
        .from("profiles")
        .upsert(
          {
            clerk_user_id: user.id,
            display_name: (form.displayName || "").trim(),
            headline: (form.headline || "").trim(),
            role: form.role || "",
            skills: (form.skills || []).map((s) => s.trim()).filter(Boolean),
            website: (form.website || "").trim(),
            github: (form.github || "").trim(),
            x: (form.x || "").trim(),
            avatar_url: (form.avatarUrl || "").trim(),
            status: form.status || "",
            work_styles: (form.workStyles || []).map((s) => s.trim()).filter(Boolean),
            industries: (form.industries || []).map((s) => s.trim()).filter(Boolean),
            vision: (form.vision || "").trim(),
            qualities: (form.qualities || []).map((s) => s.trim()).filter(Boolean),
          },
          { onConflict: "clerk_user_id" }
        )
        .select("id")
        .single();
      if (upErr) throw upErr;

      let pid: string | null = up?.id || profileId || null;
      if (!pid) {
        const { data: p2, error: p2Err } = await supabase.from("profiles").select("id").eq("clerk_user_id", user.id).limit(1);
        if (p2Err) throw p2Err;
        pid = Array.isArray(p2) && p2.length ? (p2[0] as any).id : null;
      }
      if (!pid) throw new Error("profile id not found after upsert");
      setProfileId(pid);

      // Reset projects then insert
      const curRows = (form.currentProjects || [])
        .filter((p) => (p.name && p.name.trim()) || (p.description && p.description.trim()))
        .map((p) => ({
          user_id: pid as string,
          name: (p.name || "").trim(),
          description: (p.description || "").trim(),
          status: (p.status as ProjectStatus) || "In Progress",
          links: (p.links || []).map((l) => (l || "").trim()).filter(Boolean),
        }));
      const doneRows = (form.completedProjects || [])
        .filter((p) => (p.name && p.name.trim()) || (p.description && p.description.trim()))
        .map((p) => ({
          user_id: pid as string,
          name: (p.name || "").trim(),
          description: (p.description || "").trim(),
          links: (p.links || []).map((l) => (l || "").trim()).filter(Boolean),
        }));

      const { error: delCurErr } = await supabase.from("current_projects").delete().eq("user_id", pid);
      if (delCurErr) throw delCurErr;
      const { error: delDoneErr } = await supabase.from("completed_projects").delete().eq("user_id", pid);
      if (delDoneErr) throw delDoneErr;

      if (curRows.length) {
        const { error } = await supabase.from("current_projects").insert(curRows);
        if (error) throw error;
      }
      if (doneRows.length) {
        const { error } = await supabase.from("completed_projects").insert(doneRows);
        if (error) throw error;
      }

      setSaved("ok");
      setTimeout(() => setSaved(null), 2000);
    } catch (e) {
      console.error(e);
      setSaved("err");
    } finally {
      setSaving(false);
    }
  }, [form, supabase, user, profileId]);

  /* -------------------------------- Render -------------------------------- */

  if (!isLoaded) {
    return (
      <main className="min-h-[60vh] grid place-items-center">
        <div className="inline-flex items-center gap-2 text-white/70">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading profile…
        </div>
      </main>
    );
  }
  if (!user) {
    return (
      <main className="min-h-[60vh] grid place-items-center">
        <div className="text-white/70">Sign in required.</div>
      </main>
    );
  }

  const skillsText = toCSV(form.skills);
  const workStylesText = toCSV(form.workStyles);
  const industriesText = toCSV(form.industries);
  const qualitiesText = toCSV(form.qualities);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <p className="mt-1 text-white/60">Manage your public profile and account settings.</p>

      {/* Tabs */}
      <div className="mt-6 inline-flex rounded-full border border-white/10 bg-zinc-900/60 p-1">
        <button
          onClick={() => setTab("public")}
          className={`rounded-full px-4 py-1.5 text-sm transition ${tab === "public" ? "bg-white text-black" : "text-white/80 hover:text-white"}`}
        >
          Public Profile
        </button>
        <button
          onClick={() => setTab("account")}
          className={`rounded-full px-4 py-1.5 text-sm transition ${tab === "account" ? "bg-white text-black" : "text-white/80 hover:text-white"}`}
        >
          Account
        </button>
      </div>

      {tab === "public" ? (
        <div className="mt-6 space-y-6">
          {/* Top section: preview + editor */}
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Preview card */}
            <div className="lg:col-span-4">
              <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6 backdrop-blur">
                <div className="flex items-center gap-4">
                  {form.avatarUrl ? (
                    <img src={form.avatarUrl} alt="avatar" className="h-20 w-20 rounded-full object-cover ring-2 ring-white/10" />
                  ) : (
                    <div className="grid h-20 w-20 place-items-center rounded-full border-2 border-white/80 bg-black">
                      <UserIcon className="h-10 w-10 text-white" strokeWidth={2} />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="text-xl font-semibold">{form.displayName || user.fullName || "Your Name"}</div>
                    <div className="text-sm text-white/60 mt-1">{form.headline || "Add a short headline"}</div>
                    {form.status && (
                      <div className="inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full bg-white/10 text-xs text-white/80">
                        <Users className="h-3 w-3" />
                        {form.status}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3 text-sm">
                  {form.role && (
                    <div className="flex items-center gap-2 text-white/70">
                      <Briefcase className="h-4 w-4" />
                      {form.role}
                    </div>
                  )}
                  {!!form.skills.length && (
                    <div className="flex items-start gap-2 text-white/70">
                      <Code className="h-4 w-4 mt-0.5 shrink-0" />
                      <span className="text-xs">{form.skills.slice(0, 4).join(", ")}{form.skills.length > 4 && "..."}</span>
                    </div>
                  )}
                  {!!form.workStyles.length && (
                    <div className="flex items-start gap-2 text-white/70">
                      <Target className="h-4 w-4 mt-0.5 shrink-0" />
                      <span className="text-xs">{form.workStyles.slice(0, 3).join(", ")}</span>
                    </div>
                  )}
                  {(form.website || form.github) && (
                    <div className="flex items-center gap-3 pt-2">
                      {form.website && (
                        <a href={form.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                          <Globe className="h-3 w-3" /> Website
                        </a>
                      )}
                      {form.github && (
                        <a href={form.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                          <LinkIcon className="h-3 w-3" /> GitHub
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Editor */}
            <div className="lg:col-span-8">
              <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6 backdrop-blur">
                <h2 className="text-lg font-semibold mb-2">Basic Information</h2>
                <p className="text-sm text-white/60 mb-6">Your public profile visible to other users.</p>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <TextRow label={<><UserIcon className="h-4 w-4" /> Display name</>} value={form.displayName} onChange={(v) => setForm(f => ({ ...f, displayName: v }))} placeholder="Jane Doe" />
                  <label className="grid gap-2 text-sm">
                    <span className="flex items-center gap-2 text-white/80 font-medium"><Briefcase className="h-4 w-4" /> Role</span>
                    <select
                      value={form.role}
                      onChange={(e) => setForm(f => ({ ...f, role: e.target.value as Role }))}
                      className="rounded-xl bg-zinc-900/80 px-4 py-3 text-sm ring-1 ring-inset ring-white/10 outline-none focus:ring-2 focus:ring-white/30 transition-all"
                    >
                      <option value="">Select Role</option>
                      <option value="Developer">Developer</option>
                      <option value="Designer">Designer</option>
                      <option value="Product">Product</option>
                      <option value="Biz/Marketing">Biz/Marketing</option>
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm">
                    <span className="flex items-center gap-2 text-white/80 font-medium"><Users className="h-4 w-4" /> Status</span>
                    <select
                      value={form.status}
                      onChange={(e) => setForm(f => ({ ...f, status: e.target.value as Status }))}
                      className="rounded-xl bg-zinc-900/80 px-4 py-3 text-sm ring-1 ring-inset ring-white/10 outline-none focus:ring-2 focus:ring-white/30 transition-all"
                    >
                      <option value="">Select Status</option>
                      <option value="Student">Student</option>
                      <option value="Employee">Employee</option>
                      <option value="Freelancer">Freelancer</option>
                      <option value="Entrepreneur">Entrepreneur</option>
                    </select>
                  </label>
                  <TextRow label={<><ImageIcon className="h-4 w-4" /> Avatar URL</>} value={form.avatarUrl} onChange={(v) => setForm(f => ({ ...f, avatarUrl: v }))} placeholder="https://cdn.example.com/avatar.png" />
                  <TextRow label={<><Globe className="h-4 w-4" /> Headline</>} value={form.headline} onChange={(v) => setForm(f => ({ ...f, headline: v }))} placeholder="High school builder obsessed with AI & web dev" />
                  <CSVRow label={<><Code className="h-4 w-4" /> Skills (comma separated)</>} value={skillsText} onChange={(arr) => setForm(f => ({ ...f, skills: arr }))} placeholder="React, TypeScript, Python, Figma" />
                  <TextRow label={<><Globe className="h-4 w-4" /> Website</>} value={form.website} onChange={(v) => setForm(f => ({ ...f, website: v }))} placeholder="https://example.com" />
                  <TextRow label={<><LinkIcon className="h-4 w-4" /> GitHub</>} value={form.github} onChange={(v) => setForm(f => ({ ...f, github: v }))} placeholder="https://github.com/username" />
                </div>
              </div>
            </div>
          </section>

          {/* Work & Vision */}
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6 backdrop-blur">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Target className="h-5 w-5" /> Work & Interests</h3>
              <div className="space-y-4">
                <CSVRow label="Work Styles (comma separated)" value={workStylesText} onChange={(arr) => setForm(f => ({ ...f, workStyles: arr }))} placeholder="Fast execution, Detail-oriented, Collaborative" />
                <CSVRow label="Industries of Interest (comma separated)" value={industriesText} onChange={(arr) => setForm(f => ({ ...f, industries: arr }))} placeholder="AI, EdTech, FinTech, Healthcare" />
                <CSVRow label="Preferred Co-founder Qualities (comma separated)" value={qualitiesText} onChange={(arr) => setForm(f => ({ ...f, qualities: arr }))} placeholder="Commitment, Technical expertise, Leadership" />
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6 backdrop-blur">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Lightbulb className="h-5 w-5" /> Vision & Motivation</h3>
              <TextAreaRow label="Why do you want to start a company?" value={form.vision} onChange={(v) => setForm(f => ({ ...f, vision: v }))} rows={6} placeholder="Share your motivation, long-term vision, or what drives you to build something meaningful..." />
            </div>
          </section>

          {/* Projects */}
          <section className="space-y-6">
            <ProjectList title="Current Projects" items={form.currentProjects} setItems={(fn) => setForm(f => ({ ...f, currentProjects: fn(f.currentProjects) }))} withStatus />
            <ProjectList title="Completed Projects" items={form.completedProjects} setItems={(fn) => setForm(f => ({ ...f, completedProjects: fn(f.completedProjects) }))} />
          </section>

          {/* Save bar */}
          <div className="flex items-center justify-between p-6 rounded-2xl border border-white/10 bg-zinc-950/70 backdrop-blur">
            <div className="flex items-center gap-4">
              <button onClick={onSave} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black disabled:opacity-70 hover:bg-gray-100 transition-all">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save All Changes
              </button>
              {saved === "ok" && <span className="inline-flex items-center gap-2 text-sm text-emerald-400"><Check className="h-4 w-4" /> All changes saved successfully!</span>}
              {saved === "err" && <span className="inline-flex items-center gap-2 text-sm text-rose-400"><X className="h-4 w-4" /> Failed to save. Please try again.</span>}
            </div>
            <span className="text-xs text-white/40 max-w-xs text-right">Profile data is stored in Supabase (profiles/current_projects/completed_projects).</span>
          </div>
        </div>
      ) : (
        <section className="mt-6">
          {/* Placeholder for account settings route or component */}
          <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6 backdrop-blur text-sm text-white/70">
            Connect your account settings component here.
          </div>
        </section>
      )}
    </main>
  );
}
