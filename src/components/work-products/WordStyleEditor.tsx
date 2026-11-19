"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { TableKit } from "@tiptap/extension-table";
import { Markdown } from "@tiptap/markdown";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Redo2,
  Strikethrough,
  Table2,
  Underline as UnderlineIcon,
  Undo2,
  Plus,
  Trash2,
} from "lucide-react";

export interface WordStyleEditorProps {
  markdown: string;
  onChange?: (nextMarkdown: string) => void;
  readOnly?: boolean;
  documentKey?: string;
}

export function WordStyleEditor({
  markdown,
  onChange,
  readOnly = false,
  documentKey = "default",
}: WordStyleEditorProps) {
  const [fontStyle, setFontStyle] = useState<"sans" | "serif">("sans");
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [linkUrlInput, setLinkUrlInput] = useState("");
  const lastEmittedMarkdownRef = useRef<string>(markdown);
  const lastEditorMarkdownRef = useRef<string | null>(null);
  const lastDocumentKeyRef = useRef<string>(documentKey);
  const isSyncingFromPropRef = useRef<boolean>(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const readOnlyRef = useRef(readOnly);
  readOnlyRef.current = readOnly;

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: {
            rel: "noopener noreferrer",
            target: "_blank",
          },
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      TableKit.configure({
        table: { resizable: false },
      }),
      Markdown,
    ],
    [],
  );

  const editor = useEditor({
    immediatelyRender: false,
    editable: !readOnly,
    extensions,
    content: markdown,
    contentType: "markdown",
    onCreate: ({ editor: ed }) => {
      try {
        lastEditorMarkdownRef.current = ed.getMarkdown();
      } catch {
        lastEditorMarkdownRef.current = null;
      }
    },
    onUpdate: ({ editor: ed, transaction }) => {
      if (isSyncingFromPropRef.current || readOnlyRef.current) return;
      if (!transaction?.docChanged) return;
      try {
        const nextMd = ed.getMarkdown();
        if (lastEditorMarkdownRef.current !== null && nextMd === lastEditorMarkdownRef.current) {
          return;
        }
        lastEditorMarkdownRef.current = nextMd;
        lastEmittedMarkdownRef.current = nextMd;
        onChangeRef.current?.(nextMd);
      } catch {
        // Fallback to plain text if serialization throws on intermediate edits
      }
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.isEditable !== !readOnly) {
      editor.setEditable(!readOnly, false);
    }
  }, [editor, readOnly]);

  useEffect(() => {
    if (!editor) return;
    const keyChanged = lastDocumentKeyRef.current !== documentKey;
    const externalChange = markdown !== lastEmittedMarkdownRef.current;

    if (keyChanged || externalChange) {
      lastDocumentKeyRef.current = documentKey;
      lastEmittedMarkdownRef.current = markdown;
      isSyncingFromPropRef.current = true;
      try {
        editor.commands.setContent(markdown, { contentType: "markdown", emitUpdate: false });
        try {
          lastEditorMarkdownRef.current = editor.getMarkdown();
        } catch {
          lastEditorMarkdownRef.current = null;
        }
      } finally {
        isSyncingFromPropRef.current = false;
      }
    }
  }, [editor, markdown, documentKey]);

  if (!editor) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 min-h-[420px] animate-pulse" />
    );
  }

  const currentBlockValue = editor.isActive("heading", { level: 1 })
    ? "h1"
    : editor.isActive("heading", { level: 2 })
      ? "h2"
      : editor.isActive("heading", { level: 3 })
        ? "h3"
        : editor.isActive("blockquote")
          ? "blockquote"
          : "paragraph";

  const handleBlockStyleChange = (val: string) => {
    const chain = editor.chain().focus();
    if (val === "h1") chain.toggleHeading({ level: 1 }).run();
    else if (val === "h2") chain.toggleHeading({ level: 2 }).run();
    else if (val === "h3") chain.toggleHeading({ level: 3 }).run();
    else if (val === "blockquote") chain.toggleBlockquote().run();
    else chain.setParagraph().run();
  };

  const applyLink = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = linkUrlInput.trim();
    if (!trimmed) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
      editor.chain().focus().extendMarkRange("link").setLink({ href: normalized }).run();
    }
    setLinkPopoverOpen(false);
    setLinkUrlInput("");
  };

  const isInsideTable = editor.isActive("table");

  return (
    <div className="space-y-3">
      {/* Top Word-Style Rich Formatting Ribbon (matches uiq.jpg) */}
      {!readOnly && (
        <div className="sticky top-0 z-20 rounded-xl border border-zinc-200 bg-white/95 backdrop-blur-xs px-2.5 py-1.5 shadow-xs flex flex-wrap items-center gap-1">
          {/* Font Family Selector */}
          <select
            aria-label="Document typography style"
            value={fontStyle}
            onChange={(e) => setFontStyle(e.target.value as "sans" | "serif")}
            className="h-7 rounded-md border border-zinc-200 bg-zinc-50 px-2 text-[12px] font-medium text-zinc-800 outline-none focus:outline-none focus-visible:outline-none cursor-pointer"
          >
            <option value="sans">Inter Sans</option>
            <option value="serif">Editorial Serif</option>
          </select>

          {/* Block / Heading Level Selector */}
          <select
            aria-label="Paragraph and heading style"
            value={currentBlockValue}
            onChange={(e) => handleBlockStyleChange(e.target.value)}
            className="h-7 rounded-md border border-zinc-200 bg-zinc-50 px-2 text-[12px] font-medium text-zinc-800 outline-none focus:outline-none focus-visible:outline-none cursor-pointer"
          >
            <option value="paragraph">Normal text</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="blockquote">Callout quote</option>
          </select>

          <span className="h-4 w-px bg-zinc-200 mx-0.5" aria-hidden="true" />

          {/* Text Marks: Bold, Italic, Underline, Redline Strike */}
          <button
            type="button"
            title="Bold (Ctrl/Cmd+B)"
            aria-label="Bold"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`h-7 w-7 inline-flex items-center justify-center rounded-md text-zinc-700 cursor-pointer transition-colors ${
              editor.isActive("bold")
                ? "bg-zinc-900 text-white"
                : "hover:bg-zinc-100"
            }`}
          >
            <Bold className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            title="Italic (Ctrl/Cmd+I)"
            aria-label="Italic"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`h-7 w-7 inline-flex items-center justify-center rounded-md text-zinc-700 cursor-pointer transition-colors ${
              editor.isActive("italic")
                ? "bg-zinc-900 text-white"
                : "hover:bg-zinc-100"
            }`}
          >
            <Italic className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            title="Underline (Ctrl/Cmd+U)"
            aria-label="Underline"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`h-7 w-7 inline-flex items-center justify-center rounded-md text-zinc-700 cursor-pointer transition-colors ${
              editor.isActive("underline")
                ? "bg-zinc-900 text-white"
                : "hover:bg-zinc-100"
            }`}
          >
            <UnderlineIcon className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            title="Strikethrough / Redline deletion"
            aria-label="Strikethrough"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`h-7 w-7 inline-flex items-center justify-center rounded-md text-zinc-700 cursor-pointer transition-colors ${
              editor.isActive("strike")
                ? "bg-rose-700 text-white"
                : "hover:bg-zinc-100"
            }`}
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </button>

          <span className="h-4 w-px bg-zinc-200 mx-0.5" aria-hidden="true" />

          {/* Text Alignment */}
          <button
            type="button"
            title="Align left"
            aria-label="Align left"
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            className={`h-7 w-7 inline-flex items-center justify-center rounded-md text-zinc-700 cursor-pointer transition-colors ${
              editor.isActive({ textAlign: "left" })
                ? "bg-zinc-200 text-zinc-950"
                : "hover:bg-zinc-100"
            }`}
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Align center"
            aria-label="Align center"
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            className={`h-7 w-7 inline-flex items-center justify-center rounded-md text-zinc-700 cursor-pointer transition-colors ${
              editor.isActive({ textAlign: "center" })
                ? "bg-zinc-200 text-zinc-950"
                : "hover:bg-zinc-100"
            }`}
          >
            <AlignCenter className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Align right"
            aria-label="Align right"
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            className={`h-7 w-7 inline-flex items-center justify-center rounded-md text-zinc-700 cursor-pointer transition-colors ${
              editor.isActive({ textAlign: "right" })
                ? "bg-zinc-200 text-zinc-950"
                : "hover:bg-zinc-100"
            }`}
          >
            <AlignRight className="h-3.5 w-3.5" />
          </button>

          <span className="h-4 w-px bg-zinc-200 mx-0.5" aria-hidden="true" />

          {/* Lists & Tables & Links */}
          <button
            type="button"
            title="Bulleted list"
            aria-label="Bulleted list"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`h-7 w-7 inline-flex items-center justify-center rounded-md text-zinc-700 cursor-pointer transition-colors ${
              editor.isActive("bulletList")
                ? "bg-zinc-900 text-white"
                : "hover:bg-zinc-100"
            }`}
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Numbered list"
            aria-label="Numbered list"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`h-7 w-7 inline-flex items-center justify-center rounded-md text-zinc-700 cursor-pointer transition-colors ${
              editor.isActive("orderedList")
                ? "bg-zinc-900 text-white"
                : "hover:bg-zinc-100"
            }`}
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            title="Insert 3×3 regulatory comparison table"
            aria-label="Insert table"
            onClick={() =>
              editor
                .chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run()
            }
            className={`h-7 w-7 inline-flex items-center justify-center rounded-md text-zinc-700 cursor-pointer transition-colors ${
              isInsideTable ? "bg-zinc-200 text-zinc-950" : "hover:bg-zinc-100"
            }`}
          >
            <Table2 className="h-3.5 w-3.5" />
          </button>

          {isInsideTable && (
            <div className="inline-flex items-center gap-0.5 rounded-md border border-zinc-200 bg-zinc-50 px-1 py-0.5 text-[10.5px]">
              <button
                type="button"
                onClick={() => editor.chain().focus().addRowAfter().run()}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-zinc-200 text-zinc-700 cursor-pointer"
                title="Add table row"
              >
                <Plus className="h-2.5 w-2.5" />
                <span>Row</span>
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().addColumnAfter().run()}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-zinc-200 text-zinc-700 cursor-pointer"
                title="Add table column"
              >
                <Plus className="h-2.5 w-2.5" />
                <span>Col</span>
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().deleteTable().run()}
                className="p-0.5 rounded hover:bg-rose-100 text-rose-600 cursor-pointer"
                title="Delete table"
                aria-label="Delete table"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )}

          <div className="relative">
            <button
              type="button"
              title="Insert or edit hyperlink"
              aria-label="Insert hyperlink"
              onClick={() => {
                const existingHref = editor.getAttributes("link").href || "";
                setLinkUrlInput(existingHref);
                setLinkPopoverOpen((prev) => !prev);
              }}
              className={`h-7 w-7 inline-flex items-center justify-center rounded-md text-zinc-700 cursor-pointer transition-colors ${
                editor.isActive("link") ? "bg-zinc-900 text-white" : "hover:bg-zinc-100"
              }`}
            >
              <Link2 className="h-3.5 w-3.5" />
            </button>

            {linkPopoverOpen && (
              <form
                onSubmit={applyLink}
                className="absolute left-0 top-full mt-1.5 z-40 flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white p-1.5 shadow-lg w-[260px]"
              >
                <input
                  type="text"
                  value={linkUrlInput}
                  onChange={(e) => setLinkUrlInput(e.target.value)}
                  placeholder="https://cbn.gov.ng/..."
                  className="flex-1 min-w-0 rounded border border-zinc-200 px-2 py-1 text-[12px] text-zinc-900 outline-none focus:outline-none focus-visible:outline-none focus:border-zinc-900"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-2 py-1 rounded bg-zinc-900 text-white text-[11.5px] font-medium cursor-pointer"
                >
                  Apply
                </button>
              </form>
            )}
          </div>

          <span className="h-4 w-px bg-zinc-200 mx-0.5" aria-hidden="true" />

          {/* Undo / Redo */}
          <button
            type="button"
            title="Undo (Ctrl/Cmd+Z)"
            aria-label="Undo"
            disabled={!editor.can().undo()}
            onClick={() => editor.chain().focus().undo().run()}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-zinc-700 hover:bg-zinc-100 disabled:opacity-35 cursor-pointer"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Redo (Ctrl/Cmd+Shift+Z)"
            aria-label="Redo"
            disabled={!editor.can().redo()}
            onClick={() => editor.chain().focus().redo().run()}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-zinc-700 hover:bg-zinc-100 disabled:opacity-35 cursor-pointer"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Floating Selection Bubble Menu (matches uiq.jpg) */}
      {!readOnly && (
        <BubbleMenu
          editor={editor}
          className="flex items-center gap-0.5 rounded-lg border border-zinc-200 bg-white px-1.5 py-1 shadow-lg"
        >
          <button
            type="button"
            aria-label="Selection bold"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`h-7 w-7 inline-flex items-center justify-center rounded text-zinc-700 cursor-pointer ${
              editor.isActive("bold") ? "bg-zinc-900 text-white" : "hover:bg-zinc-100"
            }`}
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Selection italic"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`h-7 w-7 inline-flex items-center justify-center rounded text-zinc-700 cursor-pointer ${
              editor.isActive("italic") ? "bg-zinc-900 text-white" : "hover:bg-zinc-100"
            }`}
          >
            <Italic className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Selection underline"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`h-7 w-7 inline-flex items-center justify-center rounded text-zinc-700 cursor-pointer ${
              editor.isActive("underline") ? "bg-zinc-900 text-white" : "hover:bg-zinc-100"
            }`}
          >
            <UnderlineIcon className="h-3.5 w-3.5" />
          </button>
          <span className="h-4 w-px bg-zinc-200 mx-0.5" aria-hidden="true" />
          <button
            type="button"
            aria-label="Selection align left"
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            className={`h-7 w-7 inline-flex items-center justify-center rounded text-zinc-700 cursor-pointer ${
              editor.isActive({ textAlign: "left" })
                ? "bg-zinc-200 text-zinc-950"
                : "hover:bg-zinc-100"
            }`}
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Selection align center"
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            className={`h-7 w-7 inline-flex items-center justify-center rounded text-zinc-700 cursor-pointer ${
              editor.isActive({ textAlign: "center" })
                ? "bg-zinc-200 text-zinc-950"
                : "hover:bg-zinc-100"
            }`}
          >
            <AlignCenter className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Selection align right"
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            className={`h-7 w-7 inline-flex items-center justify-center rounded text-zinc-700 cursor-pointer ${
              editor.isActive({ textAlign: "right" })
                ? "bg-zinc-200 text-zinc-950"
                : "hover:bg-zinc-100"
            }`}
          >
            <AlignRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Selection link"
            onClick={() => {
              const existingHref = editor.getAttributes("link").href || "";
              setLinkUrlInput(existingHref);
              setLinkPopoverOpen(true);
            }}
            className={`h-7 w-7 inline-flex items-center justify-center rounded text-zinc-700 cursor-pointer ${
              editor.isActive("link") ? "bg-zinc-900 text-white" : "hover:bg-zinc-100"
            }`}
          >
            <Link2 className="h-3.5 w-3.5" />
          </button>
        </BubbleMenu>
      )}

      {/* A4 Editorial Document Page Canvas */}
      <div
        className={`cogent-doc-editor rounded-2xl border border-zinc-200/90 bg-white px-6 py-6 sm:px-8 sm:py-7 shadow-[0_1px_4px_rgba(9,9,11,0.04)] ${
          fontStyle === "serif" ? "font-serif" : "font-sans"
        }`}
      >
        <EditorContent editor={editor} aria-label="Word-style compliance document editor" />
      </div>
    </div>
  );
}
