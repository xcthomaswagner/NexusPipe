"use client";

import { useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, RefreshCw, X, Plus, Settings, Sparkles, Download, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RunTracker } from "@/components/audit/run-tracker";
import { ResultsDashboard } from "@/components/audit/results-dashboard";
import { SourcesTable } from "@/components/audit/sources-table";
import { InsightsPanel } from "@/components/audit/insights-panel";
import { EditAuditDialog } from "@/components/audit/edit-audit-dialog";
import { ShareOfVoice } from "@/components/audit/share-of-voice";
import { AIPlatformResponses } from "@/components/audit/ai-platform-responses";
import { AIQueryPanel } from "@/components/audit/ai-query-panel";
import { AIVisibilityInsights } from "@/components/audit/ai-visibility-insights";
import { PlatformStrategyCard } from "@/components/audit/platform-strategy-card";
import { trpc } from "@/lib/trpc/client";
import { generateSimplePDF } from "@/lib/pdf/client-pdf";
import type { AuditDepth } from "@/lib/validation/audit";

export default function AuditDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const utils = trpc.useUtils();
  const [showResults, setShowResults] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rerunDialogOpen, setRerunDialogOpen] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [isGeneratingClientPDF, setIsGeneratingClientPDF] = useState(false);

  const { data: audit, isLoading } = trpc.audit.getById.useQuery({ id });

  const deleteAudit = trpc.audit.delete.useMutation({
    onSuccess: () => {
      router.push("/dashboard");
      router.refresh(); // Force RSC to refetch audit list
    },
  });

  const rerunAudit = trpc.audit.rerun.useMutation({
    onSuccess: () => {
      toast.success("Audit restarted", {
        description: "The audit will now run with your updated settings.",
      });
      setRerunDialogOpen(false);
      setShowResults(false);
      utils.audit.getById.invalidate({ id });
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message,
      });
    },
  });

  const handleEditSubmit = (data: {
    competitors: string[];
    industryIntent: string;
    depth: AuditDepth;
  }) => {
    rerunAudit.mutate({
      id,
      competitors: data.competitors,
      industryIntent: data.industryIntent,
      depth: data.depth,
    });
  };

  const addExcludedDomain = trpc.audit.addExcludedDomain.useMutation({
    onSuccess: () => {
      toast.success("Domain added to exclusion list");
      setNewDomain("");
      utils.audit.getById.invalidate({ id });
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message,
      });
    },
  });

  const removeExcludedDomain = trpc.audit.removeExcludedDomain.useMutation({
    onSuccess: () => {
      toast.success("Domain removed from exclusion list");
      utils.audit.getById.invalidate({ id });
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message,
      });
    },
  });

  // Fetch results for client-side PDF fallback
  const { data: resultsData } = trpc.audit.getResults.useQuery(
    { id },
    { enabled: !!audit && audit.status === "COMPLETED" }
  );

  const generateReport = trpc.audit.generateReport.useMutation({
    onSuccess: (result) => {
      // Download PDF by creating a temporary link
      const link = document.createElement("a");
      link.href = `data:${result.contentType};base64,${result.data}`;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Report downloaded", {
        description: "Your PDF report has been saved.",
      });
    },
    onError: async (error) => {
      // Fallback to client-side PDF generation
      console.warn("Server PDF failed, falling back to client-side:", error.message);

      if (!audit || !resultsData) {
        toast.error("Failed to generate report", {
          description: "Could not load audit data for PDF generation.",
        });
        return;
      }

      try {
        setIsGeneratingClientPDF(true);
        toast.info("Generating PDF locally...", {
          description: "Server generation failed, using browser fallback.",
        });

        // Calculate sentiment percentages
        const sentimentTotal =
          resultsData.sentimentBreakdown.POSITIVE +
          resultsData.sentimentBreakdown.NEGATIVE +
          resultsData.sentimentBreakdown.NEUTRAL +
          resultsData.sentimentBreakdown.MIXED;

        const sentimentBreakdown = sentimentTotal > 0
          ? {
              positive: Math.round((resultsData.sentimentBreakdown.POSITIVE / sentimentTotal) * 100),
              negative: Math.round((resultsData.sentimentBreakdown.NEGATIVE / sentimentTotal) * 100),
              neutral: Math.round((resultsData.sentimentBreakdown.NEUTRAL / sentimentTotal) * 100),
              mixed: Math.round((resultsData.sentimentBreakdown.MIXED / sentimentTotal) * 100),
            }
          : { positive: 0, negative: 0, neutral: 0, mixed: 0 };

        const sanitizedBrandName = audit.brandName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");

        await generateSimplePDF(
          {
            brandName: audit.brandName,
            auditDate: new Date(audit.createdAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            }),
            industryIntentQuery: audit.industryIntent,
            combinedVisibility: Math.round(resultsData.combinedVisibilityScore),
            webVisibility: Math.round(resultsData.visibilityIndex),
            aiShareOfVoice: Math.round(resultsData.shareOfVoice.brandShareOfVoice),
            sourcesAnalyzed: resultsData.stats.analyzedSources,
            citationGapsCount: resultsData.citationGaps.length,
            sentimentBreakdown,
          },
          `nexuspipe-report-${sanitizedBrandName}-${Date.now()}.pdf`
        );

        toast.success("Report downloaded", {
          description: "PDF generated in your browser.",
        });
      } catch (clientError) {
        console.error("Client PDF generation failed:", clientError);
        toast.error("Failed to generate report", {
          description: "Both server and browser PDF generation failed.",
        });
      } finally {
        setIsGeneratingClientPDF(false);
      }
    },
  });

  const handleAddDomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;

    // Basic domain validation
    const domain = newDomain.trim().toLowerCase();
    if (!domain.includes(".")) {
      toast.error("Invalid domain", {
        description: "Please enter a valid domain (e.g., example.com)",
      });
      return;
    }

    addExcludedDomain.mutate({ auditId: id, domain });
  };

  const handleRerun = () => {
    setRerunDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold mb-2">Audit not found</h1>
          <Link href="/dashboard">
            <Button>Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isComplete = audit.status === "COMPLETED";
  const isFailed = audit.status === "FAILED";
  const isRunning = !isComplete && !isFailed && audit.status !== "PENDING";
  const canRerun = isComplete || isFailed;
  const excludedDomains = audit.excludedDomains ?? [];

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">{audit.brandName}</h1>
          <p className="text-muted-foreground mt-1">
            {audit.competitors.map((c) => c.name).join(", ")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Edit & Rerun Button */}
          <Button
            variant="outline"
            size="sm"
            disabled={!canRerun || isRunning}
            onClick={() => setRerunDialogOpen(true)}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Rerun
          </Button>

          {/* Edit Audit Dialog */}
          <EditAuditDialog
            open={rerunDialogOpen}
            onOpenChange={setRerunDialogOpen}
            audit={{
              id: audit.id,
              brandName: audit.brandName,
              industryIntent: audit.industryIntent,
              depth: audit.depth,
              competitors: audit.competitors,
              excludedDomains: excludedDomains,
            }}
            onSubmit={handleEditSubmit}
            isSubmitting={rerunAudit.isPending}
          />

          {/* Delete Dialog */}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Audit</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this audit? This action cannot
                  be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteAudit.mutate({ id })}
                  disabled={deleteAudit.isPending}
                >
                  {deleteAudit.isPending ? "Deleting..." : "Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Content */}
      {(isRunning || audit.status === "PENDING") && !showResults ? (
        <RunTracker
          auditId={id}
          initialStatus={audit.status}
          onComplete={() => setShowResults(true)}
        />
      ) : isComplete || showResults ? (
        <Tabs defaultValue="results">
          <div className="flex items-center justify-between mb-6">
            <TabsList>
              <TabsTrigger value="results">Results</TabsTrigger>
              <TabsTrigger value="ai-visibility">AI Visibility</TabsTrigger>
              <TabsTrigger value="sources">All Sources</TabsTrigger>
              <TabsTrigger value="insights">
                <Sparkles className="mr-1 h-4 w-4" />
                Insights
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="mr-1 h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateReport.mutate({ id })}
              disabled={generateReport.isPending || isGeneratingClientPDF}
            >
              {generateReport.isPending || isGeneratingClientPDF ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export PDF
                </>
              )}
            </Button>
          </div>

          <TabsContent value="results">
            <ResultsDashboard auditId={id} onRerun={handleRerun} />
          </TabsContent>

          <TabsContent value="ai-visibility">
            <AIVisibilityContent auditId={id} brandName={audit.brandName} />
          </TabsContent>

          <TabsContent value="sources">
            <SourcesTable auditId={id} />
          </TabsContent>

          <TabsContent value="insights">
            <InsightsPanel auditId={id} />
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-6 max-w-2xl">
              {/* Excluded Domains Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Excluded Domains</CardTitle>
                  <CardDescription>
                    Domains in this list will be filtered out when the audit
                    runs. Click the X on any domain to remove it, or add new
                    domains below.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Current excluded domains */}
                  {excludedDomains.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {excludedDomains.map((domain) => (
                        <Badge
                          key={domain}
                          variant="secondary"
                          className="pl-3 pr-1 py-1.5"
                        >
                          {domain}
                          <button
                            onClick={() =>
                              removeExcludedDomain.mutate({
                                auditId: id,
                                domain,
                              })
                            }
                            className="ml-2 hover:bg-muted rounded-full p-0.5"
                            disabled={removeExcludedDomain.isPending}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No domains excluded yet. Add domains from the results page
                      or manually below.
                    </p>
                  )}

                  {/* Add new domain form */}
                  <form onSubmit={handleAddDomain} className="flex gap-2">
                    <Input
                      placeholder="Enter domain to exclude (e.g., example.com)"
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="submit"
                      disabled={!newDomain.trim() || addExcludedDomain.isPending}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add
                    </Button>
                  </form>

                  <p className="text-xs text-muted-foreground">
                    Tip: Adding a base domain like &quot;example.com&quot; will
                    also exclude subdomains like &quot;www.example.com&quot; or
                    &quot;blog.example.com&quot;.
                  </p>
                </CardContent>
              </Card>

              {/* Audit Info Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Audit Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-sm font-medium">Brand Name</div>
                    <div className="text-sm text-muted-foreground">
                      {audit.brandName}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Competitors</div>
                    <div className="text-sm text-muted-foreground">
                      {audit.competitors.map((c) => c.name).join(", ")}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Industry Intent</div>
                    <div className="text-sm text-muted-foreground">
                      {audit.industryIntent}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Created</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(audit.createdAt).toLocaleString()}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Rerun Button */}
              {canRerun && (
                <Button onClick={handleRerun} className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Edit & Rerun Audit
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>
      ) : isFailed ? (
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold text-destructive mb-2">
            Audit Failed
          </h2>
          <p className="text-muted-foreground mb-4">{audit.errorMessage}</p>
          <div className="flex justify-center gap-4">
            <Button onClick={handleRerun}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry Audit
            </Button>
            <Link href="/audit/new">
              <Button variant="outline">Create New Audit</Button>
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * AI Visibility tab content with SOV metrics and query panel.
 */
function AIVisibilityContent({
  auditId,
  brandName,
}: {
  auditId: string;
  brandName: string;
}) {
  const { data: results } = trpc.audit.getResults.useQuery({ id: auditId });
  const { data: auditData } = trpc.audit.getById.useQuery({ id: auditId });

  return (
    <div className="space-y-6">
      {/* Platform Strategy */}
      <PlatformStrategyCard auditId={auditId} />

      {/* AI Test Query Panel */}
      <AIQueryPanel
        auditId={auditId}
        initialQueries={auditData?.aiTestQueries ?? []}
      />

      {/* Actionable Insights */}
      <AIVisibilityInsights auditId={auditId} />

      {/* Share of Voice Metrics */}
      {results?.shareOfVoice && (
        <ShareOfVoice
          metrics={results.shareOfVoice}
          brandName={brandName}
        />
      )}

      {/* AI Platform Responses */}
      <AIPlatformResponses auditId={auditId} />
    </div>
  );
}
