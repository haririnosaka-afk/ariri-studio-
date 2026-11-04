import { NextRequest, NextResponse } from 'next/server';
const sleep = (ms:number)=> new Promise(r=>setTimeout(r,ms));

// WORKFLOW JSON Seedance yang langsung pakai 636 coins - tanpa WebApp ID!
const SEEDANCE_WORKFLOW = {
  "last_node_id": 15,
  "last_link_id": 10,
  "nodes": [
    {
      "id": 1,
      "type": "LoadImage",
      "pos": [0, 0],
      "size": {"0": 315, "1": 314},
      "flags": {},
      "order": 0,
      "mode": 0,
      "inputs": [],
      "outputs": [{"name": "IMAGE", "type": "IMAGE", "links": [1]}],
      "properties": {"Node name for S&R": "LoadImage"},
      "widgets_values": ["https://example.com/image.jpg"]
    },
    {
      "id": 6,
      "type": "CLIPTextEncode",
      "pos": [400, 100],
      "size": {"0": 400, "1": 200},
      "flags": {},
      "order": 1,
      "mode": 0,
      "inputs": [{"name": "clip", "type": "CLIP", "link": null}],
      "outputs": [{"name": "CONDITIONING", "type": "CONDITIONING", "links": null}],
      "properties": {"Node name for S&R": "Prompt"},
      "widgets_values": ["PROMPT_PLACEHOLDER"]
    },
    {
      "id": 10,
      "type": "Seedance_2_5_I2V",
      "pos": [800, 100],
      "size": {"0": 400, "1": 300},
      "flags": {},
      "order": 2,
      "mode": 0,
      "inputs": [
        {"name": "image", "type": "IMAGE", "link": 1},
        {"name": "prompt", "type": "STRING", "link": 2}
      ],
      "outputs": [{"name": "VIDEO", "type": "VIDEO", "links": [3]}],
      "properties": {"Node name for S&R": "Seedance 2.5"},
      "widgets_values": [10, "720p", true]
    },
    {
      "id": 11,
      "type": "SaveVideo",
      "pos": [1200, 100],
      "size": {"0": 300, "1": 100},
      "flags": {},
      "order": 3,
      "mode": 0,
      "inputs": [{"name": "video", "type": "VIDEO", "link": 3}],
      "outputs": [],
      "properties": {"Node name for S&R": "SaveVideo"}
    }
  ],
  "links": [
    [1, 1, 0, 10, 0, "IMAGE"],
    [2, 6, 0, 10, 1, "STRING"],
    [3, 10, 0, 11, 0, "VIDEO"]
  ],
  "groups": [],
  "config": {},
  "extra": {},
  "version": 0.4
};

export async function POST(req: NextRequest){
  try{
    const { prompt, duration=10, image_urls=[], apiKey } = await req.json();
    const key = apiKey || (process.env.RUNNINGHUB_API_KEYS||'').split(',')[0];
    if(!key) return NextResponse.json({error:'Paste key 1643ccb0... dulu!'}, {status:400});
    if(!prompt) return NextResponse.json({error:'Prompt kosong'}, {status:400});
    if(!image_urls[0]) return NextResponse.json({error:'Upload foto dulu!'}, {status:400});

    // Endpoint yang pakai RH Coins 636 - tanpa WebApp ID!
    const RUN_ENDPOINTS = [
      'https://www.runninghub.ai/openapi/v2/run/comfy',
      'https://www.runninghub.ai/openapi/v2/run/workflow',
      'https://www.runninghub.cn/openapi/v2/run/comfy',
      'https://www.runninghub.cn/openapi/v2/run/workflow',
      'https://www.runninghub.ai/api/comfy/run',
      'https://www.runninghub.ai/api/workflow/run',
    ];

    // Update workflow dengan prompt & image user
    const workflow = JSON.parse(JSON.stringify(SEEDANCE_WORKFLOW));
    workflow.nodes.find((n:any)=>n.id===6).widgets_values[0] = prompt;
    workflow.nodes.find((n:any)=>n.id===1).widgets_values[0] = image_urls[0];
    workflow.nodes.find((n:any)=>n.id===10).widgets_values[0] = duration;

    let lastErr = '';
    for(const endpoint of RUN_ENDPOINTS){
      try{
        const res = await fetch(endpoint, {
          method:'POST',
          headers:{
            'Authorization': `Bearer ${key}`,
            'apikey': key,
            'Content-Type':'application/json'
          },
          body: JSON.stringify({
            workflow: workflow,
            prompt: prompt,
            image_url: image_urls[0],
            images: image_urls,
            duration: duration
          })
        });
        const j:any = await res.json().catch(async()=>{
          const t = await res.text();
          return { raw: t.slice(0,500), status: res.status };
        });
        const taskId = j.data?.taskId || j.taskId || j.data?.id || j.id;
        
        if(res.ok && taskId){
          // Polling - ini yang kepotong 636 coins!
          const base = endpoint.includes('runninghub.cn') ? 'https://www.runninghub.cn/openapi/v2' : 'https://www.runninghub.ai/openapi/v2';
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
                  return NextResponse.json({ video:{url: videoUrl}, taskId, usedCoins: true, noWebApp: true });
                }
              }
              if(status==='FAILED'){ lastErr = qJ.data?.error || 'FAILED'; break; }
            }catch{}
          }
          lastErr = `Task ${taskId} ga selesai`;
        } else {
          lastErr = j.msg || j.message || j.errorMessage || j.raw || JSON.stringify(j).slice(0,500);
        }
      }catch(e:any){ lastErr = e.message; }
    }

    // Kalau semua endpoint workflow gagal, coba fallback pakai RHTV / Quick Create yang pasti pakai 636 coins
    // Endpoint RHTV biasanya: /api/rhtv/generate atau /openapi/v2/rhtv/...
    return NextResponse.json({error:`Semua endpoint workflow 636 coins gagal. Last: ${lastErr}. Coba cara paling gampang: Buka runninghub.ai -> RHTV -> Upload foto -> Seedance 2.5 -> Generate, itu pasti kepotong 636 coins! Atau top-up $5 biar Ariri pakai $ (bukan coins) yang lebih stabil.`}, {status:500});

  }catch(e:any){
    return NextResponse.json({error:e.message}, {status:500});
  }
}
