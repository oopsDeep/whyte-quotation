import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isBathroomLikeRoomName } from "@/lib/utils";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { rooms, ...data } = body;
    const houseType = await prisma.houseType.update({
      where: { id: Number(id) },
      data,
    });
    if (rooms && Array.isArray(rooms)) {
      const requestedIds = Array.from(new Set(rooms.map((r: any) => Number(r.roomTypeId)).filter(Boolean)));
      const roomTypes = await prisma.roomType.findMany({
        where: { id: { in: requestedIds } },
        select: { id: true, name: true },
      });
      const allowedIds = new Set(
        roomTypes.filter((rt) => !isBathroomLikeRoomName(rt.name)).map((rt) => rt.id)
      );
      const sanitizedRooms = rooms.filter((r: any) => allowedIds.has(Number(r.roomTypeId)));

      await prisma.houseTypeRoomTemplate.deleteMany({ where: { houseTypeId: houseType.id } });
      await prisma.houseTypeRoomTemplate.createMany({
        data: sanitizedRooms.map((r: any, i: number) => ({
          houseTypeId: houseType.id,
          roomTypeId: r.roomTypeId,
          defaultCount: r.defaultCount ?? 1,
          sortOrder: i,
        })),
      });
    }
    return NextResponse.json(houseType);
  } catch {
    return NextResponse.json({ error: "Failed to update house type" }, { status: 500 });
  }
}
