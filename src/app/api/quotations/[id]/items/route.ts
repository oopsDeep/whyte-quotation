import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const body = await req.json();
    const { quotationRoomId, productId, quantity = 1, sbNumber, notes } = body;

    // Validate required fields
    if (!quotationRoomId || !productId) {
      return NextResponse.json(
        { error: "quotationRoomId and productId are required" },
        { status: 400 }
      );
    }

    // Verify the room belongs to this quotation (prevents room hijacking)
    const room = await prisma.quotationRoom.findFirst({
      where: { id: Number(quotationRoomId), quotationId: id },
    });
    if (!room) {
      return NextResponse.json(
        { error: "Room not found for this quotation" },
        { status: 404 }
      );
    }

    // Get current product price as a price snapshot at time of adding
    const product = await prisma.product.findUnique({
      where: { id: Number(productId) },
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

    const item = await prisma.quotationItem.create({
      data: {
        quotationRoomId: Number(quotationRoomId),
        productId: Number(productId),
        quantity: Math.max(1, Number(quantity)),
        unitPrice: product.price, // Price snapshot — won't change if product price updates later
        sbNumber: sbNumber?.trim() || null,
        notes: notes?.trim() || null,
        sortOrder: 0,
      },
      include: { product: true },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (e) {
    console.error("POST /api/quotations/[id]/items:", e);
    return NextResponse.json({ error: "Failed to add item" }, { status: 500 });
  }
}
