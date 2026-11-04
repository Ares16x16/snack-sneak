import {decorateShareControl} from './share-icons.js';
import {shareLinks} from './share-model.js';
import {isPublicURL} from './challenge.js';
import {nativeShare,copyText} from './share-actions.js';
import {createCardBlob} from './share-card.js';
const copy={
 en:{heading:'Share score',intro:'',threads:'Threads',x:'X',whatsapp:'WhatsApp',instagram:'Instagram Story',native:'More apps',save:'Save image',copy:'Copy link',local:'Local preview. Publish to share.',storyTitle:'Instagram Story',storySteps:'Save the image and add it to your Story. Add the copied link with a Link sticker.',saveStory:'Save Story image',shareStory:'Share image',preparing:'Preparing images…',ready:'1080 × 1920',manual:'Copy this selected link:',copied:'Challenge link copied.',localCopied:'Copied. This preview link only works on this device.',cancelled:'Sharing cancelled.',handoff:'Finish sharing in your chosen app.',unsupported:'Use Save image and Copy link to share manually.',failed:'Couldn’t share. Save the image or copy the link.',imageFailed:'Image unavailable. Copy the link instead.',saved:'Image download started.',close:'Hide sharing',previewAlt:'Your score card for Instagram Stories'},
 'zh-Hant':{heading:'分享成績',intro:'',threads:'Threads',x:'X',whatsapp:'WhatsApp',instagram:'IG 限時動態',native:'更多 App',save:'儲存成績圖',copy:'複製連結',local:'本機預覽，發佈後先可分享。',storyTitle:'IG 限時動態',storySteps:'儲存圖片，加到限時動態，再用「連結」貼圖加上挑戰連結。',saveStory:'儲存限時動態圖',shareStory:'分享圖片',preparing:'準備圖片中…',ready:'1080 × 1920',manual:'請複製已選取嘅連結：',copied:'挑戰連結已複製。',localCopied:'預覽連結已複製，只可以喺呢部裝置開。',cancelled:'已取消分享。',handoff:'請喺你揀嘅 App 完成分享。',unsupported:'可以儲存圖片，再複製連結手動分享。',failed:'分享失敗，可以儲存圖片或複製連結。',imageFailed:'圖片未能匯出，可以複製連結。',saved:'已開始下載圖片。',close:'收起分享',previewAlt:'你嘅 Instagram 限時動態成績圖'}
};
copy['zh-HK']=copy['zh-Hant'];
copy['zh-TW']={...copy['zh-Hant'],instagram:'Instagram 限時動態',native:'更多應用程式',local:'本機預覽，發布後即可分享。',storyTitle:'Instagram 限時動態',storySteps:'儲存圖片並加入限時動態，再用連結貼圖附上挑戰連結。',saveStory:'儲存限時動態圖片',shareStory:'分享圖片',manual:'請複製選取的連結：',copied:'已複製挑戰連結。',localCopied:'已複製預覽連結，僅限這台裝置使用。',handoff:'請在選取的應用程式完成分享。',unsupported:'請儲存圖片並複製連結，手動分享。',failed:'分享失敗，請儲存圖片或複製連結。',imageFailed:'無法匯出圖片，請改用複製連結。',close:'收起分享',previewAlt:'你的 Instagram 限時動態成績圖'};
function element(tag,className,text){const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;}
function button(label,handler,className='share-quiet',icon){const e=element('button',className,label);if(icon)decorateShareControl(e,icon,label);e.type='button';e.addEventListener('click',handler);return e;}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
export function createSharePanel({root,trigger,config,onStatus=()=>{},onAction=()=>{},navigator:nav=globalThis.navigator}){
 let result=null,language='en',post=null,story=null,previewURL=null,version=0,open=false,storyOpen=false,largePreview=false;
 let postButton,storySave,storyShare,storyPreview,storyStatus,manualInput;
 const t=key=>(copy[language]??(language.startsWith('zh')?copy['zh-Hant']:copy.en))[key];
 function action(channel){try{onAction(channel);}catch{}}
 function status(key){onStatus(t(key));}
 function revoke(){if(previewURL){URL.revokeObjectURL(previewURL);previewURL=null;}}
 function display(){root.hidden=!open;trigger?.setAttribute('aria-expanded',String(open));}
 async function copyLink(){
  if(!result)return;action('copy_link');const current=version,url=result.url;
  const copied=await copyText(nav,url);
  if(current!==version)return;
  if(copied){status(isPublicURL(url)?'copied':'localCopied');return;}
  manualInput.hidden=false;manualInput.value=url;manualInput.focus();manualInput.select();status('manual');
 }
 async function share(file){
  if(!result)return;action('native');const current=version;
  const outcome=await nativeShare(nav,{file,title:config.name,text:result.message,...(isPublicURL(result.url)?{url:result.url}:{})});
  if(current!==version)return;
  status(outcome==='handed-off'?'handoff':outcome==='cancelled'?'cancelled':outcome==='unsupported'?'unsupported':'failed');
 }
 function render(){
  root.replaceChildren();root.className='game-share';root.setAttribute('role','region');root.setAttribute('aria-label',t('heading'));
  const heading=element('h3','share-heading',t('heading'));heading.tabIndex=-1;heading.id=root.id+'-heading';root.setAttribute('aria-labelledby',heading.id);
  root.append(heading);if(t('intro'))root.append(element('p','share-intro',t('intro')));
  const channels=element('div','share-channels'),links=shareLinks({message:result.message,url:result.url});
  for(const key of ['threads','x','whatsapp']){
   const link=element('a','share-channel',t(key));decorateShareControl(link,key,t(key));link.target='_blank';link.rel='noopener noreferrer';
   if(links[key]){link.href=links[key];link.addEventListener('click',()=>action(key));}else{link.setAttribute('aria-disabled','true');link.tabIndex=-1;}
   channels.append(link);
  }
  const instagram=button(t('instagram'),()=>{storyOpen=!storyOpen;if(storyOpen)action('instagram');storySection.hidden=!storyOpen;instagram.setAttribute('aria-expanded',String(storyOpen));},'share-channel','instagram');
  instagram.setAttribute('aria-expanded',String(storyOpen));instagram.setAttribute('aria-controls',root.id+'-story');channels.append(instagram);root.append(channels);
  if(!isPublicURL(result.url))root.append(element('p','share-preview-note',t('local')));
  const actions=element('div','share-tools');actions.append(button(t('copy'),copyLink,'share-quiet','copy'));
  postButton=button(t('save'),()=>{if(post){action('save_post');download(post,config.id+'-result.png');status('saved');}},'share-quiet','save');postButton.disabled=!post;actions.append(postButton);
  if(typeof nav?.share==='function')actions.append(button(t('native'),()=>share(post?new File([post],config.id+'-result.png',{type:'image/png'}):undefined),'share-quiet','native'));
  root.append(actions);manualInput=element('input','share-manual');manualInput.type='url';manualInput.readOnly=true;manualInput.hidden=true;manualInput.setAttribute('aria-label',t('copy'));root.append(manualInput);
  const storySection=element('section','share-story');storySection.id=root.id+'-story';storySection.hidden=!storyOpen;
  storySection.append(element('h4','',t('storyTitle')),element('p','',t('storySteps')));
  storyPreview=element('div','share-story-preview');storyStatus=element('p','share-image-status',story?t('ready'):t('preparing'));storyStatus.setAttribute('role','status');
  const storyActions=element('div','share-story-actions');storySave=button(t('saveStory'),()=>{if(story){action('save_story');download(story,config.id+'-story.png');status('saved');}},'share-solid','save');storySave.disabled=!story;
  storyShare=button(t('shareStory'),()=>{if(story)share(new File([story],config.id+'-story.png',{type:'image/png'}));},'share-channel','native');storyShare.disabled=!story;
  if(typeof nav?.share!=='function')storyShare.hidden=true;
  storyActions.append(storySave,storyShare,button(t('copy'),copyLink,'share-quiet','copy'));storySection.append(storyPreview,storyStatus,storyActions);root.append(storySection);
  root.append(button(t('close'),()=>{open=false;display();trigger?.focus();}));display();renderPreview();
 }
 function renderPreview(){
  if(!story||!storyPreview)return;revoke();previewURL=URL.createObjectURL(story);
  const image=new Image();image.src=previewURL;image.alt=t('previewAlt');image.width=1080;image.height=1920;
  const previewLabel=()=>language.startsWith('zh')?(largePreview?'縮細預覽':'放大預覽'):(largePreview?'Smaller preview':'Larger preview');
  const expand=button(previewLabel(),()=>{largePreview=!largePreview;storyPreview.classList.toggle('is-large',largePreview);expand.textContent=previewLabel();expand.setAttribute('aria-expanded',String(largePreview));});
  expand.setAttribute('aria-expanded',String(largePreview));storyPreview.classList.toggle('is-large',largePreview);storyPreview.replaceChildren(image,expand);
 }
 function readyState(){
  postButton.disabled=!post;storySave.disabled=!story;storyShare.disabled=!story;
  storyStatus.textContent=story?t('ready'):t('imageFailed');renderPreview();
 }
 trigger?.setAttribute('aria-controls',root.id);trigger?.setAttribute('aria-expanded','false');
 trigger?.addEventListener('click',()=>{open=!open;display();if(open)root.querySelector('h3')?.focus({preventScroll:true});});
 root.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();open=false;display();trigger?.focus();}});
 root.hidden=true;
 return {
  reset(){version++;result=null;post=null;story=null;open=false;storyOpen=false;largePreview=false;revoke();root.replaceChildren();display();},
  async setResult(value,{language:nextLanguage='en',drawArtwork,ready,makePost}={}){
   const current=++version;language=nextLanguage;result={...value,stats:(value.stats??[]).map(s=>({...s}))};post=null;story=null;revoke();render();
   const snapshot=result,options={language,url:snapshot.url,drawArtwork,ready};
   const images=await Promise.allSettled([
    makePost?Promise.resolve().then(()=>makePost(snapshot)):createCardBlob(config,snapshot,{...options,format:'post'}),
    createCardBlob(config,snapshot,{...options,format:'story'})
   ]);
   if(current!==version)return;
   post=images[0].status==='fulfilled'?images[0].value:null;story=images[1].status==='fulfilled'?images[1].value:null;readyState();
   if(!post||!story)status('imageFailed');
  }
 };
}
