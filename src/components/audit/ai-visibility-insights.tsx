"use client";

import { AlertTriangle, Info, Lightbulb, CheckCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";

import type { InsightSeverity } from "@/server/services/metrics";

const SEVERITY_CONFIG: Record<
  InsightSeverity,
  { icon: typeof Info; color: string; bg: string }
> = {
  info: {
    icon: Info,
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/30",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/30",
  },
  opportunity: {
    icon: Lightbulb,
    color: "text-purple-500",
    bg: "bg-purple-50 dark:bg-purple-950/30",
  },
  success: {
    icon: CheckCircle,
    color: "text-green-500",
    bg: "bg-green-50 dark:bg-green-950/30",
  },
};

interface AIVisibilityInsightsProps {
  auditId: string;
}

export function AIVisibilityInsights({ auditId }: AIVisibilityInsightsProps) {
  const { data: insights, isLoading } = trpc.aiPlatforms.getInsights.useQuery({
    auditId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="animate-pulse space-y-3">
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights || insights.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Actionable Insights</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {insights.map((insight) => {
          const config = SEVERITY_CONFIG[insight.severity];
          const Icon = config.icon;
          return (
            <div
              key={insight.id}
              className={`p-3 rounded-lg ${config.bg} flex gap-3 items-start`}
            >
              <Icon
                className={`h-5 w-5 ${config.color} flex-shrink-0 mt-0.5`}
              />
              <div className="min-w-0">
                <p className="font-medium text-sm">{insight.title}</p>
                <p className="text-sm text-muted-foreground">
                  {insight.description}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
