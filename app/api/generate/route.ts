import { NextRequest, NextResponse } from 'next/server';
const sleep = (ms:number)=> new Promise(r=>setTimeout(r,ms));
const BASES = ['https://www.runninghub.ai/openapi/v2','https://www.runninghub.cn/openapi/v2'];
// INI ADALAH ROUTE.TS VERSI SIMPLE - TARO DI app/api/generate/route.ts (yang ada di screenshot)
// Jadi kamu ga perlu bikin folder workflow lagi!
// Key 1643ccb0... kamu bisa langsung pakai disini!
export async function POST(req: NextRequest){
  try{
    const { prompt, duration=10, image_urls=[], apiKey, webappId } = await req.json();
    const finalWebappId = webappId || '2004066004755988481'; // ID public bawaan
    const finalKey = apiKey || (process.env.RUNNINGHUB_API_KEYS||'').split(',')[0];
    
    if(!finalKey) return NextResponse.json({error:'API Key kosong - paste key 1643ccb0... kamu di Settings'}, {status:400});
    if(!prompt) return NextResponse.json({error:'Prompt kosong'}, {status:400});

    let lastErr = '';
    for(const base of BASES){
      try{
        const url1 = `${base}/run/ai-app/${finalWebappId}`;
        const nodeInfoList = [
          { nodeId: '6', fieldName: 'text', fieldValue: prompt },
          { nodeId: '6', fieldName: 'prompt', fieldValue: prompt },
          { nodeId: '1', fieldName: 'prompt', fieldValue: prompt },
          { nodeId: '5', fieldName: 'image', fieldValue: image_urls[0] || '' },
          { nodeId: '3', fieldName: 'image', fieldValue: image_urls[0] || '' },
        ].filter(n=>n.fieldValue);
        const res1 = await fetch(url1, {
          method:'POST',
          headers:{ 'Authorization': `Bearer ${finalKey}`, 'Content-Type':'application/json' },
          body: JSON.stringify({ nodeInfoList })
        });
        const j1:any = await res1.json().catch(()=>({}));
        const taskId1 = j1.data?.taskId || j1.taskId || j1.data?.id;
        if(res1.ok && taskId1){
          for(let i=0;i<90;i++){
            await sleep(4000);
            const qRes = await fetch(`${base}/query?taskId=${taskId1}`, { headers:{ 'Authorization': `Bearer ${finalKey}` } });
            const qJ:any = await qRes.json().catch(()=>({}));
            const status = qJ.data?.status || qJ.status;
            if(status==='SUCCESS' || status==='COMPLETED' || qJ.data?.result){
              const videoUrl = qJ.data?.result?.videoUrl || qJ.data?.result?.url || qJ.data?.result?.[0]?.url || qJ.data?.output?.[0] || '';
              if(videoUrl) return NextResponse.json({ video:{url: videoUrl}, taskId: taskId1 });
            }
            if(status==='FAILED') { lastErr = qJ.data?.error || 'FAILED'; break; }
          }
        } else {
          lastErr = j1.msg || j1.message || `${res1.status} - ${JSON.stringify(j1).slice(0,300)}`;
        }
      }catch(e:any){ lastErr = e.message; }
    }
    return NextResponse.json({error:`Gagal. Key ${finalKey.slice(0,8)}*** mungkin saldo habis atau WebApp ID ${finalWebappId} ga aktif. Error: ${lastErr}`}, {status:500});
  }catch(e:any){
    return NextResponse.json({error:e.message}, {status:500});
  }
}
