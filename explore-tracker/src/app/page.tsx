"use client";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Filter,
  Star,
  Archive,
  Trash2,
  ExternalLink,
  Tag,
  Sparkles,
  TrendingUp,
  Clock,
  CheckCircle,
  Target,
  Zap,
  Brain,
  Cpu,
  Printer,
  Code,
  MoreHorizontal,
  X,
  Loader2,
  Link2,
  Hash,
  Globe,
  Instagram,
  Youtube,
  Twitter,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

type ExploreStatus = "PLANNED" | "IN_PROGRESS" | "EXPLORED" | "DREAM";

type Link = { url: string; label?: string; kind?: string };

type Item = {
  id: string;
  title: string;
  description?: string | null;
  primaryUrl?: string | null;
  notes?: string | null;
  status: ExploreStatus;
  category: {
    id: string;
    name: string;
    description?: string | null;
  } | null;
  categoryId?: string | null;
  isFavorite: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  links: Link[];
  tags: { tag: { id: string; name: string } }[];
};

const STATUSES: ExploreStatus[] = [
  "PLANNED",
  "IN_PROGRESS",
  "EXPLORED",
  "DREAM",
];

const categoryIcons: Record<string, any> = {
  AI_AGENTS: Brain,
  RASPBERRY_PI: Cpu,
  PRINTER_3D: Printer,
  ELECTRONICS: Zap,
  SOFTWARE: Code,
  AUTOMATION: Zap,
  WEB_TOOLS: Globe,
  PRODUCTIVITY: Clock,
  MARKETING: TrendingUp,
  GADGETS: Cpu,
  OTHER: MoreHorizontal,
};

const statusColors = {
  PLANNED: "bg-gradient-to-r from-slate-500 to-slate-600",
  IN_PROGRESS: "bg-gradient-to-r from-blue-500 to-cyan-500",
  EXPLORED: "bg-gradient-to-r from-green-500 to-emerald-500",
  DREAM: "bg-gradient-to-r from-purple-500 to-pink-500",
};

const statusIcons = {
  PLANNED: Clock,
  IN_PROGRESS: TrendingUp,
  EXPLORED: CheckCircle,
  DREAM: Target,
};

