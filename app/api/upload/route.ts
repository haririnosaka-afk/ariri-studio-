import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files").filter((item): item is File => item instanceof File);
    if (!files.length) return NextResponse.json({ error: "Pilih gambar terlebih dahulu." }, { status: 400 });
    if (files.length > 5) return NextResponse.json({ error: "Maksimal 5 gambar referensi untuk 2.5 Flash." }, { status: 400 });

    const uploaded = [];
    for (const file of files) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        return NextResponse.json({ error: "Format gambar harus JPG, PNG, atau WEBP." }, { status: 400 });
      }
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: "Ukuran setiap gambar maksimal 10 MB." }, { status: 400 });
      }
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const blob = await put(`ariri-references/${crypto.randomUUID()}-${safeName}`, file, { access: "public" });
      uploaded.push({ url: blob.url, name: file.name });
    }
    return NextResponse.json({ images: uploaded });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload gagal. Periksa konfigurasi Vercel Blob." }, { status: 500 });
  }
}
