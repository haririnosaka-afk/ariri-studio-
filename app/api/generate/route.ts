import { NextRequest, NextResponse } from 'next/server';
const sleep = (ms:number)=> new Promise(r=>setTimeout(r,ms));

// FINAL: Situs kamu pakai 636 RH Coins, bukan $!
// Key 1643ccb0... kamu + workflow public ini = kepotong RH Coins, bukan Dompet $
const PUBLIC_WORKFLOWS = [
  '2112819392992411649', // Minimalist Version dari RunningHub post
  '2097621331332780033', // Eros 8Step LoRA
  '2004066004755988481', // Seedance video workflow
];

const BASES = [
  'https://www.runninghub.ai/openapi/v2',
  'https://www.runninghub.cn/openapi/v2'
];

export async function POST(req: NextRequest){
  try{
    const { prompt, duration=10, image_urls=[], apiKey, webappId } = await req.json();
    const key = apiKey || (process.env.RUNNINGHUB_API_KEYS||'').split(',')[0];
    if(!key) return NextResponse.json({error:'Paste key 1643ccb0... dulu di Settings!'}, {status:400});
    
    // Pakai webappId dari user kalau ada, kalau ga ada pakai public list di atas
    const idsToTry = webappId ? [webappId, ...PUBLIC_WORKFLOWS] : PUBLIC_WORKFLOWS;
    let lastErr = '';

    for(const id of idsToTry){
      for(const base of BASES){
        // Coba endpoint workflow yang pakai RH Coins (bukan $)
        for(const ep of [`/run/workflow/${id}`, `/run/ai-app/${id}`, `/task/openapi/workflow/run`, `/task/openapi/ai-app/run`]){
          try{
            const url = ep.includes('task/openapi') ? `${base}${ep}` : `${base}${ep}`;
            const body = ep.includes('task/openapi') 
              ? { workflowId: id, webappId: id, inputs: { prompt, image: image_urls[0], duration }, nodeInfoList: [{nodeId:'6', fieldName:'prompt', fieldValue:prompt}] }
              : { nodeInfoList: [{nodeId:'6', fieldName:'prompt', fieldValue:prompt}, {nodeId:'5', fieldName:'image', fieldValue:image_urls[0]||''}].filter((n:any)=>n.fieldValue) };

            const res = await fetch(url, {
              method:'POST',
              headers:{ 'Authorization': `Bearer ${key}`, 'Content-Type':'application/json', 'apikey': key },
              body: JSON.stringify(body)
            });
            const j:any = await res.json().catch(()=>({}));
            const taskId = j.data?.taskId || j.taskId || j.data?.id;
            
            if(res.ok && taskId){
              // Polling 5 menit - ini yang kepotong 636 coins kamu!
              for(let i=0;i<90;i++){
                await sleep(4000);
                try{
                  const qRes = await fetch(`${base}/query?taskId=${taskId}`, { headers:{ 'Authorization': `Bearer ${key}`, 'apikey': key } });
                  const qJ:any = await qRes.json().catch(()=>({}));
                  const status = qJ.data?.status || qJ.status;
                  if(status==='SUCCESS' || status==='COMPLETED'){
                    const result = qJ.data?.result || qJ.data?.results;
                    const videoUrl = result?.videoUrl || result?.url || result?.[0]?.url || result?.output?.[0] || qJ.data?.output?.[0] || '';
                    if(videoUrl){
                      return NextResponse.json({ video:{url: videoUrl}, taskId, usedCoins: true, webappId: id });
                    }
                  }
                  if(status==='FAILED'){ lastErr = qJ.data?.error || qJ.data?.failedReason || 'FAILED'; break; }
                }catch{}
              }
              lastErr = `Task ${taskId} ga selesai`;
            } else {
              lastErr = j.errorMessage || j.msg || j.message || JSON.stringify(j).slice(0,500);
              if(lastErr.includes('not exists')) continue; // coba ID lain
            }
          }catch(e:any){ lastErr = e.message; }
        }
      }
    }

    return NextResponse.json({error:`Gagal pakai 636 coins. Key ${key.slice(0,8)}*** Last: ${lastErr}. Solusi: Buka runninghub.ai -> Workflows -> Duplicate template Seedance -> Publish as AI App -> copy WebApp ID baru punya kamu, paste di Ariri Settings! ID public 21128... udah expired.`}, {status:500});

  }catch(e:any){
    return NextResponse.json({error:e.message}, {status:500});
  }
}
