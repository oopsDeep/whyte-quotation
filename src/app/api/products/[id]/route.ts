import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const product = await prisma.product.findUnique({
      where: { id: Number(id) },
      include: {
        category: { include: { parent: { include: { parent: true } } } },
      },
    });
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(product);
  } catch {
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    // Coerce price and categoryId to correct types before update
    const data: Record<string, unknown> = { ...body };
    if (data.price !== undefined) data.price = Number(data.price);
    if (data.categoryId !== undefined) {
      data.categoryId = data.categoryId ? Number(data.categoryId) : null;
    }

    const product = await prisma.product.update({
      where: { id: Number(id) },
      data,
    });
    return NextResponse.json(product);
  } catch (e) {
    console.error("PATCH /api/products/[id] error:", e);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await prisma.product.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
