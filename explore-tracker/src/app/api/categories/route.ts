import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { items: true }
        }
      }
    });
    
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, description } = await req.json();
    
    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      );
    }
    
    const category = await prisma.category.create({
      data: {
        name: name.trim().toUpperCase().replace(/\s+/g, '_'),
        description: description || `Category: ${name}`
      }
    });
    
    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: "Category already exists" },
        { status: 409 }
      );
    }
    
    console.error('Failed to create category:', error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
} 
