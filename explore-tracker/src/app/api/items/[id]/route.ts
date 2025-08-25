import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const item = await prisma.exploreItem.findUnique({
    where: { id },
    include: { links: true, tags: { include: { tag: true } } },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await req.json();
  const {
    title,
    description,
    primaryUrl,
    notes,
    status,
    category,
    isFavorite,
    isArchived,
    links,
    tags,
  } = body ?? {};

  const exists = await prisma.exploreItem.findUnique({ where: { id } });
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.$transaction(async (tx) => {
    await tx.exploreItem.update({
      where: { id },
      data: {
        title,
        description,
        primaryUrl,
        notes,
        status,
        category,
        isFavorite,
        isArchived,
      },
    });

    if (Array.isArray(links)) {
      await tx.link.deleteMany({ where: { itemId: id } });
      if (links.length > 0) {
        await tx.link.createMany({
          data: links
            .filter((l: any) => l && l.url)
            .map((l: any) => ({
              url: String(l.url),
              label: l.label ? String(l.label) : null,
              kind: l.kind ? String(l.kind) : null,
              itemId: id,
            }))
        });
      }
    }

    if (Array.isArray(tags)) {
      await tx.exploreItemTag.deleteMany({ where: { itemId: id } });
      for (const name of tags) {
        const tagName = String(name).trim();
        if (!tagName) continue;
        const t = await tx.tag.upsert({
          where: { name: tagName },
          update: {},
          create: { name: tagName },
        });
        await tx.exploreItemTag.create({ data: { itemId: id, tagId: t.id } });
      }
    }

    return await tx.exploreItem.findUnique({
      where: { id },
      include: { links: true, tags: { include: { tag: true } } },
    });
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await prisma.exploreItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
} 
