import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { isSafeResourceUrl } from "@/contracts/resources.contracts";

export function MarkdownArticleBody({ markdown }: { markdown: string }) {
  if (!markdown.trim()) return null;

  return (
    <div className="prose prose-slate max-w-none text-[16px] leading-[1.78] text-slate-700">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h2 className="mt-9 mb-3 text-[26px] font-semibold tracking-[-0.02em] text-[#0B1220]">
              {children}
            </h2>
          ),
          h2: ({ children }) => (
            <h2 className="mt-8 mb-3 text-[22px] font-semibold tracking-[-0.02em] text-[#0B1220]">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-6 mb-2.5 text-[18px] font-semibold text-[#0B1220]">
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
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
