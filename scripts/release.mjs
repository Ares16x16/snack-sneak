import {readFile,writeFile,mkdir,mkdtemp,rename,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildSite} from './build.mjs';
import {checkBuild} from './check-build.mjs';
import {zipDirectory} from './archive.mjs';
import {createGameProject} from './new-game.mjs';

const projectRoot=fileURLToPath(new URL('../',import.meta.url));
export async function releaseProject({sourceDir=join(projectRoot,'public'),outputDir=join(projectRoot,'dist'),artifactsDir=join(projectRoot,'artifacts'),includeStarter=true}={}){
 await buildSite({sourceDir,outputDir});const checked=await checkBuild({directory:outputDir});
 const config=JSON.parse(await readFile(join(outputDir,'game-config.json'),'utf8'));
 await mkdir(artifactsDir,{recursive:true});const scratch=await mkdtemp(join(artifactsDir,'.release-'));
 try{
  const packages={};
  async function archive(name,directory,prefix=''){
   const bytes=await zipDirectory(directory,{prefix});await writeFile(join(scratch,name),bytes);
   packages[name]={bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
  }
  await archive(config.id+'-static.zip',outputDir);
  if(includeStarter){
   const destination=join(scratch,'starter');await createGameProject({id:'game-starter',name:'Tap Sprint',destination});
   await archive('game-starter.zip',destination,'game-starter');
  }
  const report={createdAt:new Date().toISOString(),game:config.id,files:checked.files.length,routes:checked.routes,siteURL:checked.origin,warnings:checked.warnings,packages,published:false};
  await writeFile(join(scratch,'release.json'),JSON.stringify(report,null,2)+'\n');
  // All checks and archives are prepared before replacing any previous release.
  for(const name of [...Object.keys(packages),'release.json'])await rename(join(scratch,name),join(artifactsDir,name));
  return report;
 }finally{await rm(scratch,{recursive:true,force:true});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const report=await releaseProject();console.log('Release ready in artifacts/: '+Object.keys(report.packages).join(', '));for(const warning of report.warnings)console.log('Setup: '+warning.message);}
 catch(error){console.error(error.message);process.exitCode=1;}
}
