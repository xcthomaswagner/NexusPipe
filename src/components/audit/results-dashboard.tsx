"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, AlertTriangle, ExternalLink, XCircle, RefreshCw } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc/client";

interface ResultsDashboardProps {
  auditId: string;
  onRerun?: () => void;
}

/**
 * Extract base domain from a URL for exclusion.
 * e.g., "https://worldwide.promega.com/path" -> "promega.com"
 */
function extractBaseDomain(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    // Split by dots and take last 2 parts for base domain
    const parts = hostname.split(".");
    if (parts.length >= 2) {
      return parts.slice(-2).join(".");
    }
    return hostname;
  } catch {
    return null;
  }
}

export function ResultsDashboard({ auditId, onRerun }: ResultsDashboardProps) {
  const utils = trpc.useUtils();
  const [excludingDomain, setExcludingDomain] = useState<string | null>(null);

  const { data, isLoading } = trpc.audit.getResults.useQuery({ id: auditId });

  const addExcludedDomain = trpc.audit.addExcludedDomain.useMutation({
    onSuccess: (result) => {
      toast.success("Domain excluded", {
        description: `Added "${result.excludedDomains[result.excludedDomains.length - 1]}" to exclusion list. Rerun the audit to apply.`,
      });
      utils.audit.getById.invalidate({ id: auditId });
      setExcludingDomain(null);
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message,
      });
      setExcludingDomain(null);
    },
  });

  const handleExcludeDomain = (url: string) => {
    const domain = extractBaseDomain(url);
    if (!domain) {
      toast.error("Error", {
        description: "Could not extract domain from URL",
      });
      return;
    }

    setExcludingDomain(domain);
    addExcludedDomain.mutate({ auditId, domain });
  };

  if (isLoading || !data) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 w-24 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const { visibilityIndex, citationGaps, stats, shareOfVoice, combinedVisibilityScore } = data;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          {/* Combined Visibility Score */}
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Combined Visibility
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-primary">
                  {combinedVisibilityScore.toFixed(1)}%
                </span>
                {combinedVisibilityScore >= 50 ? (
                  <TrendingUp className="h-5 w-5 text-green-500" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-500" />
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                blended Web + AI
              </p>
            </CardContent>
          </Card>

          {/* Web Visibility Index */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Web Visibility
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">
                  {visibilityIndex.toFixed(1)}%
                </span>
                {visibilityIndex >= 50 ? (
                  <TrendingUp className="h-5 w-5 text-green-500" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-500" />
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                of web sources mention brand
              </p>
            </CardContent>
          </Card>

          {/* AI Share of Voice */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                AI Share of Voice
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">
                  {shareOfVoice.brandShareOfVoice.toFixed(1)}%
                </span>
                {shareOfVoice.brandShareOfVoice >= 50 ? (
                  <TrendingUp className="h-5 w-5 text-green-500" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-500" />
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {shareOfVoice.brandMentions} / {shareOfVoice.totalResponses} AI responses
              </p>
            </CardContent>
          </Card>

          {/* Sources Analyzed */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Sources Analyzed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{stats.analyzedSources}</div>
              <p className="text-sm text-muted-foreground mt-1">
                of {stats.totalSources} discovered
              </p>
            </CardContent>
          </Card>

          {/* Citation Gaps */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Citation Gaps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">{citationGaps.length}</span>
                {citationGaps.length > 0 && (
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                opportunities identified
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Citation Gaps Table */}
        {citationGaps.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Citation Gaps
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                High-authority sources that mention competitors but not your brand.
                These represent opportunities to improve visibility.
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Authority</TableHead>
                    <TableHead>Competitors Mentioned</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {citationGaps.slice(0, 10).map((gap) => {
                    const baseDomain = extractBaseDomain(gap.url);
                    return (
                      <TableRow key={gap.id}>
                        <TableCell>
                          <div className="font-medium truncate max-w-xs">
                            {gap.title || gap.url}
                          </div>
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {gap.url}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {((gap.authorityScore ?? 0) * 100).toFixed(0)}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {gap.mentionsCompetitors.map((comp) => (
                              <Badge key={comp} variant="outline">
                                {comp}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => handleExcludeDomain(gap.url)}
                                  disabled={excludingDomain === baseDomain}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Exclude {baseDomain} from future audits</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <a
                                  href={gap.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center h-8 w-8 text-muted-foreground hover:text-foreground"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Open in new tab</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Brand Mentions */}
        {data.brandMentions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top Brand Mentions</CardTitle>
              <p className="text-sm text-muted-foreground">
                Highest authority sources that mention your brand. Review the context to identify potential false positives.
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Authority</TableHead>
                    <TableHead>Sentiment</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.brandMentions.map((source) => {
                    const baseDomain = extractBaseDomain(source.url);
                    return (
                      <TableRow key={source.id}>
                        <TableCell>
                          <div className="font-medium truncate max-w-md">
                            {source.title || source.url}
                          </div>
                          <div className="text-sm text-muted-foreground truncate max-w-md">
                            {source.url}
                          </div>
                          {source.mentionSnippet && (
                            <div className="mt-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground italic border-l-2 border-primary/30">
                              &ldquo;{source.mentionSnippet}&rdquo;
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {((source.authorityScore ?? 0) * 100).toFixed(0)}%
                          </Badge>
                        </TableCell>
                        <TableCell>
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
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => handleExcludeDomain(source.url)}
                                  disabled={excludingDomain === baseDomain}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Exclude {baseDomain} from future audits</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <a
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center h-8 w-8 text-muted-foreground hover:text-foreground"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Open in new tab</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Rerun Button */}
        {onRerun && (
          <div className="flex justify-end">
            <Button onClick={onRerun} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Rerun Audit with Exclusions
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
