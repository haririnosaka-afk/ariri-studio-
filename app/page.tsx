"use client";
import { useState, useEffect, useRef } from 'react';

type ModelType='2.0'|'2.5';
interface RefImg{ id:string; url:string; name:string; }
interface HistoryItem{ id:string; prompt:string; model:ModelType; duration:number; res:string; aspect:string; date:string; videoUrl:string; thumb?:string; }

export default function AririFinalReal(){
  const [model,setModel]=useState<ModelType>('2.5');
  const [duration,setDuration]=useState(10);
  const [prompt,setPrompt]=useState('Wanita @img1 berjalan di sawah Bali cinematic golden hour, wajah konsisten 100% @img1, gerakan natural elegan');
  const [refs,setRefs]=useState<RefImg[]>([]);
  const [resolution,setResolution]=useState<'720p'|'1080p'|'480p'>('1080p');
  const [aspect,setAspect]=useState('16:9');
  const [audio,setAudio]=useState(true);
  const [loading,setLoading]=useState(false);
  const [status,setStatus]=useState<'idle'|'processing'|'failed'|'success'>('idle');
  const [videoUrl,setVideoUrl]=useState('');
  const [history,setHistory]=useState<HistoryItem[]>([]);
  const [view,setView]=useState<'generate'|'library'|'settings'>('generate');
  const [elapsed,setElapsed]=useState(0);
  const [step,setStep]=useState<'memproses'|'membuat'|'menyiapkan'>('memproses');
  const [apiKey,setApiKey]=useState('');
  const [showKey,setShowKey]=useState(false);
  const timerRef=useRef<any>(null);

  const maxDur=model==='2.0'?15:30;
  const estimated = duration<=15?180:300;

  useEffect(()=>{
    if(status==='processing'){ timerRef.current=setInterval(()=>setElapsed(e=>e+1),1000); }
    else { if(timerRef.current) clearInterval(timerRef.current); }
    return()=>clearInterval(timerRef.current);
  },[status]);

  useEffect(()=>{
    if(elapsed<20) setStep('memproses');
    else if(elapsed<120) setStep('membuat');
    else setStep('menyiapkan');
  },[elapsed]);

  const fmt=(s:number)=>`${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;
  const prog=Math.min(92, (elapsed/estimated)*100);

  const handleFiles=async(files:FileList|null)=>{
    if(!files) return;
    const remain=10-refs.length;
    if(remain<=0){ alert('Max 10 foto'); return; }
    const fd=new FormData();
    Array.from(files).slice(0,remain).forEach(f=>fd.append('files',f));
    try{
      const res=await fetch('/api/upload',{method:'POST', body:fd});
      const data=await res.json();
      if(data.urls?.length){
        setRefs(r=>[...r,...data.urls.map((u:any)=>({id:Math.random().toString(36).slice(2), url:u.url, name:u.name}))].slice(0,10));
      } else {
        const local=Array.from(files).slice(0,remain).map(f=>({id:Math.random().toString(36).slice(2), url:URL.createObjectURL(f), name:f.name}));
        setRefs(r=>[...r,...local].slice(0,10));
      }
    }catch{}
  };

  const generate=async()=>{
    if(!prompt.trim()){ alert('Isi prompt dulu!'); return; }
    if(refs.length===0){ alert('Upload minimal 1 foto referensi untuk konsistensi wajah!'); return; }
    setLoading(true); setStatus('processing'); setElapsed(0); setVideoUrl('');
    try{
      const res=await fetch('/api/generate',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ prompt, duration, model, resolution, aspect_ratio:aspect, image_urls:refs.map(r=>r.url), generateAudio:audio, apiKeyFromUser: apiKey||undefined })});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||'Gagal');
      const url=data.video?.url||data.url||'';
      if(url){
        setVideoUrl(url); setStatus('success');
        const item:HistoryItem={ id:Date.now().toString(), prompt, model, duration, res:resolution, aspect, date:new Date().toLocaleString('id-ID'), videoUrl:url };
        setHistory(h=>[item,...h]);
      } else {
        throw new Error('Generate gagal di penyedia');
      }
    }catch(e:any){
      setStatus('failed');
    } finally{ setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white selection:bg-[#f5e6c8] selection:text-black">
      <div className="bg-[#f5e6c8] text-black text-[11px] font-bold tracking-wide text-center py-2">ARIRI STUDIO • FINAL REAL EDITION • SEEDANCE 2.0 (15s) • 2.5 (30s) • 10 REF • RUNNINGHUB GLOBAL • READY FOR API KEY</div>
      
      <header className="sticky top-0 z-40 bg-[#0f0f0f]/90 backdrop-blur-xl border-b border-[#1e1e1e] h-[64px] flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-xl bg-[#f5e6c8] text-black font-black flex items-center justify-center">A</div>
          <div><div className="font-black tracking-tight leading-none">ARIRI STUDIO</div><div className="text-[10px] opacity-50 tracking-widest">FINAL REAL • PERSONAL</div></div>
          <div className="hidden md:flex items-center gap-2 ml-6">
            <div className="px-3 py-1.5 rounded-full bg-[#151515] border border-[#222] text-[11px]">Total: <b>{history.length}</b> video</div>
            <div className="px-3 py-1.5 rounded-full bg-[#151515] border border-[#222] text-[11px]">Hari ini: <b>{history.filter(h=>h.date.includes(new Date().toLocaleDateString('id-ID').split('/')[0])).length}</b></div>
            <div className="px-3 py-1.5 rounded-full bg-[#151515] border border-[#222] text-[11px]">{refs.length}/10 ref</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>setView('generate')} className={`px-4 py-2 rounded-full text-[13px] ${view==='generate'?'bg-[#f5e6c8] text-black font-bold':'bg-[#1a1a1a] border border-[#222]'}`}>Generate</button>
          <button onClick={()=>setView('library')} className={`px-4 py-2 rounded-full text-[13px] relative ${view==='library'?'bg-[#f5e6c8] text-black font-bold':'bg-[#1a1a1a] border border-[#222]'}`}>Library {history.length>0 && <span className="ml-1 bg-black text-[#f5e6c8] text-[10px] px-1.5 py-0.5 rounded-full">{history.length}</span>}</button>
          <button onClick={()=>setView('settings')} className={`w-9 h-9 rounded-full flex items-center justify-center ${view==='settings'?'bg-[#f5e6c8] text-black':'bg-[#1a1a1a] border border-[#222]'}`}>⚙</button>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden lg:flex w-[240px] shrink-0 border-r border-[#141414] bg-[#0e0e0e] min-h-[calc(100vh-96px)] p-5 flex-col gap-6 sticky top-[64px]">
          <div>
            <div className="text-[10px] font-bold tracking-[0.2em] opacity-30 mb-3">VIDEO AI GENERATOR</div>
            <div className="bg-[#151515] border border-[#222] rounded-[14px] p-3">
              <div className="text-[13px] font-bold">Seedance 2.5 Global</div>
              <div className="text-[11px] opacity-60 mt-1">Max 30 detik • 10 foto ref • Audio • RunningHub</div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]"><div className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-lg p-2 text-center"><div className="font-bold">2.0</div><div className="opacity-50">Max 15s</div></div><div className="bg-[#f5e6c8]/10 border border-[#f5e6c8]/30 rounded-lg p-2 text-center"><div className="font-bold">2.5</div><div className="opacity-70">Max 30s • 10 ref</div></div></div>
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold tracking-[0.2em] opacity-30 mb-3">STATISTIK REAL</div>
            <div className="space-y-2">
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-3 flex justify-between"><span className="text-[11px] opacity-60">Total Video</span><span className="font-bold text-[13px]">{history.length}</span></div>
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-3 flex justify-between"><span className="text-[11px] opacity-60">Durasi Terakhir</span><span className="font-bold text-[13px]">{duration}s</span></div>
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-3 flex justify-between"><span className="text-[11px] opacity-60">Ref Terpakai</span><span className="font-bold text-[13px]">{refs.length}/10</span></div>
            </div>
          </div>
          <div className="mt-auto bg-[#f5e6c8] text-black rounded-[14px] p-4">
            <div className="text-[12px] font-black">READY FOR API KEY</div>
            <div className="text-[11px] mt-1 leading-snug">Pasang API Key RunningHub di Settings atau Vercel ENV, langsung generate video real, bukan simulasi.</div>
            <button onClick={()=>setView('settings')} className="mt-3 w-full bg-black text-[#f5e6c8] text-[11px] font-bold py-2 rounded-full">Pasang API Key →</button>
          </div>
        </aside>

        <main className="flex-1 p-4 md:p-6">
          {view==='generate' && (
            <div className="max-w-[1400px] mx-auto grid xl:grid-cols-[1.2fr_0.8fr] gap-6">
              <div className="bg-[#111] border border-[#1e1e1e] rounded-[22px] p-6 space-y-5">
                <div className="flex flex-wrap gap-2">
                  <select value={model} onChange={e=>{setModel(e.target.value as any); if(e.target.value==='2.0'&&duration>15)setDuration(15);}} className="bg-[#0a0a0a] border border-[#222] rounded-full px-5 py-2.5 text-[13px] font-medium"><option value="2.0">Seedance 2.0 — Max 15 detik • 2 ref</option><option value="2.5">Seedance 2.5 — Max 30 detik • 10 ref @img ⭐ Recommended</option></select>
                  <div className="px-4 py-2.5 rounded-full bg-[#0a0a0a] border border-[#222] text-[12px]">⏱ {duration}s / {maxDur}s max</div>
                  <div className="px-4 py-2.5 rounded-full bg-[#0a0a0a] border border-[#222] text-[12px]">🖼 {refs.length}/10 foto</div>
                </div>

                <div>
                  <label className="text-[11px] font-bold tracking-widest opacity-70">DURASI VIDEO: {duration} DETIK</label>
                  <input type="range" min={4} max={maxDur} value={duration} onChange={e=>setDuration(parseInt(e.target.value))} className="w-full accent-[#f5e6c8] h-1.5 mt-2" />
                  <div className="flex justify-between text-[10px] opacity-40 mt-1"><span>4s</span><span>Max {maxDur}s</span></div>
                </div>

                <div>
                  <label className="text-[11px] font-bold tracking-widest opacity-70">PROMPT • WAJIB PAKAI @img1..@img10 UNTUK KONSISTENSI WAJAH</label>
                  <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Contoh REAL: Wanita cantik @img1 berjalan pelan di sawah Bali cinematic golden hour, senyum natural, wajah konsisten 100% sama seperti @img1, rambut tertiup angin, gerakan elegan, background sawah hijau, kualitas film 4K" className="w-full bg-[#080808] border border-[#1e1e1e] rounded-[16px] p-4 text-[13px] min-h-[120px] leading-relaxed outline-none focus:border-[#f5e6c8]/40 mt-2" />
                  <div className="flex justify-between mt-2"><span className="text-[10px] opacity-40">Tip: Tulis @img1 di prompt biar wajah 100% mirip foto referensi</span><span className="text-[10px] opacity-40">{prompt.length}/2000</span></div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div><label className="text-[10px] opacity-50">RESOLUSI</label><select value={resolution} onChange={e=>setResolution(e.target.value as any)} className="w-full mt-1 bg-[#080808] border border-[#1e1e1e] rounded-full px-4 py-3 text-[13px]"><option value="480p">480p • Hemat</option><option value="720p">720p • Balance</option><option value="1080p">1080p • Tajam ⭐</option></select></div>
                  <div><label className="text-[10px] opacity-50">ASPECT RATIO</label><select value={aspect} onChange={e=>setAspect(e.target.value)} className="w-full mt-1 bg-[#080808] border border-[#1e1e1e] rounded-full px-4 py-3 text-[13px]"><option value="16:9">16:9 Landscape</option><option value="9:16">9:16 Portrait</option><option value="1:1">1:1 Square</option><option value="adaptive">Adaptive</option></select></div>
                  <div><label className="text-[10px] opacity-50">AUDIO</label><button onClick={()=>setAudio(!audio)} className={`w-full mt-1 h-[46px] rounded-full border text-[13px] font-bold ${audio?'bg-[#f5e6c8] text-black border-[#f5e6c8]':'bg-[#080808] border-[#1e1e1e]'}`}>🔊 {audio?'ON':'OFF'}</button></div>
                </div>

                <div className="bg-[#0c0c0c] border border-[#1a1a1a] rounded-[18px] p-5">
                  <div className="flex justify-between items-center"><div className="font-bold text-[13px]">FOTO REFERENSI • {refs.length}/10 MAX • WAJIB UNTUK KONSISTENSI</div><div className="text-[10px] px-2 py-1 rounded-full bg-[#1a1a1a] border border-[#222]">Tag @img1..@img10 otomatis</div></div>
                  <div className="grid grid-cols-5 gap-3 mt-4">
                    {refs.map((r,i)=><div key={r.id} className="relative aspect-square rounded-[14px] overflow-hidden border border-[#222] bg-[#151515] group"><img src={r.url} className="w-full h-full object-cover" /><button onClick={()=>setRefs(pr=>pr.filter(x=>x.id!==r.id))} className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/80 rounded-full text-[11px] flex items-center justify-center">✕</button><div className="absolute bottom-0 inset-x-0 bg-black/80 text-[10px] font-bold text-center py-1.5">@img{i+1}</div></div>)}
                    {refs.length<10 && <label className="aspect-square rounded-[14px] border-2 border-dashed border-[#222] bg-[#0a0a0a] flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#f5e6c8]/50 hover:bg-[#111]"><span className="text-2xl opacity-30">+</span><span className="text-[11px] font-bold">Upload Foto</span><span className="text-[9px] opacity-40">Max 10</span><input type="file" multiple accept="image/*" className="hidden" onChange={e=>handleFiles(e.target.files)} /></label>}
                  </div>
                  {refs.length===0 && <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/80">⚠️ Belum ada foto referensi! Upload minimal 1 foto wajah biar hasil konsisten 100% • Max 10 foto untuk @img1..@img10</div>}
                </div>

                <button onClick={generate} disabled={loading} className="w-full h-[56px] rounded-full bg-[#f5e6c8] text-black font-black text-[15px] tracking-wide disabled:opacity-50 flex items-center justify-center gap-3 hover:bg-[#efe0b0]">
                  {loading ? <><span className="w-6 h-6 border-2 border-black/20 border-t-black rounded-full animate-spin"></span> Sedang membuat video {duration}s... {fmt(elapsed)} / ~{fmt(estimated)}</> : <>✨ Generate Video {duration}s • Seedance {model} • {refs.length} foto</>}
                </button>
                <div className="text-[10px] opacity-30 text-center">Endpoint REAL: /bytedance/seedance-{model}-global{model==='2.5'?'-token/multimodal-video':'/text-to-video'} • Multi-key failover • Blob publik • History real</div>
              </div>

              <div className="space-y-4">
                <div className="bg-[#111] border border-[#1e1e1e] rounded-[22px] p-4">
                  <div className="flex justify-between items-center mb-3"><div className="text-[11px] font-bold tracking-widest opacity-60">PREVIEW VIDEO • DOWNLOAD DISINI</div><div className="text-[10px] px-2 py-1 rounded-full bg-[#0a0a0a] border border-[#1a1a1a]">{status.toUpperCase()} • {fmt(elapsed)}</div></div>
                  
                  <div className="bg-[#050505] border border-[#151515] rounded-[18px] min-h-[380px] flex flex-col items-center justify-center p-6 relative overflow-hidden">
                    {status==='idle' && !videoUrl && (
                      <div className="text-center"><div className="w-20 h-20 mx-auto rounded-full bg-[#111] border border-[#1e1e1e] flex items-center justify-center text-2xl opacity-30">🎬</div><div className="mt-4 font-bold">Belum ada video</div><div className="text-[11px] opacity-40 mt-1">Upload foto + isi prompt + Generate • 0 video</div><div className="mt-4 text-[10px] opacity-20">Video akan muncul di sini setelah generate • Download otomatis tersedia</div></div>
                    )}
                    {status==='processing' && (
                      <div className="text-center w-full">
                        <div className="relative w-[96px] h-[96px] mx-auto">
                          <div className="absolute inset-0 rounded-full border-2 border-[#1e1e1e]"></div>
                          <div className="absolute inset-0 rounded-full border-2 border-t-[#f5e6c8] border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                          <div className="absolute inset-[12px] rounded-full border-2 border-[#1a1a1a] border-t-[#f5e6c8]/60 border-r-transparent border-b-transparent border-l-transparent animate-spin" style={{animationDirection:'reverse', animationDuration:'1.2s'}}></div>
                          <div className="absolute inset-0 flex items-center justify-center text-2xl">✨</div>
                        </div>
                        <div className="mt-6 font-bold text-[16px]">Sedang membuat video</div>
                        <div className="mt-2 text-[12px] opacity-60 leading-relaxed max-w-[320px] mx-auto">Biasanya 1 sampai 5 menit, lebih lama untuk durasi panjang. Kamu boleh tetap di halaman ini. Jangan tutup tab.</div>
                        <div className="mt-6 w-full max-w-[340px] mx-auto"><div className="w-full h-2 bg-[#1a1a1a] rounded-full overflow-hidden"><div className="h-full bg-[#f5e6c8] rounded-full transition-all duration-1000" style={{width:`${prog}%`}}></div></div><div className="flex justify-between mt-2 text-[10px] opacity-50"><span>{fmt(elapsed)} • {Math.floor(prog)}% • {step}</span><span>Est ~{fmt(estimated)} • Sisa {fmt(Math.max(0,estimated-elapsed))}</span></div></div>
                        <div className="mt-6 flex justify-center gap-4 text-[10px]">
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${step==='memproses'||step==='membuat'||step==='menyiapkan'?'bg-[#f5e6c8]/20 border-[#f5e6c8]/40':'border-[#222] opacity-30'}`}><div className="w-4 h-4 rounded-full bg-[#f5e6c8] text-black flex items-center justify-center text-[9px]">✓</div>Memproses</div>
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${step==='membuat'||step==='menyiapkan'?'bg-[#f5e6c8]/20 border-[#f5e6c8]/40 animate-pulse':'border-[#222] opacity-30'}`}><div className={`w-4 h-4 rounded-full flex items-center justify-center ${step==='menyiapkan'?'bg-[#f5e6c8] text-black':'border border-[#f5e6c8]'}`}>{step==='menyiapkan'?'✓':'◍'}</div>Membuat</div>
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${step==='menyiapkan'?'border-[#f5e6c8]':'border-[#222] opacity-30'}`}><div className="w-4 h-4 rounded-full border">○</div>Menyiapkan</div>
                        </div>
                      </div>
                    )}
                    {status==='failed' && (
                      <div className="text-center w-full">
                        <div className="w-[72px] h-[72px] mx-auto rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center"><div className="w-10 h-10 rounded-full border-2 border-[#555] flex items-center justify-center text-xl">!</div></div>
                        <div className="mt-5 font-bold">Generate gagal di penyedia. Coba lagi sebentar lagi.</div>
                        <div className="text-[11px] opacity-50 mt-2">RunningHub sibuk atau API Key salah • Cek Vercel ENV RUNNINGHUB_API_KEYS • {fmt(elapsed)}</div>
                        <button onClick={generate} className="mt-5 px-6 py-2.5 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] text-[13px]">↻ Coba lagi</button>
                        <div className="mt-4 text-[10px] opacity-30">Jika terus gagal, cek API Key di Settings atau Vercel Dashboard</div>
                      </div>
                    )}
                    {status==='success' && videoUrl && (
                      <div className="w-full">
                        <video src={videoUrl} controls autoPlay playsInline className="w-full rounded-[14px] max-h-[260px] bg-black" />
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <a href={videoUrl} target="_blank" download={`ariri-${Date.now()}.mp4`} className="h-[44px] rounded-full bg-[#f5e6c8] text-black font-bold text-[13px] flex items-center justify-center gap-2">⬇ Download MP4</a>
                          <button onClick={()=>{navigator.clipboard.writeText(videoUrl); alert('Link video dicopy!');}} className="h-[44px] rounded-full bg-[#1a1a1a] border border-[#222] text-[13px]">🔗 Copy Link</button>
                        </div>
                        <div className="mt-3 p-3 rounded-xl bg-[#0a0a0a] border border-[#1a1a1a] text-[10px]"><div className="opacity-50">LINK VIDEO (24 jam, simpan segera):</div><div className="mt-1 break-all opacity-80 font-mono text-[9px]">{videoUrl}</div></div>
                        <div className="mt-3 text-[11px] text-center font-bold text-emerald-300">✓ Video selesai! Download di atas • Otomatis masuk Library • Total {history.length} video</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-[#0e0e0e] border border-[#1a1a1a] rounded-[18px] p-4">
                  <div className="flex justify-between items-center"><div className="text-[11px] font-bold tracking-widest opacity-60">HISTORY REAL • {history.length} VIDEO • DOWNLOAD DISINI JUGA</div><button onClick={()=>setView('library')} className="text-[11px] px-3 py-1 rounded-full bg-[#1a1a1a] border border-[#222]">Lihat Semua {history.length} →</button></div>
                  {history.length===0 ? (
                    <div className="mt-4 border border-dashed border-[#222] rounded-[14px] p-8 text-center"><div className="opacity-30">Belum ada video • 0</div><div className="text-[11px] opacity-20 mt-1">Hasil generate akan muncul di Library, bisa download kapanpun</div></div>
                  ) : (
                    <div className="mt-4 space-y-2 max-h-[300px] overflow-auto">
                      {history.slice(0,3).map(h=><div key={h.id} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-3 flex gap-3"><video src={h.videoUrl} className="w-20 h-12 rounded-lg bg-black object-cover" muted /><div className="flex-1 min-w-0"><div className="text-[11px] truncate opacity-80">{h.prompt.slice(0,50)}</div><div className="text-[10px] opacity-40">{h.model} • {h.duration}s • {h.res} • {h.date}</div><a href={h.videoUrl} target="_blank" className="text-[10px] text-[#f5e6c8]">⬇ Download</a></div></div>)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {view==='library' && (
            <div className="max-w-[1300px] mx-auto">
              <div className="flex justify-between items-center"><h2 className="text-[20px] font-black">Library • {history.length} Video • Semua Download Disini</h2><button onClick={()=>setView('generate')} className="px-4 py-2 rounded-full bg-[#f5e6c8] text-black font-bold text-[13px]">+ Generate Baru</button></div>
              <div className="mt-2 text-[11px] opacity-50">Semua video real, bukan dummy • Klik download untuk simpan • RunningHub simpan 24 jam, download segera setelah generate</div>
              {history.length===0 ? (
                <div className="mt-10 border-2 border-dashed border-[#1e1e1e] rounded-[24px] p-16 text-center"><div className="w-20 h-20 mx-auto rounded-full bg-[#111] border border-[#1e1e1e] flex items-center justify-center text-3xl opacity-20">📁</div><div className="mt-6 font-bold">Library Kosong • 0 Video</div><div className="text-[12px] opacity-40 mt-2">Belum ada video yang digenerate • Semua mulai dari 0 • Generate pertama kamu akan muncul disini dengan tombol download</div><button onClick={()=>setView('generate')} className="mt-6 px-6 py-3 rounded-full bg-[#f5e6c8] text-black font-bold">Mulai Generate →</button></div>
              ) : (
                <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {history.map(h=>(
                    <div key={h.id} className="bg-[#111] border border-[#1e1e1e] rounded-[20px] overflow-hidden">
                      <div className="aspect-video bg-black relative"><video src={h.videoUrl} controls className="w-full h-full" /><div className="absolute top-2 left-2 text-[10px] px-2 py-1 rounded-full bg-black/70 border border-white/10">{h.model} • {h.duration}s • {h.res}</div></div>
                      <div className="p-4"><div className="text-[12px] leading-snug line-clamp-2 opacity-80">{h.prompt}</div><div className="text-[10px] opacity-40 mt-2">{h.date} • {h.aspect}</div><div className="mt-3 grid grid-cols-2 gap-2"><a href={h.videoUrl} target="_blank" className="h-10 rounded-full bg-[#f5e6c8] text-black font-bold text-[12px] flex items-center justify-center">⬇ Download MP4</a><button onClick={()=>{navigator.clipboard.writeText(h.videoUrl); alert('Link dicopy!');}} className="h-10 rounded-full bg-[#1a1a1a] border border-[#222] text-[12px]">🔗 Copy Link</button></div><div className="mt-2 text-[9px] opacity-30 break-all font-mono">{h.videoUrl.slice(0,60)}...</div></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {view==='settings' && (
            <div className="max-w-[700px] mx-auto space-y-6">
              <h2 className="text-[20px] font-black">Settings • API Key • Biar Jadi REAL Bukan Mainan</h2>
              <div className="bg-[#111] border border-[#1e1e1e] rounded-[20px] p-6">
                <div className="font-bold">RunningHub API Key (Wajib untuk Generate REAL)</div>
                <div className="text-[11px] opacity-60 mt-2">Tanpa ini akan selalu "Generate gagal di penyedia". Ambil di https://www.runninghub.ai/id/call-api/bill-task?tab=keys&type=consumer - Tab Consumer Keys - Create. Bisa pakai banyak key pisah koma untuk multi-key failover.</div>
                <div className="mt-4"><label className="text-[11px] opacity-70">Paste API Key Disini (Opsional, kalau kosong pakai ENV Vercel):</label><div className="mt-2 flex gap-2"><input type={showKey?'text':'password'} value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="rh_sk_... (kosongkan pakai ENV)" className="flex-1 bg-[#080808] border border-[#222] rounded-full px-4 py-3 text-[12px]" /><button onClick={()=>setShowKey(!showKey)} className="px-4 py-3 rounded-full bg-[#1a1a1a] border border-[#222] text-[11px]">{showKey?'Hide':'Show'}</button></div></div>
                <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px]"><b>Cara Pasang REAL di Vercel (biar permanen):</b><br/>1. Vercel Dashboard → Project ariri-studio- → Settings → Environment Variables<br/>2. Edit RUNNINGHUB_API_KEYS → Paste key asli (rh_...) → Save<br/>3. Deployments → Redeploy → Generate lagi → Video MP4 real keluar!</div>
                <div className="mt-4 p-3 rounded-xl bg-[#0a0a0a] border border-[#1a1a1a] text-[11px]"><b>Status Saat Ini:</b><br/>API Key Input: {apiKey? 'Terisi ('+apiKey.slice(0,10)+'***)' : 'Kosong (pakai ENV)'}<br/>ENV Vercel: {typeof window!=='undefined' ? 'Cek di Vercel Dashboard' : ''}<br/>Total Video: {history.length} • Semua REAL dari 0</div>
              </div>
              <div className="bg-[#111] border border-[#1e1e1e] rounded-[20px] p-6">
                <div className="font-bold">Cara Download Video • Dimana Disimpannya?</div>
                <div className="text-[11px] opacity-70 mt-2 leading-relaxed">1. Setelah generate selesai, di Preview kanan ada 2 tombol: <b>⬇ Download MP4</b> dan <b>🔗 Copy Link</b><br/>2. Klik Download MP4 → Video langsung ke-download ke HP/Laptop kamu (folder Download)<br/>3. Link video juga ada di bawah player (24 jam valid, RunningHub hapus setelah 24 jam, jadi download segera!)<br/>4. Semua video otomatis masuk Library → Bisa download ulang kapanpun selama link masih valid<br/>5. Total video, history, semua REAL dari 0, bukan dummy</div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
