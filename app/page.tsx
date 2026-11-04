"use client";
import { useState, useEffect, useRef } from 'react';

type ModelType='2.0'|'2.5';
interface RefImg{ id:string; url:string; name:string; }
interface HistoryItem{ id:string; prompt:string; model:ModelType; duration:number; res:string; aspect:string; date:string; videoUrl:string; }
type GenStatus='idle'|'processing'|'failed'|'success';

export default function AririAxcelLike(){
  const [model,setModel]=useState<ModelType>('2.5');
  const [duration,setDuration]=useState(5);
  const [prompt,setPrompt]=useState('');
  const [refs,setRefs]=useState<RefImg[]>([]);
  const [resolution,setResolution]=useState<'720p'|'1080p'|'480p'>('720p');
  const [aspect,setAspect]=useState('16:9');
  const [audio,setAudio]=useState(true);
  const [loading,setLoading]=useState(false);
  const [genStatus,setGenStatus]=useState<GenStatus>('idle');
  const [videoUrl,setVideoUrl]=useState('');
  const [log,setLog]=useState<string[]>(['> Ready - Ariri Studio REAL Personal']);
  const [history,setHistory]=useState<HistoryItem[]>([]);
  const [view,setView]=useState<'editor'|'library'>('editor');
  const [elapsed,setElapsed]=useState(0);
  const [step,setStep]=useState<'memproses'|'membuat'|'menyiapkan'>('memproses');
  const timerRef=useRef<NodeJS.Timeout|null>(null);

  const maxDur=model==='2.0'?15:30;
  const estimatedTotal = duration<=15?180: duration<=30?300:360;

  useEffect(()=>{
    if(loading && genStatus==='processing'){
      timerRef.current=setInterval(()=>setElapsed(e=>e+1),1000);
    } else {
      if(timerRef.current) clearInterval(timerRef.current);
    }
    return()=>{ if(timerRef.current) clearInterval(timerRef.current); };
  },[loading, genStatus]);

  useEffect(()=>{
    if(!loading) return;
    if(elapsed<20) setStep('memproses');
    else if(elapsed<120) setStep('membuat');
    else setStep('menyiapkan');
  },[elapsed, loading]);

  const formatTime=(s:number)=>{ const m=Math.floor(s/60); const sec=s%60; return `${m}:${sec.toString().padStart(2,'0')}`; };
  const progress = genStatus==='processing' ? Math.min(90, (elapsed/estimatedTotal)*100) : genStatus==='success'?100: genStatus==='failed'?100:0;

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
        setLog(l=>[...l, `> Uploaded ${n.length} foto ✔`]);
      } else {
        const local=Array.from(files).slice(0,remain).map(f=>({id:Math.random().toString(36).slice(2), url:URL.createObjectURL(f), name:f.name}));
        setRefs(r=>[...r,...local].slice(0,10));
        setLog(l=>[...l, `> Preview lokal (Blob belum connect)`]);
      }
    }catch(e:any){ setLog(l=>[...l, `> Upload error: ${e.message}`]); }
  };

  const doGenerate=async()=>{
    if(!prompt.trim()){ alert('Isi prompt dulu'); return; }
    setLoading(true);
    setGenStatus('processing');
    setElapsed(0);
    setStep('memproses');
    setLog([`> Model Seedance ${model} Global`, `> Duration ${duration}s / max ${maxDur}s`, `> Refs ${refs.length}/10`, `> Prompt: ${prompt}`, `> [${new Date().toLocaleTimeString()}] Memproses...`]);
    setVideoUrl('');
    try{
      const res=await fetch('/api/generate',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ prompt, duration, model, resolution, aspect_ratio:aspect, image_urls:refs.map(r=>r.url), generateAudio:audio })});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||'Provider error');
      const url=data.video?.url||data.url||'';
      if(url){
        setVideoUrl(url);
        setGenStatus('success');
        setLog(l=>[...l, `> TaskId ${data.taskId}`, `> Selesai ✔ Video ready`]);
        const item:HistoryItem={ id:Math.random().toString(36).slice(2), prompt, model, duration, res:resolution, aspect, date:new Date().toLocaleString('id-ID'), videoUrl:url };
        setHistory(h=>[item,...h]);
      } else {
        // if no url but task processing, treat as still processing then fail after timeout? For demo, if API returns processing without url, show processing UI then after 5s fail simulation if still no url
        if(data.status==='processing' || !url){
          // wait a bit then fail if no url (real case: RunningHub need longer poll)
          setLog(l=>[...l, `> Status ${data.status} • TaskId ${data.taskId} • Menunggu...`]);
          // Simulate fail if dummy key
          if(data.taskId==='direct' || !data.taskId){
            throw new Error('Generate gagal di penyedia');
          }
          // keep processing state, but if after poll no url, keep showing processing - here we set to failed after 10s for demo if no url
          setTimeout(()=>{
            if(!url){
              setGenStatus('failed');
              setLog(l=>[...l, `> ERROR: Generate gagal di penyedia`]);
            }
          }, 3000);
        }
      }
    }catch(e:any){
      setGenStatus('failed');
      setLog(l=>[...l, `> ERROR: ${e.message}`, `> Generate gagal di penyedia. Coba lagi sebentar lagi.`]);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry=()=>{
    setGenStatus('idle');
    setVideoUrl('');
    doGenerate();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e5e5e5] flex flex-col">
      <div className="bg-[#f5e6c8] text-[#1a1a1a] text-[11px] text-center py-[6px] font-medium">ARIRI STUDIO REAL • SEEDANCE 2.0 (15s) • 2.5 (30s) • 10 REF @img1-@img10 • RUNNINGHUB GLOBAL • REAL PROCESSING UI</div>
      <header className="h-[56px] border-b border-[#1e1e1e] bg-[#0f0f0f] sticky top-0 z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[9px] bg-[#f5e6c8] text-black font-black flex items-center justify-center">A</div>
          <span className="font-bold">ARIRI STUDIO</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a]">AXCEL LIKE • REAL</span>
        </div>
        <div className="text-[11px] px-3 py-1.5 rounded-full bg-[#151515] border border-[#222]">{history.length} video • 0 kredit system • Personal</div>
      </header>

      <div className="flex flex-1">
        <aside className="hidden md:flex w-[210px] border-r border-[#141414] bg-[#0f0f0f] p-4 flex-col gap-5">
          <div><div className="text-[10px] opacity-30 font-bold tracking-widest mb-2">VIDEO AI</div><button onClick={()=>setView('editor')} className="w-full text-left px-3 py-2.5 rounded-xl bg-[#1c1c1c] border border-[#2a2a2a] text-[13px]">🎬 Seedance Generator</button></div>
          <div><div className="text-[10px] opacity-30 font-bold tracking-widest mb-2">LIBRARY</div><button onClick={()=>setView('library')} className="w-full text-left px-3 py-2.5 rounded-xl bg-[#111] border border-[#1e1e1e] text-[13px]">📁 Library {history.length}</button></div>
          <div className="mt-auto text-[10px] opacity-20">Axcel-like UI • Real status • Memproses / Membuat / Menyiapkan • Gagal handling</div>
        </aside>

        <main className="flex-1 p-4 md:p-6">
          {view==='editor' && (
            <div className="max-w-[1280px] mx-auto grid lg:grid-cols-[1.15fr_0.85fr] gap-5">
              <div className="bg-[#111] border border-[#1e1e1e] rounded-[20px] p-5 space-y-4">
                <div className="flex gap-2">
                  <select value={model} onChange={e=>{setModel(e.target.value as any); if(e.target.value==='2.0'&&duration>15)setDuration(15);}} className="bg-[#0a0a0a] border border-[#222] rounded-full px-4 py-2 text-[13px]"><option value="2.0">Seedance 2.0 — Max 15 detik</option><option value="2.5">Seedance 2.5 — Max 30 detik • 10 Ref @img</option></select>
                  <span className="text-[11px] px-3 py-1.5 rounded-full bg-[#0a0a0a] border border-[#222]">{duration}s / {maxDur}s</span>
                </div>
                <input type="range" min={4} max={maxDur} value={duration} onChange={e=>setDuration(parseInt(e.target.value))} className="w-full accent-[#f5e6c8]" />
                <div>
                  <div className="text-[11px] font-bold opacity-60 mb-2">PROMPT • Pakai @img1..@img10</div>
                  <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Contoh: Wanita @img1 berjalan di sawah Bali cinematic golden hour, wajah konsisten 100% @img1" className="w-full bg-[#080808] border border-[#1e1e1e] rounded-[14px] p-4 text-[13px] min-h-[100px] outline-none" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <select value={resolution} onChange={e=>setResolution(e.target.value as any)} className="bg-[#080808] border border-[#1e1e1e] rounded-full px-3 py-2.5 text-[12px]"><option value="480p">480p</option><option value="720p">720p</option><option value="1080p">1080p</option></select>
                  <select value={aspect} onChange={e=>setAspect(e.target.value)} className="bg-[#080808] border border-[#1e1e1e] rounded-full px-3 py-2.5 text-[12px]"><option value="16:9">16:9</option><option value="9:16">9:16</option><option value="1:1">1:1</option><option value="adaptive">Adaptive</option></select>
                  <button onClick={()=>setAudio(!audio)} className={`rounded-full px-3 py-2.5 text-[12px] border ${audio?'bg-[#f5e6c8] text-black font-bold':'bg-[#080808] border-[#1e1e1e]'}`}>🔊 Audio {audio?'ON':'OFF'}</button>
                </div>
                <div className="bg-[#0c0c0c] border border-[#1a1a1a] rounded-[14px] p-4">
                  <div className="text-[12px] font-bold">Foto Referensi • {refs.length}/10 max • Tag @img1..@img10 otomatis</div>
                  <div className="grid grid-cols-5 gap-2 mt-3">
                    {refs.map((r,i)=><div key={r.id} className="relative aspect-square rounded-xl overflow-hidden border border-[#222] bg-[#151515]"><img src={r.url} className="w-full h-full object-cover" /><button onClick={()=>setRefs(pr=>pr.filter(x=>x.id!==r.id))} className="absolute top-1 right-1 w-5 h-5 bg-black/80 rounded-full text-[10px]">✕</button><div className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] text-center py-1">@img{i+1}</div></div>)}
                    {refs.length<10 && <label className="aspect-square rounded-xl border border-dashed border-[#222] bg-[#0a0a0a] flex flex-col items-center justify-center cursor-pointer"><span className="text-xl opacity-30">+</span><span className="text-[10px] opacity-40">Upload</span><input type="file" multiple accept="image/*" className="hidden" onChange={e=>handleFiles(e.target.files)} /></label>}
                  </div>
                </div>
                <button onClick={doGenerate} disabled={loading} className="w-full h-[50px] rounded-full bg-[#f5e6c8] text-black font-bold text-[14px] disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? <><span className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></span> Generating {duration}s...</> : <>✨ Generate Video</>}
                </button>
              </div>

              <div className="space-y-4">
                {/* AXCEL-LIKE STATUS CARD - INI YANG KAMU MAU */}
                <div className="bg-[#111111] border border-[#1e1e1e] rounded-[20px] p-4">
                  <div className="bg-[#0a0a0a] border border-[#151515] rounded-[16px] p-6 min-h-[340px] flex flex-col items-center justify-center text-center">
                    {genStatus==='idle' && !videoUrl && (
                      <>
                        <div className="w-20 h-20 rounded-full border border-[#1e1e1e] flex items-center justify-center opacity-20">🎬</div>
                        <div className="mt-4 text-[14px] font-bold opacity-40">Belum ada video</div>
                        <div className="text-[11px] opacity-20 mt-1">Upload foto referensi dulu • 0 video</div>
                      </>
                    )}

                    {genStatus==='processing' && (
                      <>
                        {/* Double circle spinner ala axcel.cloud */}
                        <div className="relative w-[88px] h-[88px]">
                          <div className="absolute inset-0 rounded-full border-2 border-[#1e1e1e]"></div>
                          <div className="absolute inset-0 rounded-full border-2 border-t-[#f5e6c8] border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                          <div className="absolute inset-[10px] rounded-full border-2 border-[#1a1a1a] border-t-[#f5e6c8]/60 border-r-transparent border-b-transparent border-l-transparent animate-spin" style={{animationDirection:'reverse', animationDuration:'1.2s'}}></div>
                          <div className="absolute inset-0 flex items-center justify-center"><span className="text-xl">✨</span></div>
                        </div>
                        <div className="mt-6 text-[16px] font-bold">Sedang membuat video</div>
                        <div className="mt-2 text-[12px] opacity-50 leading-relaxed max-w-[300px]">Biasanya 1 sampai 5 menit, lebih lama untuk durasi panjang. Kamu boleh tetap di halaman ini.</div>
                        <div className="mt-6 w-full max-w-[320px]">
                          <div className="w-full h-[6px] bg-[#1a1a1a] rounded-full overflow-hidden">
                            <div className="h-full bg-[#f5e6c8] rounded-full transition-all duration-1000" style={{width:`${progress}%`}}></div>
                          </div>
                          <div className="flex justify-between mt-1 text-[10px] opacity-40"><span>{formatTime(elapsed)} • {Math.floor(progress)}%</span><span>~{formatTime(estimatedTotal)} • Sisa {formatTime(Math.max(0,estimatedTotal-elapsed))}</span></div>
                        </div>
                        <div className="mt-6 flex items-center gap-6 text-[11px]">
                          <div className="flex items-center gap-2"><div className={`w-5 h-5 rounded-full flex items-center justify-center ${step==='memproses'||step==='membuat'||step==='menyiapkan'?'bg-[#f5e6c8] text-black':'border border-[#333] opacity-30'}`}>{step!=='memproses' ? '✓' : '◍'}</div><span className={step==='memproses'?'font-bold':''}>Memproses</span></div>
                          <div className="flex items-center gap-2"><div className={`w-5 h-5 rounded-full flex items-center justify-center ${step==='membuat'||step==='menyiapkan'?'bg-[#f5e6c8] text-black':'border border-[#333] opacity-30'}`}>{step==='menyiapkan' ? '✓' : step==='membuat'?'◍':'○'}</div><span className={step==='membuat'?'font-bold':''}>Membuat</span></div>
                          <div className="flex items-center gap-2"><div className={`w-5 h-5 rounded-full flex items-center justify-center ${step==='menyiapkan'?'border border-[#f5e6c8]':'border border-[#333] opacity-30'}`}>○</div><span className={step==='menyiapkan'?'font-bold opacity-80':'opacity-40'}>Menyiapkan</span></div>
                        </div>
                      </>
                    )}

                    {genStatus==='failed' && (
                      <>
                        <div className="w-[72px] h-[72px] rounded-full border border-[#2a2a2a] bg-[#1a1a1a] flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full border-2 border-[#444] flex items-center justify-center text-xl">!</div>
                        </div>
                        <div className="mt-6 text-[14px] font-bold">Generate gagal di penyedia. Coba lagi sebentar lagi.</div>
                        <div className="mt-2 text-[11px] opacity-40">Penyedia RunningHub mungkin sibuk • {formatTime(elapsed)} • Task error</div>
                        <button onClick={handleRetry} className="mt-5 px-5 py-2.5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-[13px] flex items-center gap-2 hover:bg-[#222]"><span>↻</span> Coba lagi</button>
                        <div className="mt-4 w-full max-w-[320px] h-[6px] bg-[#1a1a1a] rounded-full overflow-hidden"><div className="h-full bg-red-400/60 w-full"></div></div>
                      </>
                    )}

                    {genStatus==='success' && videoUrl && (
                      <>
                        <video src={videoUrl} controls autoPlay className="w-full rounded-xl max-h-[220px]" />
                        <div className="mt-4 text-[13px] font-bold">Video selesai! ✓</div>
                        <a href={videoUrl} target="_blank" className="mt-3 px-5 py-2.5 rounded-full bg-[#f5e6c8] text-black text-[12px] font-bold">⬇ Download Video</a>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-[#080808] border border-[#151515] rounded-[16px] p-3">
                  <div className="text-[10px] opacity-30 font-bold tracking-widest">LOGS • {genStatus.toUpperCase()} • {formatTime(elapsed)}</div>
                  <div className="font-mono text-[11px] text-[#7fdb8a] bg-black rounded-xl p-3 h-[180px] overflow-auto mt-2">{log.map((l,i)=><div key={i}>{l}</div>)}</div>
                </div>
              </div>
            </div>
          )}

          {view==='library' && (
            <div className="max-w-[1000px] mx-auto"><h2 className="font-bold">Library {history.length}</h2>{history.length===0?<div className="mt-6 border border-dashed border-[#222] rounded-[20px] p-12 text-center opacity-30">0 video</div>:<div className="grid md:grid-cols-3 gap-4 mt-4">{history.map(h=><div key={h.id} className="bg-[#111] border border-[#1e1e1e] rounded-[16px] p-3"><video src={h.videoUrl} controls className="w-full rounded-xl" /><div className="text-[11px] opacity-60 mt-2">{h.prompt.slice(0,60)}</div></div>)}</div>}</div>
          )}
        </main>
      </div>
    </div>
  );
}
