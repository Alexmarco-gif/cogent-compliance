"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Search,
  Bell,
  FolderKanban,
  FileSpreadsheet,
  Globe,
  Plus,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Sparkles,
  ArrowRight,
  X,
} from "lucide-react";
import {
  HERO_BOARD_CARDS,
  BOARD_HOTSPOTS,
  type BoardCampaignCard,
  type BoardLane,
} from "@/data/marketing-scenarios";
import { CogentMark } from "@/components/brand/CogentLogo";

const LANES: Array<{ key: BoardLane; label: string; dotColor: string }> = [
  { key: "submitted", label: "Needs Review", dotColor: "bg-amber-500" },
  { key: "review", label: "Legal / CCO Queue", dotColor: "bg-[#1D63ED]" },
  { key: "cleared", label: "Cleared to Launch", dotColor: "bg-emerald-500" },
];

export function HeroProductBoard() {
  const [selectedCardId, setSelectedCardId] = useState<string>("card-quickcash");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [appliedFixes, setAppliedFixes] = useState<Record<string, boolean>>({});
  const [channelFilter, setChannelFilter] = useState<string>("All");
  const [activeHotspot, setActiveHotspot] = useState<number>(3);

  const selectedCard: BoardCampaignCard =
    HERO_BOARD_CARDS.find((c) => c.id === selectedCardId) ?? HERO_BOARD_CARDS[0]!;

  const channels = ["All", "Loan Flyer", "Landing Page", "App Listing", "Social Ad"];

  const filteredCards =
    channelFilter === "All"
      ? HERO_BOARD_CARDS
      : HERO_BOARD_CARDS.filter((c) => c.channel === channelFilter);

  const handleCardSelect = (card: BoardCampaignCard) => {
    setSelectedCardId(card.id);
    setDrawerOpen(true);
  };

  const handleApplyFix = (id: string) => {
    setAppliedFixes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleHotspotFocus = (hotspotNumber: number, targetCardId?: string) => {
    setActiveHotspot(hotspotNumber);
    if (targetCardId) {
      setSelectedCardId(targetCardId);
      setDrawerOpen(true);
    }
  };

  return (
    <div className="mt-12 sm:mt-14 text-left">
      {/* Crisp Browser Frame Matching Reference 1.png & a65edf */}
      <div className="relative mx-auto max-w-[1080px] rounded-[24px] border border-slate-200/90 bg-white cogent-browser-shadow overflow-hidden">
        {/* Browser Chrome Strip */}
        <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-50/90 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-4 py-1 text-[11px] font-medium text-slate-500 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>stem-cogent.com/workspace</span>
          </div>
          <div className="hidden sm:block text-[11px] font-medium text-slate-400">
            Interactive Preview
          </div>
        </div>

        {/* Workspace Shell */}
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[470px] bg-[#FAFBFD]">
          {/* Left Workspace Sidebar (Hotspot #1) */}
          <aside className="relative hidden lg:flex lg:col-span-3 flex-col justify-between border-r border-slate-200/80 bg-white p-4">
            <div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#1D63ED] text-white">
                    <CogentMark className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[12.5px] font-semibold text-slate-950">
                    Kuda / MFB Demo
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-slate-400">CBN</span>
              </div>

              <div className="mt-4 space-y-1 text-[12.5px]">
                <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-slate-500">
                  <Search className="h-3.5 w-3.5" />
                  <span>Quick Search</span>
                </div>
                <div className="flex items-center justify-between rounded-lg px-2.5 py-2 text-slate-500">
                  <span className="flex items-center gap-2.5">
                    <Bell className="h-3.5 w-3.5" />
                    <span>Rule Alerts</span>
                  </span>
                  <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-[#1D63ED]">
                    2
                  </span>
                </div>
                <div
                  className={`relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-semibold transition-colors ${
                    activeHotspot === 1
                      ? "bg-blue-50 text-[#1D63ED]"
                      : "bg-slate-100 text-slate-950"
                  }`}
                >
                  <FolderKanban className="h-3.5 w-3.5" />
                  <span>Active Campaigns</span>
                  {/* Hotspot Pin 1 */}
                  <button
                    type="button"
                    onClick={() => handleHotspotFocus(1)}
                    aria-label="Hotspot 1 Workspace sidebar"
                    className={`ml-auto flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-transform cursor-pointer ${
                      activeHotspot === 1
                        ? "bg-[#1D63ED] text-white scale-110 animate-cogent-pulse-ring"
                        : "bg-[#1D63ED]/90 text-white hover:scale-110"
                    }`}
                  >
                    1
                  </button>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-slate-500">
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>Approved Rate Cards</span>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-slate-500">
                  <Globe className="h-3.5 w-3.5" />
                  <span>Live Page Watchers</span>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-4">
                <p className="px-2 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
                  Product Lines
                </p>
                <div className="mt-2 space-y-1 text-[12px] text-slate-600">
                  <div className="rounded-lg px-2.5 py-1.5 font-medium text-slate-800 bg-slate-50">
                    QuickCash Salary Loan
                  </div>
                  <div className="rounded-lg px-2.5 py-1.5">Fixed Deposit Savings</div>
                  <div className="rounded-lg px-2.5 py-1.5">SME Working Capital</div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-[11.5px] text-slate-700">
              <p className="font-semibold text-slate-900">Click any campaign card</p>
              <p className="mt-0.5 text-slate-500">
                Inspect flagged lines and preview the clean compliant fix.
              </p>
            </div>
          </aside>

          {/* Main Interactive Board */}
          <div className="lg:col-span-9 flex flex-col p-4 sm:p-5 relative">
            {/* Top Workspace Toolbar (Hotspots #2 and #6) */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12.5px] font-semibold text-slate-900">
                  Campaign Board
                </span>
                <span className="text-slate-300">/</span>

                {/* Channel Filter Strip (Hotspot #2) */}
                <div className="relative flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
                  <Filter className="ml-1.5 mr-1 h-3 w-3 text-slate-400" />
                  {channels.map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setChannelFilter(ch)}
                      className={`rounded-lg px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                        channelFilter === ch
                          ? "bg-[#1D63ED] text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {ch}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleHotspotFocus(2)}
                    aria-label="Hotspot 2 Filter by channel"
                    className={`ml-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-transform cursor-pointer ${
                      activeHotspot === 2
                        ? "bg-[#1D63ED] text-white scale-110 animate-cogent-pulse-ring"
                        : "bg-[#1D63ED]/90 text-white hover:scale-110"
                    }`}
                  >
                    2
                  </button>
                </div>
              </div>

              {/* Right Toolbar Action (Hotspot #6) */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleHotspotFocus(6, "card-playstore")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#1D63ED] px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm shadow-blue-600/20 hover:bg-[#1552CC] transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Check Campaign</span>
                  <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9.5px] font-bold text-[#1D63ED]">
                    6
                  </span>
                </button>
              </div>
            </div>

            {/* 3 Status Columns (Hotspot #3) */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3.5 flex-1">
              {LANES.map((lane, laneIdx) => {
                const cards = filteredCards.filter((c) => {
                  if (appliedFixes[c.id]) {
                    return lane.key === "cleared";
                  }
                  return c.lane === lane.key;
                });

                return (
                  <div
                    key={lane.key}
                    className={`flex flex-col rounded-2xl border p-3 transition-colors ${
                      activeHotspot === 3 && laneIdx === 1
                        ? "border-blue-300 bg-blue-50/40"
                        : "border-slate-200/75 bg-white/80"
                    }`}
                  >
                    <div className="mb-3 flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${lane.dotColor}`} />
                        <span className="text-[12px] font-semibold text-slate-900">
                          {lane.label}
                        </span>
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-slate-600 tabular-nums">
                          {cards.length}
                        </span>
                      </div>
                      {laneIdx === 1 && (
                        <button
                          type="button"
                          onClick={() => handleHotspotFocus(3)}
                          aria-label="Hotspot 3 Clear status lanes"
                          className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-transform cursor-pointer ${
                            activeHotspot === 3
                              ? "bg-[#1D63ED] text-white scale-110 animate-cogent-pulse-ring"
                              : "bg-[#1D63ED]/90 text-white hover:scale-110"
                          }`}
                        >
                          3
                        </button>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      {cards.map((card) => {
                        const fixed = Boolean(appliedFixes[card.id]);
                        const isSelected = card.id === selectedCard.id && drawerOpen;

                        return (
                          <button
                            key={card.id}
                            type="button"
                            onClick={() => handleCardSelect(card)}
                            className={`w-full text-left rounded-xl border p-3 transition-all duration-200 cursor-pointer relative group ${
                              isSelected
                                ? "border-[#1D63ED] bg-blue-50/40 shadow-md shadow-blue-600/10"
                                : "border-slate-200/90 bg-white hover:border-blue-300 hover:shadow-sm"
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10.5px] text-slate-400">
                              <span className="font-mono">{card.code}</span>
                              <span>{fixed ? "Cleared just now" : card.updatedAt}</span>
                            </div>

                            <p className="mt-1.5 text-[13px] font-semibold text-slate-950 leading-snug group-hover:text-[#1D63ED] transition-colors">
                              {card.title}
                            </p>

                            {/* Smart Rule Tags (Hotspot #4) */}
                            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10.5px] font-medium text-slate-700">
                                {card.channel}
                              </span>
                              <span
                                className={`rounded-md px-2 py-0.5 text-[10.5px] font-semibold ${
                                  fixed || card.lane === "cleared"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : card.lane === "submitted"
                                      ? "bg-rose-50 text-rose-700"
                                      : "bg-blue-50 text-[#1D63ED]"
                                }`}
                              >
                                {fixed ? "Clean Fix Applied" : card.statusLabel}
                              </span>
                              {card.id === "card-quickcash" && !fixed && (
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleHotspotFocus(4, card.id);
                                  }}
                                  className={`ml-auto flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                                    activeHotspot === 4
                                      ? "bg-[#1D63ED] text-white scale-110"
                                      : "bg-[#1D63ED]/85 text-white"
                                  }`}
                                >
                                  4
                                </span>
                              )}
                            </div>

                            {/* Progress & Owner Footer (Hotspot #5) */}
                            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                              <span className="inline-flex items-center gap-1">
                                {fixed || card.lane === "cleared" ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                ) : card.lane === "submitted" ? (
                                  <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                                ) : (
                                  <Clock3 className="h-3.5 w-3.5 text-[#1D63ED]" />
                                )}
                                <span className="tabular-nums">
                                  {fixed ? "5/5 checks" : `${card.checksDone}/${card.checksTotal} checks`}
                                </span>
                              </span>

                              <div className="flex items-center gap-1.5">
                                {card.id === "card-deposit" && (
                                  <span
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleHotspotFocus(5, card.id);
                                    }}
                                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                                      activeHotspot === 5
                                        ? "bg-[#1D63ED] text-white scale-110"
                                        : "bg-[#1D63ED]/85 text-white"
                                    }`}
                                  >
                                    5
                                  </span>
                                )}
                                <span
                                  title={card.ownerRole}
                                  className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[9.5px] font-semibold text-white"
                                >
                                  {card.ownerInitials}
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Interactive Slide-Up Check Inspector when a card is clicked */}
            {drawerOpen && (
              <div className="mt-4 rounded-2xl border border-blue-200 bg-white p-4 sm:p-5 shadow-lg shadow-blue-900/5 animate-cogent-enter">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[#1D63ED] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                        {selectedCard.channel}
                      </span>
                      <span className="text-[11.5px] text-slate-400">
                        {selectedCard.ruleCited}
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-[15px] font-semibold text-slate-950">
                      {selectedCard.title}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    aria-label="Close card preview"
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3.5 grid grid-cols-1 gap-3.5 lg:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      What Cogent Spotted
                    </p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-slate-700">
                      {selectedCard.flaggedIssue}
                    </p>
                    <p className="mt-2.5 text-[12px] text-slate-500">
                      <span className="font-semibold text-slate-800">Draft text: </span>
                      &ldquo;{selectedCard.originalCopy}&rdquo;
                    </p>
                  </div>

                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Ready-to-Publish Alternative</span>
                      </div>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-slate-900 font-medium">
                        &ldquo;{selectedCard.cleanRewrite}&rdquo;
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-200/60">
                      <button
                        type="button"
                        onClick={() => handleApplyFix(selectedCard.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D63ED] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#1552CC] transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>
                          {appliedFixes[selectedCard.id]
                            ? "Move Back to Review"
                            : "Apply Clean Fix & Clear"}
                        </span>
                      </button>

                      <Link
                        href="/sign-up"
                        className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#1D63ED] hover:underline"
                      >
                        <span>Check your own ad</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6 Numbered Interactive Legend Items Directly Matching Reference a65edf */}
      <div className="mx-auto mt-8 grid max-w-[1040px] grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3 px-2">
        {BOARD_HOTSPOTS.map((spot) => {
          const active = activeHotspot === spot.number;
          return (
            <button
              key={spot.number}
              type="button"
              onClick={() => handleHotspotFocus(spot.number, spot.targetCardId)}
              onMouseEnter={() => setActiveHotspot(spot.number)}
              className={`group flex items-start gap-3 rounded-2xl p-3 text-left transition-all cursor-pointer ${
                active
                  ? "bg-blue-50/70 ring-1 ring-blue-200"
                  : "hover:bg-slate-50"
              }`}
            >
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11.5px] font-bold transition-colors ${
                  active
                    ? "bg-[#1D63ED] text-white"
                    : "bg-blue-100 text-[#1D63ED] group-hover:bg-[#1D63ED] group-hover:text-white"
                }`}
              >
                {spot.number}
              </span>
              <div>
                <p className="text-[14px] font-semibold text-slate-950">{spot.title}</p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-slate-600">
                  {spot.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
