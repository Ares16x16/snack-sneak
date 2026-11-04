import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createGameProject} from '../scripts/new-game.mjs';
import {buildSite} from '../scripts/build.mjs';
import {buildPages} from '../scripts/build-pages.mjs';
const config={enabled:true,projectToken:'phc_syntheticpublicproject1234567890',region:'eu'};
test('enabled analytics grants only its region endpoint in Cloudflare and Pages CSP',async()=>{
 const temp=await mkdtemp(join(tmpdir(),'analytics-build-'));
 try{
  const source=join(temp,'game');await createGameProject({id:'noodle-rush',name:'Noodle Rush',destination:source});
  const file=join(source,'public/site-config.json'),settings=JSON.parse(await readFile(file,'utf8'));settings.analytics=config;await writeFile(file,JSON.stringify(settings));
  const out=join(temp,'out');await buildSite({sourceDir:join(source,'public'),outputDir:out});
  const headers=await readFile(join(out,'_headers'),'utf8');assert.match(headers,/connect-src 'self' https:\/\/eu\.i\.posthog\.com;/);assert.doesNotMatch(headers,/us\.i\.posthog\.com/);assert.match(headers,/script-src 'self';/);
  await buildPages({sourceDir:join(source,'public'),outputDir:out,siteURL:'https://a.github.io/noodle-rush/'});
  const html=await readFile(join(out,'index.html'),'utf8');assert.ok(html.includes("connect-src 'self' https://eu.i.posthog.com"));assert.ok(!html.includes('https://eu-assets.i.posthog.com'));
  const child=join(temp,'child');const {createGameProject:create}=await import(new URL('file://'+join(source,'scripts/new-game.mjs')));await create({id:'another-game',name:'Another Game',destination:child});
  assert.deepEqual(JSON.parse(await readFile(join(child,'public/site-config.json'),'utf8')).analytics,{enabled:false,projectToken:'',region:'us'});
 }finally{await rm(temp,{recursive:true,force:true});}
});
test('incomplete analytics config fails before replacing an existing build',async()=>{
 const temp=await mkdtemp(join(tmpdir(),'analytics-invalid-'));
 try{
  const source=join(temp,'game');await createGameProject({id:'noodle-rush',destination:source});const out=join(temp,'out');await buildSite({sourceDir:join(source,'public'),outputDir:out});
  const before=await readFile(join(out,'index.html'));const file=join(source,'public/site-config.json'),settings=JSON.parse(await readFile(file,'utf8'));settings.analytics={enabled:true,projectToken:'',region:'us'};await writeFile(file,JSON.stringify(settings));
  await assert.rejects(buildSite({sourceDir:join(source,'public'),outputDir:out}),/project token/i);assert.deepEqual(await readFile(join(out,'index.html')),before);
 }finally{await rm(temp,{recursive:true,force:true});}
});
