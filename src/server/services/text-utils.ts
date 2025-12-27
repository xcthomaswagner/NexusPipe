/**
 * Text processing utilities for content analysis.
 */

/**
 * Extract a snippet of text around where a brand/term is mentioned.
 * Returns the surrounding context to help users identify false positives.
 *
 * @param markdown - The markdown content to search
 * @param brandName - The brand name to find
 * @param contextChars - Number of characters before/after to include (default 100)
 * @returns Array of snippets where the brand is mentioned
 */
export function extractMentionSnippets(
  markdown: string | null | undefined,
  brandName: string,
  contextChars = 100
): string[] {
  if (!markdown || !brandName) return [];

  const snippets: string[] = [];
  const searchTerm = brandName.toLowerCase();
  const content = markdown.toLowerCase();

  // Find all occurrences
  let lastIndex = 0;
  let searchIndex = content.indexOf(searchTerm, lastIndex);

  while (searchIndex !== -1) {
    // Calculate start and end positions for context
    const start = Math.max(0, searchIndex - contextChars);
    const end = Math.min(markdown.length, searchIndex + brandName.length + contextChars);

    // Extract the snippet using original case
    let snippet = markdown.slice(start, end);

    // Clean up the snippet
    snippet = cleanSnippet(snippet, start > 0, end < markdown.length);

    // Only add if not a duplicate (similar snippets from overlapping matches)
    if (!snippets.some((s) => s.includes(snippet) || snippet.includes(s))) {
      snippets.push(snippet);
    }

    // Move to next occurrence
    lastIndex = searchIndex + 1;
    searchIndex = content.indexOf(searchTerm, lastIndex);

    // Limit to first 3 snippets to avoid overwhelming the UI
    if (snippets.length >= 3) break;
  }

  return snippets;
}

/**
 * Clean up a snippet for display:
 * - Trim to word boundaries
 * - Remove markdown formatting
 * - Add ellipsis where truncated
 */
function cleanSnippet(
  snippet: string,
  hasTextBefore: boolean,
  hasTextAfter: boolean
): string {
  let cleaned = snippet;

  // Trim to word boundaries at start
  if (hasTextBefore) {
    const firstSpace = cleaned.indexOf(" ");
    if (firstSpace > 0 && firstSpace < 20) {
      cleaned = cleaned.slice(firstSpace + 1);
    }
  }

  // Trim to word boundaries at end
  if (hasTextAfter) {
    const lastSpace = cleaned.lastIndexOf(" ");
    if (lastSpace > cleaned.length - 20 && lastSpace > 0) {
      cleaned = cleaned.slice(0, lastSpace);
    }
  }

  // Remove markdown formatting
  cleaned = cleaned
    // Remove headers
    .replace(/^#{1,6}\s*/gm, "")
    // Remove bold/italic markers
    .replace(/\*\*?|__?/g, "")
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove images
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    // Remove code backticks
    .replace(/`+/g, "")
    // Remove list markers
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim();

  // Add ellipsis
  if (hasTextBefore) {
    cleaned = "..." + cleaned;
  }
  if (hasTextAfter) {
    cleaned = cleaned + "...";
  }

  return cleaned;
}

/**
 * Get the first mention snippet for display in a table.
 * Returns a single snippet or null if no mention found.
 */
export function getFirstMentionSnippet(
  markdown: string | null | undefined,
  brandName: string,
  contextChars = 80
): string | null {
  const snippets = extractMentionSnippets(markdown, brandName, contextChars);
  return snippets.length > 0 ? snippets[0] : null;
}
