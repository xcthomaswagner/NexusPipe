"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";

import type { AuditStatus } from "@/lib/validation/audit";

interface RunTrackerProps {
  auditId: string;
  initialStatus: AuditStatus;
  onComplete?: () => void;
}

const STAGES = [
  { key: "DISCOVERING", label: "Discovery" },
  { key: "INGESTING", label: "Analyzing" },
  { key: "SYNTHESIZING", label: "Synthesizing" },
  { key: "COMPLETED", label: "Complete" },
] as const;

function getStageIndex(status: AuditStatus): number {
  switch (status) {
    case "PENDING":
      return -1;
    case "DISCOVERING":
      return 0;
    case "INGESTING":
      return 1;
    case "SYNTHESIZING":
      return 2;
    case "COMPLETED":
      return 3;
    case "FAILED":
      return -1;
    default:
      return -1;
  }
}

export function RunTracker({
  auditId,
  initialStatus,
  onComplete,
}: RunTrackerProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const hasStartedRef = useRef(false);
  const utils = trpc.useUtils();

  // Get pipeline status
  const { data: statusData } = trpc.pipeline.getStatus.useQuery(
    { id: auditId },
    {
      refetchInterval: ({ state }) => {
        const status = state.data?.status;
        if (status === "COMPLETED" || status === "FAILED") {
          return false;
        }
        return 2000;
      },
    }
  );

  // Get logs
  const { data: logs } = trpc.pipeline.getLogs.useQuery(
    { id: auditId },
    {
      refetchInterval: () => {
        const status = statusData?.status;
        if (status === "COMPLETED" || status === "FAILED") {
          return false;
        }
        return 2000;
      },
    }
  );

  // Start pipeline if pending
  const startPipeline = trpc.pipeline.start.useMutation({
    onSuccess: () => {
      utils.pipeline.getStatus.invalidate({ id: auditId });
      utils.pipeline.getLogs.invalidate({ id: auditId });
    },
  });

  // Tick pipeline to process next chunk
  const tickPipeline = trpc.pipeline.tick.useMutation({
    onSuccess: (data) => {
      utils.pipeline.getStatus.invalidate({ id: auditId });
      utils.pipeline.getLogs.invalidate({ id: auditId });

      if (data.status === "COMPLETED") {
        onComplete?.();
      }
    },
  });

  // Start pipeline on mount if pending (only once)
  useEffect(() => {
    if (initialStatus === "PENDING" && !hasStartedRef.current) {
      hasStartedRef.current = true;
      startPipeline.mutate({ id: auditId });
    }
  }, [auditId, initialStatus, startPipeline]);

  // Tick pipeline to drive progress
  useEffect(() => {
    const status = statusData?.status;
    if (
      (status === "INGESTING" || status === "SYNTHESIZING") &&
      !tickPipeline.isPending
    ) {
      const timer = setTimeout(() => {
        tickPipeline.mutate({ id: auditId });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [statusData?.status, statusData?.progress, auditId, tickPipeline]);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const status = statusData?.status ?? initialStatus;
  const progress = statusData?.progress ?? 0;
  const currentStageIndex = getStageIndex(status);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stepper */}
        <div className="flex items-center justify-between">
          {STAGES.map((stage, index) => {
            const isCompleted = currentStageIndex > index;
            const isCurrent = currentStageIndex === index;
            const isFailed = status === "FAILED";

            return (
              <div key={stage.key} className="flex flex-col items-center gap-2">
                <div className="relative">
                  {isCompleted ? (
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  ) : isCurrent && !isFailed ? (
                    <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                  ) : isFailed && isCurrent ? (
                    <XCircle className="h-8 w-8 text-red-500" />
                  ) : (
                    <Circle className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <span
                  className={`text-sm ${
                    isCurrent
                      ? "font-medium text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Connector lines */}
        <div className="flex items-center justify-between px-4 -mt-12 mb-6">
          {STAGES.slice(0, -1).map((_, index) => (
            <div
              key={index}
              className={`h-0.5 flex-1 mx-2 ${
                currentStageIndex > index ? "bg-green-500" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{statusData?.message ?? "Initializing..."}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Terminal log */}
        <div
          ref={terminalRef}
          className="h-48 overflow-y-auto rounded-lg bg-zinc-950 p-4 font-mono text-sm text-green-400"
        >
          {logs?.map((log) => (
            <div key={log.id} className="py-0.5">
              <span className="text-zinc-500">
                [{new Date(log.createdAt).toLocaleTimeString()}]
              </span>{" "}
              {log.message}
            </div>
          ))}
          {(!logs || logs.length === 0) && (
            <div className="text-zinc-500">Waiting for logs...</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
