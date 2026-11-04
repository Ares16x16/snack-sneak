import {localPath} from './site-path.js';
import {gameText} from './config.js';
import {isPublicURL} from './challenge.js';
export function menuItems(config,language='en'){
 const items=(Array.isArray(config.games)?config.games:[]).slice(0,12).flatMap(item=>{
  if(!item||typeof item.href!=='string')return [];
  const local=/^\/(?!\/)/.test(item.href)&&!/[?#\\]/.test(item.href)&&!item.href.split('/').includes('..');
  const name=gameText(item.name,language,'');
  return (local||isPublicURL(item.href))&&typeof name==='string'&&name.trim()? [{href:localPath(item.href),name:name.trim().slice(0,80)}]:[];
 });
 return items.length?items:[{href:localPath('/'),name:config.name}];
}
