import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isBathroomLikeRoomName } from "@/lib/utils";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const body = await req.json();

    let roomTypeId: number | null = body.roomTypeId ?? null;
    if (roomTypeId) {
      const roomType = await prisma.roomType.findUnique({
        where: { id: Number(roomTypeId) },
        select: { name: true },
      });
      if (roomType && isBathroomLikeRoomName(roomType.name)) {
        roomTypeId = null;
      }
    }

    const room = await prisma.quotationRoom.create({
      data: {
        quotationId: id,
        roomTypeId,
        customName: body.customName ?? null,
        subArea: body.subArea ?? null,
        sortOrder: body.sortOrder ?? 0,
      },
      include: { roomType: true, items: true },
    });
    return NextResponse.json(room, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to add room" }, { status: 500 });
  }
}
