"use client";

import { useEffect, useRef, useState } from "react";

type UploadedImage = { url: string; name: string };

export default function AririAI() {
  const [prompt, setPrompt] = useState("");
  const [seconds, setSeconds] = useState(5);
  const [ratio, setRatio] = useState("16:9");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!generating) return;
    const timer = window.setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => window.clearInterval(timer);
  }, [generating]);

  const formatTime = (value: number) => `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    const chosen = Array.from(files);
    if (images.length + chosen.length > 5) {
      setError("Maksimal 5 gambar referensi.");
      return;
    }
    const form = new FormData();
    chosen.forEach((file) => form.append("files", file));
    setUploading(true);
    try {
      const response = await fetch("/api/upload", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload gagal.");
      setImages((current) => [...current, ...data.images]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload gagal.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function generate() {
    if (!prompt.trim()) { setError("Tulis prompt terlebih dahulu."); return; }
    setError("");
    setVideoUrl("");
    setGenerating(true);
    setElapsed(0);
    setStatus("Mengirim permintaan ke Agnes...");
    try {
      const create = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, seconds, aspect_ratio: ratio, images: images.map((image) => image.url) })
      });
      const created = await create.json();
      if (!create.ok) throw new Error(created.error || "Gagal membuat tugas video.");
      const id = created.video_id as string;

      for (let attempt = 0; attempt < 90; attempt++) {
        await new Promise((resolve) => window.setTimeout(resolve, 7000));
        const check = await fetch(`/api/generate?video_id=${encodeURIComponent(id)}`, { cache: "no-store" });
        const result = await check.json();
        if (!check.ok) throw new Error(result.error || "Gagal memeriksa status video.");
        const current = String(result.status || "processing").toLowerCase();
        setStatus(current === "completed" ? "Video selesai." : "Sedang diproses Agnes...");
        if (current === "completed" && result.url) {
          setVideoUrl(result.url);
          return;
        }
        if (current === "failed") throw new Error("Proses video gagal di sisi Agnes.");
      }
      throw new Error("Proses masih berjalan terlalu lama. Coba periksa lagi nanti.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <header className="border-b border-white/10 bg-[#101010] px-5 py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div><div className="text-xl font-black tracking-widest">ARIRI AI</div><div className="mt-1 text-xs text-white/50">AI VIDEO STUDIO</div></div>
          <div className="rounded-full border border-[#d9c39a]/40 px-4 py-2 text-xs font-semibold text-[#e8d6b5]">2.5 Flash · 720P</div>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-6 p-5 md:grid-cols-[1.1fr_.9fr]">
        <section className="space-y-6 rounded-3xl border border-white/10 bg-[#111] p-5 md:p-7">
          <div><h1 className="text-lg font-bold">Buat video</h1><p className="mt-1 text-sm text-white/50">Model 2.5 Flash · Durasi 4–12 detik · Maksimal 5 gambar referensi</p></div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/60">Gambar referensi ({images.length}/5)</label>
            <div className="grid grid-cols-3 gap-3">
              {images.map((image, index) => <div key={image.url} className="relative aspect-square overflow-hidden rounded-xl border border-white/10">
                <img src={image.url} alt={image.name} className="h-full w-full object-cover" />
                <button type="button" onClick={() => setImages((current) => current.filter((_, i) => i !== index))} className="absolute right-2 top-2 rounded-full bg-black/80 px-2 py-1 text-xs">×</button>
              </div>)}
              {images.length < 5 && <button type="button" onClick={() => inputRef.current?.click()} className="flex aspect-square flex-col items-center justify-center rounded-xl border border-dashed border-white/25 text-sm text-white/60 hover:border-[#e8d6b5]"> <span className="text-3xl">+</span><span>Tambah gambar</span></button>}
            </div>
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(event) => uploadFiles(event.target.files)} />
            <p className="mt-2 text-xs text-white/40">JPG, PNG, WEBP · Maksimal 10 MB per gambar.</p>
            {uploading && <p className="mt-2 text-xs text-[#e8d6b5]">Mengunggah gambar...</p>}
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/60">Prompt</label>
            <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={2000} placeholder="Jelaskan adegan, gerakan, kamera, suasana, dan detail video..." className="min-h-36 w-full rounded-2xl border border-white/10 bg-[#080808] p-4 text-sm outline-none focus:border-[#e8d6b5]" />
            <div className="mt-1 text-right text-xs text-white/35">{prompt.length}/2000</div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/60">Durasi</label>
              <select value={seconds} onChange={(event) => setSeconds(Number(event.target.value))} className="w-full rounded-xl border border-white/10 bg-[#080808] p-3 text-sm">{[4,5,6,7,8,9,10,11,12].map((v) => <option key={v} value={v}>{v} detik</option>)}</select>
            </div>
            <div><label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/60">Rasio</label>
              <select value={ratio} onChange={(event) => setRatio(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#080808] p-3 text-sm"><option>16:9</option><option>9:16</option><option>1:1</option><option>4:3</option><option>3:4</option><option>21:9</option></select>
            </div>
          </div>
          <button type="button" onClick={generate} disabled={generating || uploading || !prompt.trim()} className="w-full rounded-full bg-[#e8d6b5] px-5 py-4 font-bold text-black disabled:cursor-not-allowed disabled:opacity-40">{generating ? "Memproses..." : "Generate video"}</button>
          {generating && <p className="text-center text-xs text-white/50">{status} · {formatTime(elapsed)}</p>}
          {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
        </section>
        <section className="min-h-[420px] rounded-3xl border border-white/10 bg-[#111] p-5 md:p-7">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white/60">Preview</h2>
          <div className="mt-4 flex min-h-[340px] items-center justify-center rounded-2xl bg-black p-3">
            {videoUrl ? <div className="w-full"><video src={videoUrl} controls playsInline className="w-full rounded-xl" /><a href={videoUrl} target="_blank" rel="noreferrer" className="mt-4 block rounded-full bg-[#e8d6b5] p-3 text-center text-sm font-bold text-black">Buka / simpan video</a></div> : <div className="text-center text-sm text-white/35">{generating ? "Video sedang dibuat..." : "Hasil video akan muncul di sini."}</div>}
          </div>
          <p className="mt-4 text-xs leading-5 text-white/40">Kunci API disimpan di server melalui Vercel Environment Variables, bukan di browser.</p>
        </section>
      </div>
      <footer className="pb-8 text-center text-xs text-white/30">ARIRI AI © 2026</footer>
    </main>
  );
}
