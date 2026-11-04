import { NextRequest, NextResponse } from 'next/server';

const BASE = process.env.RUNNINGHUB_BASE_URL || 'https://www.runninghub.ai/openapi/v2';
const sleep = (ms:number)=> new Promise(r=>setTimeout(r,ms));

// Ambil semua key: prioritas dari user input di web, baru dari ENV Vercel
function getKeys(reqKey?: string){
  const fromUser = reqKey ? reqKey.split(',').map(k=>k.trim()).filter(Boolean) : [];
  const fromEnv = (process.env.RUNNINGHUB_API_KEYS||'').split(',').map(k=>k.trim()).filter(Boolean);
  // User input prioritas utama
  const all = [...fromUser, ...fromEnv];
  // Filter dummy
  return all.filter(k=>k && !k.includes('dummy') && k.startsWith('rh_'));
}

export async function POST(req: NextRequest){
  try{
    const { prompt, duration=10, model='2.5', resolution='1080p', aspect_ratio='16:9', image_urls=[], generateAudio=true, apiKeyFromUser } = await req.json();
    
    if(!prompt) return NextResponse.json({error:'Prompt kosong'}, {status:400});
    
    const keys = getKeys(apiKeyFromUser);
    if(keys.length===0){
      return NextResponse.json({error:'API Key belum dipasang! Buka Settings di Ariri Studio dan paste API Key RunningHub kamu, atau pasang di Vercel ENV RUNNINGHUB_API_KEYS. Ambil di https://www.runninghub.ai/id/call-api/bill-task?tab=keys&type=consumer'}, {status:401});
    }

    let lastErr='';
    for(const apiKey of keys){
      try{
        const is25 = model==='2.5';
        const endpoint = is25 ? `${BASE}/bytedance/seedance-2.5-global-token/multimodal-video` : `${BASE}/bytedance/seedance-2.0-global/text-to-video`;
        
        const payload:any = {
          prompt,
          duration,
          resolution,
          aspect_ratio,
          generateAudio
        };
        if(image_urls?.length>0){
          if(is25) payload.image_urls = image_urls.slice(0,10);
          else payload.image_urls = image_urls.slice(0,2);
        }

        const create = await fetch(endpoint, {
          method:'POST',
          headers:{'Content-Type':'application/json','Authorization':`Bearer ${apiKey}`},
          body: JSON.stringify(payload)
        });
        
        const cJson = await create.json().catch(()=>({}));
        if(!create.ok){
          lastErr = cJson.msg || cJson.message || `HTTP ${create.status}`;
          if(create.status===401 || create.status===403) continue; // coba key berikutnya
          if(create.status===429) continue;
          throw new Error(lastErr);
        }

        const taskId = cJson.data?.taskId || cJson.taskId;
        if(!taskId) throw new Error('No taskId');

        // Polling status 1-5 menit
        for(let i=0;i<120;i++){
          await sleep(3000);
          const sRes = await fetch(`${BASE}/task/status?taskId=${taskId}`, {headers:{'Authorization':`Bearer ${apiKey}`}});
          const sJson = await sRes.json().catch(()=>({}));
          const status = sJson.data?.status || sJson.status;
          if(status==='SUCCESS' || status==='COMPLETED'){
            const url = sJson.data?.result?.videoUrl || sJson.data?.result?.url || sJson.data?.result?.[0]?.url || sJson.data?.output?.[0] || '';
            if(url) return NextResponse.json({video:{url}, taskId, usedKey: apiKey.slice(0,12)+'***'});
          }
          if(status==='FAILED' || status==='FAILURE'){
            lastErr = sJson.data?.error || 'FAILED';
            break;
          }
        }
        lastErr = 'Timeout / gagal di penyedia';
      }catch(e:any){
        lastErr = e.message;
        continue;
      }
    }
    return NextResponse.json({error:`Generate gagal di penyedia. Coba lagi sebentar lagi. (${lastErr})`}, {status:500});

  }catch(e:any){
    return NextResponse.json({error:e.message||'Internal error'}, {status:500});
  }
}
