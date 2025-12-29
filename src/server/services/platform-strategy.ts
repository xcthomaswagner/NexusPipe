/**
 * Platform Strategy Service
 *
 * Analyzes brand/industry context to recommend which AI platforms
 * should get priority attention and why.
 */

export type PlatformPriority = "high" | "monitor" | "lower";

export interface PlatformRecommendation {
  platform: string;
  platformName: string;
  priority: PlatformPriority;
  reason: string;
}

export interface PlatformStrategy {
  brandName: string;
  recommendations: PlatformRecommendation[];
  industrySignals: string[];
}

// Industry signal detection patterns
const INDUSTRY_PATTERNS = {
  technical: [
    "software",
    "api",
    "sdk",
    "platform",
    "saas",
    "cloud",
    "enterprise",
    "developer",
    "integration",
    "infrastructure",
    "devops",
    "security",
    "data",
    "analytics",
    "ai",
    "machine learning",
  ],
  scientific: [
    "reagent",
    "lab",
    "research",
    "protocol",
    "assay",
    "molecular",
    "genomic",
    "biotech",
    "pharma",
    "clinical",
    "diagnostic",
    "enzyme",
    "antibody",
    "sequencing",
    "pcr",
    "crispr",
  ],
  consumer: [
    "shoe",
    "sneaker",
    "apparel",
    "clothing",
    "fashion",
    "style",
    "wear",
    "athletic",
    "fitness",
    "lifestyle",
    "retail",
    "shopping",
    "buy",
    "price",
    "review",
  ],
  creative: [
    "guitar",
    "music",
    "instrument",
    "audio",
    "sound",
    "band",
    "musician",
    "player",
    "tone",
    "amp",
    "pedal",
    "recording",
    "studio",
  ],
  local: [
    "home",
    "house",
    "residential",
    "builder",
    "construction",
    "real estate",
    "community",
    "neighborhood",
    "location",
    "city",
    "region",
    "local",
    "area",
  ],
  enterprise: [
    "enterprise",
    "b2b",
    "procurement",
    "vendor",
    "compliance",
    "license",
    "asset management",
    "itam",
    "sam",
    "finops",
    "optimization",
    "governance",
  ],
};

// Platform characteristics for generating recommendations
const PLATFORM_PROFILES = {
  chatgpt: {
    name: "ChatGPT",
    strengths: ["largest user base", "general knowledge", "consumer queries"],
    audiences: ["general public", "consumers", "students"],
  },
  perplexity: {
    name: "Perplexity",
    strengths: ["live citations", "real-time search", "source transparency"],
    audiences: ["researchers", "fact-checkers", "professionals"],
  },
  claude: {
    name: "Claude",
    strengths: ["technical accuracy", "nuanced analysis", "longer context"],
    audiences: ["developers", "enterprises", "technical users"],
  },
  gemini: {
    name: "Gemini",
    strengths: ["Google ecosystem", "multimodal", "Android integration"],
    audiences: ["Google users", "Android users", "mainstream consumers"],
  },
};

/**
 * Detect industry signals from the audit context
 */
function detectIndustrySignals(
  brandName: string,
  industryIntent: string,
  competitors: string[]
): { signals: string[]; categories: Set<string> } {
  const text = `${brandName} ${industryIntent} ${competitors.join(" ")}`.toLowerCase();
  const signals: string[] = [];
  const categories = new Set<string>();

  for (const [category, patterns] of Object.entries(INDUSTRY_PATTERNS)) {
    for (const pattern of patterns) {
      if (text.includes(pattern)) {
        signals.push(pattern);
        categories.add(category);
      }
    }
  }

  return { signals, categories };
}

/**
 * Generate platform-specific recommendation based on industry context
 */
function generateRecommendation(
  platform: keyof typeof PLATFORM_PROFILES,
  categories: Set<string>,
  brandName: string
): PlatformRecommendation {
  const profile = PLATFORM_PROFILES[platform];

  // Determine priority based on category matches
  let priority: PlatformPriority = "monitor";
  let reason = "";

  // ChatGPT logic
  if (platform === "chatgpt") {
    if (categories.has("consumer") || categories.has("creative")) {
      priority = "high";
      reason = `Largest AI user base. Most consumers asking about ${brandName} will use ChatGPT.`;
    } else if (categories.has("technical") || categories.has("scientific")) {
      priority = "monitor";
      reason = `Large user base but less common for specialized ${categories.has("scientific") ? "scientific" : "technical"} decisions.`;
    } else {
      priority = "high";
      reason = "Dominant market share means most brand queries happen here.";
    }
  }

  // Perplexity logic
  if (platform === "perplexity") {
    if (categories.has("scientific") || categories.has("local")) {
      priority = "high";
      reason = categories.has("scientific")
        ? "Pulls live citations from journals, supplier sites, and protocols. Researchers use it for comparisons."
        : "Real-time search surfaces current listings, reviews, and local information.";
    } else if (categories.has("technical") || categories.has("enterprise")) {
      priority = "high";
      reason = "Source transparency matters for enterprise buyers validating vendors.";
    } else {
      priority = "monitor";
      reason = "Growing user base, especially for research-oriented queries.";
    }
  }

  // Claude logic
  if (platform === "claude") {
    if (categories.has("technical") || categories.has("scientific") || categories.has("enterprise")) {
      priority = "high";
      reason = categories.has("scientific")
        ? "Technical/scientific accuracy matters. Researchers and procurement teams often use Claude."
        : "Popular with enterprise buyers and technical evaluators doing due diligence.";
    } else if (categories.has("creative")) {
      priority = "monitor";
      reason = "Musicians and creators increasingly use Claude for detailed gear comparisons.";
    } else {
      priority = "monitor";
      reason = "Strong with technical users but smaller general audience than ChatGPT.";
    }
  }

  // Gemini logic
  if (platform === "gemini") {
    if (categories.has("consumer") || categories.has("local")) {
      priority = "high";
      reason = categories.has("local")
        ? "Integrated with Google Search and Maps. Home buyers often start research in Google."
        : "Android users and Google ecosystem means significant consumer reach.";
    } else if (categories.has("scientific") || categories.has("enterprise")) {
      priority = "lower";
      reason = `Limited traction in ${categories.has("scientific") ? "life sciences research" : "enterprise software"} workflows. Consider skipping unless resources allow.`;
    } else {
      priority = "monitor";
      reason = "Growing platform with Google ecosystem integration.";
    }
  }

  return {
    platform,
    platformName: profile.name,
    priority,
    reason,
  };
}

/**
 * Generate complete platform strategy for an audit
 */
export function generatePlatformStrategy(
  brandName: string,
  industryIntent: string,
  competitors: string[]
): PlatformStrategy {
  const { signals, categories } = detectIndustrySignals(
    brandName,
    industryIntent,
    competitors
  );

  // Generate recommendations for each platform
  const platforms: (keyof typeof PLATFORM_PROFILES)[] = [
    "chatgpt",
    "perplexity",
    "claude",
    "gemini",
  ];

  const recommendations = platforms.map((platform) =>
    generateRecommendation(platform, categories, brandName)
  );

  // Sort by priority: high first, then monitor, then lower
  const priorityOrder: Record<PlatformPriority, number> = {
    high: 0,
    monitor: 1,
    lower: 2,
  };

  recommendations.sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  return {
    brandName,
    recommendations,
    industrySignals: [...new Set(signals)].slice(0, 5), // Top 5 unique signals
  };
}
