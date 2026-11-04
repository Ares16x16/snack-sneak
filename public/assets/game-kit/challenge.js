const languages=['en','zh-Hant'];
export function challengeDate(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const get=type=>parts.find(p=>p.type===type).value;return `${get('year')}-${get('month')}-${get('day')}`;
}
export function normalizeChallenge(value){
 if(typeof value!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(value))return null;
 const date=new Date(value+'T00:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value?value:null;
}
export function readChallenge(params,{gameId,now=new Date()}={}){
 const matching=!params.has('game')||params.get('game')===gameId;
 const linkedDate=matching?normalizeChallenge(params.get('challenge')):null;
 const runId=matching&&/^[a-f0-9]{16}$/.test(params.get('run')??'')?params.get('run'):null;
 const raw=params.get('target'),target=matching&&(linkedDate||runId)&&/^\d{1,5}$/.test(raw??'')?Number(raw):null;
 const date=linkedDate??challengeDate(now),mode=runId?'practice':'daily';
 return {date,linkedDate,runId,mode,target,language:languages.includes(params.get('lang'))?params.get('lang'):null,seed:mode==='practice'?'practice:'+runId:'daily:'+date};
}
export function challengeLink({origin,path='/',gameId,mode='daily',date=challengeDate(),runId,score=0,language='en'}){
 let base;try{base=new URL(origin);}catch{throw new Error('Invalid site origin');}
 if(!['http:','https:'].includes(base.protocol)||base.username||base.password)throw new Error('Invalid site origin');
 if(!/^\/(?!\/)/.test(path)||/[?#\\]/.test(path)||path.split('/').includes('..'))throw new Error('Invalid game path');
 if(!/^[a-z0-9][a-z0-9-]{1,47}$/.test(gameId??''))throw new Error('Invalid game id');
 const url=new URL(path,base.origin);url.searchParams.set('game',gameId);
 if(mode==='practice'){
  if(!/^[a-f0-9]{16}$/.test(runId??''))throw new Error('Invalid practice seed');
  url.searchParams.set('run',runId);
 }else{const valid=normalizeChallenge(date);if(!valid)throw new Error('Invalid daily date');url.searchParams.set('challenge',valid);}
 url.searchParams.set('target',String(Number.isInteger(score)&&score>=0?Math.min(score,99999):0));
 url.searchParams.set('lang',languages.includes(language)?language:'en');return url.href;
}
export function isPublicURL(value){
 try{
  const u=new URL(value),host=u.hostname.toLowerCase().replace(/^\[|\]$/g,'');
  if(u.protocol!=='https:'||u.username||u.password)return false;
  if(host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')||!host.includes('.')&&!host.includes(':'))return false;
  if(/^(0|10|127)\./.test(host)||/^169\.254\./.test(host)||/^192\.168\./.test(host))return false;
  const parts=host.split('.').map(Number);if(parts[0]===172&&parts[1]>=16&&parts[1]<=31)return false;
  if(host==='::'||host==='::1'||/^(fc|fd|fe[89ab]|::ffff:)/.test(host))return false;
  return true;
 }catch{return false;}
}
