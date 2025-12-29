"use client";

import { TrendingUp, TrendingDown, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import type { ShareOfVoiceMetrics } from "@/server/services/metrics";

interface ShareOfVoiceProps {
  metrics: ShareOfVoiceMetrics;
  brandName: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  chatgpt: "ChatGPT",
  perplexity: "Perplexity",
  claude: "Claude",
  gemini: "Gemini",
};

export function ShareOfVoice({ metrics, brandName }: ShareOfVoiceProps) {
  if (metrics.totalResponses === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Share of Voice</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No AI platform queries have been run yet. Configure test queries in the audit settings to analyze AI visibility.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Main SOV Card */}
        <Card>
          <CardHeader>
            <CardTitle>AI Share of Voice</CardTitle>
            <p className="text-sm text-muted-foreground">
              How often {brandName} is mentioned in AI-generated responses
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Overall Brand SOV */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{brandName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">
                    {metrics.brandShareOfVoice.toFixed(1)}%
                  </span>
                  {metrics.brandShareOfVoice >= 50 ? (
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  )}
                </div>
              </div>
              <Progress value={metrics.brandShareOfVoice} className="h-3" />
              <p className="text-xs text-muted-foreground mt-1">
                Mentioned in {metrics.brandMentions} of {metrics.totalResponses} AI responses
              </p>
            </div>

            {/* Competitor SOV */}
            {metrics.competitorShareOfVoice.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Competitor Visibility
                </h4>
                {metrics.competitorShareOfVoice.map((competitor) => (
                  <div key={competitor.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-muted-foreground">
                        {competitor.name}
                      </span>
                      <span className="text-sm font-medium">
                        {competitor.shareOfVoice.toFixed(1)}%
                      </span>
                    </div>
                    <Progress
                      value={competitor.shareOfVoice}
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Average Position */}
            {metrics.averageBrandPosition !== null && (
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Average Position When Mentioned
                  </span>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="outline" className="text-lg font-bold">
                        #{metrics.averageBrandPosition.toFixed(1)}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Lower is better - indicates where your brand typically appears in ranked lists</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Platform Breakdown */}
        {metrics.byPlatform.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">SOV by Platform</CardTitle>
              <p className="text-sm text-muted-foreground">
                Brand visibility varies across different AI platforms
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {metrics.byPlatform.map((platform) => (
                  <div
                    key={platform.platform}
                    className="p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">
                        {PLATFORM_LABELS[platform.platform] ?? platform.platform}
                      </span>
                      <Badge
                        variant={
                          platform.shareOfVoice >= 50
                            ? "default"
                            : platform.shareOfVoice >= 25
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {platform.shareOfVoice.toFixed(0)}%
                      </Badge>
                    </div>
                    <Progress value={platform.shareOfVoice} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-2">
                      {platform.brandMentions} / {platform.totalResponses} responses
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Sentiment */}
        {metrics.brandMentions > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AI Response Sentiment</CardTitle>
              <p className="text-sm text-muted-foreground">
                How AI platforms describe {brandName} when mentioned
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {metrics.sentimentBreakdown.positive}
                  </div>
                  <div className="text-sm text-muted-foreground">Positive</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {metrics.sentimentBreakdown.negative}
                  </div>
                  <div className="text-sm text-muted-foreground">Negative</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-zinc-600">
                    {metrics.sentimentBreakdown.neutral}
                  </div>
                  <div className="text-sm text-muted-foreground">Neutral</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">
                    {metrics.sentimentBreakdown.mixed}
                  </div>
                  <div className="text-sm text-muted-foreground">Mixed</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}
