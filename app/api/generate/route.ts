import { NextRequest, NextResponse } from 'next/server';
const sleep = (ms:number)=> new Promise(r=>setTimeout(r,ms));

const ENDPOINTS = [
  'https://www.runninghub.ai/openapi/v2/bytedance/seedance-2.5-token/image-to-video',
  'https://www.runninghub.ai/openapi/v2/bytedance/seedance-2.5-token/multimodal-video',
  'https://www.runninghub.ai/openapi/v2/bytedance/seedance-2.0-token/image-to-video',
  'https://www.runninghub.cn/openapi/v2/bytedance/seedance-2.5-token/image-to-video',
  'https://www.runninghub.cn/openapi/v2/bytedance/seedance-2.5-token/multimodal-video',
];

export async function POST(req: NextRequest){
  try{
    const { prompt, duration=10, image_urls=[], apiKey } = await req.json();
    const key = apiKey || (process.env.RUNNINGHUB_API_KEYS||'').split(',')[0];
    if(!key) return NextResponse.json({error:'Key kosong - paste 1643ccb0...'}, {status:400});
    if(!prompt) return NextResponse.json({error:'Prompt kosong'}, {status:400});

    let lastErr = '';
    for(const endpoint of ENDPOINTS){
      try{
        // Payload untuk token endpoint (bukan global-token)
        const payload:any = {
          prompt,
          duration: duration,
          duration_seconds: duration,
          seconds: duration,
          image_url: image_urls[0] || '',
          first_frame_image: image_urls[0] || '',
          images: image_urls,
          image_urls: image_urls,
          resolution: '720p',
          aspect_ratio: '16:9',
          enable_audio: true,
        };

        const res = await fetch(endpoint, {
          method:'POST',
          headers:{
            'Authorization': `Bearer ${key}`,
            'Content-Type':'application/json',
            'apikey': key
          },
          body: JSON.stringify(payload)
        });

        const j:any = await res.json().catch(async()=>{
          const t = await res.text().catch(()=>'' );
          return { raw: t.slice(0,500) };
        });

        const taskId = j.data?.taskId || j.taskId || j.data?.id;
        
        if(res.ok && taskId){
          // Polling pakai /query
          const base = endpoint.includes('runninghub.cn') ? 'https://www.runninghub.cn/openapi/v2' : 'https://www.runninghub.ai/openapi/v2';
          for(let i=0;i<90;i++){
            await sleep(4000);
            try{
              const qRes = await fetch(`${base}/query?taskId=${taskId}`, {
                headers:{ 'Authorization': `Bearer ${key}`, 'apikey': key }
              });
              const qJ:any = await qRes.json().catch(()=>({}));
              const status = qJ.data?.status || qJ.status;
              const result = qJ.data?.result || qJ.data?.results;
              if(status==='SUCCESS' || status==='COMPLETED'){
                const videoUrl = result?.videoUrl || result?.video_url || result?.url || result?.[0]?.url || result?.output?.[0] || qJ.data?.output?.[0] || '';
                if(videoUrl) return NextResponse.json({ video:{url: videoUrl}, taskId, endpoint });
              }
              if(status==='FAILED'){
                lastErr = qJ.data?.error || qJ.data?.failedReason || 'FAILED';
                break;
              }
            }catch{}
          }
          lastErr = `Task ${taskId} tidak selesai`;
        } else {
          lastErr = j.msg || j.message || j.errorMessage || j.error || JSON.stringify(j).slice(0,500);
          // Kalau error 1014 enterprise, coba endpoint lain
          if(lastErr.includes('1014') || lastErr.includes('Enterprise') || lastErr.includes('restricted')){
            continue;
          }
          // Kalau endpoint ga ada, coba next
          if(res.status===404) continue;
        }
      }catch(e:any){ lastErr = e.message; }
    }

    return NextResponse.json({error:`Gagal semua endpoint token. Key ${key.slice(0,8)}*** mungkin saldo habis atau membership belum Personal. Coba top-up $5 di runninghub.ai -> Billing. Last: ${lastErr}`}, {status:500});

  }catch(e:any){
    return NextResponse.json({error:e.message}, {status:500});
  }
}
