import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }
    
    // Use yt-dlp to extract metadata
    // --dump-json gets metadata without downloading
    // --no-warnings suppresses warnings
    // --no-playlist ensures we only get single video info
    const command = `yt-dlp --dump-json --no-warnings --no-playlist "${url}"`;
    
    try {
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr && !stderr.includes('WARNING')) {
        console.error('yt-dlp stderr:', stderr);
      }
      
      const metadata = JSON.parse(stdout);
      
      // Extract relevant fields from yt-dlp output
      const extracted = {
        title: metadata.title || metadata.fulltitle || 'Untitled',
        description: metadata.description || '',
        author: metadata.uploader || metadata.channel || metadata.creator || '',
        platform: metadata.extractor || 'Unknown',
        duration: metadata.duration,
        viewCount: metadata.view_count,
        likeCount: metadata.like_count,
        commentCount: metadata.comment_count,
        uploadDate: metadata.upload_date,
        thumbnailUrl: metadata.thumbnail,
        tags: metadata.tags || [],
        categories: metadata.categories || [],
        webpage_url: metadata.webpage_url || url,
        format: metadata.format || metadata.ext,
        // Instagram specific fields
        ...(metadata.extractor === 'Instagram' && {
          mediaType: metadata._type || 'video',
          timestamp: metadata.timestamp,
        }),
        // YouTube specific fields
        ...(metadata.extractor === 'youtube' && {
          channelId: metadata.channel_id,
          channelUrl: metadata.channel_url,
        }),
        // Store full metadata for reference
        fullMetadata: metadata
      };
      
      return NextResponse.json({
        success: true,
        extracted,
        url: metadata.webpage_url || url
      });
      
    } catch (execError: any) {
      // Check if yt-dlp is installed
      if (execError.message.includes('command not found')) {
        return NextResponse.json({
          error: "yt-dlp is not installed. Please install it first: brew install yt-dlp",
          details: execError.message
        }, { status: 500 });
      }
      
      // Check if it's an unsupported URL
      if (execError.message.includes('Unsupported URL') || execError.message.includes('ERROR')) {
        return NextResponse.json({
          error: "Could not extract metadata from this URL",
          details: execError.message,
          fallback: true
        }, { status: 400 });
      }
      
      throw execError;
    }
    
  } catch (error) {
    console.error('Metadata extraction error:', error);
    return NextResponse.json(
      { 
        error: "Failed to extract metadata",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 
