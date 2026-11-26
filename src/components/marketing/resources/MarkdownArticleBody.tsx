import React from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowRight } from "lucide-react";
import {
  isSafeResourceUrl,
  type ResourceMidArticleCta,
} from "@/contracts/resources.contracts";
import {
  slugifyHeadingText,
  splitMarkdownForMidArticleCta,
} from "@/modules/resources/resources-playbook.helpers";

function extractTextFromChildren(children: React.ReactNode): string {
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(extractTextFromChildren).join("");
  if (React.isValidElement<{ children?: React.ReactNode }>(children)) {
    return extractTextFromChildren(children.props.children);
  }
  return "";
}

function MidArticleCtaCard({ cta }: { cta: ResourceMidArticleCta }) {
  const safeHref = isSafeResourceUrl(cta.buttonUrl) ? cta.buttonUrl : "/sign-up";
  const isExternal = safeHref.startsWith("http");

  return (
    <aside className="my-8 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/80 via-white to-slate-50 p-6 shadow-xs">
      {cta.eyebrow && (
        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#1D4ED8]">
          {cta.eyebrow}
        </p>
      )}
      <h3 className="mt-1.5 text-[19px] font-semibold leading-snug tracking-[-0.015em] text-[#0B1220]">
        {cta.headline}
      </h3>
      {cta.description && (
        <p className="mt-2 text-[14.5px] leading-[1.6] text-slate-600">{cta.description}</p>
      )}
      <div className="mt-4">
        {isExternal ? (
          <a
            href={safeHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-[#1D4ED8] px-4 py-2.5 text-[13.5px] font-semibold text-white hover:bg-[#1E40AF] transition-colors"
          >
            <span>{cta.buttonLabel || "Start Free 7-Day Workspace"}</span>
            <ArrowRight className="h-4 w-4" />
          </a>
        ) : (
          <Link
            href={safeHref}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1D4ED8] px-4 py-2.5 text-[13.5px] font-semibold text-white hover:bg-[#1E40AF] transition-colors"
          >
            <span>{cta.buttonLabel || "Start Free 7-Day Workspace"}</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </aside>
  );
}

function renderMarkdownSegment(
  segment: string,
  headingCounts: Map<string, number>,
): React.ReactNode {
  const nextHeadingId = (children: React.ReactNode) => {
    const base = slugifyHeadingText(extractTextFromChildren(children));
    const seen = headingCounts.get(base) ?? 0;
    headingCounts.set(base, seen + 1);
    return seen === 0 ? base : `${base}-${seen + 1}`;
  };

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h2
            id={nextHeadingId(children)}
            className="mt-9 mb-3 scroll-mt-24 text-[26px] font-semibold tracking-[-0.02em] text-[#0B1220]"
          >
            {children}
          </h2>
        ),
        h2: ({ children }) => (
          <h2
            id={nextHeadingId(children)}
            className="mt-8 mb-3 scroll-mt-24 text-[22px] font-semibold tracking-[-0.02em] text-[#0B1220]"
          >
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3
            id={nextHeadingId(children)}
            className="mt-6 mb-2.5 scroll-mt-24 text-[18px] font-semibold text-[#0B1220]"
          >
            {children}
          </h3>
        ),
        p: ({ children }) => <p className="my-4 leading-[1.78] text-slate-700">{children}</p>,
        ul: ({ children }) => (
          <ul className="my-4 list-disc pl-6 space-y-2 text-slate-700">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-4 list-decimal pl-6 space-y-2 text-slate-700">{children}</ol>
        ),
        blockquote: ({ children }) => (
          <blockquote className="my-6 border-l-2 border-[#1D4ED8] bg-slate-50/70 px-5 py-3 text-slate-700 italic rounded-r-lg">
            {children}
          </blockquote>
        ),
        a: ({ href, children }) => {
          const safeHref = href && isSafeResourceUrl(href) ? href : "#";
          const isExternal = safeHref.startsWith("http");
          if (!isExternal && safeHref.startsWith("/")) {
            return (
              <Link
                href={safeHref}
                className="font-medium text-[#1D4ED8] underline underline-offset-2 hover:text-[#1E40AF]"
              >
                {children}
              </Link>
            );
          }
          return (
            <a
              href={safeHref}
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noopener noreferrer" : undefined}
              className="font-medium text-[#1D4ED8] underline underline-offset-2 hover:text-[#1E40AF]"
            >
              {children}
            </a>
          );
        },
        img: ({ src, alt }) => {
          const safeSrc = typeof src === "string" && isSafeResourceUrl(src) ? src : "";
          if (!safeSrc) return null;
          return (
            <figure className="my-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={safeSrc}
                alt={alt || "Cogent resource illustration"}
                className="w-full max-h-[540px] rounded-xl border border-slate-200 object-contain bg-slate-50"
              />
              {alt && (
                <figcaption className="mt-2 text-center text-[12.5px] text-slate-500">
                  {alt}
                </figcaption>
              )}
            </figure>
          );
        },
        table: ({ children }) => (
          <div className="my-6 overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full border-collapse text-left text-[14px]">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 font-semibold text-[#0B1220]">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border-t border-slate-100 px-4 py-2.5 text-slate-700">{children}</td>
        ),
      }}
    >
      {segment}
    </ReactMarkdown>
  );
}

export function MarkdownArticleBody({
  markdown,
  midArticleCta,
}: {
  markdown: string;
  midArticleCta?: ResourceMidArticleCta | null;
}) {
  if (!markdown.trim()) return null;

  const headingCounts = new Map<string, number>();

  if (midArticleCta?.headline?.trim()) {
    const { before, after } = splitMarkdownForMidArticleCta(markdown);
    return (
      <div className="prose prose-slate max-w-none text-[16px] leading-[1.78] text-slate-700">
        {before && renderMarkdownSegment(before, headingCounts)}
        <MidArticleCtaCard cta={midArticleCta} />
        {after && renderMarkdownSegment(after, headingCounts)}
      </div>
    );
  }

  // Strip any unused {{CTA}} markers cleanly if no CTA card is configured
  const cleaned = markdown.replace(/\n?\s*\{\{CTA\}\}\s*\n?/gi, "\n\n");
  return (
    <div className="prose prose-slate max-w-none text-[16px] leading-[1.78] text-slate-700">
      {renderMarkdownSegment(cleaned, headingCounts)}
    </div>
  );
}
