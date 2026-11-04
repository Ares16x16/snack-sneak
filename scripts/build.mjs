import {validateAnalytics} from '../public/assets/game-kit/analytics-core.js';
import { cp, mkdir, readdir, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {validateGameConfig,gameText} from '../public/assets/game-kit/config.js';
import {listFiles} from './files.mjs';

const projectRoot=fileURLToPath(new URL('../',import.meta.url));
export function canonicalPath(filename){
  return '/'+filename.replaceAll('\\','/').replace(/(^|\/)index\.html$/,'$1').replace(/\.html$/,'');
}
export function validateConfig(config) {
  const publisher=config.adsense?.publisherId??'';
  const slot=config.adsense?.slotId??'';
  if(publisher && !/^ca-pub-\d{16}$/.test(publisher))throw new Error('AdSense publisherId must be a real ca-pub- followed by 16 digits.');
  if(config.adsense?.enabled && (!publisher||!/^\d{10}$/.test(slot)))throw new Error('Enabled AdSense needs a valid publisherId and a 10 digit slotId.');
  let origin='';
  if(config.site?.url) {
    let url;
    try {url=new URL(config.site.url);}catch{throw new Error('Site URL must be an https origin.');}
    if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('Site URL must be an https origin without a path or credentials.');
    origin=url.origin;
  }
  return {publisher,origin,analytics:validateAnalytics(config.analytics)};
}
const attr=value=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
const plain=value=>attr(String(value??'')).replaceAll('>','&gt;');
function gameHtml(html,config){
 if(!config||!html.includes('data-game-template'))return html;
 html=html.replace(/(<([a-z][\w-]*)\b[^>]*\bdata-game-name\b[^>]*>)[^<]*(<\/\2>)/gi,(_,start,tag,end)=>start+plain(config.name)+end);
 html=html.replace(/(<title[^>]*data-game-title[^>]*>)[\s\S]*?(<\/title>)/g,(_,start,end)=>start+plain(config.name)+end);
 html=html.replace(/(<title[^>]*data-game-page="([^"]*)"[^>]*>)[\s\S]*?(<\/title>)/g,(_,start,page,end)=>start+plain(page+' — '+config.name)+end);
 html=html.replace(/(<meta[^>]*data-game-title[^>]*content=")[^"]*(")/g,(_,start,end)=>start+plain(config.name)+end);
 html=html.replace(/(<meta[^>]*data-game-description[^>]*content=")[^"]*(")/g,(_,start,end)=>start+plain(config.description)+end);
 html=html.replace(/(<meta name="theme-color" content=")[^"]*(")/g,(_,start,end)=>start+config.palette.ink+end);
 for(const [marker,value] of [['description',config.description],['instructions',gameText(config.instructions,'en','')]]){
  const re=new RegExp('(<([a-z][\\w-]*)\\b[^>]*\\bdata-game-'+marker+'\\b[^>]*>)[^<]*(<\\/\\2>)','gi');
  html=html.replace(re,(_,start,tag,end)=>start+plain(value)+end);
 }
 if(config.socialImage&&!html.includes('property="og:image"'))html=html.replace('</head>','<meta property="og:image" content="'+plain(config.socialImage)+'"></head>');
 return html;
}
async function htmlFiles(directory) {
  const files=[];
  for(const entry of await readdir(directory,{withFileTypes:true})){
    const file=join(directory,entry.name);
    if(entry.isDirectory())files.push(...await htmlFiles(file));else if(entry.name.endsWith('.html'))files.push(file);
  }
  return files;
}
export async function buildSite({sourceDir=join(projectRoot,'public'),outputDir=join(projectRoot,'dist')}={}) {
  sourceDir=resolve(sourceDir);outputDir=resolve(outputDir);
  if(outputDir===sourceDir||sourceDir.startsWith(outputDir+'/'))throw new Error('Build output must not contain the source directory.');
  await listFiles(sourceDir);
  const config=JSON.parse(await readFile(join(sourceDir,'site-config.json'),'utf8'));
  const {publisher,origin,analytics}=validateConfig(config);
  const rawGame=await readFile(join(sourceDir,'game-config.json'),'utf8').catch(error=>{if(error.code==='ENOENT')return null;throw error;});
  const game=rawGame?validateGameConfig(JSON.parse(rawGame)):null;
  if(game?.socialImage){
    if(typeof game.socialImage!=='string'||!/^\/(?!\/)/.test(game.socialImage)||/[?#\\]/.test(game.socialImage)||game.socialImage.split('/').includes('..')||! /\.(png|jpe?g|webp)$/i.test(game.socialImage))throw new Error('Social image must be a local PNG, JPEG or WebP path.');
    await readFile(join(sourceDir,game.socialImage.slice(1))).catch(()=>{throw new Error('Configured social image does not exist.');});
  }
  await rm(outputDir,{recursive:true,force:true});await mkdir(outputDir,{recursive:true});
  await cp(sourceDir,outputDir,{recursive:true});
  await listFiles(outputDir);
  if(analytics.enabled){
    const path=join(outputDir,'_headers'),headers=await readFile(path,'utf8');
    if(!/connect-src\s+'self'/.test(headers))throw new Error('Analytics requires a same-origin connect-src policy to extend.');
    await writeFile(path,headers.replace(/connect-src\s+[^;]+/,"connect-src 'self' "+analytics.host));
  }
  const pages=[];let templateRoot=false;
  for(const file of await htmlFiles(outputDir)) {
    const pathname=relative(outputDir,file).replaceAll('\\','/');
    const canonical=canonicalPath(pathname);
    if(pathname!=='404.html')pages.push(canonical);
    const meta=[
      publisher?'<meta name="google-adsense-account" content="'+publisher+'">':'',
      origin&&pathname!=='404.html'?'<link rel="canonical" href="'+attr(origin+canonical)+'">':'',
      origin&&pathname==='index.html'?'<meta property="og:url" content="'+attr(origin+'/')+'">':''
    ].filter(Boolean).join('\n  ');
    const sourceHtml=await readFile(file,'utf8');
    if(pathname==='index.html'&&sourceHtml.includes('data-game-template'))templateRoot=true;
    let html=gameHtml(sourceHtml,game).replace('<!-- SITE_META -->',meta);
    if(origin)html=html.replace(/(<meta property="og:image" content=")(\/[^"<>]+)(")/g,(_,start,path,end)=>start+attr(origin+path)+end);
    await writeFile(file,html);
  }
  if(templateRoot&&game){
    const manifestPath=join(outputDir,'manifest.webmanifest');
    const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
    Object.assign(manifest,{name:game.name,short_name:game.name,description:game.description??'',background_color:game.palette.paper,theme_color:game.palette.ink});
    await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
  }
  if(publisher)await writeFile(join(outputDir,'ads.txt'),'google.com, '+publisher.replace('ca-','')+', DIRECT, f08c47fec0942fa0\n');
  if(origin) {
    await writeFile(join(outputDir,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+pages.map(page=>'<url><loc>'+attr(origin+page)+'</loc></url>').join('')+'</urlset>\n');
    await writeFile(join(outputDir,'robots.txt'),'User-agent: *\nAllow: /\nSitemap: '+origin+'/sitemap.xml\n');
  }
  return {outputDir,adsEnabled:config.adsense?.enabled===true,hasPublisher:Boolean(publisher)};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {const result=await buildSite();console.log('Built static site: '+result.outputDir+' · ads '+(result.adsEnabled?'configured; consent required':'disabled'));}
  catch(error){console.error(error.message);process.exitCode=1;}
}

