import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {inflateRawSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createGameProject} from '../scripts/new-game.mjs';

// Read standard local ZIP records independently of the release writer.
function entries(bytes){
 const files=new Map();let offset=0;
 while(bytes.readUInt32LE(offset)===0x04034b50){
  const size=bytes.readUInt32LE(offset+18),nameLength=bytes.readUInt16LE(offset+26),extraLength=bytes.readUInt16LE(offset+28);
  const name=bytes.subarray(offset+30,offset+30+nameLength).toString('utf8'),start=offset+30+nameLength+extraLength;
  assert.equal(bytes.readUInt16LE(offset+8),8);files.set(name,inflateRawSync(bytes.subarray(start,start+size)));offset=start+size;
 }
 assert.equal(bytes.readUInt32LE(offset),0x02014b50);assert.equal(bytes.readUInt32LE(bytes.length-22),0x06054b50);return files;
}
test('portable ZIPs round-trip UTF-8 names, empty files and a known CRC value',async()=>{
 const parent=await mkdtemp(join(tmpdir(),'release-zip-'));
 try{
  await writeFile(join(parent,'茶.txt'),'香港 café');await writeFile(join(parent,'empty.txt'),'');
  const {zipDirectory,crc32}=await import('../scripts/archive.mjs');
  assert.equal(crc32(Buffer.from('123456789')),0xcbf43926);
  const first=await zipDirectory(parent,{prefix:'game'}),second=await zipDirectory(parent,{prefix:'game'});
  assert.deepEqual(first,second);const contents=entries(first);assert.equal(contents.get('game/茶.txt').toString(),'香港 café');assert.equal(contents.get('game/empty.txt').length,0);
 }finally{await rm(parent,{recursive:true,force:true});}
});
test('a release rebuilds and packages a verified site and independent starter with checksums',async()=>{
 const parent=await mkdtemp(join(tmpdir(),'release-game-'));
 try{
  const project=join(parent,'game');await createGameProject({id:'release-demo',name:'Release Demo',destination:project});
  const {releaseProject}=await import('../scripts/release.mjs');
  const artifactsDir=join(parent,'artifacts');const result=await releaseProject({sourceDir:join(project,'public'),outputDir:join(parent,'dist'),artifactsDir});
  const staticBytes=await readFile(join(artifactsDir,'release-demo-static.zip')),staticFiles=entries(staticBytes);
  assert.ok(staticFiles.has('index.html'));assert.ok(!staticFiles.has('package.json'));assert.ok(![...staticFiles.keys()].some(n=>n.startsWith('scripts/')));
  assert.equal(result.packages['release-demo-static.zip'].sha256,createHash('sha256').update(staticBytes).digest('hex'));
  const starter=entries(await readFile(join(artifactsDir,'game-starter.zip')));
  for(const file of ['package.json','scripts/release.mjs','scripts/check-build.mjs','scripts/archive.mjs'])assert.ok(starter.has('game-starter/'+file),file);
  assert.ok(![...starter.keys()].some(n=>n.includes('/assets/v2/')));
  assert.deepEqual(JSON.parse(await readFile(join(artifactsDir,'release.json'),'utf8')),result);
 }finally{await rm(parent,{recursive:true,force:true});}
});
test('a broken new build cannot replace the previous release archives',async()=>{
 const parent=await mkdtemp(join(tmpdir(),'release-preserve-'));
 try{
  const project=join(parent,'game');await createGameProject({id:'release-demo',name:'Release Demo',destination:project});
  await writeFile(join(project,'public/assets/game.js'),"import './not-shipped.js';");
  const artifactsDir=join(parent,'artifacts');await mkdir(artifactsDir);await writeFile(join(artifactsDir,'release-demo-static.zip'),'previous release');
  const {releaseProject}=await import('../scripts/release.mjs');
  await assert.rejects(releaseProject({sourceDir:join(project,'public'),outputDir:join(parent,'dist'),artifactsDir}),/not-shipped/);
  assert.equal(await readFile(join(artifactsDir,'release-demo-static.zip'),'utf8'),'previous release');
 }finally{await rm(parent,{recursive:true,force:true});}
});
test('release rejects source HTML symlinks before touching their outside targets',async()=>{
 const parent=await mkdtemp(join(tmpdir(),'release-link-'));
 try{
  const project=join(parent,'game');await createGameProject({id:'release-demo',name:'Release Demo',destination:project});
  const outside=join(parent,'outside.html'),original='<html><head><!-- SITE_META --></head><body>keep me</body></html>';
  await writeFile(outside,original);await symlink(outside,join(project,'public/linked.html'));
  const {releaseProject}=await import('../scripts/release.mjs');
  await assert.rejects(releaseProject({sourceDir:join(project,'public'),outputDir:join(parent,'dist'),artifactsDir:join(parent,'artifacts')}),/symlink/i);
  assert.equal(await readFile(outside,'utf8'),original);
 }finally{await rm(parent,{recursive:true,force:true});}
});
