"use client";
import { useState, useEffect } from 'react';

type ModelType='2.0'|'2.5';
interface RefImg{ id:string; url:string; name:string; }
interface HistoryItem{ id:string; prompt:string; model:ModelType; duration:number; res:string; aspect:string; date:string; videoUrl:string; }

export default function AririRealPersonal(){
  const [model,setModel]=useState<ModelType>('2.5');
  const [duration,setDuration]=useState(5);
  const [prompt,setPrompt]=useState('');
  const [refs,setRefs]=useState<RefImg[]>([]);
  const [resolution,setResolution]=useState<'720p'|'1080p'|'480p'>('720p');
  const [aspect,setAspect]=useState('16:9');
  const [audio,setAudio]=useState(true);
  const [loading,setLoading]=useState(false);
  const [videoUrl,setVideoUrl]=useState('');
  const [log,setLog]=useState<string[]>(['> Ready - Ariri Studio REAL Personal','> Connect RunningHub API + Vercel Blob']);
  const [history,setHistory]=useState<HistoryItem[]>([]);
  const [view,setView]=useState<'editor'|'library'>('editor');
  const [sidebarOpen,setSidebarOpen]=useState(true);
  const [apiKeyInput,setApiKeyInput]=useState('');
  const [useOwnKey,setUseOwnKey]=useState(false);
  const [stats,setStats]=useState({ total:0, today:0 });

  const maxDur=model==='2.0'?15:30;

  const handleFiles=async(files:FileList|null)=>{
    if(!files) return;
    const remain=10-refs.length;
    if(remain<=0) return;
    const fd=new FormData();
    Array.from(files).slice(0,remain).forEach(f=>fd.append('files',f));
    setLog(l=>[...l, `> Uploading ${Math.min(files.length,remain)} foto...`]);
    try{
      const res=await fetch('/api/upload',{method:'POST', body:fd});
      const data=await res.json();
      if(data.urls && data.urls.length>0){
        const n=data.urls.map((u:any)=>({id:Math.random().toString(36).slice(2), url:u.url, name:u.name}));
        setRefs(r=>[...r,...n].slice(0,10));
        setLog(l=>[...l, `> Uploaded ${n.length} foto ✔ Blob URL publik`]);
      } else {
        // fallback local
        const local=Array.from(files).slice(0,remain).map(f=>({id:Math.random().toString(36).slice(2), url:URL.createObjectURL(f), name:f.name}));
        setRefs(r=>[...r,...local].slice(0,10));
        setLog(l=>[...l, `> Preview lokal (Blob belum connect, hubungkan di Vercel Storage)`]);
      }
    }catch(e:any){ setLog(l=>[...l, `> Upload error: ${e.message}`]); }
  };

  const handleGenerate=async()=>{
    if(!prompt.trim()){ alert('Isi prompt dulu'); return; }
    if(model==='2.0' && refs.length===0){ alert('Seedance 2.0 butuh minimal 1 foto untuk Image to Video'); return; }
    setLoading(true);
    setLog([`> Model Seedance ${model} Global - RunningHub`, `> Duration ${duration}s / max ${maxDur}s`, `> Resolution ${resolution} Aspect ${aspect} Audio ${audio?'On':'Off'}`, `> Refs ${refs.length}/10 ${refs.length>0? refs.map((_,i)=>`@img${i+1}`).join(' '):''}`, `> Prompt: ${prompt}`, `> Generating...`]);
    setVideoUrl('');
    try{
      const res=await fetch('/api/generate',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ prompt, duration, model, resolution, aspect_ratio:aspect, image_urls:refs.map(r=>r.url), generateAudio:audio, apiKeyFromUser: useOwnKey?apiKeyInput:undefined })});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error+': '+JSON.stringify(data.detail||'').slice(0,300));
      const url=data.video?.url||data.url||'';
      setLog(l=>[...l, `> TaskId ${data.taskId}`, `> Status ${data.status}`, url?`> Video URL: ${url}`:'> Processing, cek dashboard RunningHub']);
      if(url){ setVideoUrl(url); const item:HistoryItem={ id:Math.random().toString(36).slice(2), prompt, model, duration, res:resolution, aspect, date:new Date().toLocaleString('id-ID'), videoUrl:url }; setHistory(h=>[item,...h]); setStats(s=>({total:s.total+1, today:s.today+1})); }
    }catch(e:any){ setLog(l=>[...l, `> ERROR: ${e.message}`]); }
    finally{ setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e5e5e5] flex flex-col">
      {/* top amber info - mirip axcel tapi beda */}
      <div className="bg-[#f5e6c8] text-[#1a1a1a] text-[11px] text-center py-[6px] font-medium tracking-wide">ARIRI STUDIO REAL • PERSONAL EDITION • SEEDANCE 2.0 (15s) • 2.5 (30s) • 10 REF @img1-@img10 • RUNNINGHUB GLOBAL</div>
      
      <header className="h-[56px] border-b border-[#1e1e1e] bg-[#0f0f0f]/80 backdrop-blur sticky top-0 z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button onClick={()=>setSidebarOpen(!sidebarOpen)} className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#262626] flex items-center justify-center">☰</button>
          <div className="w-8 h-8 rounded-[9px] bg-[#f5e6c8] text-black font-black flex items-center justify-center text-[13px]">A</div>
          <span className="font-bold tracking-tight text-[15px]">ARIRI STUDIO</span>
          <span className="hidden md:inline-flex text-[10px] px-2 py-0.5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a]">REAL • PERSONAL • 0 CREDIT SYSTEM</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-[11px] px-3 py-1.5 rounded-full bg-[#151515] border border-[#222]">{stats.total} video • Hari ini {stats.today}</div>
          <div className="text-[11px] px-3 py-1.5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a]">RunningHub Connected</div>
        </div>
      </header>

      <div className="flex flex-1">
        {sidebarOpen && (
          <aside className="w-[220px] shrink-0 border-r border-[#141414] bg-[#0f0f0f] p-4 flex flex-col gap-6 sticky top-[56px] h-[calc(100vh-56px)]">
            <div>
              <div className="text-[10px] tracking-[0.15em] opacity-30 font-bold mb-3">VIDEO AI</div>
              <button onClick={()=>setView('editor')} className={`w-full text-left px-3 py-2.5 rounded-xl text-[13px] flex items-center gap-2 ${view==='editor'?'bg-[#1c1c1c] text-white border border-[#2a2a2a]':'opacity-60 hover:opacity-100'}`}>🎬 <span>Seedance Generator</span></button>
              <div className="mt-1 text-[11px] opacity-40 px-3">2.0 max 15s • 2.5 max 30s + 10 ref</div>
            </div>
            <div>
              <div className="text-[10px] tracking-[0.15em] opacity-30 font-bold mb-3">LIBRARY</div>
              <button onClick={()=>setView('library')} className={`w-full text-left px-3 py-2.5 rounded-xl text-[13px] ${view==='library'?'bg-[#1c1c1c] border border-[#2a2a2a]':'opacity-60'}`}>📁 Library • {history.length}</button>
              <button className="w-full text-left px-3 py-2.5 rounded-xl text-[13px] opacity-30 mt-1">🕘 History • {stats.total}</button>
            </div>
            <div className="mt-auto bg-[#121212] border border-[#1e1e1e] rounded-[14px] p-3">
              <div className="text-[11px] font-bold">API Key (Opsional)</div>
              <div className="text-[10px] opacity-50 mt-1">Kosongkan pakai ENV Vercel, atau paste key pribadi</div>
              <div className="flex gap-2 mt-2">
                <button onClick={()=>setUseOwnKey(!useOwnKey)} className={`text-[10px] px-2 py-1 rounded-full border ${useOwnKey?'bg-[#f5e6c8] text-black border-[#f5e6c8]':'bg-[#1a1a1a] border-[#2a2a2a]'}`}>{useOwnKey?'Pakai Key Input':'Pakai ENV'}</button>
              </div>
              {useOwnKey && <input value={apiKeyInput} onChange={e=>setApiKeyInput(e.target.value)} placeholder="rh_sk_..." className="w-full mt-2 bg-black border border-[#2a2a2a] rounded-lg p-2 text-[11px]" />}
            </div>
            <div className="text-[10px] opacity-20 leading-relaxed">Personal Edition • No credit • No payment • Real RunningHub API • Blob for 10 refs • Stats start from 0</div>
          </aside>
        )}

        <main className="flex-1 p-4 md:p-6 bg-[#0a0a0a]">
          {view==='editor' && (
            <div className="max-w-[1280px] mx-auto grid lg:grid-cols-[1.15fr_0.85fr] gap-5">
              {/* left editor - mirip axcel tapi beda layout */}
              <div className="bg-[#111111] border border-[#1e1e1e] rounded-[20px] p-5 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <select value={model} onChange={e=>{setModel(e.target.value as any); if(e.target.value==='2.0'&&duration>15)setDuration(15);}} className="bg-[#0a0a0a] border border-[#222] rounded-full px-4 py-2 text-[13px] outline-none">
                    <option value="2.0">Seedance 2.0 — Max 15 detik</option>
                    <option value="2.5">Seedance 2.5 — Max 30 detik • 10 Ref @img</option>
                  </select>
                  <span className="text-[11px] px-3 py-1.5 rounded-full bg-[#0a0a0a] border border-[#222]">⏱ {duration}s / {maxDur}s</span>
                  <span className="text-[11px] px-3 py-1.5 rounded-full bg-[#0a0a0a] border border-[#222]">{refs.length}/10 ref</span>
                </div>

                <input type="range" min={4} max={maxDur} value={duration} onChange={e=>setDuration(parseInt(e.target.value))} className="w-full accent-[#f5e6c8] h-1" />

                <div className="relative">
                  <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Tulis prompt kamu di sini... Contoh: Wanita @img1 berjalan di sawah Bali cinematic golden hour, wajah konsisten 100% @img1, gerakan natural" className="w-full bg-[#080808] border border-[#1e1e1e] rounded-[14px] p-4 text-[13px] min-h-[110px] outline-none focus:border-[#2a2a2a] placeholder:opacity-30" />
                  <div className="absolute bottom-2 right-3 text-[10px] opacity-30">{prompt.length}/2000 • Pakai @img1..@img10 untuk referensi</div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <select value={resolution} onChange={e=>setResolution(e.target.value as any)} className="bg-[#080808] border border-[#1e1e1e] rounded-full px-3 py-2.5 text-[12px] outline-none">
                    <option value="480p">480p • Hemat</option>
                    <option value="720p">720p • Balance</option>
                    <option value="1080p">1080p • Tajam</option>
                  </select>
                  <select value={aspect} onChange={e=>setAspect(e.target.value)} className="bg-[#080808] border border-[#1e1e1e] rounded-full px-3 py-2.5 text-[12px] outline-none">
                    <option value="16:9">16:9 Landscape</option>
                    <option value="9:16">9:16 Portrait</option>
                    <option value="1:1">1:1 Square</option>
                    <option value="adaptive">Adaptive (ikut foto)</option>
                  </select>
                  <button onClick={()=>setAudio(!audio)} className={`rounded-full px-3 py-2.5 text-[12px] border ${audio?'bg-[#f5e6c8] text-black border-[#f5e6c8] font-bold':'bg-[#080808] border-[#1e1e1e]'}`}>🔊 Audio {audio?'ON':'OFF'}</button>
                </div>

                <div className="bg-[#0c0c0c] border border-[#1a1a1a] rounded-[14px] p-4">
                  <div className="flex justify-between items-center">
                    <div className="text-[12px] font-bold">Foto Referensi • {refs.length}/10 max</div>
                    <div className="text-[10px] opacity-40">Tag @img1..@img10 di prompt otomatis</div>
                  </div>
                  <div className="grid grid-cols-5 gap-2.5 mt-3">
                    {refs.map((r,i)=><div key={r.id} className="group relative aspect-square rounded-xl overflow-hidden border border-[#222] bg-[#151515]"><img src={r.url} className="w-full h-full object-cover" /><button onClick={()=>setRefs(pr=>pr.filter(x=>x.id!==r.id))} className="absolute top-1 right-1 w-5 h-5 bg-black/80 rounded-full text-[10px] flex items-center justify-center">✕</button><div className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] text-center py-1">@img{i+1}</div></div>)}
                    {refs.length<10 && <label className="aspect-square rounded-xl border border-dashed border-[#222] bg-[#0a0a0a] flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-[#333] hover:bg-[#101010]"><span className="text-xl opacity-30">+</span><span className="text-[10px] opacity-40">Upload</span><input type="file" multiple accept="image/*" className="hidden" onChange={e=>handleFiles(e.target.files)} /></label>}
                  </div>
                  {refs.length===0 && <div className="mt-3 text-[11px] opacity-30 text-center py-2 border border-dashed border-[#1a1a1a] rounded-xl">Belum ada foto • Upload 1 foto = Image to Video • 2-10 foto = Referensi wajah konsisten</div>}
                </div>

                <button onClick={handleGenerate} disabled={loading} className="w-full h-[48px] rounded-full bg-[#f5e6c8] text-black font-bold text-[14px] tracking-wide disabled:opacity-40 hover:bg-[#efe0c0] transition">{loading?`Generating Seedance ${model} ${duration}s...`:`Generate Video • ${model} • ${duration}s`}</button>
                <div className="text-[10px] opacity-30 text-center">Real API: {model==='2.0'?'/bytedance/seedance-2.0-global/...':'/bytedance/seedance-2.5-global-token/multimodal-video'} • Multi-key failover • Blob URL publik</div>
              </div>

              {/* right preview */}
              <div className="space-y-4">
                <div className="bg-[#111111] border border-[#1e1e1e] rounded-[20px] p-3">
                  <div className="aspect-video bg-[#050505] rounded-[14px] overflow-hidden border border-[#151515] flex items-center justify-center">
                    {videoUrl ? <video src={videoUrl} controls autoPlay playsInline className="w-full h-full" /> : <div className="text-center p-8"><div className="text-[13px] opacity-30">Preview Video</div><div className="text-[11px] opacity-20 mt-1">Hasil generate muncul di sini • Download segera (RunningHub simpan 24 jam)</div><div className="mt-4 text-[10px] opacity-20">0 video • Start from 0 • Personal Edition</div></div>}
                  </div>
                  {videoUrl && <a href={videoUrl} target="_blank" className="mt-3 block text-center w-full py-2.5 rounded-full bg-[#1a1a1a] border border-[#222] text-[12px] hover:bg-[#222]">⬇ Download Video</a>}
                </div>

                <div className="bg-[#080808] border border-[#151515] rounded-[16px] p-3">
                  <div className="text-[10px] tracking-widest opacity-30 font-bold mb-2">LOGS</div>
                  <div className="font-mono text-[11px] text-[#7fdb8a] bg-black rounded-xl p-3 h-[220px] overflow-auto leading-relaxed">{log.map((l,i)=><div key={i}>{l}</div>)}</div>
                </div>

                <div className="bg-[#111111] border border-[#1e1e1e] rounded-[16px] p-4 grid grid-cols-3 gap-3 text-center">
                  <div><div className="text-[11px] opacity-40">Total Generated</div><div className="text-xl font-bold mt-1">{stats.total}</div></div>
                  <div><div className="text-[11px] opacity-40">Hari Ini</div><div className="text-xl font-bold mt-1">{stats.today}</div></div>
                  <div><div className="text-[11px] opacity-40">Ref Used</div><div className="text-xl font-bold mt-1">{refs.length}/10</div></div>
                </div>
              </div>
            </div>
          )}

          {view==='library' && (
            <div className="max-w-[1100px] mx-auto">
              <h2 className="text-[18px] font-bold">Library • {history.length} video</h2>
              <p className="text-[11px] opacity-40 mt-1">Semua video start dari 0, tidak ada dummy</p>
              {history.length===0 ? (
                <div className="mt-8 border border-dashed border-[#1e1e1e] rounded-[20px] p-12 text-center"><div className="text-[14px] opacity-30">Belum ada video</div><div className="text-[11px] opacity-20 mt-2">Generate pertama kamu akan muncul di sini • 0 video saat ini</div></div>
              ) : (
                <div className="mt-6 grid md:grid-cols-3 gap-4">{history.map(h=><div key={h.id} className="bg-[#111111] border border-[#1e1e1e] rounded-[16px] p-3"><div className="aspect-video bg-black rounded-xl overflow-hidden"><video src={h.videoUrl} controls className="w-full h-full" /></div><div className="mt-3 text-[11px] leading-relaxed"><div className="opacity-70 line-clamp-2">{h.prompt||'(no prompt)'}</div><div className="opacity-30 mt-1">{h.model} • {h.duration}s • {h.res} • {h.aspect} • {h.date}</div></div></div>)}</div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
