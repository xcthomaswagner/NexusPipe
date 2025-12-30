import fs from "fs";
import path from "path";

import Handlebars from "handlebars";
import puppeteer from "puppeteer";

/**
 * Report data structure for PDF generation.
 */
export interface ReportData {
  brandName: string;
  auditDate: string;
  generatedAt: string;
  // Queries used in the audit
  industryIntentQuery: string;
  aiTestQueries: string[];
  // Metrics
  combinedVisibility: number;
  webVisibility: number;
  aiShareOfVoice: number;
  sourcesAnalyzed: number;
  citationGapsCount: number;
  sentimentBreakdown: {
    positive: number;
    negative: number;
    neutral: number;
    mixed: number;
  };
  citationGaps: Array<{
    url: string;
    title: string;
    authority: number;
    authorityFormatted: string;
    competitors: string[];
    competitorsJoined: string;
  }>;
  brandMentions: Array<{
    url: string;
    title: string;
    authority: number;
    authorityFormatted: string;
    sentiment: string;
    sentimentClass: string;
  }>;
  shareOfVoiceByPlatform: Array<{
    platform: string;
    percentage: number;
  }>;
  competitors: Array<{
    name: string;
    shareOfVoice: number;
    isBrand: boolean;
  }>;
}

/**
 * Get the sentiment class for styling.
 */
function getSentimentClass(sentiment: string | null): string {
  switch (sentiment?.toLowerCase()) {
    case "positive":
      return "score-excellent";
    case "negative":
      return "score-poor";
    case "mixed":
      return "score-fair";
    default:
      return "score-good";
  }
}

/**
 * Register Handlebars helpers.
 */
function registerHelpers() {
  // Only register if not already registered
  if (!Handlebars.helpers["formatDate"]) {
    Handlebars.registerHelper("formatDate", (date: Date | string) => {
      const d = typeof date === "string" ? new Date(date) : date;
      return d.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    });
  }

  if (!Handlebars.helpers["formatPercent"]) {
    Handlebars.registerHelper("formatPercent", (num: number) => {
      return `${num.toFixed(1)}%`;
    });
  }

  if (!Handlebars.helpers["scoreClass"]) {
    Handlebars.registerHelper("scoreClass", (score: number) => {
      if (score >= 75) return "excellent";
      if (score >= 50) return "good";
      if (score >= 25) return "fair";
      return "poor";
    });
  }
}

/**
 * Generate a PDF report from audit data.
 */
export async function generatePDFReport(data: ReportData): Promise<Buffer> {
  // Register helpers
  registerHelpers();

  // Load and compile template
  const templatePath = path.join(
    process.cwd(),
    "src/server/templates/report.html"
  );
  const templateHtml = fs.readFileSync(templatePath, "utf-8");
  const template = Handlebars.compile(templateHtml);

  // Render HTML with data
  const html = template(data);

  // Launch Puppeteer
  // Check if we're in a serverless environment (Vercel)
  const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

  let browser;

  if (isServerless) {
    // For Vercel/serverless, use @sparticuz/chromium
    const chromium = await import("@sparticuz/chromium");
    browser = await puppeteer.launch({
      args: chromium.default.args,
      executablePath: await chromium.default.executablePath(),
      headless: true,
    });
  } else {
    // For local development, use system Chrome or bundled Chromium
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0",
      },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

/**
 * Transform audit results into ReportData format.
 */
export function prepareReportData(
  audit: {
    id: string;
    brandName: string;
    createdAt: Date;
    industryIntent: string;
    aiTestQueries: string[];
  },
  results: {
    visibilityIndex: number;
    combinedVisibilityScore: number;
    sentimentBreakdown: {
      POSITIVE: number;
      NEGATIVE: number;
      NEUTRAL: number;
      MIXED: number;
    };
    stats: {
      totalSources: number;
      analyzedSources: number;
    };
    brandMentions: Array<{
      id: string;
      url: string;
      title: string | null;
      authorityScore: number | null;
      sentiment: string | null;
      mentionSnippet: string | null;
    }>;
    citationGaps: Array<{
      id: string;
      url: string;
      title: string | null;
      authorityScore: number | null;
      mentionsCompetitors: string[];
      mentionSnippet: string | null;
    }>;
    shareOfVoice: {
      brandShareOfVoice: number;
      byPlatform: Array<{
        platform: string;
        brandMentions: number;
        totalResponses: number;
        shareOfVoice: number;
      }>;
      competitorShareOfVoice: Array<{
        name: string;
        mentions: number;
        shareOfVoice: number;
      }>;
    };
  }
): ReportData {
  const now = new Date();

  // Build competitor list including brand
  const competitorsList: Array<{ name: string; shareOfVoice: number; isBrand: boolean }> = [
    {
      name: audit.brandName,
      shareOfVoice: results.shareOfVoice.brandShareOfVoice,
      isBrand: true,
    },
    ...results.shareOfVoice.competitorShareOfVoice.map((c) => ({
      name: c.name,
      shareOfVoice: c.shareOfVoice,
      isBrand: false,
    })),
  ].sort((a, b) => b.shareOfVoice - a.shareOfVoice);

  return {
    brandName: audit.brandName,
    auditDate: audit.createdAt.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    generatedAt: now.toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }),
    industryIntentQuery: audit.industryIntent,
    aiTestQueries: audit.aiTestQueries,
    combinedVisibility: Math.round(results.combinedVisibilityScore),
    webVisibility: Math.round(results.visibilityIndex),
    aiShareOfVoice: Math.round(results.shareOfVoice.brandShareOfVoice),
    sourcesAnalyzed: results.stats.analyzedSources,
    citationGapsCount: results.citationGaps.length,
    sentimentBreakdown: (() => {
      // Convert counts to percentages
      const total =
        results.sentimentBreakdown.POSITIVE +
        results.sentimentBreakdown.NEGATIVE +
        results.sentimentBreakdown.NEUTRAL +
        results.sentimentBreakdown.MIXED;
      if (total === 0) {
        return { positive: 0, negative: 0, neutral: 0, mixed: 0 };
      }
      return {
        positive: Math.round((results.sentimentBreakdown.POSITIVE / total) * 100),
        negative: Math.round((results.sentimentBreakdown.NEGATIVE / total) * 100),
        neutral: Math.round((results.sentimentBreakdown.NEUTRAL / total) * 100),
        mixed: Math.round((results.sentimentBreakdown.MIXED / total) * 100),
      };
    })(),
    brandMentions: results.brandMentions.slice(0, 10).map((m) => {
      const authority = m.authorityScore ?? 0;
      return {
        url: m.url,
        title: m.title ?? m.url,
        authority,
        authorityFormatted: `${Math.round(authority * 100)}%`,
        sentiment: m.sentiment ?? "neutral",
        sentimentClass: getSentimentClass(m.sentiment),
      };
    }),
    citationGaps: results.citationGaps.slice(0, 10).map((g) => {
      const authority = g.authorityScore ?? 0;
      return {
        url: g.url,
        title: g.title ?? g.url,
        authority,
        authorityFormatted: `${Math.round(authority * 100)}%`,
        competitors: g.mentionsCompetitors,
        competitorsJoined: g.mentionsCompetitors.join(", "),
      };
    }),
    shareOfVoiceByPlatform: results.shareOfVoice.byPlatform.map((p) => ({
      platform: p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
      percentage: Math.round(p.shareOfVoice),
    })),
    competitors: competitorsList,
  };
}
