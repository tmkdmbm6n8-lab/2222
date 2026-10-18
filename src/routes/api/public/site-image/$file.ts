import { createFileRoute } from '@tanstack/react-router';
// Public read of site photos chosen by the administrator (bucket is private; only validated file names are served).
export const Route=createFileRoute('/api/public/site-image/$file')({server:{handlers:{GET:async({params,request})=>{
 if(!/^[0-9a-f-]{36}\.(jpeg|png|webp|mp4|webm|mov)$/.test(params.file))return new Response('Not found',{status:404});
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 const {data,error}=await supabaseAdmin.storage.from('site-images').download(params.file);
 if(error||!data)return new Response('Not found',{status:404});
 const ext=params.file.split('.')[1];
 const contentType=ext==='mov'?'video/quicktime':ext==='mp4'||ext==='webm'?`video/${ext}`:`image/${ext}`;
 const headers={'Content-Type':contentType,'Cache-Control':'public, max-age=31536000, immutable','Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff','Content-Length':String(data.size)};
 const range=request.headers.get('range');
 if(range){
  const match=/^bytes=(\d*)-(\d*)$/.exec(range);
  if(!match)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${data.size}`}});
  const start=match[1]?Number(match[1]):Math.max(0,data.size-Number(match[2]));
  const end=match[1]&&match[2]?Math.min(Number(match[2]),data.size-1):data.size-1;
  if(!Number.isSafeInteger(start)||start<0||start> end)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${data.size}`}});
  return new Response(data.slice(start,end+1),{status:206,headers:{...headers,'Content-Length':String(end-start+1),'Content-Range':`bytes ${start}-${end}/${data.size}`}});
 }
 return new Response(data,{headers});
}}}});
