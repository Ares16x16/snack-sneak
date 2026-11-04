import {isPublicURL} from './challenge.js';
const hosts={us:'https://us.i.posthog.com',eu:'https://eu.i.posthog.com'};
const events=new Set(['$pageview','game_start','game_end','game_abandon','game_pause','game_resume','game_progress','game_replay','share_click']);
const enums={mode:['daily','practice'],language:['en','zh-HK','zh-TW','zh-Hant'],reason:['time','completed','caught','spilled','restart','mode_change','page_leave'],channel:['threads','x','whatsapp','instagram','native','copy_link','save_post','save_story'],device:['mobile','desktop']};
const numbers=new Set(['score','active_seconds','round_seconds','bites','snacks','strikes','near_misses','saved','best_combo']);
export function validateAnalytics(value={}){
 const config={enabled:false,projectToken:'',region:'us',...value};
 if(typeof config.enabled!=='boolean'||!Object.hasOwn(hosts,config.region))throw new Error('Analytics needs enabled true/false and region us or eu.');
 if(typeof config.projectToken!=='string'||config.projectToken&&!/^phc_[A-Za-z0-9_-]{16,200}$/.test(config.projectToken)||config.enabled&&!config.projectToken)throw new Error('Analytics needs a public PostHog project token (phc_), never a personal API key.');
 return {...config,host:hosts[config.region]};
}
function sourceFor(url,referrer){
 const known=['threads','x','twitter','whatsapp','instagram','facebook','google'];
 const utm=url.searchParams.get('utm_source')?.toLowerCase();if(known.includes(utm))return utm==='twitter'?'x':utm;
 if(!referrer)return 'direct';
 try{const host=new URL(referrer).hostname;if(host===url.hostname)return 'internal';for(const name of known)if(host===name+'.com'||host.endsWith('.'+name+'.com'))return name==='twitter'?'x':name;}catch{}
 return 'other';
}
export function createAnalytics({config,url,referrer='',storage,sessionStorage,storageKey='arcade:analytics:v1',privacySignal=false,send=(url,options)=>fetch(url,options),randomId=()=>crypto.randomUUID(),now=()=>Date.now()}={}){
 const settings=validateAnalytics(config);let page;try{page=new URL(url);}catch{page=null;}
 const available=settings.enabled&&page&&isPublicURL(page.href)&&!privacySignal;
 const get=(store,key)=>{try{return store?.getItem(key)??null;}catch{return null;}};
 const put=(store,key,value)=>{try{store?.setItem(key,value);}catch{}};
 const remove=(store,key)=>{try{store?.removeItem(key);}catch{}};
 let choice=privacySignal?'denied':get(storage,storageKey+':consent');if(!['allowed','denied'].includes(choice))choice='unknown';
 let visitor=null,session=null,generation=0,count=0;const pending=new Set();
 const allowed=()=>Boolean(available&&choice==='allowed');
 function identity(){
  if(visitor)return;
  let saved;try{saved=JSON.parse(get(storage,storageKey+':visitor'));}catch{}
  const stamp=now();visitor=saved&&/^[A-Za-z0-9-]{6,80}$/.test(saved.id)&&Number.isFinite(saved.expires)&&saved.expires>stamp&&saved.expires<=stamp+90*86400000?saved.id:randomId();
  put(storage,storageKey+':visitor',JSON.stringify({id:visitor,expires:saved?.id===visitor?saved.expires:stamp+90*86400000}));
  const storedSession=get(sessionStorage,storageKey+':session');session=/^[A-Za-z0-9-]{6,80}$/.test(storedSession??'')?storedSession:randomId();put(sessionStorage,storageKey+':session',session);
 }
 function capture(event,properties={}){
  if(!allowed()||!events.has(event)||count>=1000)return false;
  try{
   identity();const clean={$process_person_profile:false,$geoip_disable:true,$session_id:session,$lib:'arcade-events',schema_version:1};
   for(const [key,value] of Object.entries(properties)){
    if(numbers.has(key)&&Number.isFinite(value)&&value>=0)clean[key]=Math.round(Math.min(value,key==='active_seconds'?7200:99999)*100)/100;
    else if(enums[key]?.includes(value))clean[key]=value;
    else if((key==='game_id'&&/^[a-z0-9][a-z0-9-]{1,47}$/.test(value))||(key==='run_id'&&/^[A-Za-z0-9-]{6,80}$/.test(value)))clean[key]=value;
   }
   if(event==='$pageview')Object.assign(clean,{$current_url:page.origin+page.pathname,$pathname:page.pathname,$host:page.host,traffic_source:sourceFor(page,referrer)});
   const controller=new AbortController();pending.add(controller);count++;
   const body=JSON.stringify({api_key:settings.projectToken,event,distinct_id:visitor,properties:clean,timestamp:new Date(now()).toISOString()});
   Promise.resolve(send(settings.host+'/i/v0/e/',{method:'POST',headers:{'Content-Type':'application/json'},body,credentials:'omit',referrerPolicy:'no-referrer',keepalive:true,signal:controller.signal})).catch(()=>{}).finally(()=>pending.delete(controller));
   return true;
  }catch{return false;}
 }
 function clearIdentity(){visitor=null;session=null;remove(storage,storageKey+':visitor');remove(sessionStorage,storageKey+':session');for(const controller of pending)controller.abort();pending.clear();}
 function setConsent(value,{persist=true}={}){
  if(!['allowed','denied'].includes(value))return;
  if(privacySignal)value='denied';const changed=choice!==value;choice=value;
  if(persist)put(storage,storageKey+':consent',choice);
  if(changed)generation++;
  if(!allowed())clearIdentity();else if(changed)capture('$pageview');
 }
 if(!allowed())clearIdentity();
 return {capture,allowed,available:()=>Boolean(available),choice:()=>choice,epoch:()=>generation,setConsent,storageKey,pageView:properties=>capture('$pageview',properties),enableOnPlay(){if(choice==='unknown'&&available)setConsent('allowed');},syncConsent(){const saved=get(storage,storageKey+':consent');setConsent(saved==='allowed'?'allowed':'denied',{persist:false});}};
}
