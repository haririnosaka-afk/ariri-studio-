"use client";
import { useState, useEffect, useRef } from 'react';

export default function Ariri636Coins(){
  const [prompt,setPrompt]=useState('Wanita cantik @img1 di Bali cinematic');
  const [duration,setDuration]=useState(10);
  const [imageUrl,setImageUrl]=useState('');
  const [loading,setLoading]=useState(false);
  const [status,setStatus]=useState<'idle'|'processing'|'failed'|'success'>('idle');
  const [videoUrl,setVideoUrl]=useState('');
  const [apiKey,setApiKey]=useState('');
  const [webappId,setWebappId]=useState('');
  const [showKey,setShowKey]=useState(false);
  const [elapsed,setElapsed]=useState(0);
  const timerRef=useRef<any>(null);

  useEffect(()=>{
    const k = localStorage.getItem('ariri_636_key');
    if(k) setApiKey(k);
    const w = localStorage.getItem('ariri_636_webapp');
    if(w) setWebappId(w);
  },[]);

  useEffect(()=>{
    if(status==='processing'){ timerRef.current=setInterval(()=>setElapsed(e=>e+1),1000); }
    else if(timerRef.current) clearInterval(timerRef.current);
    return()=>clearInterval(timerRef.current);
  },[status]);

  const fmt=(s:number)=>`${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;

  const save=()=>{
    if(apiKey.length<10){ alert('Paste key 1643ccb0...'); return; }
    localStorage.setItem('ariri_636_key', apiKey);
    localStorage.setItem('ariri_636_webapp', webappId);
    alert(`✅ Disimpan!\nKey: ${apiKey.slice(0,8)}***\nWebApp: ${webappId || 'pakai public 21128... (coba dulu)'}\nSitus kamu nanti kepotong 636 RH Coins, bukan $!`);
  };

  const handleFile=(files:FileList|null)=>{
    if(!files?.[0]) return;
    setImageUrl(URL.createObjectURL(files[0]));
  };

  const generate=async()=>{
    if(!apiKey){ alert('Paste key 1643ccb0... dulu!'); return; }
    if(!imageUrl){ alert('Upload foto dulu!'); return; }
    setLoading(true); setStatus('processing'); setElapsed(0); setVideoUrl('');
    try{
      const res=await fetch('/api/generate',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ prompt, duration, image_urls:[imageUrl], apiKey, webappId })});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||'Gagal');
      if(data.video?.url){
        setVideoUrl(data.video.url); setStatus('success');
      } else throw new Error('No video');
    }catch(e:any){ setStatus('failed'); alert(e.message); }
    finally{ setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4">
      <div className="max-w-[600px] mx-auto space-y-4">
        <div className="bg-[#a3ff00] text-black rounded-[14px] p-3 text-[11px] font-black text-center">SITUS KAMU PAKAI 636 RH COINS • BUKAN $ • KEY 1643ccb0... KAMU YANG KEPAKE!</div>
        
        <div className="bg-[#111] border border-[#222] rounded-[20px] p-5">
          <h2 className="font-black text-[18px]">ARIRI - 636 COINS EDITION</h2>
          <div className="text-[11px] opacity-60 mt-1">Situs kamu ariri-studio-ochre.vercel.app yang kepotong 636 coins, bukan dompet $</div>
          
          <div className="mt-5">
            <label className="text-[11px] font-bold opacity-60">1. KEY KAMU (1643ccb0...)</label>
            <div className="flex gap-2 mt-2">
              <input type={showKey?'text':'password'} value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="1643ccb0ad504284becb69c084d919bf" className="flex-1 bg-[#000] border border-[#333] rounded-full px-4 py-3 text-[13px] font-mono" />
              <button onClick={()=>setShowKey(!showKey)} className="px-3 py-3 rounded-full bg-[#222] text-[11px]">{showKey?'Hide':'Show'}</button>
            </div>
          </div>

          <div className="mt-4">
            <label className="text-[11px] font-bold opacity-60">2. WEBAPP ID (punya kamu, biar 636 kepake)</label>
            <input value={webappId} onChange={e=>setWebappId(e.target.value)} placeholder="Kosongin dulu buat coba ID public, atau paste ID punya kamu" className="mt-2 w-full bg-[#000] border border-[#333] rounded-full px-4 py-3 text-[12px] font-mono" />
            <div className="mt-2 text-[10px] opacity-50 leading-relaxed">
              <b>Cara dapet ID punya kamu (biar 636 kepake):</b><br/>
              1. Buka <b>runninghub.ai</b> → <b>Workflows</b> → <b>Explore</b> → Search <b>Seedance</b><br/>
              2. Klik template Seedance → <b>Duplicate</b><br/>
              3. <b>Publish as AI App</b> → Copy <b>WebApp ID</b> → Paste disini<br/>
              Kalo kosongin, aku coba pakai ID public 2112819392992411649 dulu
            </div>
          </div>

          <button onClick={save} className="mt-4 w-full h-[44px] rounded-full bg-[#a3ff00] text-black font-black text-[13px]">💾 Simpan Key + WebApp ID</button>
          {apiKey && <div className="mt-2 text-[11px] text-[#a3ff00]">✅ {apiKey.slice(0,12)}*** siap - situs kamu yang kepotong 636 coins!</div>}
        </div>

        <div className="bg-[#111] border border-[#222] rounded-[20px] p-5">
          <label className="text-[11px] font-bold opacity-60">3. UPLOAD FOTO</label>
          <label className="mt-2 w-full aspect-[16/10] rounded-[16px] border-2 border-dashed border-[#333] bg-[#000] flex flex-col items-center justify-center cursor-pointer overflow-hidden">
            {imageUrl ? <img src={imageUrl} className="w-full h-full object-cover" /> : <><span className="text-3xl opacity-30">+</span><span className="text-[11px] mt-1 opacity-50">Klik upload</span></>}
            <input type="file" accept="image/*" className="hidden" onChange={e=>handleFile(e.target.files)} />
          </label>

          <div className="mt-5">
            <label className="text-[11px] font-bold opacity-60">4. PROMPT</label>
            <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} className="mt-2 w-full bg-[#000] border border-[#333] rounded-[16px] p-4 text-[13px] min-h-[80px]" />
          </div>

          <div className="mt-4">
            <label className="text-[11px] font-bold opacity-60">5. DURASI: {duration}s</label>
            <input type="range" min={4} max={15} value={duration} onChange={e=>setDuration(parseInt(e.target.value))} className="w-full accent-[#a3ff00] mt-2" />
          </div>

          <button onClick={generate} disabled={loading} className="mt-6 w-full h-[54px] rounded-full bg-[#a3ff00] text-black font-black disabled:opacity-50">
            {loading ? `Membuat... ${fmt(elapsed)} - kepotong 636 coins` : `✨ Generate ${duration}s - Pakai 636 Coins`}
          </button>
        </div>

        <div className="bg-[#111] border border-[#222] rounded-[20px] p-5 min-h-[300px] flex flex-col items-center justify-center">
          {status==='idle' && <div className="opacity-40 text-center">🎬<div className="mt-2 text-[13px]">Situs kamu yang kepotong 636 coins</div></div>}
          {status==='processing' && <div className="text-center"><div className="w-20 h-20 rounded-full border-2 border-[#222] border-t-[#a3ff00] animate-spin mx-auto"></div><div className="mt-4 font-bold">Sedang membuat... {fmt(elapsed)}</div><div className="text-[11px] opacity-50 mt-1">Key {apiKey.slice(0,8)}*** • Kepotong 636 RH Coins • 1-3 menit</div></div>}
          {status==='failed' && <div className="text-center"><div className="text-2xl">❌</div><div className="mt-2 text-[11px]">Gagal - cek alert</div></div>}
          {status==='success' && videoUrl && <div className="w-full"><video src={videoUrl} controls autoPlay className="w-full rounded-[14px] bg-black" /><a href={videoUrl} target="_blank" className="mt-4 block h-[44px] rounded-full bg-[#a3ff00] text-black font-bold flex items-center justify-center">⬇ Download MP4 - 636 Coins kepotong!</a></div>}
        </div>
      </div>
    </div>
  );
}
