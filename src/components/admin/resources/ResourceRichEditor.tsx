"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import { Markdown } from "@tiptap/markdown";
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Quote,
  Redo2,
  Strikethrough,
  Table2,
  Undo2,
  Upload,
} from "lucide-react";

export interface ResourceRichEditorProps {
  markdown: string;
  onChange: (nextMarkdown: string) => void;
  documentKey: string;
  r2Configured: boolean;
  onUploadImage: (file: File) => Promise<string>;
}

export function ResourceRichEditor({
  markdown,
  onChange,
  documentKey,
  r2Configured,
  onUploadImage,
}: ResourceRichEditorProps) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [imageOpen, setImageOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastEmittedRef = useRef<string>(markdown);
  const lastEditorMdRef = useRef<string | null>(null);
  const lastDocKeyRef = useRef<string>(documentKey);
  const isSyncingRef = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

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
      ImageExtension.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: "my-4 max-h-[480px] w-auto rounded-lg border border-slate-200 object-contain",
        },
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
    extensions,
    content: markdown,
    contentType: "markdown",
    editorProps: {
      attributes: {
        class:
          "prose prose-slate max-w-none min-h-[380px] px-5 py-4 focus:outline-none text-[15px] leading-[1.7] text-[#0B1220] [&_h1]:text-[26px] [&_h1]:font-semibold [&_h1]:tracking-tight [&_h2]:text-[21px] [&_h2]:font-semibold [&_h2]:mt-6 [&_h3]:text-[17px] [&_h3]:font-semibold [&_blockquote]:border-l-2 [&_blockquote]:border-[#1D4ED8] [&_blockquote]:pl-4 [&_blockquote]:text-slate-600 [&_a]:text-[#1D4ED8] [&_a]:underline [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-slate-200 [&_th]:bg-slate-50 [&_th]:px-3 [&_th]:py-2 [&_td]:border [&_td]:border-slate-200 [&_td]:px-3 [&_td]:py-2",
      },
    },
    onCreate: ({ editor: ed }) => {
      try {
        lastEditorMdRef.current = ed.getMarkdown();
      } catch {
        lastEditorMdRef.current = null;
      }
    },
    onUpdate: ({ editor: ed, transaction }) => {
      if (isSyncingRef.current || !transaction?.docChanged) return;
      try {
        const nextMd = ed.getMarkdown();
        if (lastEditorMdRef.current !== null && nextMd === lastEditorMdRef.current) return;
        lastEditorMdRef.current = nextMd;
        lastEmittedRef.current = nextMd;
        onChangeRef.current(nextMd);
      } catch {
        // Ignore transient parse states during typing
      }
    },
  });

  useEffect(() => {
    if (!editor) return;
    const keyChanged = lastDocKeyRef.current !== documentKey;
    const externalChange = markdown !== lastEmittedRef.current;

    if (keyChanged || externalChange) {
      lastDocKeyRef.current = documentKey;
      lastEmittedRef.current = markdown;
      isSyncingRef.current = true;
      try {
        editor.commands.setContent(markdown, { contentType: "markdown" });
        lastEditorMdRef.current = editor.getMarkdown();
      } catch {
        // Ignore fallback
      } finally {
        isSyncingRef.current = false;
      }
    }
  }, [editor, markdown, documentKey]);

  const applyLink = () => {
    if (!editor) return;
    const trimmed = linkUrl.trim();
    if (!trimmed) {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: trimmed }).run();
    }
    setLinkUrl("");
    setLinkOpen(false);
  };

  const insertImageByUrl = () => {
    if (!editor) return;
    const trimmed = imageUrl.trim();
    if (!trimmed) return;
    editor
      .chain()
      .focus()
      .setImage({ src: trimmed, alt: imageAlt.trim() || "Cogent resource image" })
      .run();
    setImageUrl("");
    setImageAlt("");
    setImageError(null);
    setImageOpen(false);
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    setImageError(null);
    setUploadingImage(true);
    try {
      const uploadedUrl = await onUploadImage(file);
      editor
        .chain()
        .focus()
        .setImage({
          src: uploadedUrl,
          alt: imageAlt.trim() || file.name.replace(/\.[^.]+$/, ""),
        })
        .run();
      setImageAlt("");
      setImageOpen(false);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!editor) {
    return (
      <div className="min-h-[420px] rounded-xl border border-slate-200 bg-slate-50/50 p-6 text-sm text-slate-500">
        Loading editorial composer...
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50/80 px-3 py-2">
        <ToolbarButton
          active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <span className="mx-1 h-4 w-px bg-slate-200" />

        <ToolbarButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>

        <span className="mx-1 h-4 w-px bg-slate-200" />

        <ToolbarButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet list"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered list"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Quote / Callout"
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>

        <span className="mx-1 h-4 w-px bg-slate-200" />

        <ToolbarButton
          active={editor.isActive("link") || linkOpen}
          onClick={() => {
            setImageOpen(false);
            setLinkUrl(editor.getAttributes("link").href || "");
            setLinkOpen((prev) => !prev);
          }}
          title="Insert link"
        >
          <Link2 className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          active={imageOpen}
          onClick={() => {
            setLinkOpen(false);
            setImageError(null);
            setImageOpen((prev) => !prev);
          }}
          title="Insert image (URL or R2 Upload)"
        >
          <ImagePlus className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          active={false}
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
          title="Insert 3x3 table"
        >
          <Table2 className="h-4 w-4" />
        </ToolbarButton>

        <div className="ml-auto flex items-center gap-1">
          <ToolbarButton
            active={false}
            onClick={() => editor.chain().focus().undo().run()}
            title="Undo"
          >
            <Undo2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            active={false}
            onClick={() => editor.chain().focus().redo().run()}
            title="Redo"
          >
            <Redo2 className="h-4 w-4" />
          </ToolbarButton>
        </div>
      </div>

      {/* Link Popover */}
      {linkOpen && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://..."
            className="flex-1 min-w-[220px] rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[13px] focus:border-[#1D4ED8] focus:outline-none"
          />
          <button
            type="button"
            onClick={applyLink}
            className="rounded-md bg-[#0B1220] px-3 py-1.5 text-[12.5px] font-medium text-white hover:bg-slate-800 cursor-pointer"
          >
            Apply Link
          </button>
          <button
            type="button"
            onClick={() => setLinkOpen(false)}
            className="rounded-md px-2.5 py-1.5 text-[12.5px] text-slate-600 hover:bg-slate-200/70 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Image Insert Popover (URL or R2 Upload) */}
      {imageOpen && (
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Paste image URL (https://...)"
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[13px] focus:border-[#1D4ED8] focus:outline-none"
            />
            <input
              type="text"
              value={imageAlt}
              onChange={(e) => setImageAlt(e.target.value)}
              placeholder="Alt text / caption (optional)"
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[13px] focus:border-[#1D4ED8] focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={insertImageByUrl}
              disabled={!imageUrl.trim()}
              className="rounded-md bg-[#1D4ED8] px-3 py-1.5 text-[12.5px] font-medium text-white hover:bg-[#1E40AF] disabled:opacity-50 cursor-pointer"
            >
              Insert Image URL
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleImageFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!r2Configured || uploadingImage}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[12.5px] font-medium text-slate-800 hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
              title={
                r2Configured
                  ? "Upload PNG/JPEG/WEBP to dedicated Resources R2 bucket"
                  : "Set RESOURCES_R2_* env vars to enable direct uploads"
              }
            >
              {uploadingImage ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              <span>{uploadingImage ? "Uploading..." : "Upload to Resources R2"}</span>
            </button>

            {!r2Configured && (
              <span className="text-[11.5px] text-amber-700">
                Resources R2 not configured yet — paste an image URL above.
              </span>
            )}

            <button
              type="button"
              onClick={() => setImageOpen(false)}
              className="ml-auto rounded-md px-2.5 py-1.5 text-[12.5px] text-slate-600 hover:bg-slate-200/70 cursor-pointer"
            >
              Close
            </button>
          </div>
          {imageError && <p className="text-[12px] text-red-600">{imageError}</p>}
        </div>
      )}

      {/* Editor Surface */}
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors cursor-pointer ${
        active
          ? "bg-[#0B1220] text-white"
          : "text-slate-700 hover:bg-slate-200/70 hover:text-[#0B1220]"
      }`}
    >
      {children}
    </button>
  );
}
