import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as engine from '../public/assets/v2/engine.js';
import * as challenge from '../public/assets/game-kit/challenge.js';
import * as configuration from '../public/assets/game-kit/config.js';
import * as storage from '../public/assets/storage.js';
import {text} from '../public/assets/v2/i18n.js';
import {createRoundTracker} from '../public/assets/game-kit/analytics-round.js';

// Unit fixture for the real entrypoint's registered handlers. No browser or network.
async function snackEntrypoint(){
 let clock=0,frame;const events=[],nodes=new Map();
 class Element{
  constructor(){this.dataset={};this.handlers={};this.classList={add(){},remove(){},toggle(){}};this.style={};this.textContent='';this.id='';}
  addEventListener(type,handler){(this.handlers[type]??=[]).push(handler);}
  setAttribute(){}focus(){}scrollIntoView(){}getContext(){return {};}
  querySelector(selector){return node(selector);}
  click(){for(const fn of this.handlers.click??[])fn({target:this});}
 }
 function node(id){if(!nodes.has(id)){const element=new Element();element.id=id;nodes.set(id,element);}return nodes.get(id);}
 const document={getElementById:node,querySelectorAll:()=>[],documentElement:{lang:'en'},body:{dataset:{}},addEventListener(){}};
 const analytics={allowed:()=>true,epoch:()=>1,capture:(event,properties)=>events.push({event,properties})};
 const gameConfig=JSON.parse(await readFile(new URL('../public/game-config.json',import.meta.url)));
 const dependencies={...engine,...challenge,...configuration,...storage,text,document,navigator:{language:'en'},location:{origin:'https://arcade.example',search:''},localStorage:null,performance:{now:()=>clock},matchMedia:()=>({matches:false}),window:{addEventListener(){}},HTMLButtonElement:Element,HTMLInputElement:class{},requestAnimationFrame:fn=>{frame=fn;},analytics,createRoundTracker:client=>createRoundTracker(client,{now:()=>clock,randomId:()=> 'unit-round'}),localPath:path=>path,drawScene(){},drawReview(){},drawResultScene(){},foodArtReady:Promise.resolve(),createAudio:()=>({setEnabled(){},unlock(){},play(){}}),loadGameConfig:async()=>gameConfig,shareMessage:()=>'',createSharePanel:()=>({reset(){},setResult:async()=>{}})};
 const source=(await readFile(new URL('../public/assets/v2/main.js',import.meta.url),'utf8')).replace(/^import[^\n]+\n/gm,'');
 const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
 await new AsyncFunction(...Object.keys(dependencies),source)(...Object.values(dependencies));
 return {events,click:id=>node(id).click(),advance(milliseconds){for(let i=0;i<milliseconds;i+=100){clock+=Math.min(100,milliseconds-i);frame(clock);}}};
}
test('mode previews emit no start, abandonment or replay; playing reports a single completed round',async()=>{
 const app=await snackEntrypoint();app.click('practice-mode');app.advance(5000);app.click('daily-mode');app.advance(5000);
 assert.deepEqual(app.events,[],'selecting a mode is an idle preview, not a played round');
 app.click('start-run');app.advance(10000);app.click('pause-run');app.advance(20000);app.click('resume-run');app.advance(22000);
 assert.equal(app.events.filter(e=>e.event==='game_start').length,1);
 const finished=app.events.filter(e=>e.event==='game_end');assert.equal(finished.length,1);assert.equal(finished[0].properties.reason,'time');assert.ok(finished[0].properties.active_seconds>=30&&finished[0].properties.active_seconds<31);
 assert.equal(app.events.filter(e=>e.event==='game_abandon'||e.event==='game_replay').length,0);
 app.click('again-run');assert.equal(app.events.filter(e=>e.event==='game_replay').length,1);
});
