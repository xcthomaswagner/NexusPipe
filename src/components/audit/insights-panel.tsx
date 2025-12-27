"use client";

import { useState } from "react";
import { Sparkles, Loader2, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";

interface InsightsPanelProps {
  auditId: string;
}

export function InsightsPanel({ auditId }: InsightsPanelProps) {
  const [insights, setInsights] = useState<{
    summary: string;
    keyFindings: string[];
    recommendations: string[];
    competitorAnalysis: string;
    nextSteps: string[];
  } | null>(null);

  const generateInsights = trpc.audit.generateInsights.useMutation({
    onSuccess: (data) => {
      setInsights(data);
    },
  });

  const handleGenerate = () => {
    generateInsights.mutate({ id: auditId });
  };

  if (!insights && !generateInsights.isPending) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <Sparkles className="h-12 w-12 text-muted-foreground" />
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">AI-Powered Insights</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Generate actionable insights from your audit results using AI analysis.
            Get personalized recommendations based on your visibility data.
          </p>
        </div>
        <Button onClick={handleGenerate} className="mt-4">
          <Sparkles className="mr-2 h-4 w-4" />
          Generate Insights
        </Button>
      </div>
    );
  }

  if (generateInsights.isPending) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">Analyzing Your Results</h3>
          <p className="text-sm text-muted-foreground">
            AI is reviewing your audit data and generating insights...
          </p>
        </div>
      </div>
    );
  }

  if (generateInsights.isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">Failed to Generate Insights</h3>
          <p className="text-sm text-muted-foreground">
            {generateInsights.error.message}
          </p>
        </div>
        <Button onClick={handleGenerate} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  if (!insights) return null;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-relaxed">{insights.summary}</p>
        </CardContent>
      </Card>

      {/* Key Findings */}
      {insights.keyFindings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Key Findings</CardTitle>
            <CardDescription>
              Important observations from your audit data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {insights.keyFindings.map((finding, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <span>{finding}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Competitor Analysis */}
      {insights.competitorAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle>Competitor Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              {insights.competitorAnalysis}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {insights.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
            <CardDescription>
              Actions to improve your AI visibility
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {insights.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                    {i + 1}
                  </span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      {insights.nextSteps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Immediate Next Steps</CardTitle>
            <CardDescription>
              Start here to improve your visibility
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {insights.nextSteps.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <ArrowRight className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Regenerate Button */}
      <div className="flex justify-center pt-4">
        <Button
          onClick={handleGenerate}
          variant="outline"
          disabled={generateInsights.isPending}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Regenerate Insights
        </Button>
      </div>
    </div>
  );
}
