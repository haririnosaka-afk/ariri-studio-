import { NextRequest, NextResponse } from 'next/server';
const BASE_URL = process.env.RUNNINGHUB_BASE_URL || 'https://www.runninghub.ai/openapi/v2';
const SINGLE_KEY = process.env.RUNNINGHUB_API_KEY || '';
const MULTI_KEYS = (process.env.RUNNINGHUB_API_KEYS || '').split(',').map(k=>k.trim()).filter(Boolean);
const ALL_KEYS = MULTI_KEYS.length>0 ? MULTI_KEYS : (SINGLE_KEY ? [SINGLE_KEY] : []);

function getKeys(userKey?:string){
  if(userKey && userKey.trim()) return [userKey.trim()];
  return ALL_KEYS;
}

export async function POST(req: NextRequest){
  try{
    const { prompt, duration=5, model='2.5', resolution='720p', aspect_ratio='adaptive', image_urls=[], generateAudio=true, apiKeyFromUser } = await req.json();
    const keys = getKeys(apiKeyFromUser);
    if(keys.length===0) return NextResponse.json({ error:'No API Key set', detail:'Set RUNNINGHUB_API_KEYS di Vercel Env' },{ status:400 });

    let endpoint = '';
    let requestBody:any = {};
    if(model==='2.0'){
      if(image_urls.length===0){
        endpoint = '/bytedance/seedance-2.0-global/text-to-video';
        requestBody = { prompt, duration, resolution, aspect_ratio, generate_audio: generateAudio };
      } else {
        endpoint = '/bytedance/seedance-2.0-global/image-to-video';
        requestBody = { prompt, duration, resolution, aspect_ratio, image_url: image_urls[0], generate_audio: generateAudio };
      }
    } else {
      endpoint = '/bytedance/seedance-2.5-global-token/multimodal-video';
      requestBody = { prompt, duration, resolution, aspect_ratio, image_urls: image_urls, generate_audio: generateAudio };
    }

    let lastError:any=null;
    for(const key of keys){
      try{
        const res = await fetch(`${BASE_URL}${endpoint}`,{
          method:'POST',
          headers:{ 'Content-Type':'application/json', 'Authorization': `Bearer ${key}`, 'X-API-Key': key, 'api-key': key },
          body: JSON.stringify(requestBody),
        });
        const data = await res.json().catch(async()=>({ raw: await res.text() }));
        if(res.status===429 || res.status===402){ lastError=data; continue; }
        if(!res.ok){ lastError=data; if(res.status===401 || res.status===403) continue; return NextResponse.json({ error:'RunningHub error', detail:data },{ status: res.status }); }
        
        const taskId = data.taskId || data.task_id || data.id;
        const directUrl = data.video?.url || data.url || '';
        if(directUrl && !taskId) return NextResponse.json({ taskId:'direct', status:'succeeded', video:{ url: directUrl }, url: directUrl });

        let finalUrl='';
        for(let i=0;i<30;i++){
          await new Promise(r=>setTimeout(r,3000));
          const sRes = await fetch(`${BASE_URL}/task/status/${taskId}`,{ headers:{ 'Authorization': `Bearer ${key}`, 'X-API-Key': key } });
          const sData = await sRes.json().catch(()=>({}));
          const url = sData.video?.url || sData.result?.video_url || sData.url || '';
          if(url){ finalUrl=url; break; }
        }
        return NextResponse.json({ taskId, status: finalUrl?'succeeded':'processing', video:{ url: finalUrl }, url: finalUrl, raw:data });
      }catch(e:any){ lastError=e; continue; }
    }
    return NextResponse.json({ error:'All keys failed', detail:lastError }, { status: 429 });
  }catch(e:any){
    return NextResponse.json({ error:'Server error', detail:e.message }, { status:500 });
  }
}
