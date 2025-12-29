/**
 * NexusPipe Help Content
 *
 * Structured help content for the application.
 * Exported as constants for use in the HelpDialog component.
 */

export const HELP_CONTENT = {
  title: "NexusPipe Help Guide",
  subtitle: "Understanding AI Visibility & GEO Auditing",

  sections: [
    {
      id: "what-is-geo",
      title: "What is GEO?",
      content: `**Generative Engine Optimization (GEO)** is the practice of optimizing your brand's visibility in AI-generated responses. As users increasingly turn to ChatGPT, Perplexity, Claude, and other AI assistants for information, your brand's presence in these responses directly impacts awareness and consideration.

Unlike traditional SEO which focuses on search engine rankings, GEO focuses on:
- Whether AI models mention your brand when answering relevant questions
- How your brand is positioned relative to competitors
- The sentiment and context of AI-generated brand mentions

NexusPipe measures your **AI Mindshare** — the degree to which AI models are aware of and reference your brand.`,
    },
    {
      id: "why-it-matters",
      title: "Why AI Visibility Matters",
      content: `AI assistants are rapidly becoming primary information sources for research, recommendations, and decision-making. When someone asks an AI "What are the best enterprise software vendors?" or "Which agencies specialize in Sitecore?", the AI's response shapes their perception and purchasing decisions.

**Key insights:**
- **Zero-click research**: Users get answers without visiting websites
- **Brand mentions = credibility signals**: AI references indicate authority
- **Competitor positioning**: Know where you stand in AI-generated comparisons
- **Content strategy alignment**: Understand what content AI models value

If your competitors appear in AI responses and you don't, you're losing mindshare in a channel that's growing exponentially.`,
    },
    {
      id: "on-site-vs-off-site",
      title: "On-Site vs Off-Site GEO",
      content: `There are two complementary approaches to Generative Engine Optimization:

**On-Site GEO** (what NexusPipe does NOT do):
- Analyzes YOUR website for AI readability
- Checks structured data, schema markup, and metadata
- Evaluates "snippability" — how easily AI can extract answers
- Assesses technical factors like page speed, crawlability, content structure
- Focuses on making your content machine-readable

**Off-Site GEO** (what NexusPipe DOES):
- Measures where your brand appears across the web
- Discovers which third-party sources mention you (or don't)
- Identifies citation gaps — authoritative sources missing your brand
- Tracks competitor visibility in your industry
- Focuses on brand presence in AI training and retrieval sources

**Why both matter:**

On-site optimization ensures AI *can* read your content. Off-site visibility ensures AI *does* reference your brand. You can have a perfectly optimized website that AI never mentions because you lack third-party citations, reviews, and industry coverage.

Think of it like traditional marketing:
- On-site GEO = Having a great website (necessary but not sufficient)
- Off-site GEO = Having PR, reviews, and industry presence (what drives awareness)

NexusPipe answers: "When someone asks AI about my industry, does my brand come up?" — regardless of how well your own site is optimized.`,
    },
    {
      id: "how-it-works",
      title: "How NexusPipe Works",
      content: `NexusPipe simulates how AI models discover and process information about your industry, then analyzes where your brand appears (or doesn't).

**The 4-Stage Pipeline:**

1. **Discovery** — We use neural semantic search to find sources the way AI models do. Your industry intent query (e.g., "Best B2B commerce platforms in 2025") guides the search to find relevant, authoritative content.

2. **Ingestion** — We scrape and process each discovered source, extracting the content that AI models would see and use for training or retrieval.

3. **Synthesis** — AI-powered analysis examines each source for brand mentions, competitor mentions, and sentiment. We use both string matching (for accuracy) and LLM analysis (for context).

4. **Results** — We calculate your Visibility Index and identify specific opportunities to improve your AI presence.`,
    },
    {
      id: "visibility-index",
      title: "Understanding the Visibility Index",
      content: `Your **Visibility Index** is the percentage of AI-relevant sources that mention your brand.

**Formula:** \`(Sources mentioning your brand ÷ Total analyzed sources) × 100\`

**Interpretation:**
- **0-10%**: Low visibility — AI models have minimal awareness of your brand
- **10-25%**: Emerging — Some presence, but significant room for improvement
- **25-50%**: Moderate — Competitive awareness, focus on quality and sentiment
- **50-75%**: Strong — Well-represented, optimize for sentiment and positioning
- **75%+**: Dominant — Industry leader status in AI mindshare

**What affects your score:**
- Content published on high-authority sites
- Mentions in industry publications, reviews, and comparisons
- Presence in directories, listings, and aggregators
- Thought leadership content (blogs, research, case studies)`,
    },
    {
      id: "citation-gaps",
      title: "Citation Gaps: Your Opportunities",
      content: `**Citation gaps** are high-authority sources that mention your competitors but NOT your brand. These represent your biggest opportunities for visibility improvement.

**Why they matter:**
- These sources are already AI-relevant (they appear in discovery)
- They're already covering your industry/competitors
- Getting mentioned here directly increases your Visibility Index
- They're often open to additional coverage or contributions

**Your personalized target list:**

Citation gaps aren't generic advice like "get listed in directories." They're specific to YOUR audit:
- A biotech company sees scientific publications and research databases
- A SaaS company sees G2, Capterra, and tech review blogs
- A consulting firm sees analyst reports and industry rankings
- A law firm sees legal directories and peer review sites

The audit produces the strategy. Your citation gaps ARE your short and mid-term outreach targets, already prioritized by authority score.

**How to close citation gaps:**
1. **Guest content**: Offer guest posts, expert quotes, or interviews
2. **PR outreach**: Pitch your story to publications covering competitors
3. **Product listings**: Ensure you're listed in relevant directories
4. **Review platforms**: Build presence on review and comparison sites
5. **Partnerships**: Collaborate with content creators in your space

**The feedback loop:** Run audit → identify gaps → close gaps → rerun audit → measure improvement.`,
    },
    {
      id: "sentiment-analysis",
      title: "Sentiment Analysis",
      content: `NexusPipe analyzes the sentiment of content where your brand appears:

**POSITIVE**: Content that portrays your brand favorably — recommendations, praise, success stories, positive comparisons.

**NEGATIVE**: Content that portrays your brand unfavorably — criticism, complaints, warnings against using, unfavorable comparisons.

**NEUTRAL**: Factual mentions without strong positive or negative framing — listings, directories, straightforward descriptions.

**MIXED**: Content containing both positive and negative elements — balanced reviews, comparisons with trade-offs, nuanced analysis.

**Using sentiment data:**
- High positive sentiment = strong brand perception, leverage in marketing
- Negative sentiment = identify issues to address, reputation management opportunities
- High neutral sentiment = opportunity to differentiate with stronger messaging
- Mixed sentiment = review and address any criticism themes
- Monitor sentiment trends across multiple audits over time`,
    },
    {
      id: "scan-depth",
      title: "Choosing Scan Depth",
      content: `NexusPipe offers three depth levels to balance speed and thoroughness:

| Depth | Sources | Time | Best For |
|-------|---------|------|----------|
| **Quick** | 25 | ~2 min | Initial exploration, quick pulse checks |
| **Standard** | 50 | ~5 min | Regular audits, balanced analysis |
| **Deep** | 100 | ~10 min | Comprehensive analysis, strategic planning |

**Recommendations:**
- Start with **Quick** to validate your industry intent query
- Use **Standard** for regular monitoring (weekly/monthly)
- Run **Deep** audits quarterly or before major strategic decisions

Higher depth also lowers the authority threshold, capturing more sources including emerging or niche content.`,
    },
    {
      id: "industry-intent",
      title: "Crafting Your Industry Intent Query",
      content: `The **industry intent query** is the natural language question that guides discovery. It should reflect how real users ask AI about your industry.

**Good examples:**
- "What are the best enterprise CRM platforms for mid-size companies?"
- "Which digital agencies specialize in Sitecore implementation?"
- "Top B2B marketing automation tools for SaaS companies in 2025"
- "Best practices for cloud migration consulting services"

**Tips for effective queries:**
1. **Be specific**: Include industry, use case, or buyer persona
2. **Use natural language**: Write as a user would ask an AI
3. **Include timeframe**: "in 2025" ensures recent, relevant results
4. **Test variations**: Run multiple audits with different phrasings
5. **Match buyer intent**: Think about what your prospects would ask`,
    },
    {
      id: "exclusion-list",
      title: "Managing Exclusions",
      content: `The **exclusion list** prevents certain domains from appearing in results.

**Auto-excluded domains:**
- Your brand's website (you already know you mention yourself)
- Competitor websites (we want third-party perspectives)

**When to add manual exclusions:**
- Social media platforms (twitter.com, linkedin.com) — often noisy
- Job boards (indeed.com, glassdoor.com) — not content-relevant
- Irrelevant domains that appear repeatedly
- Your own subsidiary or partner domains

**When to remove exclusions:**
- If you want to see how platforms mention your brand
- Testing a broader discovery scope
- Analyzing specific channels (e.g., Reddit discussions)

Changes to exclusions take effect on the next audit run. Use "Rerun Audit" to refresh with new settings.`,
    },
    {
      id: "best-practices",
      title: "Best Practices",
      content: `**Getting the most from NexusPipe:**

1. **Establish a baseline**: Run your first audit to understand current visibility
2. **Track over time**: Run audits monthly to measure progress
3. **Compare competitors**: Include your main competitors to benchmark
4. **Act on citation gaps**: Prioritize outreach to high-authority sources
5. **Vary your queries**: Test different intent phrasings to get full picture
6. **Review sentiment trends**: Monitor how perception changes
7. **Coordinate with content strategy**: Use insights to guide content creation

**Common mistakes to avoid:**
- Running audits without acting on findings
- Using vague or overly broad intent queries
- Ignoring citation gaps (your biggest opportunities)
- Only tracking visibility without sentiment context
- Not re-running after making visibility improvements`,
    },
    {
      id: "faq",
      title: "Frequently Asked Questions",
      content: `**Q: How often should I run audits?**
A: Monthly for tracking, plus after any major content or PR initiatives. Weekly if actively working on visibility improvements.

**Q: Why isn't my brand showing up?**
A: Low visibility means the content AI models find doesn't mention your brand. Focus on citation gaps — these are sources already covering your space that you're missing from.

**Q: Can I compare results over time?**
A: Yes, each audit is saved with its timestamp. Compare Visibility Index and sentiment across audits to track progress.

**Q: What's a good Visibility Index score?**
A: It varies by industry. 25-50% is competitive for most B2B markets. Focus on improvement over absolute numbers.

**Q: How accurate is the sentiment analysis?**
A: We use AI-powered analysis combined with pattern matching. It's directionally accurate but should be validated by reviewing flagged sources.

**Q: Why do some sources fail to scrape?**
A: Some sites block automated access, have paywalls, or are temporarily unavailable. Failed sources don't affect your Visibility Index calculation.

**Q: How do I improve my AI visibility?**
A: Close citation gaps, create content on high-authority platforms, earn mentions in industry publications, and ensure your brand appears in relevant directories and comparisons.

**Q: Why would I run an audit without competitors?**
A: Running without competitors gives you a pure brand visibility audit — measuring how often your brand appears in AI-relevant sources without the comparative context. This is useful when:
- You're exploring a new market and don't yet know who the competitors are
- You want a clean baseline of your brand's standalone presence
- You're focused purely on brand awareness rather than competitive positioning
- You want to see all sources mentioning you, not just citation gaps

When you add competitors, you unlock citation gap analysis (sources mentioning them but not you), which is the most actionable output for improving visibility.`,
    },
    {
      id: "glossary",
      title: "Glossary",
      content: `Key terms used in Generative Engine Optimization (GEO):

**Authority**
A score (0-100%) representing the credibility and influence of a web source. Higher authority sources are more likely to be referenced by AI models in their training data and retrieval systems. Authority is determined by factors like domain reputation, backlink quality, and content trustworthiness. In NexusPipe, sources are ranked by authority to prioritize the most impactful opportunities.

**Domain Mismatch (Homonym Detection)**
When your brand name appears in content but the word is being used with a different meaning. Many brand names are also common words: "Fender" (guitar brand vs. car body panel), "Apple" (tech company vs. fruit), "Amazon" (retailer vs. rainforest). If a source says "replaced the front fender after the accident," that's not a mention of Fender guitars — it's a domain mismatch. NexusPipe uses AI-powered analysis to detect these false positives and exclude them from your Visibility Index.

**Golden Nugget**
A standalone, highly citable fact or statistic (typically under 18 tokens) that AI models can easily extract and reference in their responses. Golden nuggets are "quotable quotes" — self-contained pieces of information that don't require additional context. Examples include: "Founded in 1946", "Serves 10,000+ enterprise customers", or "Winner of the 2024 Gartner Magic Quadrant." Creating golden nuggets in your content increases the likelihood that AI models will cite your brand when answering relevant questions.`,
    },
  ],
} as const;

export type HelpSection = (typeof HELP_CONTENT.sections)[number];
