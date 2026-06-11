import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Build a human-readable label from a variant config object.
 * Works for any number of dimensions.
 * Examples: "WiFi + Glass", "Zigbee", "Metal", null (for empty/flat config)
 */
function buildVariantLabel(config: Record<string, string>): string | null {
  const parts = Object.values(config).filter(Boolean);
  if (parts.length === 0) return null;
  return parts.map((v) => v.charAt(0).toUpperCase() + v.slice(1)).join(" + ");
}

/**
 * Check if two config objects match.
 * Returns true if all keys in `defaults` are present and equal in `variantConfig`.
 * Keys absent in defaults are ignored (partial match allowed).
 */
function configMatchesDefaults(
  variantConfig: Record<string, string>,
  defaults: Record<string, string>
): boolean {
  return Object.entries(defaults).every(
    ([key, val]) => val && variantConfig[key] === val
  );
}

export async function POST(req: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const body = await req.json();
    const { quotationRoomId, productId, productVariantId, variantConfig: clientConfig, quantity = 1, sbNumber, notes } = body;

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

    // Get the product with its active variants
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

    // Resolve which variant to use
    let selectedVariant: (typeof product.variants)[0] | undefined;

    if (productVariantId) {
      // Client explicitly picked a variant ID
      selectedVariant = product.variants.find((v) => v.id === Number(productVariantId));
      if (!selectedVariant) {
        return NextResponse.json(
          { error: "Selected variant not found or inactive" },
          { status: 400 }
        );
      }
    } else if (clientConfig && typeof clientConfig === "object" && Object.keys(clientConfig).length > 0) {
      // Client sent a config object — find the exact matching variant
      selectedVariant = product.variants.find((v) => {
        const vc = (v.config as Record<string, string>) ?? {};
        return configMatchesDefaults(vc, clientConfig as Record<string, string>)
          && Object.keys(vc).length === Object.keys(clientConfig as object).length;
      });
      if (!selectedVariant) {
        return NextResponse.json(
          { error: "No variant found matching the provided config" },
          { status: 400 }
        );
      }
    } else if (product.variants.length === 1) {
      // Single variant (flat product) — auto-select
      selectedVariant = product.variants[0];
    } else {
      // Multiple variants, no explicit pick — try matching quotation defaults
      const quotation = await prisma.quotation.findUnique({
        where: { id },
        select: { defaultTier: true, defaultFinish: true },
      });

      if (quotation?.defaultTier || quotation?.defaultFinish) {
        // Build a defaults config from legacy tier/finish columns
        const defaults: Record<string, string> = {};
        if (quotation.defaultTier) defaults.series = quotation.defaultTier;
        if (quotation.defaultFinish) defaults.finish = quotation.defaultFinish;

        selectedVariant = product.variants.find((v) => {
          const vc = (v.config as Record<string, string>) ?? {};
          // Try matching via new config
          if (Object.keys(vc).length > 0) {
            return configMatchesDefaults(vc, defaults);
          }
          // Fallback: match via legacy columns
          return (
            (!quotation.defaultTier || v.automationTier === quotation.defaultTier) &&
            (!quotation.defaultFinish || v.surfaceFinish === quotation.defaultFinish)
          );
        });
      }

      // If still no match, return 422 so frontend shows variant picker
      if (!selectedVariant) {
        return NextResponse.json(
          {
            error: "Multiple variants available — please specify productVariantId",
            requiresPicker: true,
            variants: product.variants.map((v) => ({
              id: v.id,
              config: v.config,
              automationTier: v.automationTier,
              surfaceFinish: v.surfaceFinish,
              price: v.price,
              label: buildVariantLabel((v.config as Record<string, string>) ?? {}),
            })),
          },
          { status: 422 }
        );
      }
    }

    const variantConfig = (selectedVariant.config as Record<string, string>) ?? {};
    const variantLabel = buildVariantLabel(variantConfig)
      // Fallback to legacy label for old variants that haven't been migrated
      ?? (selectedVariant.automationTier || selectedVariant.surfaceFinish
        ? [selectedVariant.automationTier, selectedVariant.surfaceFinish]
            .filter(Boolean)
            .map((s) => s!.charAt(0).toUpperCase() + s!.slice(1))
            .join(" + ") || null
        : null);

    const item = await prisma.quotationItem.create({
      data: {
        quotationRoomId: Number(quotationRoomId),
        productId: Number(productId),
        productVariantId: selectedVariant.id,
        quantity: Math.max(1, Number(quantity)),
        unitPrice: selectedVariant.price,
        variantLabel,
        variantConfig: Object.keys(variantConfig).length > 0 ? (variantConfig as any) : Prisma.DbNull,
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
