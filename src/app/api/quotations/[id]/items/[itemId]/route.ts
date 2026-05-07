import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string; itemId: string }> };

export async function PATCH(req: Request, context: RouteContext) {
  const { id, itemId } = await context.params;
  try {
    const existingItem = await prisma.quotationItem.findFirst({
      where: { id: Number(itemId), room: { quotationId: id } },
      select: { id: true },
    });

    if (!existingItem) {
      return NextResponse.json({ error: "Item not found for this quotation" }, { status: 404 });
    }

    const body = await req.json();

    // Whitelist updatable fields
    const data: Record<string, unknown> = {};
    if (body.quantity !== undefined) {
      data.quantity = Math.max(1, Number(body.quantity)); // Minimum qty = 1
    }
    if ("sbNumber" in body) {
      data.sbNumber = body.sbNumber?.trim() || null;
    }
    if ("notes" in body) {
      data.notes = body.notes?.trim() || null;
    }
    if (body.unitPrice !== undefined) {
      data.unitPrice = Number(body.unitPrice);
    }
    if (body.sortOrder !== undefined) {
      data.sortOrder = Number(body.sortOrder);
    }
    if (body.quotationRoomId !== undefined) {
      const nextRoomId = Number(body.quotationRoomId);
      const roomExists = await prisma.quotationRoom.findFirst({
        where: { id: nextRoomId, quotationId: id },
        select: { id: true },
      });

      if (!roomExists) {
        return NextResponse.json({ error: "Target room not found for this quotation" }, { status: 400 });
      }

      data.quotationRoomId = nextRoomId;
    }

    const item = await prisma.quotationItem.update({
      where: { id: Number(itemId) },
      data,
      include: { product: true },
    });
    return NextResponse.json(item);
  } catch (e) {
    console.error("PATCH /api/quotations/[id]/items/[itemId]:", e);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { id, itemId } = await context.params;
  try {
    const deleted = await prisma.quotationItem.deleteMany({
      where: { id: Number(itemId), room: { quotationId: id } },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: "Item not found for this quotation" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/quotations/[id]/items/[itemId]:", e);
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
