import { AzureOpenAI } from "openai";
import "@azure/openai/types";

const endpoint = process.env.AZURE_OPENAI_ENDPOINT!;
const apiKey = process.env.AZURE_OPENAI_API_KEY!;
const deployment = process.env.AZURE_OPENAI_DEPLOYMENT!;
const apiVersion = process.env.AZURE_OPENAI_API_VERSION!;

const client = new AzureOpenAI({
  endpoint,
  apiKey,
  deployment,
  apiVersion,
});

export interface AIAnalysis {
  category: string;
  tags: string[];
  summary: string;
  actionableInsights: string[];
  priority: "low" | "medium" | "high";
}

// Helper function to clean JSON response from markdown code blocks
function cleanJsonResponse(content: string): string {
  // Remove markdown code blocks if present
  let cleaned = content.trim();
  
  // Check for ```json or ``` at the start
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7); // Remove ```json
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3); // Remove ```
  }
  
  // Remove trailing ``` if present
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  
  return cleaned.trim();
}

export async function analyzeContent(
  title: string,
  description?: string,
  url?: string
): Promise<AIAnalysis> {
  try {
    // Check if this is an Instagram URL with limited information
    const isInstagramWithLimitedInfo = url?.includes('instagram.com') && 
                                       (!description || description.includes('Note: Full content details require'));
    
    const prompt = isInstagramWithLimitedInfo 
      ? `This is an Instagram ${title} but full content details are not available.
URL: ${url}

Based on the limited information available, provide a JSON response with:
1. category: Most likely MARKETING or OTHER
2. tags: Array of 3-5 relevant tags (lowercase, single words) - focus on "instagram", "socialmedia", etc.
3. summary: Note that this is Instagram content requiring direct access for full details
4. actionableInsights: Suggest visiting Instagram directly to view the content
5. priority: "low" since we can't determine the actual content value

Respond only with valid JSON.`
      : `Analyze this exploration item and provide structured insights:
    
Title: ${title}
Description: ${description || "Not provided"}
URL: ${url || "Not provided"}

Provide a JSON response with:
1. category: One of AI_AGENTS, RASPBERRY_PI, PRINTER_3D, ELECTRONICS, SOFTWARE, AUTOMATION, WEB_TOOLS, PRODUCTIVITY, MARKETING, or OTHER
2. tags: Array of 3-5 relevant tags (lowercase, single words)
3. summary: A concise 1-2 sentence summary
4. actionableInsights: Array of 2-3 specific action items or learning points
5. priority: "low", "medium", or "high" based on potential impact

Respond only with valid JSON.`;

    const response = await client.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: process.env.AZURE_OPENAI_DEPLOYMENT!,
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response from AI");

    // Clean the response before parsing
    const cleanedContent = cleanJsonResponse(content);
    return JSON.parse(cleanedContent) as AIAnalysis;
  } catch (error) {
    console.error("AI Analysis failed:", error);
    // Fallback response
    return {
      category: "OTHER",
      tags: [],
      summary: "Unable to analyze content",
      actionableInsights: [],
      priority: "medium",
    };
  }
}

export async function generateSmartSuggestions(
  recentItems: Array<{ title: string; category: string; tags: string[] }>
): Promise<{ trendingTopics: string[]; recommendations: string[] }> {
  try {
    const prompt = `Based on these recent exploration items, identify patterns and suggest new areas to explore:

${recentItems.map(item => `- ${item.title} (${item.category}): ${item.tags.join(", ")}`).join("\n")}

Provide a JSON response with:
1. trendingTopics: Array of 3-4 topics you're currently interested in
2. recommendations: Array of 3-4 specific things to explore next

Respond only with valid JSON.`;

    const response = await client.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: process.env.AZURE_OPENAI_DEPLOYMENT!,
      temperature: 0.8,
      max_tokens: 300,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response from AI");

    // Clean the response before parsing
    const cleanedContent = cleanJsonResponse(content);
    return JSON.parse(cleanedContent);
  } catch (error) {
    console.error("Smart suggestions failed:", error);
    return {
      trendingTopics: [],
      recommendations: [],
    };
  }
} 
