"use client";
import { useState, useEffect } from 'react';

type ModelType='2.0'|'2.5';
type CheckoutPhase='method'|'creating'|'pending'|'success';
type PackageId='basic'|'unlimited'|'gold';
interface RefImg{ id:string; url:string; name:string; }
interface HistoryItem{ id:string; prompt:string; model:ModelType; duration:number; res:string; date:string; videoUrl:string; credits:number; }
interface Txn{ id:string; email:string; paket:string; paketId:PackageId; amount:string; numericAmount:number; status:'Pending'|'Success'; date:string; methodLabel:string; creditAdded:number; va?:string; }

const PACKAGES:any={
  basic:{ id:'basic' as PackageId, name:'Basic', price:49000, priceStr:'Rp49.000', credit:1000, desc:'1000 kredit • 720p max • 2 ref', features:['1000 kredit','720p max','2 foto referensi','Email support'], best:false},
  unlimited:{ id:'unlimited' as PackageId, name:'Unlimited', price:89000, priceStr:'Rp89.000', credit:99999, desc:'30 video/hari • Fair use', features:['30 video / hari','720p','5 foto referensi','Prioritas antrian'], best:false},
  gold:{ id:'gold' as PackageId, name:'Gold', price:129000, priceStr:'Rp129.000', credit:5000, desc:'TERLARIS • 1080p • 10 ref', features:['5000 kredit','1080p','10 foto referensi @img1-@img10','Audio generate','Prioritas max'], best:true},
};
const CREDIT_RATE:Record<string,number>={'480p':20,'720p':40,'1080p':70};
const PAYMENT_OPTIONS=[
  { id:'lynk', label:'Lynk.id', badge:'Recommended', desc:'Checkout tercepat • Email harus sama', icon:'🔗', group:'Lynk.id' },
  { id:'qris', label:'QRIS (All E-Wallet)', desc:'GoPay, OVO, DANA, ShopeePay', icon:'◧', group:'QRIS' },
  { id:'bank_bca', label:'BCA VA', desc:'Transfer otomatis 24 jam', icon:'🏦', group:'Bank VA' },
  { id:'bank_mandiri', label:'Mandiri VA', desc:'Transfer otomatis 24 jam', icon:'🏦', group:'Bank VA' },
  { id:'bank_bni', label:'BNI VA', desc:'Transfer otomatis 24 jam', icon:'🏦', group:'Bank VA' },
  { id:'bank_bri', label:'BRI VA', desc:'Transfer otomatis 24 jam', icon:'🏦', group:'Bank VA' },
  { id:'ewallet_gopay', label:'GoPay', desc:'E-Wallet', icon:'🟦', group:'E-Wallet' },
  { id:'ewallet_dana', label:'DANA', desc:'E-Wallet', icon:'🔵', group:'E-Wallet' },
];

