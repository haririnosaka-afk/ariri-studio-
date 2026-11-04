"use client";
import { useState, useEffect, useRef } from 'react';

export default function AririSeedance25(){
  const [prompt,setPrompt]=useState('Wanita cantik @img1 di Bali cinematic, Seedance 2.5 30s');
  const [duration,setDuration]=useState(15);
  const [imageUrl,setImageUrl]=useState('');
  const [loading,setLoading]=useState(false);
  const [status,setStatus]=useState<'idle'|'processing'|'success'|'failed'>('idle');
  const [videoUrl,setVideoUrl]=useState('');
  const [apiKey,setApiKey]=useState('');
  const [showKey,setShowKey]=useState(false);
  const [elapsed,setElapsed]=useState(0);
  const timerRef=useRef<any>(null);

  useEffect(()=>{ const k=localStorage.getItem('ariri_key'); if(k) setApiKey(k); },[]);
  useEffect(()=>{ if(status==='processing'){ timerRef.current=setInterval(()=>setElapsed(e=>e+1),1000);} else clearInterval(timerRef.current); return()=>clearInterval(timerRef.current); },[status]);
  const fmt=(s:number)=>`${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;

  const saveKey=()=>{
    if(apiKey.length<10){ alert('Paste apikey 32 karakter! 1643ccb0...'); return; }
    localStorage.setItem('ariri_key', apiKey);
    alert('✅ Key disimpan! Seedance 2.5 siap - cuma apikey doang!');
  };
  const handleFile=(files:FileList|null)=>{ if(!files?.[0]) return; setImageUrl(URL.createObjectURL(files[0])); };
  const generate=async()=>{
    if(!apiKey){ alert('Paste apikey dulu!'); return; }
    if(!imageUrl){ alert('Upload foto dulu!'); return; }
    setLoading(true); setStatus('processing'); setElapsed(0); setVideoUrl('');
    try{
      const res=await fetch('/api/generate',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ prompt, duration, image_urls:[imageUrl], apiKey })});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error);
      if(data.video?.url){ setVideoUrl(data.video.url); setStatus('success'); }
      else throw new Error('No video');
    }catch(e:any){ setStatus('failed'); alert('Error: '+e.message); }
    finally{ setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <div className="bg-[#f5e6c8] text-black text-[11px] font-bold text-center py-2 tracking-widest">ARIRI STUDIO • SEEDANCE 2.5 • 30 DETIK • CUMA APIKEY • 636 COINS</div>
      <header className="h-[64px] flex items-center justify-between px-6 bg-[#0f0f0f] border-b border-[#1e1e1e] sticky top-0 z-40">
        <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-[#f5e6c8] text-black font-black flex items-center justify-center">2.5</div><div><div className="font-black tracking-wide">ARIRI STUDIO • SEEDANCE 2.5</div><div className="text-[10px] opacity-50">30 detik • Audio Native • Cuma Apikey • Kayak Clarisa</div></div></div>
      </header>

      <main className="max-w-[1200px] mx-auto p-6 grid md:grid-cols-[1.1fr_0.9fr] gap-6">
        <div className="bg-[#111] border border-[#1e1e1e] rounded-[22px] p-6 space-y-5">
          <div className="bg-[#f5e6c8]/10 border border-[#f5e6c8]/20 rounded-[16px] p-4">
            <div className="text-[11px] font-black tracking-widest text-[#f5e6c8]">🔑 SEEDANCE 2.5 - CUMA APIKEY DOANG!</div>
            <div className="text-[11px] opacity-70 mt-2">Seedance 2.5 bisa 4-30 detik + audio native! Cuma butuh apikey 1643ccb0... kayak Clarisa, langsung pakai 636 coins!</div>
            <div className="flex gap-2 mt-3">
              <input type={showKey?'text':'password'} value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="1643ccb0ad504284becb69c084d919bf" className="flex-1 bg-[#080808] border border-[#222] rounded-full px-5 py-3.5 text-[13px] font-mono" />
              <button onClick={()=>setShowKey(!showKey)} className="px-4 py-3.5 rounded-full bg-[#1a1a1a] border border-[#222] text-[12px]">{showKey?'Hide':'Show'}</button>
            </div>
            <button onClick={saveKey} className="mt-3 w-full h-[46px] rounded-full bg-[#f5e6c8] text-black font-black text-[13px]">💾 Simpan Key - Seedance 2.5</button>
            {apiKey && <div className="mt-2 text-[11px] text-green-400">✅ {apiKey.slice(0,8)}*** siap - Seedance 2.5 30s! 636 coins!</div>}
          </div>

          <div>
            <label className="text-[11px] font-bold tracking-widest opacity-60">UPLOAD FOTO (@img1) - Seedance 2.5</label>
            <label className="mt-3 w-full aspect-[16/10] rounded-[18px] border-2 border-dashed border-[#222] bg-[#080808] flex flex-col items-center justify-center cursor-pointer overflow-hidden">
              {imageUrl ? <img src={imageUrl} className="w-full h-full object-cover" /> : <><span className="text-3xl opacity-20">+</span><span className="text-[11px] mt-2 opacity-40">Klik upload foto ref</span></>}
              <input type="file" accept="image/*" className="hidden" onChange={e=>handleFile(e.target.files)} />
            </label>
          </div>

          <div>
            <label className="text-[11px] font-bold tracking-widest opacity-60">PROMPT - Seedance 2.5</label>
            <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} className="mt-3 w-full bg-[#080808] border border-[#1e1e1e] rounded-[16px] p-4 text-[13px] min-h-[100px]" />
          </div>

          <div>
            <label className="text-[11px] font-bold tracking-widest opacity-60">DURASI SEEDANCE 2.5: {duration}s {duration<=15?'(2.0 style)':'(2.5 30s)'} - 636 coins</label>
            <input type="range" min={4} max={30} value={duration} onChange={e=>setDuration(parseInt(e.target.value))} className="w-full accent-[#f5e6c8] mt-3" />
            <div className="flex justify-between text-[10px] opacity-40 mt-1"><span>4s</span><span>15s (2.0)</span><span>30s (2.5 Pro)</span></div>
          </div>

          <button onClick={generate} disabled={loading} className="w-full h-[56px] rounded-full bg-[#f5e6c8] text-black font-black text-[15px] disabled:opacity-50">
            {loading ? `Membuat Seedance 2.5... ${fmt(elapsed)} - 636 coins` : `✨ Generate Seedance 2.5 ${duration}s - Cuma Apikey!`}
          </button>
        </div>

        <div className="bg-[#111] border border-[#1e1e1e] rounded-[22px] p-4">
          <div className="text-[11px] font-bold tracking-widest opacity-60">PREVIEW SEEDANCE 2.5 • {status.toUpperCase()} • {fmt(elapsed)}</div>
          <div className="bg-[#050505] border border-[#151515] rounded-[18px] min-h-[400px] flex items-center justify-center p-6 mt-3">
            {status==='idle' && <div className="text-center opacity-30">🎬<div className="mt-3 text-[13px]">Seedance 2.5<br/>4-30 detik + audio<br/>Cuma apikey!</div></div>}
            {status==='processing' && <div className="text-center"><div className="w-[88px] h-[88px] mx-auto rounded-full border-2 border-[#1e1e1e] border-t-[#f5e6c8] animate-spin"></div><div className="mt-6 font-bold">Seedance 2.5 {duration}s...</div><div className="mt-2 text-[12px] opacity-50">{fmt(elapsed)} • 636 coins • {duration}s</div></div>}
            {status==='failed' && <div className="text-center"><div className="text-2xl">!</div><div className="mt-3 font-bold">Gagal - cek alert</div></div>}
            {status==='success' && videoUrl && <div className="w-full"><video src={videoUrl} controls autoPlay className="w-full rounded-[16px] max-h-[300px] bg-black" /><a href={videoUrl} target="_blank" className="mt-4 h-[46px] rounded-full bg-[#f5e6c8] text-black font-black flex items-center justify-center text-[14px]">⬇ Download Seedance 2.5 MP4</a><button onClick={()=>{navigator.clipboard.writeText(videoUrl); alert('Link copied!');}} className="mt-3 w-full h-[44px] rounded-full bg-[#1a1a1a] border border-[#222] font-bold text-[13px]">📋 Copy Link</button></div>}
          </div>
          <div className="mt-4 bg-[#f5e6c8]/10 border border-[#f5e6c8]/20 rounded-[12px] p-3 text-[11px]">
            💡 <b>Seedance 2.5</b> bisa 30s + audio native! Kayak Clarisa tapi ini 2.5! Cuma apikey doang, ID nya udah di dalem!
          </div>
        </div>
      </main>
    </div>
  );
}
