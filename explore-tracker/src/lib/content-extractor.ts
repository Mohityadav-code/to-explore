import { analyzeContent } from "./azure-openai";

interface ExtractedContent {
  title?: string;
  description?: string;
  author?: string;
  platform?: string;
  contentType?: string;
  thumbnailUrl?: string;
  embedUrl?: string;
  metadata?: Record<string, any>;
}

// Extract metadata from HTML response
export function extractMetadataFromHTML(html: string, url: string): ExtractedContent {
  const metadata: ExtractedContent = {};
  
  // Detect platform
  if (url.includes("instagram.com")) {
    metadata.platform = "Instagram";
    
    // Extract Instagram shortcode from URL
    const shortcodeMatch = url.match(/\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
    const usernameUrlMatch = url.match(/instagram\.com\/([^\/\?]+)/);
    
    // Extract from meta tags - using more robust regex
    const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]*)"[^>]*>/i);
    const descMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]*)"[^>]*>/i);
    const imageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]*)"[^>]*>/i);
    
    // Also try twitter meta tags as fallback
    const twitterTitleMatch = html.match(/<meta\s+name="twitter:title"\s+content="([^"]*)"[^>]*>/i);
    const twitterDescMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"[^>]*>/i);
    
    if (titleMatch) {
      metadata.title = decodeHTMLEntities(titleMatch[1]);
    } else if (twitterTitleMatch) {
      metadata.title = decodeHTMLEntities(twitterTitleMatch[1]);
    }
    
    if (descMatch) {
      metadata.description = decodeHTMLEntities(descMatch[1]);
    } else if (twitterDescMatch) {
      metadata.description = decodeHTMLEntities(twitterDescMatch[1]);
    }
    
    if (imageMatch) metadata.thumbnailUrl = imageMatch[1];
    
    // Extract username and real name from title or description
    if (metadata.title) {
      // Instagram titles often have format: "Name (@username) • Instagram reel"
      const userMatch = metadata.title.match(/([^(]+)\s*\(@([^)]+)\)/);
      if (userMatch) {
        metadata.author = `@${userMatch[2]}`;
        metadata.metadata = { ...metadata.metadata, realName: userMatch[1].trim() };
      } else {
        // Fallback to URL
        const usernameMatch = url.match(/instagram\.com\/([^\/]+)/);
        if (usernameMatch && usernameMatch[1] !== 'reel' && usernameMatch[1] !== 'p') {
          metadata.author = `@${usernameMatch[1]}`;
        }
      }
    }
    
    // Extract hashtags from description
    if (metadata.description) {
      const hashtags = metadata.description.match(/#\w+/g);
      if (hashtags) {
        metadata.metadata = { ...metadata.metadata, hashtags };
      }
    }
    
    // Determine content type
    if (url.includes("/reel/")) metadata.contentType = "Reel";
    else if (url.includes("/p/")) metadata.contentType = "Post";
    else if (url.includes("/stories/")) metadata.contentType = "Story";
    
    // Fallback for Instagram when meta tags are missing
    if (!metadata.title || metadata.title === "Instagram") {
      if (shortcodeMatch) {
        const contentType = shortcodeMatch[1];
        const shortcode = shortcodeMatch[2];
        
        if (contentType === 'reel') {
          metadata.title = `Instagram Reel`;
          metadata.description = `View this Instagram Reel (${shortcode}). Note: Full content details require visiting Instagram directly.`;
        } else if (contentType === 'p') {
          metadata.title = `Instagram Post`;
          metadata.description = `View this Instagram Post (${shortcode}). Note: Full content details require visiting Instagram directly.`;
        }
        
        // Add shortcode to metadata for reference
        metadata.metadata = { ...metadata.metadata, shortcode, requiresDirectAccess: true };
      }
      
      // Try to set a username if we found one in URL
      if (!metadata.author && usernameUrlMatch && usernameUrlMatch[1] !== 'reel' && usernameUrlMatch[1] !== 'p') {
        metadata.author = `@${usernameUrlMatch[1]}`;
      }
    }
    
  } else if (url.includes("tiktok.com")) {
    metadata.platform = "TikTok";
    metadata.contentType = "Video";
  } else if (url.includes("youtube.com") || url.includes("youtu.be")) {
    metadata.platform = "YouTube";
    metadata.contentType = "Video";
  } else if (url.includes("twitter.com") || url.includes("x.com")) {
    metadata.platform = "Twitter/X";
    metadata.contentType = "Tweet";
  } else {
    metadata.platform = "Website";
    metadata.contentType = "Article";
  }
  
  // Generic meta tag extraction as fallback
  if (!metadata.title) {
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    if (titleMatch) metadata.title = decodeHTMLEntities(titleMatch[1]);
  }
  
  if (!metadata.description) {
    const descMatch = html.match(/<meta name="description" content="([^"]+)"/);
    if (descMatch) metadata.description = decodeHTMLEntities(descMatch[1]);
  }
  
  return metadata;
}

