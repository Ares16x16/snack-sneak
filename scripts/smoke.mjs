import {readFile} from 'node:fs/promises';
import {resolve,join,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {checkBuild} from './check-build.mjs';
import {canonicalPath} from './build.mjs';
import {headersForPath} from './headers.mjs';

const projectRoot=fileURLToPath(new URL('../',import.meta.url));
const hash=value=>createHash('sha256').update(value).digest('hex');
export async function smokeSite({origin,directory=join(projectRoot,'dist')}={}){
 let url;try{url=new URL(origin);}catch{throw new Error('Provide your site origin, for example https://your-game.workers.dev');}
 const local=['127.0.0.1','localhost','[::1]'].includes(url.hostname);
 if((url.protocol!=='https:'&&!(local&&url.protocol==='http:'))||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('Use a public HTTPS origin or a loopback HTTP origin, without credentials or a path.');
 origin=url.origin;const checked=await checkBuild({directory}),policy=await readFile(join(directory,'_headers'),'utf8');
 const checks=[],errors=[];let requests=0;
 const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'};
 async function response(path){
  requests++;return fetch(origin+path,{redirect:'manual',signal:AbortSignal.timeout(8000)});
 }
 async function contents(path,file,status=200){
  const received=await response(path);
  if(received.status!==status){await received.body?.cancel();throw new Error('HTTP '+received.status+' at '+path+'; expected '+status);}
  for(const [name,value] of Object.entries(headersForPath(policy,path))){
   const actual=received.headers.get(name);
   if(name==='Cache-Control'? !value.split(',').every(part=>actual?.toLowerCase().includes(part.trim().toLowerCase())):actual!==value){await received.body?.cancel();throw new Error('Unexpected '+name+' at '+path);}
  }
  const expectedType=mime[extname(file)];
  if(expectedType&&!received.headers.get('content-type')?.startsWith(expectedType)){await received.body?.cancel();throw new Error('Unexpected content-type at '+path);}
  const actual=Buffer.from(await received.arrayBuffer()),expected=await readFile(join(directory,file));
  if(hash(actual)!==hash(expected))throw new Error('Content bytes differ from the current build at '+path);
 }
 for(const file of checked.files){
  if(file.startsWith('_')||file==='404.html')continue;
  const path=file.endsWith('.html')?canonicalPath(file):'/'+file;
  checks.push(()=>contents(path,file));
  if(file.endsWith('.html')&&file!=='index.html')checks.push(async()=>{
   let path='/'+file+'?lang=zh-Hant&target=10';
   for(let hop=0;hop<4;hop++){
    const result=await response(path);await result.body?.cancel();
    if(result.status===200){
     if(new URL(path,origin).pathname!==canonicalPath(file))throw new Error('HTML alias did not reach its canonical route: '+file);
     return;
    }
    if(![301,302,307,308].includes(result.status))throw new Error('Broken HTML alias: '+file+' (HTTP '+result.status+')');
    const next=new URL(result.headers.get('location'),origin+path);
    if(next.origin!==origin||next.searchParams.get('lang')!=='zh-Hant'||next.searchParams.get('target')!=='10')throw new Error('Redirect lost the origin or challenge query: '+file);
    path=next.pathname+next.search;
   }
   throw new Error('Too many redirects: '+file);
  });
 }
 for(const path of ['/__release-missing-page','/.env','/package.json','/scripts/build.mjs','/_headers'])checks.push(()=>contents(path,'404.html',404));
 let next=0;
 await Promise.all(Array.from({length:Math.min(4,checks.length)},async()=>{
  while(next<checks.length){const check=checks[next++];try{await check();}catch(error){errors.push(error.message);}}
 }));
 if(errors.length)throw new Error(errors.join('\n'));
 return {origin,requests,pages:checked.routes.length,files:checked.files.length,passed:true};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const result=await smokeSite({origin:process.argv[2]});console.log(JSON.stringify(result,null,2));}
 catch(error){console.error(error.message);process.exitCode=1;}
}
