import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const updateData: any = { name };
    if (body.variantTiers !== undefined) updateData.variantTiers = body.variantTiers;
    if (body.variantFinishes !== undefined) updateData.variantFinishes = body.variantFinishes;

    const category = await prisma.category.update({
      where: { id: Number(id) },
      data: updateData,
    });
    return NextResponse.json(category);
  } catch {
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const catId = Number(id);

    // Check for child categories
    const childCount = await prisma.category.count({
      where: { parentId: catId },
    });
    if (childCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete: this category has ${childCount} subcategories. Delete them first.` },
        { status: 400 }
      );
    }

    // Check for active products assigned to this category
    const productCount = await prisma.product.count({
      where: { categoryId: catId, isActive: true },
    });
    if (productCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${productCount} active products use this category` },
        { status: 400 }
      );
    }

    await prisma.category.delete({ where: { id: catId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
