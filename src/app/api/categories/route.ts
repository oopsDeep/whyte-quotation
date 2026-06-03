import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_DEPTH = 3;

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { level: 1 },
      include: {
        children: {
          include: {
            children: true,
          },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json(categories);
  } catch {
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { name, level, parentId, sortOrder } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (typeof level !== "number" || level < 1 || level > MAX_DEPTH) {
      return NextResponse.json({ error: `Level must be between 1 and ${MAX_DEPTH}` }, { status: 400 });
    }

    // L1 must have no parent
    if (level === 1 && parentId) {
      return NextResponse.json({ error: "Series (level 1) cannot have a parent" }, { status: 400 });
    }

    // L2+ must have a parent
    if (level > 1 && !parentId) {
      return NextResponse.json({ error: `Level ${level} category requires a parent` }, { status: 400 });
    }

    // Validate parent exists and level is consistent
    if (parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: parentId },
        select: { level: true },
      });
      if (!parent) {
        return NextResponse.json({ error: "Parent category not found" }, { status: 400 });
      }
      if (parent.level !== level - 1) {
        return NextResponse.json(
          { error: `Level mismatch: parent is level ${parent.level}, child must be level ${parent.level + 1}` },
          { status: 400 }
        );
      }
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        level,
        parentId: parentId ?? null,
        sortOrder: sortOrder ?? 0,
        variantTiers: body.variantTiers ?? [],
        variantFinishes: body.variantFinishes ?? [],
      },
    });
    return NextResponse.json(category, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
