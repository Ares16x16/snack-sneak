import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createAnalytics} from '../public/assets/game-kit/analytics-core.js';
async function consentFixture({privacySignal=false}={}){
 const nodes=[],sent=[],store=new Map(),observers=[],listeners={};let focused=null;
 class Element{
  constructor(tag){this.tag=tag;this.children=[];this.handlers={};this.attributes={};this.hidden=false;nodes.push(this);}
  append(...nodes){this.children.push(...nodes);}before(node){this.beforeNode=node;}
  setAttribute(name,value){this.attributes[name]=value;}
  addEventListener(type,fn){this.handlers[type]=fn;}
  focus(){focused=this;}click(){if(!this.disabled)this.handlers.click?.();}
 }
 const body=new Element('body'),head=new Element('head'),main=new Element('main'),footerNav=new Element('nav'),start=new Element('button');
 const document={body,head,documentElement:{lang:'en'},referrer:'https://www.threads.com/',createElement:tag=>new Element(tag),querySelector:selector=>selector==='main'?main:selector==='footer nav'?footerNav:start};
 const storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
 const dependencies={document,window:{localStorage:storage,sessionStorage:storage,addEventListener:(type,fn)=>{listeners[type]=fn;}},navigator:{globalPrivacyControl:privacySignal},location:{href:'https://arcade.example/?secret=hidden'},fetch:async()=>({ok:true,json:async()=>({analytics:{enabled:true,region:'us',projectToken:'phc_syntheticpublicproject1234567890'}})}),matchMedia:()=>({matches:false}),MutationObserver:class{constructor(fn){observers.push(fn);}observe(){}},createAnalytics:options=>createAnalytics({...options,send:(_url,options)=>{sent.push(JSON.parse(options.body));return Promise.resolve();},randomId:()=> 'unit-visitor'}),localPath:path=>path};
 const source=(await readFile(new URL('../public/assets/game-kit/analytics.js',import.meta.url),'utf8')).replace(/^import[^\n]+\n/gm,'').replace('export const analytics','const analytics').replaceAll('import.meta.url',JSON.stringify('https://arcade.example/assets/game-kit/analytics.js')).replace(/^if\(typeof window[^\n]+$/m,'await initialize();');
 const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;await new AsyncFunction(...Object.keys(dependencies),source)(...Object.values(dependencies));
 const find=className=>nodes.find(n=>n.className===className);
 return {document,nodes,sent,store,find,observers,listeners,focused:()=>focused,start};
}
test('consent control waits for a choice, offers withdrawal and follows the page language',async()=>{
 const f=await consentFixture();assert.equal(f.sent.length,0);
 const panel=f.find('analytics-consent'),settings=f.find('analytics-settings'),buttons=f.nodes.filter(n=>n.className==='analytics-choice');
 assert.equal(panel.hidden,false);assert.equal(buttons[0].textContent,'Allow');assert.equal(buttons[1].textContent,'No thanks');
 buttons[0].click();assert.equal(f.sent.length,1);assert.equal(f.sent[0].event,'$pageview');assert.equal(panel.hidden,true);assert.equal(f.focused(),f.start);
 settings.click();assert.equal(panel.hidden,false);buttons[1].click();assert.equal(f.sent.length,1);assert.equal(settings.textContent,'Analytics: off');assert.ok([...f.store.keys()].every(k=>!k.endsWith(':visitor')&&!k.endsWith(':session')));
 f.document.documentElement.lang='zh-Hant';for(const update of f.observers)update();assert.equal(settings.textContent,'數據分析：已關');assert.equal(buttons[0].textContent,'同意');
 let stopped=false,prevented=false;panel.handlers.keydown({key:' ',stopPropagation(){stopped=true;},preventDefault(){prevented=true;}});assert.equal(stopped,true);assert.equal(prevented,false);
});
test('browser privacy signals disable consent and send no pageviews',async()=>{
 const f=await consentFixture({privacySignal:true});assert.equal(f.sent.length,0);assert.equal(f.find('analytics-consent').hidden,true);
 f.find('analytics-settings').click();const allow=f.nodes.find(n=>n.className==='analytics-choice');assert.equal(allow.disabled,true);allow.click();assert.equal(f.sent.length,0);assert.equal(f.find('analytics-settings').textContent,'Analytics: off');
});
