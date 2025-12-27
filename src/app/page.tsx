import Link from "next/link";
import { ArrowRight, Search, BarChart3, Target } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            NexusPipe
          </h1>
          <p className="mt-2 text-xl text-muted-foreground">
            GEO Audit Tool
          </p>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
            Measure your brand&apos;s &quot;AI Mindshare&quot; - understand how LLMs like
            ChatGPT, Perplexity, and Claude perceive your products and get a
            data-driven roadmap to improve visibility.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/dashboard">
              <Button size="lg">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Features */}
          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            <div className="flex flex-col items-center">
              <div className="rounded-lg bg-primary/10 p-3">
                <Search className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 font-semibold">Neural Discovery</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Semantic search that simulates how AI models browse the web
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="rounded-lg bg-primary/10 p-3">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 font-semibold">Visibility Index</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Quantify how often your brand appears versus competitors
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="rounded-lg bg-primary/10 p-3">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 font-semibold">Citation Gaps</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Find opportunities where competitors are cited but you&apos;re not
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 px-4">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          Powered by Exa, Firecrawl, and OpenAI
        </div>
      </footer>
    </div>
  );
}
