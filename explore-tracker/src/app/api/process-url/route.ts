import { NextRequest, NextResponse } from "next/server";
import { extractMetadataFromHTML, extractInsightsFromContent, categorizeContent } from "@/lib/content-extractor";
import { analyzeContent } from "@/lib/azure-openai";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }
    
    let extracted: any = {};
    let useYtDlp = false;
    
    // Try yt-dlp first for supported platforms
    if (url.includes('instagram.com') || url.includes('youtube.com') || url.includes('youtu.be') || 
        url.includes('tiktok.com') || url.includes('twitter.com') || url.includes('x.com')) {
      try {
        const ytDlpResponse = await fetch(new URL('/api/extract-metadata', req.url).toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        
        if (ytDlpResponse.ok) {
          const ytDlpData = await ytDlpResponse.json();
          if (ytDlpData.success) {
            extracted = {
              title: ytDlpData.extracted.title,
              description: ytDlpData.extracted.description,
              author: ytDlpData.extracted.author,
              platform: ytDlpData.extracted.platform,
              thumbnailUrl: ytDlpData.extracted.thumbnailUrl,
              metadata: {
                tags: ytDlpData.extracted.tags,
                viewCount: ytDlpData.extracted.viewCount,
                likeCount: ytDlpData.extracted.likeCount,
                uploadDate: ytDlpData.extracted.uploadDate,
                duration: ytDlpData.extracted.duration,
              }
            };
            useYtDlp = true;
          }
        }
      } catch (ytDlpError) {
        console.log('yt-dlp extraction failed, falling back to HTML parsing:', ytDlpError);
      }
    }
    
    // Fallback to HTML extraction if yt-dlp didn't work
    if (!useYtDlp) {
      // Fetch the URL content through our proxy
      const proxyResponse = await fetch(new URL('/api/proxy', req.url).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      
      if (!proxyResponse.ok) {
        throw new Error('Failed to fetch URL content');
      }
      
      const html = await proxyResponse.text();
      
      // Extract metadata from HTML
      extracted = extractMetadataFromHTML(html, url);
    }
    
    // Extract insights from content
    const insights = extractInsightsFromContent(
      `${extracted.title || ''} ${extracted.description || ''}`
    );
    
    // Categorize content
    const categorization = categorizeContent(extracted.description || '');
    
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
    
    // Combine everything
    const result = {
      url,
      extracted,
      insights,
      categorization,
      aiAnalysis,
      suggestedData: {
        title: extracted.title || aiAnalysis?.summary || 'Untitled',
        description: extracted.description || aiAnalysis?.summary,
        category: aiAnalysis?.category || categorization.category || 'OTHER',
        tags: [
          ...(aiAnalysis?.tags || []),
          ...(insights.mentionedTools.slice(0, 2).map((tool: string) => 
            tool.replace(/https?:\/\//, '').split('/')[0].split('.')[0]
          )),
          extracted.platform?.toLowerCase(),
          extracted.contentType?.toLowerCase(),
        ].filter((tag, index, self) => tag && self.indexOf(tag) === index), // Remove duplicates and empty
        primaryUrl: url,
        links: insights.mentionedTools.filter((tool: string) => tool !== url).map((tool: string) => ({
          url: tool,
          label: tool.replace(/https?:\/\//, '').split('/')[0],
        })),
        status: 'PLANNED',
        notes: insights.keyPoints.join('\n'),
      },
    };
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('URL processing error:', error);
    return NextResponse.json(
      { error: "Failed to process URL" },
      { status: 500 }
    );
  }
} 
