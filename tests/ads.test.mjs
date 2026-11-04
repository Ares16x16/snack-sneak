import test from 'node:test';
import assert from 'node:assert/strict';
import { canRequestAds, createAdAdapter } from '../public/assets/ads.js';
const configured={enabled:true,publisherId:'ca-pub-1234567890123456',slotId:'1234567890'};
test('ads cannot be requested when disabled or visitor consent has not been granted',()=>{
  assert.equal(canRequestAds({...configured,enabled:false},true),false);
  assert.equal(canRequestAds(configured,false),false);
  assert.equal(canRequestAds(configured,undefined),false);
  assert.equal(canRequestAds(configured,true),true);
});
test('malformed ad identifiers cannot reach an external advertising request',()=>{
  assert.equal(canRequestAds({...configured,publisherId:'bad'},true),false);
  assert.equal(canRequestAds({...configured,slotId:'<script>'},true),false);
});

function adFixture() {
  let load;
  const container={hidden:true,append(){}};
  const window={adsbygoogle:[]};
  const document={head:{append(){}},createElement(){return {style:{},dataset:{},addEventListener(name,listener){if(name==='load')load=listener;}};}};
  return {container,window,document,load:()=>load()};
}

test('withdrawing consent while the script loads cannot reveal or enqueue an ad',()=>{
  const f=adFixture();
  const consent=createAdAdapter(configured,f.container,f);
  consent(true);consent(false);f.load();
  assert.equal(f.container.hidden,true);
  assert.equal(f.window.adsbygoogle.length,0);
});

test('a new consent grant after withdrawal can show the loaded unit exactly once',()=>{
  const f=adFixture();
  const consent=createAdAdapter(configured,f.container,f);
  consent(true);consent(false);f.load();consent(true);
  assert.equal(f.container.hidden,false);
  assert.equal(f.window.adsbygoogle.length,1);
  consent(false);consent(true);
  assert.equal(f.container.hidden,false);
  assert.equal(f.window.adsbygoogle.length,1);
});

