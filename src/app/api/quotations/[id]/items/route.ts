import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Build a human-readable label from variant dimensions.
 * Examples: "WiFi + Glass", "Zigbee", "Metal", null (for single-price)
 */
function buildVariantLabel(tier: string | null, finish: string | null): string | null {
  const parts: string[] = [];
  if (tier) parts.push(tier.charAt(0).toUpperCase() + tier.slice(1));
  if (finish) parts.push(finish.charAt(0).toUpperCase() + finish.slice(1));
  return parts.length > 0 ? parts.join(" + ") : null;
}

export async function POST(req: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const body = await req.json();
    const { quotationRoomId, productId, productVariantId, quantity = 1, sbNumber, notes } = body;

    // Validate required fields
    if (!quotationRoomId || !productId) {
      return NextResponse.json(
        { error: "quotationRoomId and productId are required" },
        { status: 400 }
      );
    }

    // Verify the room belongs to this quotation
    const room = await prisma.quotationRoom.findFirst({
      where: { id: Number(quotationRoomId), quotationId: id },
    });
    if (!room) {
      return NextResponse.json(
        { error: "Room not found for this quotation" },
        { status: 404 }
      );
    }

    // Get the product with its variants
    const product = await prisma.product.findUnique({
      where: { id: Number(productId) },
      include: { variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    if (!product.isActive) {
      return NextResponse.json(
        { error: "Product is no longer active" },
        { status: 400 }
      );
    }
    if (product.variants.length === 0) {
      return NextResponse.json(
        { error: "Product has no pricing variants configured" },
        { status: 400 }
      );
    }

    // Resolve the variant to use for price snapshot
    let selectedVariant;

    if (productVariantId) {
      // Client explicitly picked a variant
      selectedVariant = product.variants.find((v) => v.id === Number(productVariantId));
      if (!selectedVariant) {
        return NextResponse.json(
          { error: "Selected variant not found or inactive" },
          { status: 400 }
        );
      }
    } else if (product.variants.length === 1) {
      // Single variant — auto-select
      selectedVariant = product.variants[0];
    } else {
      // Multiple variants, no explicit pick — try matching quotation defaults
      const quotation = await prisma.quotation.findUnique({
        where: { id },
        select: { defaultTier: true, defaultFinish: true },
      });

      if (quotation?.defaultTier || quotation?.defaultFinish) {
        selectedVariant = product.variants.find(
          (v) =>
            (quotation.defaultTier ? v.automationTier === quotation.defaultTier : v.automationTier === null) &&
            (quotation.defaultFinish ? v.surfaceFinish === quotation.defaultFinish : v.surfaceFinish === null)
        );
      }

      // If still no match, return error — frontend should show variant picker
      if (!selectedVariant) {
        return NextResponse.json(
          {
            error: "Multiple variants available — please specify productVariantId",
            variants: product.variants.map((v) => ({
              id: v.id,
              automationTier: v.automationTier,
              surfaceFinish: v.surfaceFinish,
              price: v.price,
              label: buildVariantLabel(v.automationTier, v.surfaceFinish),
            })),
          },
          { status: 422 }
        );
      }
    }

    const variantLabel = buildVariantLabel(selectedVariant.automationTier, selectedVariant.surfaceFinish);

    const item = await prisma.quotationItem.create({
      data: {
        quotationRoomId: Number(quotationRoomId),
        productId: Number(productId),
        productVariantId: selectedVariant.id,
        quantity: Math.max(1, Number(quantity)),
        unitPrice: selectedVariant.price, // Price snapshot from the variant
        variantLabel,
        sbNumber: sbNumber?.trim() || null,
        notes: notes?.trim() || null,
        sortOrder: 0,
      },
      include: {
        product: { include: { variants: { where: { isActive: true } } } },
        productVariant: true,
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (e) {
    console.error("POST /api/quotations/[id]/items:", e);
    return NextResponse.json({ error: "Failed to add item" }, { status: 500 });
  }
}
