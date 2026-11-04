import {createAnalytics} from './analytics-core.js';
import {localPath} from './site-path.js';
let client=null;
export const analytics={capture:(...args)=>client?.capture(...args)??false,allowed:()=>client?.allowed()??false,epoch:()=>client?.epoch()??-1};
const strings={
 en:{heading:'Help improve the game?',description:'Share visits, playtime and scores with PostHog. Your choice.',allow:'Allow',deny:'No thanks',privacy:'Privacy',on:'Analytics: on',off:'Analytics: off',signal:'Your browser asks us not to track. Analytics is off.',close:'Close'},
 'zh-Hant':{heading:'幫手改善遊戲？',description:'同意透過 PostHog 分享瀏覽、遊玩時間同分數，由你決定。',allow:'同意',deny:'唔使喇',privacy:'私隱',on:'數據分析：已開',off:'數據分析：已關',signal:'你嘅瀏覽器要求唔追蹤，數據分析已關閉。',close:'關閉'}
};
function consentControls(model,privacySignal){
 const doc=document,make=(tag,className)=>{const node=doc.createElement(tag);node.className=className;return node;};
 const panel=make('aside','analytics-consent'),heading=make('h2','analytics-heading'),description=make('p','analytics-description'),actions=make('div','analytics-actions');
 panel.setAttribute('aria-labelledby','analytics-heading');heading.id='analytics-heading';
 const allow=make('button','analytics-choice'),deny=make('button','analytics-choice'),privacy=make('a','analytics-policy'),settings=make('button','analytics-settings');
 for(const button of [allow,deny,settings])button.type='button';
 settings.setAttribute('aria-controls','analytics-consent');panel.id='analytics-consent';privacy.href=localPath('/privacy.html');
 actions.append(allow,deny,privacy);panel.append(heading,description,actions);
 const main=doc.querySelector('main');if(main)main.before(panel);else doc.body.append(panel);
 (doc.querySelector('footer nav')??doc.body).append(settings);
 function render(){
  const t=strings[doc.documentElement.lang]??strings.en;
  heading.textContent=t.heading;description.textContent=privacySignal?t.signal:t.description;allow.textContent=t.allow;deny.textContent=t.deny;privacy.textContent=t.privacy;
  allow.disabled=privacySignal;deny.textContent=privacySignal?t.close:t.deny;settings.textContent=t[model.allowed()?'on':'off'];settings.setAttribute('aria-expanded',String(!panel.hidden));
 }
 function hide(){panel.hidden=true;render();const target=doc.querySelector('#start-run, #start-button, #kit-start')??settings;target.focus({preventScroll:true});}
 allow.addEventListener('click',()=>{model.setConsent('allowed');hide();});
 deny.addEventListener('click',()=>{if(!privacySignal)model.setConsent('denied');hide();});
 settings.addEventListener('click',()=>{panel.hidden=!panel.hidden;render();if(!panel.hidden){heading.tabIndex=-1;heading.focus();}});
 for(const node of [panel,settings])node.addEventListener('keydown',event=>{
  if([' ','Enter','Escape'].includes(event.key))event.stopPropagation();
  if(event.key==='Escape'){event.preventDefault();panel.hidden=true;render();settings.focus();}
 });
 new MutationObserver(render).observe(doc.documentElement,{attributes:true,attributeFilter:['lang']});
 window.addEventListener('storage',event=>{if(event.key===model.storageKey+':consent'||event.key===null){model.syncConsent();panel.hidden=true;render();}});
 panel.hidden=model.choice()!=='unknown';render();
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
  consentControls(client,privacySignal);client.pageView({language:document.documentElement.lang,device:matchMedia('(max-width:760px)').matches?'mobile':'desktop'});
 }catch{/* Analytics is optional; blocked configuration or transport must not stop play. */}
}
if(typeof window!=='undefined'&&typeof document!=='undefined')initialize();
