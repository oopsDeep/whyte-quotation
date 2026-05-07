import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isBathroomLikeRoomName } from "@/lib/utils";

export async function GET() {
  try {
    const roomTypes = await prisma.roomType.findMany({
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json(roomTypes.filter((rt) => !isBathroomLikeRoomName(rt.name)));
  } catch {
    return NextResponse.json({ error: "Failed to fetch room types" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const roomType = await prisma.roomType.create({ data: body });
    return NextResponse.json(roomType, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create room type" }, { status: 500 });
  }
}
