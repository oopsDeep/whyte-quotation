import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string; roomId: string }> };

export async function PATCH(req: Request, context: RouteContext) {
  const { id, roomId } = await context.params;
  try {
    const body = await req.json();
    console.log("[ROOM PATCH] id:", id, "roomId:", roomId, "body:", body);

    const existingRoom = await prisma.quotationRoom.findFirst({
      where: { id: Number(roomId), quotationId: id },
      select: { id: true },
    });

    if (!existingRoom) {
      console.error("[ROOM PATCH] Room not found");
      return NextResponse.json({ error: "Room not found for this quotation" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if ("roomTypeId" in body) {
      data.roomTypeId = body.roomTypeId ? Number(body.roomTypeId) : null;
    }
    if ("customName" in body) {
      const customName = body.customName?.trim() || null;
      data.customName = customName;
    }
    if ("subArea" in body) {
      const subArea = body.subArea?.trim() || null;
      data.subArea = subArea;
    }
    if ("notes" in body) {
      const notes = body.notes?.trim() || null;
      console.log("[ROOM PATCH] Setting notes to:", JSON.stringify(notes), "type:", typeof notes);
      data.notes = notes;
    }
    if ("sortOrder" in body) {
      data.sortOrder = Number(body.sortOrder);
    }

    console.log("[ROOM PATCH] Final data object:", JSON.stringify(data, null, 2));

    if (Object.keys(data).length === 0) {
      console.log("[ROOM PATCH] No fields to update");
      const room = await prisma.quotationRoom.findUnique({
        where: { id: Number(roomId) },
        include: { roomType: true, items: { include: { product: true } } },
      });
      return NextResponse.json(room);
    }

    console.log("[ROOM PATCH] About to call prisma.quotationRoom.update with roomId:", Number(roomId));

    let room;
    try {
      room = await prisma.quotationRoom.update({
        where: { id: Number(roomId) },
        data,
        include: { roomType: true, items: { include: { product: true } } },
      });
      console.log("[ROOM PATCH] Update successful, room id:", room.id);
    } catch (updateError) {
      console.error("[ROOM PATCH] Prisma update failed:");
      console.error("  Error type:", (updateError as any)?.code || "unknown");
      console.error("  Error message:", updateError instanceof Error ? updateError.message : String(updateError));
      console.error("  Full error:", JSON.stringify(updateError, null, 2));

      const updateErrorMessage = updateError instanceof Error ? updateError.message : String(updateError);
      const notesFieldRejected =
        "notes" in data &&
        (updateErrorMessage.includes("Unknown argument `notes`") ||
          (updateErrorMessage.includes("Invalid `prisma.quotationRoom.update()`") && updateErrorMessage.includes("notes:")));

      if (!notesFieldRejected) {
        throw updateError;
      }

      console.warn("[ROOM PATCH] Falling back to raw SQL update for notes due to Prisma client/schema mismatch");

      await prisma.$executeRaw`
        UPDATE "QuotationRoom"
        SET "notes" = ${data.notes as string | null}
        WHERE "id" = ${Number(roomId)} AND "quotationId" = ${id}
      `;

      const fallbackRoom = await prisma.quotationRoom.findUnique({
        where: { id: Number(roomId) },
        include: { roomType: true, items: { include: { product: true } } },
      });

      const rawNotesRows = await prisma.$queryRaw<Array<{ notes: string | null }>>`
        SELECT "notes" FROM "QuotationRoom" WHERE "id" = ${Number(roomId)}
      `;

      room = {
        ...fallbackRoom,
        notes: rawNotesRows[0]?.notes ?? null,
      };
    }

    console.log("[ROOM PATCH] Returning room response");
    return NextResponse.json(room);
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    const errorStack = e instanceof Error ? e.stack : "";
    console.error("[ROOM PATCH] ERROR MESSAGE:", errorMsg);
    console.error("[ROOM PATCH] ERROR STACK:", errorStack);
    console.error("[ROOM PATCH] FULL ERROR:", JSON.stringify(e, null, 2));
    return NextResponse.json(
      {
        error: "Failed to update room",
        details: errorMsg,
        stack: process.env.NODE_ENV === "development" ? errorStack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { id, roomId } = await context.params;
  try {
    const deleted = await prisma.quotationRoom.deleteMany({
      where: { id: Number(roomId), quotationId: id },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: "Room not found for this quotation" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete room" }, { status: 500 });
  }
}
