import { NextRequest, NextResponse } from "next/server";

const BASE_URL = (process.env.AGNES_BASE_URL || "https://apihub.agnes-ai.com/v1").replace(/\/$/, "");
const MODEL = "agnes-video-2.5-flash";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.AGNES_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API Agnes belum dipasang. Tambahkan AGNES_API_KEY di Vercel Environment Variables." }, { status: 503 });
    }

    const body = await req.json();
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const images = Array.isArray(body.images) ? body.images.filter((v: unknown) => typeof v === "string" && /^https:\/\//.test(v)) : [];
    const seconds = Number(body.seconds ?? 5);
    const aspectRatio = typeof body.aspect_ratio === "string" ? body.aspect_ratio : "16:9";

    if (!prompt) return NextResponse.json({ error: "Prompt belum diisi." }, { status: 400 });
    if (images.length > 5) return NextResponse.json({ error: "2.5 Flash mendukung maksimal 5 gambar referensi." }, { status: 400 });
    if (!Number.isInteger(seconds) || seconds < 4 || seconds > 12) return NextResponse.json({ error: "Durasi harus 4 sampai 12 detik." }, { status: 400 });
    if (!["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"].includes(aspectRatio)) return NextResponse.json({ error: "Rasio video tidak didukung." }, { status: 400 });

    const payload: Record<string, unknown> = {
      model: MODEL,
      prompt,
      mode: images.length ? "reference" : "text",
      seconds: String(seconds),
      size: "720P",
      aspect_ratio: aspectRatio,
      n: 1
    };
    if (images.length) payload.images = images;

    const upstream = await fetch(`${BASE_URL}/videos`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store"
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const message = data?.error?.message || data?.message || "Agnes menolak permintaan video.";
      return NextResponse.json({ error: message }, { status: upstream.status });
    }

    const videoId = data.video_id || data.id || data.task_id || data.data?.video_id || data.data?.id;
    if (!videoId) return NextResponse.json({ error: "Agnes tidak mengembalikan ID tugas video.", details: data }, { status: 502 });
    return NextResponse.json({ video_id: videoId, model: MODEL });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Terjadi kesalahan server." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const apiKey = process.env.AGNES_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "AGNES_API_KEY belum dipasang di Vercel." }, { status: 503 });
    const videoId = req.nextUrl.searchParams.get("video_id");
    if (!videoId) return NextResponse.json({ error: "video_id wajib diisi." }, { status: 400 });

    const url = new URL("https://apihub.agnes-ai.com/agnesapi");
    url.searchParams.set("video_id", videoId);
    url.searchParams.set("model_name", MODEL);
    const upstream = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store"
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return NextResponse.json({ error: data?.message || "Gagal memeriksa status video." }, { status: upstream.status });

    const status = String(data.status || data.data?.status || "processing").toLowerCase();
    const videoUrl = data.url || data.data?.url || data.video_url || data.data?.video_url || "";
    return NextResponse.json({ status, url: videoUrl });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Terjadi kesalahan server." }, { status: 500 });
  }
}
