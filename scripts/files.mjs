import {lstat,readdir} from 'node:fs/promises';
import {join} from 'node:path';

export async function listFiles(directory,prefix=''){
 const info=await lstat(join(directory,prefix));
 if(info.isSymbolicLink())throw new Error('Refusing symlink: '+(prefix||'source directory'));
 if(!info.isDirectory())throw new Error('Expected a directory: '+(prefix||'source directory'));
 const files=[];
 for(const entry of await readdir(join(directory,prefix),{withFileTypes:true})){
  const name=prefix+entry.name;
  if(entry.isSymbolicLink())throw new Error('Refusing symlink: '+name);
  if(entry.isDirectory())files.push(...await listFiles(directory,name+'/'));
  else if(entry.isFile())files.push(name);
  else throw new Error('Refusing non-regular source file: '+name);
 }
 return files.sort();
}
