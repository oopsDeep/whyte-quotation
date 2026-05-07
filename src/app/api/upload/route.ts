import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { uploadImage, deleteImage } from "@/lib/cloudinary";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 2 * 1024 * 1024;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image file is required" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Only JPEG, PNG, and WEBP files are allowed" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File size must be 2MB or less" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadImage(buffer, "whyte/products");

    return NextResponse.json(uploaded, { status: 201 });
  } catch (error) {
    console.error("POST /api/upload error:", error);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    if (!body?.publicId || typeof body.publicId !== "string") {
      return NextResponse.json({ error: "publicId is required" }, { status: 400 });
    }

    await deleteImage(body.publicId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/upload error:", error);
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 });
  }
}
