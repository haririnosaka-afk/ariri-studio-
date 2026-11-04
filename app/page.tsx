"use client";
import { useState, useEffect, useRef } from 'react';

type ModelType='2.0'|'2.5';
interface RefImg{ id:string; url:string; name:string; }
interface HistoryItem{ id:string; prompt:string; model:ModelType; duration:number; res:string; aspect:string; date:string; videoUrl:string; }

export default function AririFinalAllKeys(){
  const [model,setModel]=useState<ModelType>('2.5');
  const [duration,setDuration]=useState(10);
  const [prompt,setPrompt]=useState('Wanita @img1 berjalan di sawah Bali cinematic golden hour, wajah konsisten 100% @img1');
  const [refs,setRefs]=useState<RefImg[]>([]);
  const [resolution,setResolution]=useState<'1080p'|'720p'|'480p'>('1080p');
  const [aspect,setAspect]=useState('16:9');
  const [audio,setAudio]=useState(true);
  const [loading,setLoading]=useState(false);
  const [status,setStatus]=useState<'idle'|'processing'|'failed'|'success'>('idle');
  const [videoUrl,setVideoUrl]=useState('');
  const [history,setHistory]=useState<HistoryItem[]>([]);
  const [view,setView]=useState<'generate'|'library'|'settings'>('generate');
  const [elapsed,setElapsed]=useState(0);
  const [step,setStep]=useState<'memproses'|'membuat'|'menyiapkan'>('memproses');
  const [apiKeyInput,setApiKeyInput]=useState('');
  const [keys,setKeys]=useState<string[]>([]);
  const [showKey,setShowKey]=useState(false);
  const timerRef=useRef<any>(null);

  useEffect(()=>{
    const saved = localStorage.getItem('ariri_rh_keys');
    if(saved){
      const arr = saved.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean).filter(s=>s.length>=10);
      setKeys(arr);
      setApiKeyInput(saved);
    }
    const savedHist = localStorage.getItem('ariri_history');
    if(savedHist){ try{ setHistory(JSON.parse(savedHist)); }catch{} }
  },[]);

  useEffect(()=>{ localStorage.setItem('ariri_history', JSON.stringify(history)); },[history]);

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

  const saveKeys=()=>{
    // TERIMA SEMUA FORMAT: rh_... , fc75... , 1643ccb0... 32 char hex
    const arr = apiKeyInput.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean).filter(s=>s.length>=10);
    if(arr.length===0){ alert('Paste key minimal 10 karakter! Contoh: 1643ccb0ad504284becb69c084d919bf atau rh_sk_...'); return; }
    localStorage.setItem('ariri_rh_keys', arr.join(','));
    setKeys(arr);
    alert(`✅ ${arr.length} key disimpan! Format ${arr[0].slice(0,8)}*** terdeteksi. Sekarang bisa generate!`);
  };

  const clearKeys=()=>{ localStorage.removeItem('ariri_rh_keys'); setKeys([]); setApiKeyInput(''); alert('Pool dikosongkan'); };

  const handleFiles=async(files:FileList|null)=>{
    if(!files) return;
    const remain=10-refs.length;
    if(remain<=0) return;
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
    if(!prompt.trim()){ alert('Isi prompt!'); return; }
    if(refs.length===0){ alert('Upload 1 foto!'); return; }
    if(keys.length===0 && !apiKeyInput){ setView('settings'); alert('Paste API Key dulu di Settings! Key 1643ccb0... kamu bisa langsung dipakai sekarang!'); return; }
    setLoading(true); setStatus('processing'); setElapsed(0); setVideoUrl('');
    try{
      const res=await fetch('/api/generate',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ prompt, duration, model, resolution, aspect_ratio:aspect, image_urls:refs.map(r=>r.url), generateAudio:audio, apiKeyFromUser: apiKeyInput||keys.join(',') })});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||'Gagal');
      const url=data.video?.url||data.url||'';
      if(url){
        setVideoUrl(url); setStatus('success');
        setHistory(h=>[{ id:Date.now().toString(), prompt, model, duration, res:resolution, aspect, date:new Date().toLocaleString('id-ID'), videoUrl:url },...h]);
      } else throw new Error('Gagal');
    }catch(e:any){ setStatus('failed'); alert(e.message); }
    finally{ setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <div className="bg-[#f5e6c8] text-black text-[11px] font-bold text-center py-2">ARIRI STUDIO • FINAL • SEMUA KEY BISA • rh_ ATAU 1643ccb0... 32 CHAR • BYOK • {keys.length} KEY</div>
      <header className="sticky top-0 z-40 bg-[#0f0f0f] border-b border-[#1e1e1e] h-[64px] flex items-center justify-between px-6">
        <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-[#f5e6c8] text-black font-black flex items-center justify-center">A</div><div><div className="font-black">ARIRI STUDIO</div><div className="text-[10px] opacity-50">{keys.length>0?`✅ ${keys.length} Key • ${keys[0].slice(0,8)}***`:'⚠️ Belum ada key'}</div></div></div>
        <div className="flex gap-2">
          <button onClick={()=>setView('generate')} className={`px-4 py-2 rounded-full text-[13px] ${view==='generate'?'bg-[#f5e6c8] text-black font-bold':'bg-[#1a1a1a] border border-[#222]'}`}>Generate</button>
          <button onClick={()=>setView('library')} className={`px-4 py-2 rounded-full text-[13px] ${view==='library'?'bg-[#f5e6c8] text-black font-bold':'bg-[#1a1a1a] border border-[#222]'}`}>Library {history.length}</button>
          <button onClick={()=>setView('settings')} className={`w-10 h-10 rounded-full ${view==='settings'?'bg-[#f5e6c8] text-black':'bg-[#1a1a1a] border border-[#222]'} ${keys.length===0?'animate-pulse ring-2 ring-amber-400':''}`}>⚙️</button>
        </div>
      </header>

      <main className="p-4 md:p-6">
        {view==='generate' && (
          <div className="max-w-[1400px] mx-auto grid xl:grid-cols-[1.2fr_0.8fr] gap-6">
            <div className="bg-[#111] border border-[#1e1e1e] rounded-[22px] p-6 space-y-5">
              {keys.length===0 && <div className="p-4 rounded-[14px] bg-amber-500/10 border border-amber-500/30 text-[12px]">⚠️ Belum ada key! Paste key kamu yang <b>1643ccb0ad504284becb69c084d919bf</b> di Settings → Sekarang bisa semua format!</div>}
              {keys.length>0 && <div className="p-3 rounded-[14px] bg-emerald-500/10 border border-emerald-500/20 text-[11px]">✅ Pool aktif: {keys.length} key • {keys[0].slice(0,12)}*** • Format 32 char hex kayak punya kamu sudah support!</div>}
              <div className="flex gap-2"><select value={model} onChange={e=>setModel(e.target.value as any)} className="bg-[#0a0a0a] border border-[#222] rounded-full px-5 py-2.5 text-[13px]"><option value="2.5">Seedance 2.5 — 30s • 10 ref ⭐</option><option value="2.0">Seedance 2.0 — 15s</option></select><div className="px-4 py-2.5 rounded-full bg-[#0a0a0a] border border-[#222] text-[12px]">{duration}s</div></div>
              <div><label className="text-[11px] font-bold opacity-60">DURASI</label><input type="range" min={4} max={maxDur} value={duration} onChange={e=>setDuration(parseInt(e.target.value))} className="w-full accent-[#f5e6c8] mt-2" /></div>
              <div><label className="text-[11px] font-bold opacity-60">PROMPT @img1..@img10</label><textarea value={prompt} onChange={e=>setPrompt(e.target.value)} className="w-full bg-[#080808] border border-[#1e1e1e] rounded-[16px] p-4 text-[13px] min-h-[110px] mt-2" /></div>
              <div className="grid grid-cols-3 gap-3"><select value={resolution} onChange={e=>setResolution(e.target.value as any)} className="bg-[#080808] border border-[#1e1e1e] rounded-full px-4 py-3 text-[13px]"><option value="1080p">1080p</option><option value="720p">720p</option><option value="480p">480p</option></select><select value={aspect} onChange={e=>setAspect(e.target.value)} className="bg-[#080808] border border-[#1e1e1e] rounded-full px-4 py-3 text-[13px]"><option value="16:9">16:9</option><option value="9:16">9:16</option><option value="1:1">1:1</option></select><button onClick={()=>setAudio(!audio)} className={`rounded-full py-3 font-bold border ${audio?'bg-[#f5e6c8] text-black':'bg-[#080808] border-[#1e1e1e]'}`}>🔊 {audio?'ON':'OFF'}</button></div>
              <div className="bg-[#0c0c0c] border border-[#1a1a1a] rounded-[18px] p-5"><div className="font-bold text-[13px]">Foto Ref • {refs.length}/10</div><div className="grid grid-cols-5 gap-3 mt-4">{refs.map((r,i)=><div key={r.id} className="relative aspect-square rounded-[14px] overflow-hidden border border-[#222]"><img src={r.url} className="w-full h-full object-cover" /><button onClick={()=>setRefs(pr=>pr.filter(x=>x.id!==r.id))} className="absolute top-1 right-1 w-6 h-6 bg-black/80 rounded-full">✕</button><div className="absolute bottom-0 inset-x-0 bg-black/80 text-[10px] text-center py-1">@img{i+1}</div></div>)}{refs.length<10 && <label className="aspect-square rounded-[14px] border-2 border-dashed border-[#222] bg-[#0a0a0a] flex flex-col items-center justify-center cursor-pointer"><span className="text-2xl opacity-30">+</span><span className="text-[11px]">Upload</span><input type="file" multiple accept="image/*" className="hidden" onChange={e=>handleFiles(e.target.files)} /></label>}</div></div>
              <button onClick={generate} disabled={loading} className="w-full h-[56px] rounded-full bg-[#f5e6c8] text-black font-black text-[15px] disabled:opacity-50 flex items-center justify-center gap-3">{loading?<><span className="w-6 h-6 border-2 border-black/20 border-t-black rounded-full animate-spin"></span> Sedang membuat... {fmt(elapsed)} • {step}</>:<>✨ Generate {duration}s • {keys.length} key</>}</button>
            </div>
            <div className="space-y-4">
              <div className="bg-[#111] border border-[#1e1e1e] rounded-[22px] p-4"><div className="flex justify-between mb-3"><span className="text-[11px] font-bold opacity-60">PREVIEW • DOWNLOAD</span><span className="text-[10px] px-2 py-1 rounded-full bg-[#0a0a0a] border border-[#1a1a1a]">{status.toUpperCase()} • {fmt(elapsed)}</span></div><div className="bg-[#050505] border border-[#151515] rounded-[18px] min-h-[380px] flex items-center justify-center p-6">
                {status==='idle' && <div className="text-center opacity-40">🎬<div className="mt-3 font-bold">Belum ada • {history.length} video</div></div>}
                {status==='processing' && <div className="text-center"><div className="relative w-[96px] h-[96px] mx-auto"><div className="absolute inset-0 rounded-full border-2 border-[#1e1e1e]"></div><div className="absolute inset-0 rounded-full border-2 border-t-[#f5e6c8] border-r-transparent border-b-transparent border-l-transparent animate-spin"></div><div className="absolute inset-0 flex items-center justify-center text-2xl">✨</div></div><div className="mt-6 font-bold">Sedang membuat video</div><div className="mt-2 text-[12px] opacity-60">Biasanya 1 sampai 5 menit</div><div className="mt-4 w-[300px] h-2 bg-[#1a1a1a] rounded-full overflow-hidden mx-auto"><div className="h-full bg-[#f5e6c8]" style={{width:`${prog}%`}}></div></div></div>}
                {status==='failed' && <div className="text-center"><div className="w-[72px] h-[72px] mx-auto rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-2xl">!</div><div className="mt-5 font-bold">Generate gagal di penyedia. Coba lagi</div><button onClick={generate} className="mt-4 px-6 py-2.5 rounded-full bg-[#1e1e1e] border border-[#2a2a2a]">↻ Coba lagi</button></div>}
                {status==='success' && videoUrl && <div className="w-full"><video src={videoUrl} controls autoPlay className="w-full rounded-[14px] max-h-[260px] bg-black" /><div className="mt-4 grid grid-cols-2 gap-2"><a href={videoUrl} target="_blank" className="h-[44px] rounded-full bg-[#f5e6c8] text-black font-bold flex items-center justify-center">⬇ Download</a><button onClick={()=>navigator.clipboard.writeText(videoUrl)} className="h-[44px] rounded-full bg-[#1a1a1a] border border-[#222]">🔗 Copy</button></div></div>}
              </div></div>
            </div>
          </div>
        )}

        {view==='settings' && (
          <div className="max-w-[800px] mx-auto space-y-6">
            <h2 className="text-[22px] font-black">Settings • Fix Semua Key Bisa!</h2>
            <div className="bg-[#111] border border-[#1e1e1e] rounded-[20px] p-6">
              <div className="font-bold text-[14px]">🔑 RunningHub API Key (SEMUA FORMAT BISA!)</div>
              <div className="text-[12px] opacity-70 mt-2 leading-relaxed">Sekarang <b>SEMUA format key bisa</b>:<br/>• <b>rh_sk_...</b> (60 char, format baru OpenAPI)<br/>• <b>1643ccb0ad504284becb69c084d919bf</b> (32 char hex, format lama Membership kayak punya kamu)<br/>• <b>fc75****...</b> (format Consumer-Membership)</div>
              <div className="mt-5">
                <label className="text-[11px] font-bold opacity-60">PASTE API KEY DISINI (rh_ ATAU 32 CHAR HEX KAYAK 1643ccb0...):</label>
                <div className="mt-2 flex gap-2">
                  <input type={showKey?'text':'password'} value={apiKeyInput} onChange={e=>setApiKeyInput(e.target.value)} placeholder="1643ccb0ad504284becb69c084d919bf atau rh_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" className="flex-1 bg-[#080808] border border-[#222] rounded-full px-5 py-3.5 text-[13px] font-mono" />
                  <button onClick={()=>setShowKey(!showKey)} className="px-4 py-3.5 rounded-full bg-[#1a1a1a] border border-[#222] text-[12px]">{showKey?'Hide':'Show'}</button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button onClick={saveKeys} className="h-[48px] rounded-full bg-[#f5e6c8] text-black font-black text-[13px]">💾 Simpan Key ({apiKeyInput.split(/[\n,]+/).filter(s=>s.trim().length>=10).length})</button>
                  <button onClick={clearKeys} className="h-[48px] rounded-full bg-[#1a1a1a] border border-[#222] text-[13px]">🗑️ Hapus</button>
                </div>
                <div className={`mt-3 p-3 rounded-xl text-[11px] ${keys.length>0?'bg-emerald-500/10 border border-emerald-500/30 text-emerald-200':'bg-red-500/10 border border-red-500/30 text-red-200'}`}>
                  {keys.length>0?`✅ ${keys.length} Key Terpasang! ${keys[0].slice(0,12)}*** • Format ${keys[0].length} char • Sekarang paste key kamu 1643ccb0... bisa langsung VALID!`:`❌ Belum ada Key • Paste key kamu 1643ccb0ad504284becb69c084d919bf disini`}
                </div>
              </div>
              <div className="mt-6 p-4 rounded-[14px] bg-[#0a0a0a] border border-[#1a1a1a] text-[11px] leading-relaxed">
                <b>📍 Key kamu yang tadi:</b><br/>
                <span className="font-mono bg-[#1a1a1a] px-2 py-1 rounded">1643ccb0ad504284becb69c084d919bf</span> (32 char)<br/>
                Itu sekarang <b>UDAH BISA</b>! Paste aja disini → Simpan → Generate!<br/><br/>
                Kalau mau bikin key baru format rh_:<br/>
                1. Buka https://www.runninghub.ai/ → Login<br/>
                2. Menu ☰ → OpenAPI → API Keys → Create<br/>
                3. Copy rh_sk_... → Paste disini
              </div>
            </div>
          </div>
        )}

        {view==='library' && (
          <div className="max-w-[1300px] mx-auto"><h2 className="text-[20px] font-black">Library • {history.length} Video</h2>{history.length===0?<div className="mt-10 border-2 border-dashed border-[#1e1e1e] rounded-[24px] p-16 text-center opacity-30">0 video</div>:<div className="mt-8 grid md:grid-cols-3 gap-5">{history.map(h=><div key={h.id} className="bg-[#111] border border-[#1e1e1e] rounded-[20px] overflow-hidden"><div className="aspect-video bg-black"><video src={h.videoUrl} controls className="w-full h-full" /></div><div className="p-4"><div className="text-[12px] line-clamp-2">{h.prompt}</div><a href={h.videoUrl} target="_blank" className="mt-3 h-10 rounded-full bg-[#f5e6c8] text-black font-bold text-[12px] flex items-center justify-center">⬇ Download</a></div></div>)}</div>}</div>
        )}
      </main>
    </div>
  );
}
