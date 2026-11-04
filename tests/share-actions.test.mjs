import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeShare,copyText} from '../public/assets/game-kit/share-actions.js';
test('unsupported native file sharing leaves save and copy as the fallback',async()=>{
 let invoked=false;
 const result=await nativeShare({share:()=>{invoked=true;},canShare:()=>false},{file:new File(['png'],'story.png',{type:'image/png'})});
 assert.equal(result,'unsupported');assert.equal(invoked,false);
});
test('native image sharing is invoked once with the prepared file',async()=>{
 const file=new File(['png'],'story.png',{type:'image/png'});let payload;
 assert.equal(await nativeShare({canShare:()=>true,share:data=>{payload=data;return Promise.resolve();}},{file,title:'New Game',text:'Try it',url:'https://example.com/'}),'handed-off');
 assert.deepEqual(payload.files,[file]);
 assert.ok(payload.text.includes('https://example.com/'));
});
test('cancelled sharing does not automatically open another destination',async()=>{
 let calls=0;
 assert.equal(await nativeShare({share:()=>{calls++;throw new DOMException('cancelled','AbortError');}},{url:'https://example.com/'}),'cancelled');
 assert.equal(calls,1);
});
test('clipboard denial is reported so the UI can expose a selectable manual link',async()=>{
 assert.equal(await copyText({clipboard:{writeText:async()=>{throw new Error('denied');}}},'https://example.com/'),false);
 let copied;assert.equal(await copyText({clipboard:{writeText:async value=>{copied=value;}}},'https://example.com/'),true);
 assert.equal(copied,'https://example.com/');
});