// Decode HTML entities - improved to handle all numeric entities
function decodeHTMLEntities(text: string): string {
  if (!text) return text;
  
  // First decode common named entities
  const namedEntities: Record<string, string> = {
    '&quot;': '"',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&nbsp;': ' ',
    '&apos;': "'",
    '&#39;': "'",
  };
  
  let decoded = text;
  
  // Replace named entities
  Object.keys(namedEntities).forEach(entity => {
    decoded = decoded.replace(new RegExp(entity, 'g'), namedEntities[entity]);
  });
  
  // Handle decimal numeric entities (&#123;)
  decoded = decoded.replace(/&#(\d+);/g, (match, dec) => {
    return String.fromCharCode(parseInt(dec, 10));
  });
  
  // Handle hexadecimal numeric entities (&#x1F4BC;)
  decoded = decoded.replace(/&#x([0-9A-Fa-f]+);/g, (match, hex) => {
    const codePoint = parseInt(hex, 16);
    // Handle Unicode characters including emojis
    return String.fromCodePoint(codePoint);
  });
  
  return decoded;
}

// Extract insights from Instagram reel description - enhanced version
export function extractInsightsFromContent(content: string): {
  mainTopic?: string;
  keyPoints: string[];
  mentionedTools: string[];
  actionItems: string[];
} {
  const insights = {
    keyPoints: [] as string[],
    mentionedTools: [] as string[],
    actionItems: [] as string[],
  };
  
  // Extract mentioned tools and platforms (improved pattern)
  const toolPatterns = [
    /\b(n8n|zapier|make|ifttt|integromat)\b/gi,
    /\b(linkedin|indeed|gmail|notion|slack|github|docker)\b/gi,
    /\b(openai|chatgpt|claude|gemini|copilot)\b/gi,
    /(https?:\/\/[^\s]+|www\.[^\s]+)/g,
  ];
  
  toolPatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      insights.mentionedTools.push(...matches.map(m => m.toLowerCase()));
    }
  });
  
  // Remove duplicates
  insights.mentionedTools = [...new Set(insights.mentionedTools)];
  
  // Extract key points (sentences with keywords)
  const importantKeywords = [
    'automat', 'no code', 'zero coding', 'productivity', 'efficiency',
    'job hunt', 'job search', 'application', 'workflow', 'integration',
    'tip', 'hack', 'tool', 'website', 'app', 'service', 'feature',
    'how to', 'use', 'create', 'build', 'repo', 'repository', 'open source'
  ];
  
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
  
  sentences.forEach(sentence => {
    const lower = sentence.toLowerCase();
    if (importantKeywords.some(keyword => lower.includes(keyword))) {
      const cleaned = sentence.trim().replace(/\s+/g, ' ');
      if (cleaned.length > 15) { // Only include meaningful sentences
        insights.keyPoints.push(cleaned);
      }
    }
  });
  
  // Extract action items (imperatives and calls to action)
  const actionPatterns = [
    /comment\s+\w+\s+and\s+i['']?ll/gi,
    /drop\s+a?\s+\w+\s+below/gi,
    /dm\s+me\s+for/gi,
    /click\s+the\s+link/gi,
    /check\s+out/gi,
    /try\s+\w+/gi,
    /download\s+\w+/gi,
    /get\s+started/gi,
  ];
  
  actionPatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      insights.actionItems.push(...matches);
    }
  });
  
  // Also check for sentences starting with action words
  const actionWords = ['try', 'use', 'check', 'visit', 'download', 'install', 'create', 'build', 'make', 'automate'];
  sentences.forEach(sentence => {
    const lower = sentence.toLowerCase().trim();
    if (actionWords.some(word => lower.startsWith(word))) {
      insights.actionItems.push(sentence.trim());
    }
  });
  
  // Remove duplicates from action items
  insights.actionItems = [...new Set(insights.actionItems)];
  
  // Determine main topic based on content
  const lower = content.toLowerCase();
  if (lower.includes('n8n') || lower.includes('automation') || lower.includes('workflow')) {
    insights.mainTopic = 'Workflow Automation';
  } else if (lower.includes('job') && (lower.includes('hunt') || lower.includes('search') || lower.includes('application'))) {
    insights.mainTopic = 'Job Search Automation';
  } else if (lower.includes('ai') || lower.includes('gpt') || lower.includes('llm')) {
    insights.mainTopic = 'AI Tools';
  } else if (lower.includes('google') && lower.includes('business')) {
    insights.mainTopic = 'Local SEO / Google Business';
  } else if (lower.includes('website') || lower.includes('web')) {
    insights.mainTopic = 'Web Tools';
  } else if (lower.includes('productivity') || lower.includes('efficiency')) {
    insights.mainTopic = 'Productivity Tools';
  }
  
  return insights;
}

