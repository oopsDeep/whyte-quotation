import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isBathroomLikeRoomName } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const houseTypes = await prisma.houseType.findMany({
      include: {
        roomTemplate: {
          include: { roomType: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    const cleaned = houseTypes.map((ht) => ({
      ...ht,
      roomTemplate: ht.roomTemplate.filter((t) => !isBathroomLikeRoomName(t.roomType?.name)),
    }));

    return NextResponse.json(cleaned);
  } catch {
    return NextResponse.json({ error: "Failed to fetch house types" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { rooms, ...data } = body;
    const houseType = await prisma.houseType.create({ data });
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

      await prisma.houseTypeRoomTemplate.createMany({
        data: sanitizedRooms.map((r: any, i: number) => ({
          houseTypeId: houseType.id,
          roomTypeId: r.roomTypeId,
          defaultCount: r.defaultCount ?? 1,
          sortOrder: i,
        })),
      });
    }
    return NextResponse.json(houseType, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create house type" }, { status: 500 });
  }
}
