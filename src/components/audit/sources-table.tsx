"use client";

import { useState } from "react";
import { ExternalLink, CheckCircle, XCircle, AlertCircle, ThumbsUp, ThumbsDown, Minus, GitMerge } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";

import type { Sentiment } from "@/lib/validation/audit";

interface SourcesTableProps {
  auditId: string;
}

export function SourcesTable({ auditId }: SourcesTableProps) {
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [sentimentFilter, setSentimentFilter] = useState<Sentiment | "all">("all");
  const [brandFilter, setBrandFilter] = useState<"all" | "yes" | "no">("all");

  // Fetch sentiment breakdown for summary line
  const { data: resultsData } = trpc.audit.getResults.useQuery({ id: auditId });

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.source.listByAudit.useInfiniteQuery(
      {
        auditId,
        limit: 20,
        sentiment: sentimentFilter === "all" ? undefined : sentimentFilter,
        mentionsBrand: brandFilter === "all" ? undefined : brandFilter === "yes",
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      }
    );

  const { data: selectedSource, isLoading: isLoadingSource } =
    trpc.source.getMarkdown.useQuery(
      { id: selectedSourceId! },
      { enabled: !!selectedSourceId }
    );

  const sources = data?.pages.flatMap((page) => page.sources) ?? [];

  const sentimentBreakdown = resultsData?.sentimentBreakdown;
  const totalSentiment = sentimentBreakdown
    ? sentimentBreakdown.POSITIVE + sentimentBreakdown.NEGATIVE + sentimentBreakdown.NEUTRAL + sentimentBreakdown.MIXED
    : 0;

  return (
    <div className="space-y-4">
      {/* Sentiment Summary Line */}
      {sentimentBreakdown && totalSentiment > 0 && (
        <div className="flex items-center gap-6 text-sm py-2 px-3 bg-muted/30 rounded-lg border">
          <span className="text-muted-foreground font-medium">Sentiment:</span>
          <div className="flex items-center gap-1">
            <ThumbsUp className="h-3.5 w-3.5 text-green-600" />
            <span className="text-green-600 font-medium">{sentimentBreakdown.POSITIVE}</span>
            <span className="text-muted-foreground">positive</span>
          </div>
          <div className="flex items-center gap-1">
            <ThumbsDown className="h-3.5 w-3.5 text-red-600" />
            <span className="text-red-600 font-medium">{sentimentBreakdown.NEGATIVE}</span>
            <span className="text-muted-foreground">negative</span>
          </div>
          <div className="flex items-center gap-1">
            <Minus className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-zinc-600 font-medium">{sentimentBreakdown.NEUTRAL}</span>
            <span className="text-muted-foreground">neutral</span>
          </div>
          <div className="flex items-center gap-1">
            <GitMerge className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-amber-600 font-medium">{sentimentBreakdown.MIXED}</span>
            <span className="text-muted-foreground">mixed</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <Select
          value={sentimentFilter}
          onValueChange={(v) => setSentimentFilter(v as Sentiment | "all")}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Sentiment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sentiments</SelectItem>
            <SelectItem value="POSITIVE">Positive</SelectItem>
            <SelectItem value="NEGATIVE">Negative</SelectItem>
            <SelectItem value="NEUTRAL">Neutral</SelectItem>
            <SelectItem value="MIXED">Mixed</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={brandFilter}
          onValueChange={(v) => setBrandFilter(v as "all" | "yes" | "no")}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Brand Mention" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="yes">Mentions Brand</SelectItem>
            <SelectItem value="no">No Brand Mention</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead className="w-24">Authority</TableHead>
              <TableHead className="w-24">Brand</TableHead>
              <TableHead className="w-24">Sentiment</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-64" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-8" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-4" />
                  </TableCell>
                </TableRow>
              ))
            ) : sources.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  No sources found
                </TableCell>
              </TableRow>
            ) : (
              sources.map((source) => (
                <TableRow
                  key={source.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedSourceId(source.id)}
                >
                  <TableCell>
                    <div className="font-medium truncate max-w-xs">
                      {source.title || "Untitled"}
                    </div>
                    <div className="text-sm text-muted-foreground truncate max-w-xs">
                      {source.url}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {((source.authorityScore ?? 0) * 100).toFixed(0)}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {source.mentionsBrand ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell>
                    {source.sentiment && (
                      <Badge
                        variant={
                          source.sentiment === "POSITIVE"
                            ? "default"
                            : source.sentiment === "NEGATIVE"
                              ? "destructive"
                              : source.sentiment === "MIXED"
                                ? "secondary"
                                : "outline"
                        }
                        className={
                          source.sentiment === "POSITIVE"
                            ? "bg-green-100 text-green-800"
                            : source.sentiment === "NEGATIVE"
                              ? "bg-red-100 text-red-800"
                              : ""
                        }
                      >
                        {source.sentiment}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {source.scrapeStatus === "COMPLETED" ? (
                      <Badge variant="outline" className="text-green-600">
                        OK
                      </Badge>
                    ) : source.scrapeStatus === "FAILED" ? (
                      <Badge variant="destructive">Failed</Badge>
                    ) : (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Load More */}
      {hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}

      {/* Source Detail Modal */}
      <Dialog
        open={!!selectedSourceId}
        onOpenChange={() => setSelectedSourceId(null)}
      >
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="truncate">
              {selectedSource?.title || "Source Details"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {isLoadingSource ? (
              <div className="space-y-4 p-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : selectedSource ? (
              <div className="space-y-4">
                {/* Meta info */}
                <div className="flex flex-wrap gap-4 text-sm border-b pb-4">
                  <div>
                    <span className="text-muted-foreground">Authority:</span>{" "}
                    <Badge variant="secondary">
                      {((selectedSource.authorityScore ?? 0) * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Brand:</span>{" "}
                    {selectedSource.mentionsBrand ? (
                      <Badge className="bg-green-100 text-green-800">Yes</Badge>
                    ) : (
                      <Badge variant="outline">No</Badge>
                    )}
                  </div>
                  {selectedSource.sentiment && (
                    <div>
                      <span className="text-muted-foreground">Sentiment:</span>{" "}
                      <Badge>{selectedSource.sentiment}</Badge>
                    </div>
                  )}
                  {selectedSource.mentionsCompetitors.length > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Competitors:</span>
                      {selectedSource.mentionsCompetitors.map((comp) => (
                        <Badge key={comp} variant="outline">
                          {comp}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* URL */}
                <div>
                  <a
                    href={selectedSource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                  >
                    {selectedSource.url}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                {/* Markdown content */}
                {selectedSource.scrapeStatus === "FAILED" ? (
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    <span>Failed to scrape: {selectedSource.scrapeError}</span>
                  </div>
                ) : selectedSource.markdown ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg overflow-x-auto">
                      {selectedSource.markdown.slice(0, 5000)}
                      {selectedSource.markdown.length > 5000 && "..."}
                    </pre>
                  </div>
                ) : (
                  <div className="text-muted-foreground">No content available</div>
                )}
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
