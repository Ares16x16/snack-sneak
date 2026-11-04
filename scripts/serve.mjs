import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { headersForPath } from './headers.mjs';
const projectRoot=fileURLToPath(new URL('../',import.meta.url));
const root=resolve(projectRoot,process.argv.includes('--dist')?'dist':'public');
const port=Number(process.env.PORT??4173);
const securityHeaders=await readFile(resolve(root,'_headers'),'utf8').catch(()=>'');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.ttf':'font/ttf','.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8'};
createServer(async(request,response)=>{
  response.setHeader('X-Content-Type-Options','nosniff');
  response.setHeader('Cache-Control','no-store');
  if(!['GET','HEAD'].includes(request.method)){response.writeHead(405,{Allow:'GET, HEAD'});response.end();return;}
  let pathname;
  try {pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);}catch{response.writeHead(400);response.end('Bad request');return;}
  for(const [name,value] of Object.entries(headersForPath(securityHeaders,pathname)))response.setHeader(name,value);
  response.setHeader('Cache-Control','no-store');
  let file=resolve(root,'.'+pathname);
  if(file!==root&&!file.startsWith(root+sep)){response.writeHead(403);response.end('Forbidden');return;}
  try {
    const info=await stat(file).catch(()=>null);
    if(info?.isDirectory())file=resolve(file,'index.html');
    else if(!info&&!extname(file))file+='.html';
    const data=await readFile(file);
    response.writeHead(200,{'Content-Type':types[extname(file)]??'application/octet-stream'});
    response.end(request.method==='HEAD'?undefined:data);
  } catch {
    const page=await readFile(resolve(root,'404.html')).catch(()=>Buffer.from('Not found'));
    response.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});response.end(request.method==='HEAD'?undefined:page);
  }
}).on('error',error=>{console.error(error.message);process.exitCode=1;}).listen(port,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:'+port+' · '+root));

