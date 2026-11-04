// Local preview support for the path/glob rules used by this project's _headers.
export function headersForPath(source,pathname){
 const headers={};let matches=false;
 for(const raw of source.split(/\r?\n/)){
  if(!raw.trim()||raw.trimStart().startsWith('#'))continue;
  if(!/^\s/.test(raw)){
   const pattern=raw.trim().split('*').map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('.*');
   matches=new RegExp('^'+pattern+'$').test(pathname);continue;
  }
  if(!matches)continue;const colon=raw.indexOf(':');
  if(colon>0)headers[raw.slice(0,colon).trim()]=raw.slice(colon+1).trim();
 }
 return headers;
}
