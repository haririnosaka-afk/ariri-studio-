"use client";
import { useState, useEffect, useRef } from 'react';

export default function AririSuperSimple(){
  const [prompt,setPrompt]=useState('Wanita cantik @img1 di Bali cinematic');
  const [duration,setDuration]=useState(10);
  const [imageUrl,setImageUrl]=useState('');
  const [loading,setLoading]=useState(false);
  const [status,setStatus]=useState<'idle'|'processing'|'failed'|'success'>('idle');
  const [videoUrl,setVideoUrl]=useState('');
  const [apiKey,setApiKey]=useState('');
  const [showKey,setShowKey]=useState(false);
  const [elapsed,setElapsed]=useState(0);
  const timerRef=useRef<any>(null);

  useEffect(()=>{
    const k = localStorage.getItem('ariri_key');
    if(k) setApiKey(k);
  },[]);

  useEffect(()=>{
    if(status==='processing'){ timerRef.current=setInterval(()=>setElapsed(e=>e+1),1000); }
    else if(timerRef.current) clearInterval(timerRef.current);
    return()=>clearInterval(timerRef.current);
  },[status]);

  const fmt=(s:number)=>`${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;

  const saveKey=()=>{
    if(apiKey.length<10){ alert('Paste key 1643ccb0...'); return; }
    localStorage.setItem('ariri_key', apiKey);
    alert('✅ Key disimpan! Sekarang bisa generate tanpa bikin workflow!');
  };

  const handleFile=(files:FileList|null)=>{
    if(!files?.[0]) return;
    const url = URL.createObjectURL(files[0]);
    setImageUrl(url);
  };

  const generate=async()=>{
    if(!apiKey){ alert('Paste key 1643ccb0... dulu di bawah!'); return; }
    if(!prompt) { alert('Isi prompt'); return; }
    if(!imageUrl){ alert('Upload foto dulu'); return; }
    setLoading(true); setStatus('processing'); setElapsed(0); setVideoUrl('');
    try{
      const res=await fetch('/api/generate',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ prompt, duration, image_urls:[imageUrl], apiKey })});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||'Gagal');
      if(data.video?.url){
        setVideoUrl(data.video.url); setStatus('success');
      } else throw new Error('No video url');
    }catch(e:any){ setStatus('failed'); alert(e.message); }
    finally{ setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4">
      <div className="max-w-[600px] mx-auto space-y-4">
        <div className="bg-[#f5e6c8] text-black rounded-[14px] p-3 text-[11px] font-bold text-center">SUPER SIMPLE • KEY 1643ccb0... BISA LANGSUNG • GA PERLU WORKFLOW • GA PERLU WEBAPP ID</div>
        
        <div className="bg-[#111] border border-[#222] rounded-[20px] p-5">
          <h2 className="font-black text-[18px]">ARIRI SIMPLE</h2>
          <div className="text-[11px] opacity-60 mt-1">Paste key 1643ccb0... kamu, upload foto, generate - udah!</div>
          
          <div className="mt-5">
            <label className="text-[11px] font-bold opacity-60">1. API KEY KAMU (1643ccb0...)</label>
            <div className="flex gap-2 mt-2">
              <input type={showKey?'text':'password'} value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="1643ccb0ad504284becb69c084d919bf" className="flex-1 bg-[#000] border border-[#333] rounded-full px-4 py-3 text-[13px] font-mono" />
              <button onClick={()=>setShowKey(!showKey)} className="px-3 py-3 rounded-full bg-[#222] text-[11px]">{showKey?'Hide':'Show'}</button>
            </div>
            <button onClick={saveKey} className="mt-3 w-full h-[44px] rounded-full bg-[#f5e6c8] text-black font-black text-[13px]">💾 Simpan Key</button>
            {apiKey && <div className="mt-2 text-[11px] text-emerald-300">✅ {apiKey.slice(0,12)}*** siap - endpoint token (bukan global) jadi ga error 1014 lagi!</div>}
          </div>

          <div className="mt-6">
            <label className="text-[11px] font-bold opacity-60">2. UPLOAD FOTO (1 foto aja biar simple)</label>
            <label className="mt-2 w-full aspect-[16/10] rounded-[16px] border-2 border-dashed border-[#333] bg-[#000] flex flex-col items-center justify-center cursor-pointer overflow-hidden">
              {imageUrl ? <img src={imageUrl} className="w-full h-full object-cover" /> : <><span className="text-3xl opacity-30">+</span><span className="text-[11px] mt-1 opacity-50">Klik upload foto</span></>}
              <input type="file" accept="image/*" className="hidden" onChange={e=>handleFile(e.target.files)} />
            </label>
          </div>

          <div className="mt-5">
            <label className="text-[11px] font-bold opacity-60">3. PROMPT</label>
            <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} className="mt-2 w-full bg-[#000] border border-[#333] rounded-[16px] p-4 text-[13px] min-h-[80px]" />
          </div>

          <div className="mt-4">
            <label className="text-[11px] font-bold opacity-60">4. DURASI: {duration}s</label>
            <input type="range" min={4} max={15} value={duration} onChange={e=>setDuration(parseInt(e.target.value))} className="w-full accent-[#f5e6c8] mt-2" />
          </div>

          <button onClick={generate} disabled={loading} className="mt-6 w-full h-[54px] rounded-full bg-[#f5e6c8] text-black font-black disabled:opacity-50">
            {loading ? `Membuat... ${fmt(elapsed)}` : `✨ Generate ${duration}s`}
          </button>
        </div>

        <div className="bg-[#111] border border-[#222] rounded-[20px] p-5 min-h-[300px] flex flex-col items-center justify-center">
          {status==='idle' && <div className="opacity-40 text-center">🎬<div className="mt-2 text-[13px]">Belum ada video</div></div>}
          {status==='processing' && <div className="text-center"><div className="w-20 h-20 rounded-full border-2 border-[#222] border-t-[#f5e6c8] animate-spin mx-auto"></div><div className="mt-4 font-bold">Sedang membuat... {fmt(elapsed)}</div><div className="text-[11px] opacity-50 mt-1">Pakai key {apiKey.slice(0,8)}*** • Endpoint token (bukan global) • 1-3 menit</div></div>}
          {status==='failed' && <div className="text-center"><div className="text-2xl">❌</div><div className="mt-2">Gagal - cek alert tadi</div></div>}
          {status==='success' && videoUrl && <div className="w-full"><video src={videoUrl} controls autoPlay className="w-full rounded-[14px] bg-black" /><a href={videoUrl} target="_blank" className="mt-4 block h-[44px] rounded-full bg-[#f5e6c8] text-black font-bold flex items-center justify-center">⬇ Download MP4</a></div>}
        </div>

        <div className="text-[10px] opacity-40 text-center leading-relaxed">
          Ini versi SUPER SIMPLE - cuma pakai endpoint <b>token</b> (bukan global-token enterprise) jadi key standard 1643ccb0... kamu bisa langsung pakai tanpa bikin workflow / webapp ID!
        </div>
      </div>
    </div>
  );
}
