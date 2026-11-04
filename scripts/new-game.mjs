import {cp,mkdir,readFile,writeFile,lstat,rename,rm,mkdtemp} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateGameConfig} from '../public/assets/game-kit/config.js';
const projectRoot=fileURLToPath(new URL('../',import.meta.url));
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export async function createGameProject({id,name,destination=join(projectRoot,'games',String(id))}){
 const defaults=JSON.parse(await readFile(join(projectRoot,'starter/game.config.json'),'utf8'));
 const config=validateGameConfig({...defaults,id,name:name??String(id).replaceAll('-',' '),challengeId:id});
 destination=resolve(destination);
 if(await lstat(destination).then(()=>true,error=>{if(error.code==='ENOENT')return false;throw error;}))throw new Error('Destination already exists; no files were changed.');
 await mkdir(dirname(destination),{recursive:true});const staging=await mkdtemp(join(dirname(destination),'.new-game-'));
 try{
  await mkdir(join(staging,'public/assets'),{recursive:true});await mkdir(join(staging,'scripts'));
  await cp(join(projectRoot,'public/assets/game-kit'),join(staging,'public/assets/game-kit'),{recursive:true});
  await cp(join(projectRoot,'public/assets/fonts'),join(staging,'public/assets/fonts'),{recursive:true});
  for(const name of ['favicon.svg','page.js','ads.js'])await cp(join(projectRoot,'public/assets',name),join(staging,'public/assets',name));
  for(const name of ['build.mjs','serve.mjs','headers.mjs','new-game.mjs','check-build.mjs','archive.mjs','release.mjs','smoke.mjs','files.mjs','build-pages.mjs'])await cp(join(projectRoot,'scripts',name),join(staging,'scripts',name));
  await cp(join(projectRoot,'starter'),join(staging,'starter'),{recursive:true});
  await cp(join(projectRoot,'.github'),join(staging,'.github'),{recursive:true});
  for(const name of ['.gitignore'])await cp(join(projectRoot,name),join(staging,name));
  for(const name of ['index.html','about.html','privacy.html','how-to-play.html','404.html']){
   const source=await readFile(join(projectRoot,'starter',name),'utf8');
   await writeFile(join(staging,'public',name),source.replaceAll('{{GAME_NAME}}',escape(config.name)).replaceAll('{{GAME_DESCRIPTION}}',escape(config.description)).replaceAll('{{GAME_INSTRUCTIONS}}',escape(config.instructions.en)));
  }
  await cp(join(projectRoot,'starter/game.js'),join(staging,'public/assets/game.js'));await cp(join(projectRoot,'starter/main.js'),join(staging,'public/assets/main.js'));
  await cp(join(projectRoot,'public/_headers'),join(staging,'public/_headers'));
  await writeFile(join(staging,'public/game-config.json'),JSON.stringify(config,null,2)+'\n');
  await writeFile(join(staging,'public/site-config.json'),JSON.stringify({site:{url:'',contactEmail:''},adsense:{enabled:false,publisherId:'',slotId:''}},null,2)+'\n');
  await writeFile(join(staging,'public/robots.txt'),'User-agent: *\nAllow: /\n');
  await writeFile(join(staging,'public/manifest.webmanifest'),JSON.stringify({name:config.name,short_name:config.name,start_url:'/',display:'standalone',background_color:config.palette.paper,theme_color:config.palette.ink},null,2)+'\n');
  const original=JSON.parse(await readFile(join(projectRoot,'package.json'),'utf8'));
  const pkg={name:id,version:'1.0.0',private:true,type:'module',description:config.description,engines:{node:'>=22'},scripts:{dev:'node scripts/serve.mjs',build:'node scripts/build.mjs','build:pages':'node scripts/build-pages.mjs',check:'npm run build && node scripts/check-build.mjs',release:'node scripts/release.mjs',smoke:'node scripts/smoke.mjs',preview:'node scripts/serve.mjs --dist','new-game':'node scripts/new-game.mjs','deploy:check':'npm run check && wrangler deploy --dry-run',deploy:'npm run check && wrangler deploy'},devDependencies:original.devDependencies};
  await writeFile(join(staging,'package.json'),JSON.stringify(pkg,null,2)+'\n');
  const lock=JSON.parse(await readFile(join(projectRoot,'package-lock.json'),'utf8'));lock.name=id;lock.packages[''].name=id;
  await writeFile(join(staging,'package-lock.json'),JSON.stringify(lock,null,2)+'\n');
  await writeFile(join(staging,'wrangler.jsonc'),JSON.stringify({$schema:'node_modules/wrangler/config-schema.json',name:id,compatibility_date:new Date().toISOString().slice(0,10),assets:{directory:'./dist',not_found_handling:'404-page'},send_metrics:false},null,2)+'\n');
  const readme=(await readFile(join(projectRoot,'starter/README.template'),'utf8')).replaceAll('{{GAME_NAME}}',config.name).replaceAll('{{GAME_ID}}',id);await writeFile(join(staging,'README.md'),readme);
  // Recheck before the atomic move; never replace an existing project.
  if(await lstat(destination).then(()=>true,error=>{if(error.code==='ENOENT')return false;throw error;}))throw new Error('Destination already exists.');
  await rename(staging,destination);return {destination,config};
 }catch(error){await rm(staging,{recursive:true,force:true});throw error;}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),id=args.shift();let name,destination;
 while(args.length){const flag=args.shift();if(flag==='--name')name=args.shift();else if(flag==='--out')destination=args.shift();else throw new Error('Unknown option: '+flag);}
 if(!id||id==='--help'){console.log('Usage: npm run new-game -- my-game --name "My Game" [--out path]');}
 else try{const result=await createGameProject({id,name,destination});console.log('Created '+result.destination+'\nEdit public/game-config.json and public/assets/game.js, then npm ci and npm run dev.');}catch(error){console.error(error.message);process.exitCode=1;}
}
