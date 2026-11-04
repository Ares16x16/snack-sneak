import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildPages} from '../scripts/build-pages.mjs';
import {localPath} from '../public/assets/game-kit/site-path.js';
import {challengeLink} from '../public/assets/game-kit/challenge.js';
import {challengeLink as trayLink} from '../public/assets/share.js';
import {createGameProject} from '../scripts/new-game.mjs';

test('runtime paths retain project mount without changing external destinations',()=>{
 assert.equal(localPath('/v1/','https://a.github.io/snack-sneak/assets/game-kit/site-path.js'),'/snack-sneak/v1/');
 assert.equal(localPath('/','https://a.github.io/assets/game-kit/site-path.js'),'/');
 assert.equal(localPath('https://other.example/','https://a.github.io/snack-sneak/assets/game-kit/site-path.js'),'https://other.example/');
 const path=localPath('/','https://a.github.io/snack-sneak/assets/game-kit/site-path.js');
 assert.equal(new URL(challengeLink({origin:'https://a.github.io',path,gameId:'v2',date:'2026-11-04'})).pathname,'/snack-sneak/');
 assert.equal(new URL(trayLink({origin:'https://a.github.io',path:localPath('/v1/','https://a.github.io/snack-sneak/assets/game-kit/site-path.js'),mode:'daily',date:'2026-11-04',score:12,language:'en'})).pathname,'/snack-sneak/v1/');
});
for(const siteURL of ['https://a.github.io/snack-sneak/','https://a.github.io/'])test('Pages output resolves resources at '+siteURL,async()=>{
 const temp=await mkdtemp(join(tmpdir(),'pages-test-'));
 try{
  const outputDir=join(temp,'site'),result=await buildPages({siteURL,outputDir});
  assert.ok(result.files.includes('.nojekyll'));
  const html=await readFile(join(outputDir,'index.html'),'utf8'),base=new URL(siteURL).pathname;
  assert.ok(html.includes('href="'+base+'assets/styles.css"'));
  assert.ok(html.includes('http-equiv="Content-Security-Policy"'));
  assert.ok(!html.includes('frame-ancestors'));
  assert.ok(html.includes('href="'+siteURL+'"'));
  assert.ok((await readFile(join(outputDir,'about.html'),'utf8')).includes('href="'+siteURL+'about.html"'));
  const manifest=JSON.parse(await readFile(join(outputDir,'manifest.webmanifest'),'utf8'));
  assert.equal(manifest.start_url,base);
  assert.equal(manifest.icons[0].src,base+'assets/favicon.svg');
  await assert.rejects(readFile(join(outputDir,'_headers')),{code:'ENOENT'});
 }finally{await rm(temp,{recursive:true,force:true});}
});
test('Pages URL rejects unsafe mounts',async()=>{
 for(const siteURL of ['http://a.github.io/x/','https://a.github.io/x/?token=x','https://a.github.io/x/#x','https://u:p@a.github.io/','https://a.github.io/x%2fy/'])await assert.rejects(buildPages({siteURL}));
});
test('standalone projects include Pages tooling without ignored markdown dependencies',async()=>{
 const temp=await mkdtemp(join(tmpdir(),'pages-starter-'));
 try{
  const destination=join(temp,'game');await createGameProject({id:'noodle-rush',name:'Noodle Rush',destination});
  assert.ok((await readFile(join(destination,'scripts/build-pages.mjs'),'utf8')).includes('buildPages'));
  assert.ok((await readFile(join(destination,'.github/workflows/pages.yml'),'utf8')).includes('deploy-pages'));
  const {buildPages:build}=await import(new URL('file://'+join(destination,'scripts/build-pages.mjs')));
  await build({siteURL:'https://a.github.io/noodle-rush/'});
 }finally{await rm(temp,{recursive:true,force:true});}
});
