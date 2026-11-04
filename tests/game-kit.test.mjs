import test from 'node:test';
import assert from 'node:assert/strict';
import {challengeDate,normalizeChallenge,challengeLink,readChallenge,isPublicURL} from '../public/assets/game-kit/challenge.js';
import {shareLinks,shareMessage} from '../public/assets/game-kit/share-model.js';
import {validateGameConfig} from '../public/assets/game-kit/config.js';

test('shared challenges retain the game, seed, target and language without extra query data',()=>{
 const url=challengeLink({origin:'https://example.com',gameId:'v2',mode:'practice',runId:'0123456789abcdef',score:812,language:'zh-Hant'});
 const parsed=new URL(url);assert.equal(parsed.origin,'https://example.com');
 assert.deepEqual([...parsed.searchParams], [['game','v2'],['run','0123456789abcdef'],['target','812'],['lang','zh-Hant']]);
 const read=readChallenge(parsed.searchParams,{gameId:'v2',now:new Date('2026-10-31T00:00:00Z')});
 assert.equal(read.mode,'practice');assert.equal(read.runId,'0123456789abcdef');assert.equal(read.target,812);
});
test('daily dates keep the Hong Kong midnight boundary',()=>{
 assert.equal(challengeDate(new Date('2026-10-30T15:59:59Z')),'2026-10-30');
 assert.equal(challengeDate(new Date('2026-10-30T16:00:00Z')),'2026-10-31');
 assert.equal(normalizeChallenge('2026-02-30'),null);
});
test('foreign-game links and malformed input cannot set a challenge target',()=>{
 for(const query of ['game=other&target=999','game=v2&target=<script>','game=v2&target=-1','game=v2&target=100000']){
  assert.equal(readChallenge(new URLSearchParams(query),{gameId:'v2'}).target,null);
 }
 assert.throws(()=>challengeLink({origin:'javascript:alert(1)',gameId:'v2'}),/origin/i);
 assert.throws(()=>challengeLink({origin:'https://example.com',path:'//evil.example',gameId:'v2'}),/path/i);
});
test('localhost and private links cannot be presented as publicly playable challenges',()=>{
 for(const value of ['http://localhost:4173/','https://127.0.0.1/','https://10.0.0.3/','https://192.168.1.2/','https://172.16.0.2/','https://[::1]/','javascript:alert(1)','https://u:p@example.com/'])assert.equal(isPublicURL(value),false,value);
 assert.equal(isPublicURL('https://snack-sneak.example.workers.dev/?target=10'),true);
});
test('platform draft URLs safely encode Chinese, ampersands and new lines',()=>{
 const message='偷食 8 份 & 100 分\n你得唔得？',url='https://example.com/?game=v2&target=100';
 const links=shareLinks({message,url});
 const threads=new URL(links.threads),x=new URL(links.x),wa=new URL(links.whatsapp);
 assert.equal(threads.origin,'https://www.threads.com');assert.equal(threads.pathname,'/intent/post');
 assert.equal(threads.searchParams.get('text'),message);assert.equal(threads.searchParams.get('url'),url);
 assert.equal(x.origin,'https://twitter.com');assert.equal(x.searchParams.get('url'),url);
 assert.equal(wa.origin,'https://wa.me');assert.equal(wa.searchParams.get('text'),message+'\n'+url);
});
test('unpublished links have no live social draft destinations',()=>{
 assert.deepEqual(shareLinks({message:'Try it',url:'http://127.0.0.1:4173/'}),{threads:null,x:null,whatsapp:null});
});
test('long X copy is bounded without cutting Unicode surrogate pairs',()=>{
 const result=new URL(shareLinks({message:'茶🍜'.repeat(200),url:'https://example.com/'}).x).searchParams.get('text');
 assert.ok(Array.from(result).length<=120);assert.ok(!result.includes('\ufffd'));
});
test('game configuration rejects unsafe identities and CSS values',()=>{
 const valid={id:'new-game',name:'New Game',palette:{paper:'#faf6e9',ink:'#173e37',accent:'#c63826',secondary:'#2f6d5c'}};
 assert.equal(validateGameConfig(valid).id,'new-game');
 assert.throws(()=>validateGameConfig({...valid,id:'../escape'}),/id/i);
 assert.throws(()=>validateGameConfig({...valid,palette:{...valid.palette,ink:'red; background:url(x)'}}),/color|palette/i);
});
test('share wording comes from the game configuration',()=>{
 assert.equal(shareMessage({name:'Noodle Rush',share:{en:'I scored {score} in {name}!'}},{score:420},'en'),'I scored 420 in Noodle Rush!');
});
test('game duration and challenge identity cannot silently break the reusable flow',()=>{
 for(const roundSeconds of [0,-1,1000,'ten'])assert.throws(()=>validateGameConfig({id:'new-game',name:'New Game',roundSeconds}),/duration|round/i);
 assert.throws(()=>validateGameConfig({id:'new-game',name:'New Game',challengeId:'../other'}),/challenge/i);
});
