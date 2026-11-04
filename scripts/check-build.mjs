import {readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {canonicalPath,validateConfig} from './build.mjs';
import {headersForPath} from './headers.mjs';
import {listFiles} from './files.mjs';

const projectRoot=fileURLToPath(new URL('../',import.meta.url));
const forbidden=/^(?:node_modules|tests|docs|artifacts|\.git|\.codex|\.impeccable|\.env(?:\..*)?|\.dev\.vars(?:\..*)?|__.*|package(?:-lock)?\.json|wrangler\..*|AGENTS\.md|SKILL\.md)$/i;
export async function checkBuild({directory=join(projectRoot,'dist'),strict=false,basePath='/',htmlExtension=false,headersRequired=true}={}){
 directory=resolve(directory);const files=await listFiles(directory),available=new Set(files),warnings=[];
 for(const file of files)if(file.split('/').some(name=>forbidden.test(name))||/\.test\.[cm]?js$/i.test(file))throw new Error('Forbidden development/private file: '+file);
 for(const file of ['index.html','404.html','site-config.json','game-config.json',...(headersRequired?['_headers']:[])])if(!available.has(file))throw new Error('Required release file missing: '+file);
 const config=JSON.parse(await readFile(join(directory,'site-config.json'),'utf8')),{origin}=validateConfig(config);
 if(!origin)warnings.push({code:'SITE_URL_MISSING',message:'Set site.url after receiving your public HTTPS address, then rebuild.'});
 const contact=config.site?.contactEmail;
 if(contact&&!/^[^\s@<>?]+@[^\s@<>?]+\.[^\s@<>?]+$/.test(contact))throw new Error('Invalid public contact email in site-config.json');
 if(!contact)warnings.push({code:'CONTACT_MISSING',message:'Set site.contactEmail before public promotion or advertising.'});
 const headers=headersRequired?await readFile(join(directory,'_headers'),'utf8'):'';
 const routeFor=file=>basePath+(htmlExtension?file.replace(/(^|\/)index\.html$/,'$1'):canonicalPath(file).slice(1));
 const routes=files.filter(f=>f.endsWith('.html')&&f!=='404.html').map(routeFor);
 for(const route of headersRequired?['/',...routes]:[]){
  const policy=headersForPath(headers,route);
  if(policy['X-Content-Type-Options']!=='nosniff'||!policy['Content-Security-Policy']?.includes("object-src 'none'"))throw new Error('Missing release security headers at '+route);
 }
 function reference(specifier,file,{module=false,exact=false}={}){
  const ref=specifier.replaceAll('&amp;','&').trim();if(!ref||ref.startsWith('#'))return;
  if(module&&!/^(?:\.{1,2}\/|\/|https?:\/\/)/.test(ref))throw new Error('Unresolved bare browser module in '+file);
  const base=origin||'https://build.invalid';let path;
  try{const url=new URL(ref,base+basePath+file);if(url.origin!==base)return;if(!url.pathname.startsWith(basePath))throw new Error('Resource outside project mount');path=decodeURIComponent(url.pathname.slice(basePath.length));}catch{throw new Error('Invalid local resource in '+file);}
  if(module&&!/\.m?js$/i.test(path))throw new Error('Browser module must resolve to a JavaScript file: '+path+' in '+file);
  const candidates=module||exact?[path]:[path,path+'index.html',path+'/index.html',path+'.html'];
  if(!candidates.some(p=>available.has(p)))throw new Error('Missing local resource '+path+' referenced by '+file);
 }
 for(const file of files){
  const source=await readFile(join(directory,file),'utf8');
  if(/sk-(?:proj-)?[A-Za-z0-9_-]{24,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(source))throw new Error('Possible private key in '+file+'; remove it before publishing.');
  if(!/\.(html|css|[cm]?js|json|txt|webmanifest)$/.test(file))continue;
  if(file.endsWith('.html')){
   if(/\{\{GAME_[A-Z_]+\}\}/.test(source))throw new Error('Unresolved game template in '+file);
   for(const match of source.matchAll(/\b(src|href)\s*=\s*["']([^"']+)["']/gi))reference(match[2],file,{exact:match[1].toLowerCase()==='src'||/\.(?:css|js|mjs|webmanifest|png|svg|jpe?g|webp|ttf|woff2?)(?:[?#]|$)/i.test(match[2])});
   for(const tag of source.matchAll(/<meta\b[^>]*>/gi)){
    const attributes=Object.fromEntries([...tag[0].matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map(m=>[m[1].toLowerCase(),m[2]]));
    if(['og:image','twitter:image'].includes(attributes.property??attributes.name)&&attributes.content)reference(attributes.content,file,{exact:true});
   }
   if(origin&&file!=='404.html'){
    const expected=origin+routeFor(file),canonical=source.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1];
    if(canonical!==expected)throw new Error('Canonical URL does not match the Cloudflare route in '+file);
   }
  }
  if(file.endsWith('.css'))for(const match of source.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/g))reference(match[1],file,{exact:true});
  if(/\.[cm]?js$/.test(file)){
   for(const match of source.matchAll(/(?:\b(?:import|export)\s+(?:[^;'"`]*?\bfrom\s*)?|\bimport\s*\(\s*)["']([^"']+)["']/g))reference(match[1],file,{module:true});
   for(const match of source.matchAll(/new\s+URL\(\s*["']([^"']+)["']\s*,\s*import\.meta\.url\s*\)/g))reference(match[1],file,{exact:true});
  }
 }
 if(origin){
  const sitemap=await readFile(join(directory,'sitemap.xml'),'utf8').catch(()=>{throw new Error('Missing production sitemap.xml');});
  const locations=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
  if(JSON.stringify(locations.sort())!==JSON.stringify(routes.map(p=>origin+p).sort()))throw new Error('Sitemap does not match the Cloudflare routes');
 }
 if(strict&&warnings.length)throw new Error('Launch settings incomplete: '+warnings.map(w=>w.code).join(', '));
 return {files,routes,origin,warnings};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const result=await checkBuild({strict:process.argv.includes('--strict')});console.log('Checked '+result.files.length+' static files and '+result.routes.length+' page routes.');for(const warning of result.warnings)console.log('Setup: '+warning.message);}
 catch(error){console.error(error.message);process.exitCode=1;}
}
