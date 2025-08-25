import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const tag = searchParams.get("tag") ?? undefined; // single tag name
  const favorite = searchParams.get("favorite");
  const archived = searchParams.get("archived");
  const sort = (searchParams.get("sort") ?? "newest").toLowerCase();

  const where: Prisma.ExploreItemWhereInput = {
    AND: [
      q
        ? {
            OR: [
              { title: { contains: q } },
              { description: { contains: q } },
              { notes: { contains: q } }
            ],
          }
        : {},
      status ? { status: status as any } : {},
      category ? { category: { name: category } } : {},
      favorite != null ? { isFavorite: favorite === "true" } : {},
      archived != null ? { isArchived: archived === "true" } : { isArchived: false },
      tag
        ? {
            tags: {
              some: {
                tag: { name: { equals: tag } },
              },
            },
          }
        : {},
    ],
  };

  let orderBy: Prisma.ExploreItemOrderByWithRelationInput | Prisma.ExploreItemOrderByWithRelationInput[] = { createdAt: "desc" };
  if (sort === "oldest") orderBy = { createdAt: "asc" };
  else if (sort === "title") orderBy = { title: "asc" };

  const items = await prisma.exploreItem.findMany({
    where,
    include: {
      category: true,
      links: true,
      tags: { include: { tag: true } },
    },
    orderBy,
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    title,
    description,
    primaryUrl,
    notes,
    status = "PLANNED",
    category = "OTHER",
    isFavorite = false,
    links = [], // [{url,label,kind}]
    tags = [], // ["tag1", "tag2"]
  } = body ?? {};

  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const created = await prisma.$transaction(async (tx) => {
    // Handle category - create if it doesn't exist
    let categoryId = null;
    if (category) {
      const categoryRecord = await tx.category.upsert({
        where: { name: category },
        create: { 
          name: category,
          description: `Auto-created category: ${category}`
        },
        update: {}
      });
      categoryId = categoryRecord.id;
    }

    const item = await tx.exploreItem.create({
      data: {
        title,
        description,
        primaryUrl,
        notes,
        status,
        categoryId,
        isFavorite,
      },
    });

    if (Array.isArray(links) && links.length > 0) {
      await tx.link.createMany({
        data: links
          .filter((l: any) => l && l.url)
          .map((l: any) => ({
            url: String(l.url),
            label: l.label ? String(l.label) : null,
            kind: l.kind ? String(l.kind) : null,
            itemId: item.id,
          }))
      });
    }

    if (Array.isArray(tags) && tags.length > 0) {
      for (const name of tags) {
        const tagName = String(name).trim();
        if (!tagName) continue;
        const t = await tx.tag.upsert({
          where: { name: tagName },
          update: {},
          create: { name: tagName },
        });
        await tx.exploreItemTag.create({ data: { itemId: item.id, tagId: t.id } });
      }
    }

    return await tx.exploreItem.findUnique({
      where: { id: item.id },
      include: { category: true, links: true, tags: { include: { tag: true } } },
    });
  });

  return NextResponse.json(created, { status: 201 });
} 
