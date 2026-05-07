import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/products
 * Query param: ?all=true  → returns all products (admin)
 * Default       → returns only active products (estimator)
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const showAll = searchParams.get("all") === "true";

  // Admin-only: showing all products requires auth
  if (showAll) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const products = await prisma.product.findMany({
      where: showAll ? undefined : { isActive: true },
      include: {
        category: {
          include: {
            parent: {
              include: { parent: true },
            },
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(products);
  } catch {
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    // Ensure price is stored as a number
    const product = await prisma.product.create({
      data: {
        ...body,
        price: Number(body.price),
        categoryId: body.categoryId ? Number(body.categoryId) : null,
      },
    });
    return NextResponse.json(product, { status: 201 });
  } catch (e) {
    console.error("POST /api/products error:", e);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
