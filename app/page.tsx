"use client";
import { useState, useEffect, useRef } from 'react';

interface RefImg{ id:string; url:string; name:string; }
interface HistoryItem{ id:string; prompt:string; duration:number; date:string; videoUrl:string; }

export default function AririSimple(){
  const [prompt,setPrompt]=useState('Wanita cantik @img1 di Bali cinematic');
  const [duration,setDuration]=useState(10);
  const [refs,setRefs]=useState<RefImg[]>([]);
  const [loading,setLoading]=useState(false);
  const [status,setStatus]=useState<'idle'|'processing'|'failed'|'success'>('idle');
  const [videoUrl,setVideoUrl]=useState('');
  const [history,setHistory]=useState<HistoryItem[]>([]);
  const [view,setView]=useState<'generate'|'settings'>('generate');
  const [elapsed,setElapsed]=useState(0);
  const [apiKey,setApiKey]=useState('');
  const [showKey,setShowKey]=useState(false);
  const timerRef=useRef<any>(null);
  const WEBAPP_ID = '2004066004755988481';

  useEffect(()=>{
    const k = localStorage.getItem('ariri_rh_keys');
    if(k) setApiKey(k.split(',')[0]);
    const h = localStorage.getItem('ariri_history');
    if(h){ try{ setHistory(JSON.parse(h)); }catch{} }
  },[]);

  useEffect(()=>{ localStorage.setItem('ariri_history', JSON.stringify(history)); },[history]);

  useEffect(()=>{
    if(status==='processing'){ timerRef.current=setInterval(()=>setElapsed(e=>e+1),1000); }
    else if(timerRef.current) clearInterval(timerRef.current);
    return()=>clearInterval(timerRef.current);
  },[status]);

  const fmt=(s:number)=>`${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;

  const saveKey=()=>{
    if(!apiKey || apiKey.length<20){ alert('Paste key 1643ccb0... kamu!'); return; }
    localStorage.setItem('ariri_rh_keys', apiKey);
    alert(`✅ Key disimpan! ${apiKey.slice(0,8)}***`);
  };

  const handleFiles=async(files:FileList|null)=>{
    if(!files) return;
    // Pakai URL lokal dulu biar ga ribet upload
    const local=Array.from(files).slice(0,1).map(f=>({id:Math.random().toString(36).slice(2), url:URL.createObjectURL(f), name:f.name}));
    setRefs(local);
    // Coba upload ke /api/upload kalau ada
    try{
      const fd=new FormData();
      Array.from(files).slice(0,1).forEach(f=>fd.append('files',f));
      const res=await fetch('/api/upload',{method:'POST', body:fd});
      const data=await res.json();
      if(data.urls?.length){
        setRefs(data.urls.map((u:any)=>({id:Math.random().toString(36).slice(2), url:u.url, name:u.name})));
      }
    }catch{}
  };

  const generate=async()=>{
    if(!apiKey){ setView('settings'); alert('Paste key 1643ccb0... dulu!'); return; }
    if(!prompt.trim()){ alert('Isi prompt!'); return; }
    if(refs.length===0){ alert('Upload 1 foto!'); return; }
    setLoading(true); setStatus('processing'); setElapsed(0); setVideoUrl('');
    try{
      // FIX: manggil /api/generate (bukan /api/generate/workflow) biar ga 404 HTML
      const res=await fetch('/api/generate',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ prompt, duration, image_urls:refs.map(r=>r.url), apiKey, webappId: WEBAPP_ID })});
      const text = await res.text();
      let data:any;
      try{ data = JSON.parse(text); } catch { throw new Error('Server error HTML: '+text.slice(0,200)); }
      if(!res.ok) throw new Error(data.error||'Gagal');
      const url=data.video?.url||data.url||'';
      if(url){
        setVideoUrl(url); setStatus('success');
        setHistory(h=>[{ id:Date.now().toString(), prompt, duration, date:new Date().toLocaleString('id-ID'), videoUrl:url },...h]);
      } else throw new Error('Video belum jadi - coba lagi, saldo mungkin habis');
    }catch(e:any){ setStatus('failed'); alert(e.message); }
    finally{ setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <div className="bg-[#f5e6c8] text-black text-[11px] font-bold text-center py-2">FIX JSON ERROR • Manggil /api/generate (bukan /workflow) • {apiKey?`✅ ${apiKey.slice(0,8)}*** SIAP`:'⚠️ PASTE KEY DULU'}</div>
      <header className="h-[64px] flex items-center justify-between px-6 bg-[#0f0f0f] border-b border-[#1e1e1e] sticky top-0 z-40">
        <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-[#f5e6c8] text-black font-black flex items-center justify-center">A</div><div><div className="font-black">ARIRI SIMPLE</div><div className="text-[10px] opacity-50">ID: {WEBAPP_ID.slice(0,8)}*** • Fix 404</div></div></div>
        <div className="flex gap-2">
          <button onClick={()=>setView('generate')} className={`px-4 py-2 rounded-full text-[13px] ${view==='generate'?'bg-[#f5e6c8] text-black font-bold':'bg-[#1a1a1a] border border-[#222]'}`}>Generate</button>
          <button onClick={()=>setView('settings')} className={`w-10 h-10 rounded-full ${view==='settings'?'bg-[#f5e6c8] text-black':'bg-[#1a1a1a] border border-[#222]'}`}>⚙️</button>
        </div>
      </header>

      <main className="p-6">
        {view==='generate' && (
          <div className="max-w-[1200px] mx-auto grid md:grid-cols-[1.2fr_0.8fr] gap-6">
            <div className="bg-[#111] border border-[#1e1e1e] rounded-[22px] p-6 space-y-5">
              {!apiKey && <div className="p-4 rounded-[14px] bg-amber-500/10 border border-amber-500/30 text-[12px]">👇 Klik ⚙️ → Paste <b>1643ccb0ad504284becb69c084d919bf</b> → Save</div>}
              <div><label className="text-[11px] font-bold opacity-60">DURASI</label><input type="range" min={4} max={15} value={duration} onChange={e=>setDuration(parseInt(e.target.value))} className="w-full accent-[#f5e6c8] mt-2" /><div className="flex justify-between text-[11px] opacity-50 mt-1"><span>{duration}s</span><span>Max 15s</span></div></div>
              <div><label className="text-[11px] font-bold opacity-60">PROMPT</label><textarea value={prompt} onChange={e=>setPrompt(e.target.value)} className="w-full bg-[#080808] border border-[#1e1e1e] rounded-[16px] p-4 text-[13px] min-h-[110px] mt-2" /></div>
              <div className="bg-[#0c0c0c] border border-[#1a1a1a] rounded-[18px] p-5"><div className="font-bold text-[13px]">Foto Ref • {refs.length}/1</div><div className="grid grid-cols-3 gap-3 mt-4">{refs.map((r,i)=><div key={r.id} className="relative aspect-square rounded-[14px] overflow-hidden border border-[#222]"><img src={r.url} className="w-full h-full object-cover" /><div className="absolute bottom-0 inset-x-0 bg-black/80 text-[10px] text-center py-1">@img{i+1}</div></div>)}{refs.length<1 && <label className="aspect-square rounded-[14px] border-2 border-dashed border-[#222] bg-[#0a0a0a] flex flex-col items-center justify-center cursor-pointer"><span className="text-2xl opacity-30">+</span><span className="text-[11px]">Upload</span><input type="file" accept="image/*" className="hidden" onChange={e=>handleFiles(e.target.files)} /></label>}</div></div>
              <button onClick={generate} disabled={loading} className="w-full h-[56px] rounded-full bg-[#f5e6c8] text-black font-black text-[15px] disabled:opacity-50">{loading?`Membuat... ${fmt(elapsed)}`:`✨ Generate ${duration}s`}</button>
            </div>
            <div className="bg-[#111] border border-[#1e1e1e] rounded-[22px] p-4">
              <div className="text-[11px] font-bold opacity-60">PREVIEW • {status.toUpperCase()} • {fmt(elapsed)}</div>
              <div className="bg-[#050505] border border-[#151515] rounded-[18px] min-h-[380px] flex items-center justify-center p-6 mt-3">
                {status==='idle' && <div className="text-center opacity-40">🎬<div className="mt-3">Belum ada video</div></div>}
                {status==='processing' && <div className="text-center"><div className="w-[96px] h-[96px] mx-auto rounded-full border-2 border-[#1e1e1e] border-t-[#f5e6c8] animate-spin"></div><div className="mt-6 font-bold">Sedang membuat...</div><div className="mt-2 text-[12px] opacity-60">Key {apiKey.slice(0,8)}*** • {fmt(elapsed)}</div></div>}
                {status==='failed' && <div className="text-center"><div className="text-2xl">❌</div><div className="mt-3 font-bold">Gagal - lihat alert</div></div>}
                {status==='success' && videoUrl && <div className="w-full"><video src={videoUrl} controls autoPlay className="w-full rounded-[14px] max-h-[260px] bg-black" /><a href={videoUrl} target="_blank" className="mt-4 h-[44px] rounded-full bg-[#f5e6c8] text-black font-bold flex items-center justify-center">⬇ Download MP4</a></div>}
              </div>
            </div>
          </div>
        )}
        {view==='settings' && (
          <div className="max-w-[600px] mx-auto space-y-6">
            <h2 className="text-[22px] font-black">Settings</h2>
            <div className="bg-[#111] border border-[#1e1e1e] rounded-[20px] p-6">
              <div className="font-bold">Paste Key 1643ccb0...</div>
              <div className="mt-3 flex gap-2">
                <input type={showKey?'text':'password'} value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="1643ccb0ad504284becb69c084d919bf" className="flex-1 bg-[#080808] border border-[#222] rounded-full px-5 py-3.5 text-[13px] font-mono" />
                <button onClick={()=>setShowKey(!showKey)} className="px-4 py-3.5 rounded-full bg-[#1a1a1a] border border-[#222] text-[12px]">{showKey?'Hide':'Show'}</button>
              </div>
              <button onClick={saveKey} className="mt-4 w-full h-[48px] rounded-full bg-[#f5e6c8] text-black font-black">💾 Simpan</button>
              <div className="mt-3 text-[11px] opacity-50">Fix: sekarang manggil /api/generate bukan /api/generate/workflow jadi ga 404 lagi</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
