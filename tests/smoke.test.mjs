import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,extname} from 'node:path';
import {createGameProject} from '../scripts/new-game.mjs';
import {buildSite,canonicalPath} from '../scripts/build.mjs';
import {headersForPath} from '../scripts/headers.mjs';

async function fixture(mode,run){
 const parent=await mkdtemp(join(tmpdir(),'smoke-http-'));let server;
 try{
  const project=join(parent,'game');await createGameProject({id:'smoke-demo',name:'Smoke Demo',destination:project});
  const directory=join(project,'dist');await buildSite({sourceDir:join(project,'public'),outputDir:directory});
  const policy=await readFile(join(directory,'_headers'),'utf8');
  server=createServer(async(req,res)=>{
   const pathname=new URL(req.url,'http://localhost').pathname;
   const headers=headersForPath(policy,pathname);
   if(mode==='headers'&&pathname==='/assets/game.js')delete headers['Content-Security-Policy'];
   for(const [key,value] of Object.entries(headers))res.setHeader(key,value);
   if(mode==='status'&&pathname==='/'){res.writeHead(500);res.end('broken');return;}
   if(pathname.endsWith('.html')){res.writeHead(307,{Location:canonicalPath(pathname.slice(1))+new URL(req.url,'http://localhost').search});res.end();return;}
   const path=pathname==='/'?'index.html':pathname.includes('.')?pathname.slice(1):pathname.slice(1)+'.html';
   try{
    if(path.startsWith('_')||path==='package.json')throw Error('not public');
    const bytes=await readFile(join(directory,path));
    res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.ttf':'font/ttf','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'})[extname(path)]??'application/octet-stream');
    res.writeHead(200);res.end(mode==='body'&&pathname==='/assets/game.js'?'wrong build':bytes);
   }catch{res.writeHead(404,{'Content-Type':'text/html'});res.end(await readFile(join(directory,'404.html')));}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  await run({directory,origin:'http://127.0.0.1:'+server.address().port});
 }finally{if(server)await new Promise(resolve=>server.close(resolve));await rm(parent,{recursive:true,force:true});}
}
test('HTTP acceptance checks the actual routes, bytes, headers and custom 404',async()=>{
 const {smokeSite}=await import('../scripts/smoke.mjs');await fixture('valid',async options=>{const result=await smokeSite(options);assert.equal(result.passed,true);assert.ok(result.requests>20);assert.equal(result.pages,4);});
});
test('HTTP acceptance rejects successful responses with missing security headers',async()=>{
 const {smokeSite}=await import('../scripts/smoke.mjs');await fixture('headers',options=>assert.rejects(smokeSite(options),/content-security-policy/i));
});
test('HTTP acceptance detects a stale asset and a broken entry status',async()=>{
 const {smokeSite}=await import('../scripts/smoke.mjs');
 await fixture('body',options=>assert.rejects(smokeSite(options),/content|checksum|bytes/i));
 await fixture('status',options=>assert.rejects(smokeSite(options),/500/));
});
