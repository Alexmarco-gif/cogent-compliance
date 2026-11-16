"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Search,
  BookOpen,
  Percent,
  CheckSquare,
  Activity,
  Settings,
  PanelLeftClose,
  MessageSquare,
  MoreHorizontal,
  Edit2,
  Archive,
  Check,
  LogIn,
  ArrowRight,
  Camera,
  Trash2,
  User as UserIcon,
  Building2,
  LogOut,
  ChevronUp,
} from "lucide-react";
import { useAuth, useClerk, useUser } from "@clerk/nextjs";
import { CogentLogo } from "@/components/brand/CogentLogo";
import type { ConversationRecord } from "@/modules/conversations/conversation.service";

interface SubscriptionSummary {
  planName: string;
  planSlug: string;
  status: string;
  isTrial: boolean;
  trialDaysRemaining: number;
  auditLimit: number;
  auditsUsed?: number;
}

export interface WorkspaceSidebarProps {
  conversations?: ConversationRecord[];
  activeConversationId?: string | null;
  onSelectConversation?: (id: string) => void;
  onNewAudit?: () => void;
  onRenameConversation?: (id: string, newTitle: string) => Promise<void>;
  onArchiveConversation?: (id: string) => Promise<void>;
  loadingConversations?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function WorkspaceSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewAudit,
  onRenameConversation,
  onArchiveConversation,
  loadingConversations = false,
  collapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
}: WorkspaceSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeKbTab = searchParams.get("tab") || "products";
  const { isLoaded, isSignedIn, orgId } = useAuth();
  const { signOut } = useClerk();
  const { user } = useUser();

  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [updatingAvatar, setUpdatingAvatar] = useState(false);
  const [subSummary, setSubSummary] = useState<SubscriptionSummary | null>(null);
  const [selfConversations, setSelfConversations] = useState<ConversationRecord[]>([]);
  const [loadingSelfConversations, setLoadingSelfConversations] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const managesOwnThreads = conversations === undefined;
  const resolvedConversations = conversations ?? selfConversations;
  const resolvedLoading = managesOwnThreads ? loadingSelfConversations : loadingConversations;

  const displayName =
    user?.fullName?.trim() ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.username ||
    "Account";

  const userInitials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "U";

  // Keyboard shortcut Cmd/Ctrl + K focuses sidebar search
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape") {
        setUserMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Close user menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [userMenuOpen]);

  const handleAvatarFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    setUpdatingAvatar(true);
    try {
      await user.setProfileImage({ file });
      setUserMenuOpen(false);
    } catch (err) {
      console.error("Failed to update profile image", err);
    } finally {
      setUpdatingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    setUpdatingAvatar(true);
    try {
      await user.setProfileImage({ file: null });
      setUserMenuOpen(false);
    } catch (err) {
      console.error("Failed to remove profile image", err);
    } finally {
      setUpdatingAvatar(false);
    }
  };

  // Load saved threads on non-chat pages (e.g. /knowledge-base, /drift-monitors) so history stays accessible
  useEffect(() => {
    if (!managesOwnThreads || !isLoaded || !isSignedIn || !orgId) return;
    let active = true;
    setLoadingSelfConversations(true);
    fetch("/api/marketing-shield/v1/conversations?status=ACTIVE")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!active || !json?.success) return;
        setSelfConversations(json.data?.conversations || []);
      })
      .catch(() => {
        // Silent fail on navigation pages
      })
      .finally(() => {
        if (active) setLoadingSelfConversations(false);
      });
    return () => {
      active = false;
    };
  }, [managesOwnThreads, isLoaded, isSignedIn, orgId]);

  // Load current plan summary quietly when authenticated with an active org
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !orgId) return;
    let active = true;
    fetch("/api/marketing-shield/v1/billing/entitlements")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!active || !json?.subscription) return;
        const sub = json.subscription;
        const auditEnt = Array.isArray(json.entitlements)
          ? json.entitlements.find((e: { feature?: string }) => e.feature === "run_audit")
          : undefined;
        setSubSummary({
          planName: sub.plan?.name || "Evaluation Pilot",
          planSlug: sub.plan?.slug || "evaluation",
          status: sub.status || "trialing",
          isTrial: Boolean(sub.isTrial),
          trialDaysRemaining: sub.trialDaysRemaining ?? 7,
          auditLimit: sub.plan?.monthly_audit_limit ?? 3,
          auditsUsed: auditEnt?.currentCount,
        });
      })
      .catch(() => {
        // Silent fail so sidebar never flashes raw errors
      });
    return () => {
      active = false;
    };
  }, [isLoaded, isSignedIn, orgId]);

  const filteredConversations = resolvedConversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleRenameInternal = async (id: string, newTitle: string) => {
    if (onRenameConversation) {
      await onRenameConversation(id, newTitle);
      return;
    }
    const res = await fetch(`/api/marketing-shield/v1/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    });
    if (res.ok) {
      setSelfConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c)),
      );
    }
  };

  const handleArchiveInternal = async (id: string) => {
    if (onArchiveConversation) {
      await onArchiveConversation(id);
      return;
    }
    const res = await fetch(`/api/marketing-shield/v1/conversations/${id}/archive`, {
      method: "POST",
    });
    if (res.ok) {
      setSelfConversations((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const handleSaveRename = async (id: string) => {
    if (editTitle.trim()) {
      await handleRenameInternal(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const navLinkClass = (active: boolean) =>
    `flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-colors ${
      active
        ? "bg-zinc-200/70 text-zinc-950 font-medium"
        : "text-zinc-600 hover:bg-zinc-200/40 hover:text-zinc-950"
    }`;

  if (collapsed) {
    return null;
  }

  const sidebarContent = (
    <aside className="w-[240px] shrink-0 bg-zinc-50 border-r border-zinc-200 flex flex-col justify-between h-screen select-none">
      {/* Top: Brand, Search, Primary Navigation & Recent Audits */}
      <div className="flex flex-col min-h-0 flex-1">
        {/* Brand Row */}
        <div className="h-[52px] px-3.5 flex items-center justify-between shrink-0">
          <Link href="/chat" className="inline-flex items-center">
            <CogentLogo variant="dark" size="sm" />
          </Link>
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/50 transition-colors cursor-pointer"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="px-3 pb-3 shrink-0">
          <div className="relative flex items-center">
            <Search className="h-3.5 w-3.5 text-zinc-400 absolute left-2.5 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full h-8 pl-8 pr-11 bg-white border border-zinc-200 rounded-md text-[12.5px] text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-zinc-400 transition-colors"
            />
            <kbd className="pointer-events-none absolute right-2 text-[10px] font-mono text-zinc-400 bg-zinc-100 border border-zinc-200 rounded px-1 py-0.2">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Scrollable Navigation + History */}
        <div className="flex-1 overflow-y-auto px-2.5 space-y-5 pb-3">
          {/* Group 1: Workspace */}
          <div className="space-y-0.5">
            <div className="px-2.5 pb-1 text-[11px] font-medium text-zinc-400">
              Workspace
            </div>

            {onNewAudit ? (
              <button
                type="button"
                onClick={() => {
                  onNewAudit();
                  onCloseMobile?.();
                }}
                className={`w-full text-left cursor-pointer ${navLinkClass(
                  pathname === "/chat" && !activeConversationId,
                )}`}
              >
                <Plus className="h-4 w-4 text-zinc-500 shrink-0" />
                <span>New Audit</span>
              </button>
            ) : (
              <Link
                href="/chat?new=1"
                onClick={onCloseMobile}
                className={navLinkClass(pathname === "/chat")}
              >
                <Plus className="h-4 w-4 text-zinc-500 shrink-0" />
                <span>New Audit</span>
              </Link>
            )}

            <Link
              href="/knowledge-base?tab=playbooks"
              onClick={onCloseMobile}
              className={navLinkClass(
                pathname === "/knowledge-base" && activeKbTab === "playbooks",
              )}
            >
              <BookOpen className="h-4 w-4 text-zinc-500 shrink-0" />
              <span>Knowledge &amp; Playbooks</span>
            </Link>

            <Link
              href="/knowledge-base?tab=products"
              onClick={onCloseMobile}
              className={navLinkClass(
                pathname === "/knowledge-base" && activeKbTab === "products",
              )}
            >
              <Percent className="h-4 w-4 text-zinc-500 shrink-0" />
              <span>Product Rate Cards</span>
            </Link>
          </div>

          {/* Group 2: Governance */}
          <div className="space-y-0.5">
            <div className="px-2.5 pb-1 text-[11px] font-medium text-zinc-400">
              Governance
            </div>

            <Link
              href="/knowledge-base?tab=rules"
              onClick={onCloseMobile}
              className={navLinkClass(
                pathname === "/knowledge-base" && activeKbTab === "rules",
              )}
            >
              <CheckSquare className="h-4 w-4 text-zinc-500 shrink-0" />
              <span>Compliance Rules</span>
            </Link>

            <Link
              href="/drift-monitors"
              onClick={onCloseMobile}
              className={navLinkClass(pathname.startsWith("/drift-monitors"))}
            >
              <Activity className="h-4 w-4 text-zinc-500 shrink-0" />
              <span>URL Drift Monitors</span>
            </Link>
          </div>

          {/* Group 3: Recent Threads (persisted across all workspace views) */}
          {(resolvedConversations.length > 0 || resolvedLoading) && (
            <div className="space-y-0.5">
              <div className="px-2.5 pb-1 text-[11px] font-medium text-zinc-400">
                Recent Threads
              </div>

              {resolvedLoading && resolvedConversations.length === 0 ? (
                <div className="px-2.5 py-2 text-[12px] text-zinc-400">
                  Loading threads...
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="px-2.5 py-2 text-[12px] text-zinc-400">
                  No matching threads
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isActive = pathname === "/chat" && conv.id === activeConversationId;
                  const isEditing = conv.id === editingId;

                  return (
                    <div
                      key={conv.id}
                      onClick={() => {
                        if (isEditing) return;
                        if (onSelectConversation) {
                          onSelectConversation(conv.id);
                        } else {
                          router.push(`/chat?conversationId=${conv.id}`);
                        }
                        onCloseMobile?.();
                      }}
                      className={`group relative flex items-center justify-between rounded-md px-2.5 py-1.5 text-[12.5px] transition-colors cursor-pointer ${
                        isActive
                          ? "bg-zinc-200/70 text-zinc-950 font-medium"
                          : "text-zinc-600 hover:bg-zinc-200/40 hover:text-zinc-950"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate flex-1 min-w-0 pr-1">
                        <MessageSquare className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        {isEditing ? (
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveRename(conv.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                            className="w-full bg-white border border-zinc-400 rounded px-1.5 py-0.5 text-[12px] text-zinc-950 focus:outline-hidden"
                          />
                        ) : (
                          <span className="truncate">{conv.title}</span>
                        )}
                      </div>

                      {isEditing ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveRename(conv.id);
                          }}
                          className="p-0.5 text-emerald-700 hover:text-emerald-900"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <div className="relative shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpenId(menuOpenId === conv.id ? null : conv.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-zinc-400 hover:text-zinc-900 transition-opacity"
                            aria-label="Thread options"
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </button>

                          {menuOpenId === conv.id && (
                            <div
                              className="absolute right-0 top-6 z-30 w-28 bg-white border border-zinc-200 rounded-md shadow-md py-1 text-[12px]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(conv.id);
                                  setEditTitle(conv.title);
                                  setMenuOpenId(null);
                                }}
                                className="w-full text-left px-2.5 py-1.5 text-zinc-700 hover:bg-zinc-100 flex items-center gap-1.5"
                              >
                                <Edit2 className="h-3 w-3" />
                                <span>Rename</span>
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  setMenuOpenId(null);
                                  await handleArchiveInternal(conv.id);
                                }}
                                className="w-full text-left px-2.5 py-1.5 text-rose-700 hover:bg-rose-50 flex items-center gap-1.5"
                              >
                                <Archive className="h-3 w-3" />
                                <span>Archive</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Rail: Monochrome Plan Card, Utility Links, Org Switcher */}
      <div className="p-3 border-t border-zinc-200 space-y-2.5 shrink-0">
        {isLoaded && isSignedIn && subSummary && (
          <div className="bg-white border border-zinc-200 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-medium text-zinc-900 truncate">
                {subSummary.planName}
              </span>
              <span className="font-mono text-[11px] bg-zinc-100 text-zinc-700 px-1.5 py-0.5 rounded shrink-0">
                {subSummary.auditLimit === -1
                  ? "Unlimited"
                  : `${subSummary.auditsUsed ?? 0}/${subSummary.auditLimit}`}
              </span>
            </div>
            <p className="text-[11.5px] text-zinc-500">
              {subSummary.isTrial
                ? `Trial ends in ${subSummary.trialDaysRemaining} days`
                : `Active ${subSummary.planName} plan`}
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1 text-[11.5px] font-medium text-zinc-900 hover:underline pt-0.5"
            >
              <span>Upgrade plan</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}

        <div className="space-y-0.5">
          <Link
            href="/settings"
            onClick={onCloseMobile}
            className={navLinkClass(pathname.startsWith("/settings"))}
          >
            <Settings className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
            <span>Settings</span>
          </Link>
        </div>

        {/* User Avatar & Name Footer (no Org icon, no email) */}
        {isLoaded && isSignedIn && (
          <div ref={userMenuRef} className="relative pt-1.5 border-t border-zinc-200">
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarFileSelected}
              className="hidden"
            />

            {userMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-zinc-200 rounded-lg shadow-lg py-1.5 z-40 text-[12px]">
                <button
                  type="button"
                  disabled={updatingAvatar}
                  onClick={() => avatarInputRef.current?.click()}
                  className="w-full text-left px-3 py-1.5 text-zinc-700 hover:bg-zinc-100 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Camera className="h-3.5 w-3.5 text-zinc-500" />
                  <span>{user?.hasImage ? "Change Photo" : "Upload Photo"}</span>
                </button>
                {user?.hasImage && (
                  <button
                    type="button"
                    disabled={updatingAvatar}
                    onClick={handleRemoveAvatar}
                    className="w-full text-left px-3 py-1.5 text-rose-700 hover:bg-rose-50 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Remove Photo</span>
                  </button>
                )}
                <div className="my-1 border-t border-zinc-100" />
                <Link
                  href="/settings?tab=profile"
                  onClick={() => {
                    setUserMenuOpen(false);
                    onCloseMobile?.();
                  }}
                  className="w-full px-3 py-1.5 text-zinc-700 hover:bg-zinc-100 flex items-center gap-2"
                >
                  <UserIcon className="h-3.5 w-3.5 text-zinc-500" />
                  <span>Profile Settings</span>
                </Link>
                <Link
                  href="/settings?tab=organization"
                  onClick={() => {
                    setUserMenuOpen(false);
                    onCloseMobile?.();
                  }}
                  className="w-full px-3 py-1.5 text-zinc-700 hover:bg-zinc-100 flex items-center gap-2"
                >
                  <Building2 className="h-3.5 w-3.5 text-zinc-500" />
                  <span>Switch Organization</span>
                </Link>
                <div className="my-1 border-t border-zinc-100" />
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    void signOut({ redirectUrl: "/sign-in" });
                  }}
                  className="w-full text-left px-3 py-1.5 text-zinc-700 hover:bg-zinc-100 flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5 text-zinc-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setUserMenuOpen((prev) => !prev)}
              className="w-full flex items-center gap-2.5 px-1.5 py-1.5 rounded-md hover:bg-zinc-200/50 transition-colors cursor-pointer text-left"
              aria-label="User profile and account options"
            >
              {user?.hasImage && user.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={displayName}
                  className="h-7 w-7 rounded-full object-cover border border-zinc-200 shrink-0"
                />
              ) : (
                <div className="h-7 w-7 rounded-full bg-zinc-900 text-white text-[11px] font-semibold flex items-center justify-center shrink-0">
                  {userInitials}
                </div>
              )}
              <span className="text-[12.5px] font-medium text-zinc-900 truncate flex-1">
                {displayName}
              </span>
              <ChevronUp
                className={`h-3.5 w-3.5 text-zinc-400 shrink-0 transition-transform ${
                  userMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>
        )}

        {isLoaded && !isSignedIn && (
          <Link
            href="/sign-in"
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-[12.5px] font-medium transition-colors"
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>Sign in</span>
          </Link>
        )}
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <div className="hidden md:block">{sidebarContent}</div>

      {/* Mobile Slide-Over Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-zinc-950/30 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 h-full">{sidebarContent}</div>
        </div>
      )}
    </>
  );
}
