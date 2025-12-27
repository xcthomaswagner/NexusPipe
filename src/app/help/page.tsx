"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, ChevronDown, ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HELP_CONTENT, type HelpSection } from "@/lib/content/help";

export default function HelpPage() {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(HELP_CONTENT.sections.map((s) => s.id)) // All expanded by default
  );

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedSections(new Set(HELP_CONTENT.sections.map((s) => s.id)));
  };

  const collapseAll = () => {
    setExpandedSections(new Set());
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Home
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">{HELP_CONTENT.title}</h1>
        <p className="text-muted-foreground mt-2">{HELP_CONTENT.subtitle}</p>
      </div>

      <div className="flex gap-2 mb-6">
        <Button variant="outline" size="sm" onClick={expandAll}>
          Expand All
        </Button>
        <Button variant="outline" size="sm" onClick={collapseAll}>
          Collapse All
        </Button>
      </div>

      <div className="space-y-3">
        {HELP_CONTENT.sections.map((section) => (
          <HelpSectionCard
            key={section.id}
            section={section}
            isExpanded={expandedSections.has(section.id)}
            onToggle={() => toggleSection(section.id)}
          />
        ))}
      </div>

      <div className="mt-12 pt-8 border-t text-center">
        <p className="text-sm text-muted-foreground">
          Need more help? Contact support or check our documentation.
        </p>
      </div>
    </main>
  );
}

interface HelpSectionCardProps {
  section: HelpSection;
  isExpanded: boolean;
  onToggle: () => void;
}

function HelpSectionCard({ section, isExpanded, onToggle }: HelpSectionCardProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <span className="font-medium">{section.title}</span>
      </button>
      <div
        className={cn(
          "px-4 pb-4 pt-0 overflow-hidden transition-all",
          isExpanded ? "block" : "hidden"
        )}
      >
        <div className="pl-7 prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              table: ({ children }) => (
                <div className="overflow-x-auto my-4">
                  <table className="w-full border-collapse text-sm">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-muted">{children}</thead>
              ),
              th: ({ children }) => (
                <th className="border px-3 py-2 text-left font-medium">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border px-3 py-2">{children}</td>
              ),
              code: ({ children, className }) => {
                const isInline = !className;
                return isInline ? (
                  <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
                    {children}
                  </code>
                ) : (
                  <code className={className}>{children}</code>
                );
              },
              ul: ({ children }) => (
                <ul className="list-disc pl-4 space-y-1 my-3">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-4 space-y-1 my-3">{children}</ol>
              ),
              p: ({ children }) => <p className="my-3 leading-relaxed">{children}</p>,
              strong: ({ children }) => (
                <strong className="font-semibold text-foreground">{children}</strong>
              ),
            }}
          >
            {section.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
