import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
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
    const productId = Number(id);
    if (!Number.isFinite(productId)) {
      return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
    }

    const body = await req.json();

    // Whitelist updatable fields to prevent accidental overwrites.
    const allowedFields = [
      "name",
      "code",
      "description",
      "type",
      "categoryId",
      "price",
      "unit",
      "imageUrl",
      "notes",
      "isActive",
      "sortOrder",
    ] as const;

    const data: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        data[field] = body[field];
      }
    }

    if (data.price !== undefined) {
      const nextPrice = Number(data.price);
      if (!Number.isFinite(nextPrice) || nextPrice < 0) {
        return NextResponse.json({ error: "Price must be a valid non-negative number" }, { status: 400 });
      }
      data.price = nextPrice;
    }

    if (data.sortOrder !== undefined) {
      const nextSortOrder = Number(data.sortOrder);
      if (!Number.isFinite(nextSortOrder)) {
        return NextResponse.json({ error: "sortOrder must be a valid number" }, { status: 400 });
      }
      data.sortOrder = nextSortOrder;
    }

    if (data.categoryId !== undefined) {
      const rawCategoryId = data.categoryId;
      if (rawCategoryId === null || rawCategoryId === "") {
        data.categoryId = null;
      } else {
        const nextCategoryId = Number(rawCategoryId);
        if (!Number.isFinite(nextCategoryId)) {
          return NextResponse.json({ error: "Invalid category id" }, { status: 400 });
        }

        const category = await prisma.category.findUnique({
          where: { id: nextCategoryId },
          select: { id: true, isActive: true },
        });

        if (!category) {
          return NextResponse.json({ error: "Selected category does not exist" }, { status: 400 });
        }

        if (!category.isActive) {
          return NextResponse.json({ error: "Selected category is inactive" }, { status: 400 });
        }

        data.categoryId = nextCategoryId;
      }
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data,
    });
    return NextResponse.json(product);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2025") {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }
      if (e.code === "P2003") {
        return NextResponse.json({ error: "Invalid category reference" }, { status: 400 });
      }
    }

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
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }

      if (error.code === "P2003") {
        return NextResponse.json(
          {
            error:
              "Cannot delete this product because it is used in one or more quotations. Deactivate it instead.",
          },
          { status: 400 }
        );
      }
    }

    console.error("DELETE /api/products/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
