import './analytics.js';
import {loadGameConfig} from './config.js';
import {menuItems} from './menu-model.js';
const menus=[...document.querySelectorAll('[data-game-menu]')];
if(menus.length){
 const config=await loadGameConfig().catch(()=>null);
 function translate(){
  const language=document.documentElement.lang,label=language.startsWith('zh')?'遊戲':'Games';
  for(const menu of menus){
   const summary=menu.querySelector('summary');summary.textContent=label;
   const nav=menu.querySelector('nav');nav.setAttribute('aria-label',label);
   if(config)nav.replaceChildren(...menuItems(config,language).map(item=>{
    const link=document.createElement('a');link.href=item.href;link.textContent=item.name;
    if(new URL(item.href,location.origin).pathname===location.pathname)link.setAttribute('aria-current','page');
    return link;
   }));
  }
 }
 for(const menu of menus){
  menu.addEventListener('keydown',event=>{
   if([' ','Enter','Escape'].includes(event.key))event.stopPropagation();
   if(event.key==='Escape'){menu.open=false;menu.querySelector('summary').focus();event.preventDefault();}
  });
  menu.addEventListener('click',event=>{if(event.target.closest('a'))menu.open=false;});
 }
 document.addEventListener('pointerdown',event=>{for(const menu of menus)if(!menu.contains(event.target))menu.open=false;});
 new MutationObserver(translate).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});translate();
}
