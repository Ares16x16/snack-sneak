import {localPath} from './game-kit/site-path.js';
export function canRequestAds(config, consentGranted) {
  return config?.enabled===true && consentGranted===true
    && /^ca-pub-\d{16}$/.test(config.publisherId??'') && /^\d{10}$/.test(config.slotId??'');
}

export function createAdAdapter(config, container, {document,window}=globalThis) {
  let consentGranted=false,requested=false,loaded=false,pushed=false;
  function showIfAllowed() {
    if(!loaded||!canRequestAds(config,consentGranted)){container.hidden=true;return;}
    try {
      container.hidden=false;
      if(!pushed){(window.adsbygoogle=window.adsbygoogle||[]).push({});pushed=true;}
    } catch {container.hidden=true;}
  }
  return granted=>{
    consentGranted=granted===true;
    if(!canRequestAds(config,consentGranted)){container.hidden=true;return;}
    if(requested){showIfAllowed();return;}
    requested=true;
    const unit=document.createElement('ins');
    unit.className='adsbygoogle';unit.style.display='block';
    unit.dataset.adClient=config.publisherId;unit.dataset.adSlot=config.slotId;
    unit.dataset.adFormat='auto';unit.dataset.fullWidthResponsive='true';
    container.append(unit);
    const script=document.createElement('script');script.async=true;script.crossOrigin='anonymous';
    script.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+config.publisherId;
    script.addEventListener('load',()=>{loaded=true;showIfAllowed();});
    script.addEventListener('error',()=>{container.hidden=true;});
    document.head.append(script);
  };
}

// A certified CMP integration supplies this signal after applying Google's
// consent requirements. Configuring a publisher ID alone never requests ads.
async function initialize() {
  const container=document.getElementById('ad-slot');
  if(!container)return;
  let config;
  try {config=(await (await fetch(localPath('/site-config.json'))).json()).adsense;}catch{return;}
  if(config?.enabled!==true)return;
  const consent=createAdAdapter(config,container,{document,window});
  window.addEventListener('traychaos:ads-consent',event=>consent(event.detail?.granted));
  window.dispatchEvent(new CustomEvent('traychaos:ads-ready'));
}
if(typeof document!=='undefined')initialize();

