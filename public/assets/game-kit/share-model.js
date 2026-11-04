import {isPublicURL} from './challenge.js';
import {gameText} from './config.js';
const limit=(value,max)=>Array.from(String(value??'')).slice(0,max).join('');
export function shareMessage(config,result,language='en'){
 const template=gameText(config.share,language,'I scored {score} in {name}. Can you beat me?');
 return limit(template.replace(/\{(\w+)\}/g,(_,key)=>String(key==='name'?config.name:result[key]??'')),400);
}
export function shareLinks({message,url}){
 if(!isPublicURL(url))return {threads:null,x:null,whatsapp:null};
 const threads=new URL('https://www.threads.com/intent/post');threads.searchParams.set('text',limit(message,400));threads.searchParams.set('url',url);
 const x=new URL('https://twitter.com/intent/tweet');x.searchParams.set('text',limit(message,120));x.searchParams.set('url',url);
 const whatsapp=new URL('https://wa.me/');whatsapp.searchParams.set('text',limit(message,400)+'\n'+url);
 return {threads:threads.href,x:x.href,whatsapp:whatsapp.href};
}
