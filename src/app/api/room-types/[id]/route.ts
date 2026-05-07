import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const roomType = await prisma.roomType.update({
      where: { id: Number(id) },
      data: body,
    });
    return NextResponse.json(roomType);
  } catch {
    return NextResponse.json({ error: "Failed to update room type" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await prisma.roomType.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete room type" }, { status: 500 });
  }
}
