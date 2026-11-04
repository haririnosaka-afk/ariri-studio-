import { NextRequest, NextResponse } from 'next/server';

const BASE = process.env.RUNNINGHUB_BASE_URL || 'https://www.runninghub.ai/openapi/v2';
const MEMBERSHIP_BASE = 'https://www.runninghub.ai';
const sleep = (ms:number)=> new Promise(r=>setTimeout(r,ms));

function getKeys(reqKey?: string){
  const fromUser = reqKey ? reqKey.split(/[\n,]+/).map(k=>k.trim()).filter(Boolean) : [];
  const fromEnv = (process.env.RUNNINGHUB_API_KEYS||'').split(/[\n,]+/).map(k=>k.trim()).filter(Boolean);
  const all = [...fromUser, ...fromEnv];
  // TERIMA SEMUA FORMAT: rh_... , fc75... , 1643ccb0... 32 char hex, apapun yang panjang >10
  return all.filter(k=>k && k.length>=10 && !k.includes('dummy'));
}

export async function POST(req: NextRequest){
  try{
    const { prompt, duration=10, model='2.5', resolution='1080p', aspect_ratio='16:9', image_urls=[], generateAudio=true, apiKeyFromUser } = await req.json();
    
    if(!prompt) return NextResponse.json({error:'Prompt kosong'}, {status:400});
    
    const keys = getKeys(apiKeyFromUser);
    if(keys.length===0){
      return NextResponse.json({error:'API Key belum dipasang! Paste key kamu 1643ccb0ad504284becb69c084d919bf di Settings Ariri. Format rh_ atau 32 char hex semua bisa sekarang.'}, {status:401});
    }

    let lastErr='';
    for(const apiKey of keys){
      try{
        const isRhKey = apiKey.startsWith('rh_');
        const isMembershipKey = !isRhKey; // fc75... atau 1643ccb0...

        // JIKA KEY TIPE MEMBERSHIP (fc75... / 1643...), pakai endpoint membership yang lebih kompatibel
        if(isMembershipKey){
          // Coba pakai openapi v2 dulu dengan membership key, banyak yang support
          const is25 = model==='2.5';
          const endpoint = is25 ? `${BASE}/bytedance/seedance-2.5-global-token/multimodal-video` : `${BASE}/bytedance/seedance-2.0-global/text-to-video`;
          const payload:any = { prompt, duration, resolution, aspect_ratio, generateAudio };
          if(image_urls?.length>0){
            payload.image_urls = image_urls.slice(0, is25?10:2);
          }
          const create = await fetch(endpoint, {
            method:'POST',
            headers:{'Content-Type':'application/json','Authorization':`Bearer ${apiKey}`, 'X-API-Key': apiKey, 'apikey': apiKey },
            body: JSON.stringify(payload)
          });
          const cJson = await create.json().catch(()=>({}));
          if(!create.ok){
            lastErr = cJson.msg || cJson.message || `HTTP ${create.status} - ${JSON.stringify(cJson).slice(0,100)}`;
            // Jika 401 coba header lain
            if(create.status===401){
              // Coba dengan query param ?apiKey=
              const create2 = await fetch(`${endpoint}?apiKey=${apiKey}`, {
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body: JSON.stringify(payload)
              });
              const cJson2 = await create2.json().catch(()=>({}));
              if(create2.ok){
                const taskId = cJson2.data?.taskId || cJson2.taskId;
                if(taskId){
                  for(let i=0;i<120;i++){
                    await sleep(3000);
                    const sRes = await fetch(`${BASE}/task/status?taskId=${taskId}`, {headers:{'Authorization':`Bearer ${apiKey}`, 'X-API-Key': apiKey}});
                    const sJson = await sRes.json().catch(()=>({}));
                    const status = sJson.data?.status || sJson.status;
                    if(status==='SUCCESS' || status==='COMPLETED'){
                      const url = sJson.data?.result?.videoUrl || sJson.data?.result?.url || sJson.data?.result?.[0]?.url || sJson.data?.output?.[0] || '';
                      if(url) return NextResponse.json({video:{url}, taskId, usedKey: apiKey.slice(0,8)+'***'});
                    }
                    if(status==='FAILED' || status==='FAILURE'){ lastErr = sJson.data?.error || 'FAILED'; break; }
                  }
                }
              } else {
                lastErr = cJson2.msg || lastErr;
                continue;
              }
            } else {
              continue;
            }
          }
          const taskId = cJson.data?.taskId || cJson.taskId;
          if(!taskId) { lastErr = 'No taskId '+JSON.stringify(cJson).slice(0,200); continue; }
          for(let i=0;i<120;i++){
            await sleep(3000);
            const sRes = await fetch(`${BASE}/task/status?taskId=${taskId}`, {headers:{'Authorization':`Bearer ${apiKey}`, 'X-API-Key': apiKey}});
            const sJson = await sRes.json().catch(()=>({}));
            const status = sJson.data?.status || sJson.status;
            if(status==='SUCCESS' || status==='COMPLETED'){
              const url = sJson.data?.result?.videoUrl || sJson.data?.result?.url || sJson.data?.result?.[0]?.url || sJson.data?.output?.[0] || '';
              if(url) return NextResponse.json({video:{url}, taskId, usedKey: apiKey.slice(0,8)+'***'});
            }
            if(status==='FAILED' || status==='FAILURE'){ lastErr = sJson.data?.error || 'FAILED'; break; }
          }
          continue;
        }

        // JIKA KEY TIPE rh_ (OpenAPI v2)
        const is25 = model==='2.5';
        const endpoint = is25 ? `${BASE}/bytedance/seedance-2.5-global-token/multimodal-video` : `${BASE}/bytedance/seedance-2.0-global/text-to-video`;
        const payload:any = { prompt, duration, resolution, aspect_ratio, generateAudio };
        if(image_urls?.length>0){
          payload.image_urls = image_urls.slice(0, is25?10:2);
        }
        const create = await fetch(endpoint, {
          method:'POST',
          headers:{'Content-Type':'application/json','Authorization':`Bearer ${apiKey}`},
          body: JSON.stringify(payload)
        });
        const cJson = await create.json().catch(()=>({}));
        if(!create.ok){
          lastErr = cJson.msg || cJson.message || `HTTP ${create.status}`;
          if(create.status===401 || create.status===403 || create.status===429) continue;
          throw new Error(lastErr);
        }
        const taskId = cJson.data?.taskId || cJson.taskId;
        if(!taskId) throw new Error('No taskId');
        for(let i=0;i<120;i++){
          await sleep(3000);
          const sRes = await fetch(`${BASE}/task/status?taskId=${taskId}`, {headers:{'Authorization':`Bearer ${apiKey}`}});
          const sJson = await sRes.json().catch(()=>({}));
          const status = sJson.data?.status || sJson.status;
          if(status==='SUCCESS' || status==='COMPLETED'){
            const url = sJson.data?.result?.videoUrl || sJson.data?.result?.url || sJson.data?.result?.[0]?.url || sJson.data?.output?.[0] || '';
            if(url) return NextResponse.json({video:{url}, taskId, usedKey: apiKey.slice(0,12)+'***'});
          }
          if(status==='FAILED' || status==='FAILURE'){ lastErr = sJson.data?.error || 'FAILED'; break; }
        }
      }catch(e:any){ lastErr = e.message; continue; }
    }
    return NextResponse.json({error:`Generate gagal di penyedia. Coba lagi. Key kamu ${keys[0]?.slice(0,8)}*** mungkin salah tipe. Error: ${lastErr}`}, {status:500});
  }catch(e:any){
    return NextResponse.json({error:e.message||'Internal error'}, {status:500});
  }
}
