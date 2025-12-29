import Link from "next/link";
import { Plus, Search, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";

// Prevent static caching - dashboard should always fetch fresh data
export const dynamic = "force-dynamic";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/trpc/server";

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "COMPLETED":
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle className="mr-1 h-3 w-3" />
          Completed
        </Badge>
      );
    case "FAILED":
      return (
        <Badge variant="destructive">
          <XCircle className="mr-1 h-3 w-3" />
          Failed
        </Badge>
      );
    case "PENDING":
      return (
        <Badge variant="secondary">
          <Clock className="mr-1 h-3 w-3" />
          Pending
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          In Progress
        </Badge>
      );
  }
}

export default async function DashboardPage() {
  const caller = await api();
  const { audits } = await caller.audit.list({ limit: 20 });

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">GEO Audits</h1>
          <p className="text-muted-foreground mt-1">
            Track your brand&apos;s visibility in AI-generated answers
          </p>
        </div>
        <Link href="/audit/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Audit
          </Button>
        </Link>
      </div>

      {audits.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No audits yet</h2>
            <p className="text-muted-foreground mb-4">
              Start your first GEO audit to measure your brand&apos;s AI visibility.
            </p>
            <Link href="/audit/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Audit
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {audits.map((audit) => (
            <Link key={audit.id} href={`/audit/${audit.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{audit.brandName}</CardTitle>
                    <StatusBadge status={audit.status} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">
                        {audit.competitors.length}
                      </span>{" "}
                      competitors &bull;{" "}
                      <span className="font-medium">{audit._count.sources}</span>{" "}
                      sources
                    </div>
                    {audit.visibilityScore !== null && (
                      <div className="text-2xl font-bold">
                        {audit.visibilityScore.toFixed(1)}%
                        <span className="text-sm font-normal text-muted-foreground ml-2">
                          visibility
                        </span>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Created {new Date(audit.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
