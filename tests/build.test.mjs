import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildSite } from '../scripts/build.mjs';

async function fixture(config) {
  const source=await mkdtemp(join(tmpdir(),'tray-source-'));
  const output=await mkdtemp(join(tmpdir(),'tray-output-'));
  await writeFile(join(source,'index.html'),'<!doctype html><html><head><!-- SITE_META --></head><body>Game</body></html>');
  await writeFile(join(source,'site-config.json'),JSON.stringify(config));
  return {sourceDir:source,outputDir:output,cleanup:()=>Promise.all([rm(source,{recursive:true,force:true}),rm(output,{recursive:true,force:true})])};
}
const config={site:{url:''},adsense:{enabled:false,publisherId:'',slotId:''}};

test('the production build packages a playable static entry without creating fake publisher records',async()=>{
  const f=await fixture(config);
  try {
    await buildSite(f);
    assert.match(await readFile(join(f.outputDir,'index.html'),'utf8'),/<body>Game<\/body>/);
    assert.ok(!(await readdir(f.outputDir)).includes('ads.txt'));
    assert.ok(!(await readFile(join(f.outputDir,'index.html'),'utf8')).includes('ca-pub-'));
  } finally {await f.cleanup();}
});

test('an enabled but incomplete advertising configuration cannot ship',async()=>{
  const f=await fixture({...config,adsense:{enabled:true,publisherId:'',slotId:''}});
  try {await assert.rejects(buildSite(f),/publisher|AdSense/i);}finally{await f.cleanup();}
});

test('a real publisher id creates verification metadata and ads.txt without enabling live ads',async()=>{
  const f=await fixture({site:{url:'https://example.com'},adsense:{enabled:false,publisherId:'ca-pub-1234567890123456',slotId:''}});
  try {
    await buildSite(f);
    assert.match(await readFile(join(f.outputDir,'ads.txt'),'utf8'),/^google\.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n$/);
    const html=await readFile(join(f.outputDir,'index.html'),'utf8');
    assert.match(html,/name="google-adsense-account" content="ca-pub-1234567890123456"/);
    assert.match(html,/rel="canonical" href="https:\/\/example.com\/"/);
    assert.doesNotMatch(html,/adsbygoogle\.js/);
  }finally{await f.cleanup();}
});

test('invalid site origins and malformed publisher ids fail before packaging',async()=>{
  for(const input of [
    {...config,site:{url:'javascript:alert(1)'}},
    {...config,adsense:{enabled:false,publisherId:'ca-pub-<bad>',slotId:''}}
  ]) {
    const f=await fixture(input);
    try {await assert.rejects(buildSite(f),/https|publisher|AdSense/i);}finally{await f.cleanup();}
  }
});

test('the retained game gets its own canonical URL and V2 gets an absolute social image',async()=>{
  const f=await fixture({...config,site:{url:'https://example.com'}});
  try {
    await mkdir(join(f.sourceDir,'v1'));
    await writeFile(join(f.sourceDir,'v1','index.html'),'<html><head><!-- SITE_META --></head><body>V1</body></html>');
    await writeFile(join(f.sourceDir,'index.html'),'<html><head><!-- SITE_META --><meta property="og:image" content="/assets/v2/social-cover.png"></head><body>V2</body></html>');
    await buildSite(f);
    assert.match(await readFile(join(f.outputDir,'v1','index.html'),'utf8'),/rel="canonical" href="https:\/\/example.com\/v1\/"/);
    assert.match(await readFile(join(f.outputDir,'index.html'),'utf8'),/content="https:\/\/example.com\/assets\/v2\/social-cover.png"/);
    assert.match(await readFile(join(f.outputDir,'sitemap.xml'),'utf8'),/example.com\/v1\//);
  } finally {await f.cleanup();}
});

