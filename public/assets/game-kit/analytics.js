import {createAnalytics} from './analytics-core.js';
import {localPath} from './site-path.js';
import {normalizeLanguage} from './locale.js';
let client=null,renderSettings=()=>{};
export const analytics={
 capture:(...args)=>client?.capture(...args)??false,allowed:()=>client?.allowed()??false,epoch:()=>client?.epoch()??-1,
 play(){client?.enableOnPlay();renderSettings();}
};
const strings={
 en:{on:'Analytics: on',off:'Analytics: off',toggle:'Turn analytics on or off',signal:'Your browser asks us not to track.'},
 'zh-HK':{on:'數據分析：已開',off:'數據分析：已關',toggle:'開啟或關閉數據分析',signal:'你嘅瀏覽器要求唔追蹤。'},
 'zh-TW':{on:'數據分析：已開',off:'數據分析：已關',toggle:'開啟或關閉數據分析',signal:'你的瀏覽器要求不追蹤。'}
};
function analyticsControls(model,privacySignal){
 const doc=document,settings=doc.createElement('button');settings.type='button';settings.className='analytics-settings';
 (doc.querySelector('footer nav')??doc.body).append(settings);
 function render(){
  const t=strings[normalizeLanguage(doc.documentElement.lang)]??strings.en,enabled=!privacySignal&&model.choice()!=='denied';
  settings.textContent=t[enabled?'on':'off'];settings.setAttribute('aria-pressed',String(enabled));settings.setAttribute('aria-label',settings.textContent+'. '+t.toggle);settings.dataset.enabled=String(enabled);settings.disabled=privacySignal;
  if(privacySignal)settings.title=t.signal;
 }
 settings.addEventListener('click',()=>{model.setConsent(model.choice()==='denied'?'allowed':'denied');render();});
 settings.addEventListener('keydown',event=>{if([' ','Enter','Escape'].includes(event.key))event.stopPropagation();});
 new MutationObserver(render).observe(doc.documentElement,{attributes:true,attributeFilter:['lang']});
 window.addEventListener('storage',event=>{if(event.key===model.storageKey+':consent'||event.key===null){model.syncConsent();render();}});
 render();return render;
}
async function initialize(){
 try{
  const response=await fetch(localPath('/site-config.json'));if(!response.ok)return;
  const config=(await response.json()).analytics;if(!config?.enabled)return;
  let storage,sessionStorage;try{storage=window.localStorage;}catch{}try{sessionStorage=window.sessionStorage;}catch{}
  const privacySignal=navigator.globalPrivacyControl===true||navigator.doNotTrack==='1'||window.doNotTrack==='1';
  client=createAnalytics({config,url:location.href,referrer:document.referrer,storage,sessionStorage,storageKey:'arcade:analytics:v1:'+localPath('/'),privacySignal});
  if(!client.available()&&!privacySignal)return;
  const stylesheet=document.createElement('link');stylesheet.rel='stylesheet';stylesheet.href=new URL('./analytics.css',import.meta.url).href;document.head.append(stylesheet);
  renderSettings=analyticsControls(client,privacySignal);
  client.pageView({language:document.documentElement.lang,device:matchMedia('(max-width:760px)').matches?'mobile':'desktop'});
 }catch{/* Optional analytics must never stop the game. */}
}
if(typeof window!=='undefined'&&typeof document!=='undefined')initialize();
