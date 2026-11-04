import test from 'node:test';
import assert from 'node:assert/strict';
import {createAnalytics,validateAnalytics} from '../public/assets/game-kit/analytics-core.js';
import {createRoundTracker} from '../public/assets/game-kit/analytics-round.js';
const config={enabled:true,projectToken:'phc_syntheticpublicproject1234567890',region:'us'};
function fixture(overrides={}){
 const data=new Map(),sent=[];let time=0,id=0;
 const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 const client=createAnalytics({config,url:'https://arcade.example/snack-sneak/?email=private@example.com&utm_source=threads#secret',referrer:'https://private.example/path?secret=x',storage,send:(url,options)=>{sent.push({url,...options,body:JSON.parse(options.body)});return Promise.resolve();},randomId:()=>`random-${++id}`,now:()=>time,...overrides});
 return {client,data,sent,setTime:n=>{time=n;}};
}
test('analytics sends nothing before consent, when disabled, on local preview or with privacy signals',()=>{
 for(const options of [{},{config:{enabled:false}},{url:'http://localhost:4173/'},{privacySignal:true}]){
  const f=fixture(options);f.client.capture('game_start',{game_id:'snack-sneak'});assert.equal(f.sent.length,0);
  if(Object.keys(options).length){f.client.setConsent('allowed');f.client.capture('game_start',{game_id:'snack-sneak'});assert.equal(f.sent.length,0);}
 }
});
test('explicit consent sends an anonymous sanitized pageview and allowlisted game events',()=>{
 const f=fixture();f.client.setConsent('allowed');f.client.capture('game_end',{game_id:'snack-sneak',score:250,reason:'caught',active_seconds:12,email:'private@example.com',seed:'private',channel:'bad'});
 assert.equal(f.sent.length,2);const page=f.sent[0].body,event=f.sent[1].body;
 assert.equal(page.event,'$pageview');assert.equal(page.properties.$current_url,'https://arcade.example/snack-sneak/');assert.equal(page.properties.traffic_source,'threads');
 assert.equal(event.api_key,config.projectToken);assert.equal(event.properties.$process_person_profile,false);assert.equal(event.properties.$geoip_disable,true);assert.equal(event.properties.score,250);
 assert.equal(event.properties.email,undefined);assert.equal(event.properties.seed,undefined);assert.equal(event.properties.channel,undefined);assert.equal(f.sent[0].credentials,'omit');assert.equal(f.sent[0].referrerPolicy,'no-referrer');
 assert.ok(!JSON.stringify(f.sent).includes('private@example.com'));assert.equal(f.client.capture('arbitrary_event',{score:1}),false);
});
test('withdrawal clears identity, stops sends and does not replay past events after consent',()=>{
 const f=fixture();f.client.setConsent('allowed');const before=f.sent[0].body.distinct_id;
 f.client.setConsent('denied');assert.ok([...f.data.keys()].every(k=>!k.endsWith(':visitor')));
 f.client.capture('game_end',{score:1});assert.equal(f.sent.length,1);
 f.client.setConsent('allowed');assert.equal(f.sent.length,2);assert.notEqual(f.sent[1].body.distinct_id,before);
});
test('storage denial and rejected transport never break gameplay',async()=>{
 const broken={getItem(){throw Error('denied');},setItem(){throw Error('denied');},removeItem(){throw Error('denied');}};
 const f=fixture({storage:broken,send(){return Promise.reject(Error('blocked'));}});
 assert.doesNotThrow(()=>f.client.setConsent('allowed'));assert.doesNotThrow(()=>f.client.capture('game_end',{score:2}));assert.doesNotThrow(()=>f.client.setConsent('denied'));await new Promise(resolve=>setTimeout(resolve,0));
});
test('configuration rejects private keys and arbitrary capture destinations',()=>{
 assert.equal(validateAnalytics(undefined).enabled,false);
 for(const value of [{...config,projectToken:'phx_private'},{...config,region:'https://attacker.example'},{enabled:true,region:'us',projectToken:''}])assert.throws(()=>validateAnalytics(value));
});
test('round timing excludes pauses, emits progress, ends once and labels replay',()=>{
 const f=fixture();f.client.setConsent('allowed');let clock=0;
 const round=createRoundTracker(f.client,{now:()=>clock,randomId:()=> 'round-1'});
 round.start({game_id:'snack-sneak',mode:'daily',language:'en'});clock=10000;round.progress({score:10});round.pause();clock=90000;round.resume();clock=95000;round.finish({score:50,reason:'time'});round.finish({score:50});
 const events=f.sent.map(x=>x.body);assert.equal(events.filter(x=>x.event==='game_end').length,1);assert.equal(events.find(x=>x.event==='game_end').properties.active_seconds,15);assert.equal(events.filter(x=>x.event==='game_progress').length,1);
 round.start({game_id:'snack-sneak'});assert.equal(f.sent.at(-2).body.event,'game_replay');assert.equal(f.sent.at(-1).body.event,'game_start');
});
test('rounds started before consent or spanning revocation never report retroactive scores',()=>{
 const f=fixture();let time=0;const round=createRoundTracker(f.client,{now:()=>time});
 round.start({game_id:'snack-sneak'});f.client.setConsent('allowed');time=10000;round.finish({score:999});assert.equal(f.sent.length,1);
 round.start({game_id:'snack-sneak'});f.client.setConsent('denied');f.client.setConsent('allowed');round.finish({score:888});assert.ok(!f.sent.some(x=>x.body.event==='game_end'));
});
test('restarting an active round reports abandonment, never completion',()=>{
 const f=fixture();f.client.setConsent('allowed');let time=0;const round=createRoundTracker(f.client,{now:()=>time});
 round.start({game_id:'tray-chaos'});time=5000;round.start({game_id:'tray-chaos'});
 const abandoned=f.sent.find(x=>x.body.event==='game_abandon').body;assert.equal(abandoned.properties.reason,'restart');assert.equal(abandoned.properties.active_seconds,5);
 assert.equal(f.sent.filter(x=>x.body.event==='game_end').length,0);
});
test('a first consenting round is not labelled as a replay of an untracked round',()=>{
 const f=fixture();const round=createRoundTracker(f.client);round.start({game_id:'snack-sneak'});round.finish({score:1});f.client.setConsent('allowed');round.start({game_id:'snack-sneak'});
 assert.equal(f.sent.filter(x=>x.body.event==='game_replay').length,0);
});
