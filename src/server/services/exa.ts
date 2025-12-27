import Exa from "exa-js";

import { env } from "@/server/env";

const exa = new Exa(env.EXA_API_KEY);

export interface ExaResult {
  url: string;
  title: string;
  score: number;
}

export interface SearchOptions {
  numResults?: number;
  excludeDomains?: string[];
}

/**
 * Performs a neural search using Exa to simulate how AI models browse the web.
 * Returns top results with URLs, titles, and relevance scores.
 *
 * @param excludeDomains - Domains to exclude (e.g., brand and competitor websites)
 *                         to focus on third-party sources that influence AI training
 */
export async function searchNeural(
  query: string,
  options: SearchOptions = {}
): Promise<ExaResult[]> {
  const { numResults = 50, excludeDomains = [] } = options;

  const response = await exa.search(query, {
    type: "neural",
    numResults,
    useAutoprompt: true,
    excludeDomains: excludeDomains.length > 0 ? excludeDomains : undefined,
  });

  return response.results.map((result) => ({
    url: result.url,
    title: result.title ?? "",
    score: result.score ?? 0,
  }));
}

/**
 * Builds a search query from the industry intent.
 * Exa works best with natural language queries that describe what you're looking for.
 */
export function buildSearchQuery(industryIntent: string): string {
  // The industryIntent should already be a natural language query
  // e.g., "What are the best B2B commerce platforms for 2025?"
  // We can optionally enhance it, but Exa's autoprompt handles this well
  return industryIntent;
}

/**
 * Known domain mappings for common life sciences / tech companies.
 * Extend this as needed for other industries.
 */
const KNOWN_DOMAINS: Record<string, string[]> = {
  "new england biolabs": ["neb.com", "nebiolabs.com"],
  "thermo fisher scientific": ["thermofisher.com", "invitrogen.com", "lifetechnologies.com", "fishersci.com"],
  "thermo fisher": ["thermofisher.com", "invitrogen.com", "lifetechnologies.com", "fishersci.com"],
  "promega": ["promega.com"],
  "promega corporation": ["promega.com"],
  "takara bio": ["takarabio.com", "clontech.com"],
  "takara": ["takarabio.com", "clontech.com"],
  "qiagen": ["qiagen.com"],
  "agilent": ["agilent.com"],
  "bio-rad": ["bio-rad.com"],
  "illumina": ["illumina.com"],
  "roche": ["roche.com", "lifescience.roche.com"],
  "merck": ["merckmillipore.com", "sigmaaldrich.com", "emdmillipore.com"],
  "sigma-aldrich": ["sigmaaldrich.com"],
};

/**
 * Generates domains to exclude based on brand name and competitor names.
 * This ensures the audit focuses on third-party sources, not company websites.
 */
export function generateExcludeDomains(
  brandName: string,
  competitorNames: string[]
): string[] {
  const domains: string[] = [];
  const allNames = [brandName, ...competitorNames];

  for (const name of allNames) {
    const normalized = name.toLowerCase().trim();

    // Check known domains first
    if (KNOWN_DOMAINS[normalized]) {
      domains.push(...KNOWN_DOMAINS[normalized]);
      continue;
    }

    // Generate likely domain from company name
    // "New England Biolabs" -> "newenglandbiolabs.com"
    // "Thermo Fisher Scientific" -> "thermofisherscientific.com"
    const slugified = normalized
      .replace(/[^a-z0-9]+/g, "")
      .toLowerCase();

    if (slugified) {
      domains.push(`${slugified}.com`);
    }
  }

  // Remove duplicates
  return [...new Set(domains)];
}

/**
 * Extracts the domain from a URL, including handling subdomains.
 * Returns the full hostname (e.g., "worldwide.promega.com" or "www.neb.com")
 */
export function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Checks if a URL matches any of the excluded domains (including subdomains).
 * For example, "worldwide.promega.com" matches exclusion "promega.com"
 */
export function urlMatchesExcludedDomain(
  url: string,
  excludedDomains: string[]
): boolean {
  const hostname = extractDomain(url);
  if (!hostname) return false;

  return excludedDomains.some((domain) => {
    const normalizedDomain = domain.toLowerCase();
    // Match exact domain or subdomain (e.g., "promega.com" matches "worldwide.promega.com")
    return (
      hostname === normalizedDomain ||
      hostname.endsWith(`.${normalizedDomain}`)
    );
  });
}

/**
 * Filters results to remove any URLs that match excluded domains.
 * This is a post-filter in case Exa's excludeDomains doesn't catch subdomains.
 */
export function filterExcludedDomains(
  results: ExaResult[],
  excludedDomains: string[]
): ExaResult[] {
  if (excludedDomains.length === 0) return results;

  return results.filter(
    (result) => !urlMatchesExcludedDomain(result.url, excludedDomains)
  );
}