// Process any URL and extract structured content
export async function processURL(url: string): Promise<{
  extracted: ExtractedContent;
  insights: any;
  aiAnalysis?: any;
}> {
  try {
    // Fetch the URL content
    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    
    const html = await response.text();
    
    // Extract metadata
    const extracted = extractMetadataFromHTML(html, url);
    
    // Extract insights from content
    const insights = extractInsightsFromContent(
      `${extracted.title || ''} ${extracted.description || ''}`
    );
    
    // Get AI analysis if we have content
    let aiAnalysis;
    if (extracted.title || extracted.description) {
      try {
        aiAnalysis = await analyzeContent(
          extracted.title || 'Social Media Content',
          extracted.description,
          url
        );
      } catch (error) {
        console.error('AI analysis failed:', error);
      }
    }
    
    return {
      extracted,
      insights,
      aiAnalysis,
    };
  } catch (error) {
    console.error('URL processing failed:', error);
    throw error;
  }
}

// Categorize content based on description
export function categorizeContent(description: string): {
  category: string;
  subcategory?: string;
  confidence: number;
} {
  const lower = description.toLowerCase();
  
  const categories = [
    {
      name: 'AI_AGENTS',
      keywords: ['ai', 'artificial intelligence', 'gpt', 'chatgpt', 'llm', 'machine learning', 'neural', 'openai', 'claude', 'gemini', 'copilot'],
      confidence: 0,
    },
    {
      name: 'RASPBERRY_PI',
      keywords: ['raspberry pi', 'gpio', 'sensor', 'arduino', 'microcontroller', 'iot', 'embedded'],
      confidence: 0,
    },
    {
      name: 'PRINTER_3D',
      keywords: ['3d print', '3d printer', 'filament', 'pla', 'abs', 'stl', 'cad', 'fusion 360', 'prusa'],
      confidence: 0,
    },
    {
      name: 'SOFTWARE',
      keywords: ['github', 'repository', 'repo', 'open source', 'code', 'programming', 'developer', 'software', 'library', 'framework'],
      confidence: 0,
    },
    {
      name: 'AUTOMATION',
      keywords: ['automation', 'n8n', 'zapier', 'make', 'integromat', 'workflow', 'no code', 'low code', 'integration', 'api', 'webhook', 'job automation'],
      confidence: 0,
    },
    {
      name: 'WEB_TOOLS',
      keywords: ['website', 'web app', 'online tool', 'saas', 'browser', 'chrome extension', 'web service'],
      confidence: 0,
    },
    {
      name: 'PRODUCTIVITY',
      keywords: ['productivity', 'notion', 'efficiency', 'time management', 'task', 'organize', 'slack', 'email'],
      confidence: 0,
    },
    {
      name: 'MARKETING',
      keywords: ['seo', 'marketing', 'google business', 'social media', 'growth', 'traffic', 'conversion', 'linkedin', 'indeed'],
      confidence: 0,
    },
  ];
  
  // Calculate confidence for each category
  categories.forEach(cat => {
    cat.keywords.forEach(keyword => {
      if (lower.includes(keyword)) {
        cat.confidence += 1;
      }
    });
  });
  
  // Sort by confidence
  categories.sort((a, b) => b.confidence - a.confidence);
  
  if (categories[0].confidence > 0) {
    return {
      category: categories[0].name,
      confidence: Math.min(categories[0].confidence / 3, 1), // Normalize to 0-1
    };
  }
  
  return {
    category: 'OTHER',
    confidence: 0.5,
  };
} 
