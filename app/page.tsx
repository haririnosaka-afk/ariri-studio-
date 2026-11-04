"use client";
import { useState, useEffect, useRef } from 'react';

type ModelType='2.0'|'2.5';
interface RefImg{ id:string; url:string; name:string; }
interface HistoryItem{ id:string; prompt:string; model:ModelType; duration:number; res:string; aspect:string; date:string; videoUrl:string; }

export default function AririFinalBYOK(){
  const [model,setModel]=useState<ModelType>('2.5');
  const [duration,setDuration]=useState(10);
  const [prompt,setPrompt]=useState('');
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
  const [apiKey,setApiKey]=useState('');
  const [showKey,setShowKey]=useState(false);
  const [keySaved,setKeySaved]=useState(false);
  const timerRef=useRef<any>(null);

  // LOAD API KEY DARI LOCALSTORAGE - JADI GA PERLU BUKA VERCEL/GITHUB
  useEffect(()=>{
    const saved = localStorage.getItem('ariri_rh_keys');
    if(saved){ setApiKey(saved); setKeySaved(true); }
    const savedHist = localStorage.getItem('ariri_history');
    if(savedHist){ try{ setHistory(JSON.parse(savedHist)); }catch{} }
  },[]);

  useEffect(()=>{
    localStorage.setItem('ariri_history', JSON.stringify(history));
  },[history]);

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

  const saveKey=()=>{
    if(!apiKey.trim()){ alert('Paste API Key dulu! Ambil di runninghub.ai - Consumer Keys'); return; }
    if(!apiKey.includes('rh_')){ alert('API Key harus diawali rh_ ...'); return; }
    localStorage.setItem('ariri_rh_keys', apiKey.trim());
    setKeySaved(true);
    alert('✅ API Key disimpan di Ariri Studio! Sekarang bisa generate tanpa buka Vercel/GitHub. Coba generate video sekarang.');
  };

  const clearKey=()=>{
    localStorage.removeItem('ariri_rh_keys');
    setApiKey(''); setKeySaved(false);
    alert('API Key dihapus');
  };

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
    if(!prompt.trim()){ alert('Isi prompt dulu!'); return; }
    if(refs.length===0){ alert('Upload minimal 1 foto!'); return; }
    if(!apiKey && !keySaved){ 
      if(!confirm('API Key belum dipasang! Generate akan gagal "Generate gagal di penyedia". Mau pasang API Key sekarang di Settings?')) return;
      setView('settings'); return;
    }
    setLoading(true); setStatus('processing'); setElapsed(0); setVideoUrl('');
    try{
      const res=await fetch('/api/generate',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ prompt, duration, model, resolution, aspect_ratio:aspect, image_urls:refs.map(r=>r.url), generateAudio:audio, apiKeyFromUser: apiKey })});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||'Gagal');
      const url=data.video?.url||data.url||'';
      if(url){
        setVideoUrl(url); setStatus('success');
        const item:HistoryItem={ id:Date.now().toString(), prompt, model, duration, res:resolution, aspect, date:new Date().toLocaleString('id-ID'), videoUrl:url };
        setHistory(h=>[item,...h]);
      } else throw new Error('Gagal');
    }catch(e:any){
      setStatus('failed');
      // e.message sudah berisi "Generate gagal di penyedia..."
    } finally{ setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <div className="bg-[#f5e6c8] text-black text-[11px] font-bold text-center py-2">ARIRI STUDIO • FINAL • API KEY BISA DI PASANG LANGSUNG DI SINI • GA PERLU BUKA VERCEL/GITHUB LAGI • BYOK</div>
      <header className="sticky top-0 z-40 bg-[#0f0f0f] border-b border-[#1e1e1e] h-[64px] flex items-center justify-between px-6">
        <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-[#f5e6c8] text-black font-black flex items-center justify-center">A</div><div><div className="font-black leading-none">ARIRI STUDIO</div><div className="text-[10px] opacity-50">{keySaved?`✅ Key Terpasang (${apiKey.slice(0,12)}***)`:'⚠️ Belum ada API Key'}</div></div></div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex px-3 py-1.5 rounded-full bg-[#151515] border border-[#222] text-[11px]">Total: <b>{history.length}</b> video • {refs.length}/10 ref</div>
          <button onClick={()=>setView('generate')} className={`px-4 py-2 rounded-full text-[13px] ${view==='generate'?'bg-[#f5e6c8] text-black font-bold':'bg-[#1a1a1a] border border-[#222]'}`}>Generate</button>
          <button onClick={()=>setView('library')} className={`px-4 py-2 rounded-full text-[13px] ${view==='library'?'bg-[#f5e6c8] text-black font-bold':'bg-[#1a1a1a] border border-[#222]'}`}>Library {history.length}</button>
          <button onClick={()=>setView('settings')} className={`w-10 h-10 rounded-full flex items-center justify-center text-[16px] ${view==='settings'?'bg-[#f5e6c8] text-black':'bg-[#1a1a1a] border border-[#222]'} ${!keySaved?'animate-pulse ring-2 ring-amber-400':''}`}>⚙️</button>
        </div>
      </header>

      <main className="p-4 md:p-6">
        {view==='generate' && (
          <div className="max-w-[1400px] mx-auto grid xl:grid-cols-[1.2fr_0.8fr] gap-6">
            <div className="bg-[#111] border border-[#1e1e1e] rounded-[22px] p-6 space-y-5">
              {!keySaved && <div className="p-4 rounded-[14px] bg-amber-500/10 border border-amber-500/30 text-[12px]"><b>⚠️ API Key Belum Dipasang!</b> Generate akan gagal "Generate gagal di penyedia". Klik ⚙️ Settings atau tombol di bawah untuk pasang API Key RunningHub langsung di sini, ga perlu buka Vercel/GitHub.<br/><button onClick={()=>setView('settings')} className="mt-2 px-4 py-2 rounded-full bg-[#f5e6c8] text-black font-bold text-[11px]">Pasang API Key Sekarang →</button></div>}
              <div className="flex flex-wrap gap-2">
                <select value={model} onChange={e=>setModel(e.target.value as any)} className="bg-[#0a0a0a] border border-[#222] rounded-full px-5 py-2.5 text-[13px]"><option value="2.0">Seedance 2.0 — Max 15s</option><option value="2.5">Seedance 2.5 — Max 30s • 10 ref ⭐</option></select>
                <div className="px-4 py-2.5 rounded-full bg-[#0a0a0a] border border-[#222] text-[12px]">⏱ {duration}s / {maxDur}s</div>
              </div>
              <div><label className="text-[11px] font-bold opacity-60">DURASI: {duration} DETIK</label><input type="range" min={4} max={maxDur} value={duration} onChange={e=>setDuration(parseInt(e.target.value))} className="w-full accent-[#f5e6c8] mt-2" /></div>
              <div><label className="text-[11px] font-bold opacity-60">PROMPT • PAKAI @img1..@img10</label><textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Wanita @img1 berjalan di sawah Bali cinematic golden hour, wajah konsisten 100% @img1" className="w-full bg-[#080808] border border-[#1e1e1e] rounded-[16px] p-4 text-[13px] min-h-[110px] mt-2" /></div>
              <div className="grid grid-cols-3 gap-3">
                <select value={resolution} onChange={e=>setResolution(e.target.value as any)} className="bg-[#080808] border border-[#1e1e1e] rounded-full px-4 py-3 text-[13px]"><option value="1080p">1080p</option><option value="720p">720p</option><option value="480p">480p</option></select>
                <select value={aspect} onChange={e=>setAspect(e.target.value)} className="bg-[#080808] border border-[#1e1e1e] rounded-full px-4 py-3 text-[13px]"><option value="16:9">16:9</option><option value="9:16">9:16</option><option value="1:1">1:1</option><option value="adaptive">Adaptive</option></select>
                <button onClick={()=>setAudio(!audio)} className={`rounded-full py-3 text-[13px] font-bold border ${audio?'bg-[#f5e6c8] text-black':'bg-[#080808] border-[#1e1e1e]'}`}>🔊 {audio?'ON':'OFF'}</button>
              </div>
              <div className="bg-[#0c0c0c] border border-[#1a1a1a] rounded-[18px] p-5">
                <div className="font-bold text-[13px]">Foto Referensi • {refs.length}/10 • @img1..@img10 otomatis</div>
                <div className="grid grid-cols-5 gap-3 mt-4">
                  {refs.map((r,i)=><div key={r.id} className="relative aspect-square rounded-[14px] overflow-hidden border border-[#222]"><img src={r.url} className="w-full h-full object-cover" /><button onClick={()=>setRefs(pr=>pr.filter(x=>x.id!==r.id))} className="absolute top-1 right-1 w-6 h-6 bg-black/80 rounded-full">✕</button><div className="absolute bottom-0 inset-x-0 bg-black/80 text-[10px] text-center py-1">@img{i+1}</div></div>)}
                  {refs.length<10 && <label className="aspect-square rounded-[14px] border-2 border-dashed border-[#222] bg-[#0a0a0a] flex flex-col items-center justify-center cursor-pointer"><span className="text-2xl opacity-30">+</span><span className="text-[11px]">Upload</span><input type="file" multiple accept="image/*" className="hidden" onChange={e=>handleFiles(e.target.files)} /></label>}
                </div>
              </div>
              <button onClick={generate} disabled={loading} className="w-full h-[56px] rounded-full bg-[#f5e6c8] text-black font-black text-[15px] disabled:opacity-50 flex items-center justify-center gap-3">{loading?<><span className="w-6 h-6 border-2 border-black/20 border-t-black rounded-full animate-spin"></span> Sedang membuat video {fmt(elapsed)} / ~{fmt(estimated)} • {step}</>:<>✨ Generate Video {duration}s • {refs.length} foto</>}</button>
            </div>

            <div className="space-y-4">
              <div className="bg-[#111] border border-[#1e1e1e] rounded-[22px] p-4">
                <div className="flex justify-between mb-3"><span className="text-[11px] font-bold opacity-60">PREVIEW • DOWNLOAD DISINI</span><span className="text-[10px] px-2 py-1 rounded-full bg-[#0a0a0a] border border-[#1a1a1a]">{status.toUpperCase()} • {fmt(elapsed)}</span></div>
                <div className="bg-[#050505] border border-[#151515] rounded-[18px] min-h-[380px] flex flex-col items-center justify-center p-6">
                  {status==='idle' && !videoUrl && <div className="text-center opacity-40"><div className="text-3xl">🎬</div><div className="mt-3 font-bold">Belum ada video • {history.length} video</div><div className="text-[11px]">Hasil muncul disini + tombol download</div></div>}
                  {status==='processing' && (
                    <div className="text-center w-full">
                      <div className="relative w-[96px] h-[96px] mx-auto"><div className="absolute inset-0 rounded-full border-2 border-[#1e1e1e]"></div><div className="absolute inset-0 rounded-full border-2 border-t-[#f5e6c8] border-r-transparent border-b-transparent border-l-transparent animate-spin"></div><div className="absolute inset-[12px] rounded-full border-2 border-[#1a1a1a] border-t-[#f5e6c8]/60 border-r-transparent border-b-transparent border-l-transparent animate-spin" style={{animationDirection:'reverse'}}></div><div className="absolute inset-0 flex items-center justify-center text-2xl">✨</div></div>
                      <div className="mt-6 font-bold text-[16px]">Sedang membuat video</div>
                      <div className="mt-2 text-[12px] opacity-60 max-w-[320px] mx-auto">Biasanya 1 sampai 5 menit, lebih lama untuk durasi panjang. Kamu boleh tetap di halaman ini.</div>
                      <div className="mt-6 w-full max-w-[340px] mx-auto"><div className="w-full h-2 bg-[#1a1a1a] rounded-full overflow-hidden"><div className="h-full bg-[#f5e6c8] rounded-full transition-all" style={{width:`${prog}%`}}></div></div><div className="flex justify-between mt-2 text-[10px] opacity-50"><span>{fmt(elapsed)} • {Math.floor(prog)}%</span><span>~{fmt(estimated)} • Sisa {fmt(Math.max(0,estimated-elapsed))}</span></div></div>
                      <div className="mt-6 flex justify-center gap-3 text-[10px]"><div className="px-3 py-1.5 rounded-full bg-[#f5e6c8]/20 border border-[#f5e6c8]/40">✓ Memproses</div><div className={`px-3 py-1.5 rounded-full border ${step==='membuat'||step==='menyiapkan'?'bg-[#f5e6c8]/20 border-[#f5e6c8]/40 animate-pulse':'border-[#222] opacity-30'}`}>{step==='menyiapkan'?'✓':'◍'} Membuat</div><div className="px-3 py-1.5 rounded-full border border-[#222] opacity-30">○ Menyiapkan</div></div>
                    </div>
                  )}
                  {status==='failed' && (
                    <div className="text-center"><div className="w-[72px] h-[72px] mx-auto rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-2xl">!</div><div className="mt-5 font-bold">Generate gagal di penyedia. Coba lagi sebentar lagi.</div><div className="text-[11px] opacity-50 mt-2">Cek API Key di Settings ⚙️ • Pastikan key diawali rh_ dan masih ada kuota</div><button onClick={generate} className="mt-5 px-6 py-2.5 rounded-full bg-[#1e1e1e] border border-[#2a2a2a]">↻ Coba lagi</button></div>
                  )}
                  {status==='success' && videoUrl && (
                    <div className="w-full"><video src={videoUrl} controls autoPlay className="w-full rounded-[14px] max-h-[260px] bg-black" /><div className="mt-4 grid grid-cols-2 gap-2"><a href={videoUrl} target="_blank" className="h-[44px] rounded-full bg-[#f5e6c8] text-black font-bold text-[13px] flex items-center justify-center">⬇ Download MP4</a><button onClick={()=>{navigator.clipboard.writeText(videoUrl); alert('Link dicopy!');}} className="h-[44px] rounded-full bg-[#1a1a1a] border border-[#222] text-[13px]">🔗 Copy Link</button></div><div className="mt-3 text-[10px] opacity-40 break-all font-mono">{videoUrl}</div></div>
                  )}
                </div>
              </div>
              <div className="bg-[#0e0e0e] border border-[#1a1a1a] rounded-[18px] p-4">
                <div className="flex justify-between"><span className="text-[11px] font-bold opacity-60">HISTORY • {history.length} VIDEO</span><button onClick={()=>setView('library')} className="text-[11px] px-3 py-1 rounded-full bg-[#1a1a1a] border border-[#222]">Lihat Semua →</button></div>
                {history.length===0?<div className="mt-4 border border-dashed border-[#222] rounded-[14px] p-8 text-center opacity-30">0 video • Belum ada</div>:<div className="mt-4 space-y-2">{history.slice(0,3).map(h=><div key={h.id} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-3 flex gap-3"><video src={h.videoUrl} className="w-20 h-12 rounded-lg bg-black" muted /><div className="flex-1"><div className="text-[11px] truncate">{h.prompt.slice(0,40)}</div><div className="text-[10px] opacity-40">{h.duration}s • {h.date}</div><a href={h.videoUrl} target="_blank" className="text-[10px] text-[#f5e6c8]">⬇ Download</a></div></div>)}</div>}
              </div>
            </div>
          </div>
        )}

        {view==='library' && (
          <div className="max-w-[1300px] mx-auto">
            <h2 className="text-[20px] font-black">Library • {history.length} Video • Download Disini Semua</h2>
            <div className="text-[11px] opacity-50 mt-1">Klik Download MP4 untuk simpan ke HP • Link valid 24 jam, download segera!</div>
            {history.length===0?<div className="mt-10 border-2 border-dashed border-[#1e1e1e] rounded-[24px] p-16 text-center opacity-30">Library Kosong • 0 Video • Generate dulu di tab Generate</div>:<div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-5">{history.map(h=><div key={h.id} className="bg-[#111] border border-[#1e1e1e] rounded-[20px] overflow-hidden"><div className="aspect-video bg-black"><video src={h.videoUrl} controls className="w-full h-full" /></div><div className="p-4"><div className="text-[12px] line-clamp-2">{h.prompt}</div><div className="text-[10px] opacity-40 mt-2">{h.model} • {h.duration}s • {h.res} • {h.date}</div><div className="mt-3 grid grid-cols-2 gap-2"><a href={h.videoUrl} target="_blank" className="h-10 rounded-full bg-[#f5e6c8] text-black font-bold text-[12px] flex items-center justify-center">⬇ Download</a><button onClick={()=>{navigator.clipboard.writeText(h.videoUrl); alert('Link dicopy!');}} className="h-10 rounded-full bg-[#1a1a1a] border border-[#222] text-[12px]">🔗 Copy</button></div></div></div>)}</div>}
          </div>
        )}

        {view==='settings' && (
          <div className="max-w-[700px] mx-auto space-y-6">
            <h2 className="text-[22px] font-black">Settings • Pasang API Key Disini • Ga Perlu Buka Vercel/GitHub</h2>
            
            <div className="bg-[#111] border border-[#1e1e1e] rounded-[20px] p-6">
              <div className="font-bold text-[14px]">🔑 RunningHub API Key (BYOK - Pasang Langsung Disini)</div>
              <div className="text-[12px] opacity-70 mt-2 leading-relaxed">Ini solusi biar <b>ga perlu buka Vercel/GitHub lagi</b>. Paste API Key RunningHub kamu disini, otomatis kesimpen di browser HP kamu (localStorage), langsung bisa generate video REAL.</div>
              
              <div className="mt-5">
                <label className="text-[11px] font-bold opacity-60">PASTE API KEY DISINI (diawali rh_...):</label>
                <div className="mt-2 flex gap-2">
                  <input type={showKey?'text':'password'} value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="rh_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" className="flex-1 bg-[#080808] border border-[#222] rounded-full px-5 py-3.5 text-[13px] font-mono" />
                  <button onClick={()=>setShowKey(!showKey)} className="px-4 py-3.5 rounded-full bg-[#1a1a1a] border border-[#222] text-[12px]">{showKey?'Hide':'Show'}</button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button onClick={saveKey} className="h-[48px] rounded-full bg-[#f5e6c8] text-black font-black text-[13px]">💾 Simpan Key di Ariri</button>
                  <button onClick={clearKey} className="h-[48px] rounded-full bg-[#1a1a1a] border border-[#222] text-[13px]">🗑️ Hapus Key</button>
                </div>
                <div className={`mt-3 p-3 rounded-xl text-[11px] ${keySaved?'bg-emerald-500/10 border border-emerald-500/30 text-emerald-200':'bg-red-500/10 border border-red-500/30 text-red-200'}`}>
                  {keySaved?`✅ API Key Terpasang! ${apiKey.slice(0,16)}*** • ${apiKey.split(',').length} key • Sekarang bisa generate tanpa buka Vercel/GitHub`:`❌ Belum ada API Key • Generate akan gagal "Generate gagal di penyedia"`}
                </div>
              </div>

              <div className="mt-6 p-4 rounded-[14px] bg-[#0a0a0a] border border-[#1a1a1a] text-[11px] leading-relaxed">
                <b>📍 Cara Ambil API Key RunningHub:</b><br/>
                1. Buka <b>https://www.runninghub.ai/id/call-api/bill-task?tab=keys&type=consumer</b> di HP<br/>
                2. Login → Tab <b>Consumer Keys</b> → <b>Create New Key</b><br/>
                3. Copy key yang diawali <b>rh_sk_...</b> (panjang)<br/>
                4. Paste disini → Klik <b>Simpan Key di Ariri</b><br/>
                5. Balik ke Generate → Upload foto → Generate → Video REAL keluar + animasi muter + estimasi menit + tombol Download!<br/><br/>
                <b>Multi-key?</b> Bisa paste banyak key pisah koma: <span className="font-mono">rh_key1, rh_key2, rh_key3</span> → Otomatis failover kalau satu habis kuota (429)
              </div>
            </div>

            <div className="bg-[#111] border border-[#1e1e1e] rounded-[20px] p-6">
              <div className="font-bold">📥 Dimana Download Videonya?</div>
              <div className="text-[11px] opacity-70 mt-2 leading-relaxed">
                Setelah generate selesai (status success):<br/>
                • Di Preview kanan ada tombol <b>⬇ Download MP4</b> gede warna cream → Klik langsung ke-download ke HP (folder Download)<br/>
                • Ada juga <b>🔗 Copy Link</b> → Link video valid 24 jam (RunningHub hapus setelah 24 jam, jadi download segera!)<br/>
                • Otomatis masuk <b>Library • {history.length} video</b> → Tiap video ada tombol Download lagi<br/>
                • Total video, history, semua REAL dari 0, bukan dummy • Kesimpen di browser HP kamu
              </div>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-[20px] p-5">
              <div className="font-bold text-amber-200">Kenapa Tadi Keliatan Kayak Mainan?</div>
              <div className="text-[11px] opacity-70 mt-2 leading-relaxed">
                Karena pakai <b>rh_test_dummy_key</b> (palsu) jadi API selalu gagal, tapi animasi tetep jalan dulu 10 detik baru muncul "Gagal di penyedia".<br/>
                Sekarang pasang key asli disini → Generate akan REAL nunggu 1-5 menit + progress + estimasi + video MP4 beneran bisa di-download.
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
