import { NextRequest, NextResponse } from "next/server";
import { analyzeContent } from "@/lib/azure-openai";

export async function POST(req: NextRequest) {
  try {
    const { title, description, url } = await req.json();
    
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const analysis = await analyzeContent(title, description, url);
    return NextResponse.json(analysis);
  } catch (error) {
    console.error("AI analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze content" },
      { status: 500 }
    );
  }
} 
