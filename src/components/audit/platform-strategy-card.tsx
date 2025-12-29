"use client";

import { AlertCircle, Target, Eye } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc/client";

import type { PlatformPriority } from "@/server/services/platform-strategy";

interface PlatformStrategyCardProps {
  auditId: string;
}

const PRIORITY_CONFIG: Record<
  PlatformPriority,
  { label: string; icon: typeof Target; color: string; badgeClass: string }
> = {
  high: {
    label: "High Priority",
    icon: Target,
    color: "text-red-600",
    badgeClass: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  },
  monitor: {
    label: "Monitor",
    icon: Eye,
    color: "text-amber-600",
    badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  lower: {
    label: "Lower Priority",
    icon: AlertCircle,
    color: "text-zinc-500",
    badgeClass: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  },
};

export function PlatformStrategyCard({ auditId }: PlatformStrategyCardProps) {
  const { data: strategy, isLoading } = trpc.aiPlatforms.getPlatformStrategy.useQuery({
    auditId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Platform Strategy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-16 bg-muted rounded" />
            <div className="h-16 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!strategy) {
    return null;
  }

  // Group recommendations by priority
  const highPriority = strategy.recommendations.filter((r) => r.priority === "high");
  const monitor = strategy.recommendations.filter((r) => r.priority === "monitor");
  const lower = strategy.recommendations.filter((r) => r.priority === "lower");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Platform Strategy</CardTitle>
        <CardDescription>
          Recommended focus for {strategy.brandName} based on industry signals
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* High Priority */}
        {highPriority.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-600">High Priority</span>
            </div>
            <div className="space-y-2 pl-6">
              {highPriority.map((rec) => (
                <div key={rec.platform} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className={PRIORITY_CONFIG.high.badgeClass}>
                      {rec.platformName}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{rec.reason}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Monitor */}
        {monitor.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-600">Monitor</span>
            </div>
            <div className="space-y-2 pl-6">
              {monitor.map((rec) => (
                <div key={rec.platform} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className={PRIORITY_CONFIG.monitor.badgeClass}>
                      {rec.platformName}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{rec.reason}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lower Priority */}
        {lower.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-zinc-500" />
              <span className="text-sm font-medium text-zinc-500">Lower Priority</span>
            </div>
            <div className="space-y-2 pl-6">
              {lower.map((rec) => (
                <div key={rec.platform} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className={PRIORITY_CONFIG.lower.badgeClass}>
                      {rec.platformName}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{rec.reason}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Industry Signals */}
        {strategy.industrySignals.length > 0 && (
          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground mb-2">
              Detected signals:
            </p>
            <div className="flex flex-wrap gap-1">
              {strategy.industrySignals.map((signal) => (
                <Badge key={signal} variant="outline" className="text-xs">
                  {signal}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
