import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createGameProject} from '../scripts/new-game.mjs';
import {buildSite} from '../scripts/build.mjs';
test('a generated standalone game includes the shared flow and can build without Snack Sneak art',async()=>{
 const parent=await mkdtemp(join(tmpdir(),'game-starter-')),destination=join(parent,'noodle-rush');
 try{
  await createGameProject({id:'noodle-rush',name:'Noodle Rush',destination});
  const config=JSON.parse(await readFile(join(destination,'public/game-config.json'),'utf8'));
  assert.equal(config.id,'noodle-rush');assert.equal(config.name,'Noodle Rush');
  assert.equal(JSON.parse(await readFile(join(destination,'package.json'),'utf8')).name,'noodle-rush');
  assert.match(await readFile(join(destination,'public/assets/game.js'),'utf8'),/create|step/);
  const game=await import(pathToFileURL(join(destination,'public/assets/game.js')).href);
  const state=game.create('daily:test',config);game.step(state,{held:false,presses:1},1/120);assert.equal(state.score,100);
  for(let i=0;i<config.roundSeconds*120;i++)game.step(state,{held:false,presses:0},1/120);
  assert.equal(state.status,'finished');assert.equal(game.result(state,'en').score,100);
  assert.ok(!(await readdir(join(destination,'public/assets'))).includes('v2'));
  await buildSite({sourceDir:join(destination,'public'),outputDir:join(destination,'dist')});
  assert.match(await readFile(join(destination,'dist/index.html'),'utf8'),/Noodle Rush/);
  assert.ok((await readdir(join(destination,'dist/assets/game-kit'))).includes('share-panel.js'));
 }finally{await rm(parent,{recursive:true,force:true});}
});
test('template HTML escapes game names and metadata follows later config edits',async()=>{
 const parent=await mkdtemp(join(tmpdir(),'game-name-')),destination=join(parent,'food-fun');
 try{
  await createGameProject({id:'food-fun',name:'Food <Fun>',destination});
  const source=await readFile(join(destination,'public/index.html'),'utf8');assert.ok(source.includes('Food &lt;Fun&gt;'));assert.ok(!source.includes('Food <Fun>'));
  const path=join(destination,'public/game-config.json'),config=JSON.parse(await readFile(path,'utf8'));config.name='Sushi Rush';await writeFile(path,JSON.stringify(config));
  await buildSite({sourceDir:join(destination,'public'),outputDir:join(destination,'dist')});
  assert.match(await readFile(join(destination,'dist/index.html'),'utf8'),/<title[^>]*>Sushi Rush<\/title>/);
  assert.equal(JSON.parse(await readFile(join(destination,'dist/manifest.webmanifest'),'utf8')).name,'Sushi Rush');
 }finally{await rm(parent,{recursive:true,force:true});}
});
test('the generator refuses an existing destination without touching its contents',async()=>{
 const destination=await mkdtemp(join(tmpdir(),'game-preserve-'));
 try{await writeFile(join(destination,'keep.txt'),'keep');await assert.rejects(createGameProject({id:'new-game',name:'New Game',destination}),/exist/i);assert.equal(await readFile(join(destination,'keep.txt'),'utf8'),'keep');}
 finally{await rm(destination,{recursive:true,force:true});}
});
test('the generator rejects path traversal in game slugs',async()=>{
 await assert.rejects(createGameProject({id:'../escape',name:'Bad'}),/id|slug/i);
});
