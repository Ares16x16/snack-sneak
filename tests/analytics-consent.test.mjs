import {createRoundTracker} from '../public/assets/game-kit/analytics-round.js';
import {normalizeLanguage} from '../public/assets/game-kit/locale.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createAnalytics} from '../public/assets/game-kit/analytics-core.js';
async function consentFixture({privacySignal=false,deferConfig=false}={}){
 const nodes=[],sent=[],store=new Map(),observers=[],listeners={};let focused=null,release;const gate=new Promise(resolve=>{release=resolve;});
 class Element{
  constructor(tag){this.tag=tag;this.children=[];this.handlers={};this.attributes={};this.hidden=false;this.dataset={};nodes.push(this);}
  after(node){this.afterNode=node;}
  append(...nodes){this.children.push(...nodes);}before(node){this.beforeNode=node;}
  setAttribute(name,value){this.attributes[name]=value;}
  addEventListener(type,fn){this.handlers[type]=fn;}
  focus(){focused=this;}click(){if(!this.disabled)this.handlers.click?.();}
 }
 const body=new Element('body'),head=new Element('head'),main=new Element('main'),footerNav=new Element('nav'),start=new Element('button');
 const document={body,head,documentElement:{lang:'en'},referrer:'https://www.threads.com/',createElement:tag=>new Element(tag),querySelector:selector=>selector==='main'?main:selector==='footer nav'?footerNav:start};
 const storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
 const dependencies={normalizeLanguage,document,window:{localStorage:storage,sessionStorage:storage,addEventListener:(type,fn)=>{listeners[type]=fn;}},navigator:{globalPrivacyControl:privacySignal},location:{href:'https://arcade.example/?secret=hidden'},fetch:async()=>{if(deferConfig)await gate;return {ok:true,json:async()=>({analytics:{enabled:true,region:'us',projectToken:'phc_syntheticpublicproject1234567890'}})};},matchMedia:()=>({matches:false}),MutationObserver:class{constructor(fn){observers.push(fn);}observe(){}},createAnalytics:options=>createAnalytics({...options,send:(_url,options)=>{sent.push(JSON.parse(options.body));return Promise.resolve();},randomId:()=> 'unit-visitor'}),localPath:path=>path};
 const source=(await readFile(new URL('../public/assets/game-kit/analytics.js',import.meta.url),'utf8')).replace(/^import[^\n]+\n/gm,'').replace('export const analytics','const analytics').replaceAll('import.meta.url',JSON.stringify('https://arcade.example/assets/game-kit/analytics.js')).replace(/^if\(typeof window[^\n]+$/m,deferConfig?'return {analytics,ready:initialize()};':'await initialize();return {analytics};');
 const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;const handle=await new AsyncFunction(...Object.keys(dependencies),source)(...Object.values(dependencies));
 const find=className=>nodes.find(n=>n.className===className);
 return {analytics:handle.analytics,releaseConfig:async()=>{release();await handle.ready;},document,nodes,sent,store,find,observers,listeners,focused:()=>focused,start};
}
test('no agreement panel; first Play starts analytics, footer toggle stops it and follows HK/TW',async()=>{
 const f=await consentFixture();assert.equal(f.sent.length,0);assert.equal(f.find('analytics-consent'),undefined);
 const settings=f.find('analytics-settings');assert.equal(settings.textContent,'Analytics: on');
 f.analytics.play();assert.equal(f.sent.length,1);assert.equal(f.sent[0].event,'$pageview');
 settings.click();assert.equal(settings.textContent,'Analytics: off');assert.ok([...f.store.keys()].every(k=>!k.endsWith(':visitor')&&!k.endsWith(':session')));
 f.analytics.play();assert.equal(f.sent.length,1,'Play must not override an explicit opt-out');
 settings.click();assert.equal(f.sent.length,2);f.document.documentElement.lang='zh-HK';for(const update of f.observers)update();assert.equal(settings.textContent,'數據分析：已開');
 let stopped=false;settings.handlers.keydown({key:' ',stopPropagation(){stopped=true;}});assert.equal(stopped,true);
});
test('browser privacy signals keep analytics off even when Play is pressed',async()=>{
 const f=await consentFixture({privacySignal:true});f.analytics.play();assert.equal(f.sent.length,0);const settings=f.find('analytics-settings');assert.equal(settings.disabled,true);assert.equal(settings.textContent,'Analytics: off');
});

test('a Play before configuration is ready never enables tracking retroactively',async()=>{
 const f=await consentFixture({deferConfig:true});const round=createRoundTracker(f.analytics);
 f.analytics.play();round.start({game_id:'snack-sneak'});await f.releaseConfig();round.finish({score:99});assert.equal(f.sent.length,0);
 f.analytics.play();round.start({game_id:'snack-sneak'});round.finish({score:10});assert.deepEqual(f.sent.map(e=>e.event),['$pageview','game_start','game_end']);
});
