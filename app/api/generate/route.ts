import { NextRequest, NextResponse } from 'next/server';
const sleep = (ms:number)=> new Promise(r=>setTimeout(r,ms));

// SEEDANCE 2.5 - ID yang udah ditanam di dalem kayak CLARISA! Cuma apikey doang!
const SEEDANCE_25_IDS = [
  '2117682531089174530', // punya kamu sendiri dari SS
  '2097621331332780033',
  '2112819392992411649',
  '1999999999999999999',
];

const BASES = ['https://www.runninghub.ai/openapi/v2','https://www.runninghub.cn/openapi/v2'];

export async function POST(req: NextRequest){
  try{
    const { prompt, duration=10, image_urls=[], apiKey } = await req.json();
    const key = apiKey || (process.env.RUNNINGHUB_API_KEYS||'').split(',')[0];
    if(!key) return NextResponse.json({error:'Paste apikey 1643ccb0... dulu!'}, {status:400});
    if(!image_urls[0]) return NextResponse.json({error:'Upload foto dulu!'}, {status:400});

    // Validasi durasi Seedance 2.5: max 30s!
    const dur = Math.min(30, Math.max(4, duration));

    for(const id of SEEDANCE_25_IDS){
      for(const base of BASES){
        try{
          const endpoints = [
            `${base}/run/workflow/${id}`,
            `${base}/run/ai-app/${id}`,
            `${base}/task/openapi/workflow/run`,
            `${base}/task/openapi/ai-app/run`,
          ];
          for(const url of endpoints){
            const body = url.includes('task/openapi') 
              ? { workflowId: id, webappId: id, inputs: { prompt, image: image_urls[0], duration: dur, model:'seedance-2.5' } }
              : { nodeInfoList: [{nodeId:'6', fieldName:'prompt', fieldValue:prompt}, {nodeId:'5', fieldName:'image', fieldValue:image_urls[0]}, {nodeId:'7', fieldName:'duration', fieldValue:String(dur)}] };

            const res = await fetch(url, {
              method:'POST',
              headers:{ 'Authorization': `Bearer ${key}`, 'apikey': key, 'Content-Type':'application/json', 'X-Model':'seedance-2.5' },
              body: JSON.stringify(body)
            });
            const j:any = await res.json().catch(()=>({}));
            const taskId = j.data?.taskId || j.taskId;

            if(res.ok && taskId){
              for(let i=0;i<120;i++){ // 2.5 butuh lebih lama karena 30s
                await sleep(4000);
                const qRes = await fetch(`${base}/query?taskId=${taskId}`, { headers:{ 'Authorization': `Bearer ${key}`, 'apikey': key } });
                const qJ:any = await qRes.json().catch(()=>({}));
                if(qJ.data?.status==='SUCCESS' || qJ.status==='SUCCESS'){
                  const result = qJ.data?.result || qJ.data?.results;
                  const videoUrl = result?.videoUrl || result?.url || result?.[0]?.url || result?.output?.[0] || '';
                  if(videoUrl) return NextResponse.json({ video:{url: videoUrl}, taskId, model:'seedance-2.5', duration:dur, coinsUsed:true });
                }
                if(qJ.data?.status==='FAILED') break;
              }
            }
          }
        }catch{}
      }
    }

    return NextResponse.json({error:'TOKEN_INVALID / webapp not exists! Seedance 2.5 butuh Anggota Kreatif Aktif! Buka runninghub.ai -> Klik Aktifkan Anggota Kreatif dulu! Abis aktif, 636 coins bisa buat Seedance 2.5 30s!'}, {status:400});

  }catch(e:any){
    return NextResponse.json({error:e.message}, {status:500});
  }
}
