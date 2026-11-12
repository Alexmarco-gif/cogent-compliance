"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Plus,
  MessageSquare,
  Search,
  Archive,
  MoreVertical,
  Edit2,
  Check,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import type { ConversationRecord } from "@/modules/conversations/conversation.service";

export interface ConversationSidebarProps {
  conversations: ConversationRecord[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, newTitle: string) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  loading?: boolean;
}

export function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onRename,
  onArchive,
  loading,
}: ConversationSidebarProps) {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const startRename = (conv: ConversationRecord) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
    setMenuOpenId(null);
  };

  const handleSaveRename = async (id: string) => {
    if (editTitle.trim()) {
      await onRename(id, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <aside className="w-72 bg-sidebar text-slate-300 flex flex-col h-screen border-r border-slate-800 shrink-0 select-none">
      {/* Workspace Brand Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="h-8 w-8 rounded-lg bg-brand-primary flex items-center justify-center text-white shadow-2xs">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xs font-bold uppercase tracking-wider text-white">
              Cogent Shield
            </h1>
            <p className="text-[10px] text-slate-400">Nigerian RegTech Copilot</p>
          </div>
        </div>
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-950 text-blue-300 border border-blue-800/60">
          PROD
        </span>
      </div>

      {/* New Consultation Action */}
      <div className="p-3">
        <button
          onClick={onNew}
          className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg bg-brand-primary hover:bg-brand-hover text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>New Consultation</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="h-3.5 w-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search consultations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-brand-primary transition-colors"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
        {loading && conversations.length === 0 && (
          <div className="py-8 text-center text-xs text-slate-500">
            Loading consultations...
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="py-8 text-center text-xs text-slate-500">
            No consultations found
          </div>
        )}

        {filtered.map((conv) => {
          const isActive = conv.id === activeId;
          const isEditing = conv.id === editingId;

          return (
            <div
              key={conv.id}
              className={`group relative flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors cursor-pointer ${
                isActive
                  ? "bg-slate-800 text-white font-medium shadow-2xs"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              }`}
              onClick={() => !isEditing && onSelect(conv.id)}
            >
              <div className="flex items-center space-x-2 truncate flex-1 min-w-0 pr-2">
                <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-brand-primary" : "text-slate-500"}`} />
                {isEditing ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveRename(conv.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    autoFocus
                    className="w-full bg-slate-900 border border-brand-primary rounded px-1.5 py-0.5 text-xs text-white focus:outline-hidden"
                  />
                ) : (
                  <span className="truncate">{conv.title}</span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="shrink-0 flex items-center space-x-1">
                {isEditing ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveRename(conv.id);
                    }}
                    className="p-1 hover:text-white"
                  >
                    <Check className="h-3 w-3 text-emerald-400" />
                  </button>
                ) : (
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(menuOpenId === conv.id ? null : conv.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-white transition-opacity"
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </button>

                    {menuOpenId === conv.id && (
                      <div
                        className="absolute right-0 top-6 z-20 w-28 bg-slate-900 border border-slate-700 rounded-md shadow-lg py-1 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => startRename(conv)}
                          className="w-full text-left px-2.5 py-1 text-slate-300 hover:bg-slate-800 flex items-center space-x-1.5"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>Rename</span>
                        </button>
                        <button
                          onClick={async () => {
                            setMenuOpenId(null);
                            await onArchive(conv.id);
                          }}
                          className="w-full text-left px-2.5 py-1 text-red-400 hover:bg-slate-800 flex items-center space-x-1.5"
                        >
                          <Archive className="h-3 w-3" />
                          <span>Archive</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-slate-800/80 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center space-x-2">
          <UserButton />
          <div className="text-left">
            <p className="text-xs font-semibold text-white">Compliance Member</p>
            <p className="text-[10px] text-slate-500">Regulated Financial Institution</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