const platformIcons: Record<string, any> = {
  Instagram,
  YouTube: Youtube,
  "Twitter/X": Twitter,
  Website: Globe,
};

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [urlProcessing, setUrlProcessing] = useState(false);
  const [quickUrl, setQuickUrl] = useState("");

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [onlyFav, setOnlyFav] = useState(false);

  // form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [primaryUrl, setPrimaryUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [formStatus, setFormStatus] = useState<ExploreStatus>("PLANNED");
  const [formCategory, setFormCategory] = useState<string>("OTHER");
  const [tagInput, setTagInput] = useState("");
  const [linksInput, setLinksInput] = useState("");

  const params = useMemo(() => {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    if (status) sp.set("status", status);
    if (category) sp.set("category", category);
    if (onlyFav) sp.set("favorite", "true");
    return sp.toString();
  }, [q, status, category, onlyFav]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/items${params ? `?${params}` : ""}`);
      const data = await res.json();
      setItems(data);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      setCategories(data);
    } catch (e: any) {
      console.error("Failed to load categories:", e);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => {
    loadCategories();
  }, []);

  async function processUrlContent(url: string) {
    if (!url) return;

    setUrlProcessing(true);
    try {
      const res = await fetch("/api/process-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (res.ok) {
        const data = await res.json();

        // Auto-fill form with extracted and AI-analyzed data
        if (data.suggestedData) {
          setTitle(data.suggestedData.title || "");
          setDescription(data.suggestedData.description || "");
          setPrimaryUrl(url);
          setFormCategory(data.suggestedData.category || "OTHER");
          setTagInput(data.suggestedData.tags?.join(", ") || "");
          setNotes(data.suggestedData.notes || "");

          // Add related links
          if (data.suggestedData.links && data.suggestedData.links.length > 0) {
            setLinksInput(
              data.suggestedData.links.map((l: any) => l.url).join("\n")
            );
          }
        }

        // Show extracted metadata in a toast or notification
        if (data.extracted?.platform) {
          // You could add a toast notification here
          console.log(
            `Processed ${data.extracted.platform} content:`,
            data.extracted
          );
        }
      }
    } catch (error) {
      console.error("URL processing failed:", error);
    } finally {
      setUrlProcessing(false);
    }
  }

  async function analyzeWithAI() {
    if (!title) return;

    setAiAnalyzing(true);
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, url: primaryUrl }),
      });

      if (res.ok) {
        const analysis = await res.json();
        setFormCategory(analysis.category);
        setTagInput(analysis.tags.join(", "));
        if (!description && analysis.summary) {
          setDescription(analysis.summary);
        }
      }
    } catch (error) {
      console.error("AI analysis failed:", error);
    } finally {
      setAiAnalyzing(false);
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const tags = tagInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const links: Link[] = linksInput
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((url) => ({ url }));

    const body = {
      title,
      description: description || undefined,
      primaryUrl: primaryUrl || undefined,
      notes: notes || undefined,
      status: formStatus,
      category: formCategory,
      links,
      tags,
    };

    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err?.error ?? "Failed to create");
      return;
    }

    // Reset form
    setTitle("");
    setDescription("");
    setPrimaryUrl("");
    setNotes("");
    setFormStatus("PLANNED");
    setFormCategory("OTHER");
    setTagInput("");
    setLinksInput("");
    setShowAddModal(false);
    setQuickUrl("");
    await load();
  }

  async function quickAddFromUrl() {
    if (!quickUrl) return;

    await processUrlContent(quickUrl);
    setShowAddModal(true);
  }

  async function updateItem(id: string, payload: Partial<Item>) {
    const res = await fetch(`/api/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) alert("Update failed");
    await load();
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this item?")) return;
    const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
    if (!res.ok) alert("Delete failed");
    await load();
  }

  const stats = useMemo(() => {
    return {
      total: items.length,
      planned: items.filter((i) => i.status === "PLANNED").length,
      inProgress: items.filter((i) => i.status === "IN_PROGRESS").length,
      explored: items.filter((i) => i.status === "EXPLORED").length,
      dreams: items.filter((i) => i.status === "DREAM").length,
    };
  }, [items]);

  // Get platform icon from URL
  function getPlatformIcon(url?: string | null) {
    if (!url) return Globe;
    if (url.includes("instagram.com")) return Instagram;
    if (url.includes("youtube.com") || url.includes("youtu.be")) return Youtube;
    if (url.includes("twitter.com") || url.includes("x.com")) return Twitter;
    return Globe;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Background decoration */}
      <div className="fixed inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

      <div className="relative mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                Explore Tracker
              </h1>
              <p className="mt-2 text-purple-200/70">
                Capture your curiosity. Track your learning journey.
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 text-white shadow-lg shadow-purple-500/25 transition-all hover:shadow-xl hover:shadow-purple-500/40"
            >
              <Plus className="h-5 w-5" />
              Add New
            </motion.button>
          </div>
        </motion.header>

        {/* Quick Add from URL */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-md p-4 border border-purple-500/20"
        >
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-purple-400" />
                <input
                  value={quickUrl}
                  onChange={(e) => setQuickUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && quickAddFromUrl()}
                  className="w-full rounded-lg bg-white/10 pl-10 pr-4 py-2.5 text-white placeholder-white/50 backdrop-blur-sm transition-all focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Paste Instagram reel, YouTube video, or any URL to auto-extract content..."
                />
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={quickAddFromUrl}
              disabled={!quickUrl || urlProcessing}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2.5 text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50"
            >
              {urlProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Process URL
            </motion.button>
          </div>
          <p className="mt-2 text-xs text-purple-300/70">
            💡 Tip: Paste any social media link to automatically extract title,
            description, and relevant metadata
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-5"
        >
          {[
            {
              label: "Total",
              value: stats.total,
              color: "from-blue-500 to-cyan-500",
            },
            {
              label: "Planned",
              value: stats.planned,
              color: "from-slate-500 to-slate-600",
            },
            {
              label: "In Progress",
              value: stats.inProgress,
              color: "from-blue-500 to-cyan-500",
            },
            {
              label: "Explored",
              value: stats.explored,
              color: "from-green-500 to-emerald-500",
            },
            {
              label: "Dreams",
              value: stats.dreams,
              color: "from-purple-500 to-pink-500",
            },
          ].map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + idx * 0.05 }}
              className="relative overflow-hidden rounded-xl bg-white/10 backdrop-blur-md p-4"
            >
              <div
                className={cn(
                  "absolute inset-0 bg-gradient-to-r opacity-20",
                  stat.color
                )}
              />
              <div className="relative">
                <p className="text-sm text-white/70">{stat.label}</p>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6 rounded-xl bg-white/10 backdrop-blur-md p-4"
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/50" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="w-full rounded-lg bg-white/10 pl-10 pr-4 py-2 text-white placeholder-white/50 backdrop-blur-sm transition-all focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Search..."
                />
              </div>
            </div>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-lg bg-white/10 px-4 py-2 text-white backdrop-blur-sm transition-all focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Status</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg bg-white/10 px-4 py-2 text-white backdrop-blur-sm transition-all focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name.replace(/_/g, " ")}
                </option>
              ))}
            </select>

            <button
              onClick={() => setOnlyFav(!onlyFav)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 transition-all",
                onlyFav
                  ? "bg-yellow-500/20 text-yellow-300"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
              )}
            >
              <Star className="h-4 w-4" />
              Favorites
            </button>
          </div>
        </motion.div>

        {/* Items Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {loading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="col-span-full py-20 text-center"
              >
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-purple-400" />
                <p className="mt-4 text-white/60">
                  Loading your explorations...
                </p>
              </motion.div>
            ) : error ? (
              <motion.div className="col-span-full py-20 text-center text-red-400">
                {error}
              </motion.div>
            ) : items.length === 0 ? (
              <motion.div className="col-span-full py-20 text-center">
                <Sparkles className="mx-auto h-12 w-12 text-purple-400" />
                <p className="mt-4 text-white/60">
                  No items yet. Start exploring!
                </p>
                <p className="mt-2 text-sm text-purple-300/70">
                  Try pasting an Instagram reel or YouTube link above to get
                  started
                </p>
              </motion.div>
            ) : (
              items.map((item, idx) => {
                const Icon =
                  categoryIcons[item.category?.name || "OTHER"] ||
                  categoryIcons.OTHER;
                const StatusIcon = statusIcons[item.status];
                const PlatformIcon = getPlatformIcon(item.primaryUrl);

                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group relative overflow-hidden rounded-xl bg-white/10 backdrop-blur-md transition-all hover:bg-white/15"
                  >
                    {/* Status bar */}
                    <div className={cn("h-1", statusColors[item.status])} />

                    <div className="p-5">
                      {/* Header */}
                      <div className="mb-3 flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="rounded-lg bg-white/10 p-2">
                            <Icon className="h-5 w-5 text-white/70" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-white line-clamp-2">
                              {item.title}
                            </h3>
                            <div className="mt-1 flex items-center gap-2 text-xs text-white/50">
                              <StatusIcon className="h-3 w-3" />
                              <span>{item.status}</span>
                              {item.primaryUrl && (
                                <>
                                  <span>•</span>
                                  <PlatformIcon className="h-3 w-3" />
                                </>
                              )}
                              <span>•</span>
                              <span>{formatDate(item.createdAt)}</span>
                            </div>
                          </div>
                        </div>

                        {item.isFavorite && (
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        )}
                      </div>

                      {/* Description */}
                      {item.description && (
                        <p className="mb-3 text-sm text-white/70 line-clamp-2">
                          {item.description}
                        </p>
                      )}

                      {/* Tags */}
                      {item.tags.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-1">
                          {item.tags.map((t) => (
                            <span
                              key={t.tag.id}
                              className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 px-2 py-0.5 text-xs text-purple-300"
                            >
                              <Hash className="h-2.5 w-2.5" />
                              {t.tag.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Links */}
                      {(item.primaryUrl || item.links.length > 0) && (
                        <div className="mb-3 flex flex-wrap gap-2">
                          {item.primaryUrl && (
                            <a
                              href={item.primaryUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Primary
                            </a>
                          )}
                          {item.links.slice(0, 2).map((link, idx) => (
                            <a
                              key={idx}
                              href={link.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                            >
                              <Link2 className="h-3 w-3" />
                              {link.label || `Link ${idx + 1}`}
                            </a>
                          ))}
                          {item.links.length > 2 && (
                            <span className="text-xs text-white/40">
                              +{item.links.length - 2} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {item.status !== "EXPLORED" && (
                          <button
                            onClick={() =>
                              updateItem(item.id, { status: "EXPLORED" })
                            }
                            className="rounded-lg bg-green-500/20 px-3 py-1 text-xs text-green-300 transition-all hover:bg-green-500/30"
                          >
                            Mark Explored
                          </button>
                        )}
                        {item.status !== "DREAM" && (
                          <button
                            onClick={() =>
                              updateItem(item.id, { status: "DREAM" })
                            }
                            className="rounded-lg bg-purple-500/20 px-3 py-1 text-xs text-purple-300 transition-all hover:bg-purple-500/30"
                          >
                            Dream
                          </button>
                        )}
                        <button
                          onClick={() =>
                            updateItem(item.id, {
                              isFavorite: !item.isFavorite,
                            })
                          }
                          className="rounded-lg bg-white/10 p-1.5 text-white/50 transition-all hover:bg-white/20 hover:text-yellow-400"
                        >
                          <Star
                            className={cn(
                              "h-3.5 w-3.5",
                              item.isFavorite && "fill-current"
                            )}
                          />
                        </button>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="ml-auto rounded-lg bg-white/10 p-1.5 text-white/50 transition-all hover:bg-red-500/20 hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-purple-900 shadow-2xl"
            >
              <div className="border-b border-white/10 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">
                    Add New Exploration
                  </h2>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="rounded-lg p-2 text-white/50 transition-all hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <form onSubmit={onCreate} className="p-6">
                <div className="space-y-4">
                  {/* URL Processor */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-white/80">
                      Quick Import from URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        value={primaryUrl}
                        onChange={(e) => setPrimaryUrl(e.target.value)}
                        className="flex-1 rounded-lg bg-white/10 px-4 py-2.5 text-white placeholder-white/50 backdrop-blur-sm transition-all focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Paste Instagram, YouTube, or any URL..."
                      />
                      <button
                        type="button"
                        onClick={() => processUrlContent(primaryUrl)}
                        disabled={!primaryUrl || urlProcessing}
                        className="flex items-center gap-1.5 rounded-lg bg-purple-500/20 px-4 py-2.5 text-sm text-purple-300 transition-all hover:bg-purple-500/30 disabled:opacity-50"
                      >
                        {urlProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        Extract
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-white/80">
                      Title *
                    </label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      className="w-full rounded-lg bg-white/10 px-4 py-2.5 text-white placeholder-white/50 backdrop-blur-sm transition-all focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="What do you want to explore?"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-white/80">
                        Status
                      </label>
                      <select
                        value={formStatus}
                        onChange={(e) =>
                          setFormStatus(e.target.value as ExploreStatus)
                        }
                        className="w-full rounded-lg bg-white/10 px-4 py-2.5 text-white backdrop-blur-sm transition-all focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-white/80">
                        Category
                      </label>
                      <select
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        className="w-full rounded-lg bg-white/10 px-4 py-2.5 text-white backdrop-blur-sm transition-all focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-white/80">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full rounded-lg bg-white/10 px-4 py-2.5 text-white placeholder-white/50 backdrop-blur-sm transition-all focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      rows={3}
                      placeholder="Add some context..."
                    />
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="block text-sm font-medium text-white/80">
                        Tags (comma separated)
                      </label>
                      <button
                        type="button"
                        onClick={analyzeWithAI}
                        disabled={!title || aiAnalyzing}
                        className="flex items-center gap-1.5 rounded-lg bg-purple-500/20 px-3 py-1 text-xs text-purple-300 transition-all hover:bg-purple-500/30 disabled:opacity-50"
                      >
                        {aiAnalyzing ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3" />
                        )}
                        AI Suggest
                      </button>
                    </div>
                    <input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      className="w-full rounded-lg bg-white/10 px-4 py-2.5 text-white placeholder-white/50 backdrop-blur-sm transition-all focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="ai, raspberry-pi, automation..."
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-white/80">
                      Notes
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full rounded-lg bg-white/10 px-4 py-2.5 text-white placeholder-white/50 backdrop-blur-sm transition-all focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      rows={2}
                      placeholder="Key points, action items..."
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-white/80">
                      Related Links (one per line)
                    </label>
                    <textarea
                      value={linksInput}
                      onChange={(e) => setLinksInput(e.target.value)}
                      className="w-full rounded-lg bg-white/10 px-4 py-2.5 text-white placeholder-white/50 backdrop-blur-sm transition-all focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      rows={3}
                      placeholder="https://product-link.com&#10;https://documentation.com"
                    />
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 py-2.5 font-medium text-white shadow-lg transition-all hover:shadow-xl"
                  >
                    Add to Explorations
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="rounded-lg bg-white/10 px-6 py-2.5 font-medium text-white/70 backdrop-blur-sm transition-all hover:bg-white/20"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
