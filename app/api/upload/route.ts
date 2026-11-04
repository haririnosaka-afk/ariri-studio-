import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(req: NextRequest){
  try{
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    if(!files || files.length===0) return NextResponse.json({ error:'No files' },{status:400});
    if(files.length>10) return NextResponse.json({ error:'Max 10 foto' },{status:400});
    
    const urls=[];
    for(const file of files){
      const blob = await put(`ariri/${Date.now()}-${file.name}`, file, { access: 'public' });
      urls.push({ url: blob.url, name: file.name });
    }
    return NextResponse.json({ urls });
  }catch(e:any){
    return NextResponse.json({ error:'Blob belum connect', detail:e.message, urls:[] },{status:500});
  }
}