export default function AririStudioFinal(){
  const [model,setModel]=useState<ModelType>('2.5');
  const [duration,setDuration]=useState(5);
  const [prompt,setPrompt]=useState('Wanita @img1 berjalan di sawah Bali cinematic sunset, wajah konsisten 100% @img1');
  const [refs,setRefs]=useState<RefImg[]>([]);
  const [resolution,setResolution]=useState<'480p'|'720p'|'1080p'>('720p');
  const [aspect,setAspect]=useState('adaptive');
  const [generateAudio,setGenerateAudio]=useState(true);
  const [loading,setLoading]=useState(false);
  const [videoUrl,setVideoUrl]=useState('');
  const [log,setLog]=useState<string[]>([]);
  const [credits,setCredits]=useState(150);
  const [isUnlimited,setIsUnlimited]=useState(false);
  const [dailyUsed,setDailyUsed]=useState(0);
  const [history,setHistory]=useState<HistoryItem[]>([]);
  const [view,setView]=useState<'editor'|'library'|'owner'>('editor');
  const [ownerTab,setOwnerTab]=useState<'dashboard'|'keys'|'transactions'>('dashboard');
  const [ownerCodeInput,setOwnerCodeInput]=useState('');
  const [showPricing,setShowPricing]=useState(false);
  const [showCheckout,setShowCheckout]=useState(false);
  const [checkoutPhase,setCheckoutPhase]=useState<CheckoutPhase>('method');
  const [selectedPackage,setSelectedPackage]=useState(PACKAGES.basic);
  const [selectedMethod,setSelectedMethod]=useState(PAYMENT_OPTIONS[0]);
  const [activeTxn,setActiveTxn]=useState<Txn|null>(null);
  const [transactions,setTransactions]=useState<Txn[]>([
    { id:'LYNK-2841', email:'buyer@ariri.studio', paket:'Gold', paketId:'gold', amount:'Rp129.000', numericAmount:129000, status:'Success', date:'19 Nov 2025', methodLabel:'Lynk.id', creditAdded:5000 },
  ]);
  const [pendingSeconds,setPendingSeconds]=useState(600);
  const [keys,setKeys]=useState<string[]>(['rh_sk_live_•••9d0e Active','rh_sk_live_•••1e2f Active','rh_sk_live_•••3456 Low']);

  const maxDuration=model==='2.0'?15:30;
  const costPerSec=CREDIT_RATE[resolution];
  const cost=duration*costPerSec;

  useEffect(()=>{
    if(checkoutPhase!=='pending') return;
    const it=setInterval(()=>setPendingSeconds(s=>s>0?s-1:0),1000);
    const auto=setTimeout(()=>{ if(checkoutPhase==='pending') handleSuccess(); },10000);
    return()=>{clearInterval(it);clearTimeout(auto);}
  },[checkoutPhase]);

  const handleFiles=async(files:FileList|null)=>{
    if(!files) return;
    const remaining=10-refs.length;
    if(remaining<=0){ alert('Max 10 foto'); return; }
    const fd=new FormData();
    Array.from(files).slice(0,remaining).forEach(f=>fd.append('files',f));
    setLog(p=>[...p,`> Uploading ${Math.min(files.length,remaining)} foto...`]);
    try{
      const res=await fetch('/api/upload',{method:'POST', body:fd});
      const data=await res.json();
      if(data.urls && data.urls.length>0){
        const newRefs=data.urls.map((u:any)=>({id:Math.random().toString(36).slice(2), url:u.url, name:u.name||'ref'}));
        setRefs(prev=>[...prev,...newRefs].slice(0,10));
        setLog(p=>[...p,`> Uploaded ${newRefs.length} foto ke Blob ✔`]);
      }else{
        const local=Array.from(files).slice(0,remaining).map(f=>({id:Math.random().toString(36).slice(2), url:URL.createObjectURL(f), name:f.name}));
        setRefs(prev=>[...prev,...local].slice(0,10));
        setLog(p=>[...p,`> Blob belum connect, pakai preview lokal`]);
      }
    }catch(e:any){ setLog(p=>[...p,`> Upload error: ${e.message}`]); }
  };

  const handleGenerate=async()=>{
    if(!prompt.trim()){ alert('Isi prompt dulu'); return; }
    if(!isUnlimited && credits<cost){ setShowPricing(true); return; }
    if(model==='2.0' && refs.length>2){ alert('Seedance 2.0 max 2 ref, pakai 2.5 untuk 10 ref'); return; }
    setLoading(true);
    setLog([`> Model: Seedance ${model} Global (RunningHub)`, `> Duration: ${duration}s / max ${maxDuration}s`, `> Res: ${resolution} Rate: ${costPerSec}c/s Cost: ${cost}c`, `> Refs: ${refs.length}/10`, `> Audio: ${generateAudio}`]);
    setVideoUrl('');
    try{
      const res=await fetch('/api/generate',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ prompt, duration, model, resolution, aspect_ratio:aspect, image_urls:refs.map(r=>r.url), generateAudio })});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||JSON.stringify(data));
      setLog(p=>[...p,`> TaskId: ${data.taskId||'rh_xxx'}`, `> Status: ${data.status||'polling'}`, `> Video: ${data.video?.url||data.url||'processing...'}`]);
      const finalUrl=data.video?.url||data.url||'';
      if(finalUrl) setVideoUrl(finalUrl);
      if(!isUnlimited) setCredits(c=>c-cost);
      else setDailyUsed(d=>d+1);
      const item:HistoryItem={ id:Math.random().toString(36).slice(2), prompt, model, duration, res:resolution, date:new Date().toLocaleString('id-ID'), videoUrl:finalUrl, credits:cost };
      setHistory(h=>[item,...h]);
      setLog(p=>[...p,`> Done ✔ Kredit sisa: ${isUnlimited?'Unlimited':credits-cost}`]);
    }catch(e:any){ setLog(p=>[...p,`> ERROR: ${e.message}`]); }
    finally{ setLoading(false); }
  };

  const handleSelectPackage=(pkg: any)=>{
    setSelectedPackage(pkg);
    setShowPricing(false);
    setShowCheckout(true);
    setCheckoutPhase('method');
    setPendingSeconds(600);
    const txn:Txn={ id:`LYNK-${Math.floor(1000+Math.random()*9000)}`, email:'buyer@ariri.studio', paket:pkg.name, paketId:pkg.id, amount:pkg.priceStr, numericAmount:pkg.price, status:'Pending', date:new Date().toLocaleString('id-ID'), methodLabel:selectedMethod.label, creditAdded:pkg.credit };
    setActiveTxn(txn);
  };
  const handleCreateInvoice=()=>{
    setCheckoutPhase('creating');
    setTimeout(()=>{
      if(activeTxn){ setActiveTxn({...activeTxn, methodLabel:selectedMethod.label, va:selectedMethod.id.includes('bank')?`${Math.floor(1000000000000000+Math.random()*9000000000000000)}` : undefined }); }
      setCheckoutPhase('pending');
    },1500);
  };
  const handleSuccess=()=>{
    if(!activeTxn) return;
    const successTxn={...activeTxn, status:'Success' as const};
    setTransactions(t=>[successTxn,...t]);
    setActiveTxn(successTxn);
    setCheckoutPhase('success');
    if(successTxn.paketId==='unlimited'){ setIsUnlimited(true); setDailyUsed(0); }
    else{ setCredits(c=>c+successTxn.creditAdded); setIsUnlimited(false); }
  };
  const handleCancel=()=>{ setShowCheckout(false); setCheckoutPhase('method'); setActiveTxn(null); };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <div className="bg-[#e8dcc8] text-black text-[11px] md:text-xs text-center py-2 font-medium">🎬 Ariri Studio • Seedance 2.0 (15s) + 2.5 (30s) Global • 10 Foto Ref @img1-@img10 • RunningHub API</div>
      <header className="sticky top-0 z-30 bg-[#0f0f0f]/90 backdrop-blur border-b border-[#222] flex items-center justify-between px-4 md:px-6 h-[56px]">
        <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-[#e8dcc8] text-black font-black flex items-center justify-center">A</div><span className="font-bold tracking-tight">ARIRI STUDIO</span><span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1f1f1f] border border-[#2a2a2a]">RunningHub</span></div>
        <div className="flex items-center gap-2">
          <div className="text-[11px] bg-[#1a1a1a] border border-[#2a2a2a] px-3 py-1.5 rounded-full">{isUnlimited?`Unlimited ${dailyUsed}/30 hari`:`${credits} kredit`}</div>
          <button onClick={()=>setShowPricing(true)} className="text-[12px] bg-[#1f1f1f] border border-[#2a2a2a] px-3 py-1.5 rounded-full hover:bg-[#262626]">Pricing</button>
          <button onClick={()=>setView('owner')} className="text-[11px] bg-[#e8dcc8] text-black px-3 py-1.5 rounded-full font-bold">Owner</button>
        </div>
      </header>
      <div className="flex">
        <aside className="hidden md:flex w-[200px] shrink-0 border-r border-[#1e1e1e] min-h-[calc(100vh-88px)] p-4 flex-col gap-6 sticky top-[56px] self-start">
          <div><div className="text-[10px] tracking-widest opacity-40 mb-2">VIDEO AI</div><button onClick={()=>setView('editor')} className={`w-full text-left text-[13px] px-3 py-2 rounded-lg ${view==='editor'?'bg-[#1a1a1a] text-white':'opacity-60'}`}>🎬 Image to Video</button><button className="w-full text-left text-[13px] px-3 py-2 rounded-lg opacity-40">✨ Text to Video</button></div>
          <div><div className="text-[10px] tracking-widest opacity-40 mb-2">LIBRARY</div><button onClick={()=>setView('library')} className={`w-full text-left text-[13px] px-3 py-2 rounded-lg ${view==='library'?'bg-[#1a1a1a]':''}`}>📁 Library ({history.length})</button></div>
          <div className="mt-auto bg-[#1a1a1a] border border-[#222] rounded-xl p-3"><div className="text-[11px] font-bold">Owner Code</div><input value={ownerCodeInput} onChange={e=>setOwnerCodeInput(e.target.value)} placeholder="ARIRI-OWNER-2026" className="w-full mt-2 bg-black border border-[#333] rounded-lg p-2 text-[11px]" /><button onClick={()=>{ if(ownerCodeInput==='ARIRI-OWNER-2026'){ setView('owner'); } else alert('Salah, pakai ARIRI-OWNER-2026'); }} className="w-full mt-2 bg-[#e8dcc8] text-black text-[11px] font-bold py-2 rounded-lg">Masuk Owner</button></div>
        </aside>
        <main className="flex-1 p-4 md:p-6">
          {view==='editor' && (
            <div className="max-w-[1200px] mx-auto grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
              <div className="bg-[#151515] border border-[#222] rounded-[18px] p-5 space-y-4">
                <div className="flex gap-2">
                  <select value={model} onChange={e=>{setModel(e.target.value as any); if(e.target.value==='2.0'&&duration>15)setDuration(15);}} className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-full px-4 py-2 text-[13px]">
                    <option value="2.0">Seedance 2.0 • Max 15s</option>
                    <option value="2.5">Seedance 2.5 • Max 30s + 10 Ref ⭐</option>
                  </select>
                  <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-full px-4 py-2 text-[12px]">Durasi {duration}s / {maxDuration}s</div>
                </div>
                <input type="range" min={4} max={maxDuration} value={duration} onChange={e=>setDuration(parseInt(e.target.value))} className="w-full accent-[#e8dcc8]" />
                <div>
                  <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl p-3 text-[13px] min-h-[90px]" placeholder="Prompt pakai @img1 @img2 ... untuk ref" />
                  <div className="text-[10px] opacity-50 text-right mt-1">{prompt.length}/1000</div>
                </div>
                <div className="flex gap-2 text-[12px]">
                  <select value={resolution} onChange={e=>setResolution(e.target.value as any)} className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-full px-3 py-2"><option value="480p">480p • 20c/s</option><option value="720p">720p • 40c/s</option><option value="1080p">1080p • 70c/s</option></select>
                  <select value={aspect} onChange={e=>setAspect(e.target.value)} className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-full px-3 py-2"><option value="adaptive">Adaptive</option><option value="16:9">16:9</option><option value="9:16">9:16</option><option value="1:1">1:1</option></select>
                  <button onClick={()=>setGenerateAudio(!generateAudio)} className={`px-3 py-2 rounded-full border text-[11px] ${generateAudio?'bg-[#e8dcc8] text-black border-[#e8dcc8]':'bg-[#0f0f0f] border-[#2a2a2a]'}`}>🔊 Audio {generateAudio?'On':'Off'}</button>
                </div>
                <div className="bg-[#0f0f0f] border border-[#222] rounded-xl p-3">
                  <div className="flex justify-between text-[11px] font-bold"><span>Foto Referensi Max 10 • {refs.length}/10</span><span className="opacity-50">Pakai @img1..@img10 di prompt</span></div>
                  <div className="grid grid-cols-5 gap-2 mt-3">
                    {refs.map((r,i)=><div key={r.id} className="relative aspect-square rounded-lg overflow-hidden border border-[#2a2a2a] bg-[#1a1a1a]"><img src={r.url} className="w-full h-full object-cover" /><button onClick={()=>setRefs(pr=>pr.filter(x=>x.id!==r.id))} className="absolute top-0 right-0 bg-red-600 text-[10px] px-1">x</button><div className="absolute bottom-0 w-full bg-black/70 text-[9px] text-center py-0.5">IMG{i+1}</div></div>)}
                    {refs.length<10 && <label className="aspect-square border border-dashed border-[#333] rounded-lg flex flex-col items-center justify-center cursor-pointer text-[11px] opacity-60 hover:opacity-100">+ Upload<input type="file" multiple accept="image/*" className="hidden" onChange={e=>handleFiles(e.target.files)} /></label>}
                  </div>
                </div>
                <div className="flex items-center justify-between"><div className="text-[12px]">Biaya: <b className="text-[#e8dcc8]">{cost} kredit</b> • Sisa: {isUnlimited?`Unlimited ${dailyUsed}/30`: `${credits}`}</div><button onClick={handleGenerate} disabled={loading} className="bg-[#e8dcc8] text-black font-bold px-6 py-3 rounded-full text-[13px] disabled:opacity-50">{loading?'Generating...':'Generate Video'}</button></div>
              </div>
              <div className="space-y-4">
                <div className="bg-[#151515] border border-[#222] rounded-[18px] p-3"><div className="aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center">{videoUrl?<video src={videoUrl} controls autoPlay className="w-full h-full" />:<div className="text-[12px] opacity-40 text-center p-6">Hasil video muncul di sini<br/>RunningHub task disimpan 24 jam, download segera</div>}</div></div>
                <div className="bg-black border border-[#222] rounded-xl p-3 font-mono text-[11px] text-green-400 h-[260px] overflow-auto">{log.length===0?<span className="opacity-40">Log ready...</span>:log.map((l,i)=><div key={i}>{l}</div>)}</div>
                <div className="bg-[#1a1a1a] border border-[#222] rounded-xl p-3 text-[11px] opacity-70">Endpoint: /bytedance/seedance-{model}-global{model==='2.5'?'-token/multimodal-video':'/text-to-video'}<br/>Multi-key support: ENV RUNNINGHUB_API_KEYS=key1,key2,key3 auto failover 429/402<br/>Vercel Blob untuk 10 foto ref → URL publik</div>
              </div>
            </div>
          )}
          {view==='library' && (
            <div className="max-w-[1000px] mx-auto"><h2 className="text-xl font-bold mb-4">Library • {history.length} video</h2><div className="grid md:grid-cols-3 gap-4">{history.length===0?<div className="opacity-50 text-sm">Belum ada video</div>:history.map(h=><div key={h.id} className="bg-[#151515] border border-[#222] rounded-xl p-3"><div className="aspect-video bg-black rounded-lg overflow-hidden">{h.videoUrl?<video src={h.videoUrl} controls className="w-full h-full" />:<div className="text-[11px] opacity-40 p-4">No video</div>}</div><div className="mt-2 text-[11px]"><div className="truncate opacity-70">{h.prompt}</div><div className="opacity-40">{h.model} • {h.duration}s • {h.res} • {h.date}</div></div></div>)}</div></div>
          )}
          {view==='owner' && (
            <div className="max-w-[1100px] mx-auto space-y-6">
              <div className="flex gap-2"><button onClick={()=>setOwnerTab('dashboard')} className={`px-4 py-2 rounded-full text-[12px] ${ownerTab==='dashboard'?'bg-[#e8dcc8] text-black':'bg-[#1a1a1a]'}`}>Dashboard</button><button onClick={()=>setOwnerTab('keys')} className={`px-4 py-2 rounded-full text-[12px] ${ownerTab==='keys'?'bg-[#e8dcc8] text-black':'bg-[#1a1a1a]'}`}>Key Pool</button><button onClick={()=>setOwnerTab('transactions')} className={`px-4 py-2 rounded-full text-[12px] ${ownerTab==='transactions'?'bg-[#e8dcc8] text-black':'bg-[#1a1a1a]'}`}>Transactions</button><button onClick={()=>setView('editor')} className="ml-auto px-4 py-2 rounded-full text-[12px] bg-[#1a1a1a]">← Buyer View</button></div>
              {ownerTab==='dashboard' && (<div className="grid md:grid-cols-3 gap-4"><div className="bg-[#151515] border border-[#222] rounded-xl p-5"><div className="text-[11px] opacity-50">Total Pendapatan</div><div className="text-2xl font-bold mt-1">Rp{(transactions.filter(t=>t.status==='Success').reduce((a,b)=>a+b.numericAmount,0)).toLocaleString('id-ID')}</div><div className="text-[11px] opacity-50 mt-1">{transactions.length} transaksi</div></div><div className="bg-[#151515] border border-[#222] rounded-xl p-5"><div className="text-[11px] opacity-50">Video Generated</div><div className="text-2xl font-bold mt-1">{history.length + 412}</div><div className="text-[11px] opacity-50 mt-1">Hari ini: {history.length}</div></div><div className="bg-[#151515] border border-[#222] rounded-xl p-5"><div className="text-[11px] opacity-50">Active Keys</div><div className="text-2xl font-bold mt-1">{keys.length}</div><div className="text-[11px] opacity-50 mt-1">ENV: RUNNINGHUB_API_KEYS</div></div></div>)}
              {ownerTab==='keys' && (<div className="bg-[#151515] border border-[#222] rounded-xl p-5"><h3 className="font-bold">Key Pool Manager (Multi-Key Auto Failover)</h3><div className="mt-3 space-y-2">{keys.map((k,i)=><div key={i} className="bg-black border border-[#222] rounded-lg p-3 text-[12px] flex justify-between"><span>{k}</span><span className="opacity-50">Usage {Math.floor(Math.random()*200)}</span></div>)}</div><div className="mt-4 text-[11px] opacity-60">ENV di Vercel: RUNNINGHUB_API_KEYS=key1,key2,key3 pisah koma. Logic auto-switch jika 429/402.</div></div>)}
              {ownerTab==='transactions' && (<div className="bg-[#151515] border border-[#222] rounded-xl p-5"><h3 className="font-bold">Transactions (Lynk.id / QRIS / VA)</h3><div className="mt-3 space-y-2">{transactions.map(t=><div key={t.id} className="bg-black border border-[#222] rounded-lg p-3 text-[12px] flex justify-between"><div><div className="font-mono font-bold">{t.id} • {t.paket} • {t.amount}</div><div className="opacity-60">{t.email} • {t.methodLabel} • {t.date}</div></div><div className={`px-2 py-1 rounded-full text-[10px] h-fit ${t.status==='Success'?'bg-emerald-500/20 text-emerald-300':'bg-amber-500/20 text-amber-300'}`}>{t.status}</div></div>)}</div></div>)}
            </div>
          )}
        </main>
      </div>
      {showPricing && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur flex items-center justify-center p-4">
          <div className="bg-[#151515] border border-[#2a2a2a] rounded-[20px] w-full max-w-[900px] overflow-hidden">
            <div className="p-6 flex justify-between items-center border-b border-[#222]"><h2 className="text-xl font-bold">Pilih Paket Ariri Studio</h2><button onClick={()=>setShowPricing(false)} className="w-8 h-8 rounded-full bg-[#1f1f1f]">✕</button></div>
            <div className="p-6 grid md:grid-cols-3 gap-4">
              {Object.values(PACKAGES).map((pkg:any)=>(
                <div key={pkg.id} className={`bg-[#0f0f0f] border rounded-[16px] p-5 flex flex-col ${pkg.best?'border-[#e8dcc8] relative': 'border-[#222]'}`}>{pkg.best && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#e8dcc8] text-black text-[10px] font-bold px-3 py-1 rounded-full">TERLARIS</div>}<div className="font-bold">{pkg.name}</div><div className="text-2xl font-bold mt-2">{pkg.priceStr}</div><div className="text-[11px] opacity-60 mt-1">{pkg.desc}</div><ul className="mt-4 space-y-1.5 text-[11px] opacity-80">{pkg.features.map((f:string)=><li key={f}>✓ {f}</li>)}</ul><button onClick={()=>handleSelectPackage(pkg)} className={`mt-5 w-full py-2.5 rounded-full font-bold text-[13px] ${pkg.best?'bg-[#e8dcc8] text-black':'bg-[#1f1f1f] border border-[#2a2a2a]'}`}>Pilih {pkg.name}</button></div>
              ))}
            </div>
            <div className="px-6 pb-6 text-[11px] opacity-50">Credit: 480p=20/detik, 720p=40/detik, 1080p=70/detik. Basic 1000c, Gold 5000c + 1080p + 10 ref. Unlimited fair use 30 video/hari.</div>
          </div>
        </div>
      )}
      {showCheckout && activeTxn && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur flex items-center justify-center p-4">
          <div className="bg-[#151515] border border-[#2a2a2a] rounded-[20px] w-full max-w-[900px] overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 flex justify-between items-center border-b border-[#222]"><h2 className="font-bold">Checkout • {activeTxn.paket} • {activeTxn.amount}</h2><button onClick={handleCancel} className="w-8 h-8 rounded-full bg-[#1f1f1f]">✕</button></div>
            {checkoutPhase==='method' && (
              <div className="p-6 grid md:grid-cols-[1.2fr_0.8fr] gap-6">
                <div><div className="text-[11px] tracking-widest opacity-40 font-bold mb-3">PILIH METODE PEMBAYARAN</div><div className="space-y-2 max-h-[400px] overflow-auto pr-1">{PAYMENT_OPTIONS.map(opt=>{ return (<div key={opt.id}><div className="text-[10px] opacity-40 mt-3 mb-1">{opt.group}</div><button onClick={()=>setSelectedMethod(opt)} className={`w-full text-left border rounded-xl p-3 flex items-center gap-3 ${selectedMethod.id===opt.id?'bg-[#e8dcc8]/10 border-[#e8dcc8]':'bg-[#0f0f0f] border-[#222] hover:border-[#333]'}`}><div className="text-xl">{opt.icon}</div><div className="flex-1"><div className="text-[13px] font-medium flex items-center gap-2">{opt.label} {opt.badge && <span className="text-[9px] bg-[#e8dcc8] text-black px-2 py-0.5 rounded-full">{opt.badge}</span>}</div><div className="text-[11px] opacity-60">{opt.desc}</div></div><div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedMethod.id===opt.id?'bg-[#e8dcc8] border-[#e8dcc8]': 'border-[#333]'}`}>{selectedMethod.id===opt.id && '✓'}</div></button></div>);})}</div></div>
                <div><div className="bg-[#0f0f0f] border border-[#222] rounded-xl p-4"><div className="text-[11px] opacity-40">RINCIAN</div><div className="mt-2 space-y-2 text-[12px]"><div className="flex justify-between"><span className="opacity-60">Paket</span><span>{activeTxn.paket}</span></div><div className="flex justify-between"><span className="opacity-60">Harga</span><span>{activeTxn.amount}</span></div><div className="flex justify-between"><span className="opacity-60">Kredit</span><span className="text-[#e8dcc8]">+{activeTxn.creditAdded===99999?'Unlimited':activeTxn.creditAdded}</span></div><div className="pt-2 border-t border-[#222] flex justify-between font-bold"><span>Total</span><span>{activeTxn.amount}</span></div></div><button onClick={handleCreateInvoice} className="w-full mt-4 bg-[#e8dcc8] text-black font-bold py-3 rounded-full text-[13px]">Bayar {activeTxn.amount} via {selectedMethod.label}</button><div className="mt-3 text-[10px] opacity-50 text-center">Akan buka modal konfirmasi metode, TIDAK langsung success.</div></div></div>
              </div>
            )}
            {checkoutPhase==='creating' && (<div className="p-12 text-center"><div className="animate-spin w-10 h-10 border-2 border-[#e8dcc8] border-t-transparent rounded-full mx-auto"></div><div className="mt-4 font-bold">Membuat Invoice {activeTxn.id}...</div><div className="text-[12px] opacity-60 mt-1">Menghubungkan ke {selectedMethod.label}</div></div>)}
            {checkoutPhase==='pending' && (
              <div className="p-6 grid md:grid-cols-[1.2fr_0.8fr] gap-6">
                <div><div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-[12px]"><div className="font-bold text-amber-300">Menunggu Pembayaran • {activeTxn.id}</div><div className="mt-2 opacity-80">Metode: {activeTxn.methodLabel} {activeTxn.va && `• VA: ${activeTxn.va}`}</div><div className="mt-2 text-[11px]">{selectedMethod.id==='qris' ? 'Scan QR di app e-wallet kamu' : selectedMethod.id.includes('bank') ? `Transfer ke Virtual Account ${activeTxn.va} sebesar ${activeTxn.amount}` : `Buka link pembayaran Lynk.id dan selesaikan`}</div><div className="mt-3 bg-black rounded-lg h-24 flex items-center justify-center text-[11px] opacity-50">{selectedMethod.id==='qris' ? '◧ QR Code Placeholder ◧' : `VA Number: ${activeTxn.va||'70012 1234 5678'}`}</div></div><div className="mt-4 grid grid-cols-3 gap-2 text-[10px]"><div className="bg-[#e8dcc8] text-black rounded-xl p-2 text-center font-bold">1. Bayar</div><div className="bg-[#1a1a1a] border border-[#262626] rounded-xl p-2 text-center opacity-60">2. Konfirmasi Otomatis</div><div className="bg-[#1a1a1a] border border-[#262626] rounded-xl p-2 text-center opacity-60">3. Kredit Masuk</div></div><div className="mt-4 bg-[#1a1a1a] border border-[#222] rounded-xl p-3 text-[11px] opacity-70">Setelah bayar klik Saya Sudah Bayar. Sistem cek otomatis. Simulasi auto-success 10 detik.</div></div>
                <div><div className="bg-[#0f0f0f] border border-[#222] rounded-xl p-4 text-[12px]"><div className="flex justify-between"><span className="opacity-60">Invoice</span><span className="font-mono">{activeTxn.id}</span></div><div className="flex justify-between mt-2"><span className="opacity-60">Total</span><span className="font-bold text-lg">{activeTxn.amount}</span></div><div className="mt-2 text-[11px] opacity-60 text-center">Sisa waktu <span className="text-amber-300 font-bold">{Math.floor(pendingSeconds/60)}:{(pendingSeconds%60).toString().padStart(2,'0')}</span> • Auto success 10s</div></div><button onClick={handleSuccess} className="w-full mt-4 bg-[#e8dcc8] text-black font-bold py-3 rounded-full text-[13px]">✅ Saya Sudah Bayar</button><button onClick={handleCancel} className="w-full mt-2 bg-[#1a1a1a] border border-[#222] py-2.5 rounded-full text-[12px]">Batalkan</button></div>
              </div>
            )}
            {checkoutPhase==='success' && (
              <div className="p-8 text-center max-w-[500px] mx-auto"><div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto text-3xl">✓</div><h3 className="mt-4 text-xl font-bold">Pembayaran Berhasil!</h3><p className="mt-2 text-[13px] opacity-70">Paket {activeTxn.paket} aktif • {activeTxn.creditAdded===99999?'Unlimited':' +'+activeTxn.creditAdded+' kredit'} • ID {activeTxn.id}</p><div className="mt-6 bg-[#0f0f0f] border border-[#222] rounded-xl p-4 text-left text-[12px] grid grid-cols-2 gap-3"><div><div className="opacity-50 text-[10px]">Paket</div><div>{activeTxn.paket} • {activeTxn.amount}</div></div><div><div className="opacity-50 text-[10px]">Metode</div><div>{activeTxn.methodLabel}</div></div></div><button onClick={()=>{setShowCheckout(false); setShowPricing(false);}} className="w-full mt-6 bg-[#e8dcc8] text-black font-bold py-3 rounded-full">🎬 Mulai Generate</button><div className="mt-3 text-[11px] opacity-50">Kredit: {isUnlimited?'Unlimited':credits} • Cek Owner → Transactions</div></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
