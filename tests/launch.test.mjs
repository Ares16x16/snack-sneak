import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createGameProject} from '../scripts/new-game.mjs';
import {buildSite} from '../scripts/build.mjs';

async function fixture(run){
 const parent=await mkdtemp(join(tmpdir(),'launch-test-')),project=join(parent,'game');
 try{
  await createGameProject({id:'launch-demo',name:'Launch Demo',destination:project});
  const directory=join(project,'dist');await buildSite({sourceDir:join(project,'public'),outputDir:directory});
  await run({directory,project});
 }finally{await rm(parent,{recursive:true,force:true});}
}
test('canonical links and sitemap point to Cloudflare clean URLs, not redirecting HTML paths',()=>fixture(async({project,directory})=>{
 const config=join(project,'public/site-config.json');const value=JSON.parse(await readFile(config,'utf8'));value.site.url='https://games.example';await writeFile(config,JSON.stringify(value));
 await buildSite({sourceDir:join(project,'public'),outputDir:directory});
 assert.match(await readFile(join(directory,'about.html'),'utf8'),/rel="canonical" href="https:\/\/games.example\/about"/);
 const sitemap=await readFile(join(directory,'sitemap.xml'),'utf8');assert.ok(sitemap.includes('<loc>https://games.example/about</loc>'));assert.ok(!sitemap.includes('.html'));
}));
test('a complete standalone build passes validation and reports unset owner settings',()=>fixture(async({directory})=>{
 const {checkBuild}=await import('../scripts/check-build.mjs');
 const result=await checkBuild({directory});assert.ok(result.files.includes('assets/game.js'));assert.ok(result.routes.includes('/how-to-play'));
 assert.deepEqual(result.warnings.map(w=>w.code).sort(),['CONTACT_MISSING','SITE_URL_MISSING']);
}));
test('validation catches missing nested module imports before a release is created',()=>fixture(async({directory})=>{
 await writeFile(join(directory,'assets/game.js'),"import './missing-game-logic.js';");
 const {checkBuild}=await import('../scripts/check-build.mjs');await assert.rejects(checkBuild({directory}),/missing-game-logic\.js/);
}));
test('validation catches missing artwork referenced with import.meta.url',()=>fixture(async({directory})=>{
 await writeFile(join(directory,'assets/game.js'),"const picture=new URL('./missing-food.png',import.meta.url);");
 const {checkBuild}=await import('../scripts/check-build.mjs');await assert.rejects(checkBuild({directory}),/missing-food\.png/);
}));
test('validation rejects public fixtures and credential files',()=>fixture(async({directory})=>{
 const {checkBuild}=await import('../scripts/check-build.mjs');
 for(const name of ['__review-probe.html','.env','package.json']){
  await writeFile(join(directory,name),'private fixture');await assert.rejects(checkBuild({directory}),/development|private|forbidden/i);await rm(join(directory,name));
 }
}));
test('validation refuses source symlinks rather than packaging their targets',()=>fixture(async({directory,project})=>{
 await writeFile(join(project,'outside.txt'),'private');await symlink(join(project,'outside.txt'),join(directory,'outside.txt'));
 const {checkBuild}=await import('../scripts/check-build.mjs');await assert.rejects(checkBuild({directory}),/symlink/i);
}));
test('ordinary multiline imports cannot bypass missing-module validation',()=>fixture(async({directory})=>{
 await writeFile(join(directory,'assets/game.js'),"import {\n missing\n} from './not-shipped.js';");
 const {checkBuild}=await import('../scripts/check-build.mjs');await assert.rejects(checkBuild({directory}),/not-shipped\.js/);
}));
test('bare module names and HTML fallback files cannot pass as browser modules',()=>fixture(async({directory})=>{
 const {checkBuild}=await import('../scripts/check-build.mjs');
 await writeFile(join(directory,'assets/fake-module.html'),'not JavaScript');
 for(const source of ["import 'game.js';","import './fake-module';"]){
  await writeFile(join(directory,'assets/main.js'),source);await assert.rejects(checkBuild({directory}),/module|import/i);
 }
}));
test('private-key markers are rejected regardless of extension without exposing the key',()=>fixture(async({directory})=>{
 const {checkBuild}=await import('../scripts/check-build.mjs');
 const secret='-----BEGIN PRIVATE KEY-----\nSYNTHETIC-DO-NOT-LOG\n-----END PRIVATE KEY-----';
 await writeFile(join(directory,'review-private.pem'),secret);
 await assert.rejects(checkBuild({directory}),error=>/private key/i.test(error.message)&&!error.message.includes('SYNTHETIC'));
}));
test('missing social preview artwork is caught before publishing',()=>fixture(async({directory})=>{
 const file=join(directory,'index.html');await writeFile(file,(await readFile(file,'utf8')).replace('</head>','<meta property="og:image" content="/missing-preview.png"></head>'));
 const {checkBuild}=await import('../scripts/check-build.mjs');await assert.rejects(checkBuild({directory}),/missing-preview\.png/);
}));
