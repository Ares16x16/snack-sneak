import {readFile,writeFile,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildSite} from './build.mjs';
import {checkBuild} from './check-build.mjs';
import {headersForPath} from './headers.mjs';
import {listFiles} from './files.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const attribute=value=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
export async function buildPages({siteURL,sourceDir=join(root,'public'),outputDir=join(root,'dist-pages')}={}){
 let site;try{site=new URL(siteURL);}catch{throw new Error('Supply the public Pages URL with --url.');}
 if(site.protocol!=='https:'||site.username||site.password||site.search||site.hash||!/^\/(?:[A-Za-z0-9_-][A-Za-z0-9._-]*\/)*[A-Za-z0-9_-][A-Za-z0-9._-]*\/?$|^\/$/.test(site.pathname))throw new Error('Pages URL must be HTTPS with a plain project path and no credentials, query or fragment.');
 if(!site.pathname.endsWith('/'))site.pathname+='/';
 const basePath=site.pathname;
 await buildSite({sourceDir,outputDir});
 await checkBuild({directory:outputDir});
 const headers=await readFile(join(outputDir,'_headers'),'utf8');
 const pages=[];
 for(const file of await listFiles(outputDir)){
  if(!file.endsWith('.html'))continue;
  const route=basePath+file.replace(/(^|\/)index\.html$/,'$1');
  let html=await readFile(join(outputDir,file),'utf8');
  html=html.replace(/<link\s+rel="canonical"[^>]*>/gi,'').replace(/<meta\s+property="og:url"[^>]*>/gi,'');
  html=html.replace(/\b(href|src)=(['"])(\/(?!\/)[^'"]*)\2/gi,(_,name,quote,path)=>name+'='+quote+basePath+path.slice(1)+quote);
  // Social crawlers require absolute image URLs, including the repository path.
  html=html.replace(/(<meta\s+(?:property|name)="(?:og:image|twitter:image)"\s+content=")([^"]*)(")/gi,(_,start,value,end)=>{
   const path=new URL(value,site.origin).pathname;
   return start+attribute(site.origin+basePath+path.replace(/^\//,''))+end;
  });
  const csp=headersForPath(headers,'/'+file)['Content-Security-Policy']?.split(';').filter(rule=>!/^\s*(frame-ancestors|report-uri|report-to|sandbox)\b/i.test(rule)).join(';');
  const metadata=[csp?'<meta http-equiv="Content-Security-Policy" content="'+attribute(csp)+'">':'','<meta name="referrer" content="strict-origin-when-cross-origin">'];
  if(file!=='404.html'){
   pages.push(route);
   metadata.push('<link rel="canonical" href="'+attribute(site.origin+route)+'">');
   if(file==='index.html')metadata.push('<meta property="og:url" content="'+attribute(site.href)+'">');
  }
  // Place CSP before stylesheet/script requests.
  html=html.replace(/<head>/i,'<head>'+metadata.join('\n'));
  await writeFile(join(outputDir,file),html);
 }
 const manifestFile=join(outputDir,'manifest.webmanifest');
 const manifest=JSON.parse(await readFile(manifestFile,'utf8'));
 manifest.start_url=basePath;manifest.scope=basePath;
 for(const icon of manifest.icons??[])if(icon.src?.startsWith('/')&&!icon.src.startsWith('//'))icon.src=basePath+icon.src.slice(1);
 await writeFile(manifestFile,JSON.stringify(manifest,null,2)+'\n');
 const configFile=join(outputDir,'site-config.json'),config=JSON.parse(await readFile(configFile,'utf8'));
 config.site.url=site.origin;
 await writeFile(configFile,JSON.stringify(config,null,2)+'\n');
 await writeFile(join(outputDir,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+pages.map(path=>'<url><loc>'+attribute(site.origin+path)+'</loc></url>').join('')+'</urlset>\n');
 await writeFile(join(outputDir,'robots.txt'),'User-agent: *\nAllow: '+basePath+'\nSitemap: '+site.href+'sitemap.xml\n');
 await writeFile(join(outputDir,'.nojekyll'),'');
 await rm(join(outputDir,'_headers'));
 return checkBuild({directory:outputDir,basePath,htmlExtension:true,headersRequired:false});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 try{
  if(args.length!==2||args[0]!=='--url')throw new Error('Usage: npm run build:pages -- --url https://USERNAME.github.io/REPOSITORY/');
  const result=await buildPages({siteURL:args[1]});
  console.log('Pages build checked: '+result.files.length+' files in dist-pages/');
  for(const warning of result.warnings)console.log('Setup: '+warning.message);
 }catch(error){console.error(error.message);process.exitCode=1;}
}
