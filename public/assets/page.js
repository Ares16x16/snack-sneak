import {localPath} from './game-kit/site-path.js';
import './ads.js';
const contact=document.querySelector('[data-contact]');
if(contact) {
  fetch(localPath('/site-config.json')).then(response=>response.json()).then(config=>{
    const email=config.site?.contactEmail;
    if(typeof email==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const link=document.createElement('a');link.href='mailto:'+email;link.textContent=email;
      contact.replaceChildren(link);
    }
  }).catch(()=>{});
}

