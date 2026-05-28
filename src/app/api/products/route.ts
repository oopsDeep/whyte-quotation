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
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: "Price must be a valid non-negative number" }, { status: 400 });
    }

    let categoryId: number | null = null;
    if (body.categoryId !== undefined && body.categoryId !== null && body.categoryId !== "") {
      categoryId = Number(body.categoryId);
      if (!Number.isFinite(categoryId)) {
        return NextResponse.json({ error: "Invalid category id" }, { status: 400 });
      }

      const category = await prisma.category.findUnique({
        where: { id: categoryId },
        select: { id: true, isActive: true },
      });

      if (!category) {
        return NextResponse.json({ error: "Selected category does not exist" }, { status: 400 });
      }

      if (!category.isActive) {
        return NextResponse.json({ error: "Selected category is inactive" }, { status: 400 });
      }
    }

    // Ensure price and category are validated before create
    const product = await prisma.product.create({
      data: {
        ...body,
        price,
        categoryId,
      },
    });
    return NextResponse.json(product, { status: 201 });
  } catch (e) {
    console.error("POST /api/products error:", e);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
