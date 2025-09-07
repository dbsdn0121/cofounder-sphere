// /app/(site)/projects/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";
import { createBrowserSupabase, getCurrentUserProfileByClerk } from "@/lib/supabase";
import {
  Plus,
  Rocket,
  Users,
  CheckCircle,
  Clock,
  ExternalLink,
  Github,
  Edit3,
  Search,
  UserPlus,
  Send,
  Heart,
  Star,
  MessageCircle,
  X,
  Calendar,
  MapPin,
  Save,
  Trash2,
  Trophy,
  Upload,
} from "lucide-react";

type ProjectStatus = "In Progress" | "Recruiting" | "Completed" | "Paused";

interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  links: string[];
  createdAt: string;
  updatedAt: string;
  teamSize?: number;
  neededRoles?: string[];
  tech?: string[];
  owner?: {
    id: string;
    name: string;
    avatar?: string;
    role?: string;
  };
  teamMembers?: Array<{
    id: string;
    name: string;
    avatar?: string;
    role?: string;
  }>;
}

interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
  role?: string;
  skills?: string[];
  bio?: string;
  location?: string;
  availability?: string;
  experience?: string;
  matchScore?: number;
}

type FilterTab = "all" | "In Progress" | "Recruiting" | "Completed";

/* ------------------------------ Helpers ------------------------------ */
function normalizeUrl(raw?: string | null) {
  if (!raw) return null;
  let u = raw.trim();
  if (!u) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(u)) u = `https://${u}`;
  try {
    new URL(u);
    return u;
  } catch {
    return null;
  }
}

