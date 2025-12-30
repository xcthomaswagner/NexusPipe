"use client";

import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export interface ClientReportData {
  brandName: string;
  auditDate: string;
  industryIntentQuery: string;
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
}

/**
 * Generate PDF from an HTML element using html2canvas
 */
export async function generatePDFFromElement(
  element: HTMLElement,
  filename: string
): Promise<void> {
  // Capture the element as canvas
  const canvas = await html2canvas(element, {
    scale: 2, // Higher quality
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  // Add first page
  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  // Add additional pages if needed
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(filename);
}

/**
 * Generate a simple PDF report using jsPDF directly (no HTML capture)
 * This is faster and more reliable than html2canvas
 */
export async function generateSimplePDF(
  data: ClientReportData,
  filename: string
): Promise<void> {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  let y = 0;

  // Header with gradient effect (solid color for simplicity)
  pdf.setFillColor(0, 112, 243); // #0070f3
  pdf.rect(0, 0, pageWidth, 35, "F");

  // Header text
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text("NexusPipe GEO Audit Report", 15, 12);

  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.text("External AI Source Analysis", 15, 19);

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text(`${data.brandName} • ${data.auditDate}`, 15, 28);

  y = 48;

  // Executive Summary title
  pdf.setTextColor(30, 64, 175); // #1E40AF
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("Executive Summary", 15, y);
  y += 12;

  // Metrics grid
  const metrics = [
    { label: "Combined Visibility", value: `${data.combinedVisibility}%`, highlight: true },
    { label: "Web Visibility", value: `${data.webVisibility}%` },
    { label: "AI Share of Voice", value: `${data.aiShareOfVoice}%` },
    { label: "Sources Analyzed", value: `${data.sourcesAnalyzed}` },
    { label: "Citation Gaps", value: `${data.citationGapsCount}` },
  ];

  const cardWidth = 34;
  const cardHeight = 22;
  const cardGap = 3;
  const startX = 15;

  metrics.forEach((metric, index) => {
    const x = startX + (cardWidth + cardGap) * index;

    // Card background
    if (metric.highlight) {
      pdf.setFillColor(240, 247, 255); // Light blue
      pdf.setDrawColor(0, 112, 243);
    } else {
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(233, 236, 239);
    }
    pdf.roundedRect(x, y, cardWidth, cardHeight, 2, 2, "FD");

    // Label
    pdf.setTextColor(108, 117, 125); // #6c757d
    pdf.setFontSize(6);
    pdf.setFont("helvetica", "bold");
    const labelWidth = pdf.getTextWidth(metric.label.toUpperCase());
    pdf.text(metric.label.toUpperCase(), x + (cardWidth - labelWidth) / 2, y + 7);

    // Value
    if (metric.highlight) {
      pdf.setTextColor(0, 112, 243);
    } else {
      pdf.setTextColor(44, 62, 80);
    }
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    const valueWidth = pdf.getTextWidth(metric.value);
    pdf.text(metric.value, x + (cardWidth - valueWidth) / 2, y + 16);
  });

  y += cardHeight + 12;

  // Query Section
  pdf.setFillColor(248, 249, 250); // #f8f9fa
  pdf.setDrawColor(0, 112, 243); // #0070f3
  pdf.roundedRect(15, y, pageWidth - 30, 24, 2, 2, "FD");
  // Left border accent
  pdf.setFillColor(0, 112, 243);
  pdf.rect(15, y, 2, 24, "F");

  pdf.setTextColor(108, 117, 125);
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "bold");
  pdf.text("INDUSTRY INTENT QUERY", 20, y + 5);

  pdf.setTextColor(108, 117, 125);
  pdf.setFontSize(6);
  pdf.setFont("helvetica", "normal");
  pdf.text("The search query used to discover high-authority web sources in your industry that AI models reference.", 20, y + 10);

  pdf.setTextColor(44, 62, 80);
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "italic");
  const queryText = `"${data.industryIntentQuery}"`;
  pdf.text(queryText, 20, y + 18, { maxWidth: pageWidth - 45 });

  y += 31;

  // Sentiment Breakdown
  pdf.setTextColor(30, 64, 175);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text("Sentiment Breakdown", 15, y);
  y += 10;

  const sentiments = [
    { label: "Positive", value: data.sentimentBreakdown.positive, color: [40, 167, 69] },
    { label: "Negative", value: data.sentimentBreakdown.negative, color: [220, 53, 69] },
    { label: "Neutral", value: data.sentimentBreakdown.neutral, color: [108, 117, 125] },
    { label: "Mixed", value: data.sentimentBreakdown.mixed, color: [255, 193, 7] },
  ];

  sentiments.forEach((sentiment) => {
    // Label and value
    pdf.setTextColor(44, 62, 80);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.text(sentiment.label, 15, y + 3);
    pdf.text(`${sentiment.value}%`, 165, y + 3);

    // Progress bar background
    pdf.setFillColor(241, 243, 245);
    pdf.roundedRect(45, y, 115, 5, 2, 2, "F");

    // Progress bar fill
    const [r, g, b] = sentiment.color;
    pdf.setFillColor(r, g, b);
    const fillWidth = Math.max(0, Math.min(115, (sentiment.value / 100) * 115));
    if (fillWidth > 0) {
      pdf.roundedRect(45, y, fillWidth, 5, 2, 2, "F");
    }

    y += 10;
  });

  // Add new page for interpretation section
  pdf.addPage();
  y = 20;

  // How to Interpret Your Results Section
  // Background box
  pdf.setFillColor(248, 249, 250); // #f8f9fa
  pdf.roundedRect(15, y, pageWidth - 30, 180, 4, 4, "F");

  y += 15;

  // Section title
  pdf.setTextColor(30, 64, 175); // #1E40AF
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text("How to Interpret Your Results", 25, y);

  // Underline
  pdf.setDrawColor(233, 236, 239);
  pdf.line(25, y + 3, pageWidth - 25, y + 3);

  y += 15;

  // Why This Report Matters
  pdf.setTextColor(44, 62, 80); // #2c3e50
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text("Why This Report Matters", 25, y);
  y += 7;

  pdf.setTextColor(73, 80, 87); // #495057
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  const whyText =
    'When users ask AI assistants questions like "What\'s the best [your industry]?", the AI pulls answers from trusted web sources. If your brand isn\'t mentioned in those sources, you\'re invisible to AI-driven discovery. Even if you rank well in traditional search, the AI won\'t find you. AI based ranking and scoring is analogous to a credit rating: it\'s not what you say about yourself, but what trusted external sources say about you. Just as credit bureaus assess your financial reputation through third-party data, this score measures your brand\'s reputation through the sources AI models rely on.';
  const whyLines = pdf.splitTextToSize(whyText, pageWidth - 60);
  pdf.text(whyLines, 25, y);
  y += whyLines.length * 4 + 10;

  // Your Key Metrics
  pdf.setTextColor(44, 62, 80);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text("Your Key Metrics", 25, y);
  y += 8;

  const metricDefinitions = [
    {
      name: "Combined Visibility",
      desc: "Blends web presence and AI share of voice into one convenient score.",
    },
    {
      name: "Web Visibility Index",
      desc: 'The percentage of high-authority sources that mention your brand. Think of it as your "citation rate" across the web.',
    },
    {
      name: "AI Share of Voice",
      desc: "How often AI platforms mention your brand vs. competitors when answering relevant queries.",
    },
    {
      name: "Citation Gaps",
      desc: "The most actionable insight. This relates to sources that mention your competitors but not you. These are concrete outreach targets.",
    },
  ];

  metricDefinitions.forEach((metric) => {
    pdf.setTextColor(0, 112, 243); // #0070f3
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.text(metric.name, 25, y);

    pdf.setTextColor(73, 80, 87);
    pdf.setFont("helvetica", "normal");
    const descLines = pdf.splitTextToSize(metric.desc, pageWidth - 90);
    pdf.text(descLines, 70, y);
    y += Math.max(descLines.length * 4, 6) + 2;
  });

  y += 6;

  // What To Do Next
  pdf.setTextColor(44, 62, 80);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text("What To Do Next", 25, y);
  y += 8;

  const nextSteps = [
    "Review the URLs of citation gaps. Sometimes information is misinterpreted. Look at your citation gaps and prioritize by authority score.",
    "Reach out to high-authority sources for mentions, reviews, or features.",
    "Address any negative sentiment through reputation management.",
    "Re-run this audit quarterly to track improvement.",
  ];

  pdf.setTextColor(73, 80, 87);
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");

  nextSteps.forEach((step) => {
    // Bullet point
    pdf.setFillColor(0, 112, 243);
    pdf.circle(28, y - 1, 1.5, "F");

    const stepLines = pdf.splitTextToSize(step, pageWidth - 70);
    pdf.text(stepLines, 35, y);
    y += stepLines.length * 4 + 3;
  });

  // Footer
  pdf.setTextColor(108, 117, 125);
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  const footerText = `Generated by NexusPipe • ${new Date().toLocaleString()}`;
  const footerWidth = pdf.getTextWidth(footerText);
  pdf.text(footerText, (pageWidth - footerWidth) / 2, 280);

  // Save
  pdf.save(filename);
}
