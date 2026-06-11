import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/products
 * Query param: ?all=true  → returns all products (admin)
 * Default       → returns only active products (estimator)
 * Includes variants[] for each product.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const showAll = searchParams.get("all") === "true";

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
        variants: {
          where: showAll ? undefined : { isActive: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(products);
  } catch {
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

/**
 * POST /api/products
 * Body: { name, code, type, categoryId, unit, imageUrl, moduleSize, notes,
 *         isMatrix, matrixDimensions, variants[] }
 * variants: [{ config, price, automationTier?, surfaceFinish? }]
 *
 * For flat products (isMatrix=false): send one variant with config={}
 * For matrix products (isMatrix=true): send N variants each with config={key:value,...}
 *
 * Product.price is automatically set to min(variants[].price).
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { variants: variantsInput, isMatrix, matrixDimensions, ...productData } = body;

    // Validate variants — must have at least one
    const variants = Array.isArray(variantsInput) ? variantsInput : [];
    if (variants.length === 0) {
      return NextResponse.json({ error: "At least one pricing variant is required" }, { status: 400 });
    }

    // Validate all variant prices
    for (const v of variants) {
      const price = Number(v.price);
      if (!Number.isFinite(price) || price < 0) {
        return NextResponse.json({ error: "All variant prices must be valid non-negative numbers" }, { status: 400 });
      }
    }

    // Compute min price for the product (used for "From ₹X" display)
    const minPrice = Math.min(...variants.map((v: { price: unknown }) => Number(v.price)));

    // Validate categoryId
    let categoryId: number | null = null;
    if (productData.categoryId !== undefined && productData.categoryId !== null && productData.categoryId !== "") {
      categoryId = Number(productData.categoryId);
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

    // Create product + variants in a transaction
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: productData.name,
          code: productData.code || null,
          description: productData.description || null,
          type: productData.type,
          categoryId,
          price: minPrice,
          unit: productData.unit || "pcs",
          imageUrl: productData.imageUrl || null,
          moduleSize: productData.moduleSize || null,
          notes: productData.notes || null,
          sortOrder: productData.sortOrder ?? 0,
          isActive: productData.isActive ?? true,
          isMatrix: Boolean(isMatrix),
          matrixDimensions: isMatrix && Array.isArray(matrixDimensions) ? (matrixDimensions as any) : Prisma.DbNull,
        },
      });

      // Create variant rows
      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        await tx.productVariant.create({
          data: {
            productId: created.id,
            automationTier: v.automationTier || null,
            surfaceFinish: v.surfaceFinish || null,
            config: v.config ?? {},
            price: Number(v.price),
            sortOrder: i,
            isActive: true,
          },
        });
      }

      return tx.product.findUnique({
        where: { id: created.id },
        include: { variants: { orderBy: { sortOrder: "asc" } } },
      });
    });

    return NextResponse.json(product, { status: 201 });
  } catch (e) {
    console.error("POST /api/products error:", e);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
