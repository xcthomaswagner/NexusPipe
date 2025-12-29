"use client";

import { useState } from "react";
import { Play, Plus, X, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { trpc } from "@/lib/trpc/client";

interface AIQueryPanelProps {
  auditId: string;
  brandName: string;
  initialQueries?: string[];
}

export function AIQueryPanel({ auditId, brandName, initialQueries = [] }: AIQueryPanelProps) {
  const utils = trpc.useUtils();
  const [queries, setQueries] = useState<string[]>(
    initialQueries.length > 0 ? initialQueries : []
  );
  const [newQuery, setNewQuery] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    "chatgpt",
    "perplexity",
  ]);

  const { data: availablePlatforms, isLoading: platformsLoading } = trpc.aiPlatforms.getAvailable.useQuery();

  const updateTestQueries = trpc.aiPlatforms.updateTestQueries.useMutation({
    onSuccess: () => {
      utils.audit.getResults.invalidate({ id: auditId });
    },
  });

  const runQueries = trpc.aiPlatforms.queryPlatforms.useMutation({
    onSuccess: (result) => {
      toast.success("Queries completed", {
        description: `Received ${result.totalResponses} responses from AI platforms`,
      });
      utils.aiPlatforms.getResponses.invalidate({ auditId });
      utils.aiPlatforms.getShareOfVoice.invalidate({ auditId });
      utils.audit.getResults.invalidate({ id: auditId });
    },
    onError: (error) => {
      toast.error("Error running queries", {
        description: error.message,
      });
    },
  });

  const handleAddQuery = () => {
    if (!newQuery.trim()) return;
    if (queries.length >= 10) {
      toast.error("Maximum 10 queries allowed");
      return;
    }

    const updatedQueries = [...queries, newQuery.trim()];
    setQueries(updatedQueries);
    setNewQuery("");
    updateTestQueries.mutate({ auditId, queries: updatedQueries });
  };

  const handleRemoveQuery = (index: number) => {
    const updatedQueries = queries.filter((_, i) => i !== index);
    setQueries(updatedQueries);
    updateTestQueries.mutate({ auditId, queries: updatedQueries });
  };

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((p) => p !== platformId)
        : [...prev, platformId]
    );
  };

  const handleRunQueries = () => {
    if (queries.length === 0) {
      toast.error("Add at least one query to run");
      return;
    }
    if (selectedPlatforms.length === 0) {
      toast.error("Select at least one platform");
      return;
    }

    runQueries.mutate({
      auditId,
      queries,
      platforms: selectedPlatforms as ("chatgpt" | "perplexity" | "claude" | "gemini")[],
      skipCache: false,
    });
  };


  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle>AI Platform Test Queries</CardTitle>
          <p className="text-sm text-muted-foreground">
            Test how AI platforms respond to queries about your brand and industry
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Platform Selection */}
          <div>
            <h4 className="text-sm font-medium mb-3">Select Platforms</h4>
            <div className="flex flex-wrap gap-2">
              {platformsLoading ? (
                <>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-8 w-24 bg-muted rounded animate-pulse" />
                  ))}
                </>
              ) : availablePlatforms?.map((platform) => (
                <Tooltip key={platform.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={
                        selectedPlatforms.includes(platform.id)
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => togglePlatform(platform.id)}
                      disabled={!platform.available}
                      className="gap-1"
                    >
                      {selectedPlatforms.includes(platform.id) ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : null}
                      {platform.name}
                      {!platform.available && (
                        <AlertCircle className="h-3 w-3 text-amber-500" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {platform.available
                      ? `Query ${platform.name}`
                      : `${platform.name} requires API key configuration`}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>

          {/* Query List */}
          <div>
            <h4 className="text-sm font-medium mb-3">Test Queries</h4>
            {queries.length > 0 ? (
              <div className="space-y-2 mb-4">
                {queries.map((query, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg"
                  >
                    <span className="text-sm flex-1">{query}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => handleRemoveQuery(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-4">
                No queries added yet. Add queries below or use suggested templates.
              </p>
            )}

            {/* Add Query Input */}
            <div className="flex gap-2">
              <Textarea
                placeholder="Enter a test query..."
                value={newQuery}
                onChange={(e) => setNewQuery(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
            <div className="flex justify-end mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddQuery}
                disabled={!newQuery.trim() || queries.length >= 10}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Query
              </Button>
            </div>
          </div>

          {/* Run Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button
              onClick={handleRunQueries}
              disabled={
                runQueries.isPending ||
                queries.length === 0 ||
                selectedPlatforms.length === 0
              }
            >
              {runQueries.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Querying Platforms...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run {queries.length} {queries.length === 1 ? "Query" : "Queries"}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
