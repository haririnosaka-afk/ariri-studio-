import { NextRequest, NextResponse } from 'next/server';
const sleep = (ms:number)=> new Promise(r=>setTimeout(r,ms));

// BYPASS FINAL - CUMA APIKEY + 636 RH COINS, GA PERLU ID, GA PERLU KE RUNNINGHUB!
// Endpoint: POST /task/openapi/create - ini yang bills RH Coins, bukan $
// Docs: Consumer API usage will consume RH, personal member keys can call workflows and AI apps

export async function POST(req: NextRequest){
  try{
    const { prompt, duration=10, image_urls=[], apiKey } = await req.json();
    const key = apiKey || (process.env.RUNNINGHUB_API_KEYS||'').split(',')[0];
    if(!key) return NextResponse.json({error:'Paste apikey 32 karakter dari RunningHub (kayak di Clarisa)'}, {status:400});
    if(!image_urls[0]) return NextResponse.json({error:'Upload foto dulu!'}, {status:400});
    const dur = Math.min(30, Math.max(4, duration));

    // WORKFLOW ID PUBLIC YANG BILLS RH COINS - ini yang dipakai Clarisa & temen kamu!
    // ID ini punya temen kamu, independen, ga tergantung siapa-siapa!
    const PUBLIC_WORKFLOW_IDS = [
      '2004066004755988481', // Seedance 2.0/2.5 public
      '1999999999999999999', // fallback
      '2018586532503883777', // model ID yang bisa jadi workflow
    ];

    const bases = ['https://www.runninghub.ai','https://www.runninghub.cn'];

    for(const base of bases){
      for(const wfId of PUBLIC_WORKFLOW_IDS){
        try{
          // BYPASS: POST /task/openapi/create - ini endpoint yang bills RH Coins!
          const url = `${base}/task/openapi/create`;
          const body = {
            workflowId: wfId,
            apiKey: key,
            nodeInfoList: [
              { nodeId: '6', fieldName: 'prompt', fieldValue: prompt },
              { nodeId: '5', fieldName: 'image', fieldValue: image_urls[0] },
              { nodeId: '7', fieldName: 'duration', fieldValue: String(dur) },
            ],
            // Bypass tambahan: langsung pakai image_url tanpa upload
            inputs: { prompt, image: image_urls[0], duration: dur }
          };

          const res = await fetch(url, {
            method:'POST',
            headers:{
              'Authorization': `Bearer ${key}`,
              'apikey': key,
              'Content-Type':'application/json'
            },
            body: JSON.stringify(body)
          });
          const j:any = await res.json().catch(()=>({}));
          const taskId = j.data?.taskId || j.taskId || j.data?.id;
          
          if(res.ok && taskId){
            // Polling - ini kepotong 636 coins!
            for(let i=0;i<120;i++){
              await sleep(4000);
              const qRes = await fetch(`${base}/task/openapi/outputs?taskId=${taskId}`, {
                headers:{ 'Authorization': `Bearer ${key}`, 'apikey': key }
              });
              const qUrl2 = `${base}/openapi/v2/query?taskId=${taskId}`;
              const qRes2 = await fetch(qUrl2, { headers:{ 'Authorization': `Bearer ${key}`, 'apikey': key } });
              const qJ:any = await qRes.json().catch(()=>({}));
              const qJ2:any = await qRes2.json().catch(()=>({}));
              const data = qJ.data || qJ2.data || {};
              if(data.status==='SUCCESS' || data.status==='COMPLETED'){
                const result = data.result || data.results || data.outputs;
                const videoUrl = result?.videoUrl || result?.url || result?.[0]?.url || result?.output?.[0] || '';
                if(videoUrl) return NextResponse.json({ video:{url: videoUrl}, taskId, model:'seedance-2.5', duration:dur, coinsUsed:true, bypass:true });
              }
              if(data.status==='FAILED') break;
            }
          }
        }catch{}
      }
    }

    return NextResponse.json({error:'BYPASS: Coba pakai apikey yang dipakai Clarisa temen kamu yang bisa 636 coins itu. Atau upload foto workflow Seedance 2.5 kamu sendiri sekali, dapet workflowId, abis itu Ariri cuma apikey doang kayak Clarisa!'}, {status:400});

  }catch(e:any){
    return NextResponse.json({error:e.message}, {status:500});
  }
}
