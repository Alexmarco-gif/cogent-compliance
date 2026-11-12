"use client";

import React, { useState } from "react";
import {
  FileText,
  Image as ImageIcon,
  Edit2,
  CheckCircle,
  AlertCircle,
  Eye,
} from "lucide-react";
import { OcrSegmentEditor } from "./OcrSegmentEditor";

interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
  label?: string;
  confidence?: number;
}

interface Segment {
  id: string;
  segment_index: number;
  text_content: string;
  page_number?: number;
  bounding_box?: BoundingBox | null;
  source_type: string;
  metadata?: {
    confidence?: number;
    corrected_at?: string;
  };
}

export interface ExtractionData {
  id: string;
  extraction_method: string;
  extracted_text: string;
  extraction_confidence?: number;
  segments: Segment[];
}

interface Tab2Props {
  asset: {
    id: string;
    original_filename: string;
    mime_type: string;
    storage_key?: string;
  } | null;
  extraction: ExtractionData | null;
  onSegmentUpdated?: () => void;
}

export const Tab2AssetBoundingBoxes: React.FC<Tab2Props> = ({
  asset,
  extraction,
  onSegmentUpdated,
}) => {
  const [hoveredSegmentIndex, setHoveredSegmentIndex] = useState<number | null>(null);
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null);
  const segments = extraction?.segments || [];

  if (!asset) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <ImageIcon className="h-10 w-10 text-zinc-300" />
        <h4 className="mt-3 text-[15px] font-medium text-zinc-700">
          No Asset Attached to Campaign
        </h4>
        <p className="mt-1 text-[13px] text-zinc-500 max-w-sm">
          Upload a promotional flyer, social banner, or PDF contract to inspect OCR bounding boxes and verify layout provenance.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <span className="text-[12px] font-medium uppercase tracking-wider text-zinc-500">
            Multimodal Layout & OCR Provenance
          </span>
          <h3 className="text-[16px] font-semibold text-zinc-900 flex items-center gap-2 mt-0.5">
            <FileText className="h-4 w-4 text-zinc-500" />
            {asset.original_filename}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-mono uppercase bg-zinc-100 text-zinc-700 border border-zinc-200">
            {extraction?.extraction_method || "DIRECT_TEXT"}
          </span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-mono bg-blue-50 text-blue-700 border border-blue-200">
            {segments.length} Segments
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Visual Flyer Canvas Simulation with Normalized Bounding Boxes */}
        <div className="lg:col-span-6">
          <div className="sticky top-6 rounded-xl border border-zinc-200 bg-zinc-900 p-4 shadow-sm">
            <div className="flex items-center justify-between text-zinc-400 text-[12px] pb-2 border-b border-zinc-800">
              <span className="flex items-center gap-1.5 font-medium text-zinc-300">
                <Eye className="h-3.5 w-3.5 text-blue-400" />
                Flyer Canvas (Normalized 0–1000)
              </span>
              <span className="font-mono text-[11px]">SVG Overlay</span>
            </div>

            {/* Interactive Canvas Surface */}
            <div className="relative mt-3 aspect-4/5 w-full rounded-lg bg-zinc-950 overflow-hidden border border-zinc-800 flex items-center justify-center">
              {/* Flyer Background Mock Graphic */}
              <div className="absolute inset-0 p-6 flex flex-col justify-between text-zinc-200 bg-linear-to-b from-zinc-900 to-zinc-950 select-none pointer-events-none">
                <div>
                  <div className="text-[10px] font-bold tracking-widest uppercase text-blue-400">
                    FINANCIAL PROMO
                  </div>
                  <div className="mt-2 text-[20px] font-black tracking-tight text-white leading-tight">
                    QUICKCREDIT 24-HOUR ADVANCE
                  </div>
                </div>
                <div className="text-center my-auto py-8">
                  <div className="text-[32px] font-extrabold text-blue-400">
                    22% APR
                  </div>
                  <div className="text-[12px] text-zinc-400">
                    Up to ₦1,000,000 with Instant Approval
                  </div>
                </div>
                <div className="text-[8px] text-zinc-500 leading-tight">
                  Licensed by CBN. Regulated by FCCPC. T&Cs apply.
                </div>
              </div>

              {/* Bounding Box SVG Layer */}
              <svg className="absolute inset-0 h-full w-full pointer-events-none">
                {segments.map((seg, i) => {
                  const box = seg.bounding_box;
                  if (!box) return null;

                  const isHovered = hoveredSegmentIndex === i;
                  const x = (box.xmin / 1000) * 100;
                  const y = (box.ymin / 1000) * 100;
                  const width = ((box.xmax - box.xmin) / 1000) * 100;
                  const height = ((box.ymax - box.ymin) / 1000) * 100;

                  return (
                    <g key={seg.id || i}>
                      <rect
                        x={`${x}%`}
                        y={`${y}%`}
                        width={`${width}%`}
                        height={`${height}%`}
                        fill={isHovered ? "rgba(42, 75, 255, 0.25)" : "rgba(42, 75, 255, 0.1)"}
                        stroke={isHovered ? "#2A4BFF" : "rgba(59, 130, 246, 0.6)"}
                        strokeWidth={isHovered ? 2.5 : 1.5}
                        rx="4"
                      />
                      <text
                        x={`${x + 1}%`}
                        y={`${y - 1}%`}
                        fill={isHovered ? "#93C5FD" : "#60A5FA"}
                        fontSize="10"
                        fontWeight="600"
                        fontFamily="monospace"
                      >
                        #{i + 1} {box.label || "SEG"}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>

        {/* Right Column: Extracted Segment List with Confidence Badges */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between text-[12px] font-medium text-zinc-500 mb-1">
            <span>EXTRACTED LAYOUT SEGMENTS</span>
            <span>CONFIDENCE</span>
          </div>

          <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
            {segments.map((seg, i) => {
              const confidence = seg.metadata?.confidence ?? 0.92;
              const isLowConfidence = confidence < 0.8;
              const isHovered = hoveredSegmentIndex === i;

              return (
                <div
                  key={seg.id || i}
                  onMouseEnter={() => setHoveredSegmentIndex(i)}
                  onMouseLeave={() => setHoveredSegmentIndex(null)}
                  className={`rounded-xl border p-4 transition-all duration-150 ${
                    isHovered
                      ? "border-blue-500 bg-blue-50/20 shadow-xs ring-1 ring-blue-500/30"
                      : "border-zinc-200 bg-white hover:border-zinc-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-100 font-mono text-[11px] font-semibold text-zinc-700">
                        {i + 1}
                      </span>
                      {seg.bounding_box?.label && (
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] font-medium text-zinc-600">
                          {seg.bounding_box.label}
                        </span>
                      )}
                      <span className="text-[11px] font-mono text-zinc-400">
                        {seg.source_type}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          isLowConfidence
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {isLowConfidence ? (
                          <AlertCircle className="h-3 w-3" />
                        ) : (
                          <CheckCircle className="h-3 w-3" />
                        )}
                        {Math.round(confidence * 100)}%
                      </span>

                      <button
                        onClick={() => setEditingSegment(seg)}
                        className="rounded p-1 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Correct OCR Text"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="mt-2.5 text-[13.5px] leading-relaxed text-zinc-800 font-sans">
                    {seg.text_content}
                  </p>

                  {seg.metadata?.corrected_at && (
                    <div className="mt-2 text-[11px] text-blue-600 font-medium">
                      ✓ Manually corrected in compliance audit ledger
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* OCR Segment Correction Modal */}
      {editingSegment && asset && (
        <OcrSegmentEditor
          assetId={asset.id}
          segmentId={editingSegment.id}
          initialText={editingSegment.text_content}
          segmentIndex={editingSegment.segment_index}
          onSave={() => {
            setEditingSegment(null);
            onSegmentUpdated?.();
          }}
          onClose={() => setEditingSegment(null)}
        />
      )}
    </div>
  );
};