export default function ProjectsPage() {
  const router = useRouter();
  const { user } = useUser();
  const { userId, getToken } = useAuth();

  const supabase = useMemo(
    () => createBrowserSupabase((args?: { template?: string }) => getToken({ template: "supabase", ...(args || {}) })),
    [getToken]
  );

  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [showTeamFinderModal, setShowTeamFinderModal] = useState(false);

  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedCompletedProject, setSelectedCompletedProject] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ 제출 모달 입력
  const [submitTitle, setSubmitTitle] = useState("");
  const [submitDescription, setSubmitDescription] = useState("");
  const [submitLink, setSubmitLink] = useState(""); // ✅ Website(optional)

  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const availableKeywords = [
    "AI",
    "Web",
    "Mobile",
    "Social Media",
    "FinTech",
    "HealthTech",
    "E-commerce",
    "Productivity Tools",
  ];

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [potentialMembers] = useState<TeamMember[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [memberSearchTerm, setMemberSearchTerm] = useState("");
  const [filteredMembers, setFilteredMembers] = useState<TeamMember[]>([]);
  const [sentInvitations, setSentInvitations] = useState<Set<string>>(new Set());

  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    status: "In Progress" as ProjectStatus,
    links: [""],
    neededRoles: [] as string[],
    tech: [] as string[],
  });

  const [editProject, setEditProject] = useState({
    name: "",
    description: "",
    status: "In Progress" as ProjectStatus,
    links: [""],
    neededRoles: [] as string[],
    tech: [] as string[],
  });

  // --- NEW: 제출 제한 UI 상태 ---
  const [mySubmissionCount, setMySubmissionCount] = useState(0);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const reachedLimit = mySubmissionCount >= 3;

  // --- NEW: 토스트(성공/오류) ---
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // --- 한도 도달 시 자동 업그레이드 팝업 1회 오픈 ---
  const limitPopupShownRef = useRef(false);
  useEffect(() => {
    if (reachedLimit && !limitPopupShownRef.current) {
      setShowUpgradePrompt(true);
      limitPopupShownRef.current = true;
    }
  }, [reachedLimit]);

  const availableRoles = ["Developer", "Designer", "Product Manager", "Marketing", "Data Scientist", "DevOps"];
  const availableTech = ["React", "TypeScript", "Node.js", "Python", "Figma", "AWS", "MongoDB", "PostgreSQL"];

  const fetchUserProjects = async () => {
    if (!userId) return;

    try {
      const userProfile = await getCurrentUserProfileByClerk(supabase, userId);
      if (!userProfile) return;

      const [currentProjectsRes, completedProjectsRes] = await Promise.all([
        supabase.from("current_projects").select("*").eq("user_id", userProfile.id),
        supabase.from("completed_projects").select("*").eq("user_id", userProfile.id),
      ]);

      if (currentProjectsRes.error) {
        console.error("Error fetching current projects:", currentProjectsRes.error);
        return;
      }

      if (completedProjectsRes.error) {
        console.error("Error fetching completed projects:", completedProjectsRes.error);
        return;
      }

      const currentProjects =
        currentProjectsRes.data?.map((project: any) => ({
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status as ProjectStatus,
          links: project.links || [],
          createdAt: project.created_at,
          updatedAt: project.updated_at || project.created_at,
          teamSize: 1,
          neededRoles: [],
          tech: [],
          owner: {
            id: userProfile.id,
            name: "You",
            role: "Owner",
          },
          teamMembers: [],
        })) || [];

      const completedProjects =
        completedProjectsRes.data?.map((project: any) => ({
          id: project.id,
          name: project.name,
          description: project.description,
          status: "Completed" as ProjectStatus,
          links: project.links || [],
          createdAt: project.created_at,
          updatedAt: project.created_at,
          teamSize: 1,
          neededRoles: [],
          tech: [],
          owner: {
            id: userProfile.id,
            name: "You",
            role: "Owner",
          },
          teamMembers: [],
        })) || [];

      const allProjects = [...currentProjects, ...completedProjects];
      allProjects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setProjects(allProjects);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  // --- NEW: 내 제출 개수 가져오기 (submitted_projects) ---
  const fetchMySubmissionCount = async () => {
    if (!userId) {
      setMySubmissionCount(0);
      return;
    }
    try {
      const profile = await getCurrentUserProfileByClerk(supabase, userId);
      if (!profile) {
        setMySubmissionCount(0);
        return;
      }
      const { count, error } = await supabase
        .from("submitted_projects")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.id);
      if (!error) setMySubmissionCount(count ?? 0);
    } catch {
      // ignore
    }
  };

  const createProject = async () => {
    if (!newProject.name.trim() || !userId) return;

    setIsCreating(true);

    try {
      const userProfile = await getCurrentUserProfileByClerk(supabase, userId);
      if (!userProfile) {
        alert("User profile not found.");
        return;
      }

      if (newProject.status === "Completed") {
        const { error } = await supabase.from("completed_projects").insert({
          user_id: userProfile.id,
          name: newProject.name.trim(),
          description: newProject.description.trim(),
          links: newProject.links.filter((link) => link.trim() !== ""),
        });

        if (error) {
          console.error("Error creating completed project:", error);
          alert("Failed to create project. Please try again.");
          return;
        }
      } else {
        const { error } = await supabase.from("current_projects").insert({
          user_id: userProfile.id,
          name: newProject.name.trim(),
          description: newProject.description.trim(),
          status: newProject.status,
          links: newProject.links.filter((link) => link.trim() !== ""),
        });

        if (error) {
          console.error("Error creating current project:", error);
          alert("Failed to create project. Please try again.");
          return;
        }
      }

      setNewProject({
        name: "",
        description: "",
        status: "In Progress",
        links: [""],
        neededRoles: [],
        tech: [],
      });

      setShowNewProjectModal(false);
      await fetchUserProjects();
    } catch (error) {
      console.error("Failed to create project:", error);
      alert("Failed to create project. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const updateProject = async () => {
    if (!editingProject || !editProject.name.trim() || !userId) return;

    setIsSaving(true);

    try {
      const userProfile = await getCurrentUserProfileByClerk(supabase, userId);
      if (!userProfile) return;

      const oldStatus = editingProject.status;
      const newStatus = editProject.status;

      if (oldStatus !== newStatus) {
        if (oldStatus === "Completed" && newStatus !== "Completed") {
          await supabase.from("completed_projects").delete().eq("id", editingProject.id).eq("user_id", userProfile.id);

          await supabase.from("current_projects").insert({
            user_id: userProfile.id,
            name: editProject.name.trim(),
            description: editProject.description.trim(),
            status: editProject.status,
            links: editProject.links.filter((link) => link.trim() !== ""),
          });
        } else if (oldStatus !== "Completed" && newStatus === "Completed") {
          await supabase.from("current_projects").delete().eq("id", editingProject.id).eq("user_id", userProfile.id);

          await supabase.from("completed_projects").insert({
            user_id: userProfile.id,
            name: editProject.name.trim(),
            description: editProject.description.trim(),
            links: editProject.links.filter((link) => link.trim() !== ""),
          });
        }
      } else {
        if (editingProject.status === "Completed") {
          const { error } = await supabase
            .from("completed_projects")
            .update({
              name: editProject.name.trim(),
              description: editProject.description.trim(),
              links: editProject.links.filter((link) => link.trim() !== ""),
            })
            .eq("id", editingProject.id)
            .eq("user_id", userProfile.id);

          if (error) {
            console.error("Error updating completed project:", error);
            alert("Failed to update project. Please try again.");
            return;
          }
        } else {
          const { error } = await supabase
            .from("current_projects")
            .update({
              name: editProject.name.trim(),
              description: editProject.description.trim(),
              status: editProject.status,
              links: editProject.links.filter((link) => link.trim() !== ""),
            })
            .eq("id", editingProject.id)
            .eq("user_id", userProfile.id);

          if (error) {
            console.error("Error updating current project:", error);
            alert("Failed to update project. Please try again.");
            return;
          }
        }
      }

      setShowEditProjectModal(false);
      setEditingProject(null);
      await fetchUserProjects();
    } catch (error) {
      console.error("Failed to update project:", error);
      alert("Failed to update project. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteProject = async (projectToDelete: Project) => {
    if (!confirm("Are you sure you want to delete this project? This action cannot be undone.") || !userId) return;

    try {
      const userProfile = await getCurrentUserProfileByClerk(supabase, userId);
      if (!userProfile) return;

      if (projectToDelete.status === "Completed") {
        const { error } = await supabase
          .from("completed_projects")
          .delete()
          .eq("id", projectToDelete.id)
          .eq("user_id", userProfile.id);

        if (error) {
          console.error("Error deleting completed project:", error);
          alert("Failed to delete project. Please try again.");
          return;
        }
      } else {
        const { error } = await supabase
          .from("current_projects")
          .delete()
          .eq("id", projectToDelete.id)
          .eq("user_id", userProfile.id);

        if (error) {
          console.error("Error deleting current project:", error);
          alert("Failed to delete project. Please try again.");
          return;
        }
      }

      await fetchUserProjects();
    } catch (error) {
      console.error("Failed to delete project:", error);
      alert("Failed to delete project. Please try again.");
    }
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setEditProject({
      name: project.name,
      description: project.description,
      status: project.status,
      links: project.links.length > 0 ? project.links : [""],
      neededRoles: project.neededRoles || [],
      tech: project.tech || [],
    });
    setShowEditProjectModal(true);
  };

  const addEditProjectLink = () => {
    setEditProject((prev) => ({
      ...prev,
      links: [...prev.links, ""],
    }));
  };

  const updateEditProjectLink = (index: number, value: string) => {
    setEditProject((prev) => ({
      ...prev,
      links: prev.links.map((link, i) => (i === index ? value : link)),
    }));
  };

  const removeEditProjectLink = (index: number) => {
    if (editProject.links.length > 1) {
      setEditProject((prev) => ({
        ...prev,
        links: prev.links.filter((_, i) => i !== index),
      }));
    }
  };

  const addNewProjectLink = () => {
    setNewProject((prev) => ({
      ...prev,
      links: [...prev.links, ""],
    }));
  };

  const updateNewProjectLink = (index: number, value: string) => {
    setNewProject((prev) => ({
      ...prev,
      links: prev.links.map((link, i) => (i === index ? value : link)),
    }));
  };

  const removeNewProjectLink = (index: number) => {
    if (newProject.links.length > 1) {
      setNewProject((prev) => ({
        ...prev,
        links: prev.links.filter((_, i) => i !== index),
      }));
    }
  };

  const toggleEditRole = (role: string) => {
    setEditProject((prev) => ({
      ...prev,
      neededRoles: prev.neededRoles.includes(role) ? prev.neededRoles.filter((r) => r !== role) : [...prev.neededRoles, role],
    }));
  };

  const toggleEditTech = (tech: string) => {
    setEditProject((prev) => ({
      ...prev,
      tech: prev.tech.includes(tech) ? prev.tech.filter((t) => t !== tech) : [...prev.tech, tech],
    }));
  };

  const toggleRole = (role: string) => {
    setNewProject((prev) => ({
      ...prev,
      neededRoles: prev.neededRoles.includes(role) ? prev.neededRoles.filter((r) => r !== role) : [...prev.neededRoles, role],
    }));
  };

  const toggleTech = (tech: string) => {
    setNewProject((prev) => ({
      ...prev,
      tech: prev.tech.includes(tech) ? prev.tech.filter((t) => t !== tech) : [...prev.tech, tech],
    }));
  };

  const openTeamFinder = (project: Project) => {
    const queryParams = new URLSearchParams({
      projectId: project.id,
      projectName: project.name,
    });
    router.push(`/projects/find-partner?${queryParams.toString()}`);
  };

  const sendInvitation = (memberId: string) => {
    setSentInvitations((prev) => new Set([...prev, memberId]));
    console.log(`Invitation sent to member ${memberId} for project ${selectedProject?.name}`);
  };

  useEffect(() => {
    let filtered = potentialMembers;

    if (selectedRole !== "all") {
      filtered = filtered.filter((member) => member.role?.toLowerCase().includes(selectedRole.toLowerCase()));
    }

    if (memberSearchTerm) {
      filtered = filtered.filter(
        (member) =>
          member.name.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
          member.role?.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
          member.skills?.some((skill) => skill.toLowerCase().includes(memberSearchTerm.toLowerCase()))
      );
    }

    filtered.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    setFilteredMembers(filtered);
  }, [potentialMembers, selectedRole, memberSearchTerm]);

  const isOwnerProject = (_projectId: string) => true;

  useEffect(() => {
    if (userId) {
      fetchUserProjects();
      fetchMySubmissionCount(); // --- NEW
    } else {
      setProjects([]);
      setMySubmissionCount(0);
    }
  }, [userId]);

  useEffect(() => {
    let filtered = projects;

    if (activeFilter !== "all") {
      filtered = filtered.filter((project) => project.status === activeFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (project) =>
          project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          project.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredProjects(filtered);
  }, [projects, activeFilter, searchTerm]);

  const statusCounts = {
    all: projects.length,
    "In Progress": projects.filter((p) => p.status === "In Progress").length,
    Recruiting: projects.filter((p) => p.status === "Recruiting").length,
    Completed: projects.filter((p) => p.status === "Completed").length,
  };

  const getStatusCount = (filter: FilterTab) => {
    if (filter === "all") return statusCounts.all;
    return statusCounts[filter as keyof typeof statusCounts] || 0;
  };

  const getStatusIcon = (status: ProjectStatus): React.ReactNode => {
    switch (status) {
      case "In Progress":
        return <Rocket className="h-4 w-4" />;
      case "Recruiting":
        return <UserPlus className="h-4 w-4" />;
      case "Completed":
        return <CheckCircle className="h-4 w-4" />;
      case "Paused":
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case "In Progress":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "Recruiting":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "Completed":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "Paused":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  const completedProjectsList = useMemo(() => projects.filter((p) => p.status === "Completed"), [projects]);

  const toggleKeyword = (keyword: string) => {
    setSelectedKeywords((prev) => (prev.includes(keyword) ? prev.filter((k) => k !== keyword) : [...prev, keyword]));
  };

  // ✅ 완료 프로젝트 선택 시 제목/설명/링크 자동 채우기
  useEffect(() => {
    if (!selectedCompletedProject) {
      setSubmitTitle("");
      setSubmitDescription("");
      setSubmitLink("");
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("completed_projects")
        .select("name, description, links")
        .eq("id", selectedCompletedProject)
        .single();
      if (!error && data) {
        setSubmitTitle(data.name ?? "");
        setSubmitDescription(data.description ?? "");
        const first = Array.isArray(data.links) && data.links.length ? data.links[0] : "";
        setSubmitLink(first ?? "");
      }
    })();
  }, [selectedCompletedProject, supabase]);

  // ✅ 제출 로직 (external_url 저장) + ✅ 성공 토스트
  const handleSubmitProject = async () => {
    if (!userId) {
      alert("Please sign in to submit.");
      return;
    }
    if (!selectedCompletedProject) {
      alert("Please select a completed project.");
      return;
    }
    if (!submitTitle.trim()) {
      alert("Please enter a title.");
      return;
    }
    if (selectedKeywords.length === 0) {
      alert("Please select at least one keyword.");
      return;
    }

    setIsSubmitting(true);
    try {
      const userProfile = await getCurrentUserProfileByClerk(supabase, userId);
      if (!userProfile) {
        alert("User profile not found.");
        return;
      }

      // 중복 제출 방지 (같은 완료 프로젝트 중복)
      const { data: dup, error: dupErr } = await supabase
        .from("submitted_projects")
        .select("id")
        .eq("project_id", selectedCompletedProject)
        .maybeSingle();
      if (dupErr) {
        console.error("Dup check error:", dupErr);
        alert("Failed to check duplication. Please try again.");
        return;
      }
      if (dup) {
        alert("This project is already submitted.");
        return;
      }

      const ownerName =
        user?.fullName ?? user?.username ?? user?.primaryEmailAddress?.emailAddress?.split("@")[0] ?? "Unknown";

      const normalizedUrl = normalizeUrl(submitLink); // ✅ 정규화

      const { error } = await supabase.from("submitted_projects").insert({
        user_id: userProfile.id,
        project_id: selectedCompletedProject,
        title: submitTitle.trim(),
        description: (submitDescription ?? "").trim(),
        owner_name: ownerName,
        keywords: selectedKeywords,
        submitted_at: new Date().toISOString(),
        external_url: normalizedUrl, // ✅ 저장
      });

      if (error) {
        console.error("Error submitting project:", error);
        alert(error.message ?? "Failed to submit the project. Please try again.");
        return;
      }

      // ✅ 성공 토스트 (alert 대체)
      setToast({ type: "success", message: "Your project has been submitted!" });

      setShowSubmitModal(false);
      setSelectedCompletedProject("");
      setSelectedKeywords([]);
      setSubmitTitle("");
      setSubmitDescription("");
      setSubmitLink("");

      await fetchMySubmissionCount(); // --- NEW: 제출 수 갱신
    } catch (e) {
      console.error(e);
      alert("An error occurred while submitting. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      {/* --- SUCCESS / ERROR TOAST --- */}
      {toast && (
        <div className="fixed top-6 right-6 z-50">
          <div
            className={[
              "flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur",
              toast.type === "success"
                ? "bg-green-500/15 text-green-200 border-green-500/30"
                : "bg-red-500/15 text-red-200 border-red-500/30",
            ].join(" ")}
            role="status"
            aria-live="polite"
          >
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 p-1 text-white/70 hover:text-white"
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">My Projects</h1>
          <p className="text-white/60 mt-1">Manage your current and completed projects</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/projects/rankings")}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 border border-yellow-500/30 px-6 py-3 rounded-xl font-semibold hover:from-yellow-500/30 hover:to-orange-500/30 transition-all hover:scale-105"
          >
            <Trophy className="h-5 w-5" />
            Rankings
          </button>

          {/* --- Submit with limit & upsell --- */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => {
                if (reachedLimit) {
                  setShowUpgradePrompt(true);
                  return;
                }
                setShowSubmitModal(true);
              }}
              aria-disabled={reachedLimit}
              className={[
                "inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all",
                "border border-purple-500/30 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300",
                "hover:from-purple-500/30 hover:to-pink-500/30 hover:scale-105",
                reachedLimit ? "opacity-50 cursor-not-allowed grayscale hover:scale-100" : "",
              ].join(" ")}
              title={reachedLimit ? "Submission limit reached" : "Submit Project"}
            >
              <Upload className="h-5 w-5" />
              Submit Project
            </button>

            {/* 아래 영문 문구 */}
            {reachedLimit && (
              <p className="mt-1 text-[11px] text-white/70">
                Want to submit more? <span className="font-semibold">Upgrade to Plus</span>.
              </p>
            )}
          </div>

          <button
            onClick={() => setShowNewProjectModal(true)}
            className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-all hover:scale-105"
          >
            <Plus className="h-5 w-5" />
            New Project
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-zinc-950/70 border border-white/10 rounded-2xl p-6 backdrop-blur">
          <div className="text-2xl font-bold text-white">{projects.length}</div>
          <div className="text-white/60 text-sm">Total Projects</div>
        </div>
        <div className="bg-zinc-950/70 border border-white/10 rounded-2xl p-6 backdrop-blur">
          <div className="text-2xl font-bold text-blue-400">{projects.filter((p) => p.status === "In Progress").length}</div>
          <div className="text-white/60 text-sm">In Progress</div>
        </div>
        <div className="bg-zinc-950/70 border border-white/10 rounded-2xl p-6 backdrop-blur">
          <div className="text-2xl font-bold text-green-400">{projects.filter((p) => p.status === "Recruiting").length}</div>
          <div className="text-white/60 text-sm">Recruiting</div>
        </div>
        <div className="bg-zinc-950/70 border border-white/10 rounded-2xl p-6 backdrop-blur">
          <div className="text-2xl font-bold text-purple-400">{projects.filter((p) => p.status === "Completed").length}</div>
          <div className="text-white/60 text-sm">Completed</div>
        </div>
      </div>

      {/* 필터 바 */}
      <FilterBar
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        getStatusCount={(f) =>
          f === "all"
            ? projects.length
            : f === "In Progress"
            ? projects.filter((p) => p.status === "In Progress").length
            : f === "Recruiting"
            ? projects.filter((p) => p.status === "Recruiting").length
            : projects.filter((p) => p.status === "Completed").length
        }
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      {/* 리스트 */}
      {(() => {
        const list = activeFilter === "all" ? projects : projects.filter((p) => p.status === activeFilter);
        const filtered = searchTerm
          ? list.filter(
              (project) =>
                project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                project.description.toLowerCase().includes(searchTerm.toLowerCase())
            )
          : list;

        return filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                isOwnerProject={() => true}
                openEditModal={() => openEditModal(project)}
                deleteProject={() => deleteProject(project)}
                openTeamFinder={() => openTeamFinder(project)}
                getStatusColor={getStatusColor}
                getStatusIcon={getStatusIcon}
                formatDate={formatDate}
              />
            ))}
          </div>
        ) : (
          <EmptyState onCreate={() => setShowNewProjectModal(true)} activeFilter={activeFilter} searchTerm={searchTerm} />
        );
      })()}

      {/* ===== 모달들 ===== */}
      <EditProjectModal
        open={showEditProjectModal}
        onClose={() => setShowEditProjectModal(false)}
        editingProject={editingProject}
        editProject={editProject}
        setEditProject={setEditProject}
        onSave={updateProject}
        isSaving={isSaving}
        availableRoles={availableRoles}
        availableTech={availableTech}
        getStatusIcon={getStatusIcon}
      />

      <TeamFinderModal
        open={showTeamFinderModal}
        onClose={() => setShowTeamFinderModal(false)}
        selectedProject={selectedProject}
        filteredMembers={filteredMembers}
        selectedRole={selectedRole}
        setSelectedRole={setSelectedRole}
        memberSearchTerm={memberSearchTerm}
        setMemberSearchTerm={setMemberSearchTerm}
        sendInvitation={sendInvitation}
        sentInvitations={sentInvitations}
      />

      {/* 제출 모달 */}
      {showSubmitModal && (
        <SubmitModal
          onClose={() => setShowSubmitModal(false)}
          completedProjectsList={projects.filter((p) => p.status === "Completed")}
          selectedCompletedProject={selectedCompletedProject}
          setSelectedCompletedProject={setSelectedCompletedProject}
          submitTitle={submitTitle}
          setSubmitTitle={setSubmitTitle}
          submitDescription={submitDescription}
          setSubmitDescription={setSubmitDescription}
          submitLink={submitLink}
          setSubmitLink={setSubmitLink}
          availableKeywords={availableKeywords}
          selectedKeywords={selectedKeywords}
          setSelectedKeywords={setSelectedKeywords}
          onSubmit={handleSubmitProject}
          isSubmitting={isSubmitting}
        />
      )}

      {/* 새 프로젝트 모달 */}
      {showNewProjectModal && (
        <NewProjectModal
          open={showNewProjectModal}
          onClose={() => setShowNewProjectModal(false)}
          newProject={newProject}
          setNewProject={setNewProject}
          onCreate={createProject}
          isCreating={isCreating}
          availableRoles={availableRoles}
          availableTech={availableTech}
          getStatusIcon={getStatusIcon}
          addLink={addNewProjectLink}
          updateLink={updateNewProjectLink}
          removeLink={removeNewProjectLink}
          toggleRole={toggleRole}
          toggleTech={toggleTech}
        />
      )}

      {/* --- Upgrade prompt (tiny popup) --- */}
      {showUpgradePrompt && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-zinc-950/95 border border-white/15 rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg">
            <span className="text-sm text-white/85">
              To submit more, please purchase the <b>Plus</b> plan!
            </span>
            <button
              onClick={() => router.push("/pricing")}
              className="bg-white text-black px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-gray-100"
            >
              Upgrade
            </button>
            <button
              onClick={() => setShowUpgradePrompt(false)}
              className="p-1 text-white/60 hover:text-white"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

/* ===================== 분리된 작은 컴포넌트들 ===================== */

function FilterBar({
  activeFilter,
  setActiveFilter,
  getStatusCount,
  searchTerm,
  setSearchTerm,
}: {
  activeFilter: FilterTab;
  setActiveFilter: (f: FilterTab) => void;
  getStatusCount: (f: FilterTab) => number;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-8">
      <div className="flex bg-zinc-900/60 border border-white/10 rounded-xl p-1">
        {(["all", "In Progress", "Recruiting", "Completed"] as FilterTab[]).map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeFilter === filter ? "bg-white text-black" : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            {filter === "all" ? "All" : filter}
            <span className="ml-1 text-xs opacity-70">({getStatusCount(filter)})</span>
          </button>
        ))}
      </div>

      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
        <input
          type="text"
          placeholder="Search projects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-zinc-900/60 border border-white/10 rounded-xl text-white placeholder:text-white/40 outline-none focus:border-white/30 transition-all"
        />
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  isOwnerProject,
  openEditModal,
  deleteProject,
  openTeamFinder,
  getStatusColor,
  getStatusIcon,
  formatDate,
}: {
  project: Project;
  isOwnerProject: (id: string) => boolean;
  openEditModal: () => void;
  deleteProject: () => void;
  openTeamFinder: () => void;
  getStatusColor: (s: ProjectStatus) => string;
  getStatusIcon: (s: ProjectStatus) => React.ReactNode;
  formatDate: (iso: string) => string;
}) {
  return (
    <div className="bg-zinc-950/70 border border-white/10 rounded-2xl p-6 backdrop-blur hover:border-white/20 hover:shadow-lg hover:shadow-white/5 transition-all duration-300 ease-out group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-white/90 transition-colors">
            {project.name}
          </h3>
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>
            {getStatusIcon(project.status)}
            {project.status}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOwnerProject(project.id) && (
            <>
              <button
                onClick={openEditModal}
                className="p-2 hover:bg-white/10 rounded-lg opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300 ease-out"
                title="Edit project"
              >
                <Edit3 className="h-4 w-4 text-white/60 hover:text-white transition-colors duration-200" />
              </button>
              <button
                onClick={deleteProject}
                className="p-2 hover:bg-red-500/20 hover:text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300 ease-out delay-75"
                title="Delete project"
              >
                <Trash2 className="h-4 w-4 text-white/60 transition-colors duration-200" />
              </button>
            </>
          )}
        </div>
      </div>

      {project.owner && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-white/5 rounded-lg">
          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center text-white text-sm font-semibold">
            {project.owner.avatar ? (
              <img src={project.owner.avatar} alt={project.owner.name} className="h-8 w-8 rounded-full object-cover" />
            ) : (
              project.owner.name.charAt(0)
            )}
          </div>
          <div className="flex-1">
            <div className="text-white/90 text-sm font-medium">{project.owner.name}</div>
            <div className="text-white/60 text-xs">{project.owner.role}</div>
          </div>
          {isOwnerProject(project.id) && <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">Owner</span>}
        </div>
      )}

      <p className="text-white/70 text-sm mb-4 line-clamp-3">{project.description || "No description available."}</p>

      <div className="space-y-3 mb-4">
        {project.teamSize && (
          <div className="flex items-center gap-2 text-xs text-white/60">
            <Users className="h-4 w-4" />
            <span>
              {project.teamSize} team member{project.teamSize > 1 ? "s" : ""}
            </span>
          </div>
        )}
        {project.neededRoles && project.neededRoles.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-white/60">
            <UserPlus className="h-4 w-4" />
            <span>Need: {project.neededRoles.join(", ")}</span>
          </div>
        )}
        {project.tech && project.tech.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {project.tech.slice(0, 3).map((tech, techIndex) => (
              <span key={techIndex} className="px-2 py-1 bg-white/10 text-white/80 text-xs rounded-md">
                {tech}
              </span>
            ))}
            {project.tech.length > 3 && (
              <span className="px-2 py-1 bg-white/10 text-white/60 text-xs rounded-md">+{project.tech.length - 3}</span>
            )}
          </div>
        )}
      </div>

      {project.links && project.links.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          {project.links.slice(0, 2).map((link, linkIndex) => (
            <a
              key={linkIndex}
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
            >
              {link.includes("github") ? <Github className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
            </a>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <span className="text-xs text-white/50">Updated {formatDate(project.updatedAt)}</span>
        <div className="flex items-center gap-2">
          {project.status === "Recruiting" && isOwnerProject(project.id) && (
            <button
              onClick={openTeamFinder}
              className="text-xs bg-green-500/20 text-green-400 px-3 py-1 rounded-full hover:bg-green-500/30 transition-colors flex items-center gap-1"
            >
              <Users className="h-3 w-3" />
              Find Partner
            </button>
          )}
          {project.status === "Recruiting" && !isOwnerProject(project.id) && (
            <button className="text-xs bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full hover:bg-blue-500/30 transition-colors flex items-center gap-1">
              <Heart className="h-3 w-3" />
              Join Team
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  onCreate,
  activeFilter,
  searchTerm,
}: {
  onCreate: () => void;
  activeFilter: FilterTab;
  searchTerm: string;
}) {
  return (
    <div className="text-center py-16">
      <div className="mx-auto w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mb-6">
        <Rocket className="h-12 w-12 text-white/40" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">{searchTerm || activeFilter !== "all" ? "No projects found" : "No projects yet"}</h3>
      <p className="text-white/60 mb-6 max-w-md mx-auto">
        {searchTerm || activeFilter !== "all"
          ? "Try adjusting your search or filter criteria."
          : "Start building something amazing! Create your first project to get started."}
      </p>
      {!searchTerm && activeFilter === "all" && (
        <button
          onClick={onCreate}
          className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-all"
        >
          <Plus className="h-5 w-5" />
          Create Your First Project
        </button>
      )}
    </div>
  );
}

function EditProjectModal(props: any) {
  const { open } = props;
  if (!open) return null;
  const {
    onClose,
    editingProject,
    editProject,
    setEditProject,
    onSave,
    isSaving,
    availableRoles,
    availableTech,
    getStatusIcon,
  } = props;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-950/95 border border-white/20 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto backdrop-blur">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-semibold text-white">Edit Project</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-white/85 mb-2">Project Name *</label>
            <input
              type="text"
              value={editProject.name}
              onChange={(e) => setEditProject((prev: any) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. AI-Powered Study Assistant"
              className="w-full px-4 py-3 bg-zinc-900/80 border border-white/10 rounded-xl text-white placeholder:text-white/40 outline-none focus:border-white/30 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-white/85 mb-2">Project Status</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(["In Progress", "Recruiting", "Completed", "Paused"] as ProjectStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => setEditProject((prev: any) => ({ ...prev, status }))}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                    editProject.status === status ? "border-white bg-white text-black" : "border-white/20 bg-white/10 text-white hover:bg-white/15"
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    {getStatusIcon(status)}
                    {status}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-white/85 mb-2">Description</label>
            <textarea
              value={editProject.description}
              onChange={(e) => setEditProject((prev: any) => ({ ...prev, description: e.target.value }))}
              placeholder="Describe your project, its goals, and what you're building..."
              rows={4}
              className="w-full px-4 py-3 bg-zinc-900/80 border border-white/10 rounded-xl text-white placeholder:text-white/40 outline-none focus:border-white/30 transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-white/85 mb-2">Needed Team Roles</label>
            <div className="flex flex-wrap gap-2">
              {availableRoles.map((role: string) => (
                <button
                  key={role}
                  onClick={() =>
                    setEditProject((prev: any) => ({
                      ...prev,
                      neededRoles: prev.neededRoles.includes(role)
                        ? prev.neededRoles.filter((r: string) => r !== role)
                        : [...prev.neededRoles, role],
                    }))
                  }
                  className={`px-3 py-2 rounded-full text-sm font-medium transition-all ${
                    editProject.neededRoles.includes(role)
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      : "bg-white/10 text-white/70 border border-white/20 hover:bg-white/15"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-white/85 mb-2">Tech Stack</label>
            <div className="flex flex-wrap gap-2">
              {availableTech.map((tech: string) => (
                <button
                  key={tech}
                  onClick={() =>
                    setEditProject((prev: any) => ({
                      ...prev,
                      tech: prev.tech.includes(tech) ? prev.tech.filter((t: string) => t !== tech) : [...prev.tech, tech],
                    }))
                  }
                  className={`px-3 py-2 rounded-full text-sm font-medium transition-all ${
                    editProject.tech.includes(tech)
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : "bg-white/10 text-white/70 border border-white/20 hover:bg-white/15"
                  }`}
                >
                  {tech}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-white/85 mb-2">Project Links</label>
            <ProjectLinksEditor
              links={editProject.links}
              onAdd={() => setEditProject((prev: any) => ({ ...prev, links: [...prev.links, ""] }))}
              onChange={(i, v) =>
                setEditProject((prev: any) => ({ ...prev, links: prev.links.map((link: string, idx: number) => (idx === i ? v : link)) }))
              }
              onRemove={(i) =>
                setEditProject((prev: any) => ({ ...prev, links: prev.links.filter((_: string, idx: number) => idx !== i) }))
              }
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-white/10">
          <button onClick={props.onClose} className="px-6 py-3 text-white/70 hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={props.onSave}
            disabled={!editProject.name.trim() || props.isSaving}
            className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {props.isSaving ? (
              <>
                <div className="h-4 w-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectLinksEditor({
  links,
  onAdd,
  onChange,
  onRemove,
}: {
  links: string[];
  onAdd: () => void;
  onChange: (index: number, value: string) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="space-y-3">
      {links.map((link, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 bg-zinc-900/80 border border-white/10 rounded-xl px-3 py-3 focus-within:border-white/30 transition-all">
            <ExternalLink className="h-4 w-4 text-white/40 shrink-0" />
            <input
              type="url"
              value={link}
              onChange={(e) => onChange(index, e.target.value)}
              placeholder="https://github.com/username/project"
              className="flex-1 bg-transparent text-white placeholder:text-white/40 outline-none"
            />
          </div>
          {links.length > 1 && (
            <button onClick={() => onRemove(index)} className="p-2 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors text-white/40">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}

      <button onClick={onAdd} className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors">
        <Plus className="h-4 w-4" />
        Add another link
      </button>
    </div>
  );
}

function TeamFinderModal(props: any) {
  const { open } = props;
  if (!open) return null;
  const { onClose, selectedProject, filteredMembers, selectedRole, setSelectedRole, memberSearchTerm, setMemberSearchTerm, sendInvitation, sentInvitations } =
    props;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-950/95 border border-white/20 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden backdrop-blur">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-semibold text-white">Find Partners</h3>
              <p className="text-white/60 mt-1">for "{selectedProject?.name}"</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <div className="flex bg-zinc-900/60 border border-white/10 rounded-xl p-1">
              {["all", "Developer", "Designer", "Product", "Marketing"].map((role) => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedRole === role ? "bg-white text-black" : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {role === "all" ? "All Roles" : role}
                </button>
              ))}
            </div>

            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="text"
                placeholder="Search by name, skills..."
                value={memberSearchTerm}
                onChange={(e) => setMemberSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-zinc-900/60 border border-white/10 rounded-xl text-white placeholder:text-white/40 outline-none focus:border-white/30 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="p-6 max-h-96 overflow-y-auto">
          {filteredMembers.length > 0 ? (
            <div className="grid gap-4">
              {filteredMembers.map((member: TeamMember) => (
                <div key={member.id} className="bg-zinc-900/60 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center text-white font-semibold shrink-0">
                      {member.avatar ? <img src={member.avatar} alt={member.name} className="h-12 w-12 rounded-full object-cover" /> : member.name.charAt(0)}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="text-white font-semibold">{member.name}</h4>
                          <p className="text-white/60 text-sm">{member.role}</p>
                        </div>

                        {member.matchScore && (
                          <div className="flex items-center gap-1 bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs">
                            <Star className="h-3 w-3" />
                            {member.matchScore}% match
                          </div>
                        )}
                      </div>

                      <p className="text-white/70 text-sm mb-3">{member.bio}</p>

                      {member.skills && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {member.skills.map((skill: string, skillIndex: number) => (
                            <span key={skillIndex} className="px-2 py-1 bg-white/10 text-white/80 text-xs rounded-md">
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-xs text-white/50 mb-3">
                        {member.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {member.location}
                          </div>
                        )}
                        {member.availability && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {member.availability}
                          </div>
                        )}
                        {member.experience && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {member.experience}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      {sentInvitations?.has(member.id) ? (
                        <div className="bg-green-500/20 text-green-400 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Invited
                        </div>
                      ) : (
                        <button
                          onClick={() => sendInvitation(member.id)}
                          className="bg-blue-500/20 text-blue-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-500/30 transition-colors flex items-center gap-2"
                        >
                          <Send className="h-4 w-4" />
                          Invite
                        </button>
                      )}
                      <button className="bg-white/10 text-white/70 px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/15 transition-colors flex items-center gap-2">
                        <MessageCircle className="h-4 w-4" />
                        Message
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-16 w-16 text-white/20 mx-auto mb-4" />
              <h4 className="text-white/60 text-lg mb-2">No members found</h4>
              <p className="text-white/40 text-sm">Try adjusting your search criteria</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="text-sm text-white/60">
              {filteredMembers.length} potential partner{filteredMembers.length !== 1 ? "s" : ""} found
            </div>
            <button onClick={onClose} className="bg-white text-black px-6 py-2 rounded-xl font-semibold hover:bg-gray-100 transition-colors">
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SubmitModal(props: any) {
  const {
    onClose,
    completedProjectsList,
    selectedCompletedProject,
    setSelectedCompletedProject,
    submitTitle,
    setSubmitTitle,
    submitDescription,
    setSubmitDescription,
    submitLink,
    setSubmitLink,
    availableKeywords,
    selectedKeywords,
    setSelectedKeywords,
    onSubmit,
    isSubmitting,
  } = props;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-950/95 border border-white/20 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-semibold text-white">Submit Completed Project</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 프로젝트 선택 */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-white/85 mb-2">Select Completed Project *</label>
          <select
            value={selectedCompletedProject}
            onChange={(e) => setSelectedCompletedProject(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-900/80 border border-white/10 rounded-xl text-white"
          >
            <option value="">-- Select Project --</option>
            {completedProjectsList.map((proj: Project) => (
              <option key={proj.id} value={proj.id}>
                {proj.name}
              </option>
            ))}
          </select>
          {completedProjectsList.length === 0 && (
            <p className="text-xs text-white/50 mt-2">No completed projects found. Mark a project as “Completed” before submitting.</p>
          )}
        </div>

        {/* 제목 */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-white/85 mb-2">Title *</label>
          <input
            type="text"
            value={submitTitle}
            onChange={(e) => setSubmitTitle(e.target.value)}
            placeholder="Enter a title to display on rankings"
            className="w-full px-4 py-3 bg-zinc-900/80 border border-white/10 rounded-xl text-white placeholder:text-white/40 outline-none focus:border-white/30 transition-all"
          />
        </div>

        {/* 설명 */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-white/85 mb-2">Description</label>
          <textarea
            value={submitDescription}
            onChange={(e) => setSubmitDescription(e.target.value)}
            placeholder="Short summary that appears on the ranking page"
            rows={4}
            className="w-full px-4 py-3 bg-zinc-900/80 border border-white/10 rounded-xl text-white placeholder:text-white/40 outline-none focus:border-white/30 transition-all resize-none"
          />
        </div>

        {/* ✅ Website (optional) */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-white/85 mb-2">Website (optional)</label>
          <div className="flex items-center gap-2 bg-zinc-900/80 border border-white/10 rounded-xl px-3 py-3 focus-within:border-white/30 transition-all">
            <ExternalLink className="h-4 w-4 text-white/40 shrink-0" />
            <input
              type="text"
              value={submitLink}
              onChange={(e) => setSubmitLink(e.target.value)}
              placeholder="https://your-site.com or your-site.com"
              className="flex-1 bg-transparent text-white placeholder:text-white/40 outline-none"
            />
          </div>
          <p className="text-xs text-white/40 mt-1">
            If the scheme is missing, <code>https://</code> will be added automatically.
          </p>
        </div>

        {/* 키워드 */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-white/85 mb-2">Keywords *</label>
          <div className="flex flex-wrap gap-2">
            {availableKeywords.map((keyword: string) => (
              <button
                key={keyword}
                type="button"
                onClick={() =>
                  setSelectedKeywords((prev: string[]) => (prev.includes(keyword) ? prev.filter((k) => k !== keyword) : [...prev, keyword]))
                }
                className={`px-3 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedKeywords.includes(keyword)
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    : "bg-white/10 text-white/70 border border-white/20 hover:bg-white/15"
                }`}
              >
                {keyword}
              </button>
            ))}
          </div>
          {selectedKeywords.length === 0 && <p className="text-xs text-red-400 mt-1">Please select at least one keyword.</p>}
        </div>

        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-6 py-3 text-white/70 hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={isSubmitting || completedProjectsList.length === 0}
            className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Submit
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- NEW: NewProjectModal ---------------- */
function NewProjectModal(props: any) {
  const {
    open,
    onClose,
    newProject,
    setNewProject,
    onCreate,
    isCreating,
    availableRoles,
    availableTech,
    getStatusIcon,
    addLink,
    updateLink,
    removeLink,
    toggleRole,
    toggleTech,
  } = props;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-950/95 border border-white/20 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto backdrop-blur">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-semibold text-white">Create New Project</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-white/85 mb-2">Project Name *</label>
            <input
              type="text"
              value={newProject.name}
              onChange={(e) => setNewProject((prev: any) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. AI-Powered Study Assistant"
              className="w-full px-4 py-3 bg-zinc-900/80 border border-white/10 rounded-xl text-white placeholder:text-white/40 outline-none focus:border-white/30 transition-all"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-semibold text-white/85 mb-2">Project Status</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(["In Progress", "Recruiting", "Completed", "Paused"] as ProjectStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => setNewProject((prev: any) => ({ ...prev, status }))}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                    newProject.status === status ? "border-white bg-white text-black" : "border-white/20 bg-white/10 text-white hover:bg-white/15"
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    {getStatusIcon(status)}
                    {status}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-white/85 mb-2">Description</label>
            <textarea
              value={newProject.description}
              onChange={(e) => setNewProject((prev: any) => ({ ...prev, description: e.target.value }))}
              placeholder="Describe your project, its goals, and what you're building..."
              rows={4}
              className="w-full px-4 py-3 bg-zinc-900/80 border border-white/10 rounded-xl text-white placeholder:text-white/40 outline-none focus:border-white/30 transition-all resize-none"
            />
          </div>

          {/* Needed Roles */}
          <div>
            <label className="block text-sm font-semibold text-white/85 mb-2">Needed Team Roles</label>
            <div className="flex flex-wrap gap-2">
              {availableRoles.map((role: string) => (
                <button
                  key={role}
                  onClick={() => toggleRole(role)}
                  className={`px-3 py-2 rounded-full text-sm font-medium transition-all ${
                    newProject.neededRoles.includes(role)
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      : "bg-white/10 text-white/70 border border-white/20 hover:bg-white/15"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* Tech */}
          <div>
            <label className="block text-sm font-semibold text-white/85 mb-2">Tech Stack</label>
            <div className="flex flex-wrap gap-2">
              {availableTech.map((tech: string) => (
                <button
                  key={tech}
                  onClick={() => toggleTech(tech)}
                  className={`px-3 py-2 rounded-full text-sm font-medium transition-all ${
                    newProject.tech.includes(tech)
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : "bg-white/10 text-white/70 border border-white/20 hover:bg-white/15"
                  }`}
                >
                  {tech}
                </button>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <label className="block text-sm font-semibold text-white/85 mb-2">Project Links</label>
            <ProjectLinksEditor
              links={newProject.links}
              onAdd={addLink}
              onChange={updateLink}
              onRemove={removeLink}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-white/10">
          <button onClick={onClose} className="px-6 py-3 text-white/70 hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={onCreate}
            disabled={!newProject.name.trim() || isCreating}
            className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? (
              <>
                <div className="h-4 w-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Create Project
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
