const brands={threads:new URL('./icons/threads.svg',import.meta.url),x:new URL('./icons/x.svg',import.meta.url),whatsapp:new URL('./icons/whatsapp.svg',import.meta.url),instagram:new URL('./icons/instagram.svg',import.meta.url)};
const glyphs={
 copy:[['rect',{x:9,y:9,width:11,height:11,rx:2}],['path',{d:'M15 5V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h1'}]],
 save:[['path',{d:'M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4'}]],
 native:[['path',{d:'M12 15V3m-4 4 4-4 4 4M5 11v9h14v-9'}]]
};
export function decorateShareControl(control,name,label){
 let icon;
 if(brands[name]){icon=document.createElement('img');icon.src=brands[name].href;icon.alt='';icon.width=24;icon.height=24;icon.decoding='async';}
 else{
  icon=document.createElementNS('http://www.w3.org/2000/svg','svg');
  for(const [key,value] of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.7','stroke-linecap':'round','stroke-linejoin':'round'}))icon.setAttribute(key,value);
  for(const [tag,attributes] of glyphs[name]??[]){const part=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value] of Object.entries(attributes))part.setAttribute(key,value);icon.append(part);}
 }
 icon.setAttribute('class','share-icon');icon.setAttribute('aria-hidden','true');icon.setAttribute('focusable','false');
 const text=document.createElement('span');text.className='share-name';text.textContent=label;control.replaceChildren(icon,text);
}
