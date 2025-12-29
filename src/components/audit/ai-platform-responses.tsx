"use client";

import { useState } from "react";
import { CheckCircle, XCircle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

import { trpc } from "@/lib/trpc/client";

import type { ResponseFilterMode } from "@/lib/validation/ai-platforms";

interface AIPlatformResponsesProps {
  auditId: string;
}

const FILTER_LABELS: Record<ResponseFilterMode, string> = {
  all: "All Responses",
  brand_mentioned: "Brand Mentioned",
  brand_not_mentioned: "Brand Not Mentioned",
  competitor_only: "Competitors Only",
  neither_mentioned: "Neither Mentioned",
};

const PLATFORM_LABELS: Record<string, string> = {
  chatgpt: "ChatGPT",
  perplexity: "Perplexity",
  claude: "Claude",
  gemini: "Gemini",
};

export function AIPlatformResponses({ auditId }: AIPlatformResponsesProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [filterMode, setFilterMode] = useState<ResponseFilterMode>("all");
  const [expandedResponse, setExpandedResponse] = useState<string | null>(null);

  const { data, isLoading } = trpc.aiPlatforms.getResponses.useQuery({
    auditId,
    platform: selectedPlatform === "all" ? undefined : selectedPlatform as "chatgpt" | "perplexity" | "claude" | "gemini",
    filter: filterMode,
    limit: 50,
  });

  const { data: availablePlatforms } = trpc.aiPlatforms.getAvailable.useQuery();
  const { data: filterCounts } = trpc.aiPlatforms.getFilterCounts.useQuery({ auditId });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Platform Responses</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Check if there are any responses at all (regardless of current filter)
  const hasAnyResponses = filterCounts && filterCounts.all > 0;
  const responses = data?.responses ?? [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle>AI Platform Responses</CardTitle>
          {/* Always show filter dropdowns if there are any responses */}
          {hasAnyResponses && (
            <div className="flex items-center gap-2">
              <Select
                value={filterMode}
                onValueChange={(v) => setFilterMode(v as ResponseFilterMode)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(FILTER_LABELS) as ResponseFilterMode[]).map(
                    (value) => (
                      <SelectItem key={value} value={value}>
                        {FILTER_LABELS[value]}
                        {filterCounts && (
                          <span className="ml-2 text-muted-foreground">
                            ({filterCounts[value]})
                          </span>
                        )}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
              <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Platforms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  {availablePlatforms
                    ?.filter((p) => p.available)
                    .map((platform) => (
                      <SelectItem key={platform.id} value={platform.id}>
                        {platform.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        {hasAnyResponses && (
          <p className="text-sm text-muted-foreground">
            Showing {responses.length} responses
            {filterMode !== "all" && ` (${FILTER_LABELS[filterMode].toLowerCase()})`}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {/* No responses at all - show initial message */}
        {!hasAnyResponses && (
          <p className="text-sm text-muted-foreground">
            No AI platform responses yet. Run test queries to see how AI platforms mention your brand.
          </p>
        )}

        {/* Has responses but current filter shows none */}
        {hasAnyResponses && responses.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No responses match the current filter. Try adjusting your filters above.
          </p>
        )}

        {/* Show response list */}
        {responses.length > 0 && (
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-4">
            {responses.map((response) => (
              <div
                key={response.id}
                className="border rounded-lg p-4 space-y-3"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {PLATFORM_LABELS[response.platform] ?? response.platform}
                    </Badge>
                    {response.mentionsBrand ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Mentioned
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <XCircle className="h-3 w-3 mr-1" />
                        Not Mentioned
                      </Badge>
                    )}
                    {response.sentiment && (
                      <Badge
                        variant={
                          response.sentiment === "POSITIVE"
                            ? "default"
                            : response.sentiment === "NEGATIVE"
                              ? "destructive"
                              : response.sentiment === "MIXED"
                                ? "secondary"
                                : "outline"
                        }
                        className={
                          response.sentiment === "POSITIVE"
                            ? "bg-green-100 text-green-800"
                            : response.sentiment === "NEGATIVE"
                              ? "bg-red-100 text-red-800"
                              : ""
                        }
                      >
                        {response.sentiment}
                      </Badge>
                    )}
                    {response.brandPosition && (
                      <Badge variant="outline">
                        Position #{response.brandPosition}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(response.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Query */}
                <div className="bg-muted/50 rounded p-3">
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Query:
                  </p>
                  <p className="text-sm">{response.query}</p>
                </div>

                {/* Response Preview/Full */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Response:
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setExpandedResponse(
                          expandedResponse === response.id ? null : response.id
                        )
                      }
                    >
                      {expandedResponse === response.id ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-1" />
                          Collapse
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-1" />
                          Expand
                        </>
                      )}
                    </Button>
                  </div>
                  <div
                    className={`text-sm whitespace-pre-wrap ${
                      expandedResponse === response.id
                        ? ""
                        : "line-clamp-4"
                    }`}
                  >
                    {response.response}
                  </div>
                </div>

                {/* Competitors Mentioned */}
                {response.competitorsMentioned.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-2 border-t">
                    <span className="text-xs text-muted-foreground mr-2">
                      Competitors mentioned:
                    </span>
                    {response.competitorsMentioned.map((comp) => (
                      <Badge key={comp} variant="outline" className="text-xs">
                        {comp}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
