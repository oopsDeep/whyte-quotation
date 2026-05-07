import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const company = await prisma.company.findFirst();
    return NextResponse.json(company ?? null);
  } catch {
    return NextResponse.json({ error: "Failed to fetch company" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const existing = await prisma.company.findFirst();
    let company;
    if (existing) {
      company = await prisma.company.update({ where: { id: existing.id }, data: body });
    } else {
      company = await prisma.company.create({ data: body });
    }
    return NextResponse.json(company);
  } catch {
    return NextResponse.json({ error: "Failed to update company" }, { status: 500 });
  }
}
