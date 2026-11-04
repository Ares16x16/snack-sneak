export async function copyText(navigator,value){
 try{if(!navigator?.clipboard?.writeText)return false;await navigator.clipboard.writeText(value);return true;}catch{return false;}
}
export async function nativeShare(navigator,{file,title,text,url}){
 if(typeof navigator?.share!=='function')return 'unsupported';
 let payload={title,text,...(url?{url}:{})};
 if(file){
  try{if(!navigator.canShare?.({files:[file]}))return 'unsupported';}catch{return 'unsupported';}
  payload={title,text:[text,url].filter(Boolean).join('\n'),files:[file]};
 }
 try{await navigator.share(payload);return 'handed-off';}
 catch(error){return error?.name==='AbortError'?'cancelled':'failed';}
}
