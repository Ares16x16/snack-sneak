import {normalizeLanguage,browserLanguage} from './locale.js';
import {analytics} from './analytics.js';
import {createRoundTracker} from './analytics-round.js';
const tracking=createRoundTracker(analytics);
import {localPath} from './site-path.js';
import {challengeDate,readChallenge,challengeLink} from './challenge.js';
import {gameText} from './config.js';
import {shareMessage} from './share-model.js';
import {createSharePanel} from './share-panel.js';
const copy={en:{daily:'Daily challenge',practice:'Practice',start:'Start playing',pause:'Pause',resume:'Resume',restart:'Start again',again:'One more try',share:'Share score',paused:'Take a breather.',time:'TIME LEFT',score:'SCORE',best:'Your best',target:'Score to beat',dailyNote:'Resets at HK midnight',practiceNote:'Replay keeps this run.'},'zh-Hant':{daily:'每日挑戰',practice:'練習模式',start:'開始遊戲',pause:'暫停',resume:'繼續',restart:'重新開始',again:'再玩一次',share:'分享成績',paused:'抖一抖先。',time:'剩餘時間',score:'分數',best:'個人最佳',target:'挑戰目標',dailyNote:'香港午夜更新',practiceNote:'再玩會保留同一關。'}};
copy['zh-HK']=copy['zh-Hant'];
copy['zh-TW']={...copy['zh-Hant'],start:'開始遊戲',again:'再玩一次',share:'分享',practiceNote:'重新遊玩保留相同關卡。',paused:'休息一下。'};
export function arcadeText(language,key){return (copy[language]??(language.startsWith('zh')?copy['zh-Hant']:copy.en))[key]??copy.en[key]??key;}
export function mountArcade({config,game}){
 const $=id=>document.getElementById('kit-'+id),params=new URLSearchParams(location.search);
 const linked=readChallenge(params,{gameId:config.challengeId});
 let storage;try{storage=localStorage;}catch{storage=null;}
 const get=(key,fallback)=>{try{return storage?.getItem('arcade:'+config.id+':'+key)??fallback;}catch{return fallback;}};
 const put=(key,value)=>{try{storage?.setItem('arcade:'+config.id+':'+key,String(value));}catch{}};
 const preferred=get('language',browserLanguage(navigator.language));
 let language=normalizeLanguage(linked.language,normalizeLanguage(preferred)),mode=linked.mode,date=linked.date,runId=linked.runId,screen='idle',run;
 let held=false,presses=0,last=performance.now(),accumulator=0;
 const canvas=$('canvas'),context=canvas.getContext('2d'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
 const t=key=>arcadeText(language,key),format=n=>new Intl.NumberFormat(language).format(n);
 const sharing=createSharePanel({root:$('sharing'),trigger:$('share'),config,onStatus:message=>{$('message').textContent=message;},onAction:channel=>tracking.share(channel,{game_id:config.id,mode,language})});
 const bestKey=()=>mode==='daily'?'best:'+date:'best:practice';
 const best=()=>{const raw=get(bestKey(),'0');return /^\d{1,5}$/.test(raw)?Number(raw):0;};
 for(const [key,color] of Object.entries(config.palette))document.documentElement.style.setProperty('--'+({accent:'red',secondary:'teal'}[key]??key),color);
 function clearInput(){held=false;presses=0;$('action').setAttribute('aria-pressed','false');}
 function refresh(){
  for(const item of ['daily','practice']){$(item).textContent=t(item);$(item).setAttribute('aria-selected',String(item===mode));$(item).disabled=screen==='running'||screen==='paused';$(item).tabIndex=item===mode?0:-1;}
  $('seed').textContent='';$('seed').hidden=true;$('best').textContent=t('best')+': '+format(best());
  const match=linked.target!==null&&(linked.mode==='practice'?mode==='practice'&&runId===linked.runId:mode==='daily'&&date===linked.linkedDate);$('target').hidden=!match;if(match)$('target').textContent=t('target')+': '+format(linked.target);
  $('time').textContent=Math.max(0,Math.ceil((run?.duration??config.roundSeconds)-(run?.elapsed??0)));$('score').textContent=format(run?.score??0);
 }
 function setScreen(value){
  screen=value;document.body.dataset.screen=value;
  $('start-layer').hidden=value!=='idle';$('pause-layer').hidden=value!=='paused';$('result').hidden=value!=='result';
  $('stage').hidden=value==='result';$('pause').hidden=value!=='running';$('action').hidden=value!=='running';refresh();
 }
 function makeRun(){return game.create(mode==='practice'?'practice:'+runId:'daily:'+date,config);}
 function randomId(){const bytes=new Uint8Array(8);crypto.getRandomValues(bytes);return Array.from(bytes,n=>n.toString(16).padStart(2,'0')).join('');}
 function start(){
  if(!context)return;if(mode==='daily'&&!linked.linkedDate)date=challengeDate();if(mode==='practice')runId??=randomId();
  analytics.play();tracking.start({game_id:config.id,mode,language});run=makeRun();clearInput();sharing.reset();accumulator=0;last=performance.now();$('message').textContent='';setScreen('running');canvas.focus({preventScroll:true});
 }
 function pause(){if(screen!=='running')return;tracking.pause();clearInput();accumulator=0;setScreen('paused');$('resume').focus({preventScroll:true});}
 function resume(){if(screen!=='paused')return;tracking.resume();clearInput();last=performance.now();setScreen('running');canvas.focus({preventScroll:true});}
 function result(){
  const data=game.result(run,language);data.score=Number.isFinite(data.score)?Math.max(0,Math.min(99999,Math.floor(data.score))):0;
  $('result-title').textContent=data.title;$('final-score').textContent=format(data.score);$('final-detail').textContent=(data.stats??[]).map(s=>s.value+' '+s.label).join(' · ');
  const url=challengeLink({origin:location.origin,path:localPath('/'),gameId:config.challengeId,mode,date,runId,score:data.score,language});
  let snapshot;try{snapshot=structuredClone(run);}catch{snapshot={...run};}
  sharing.setResult({...data,mode,date:mode==='daily'?date:t('practice'),url,message:shareMessage(config,data,language)},{language,drawArtwork:c=>game.draw(c,snapshot,{reduced:true,colors:config.palette})});
  return data;
 }
 function finish(){clearInput();setScreen('result');const data=result();tracking.finish({score:data.score,reason:run.reason??(run.elapsed>=run.duration-.001?'time':'completed'),round_seconds:run.elapsed});put(bestKey(),Math.max(best(),data.score));refresh();$('result').focus({preventScroll:true});}
 function translate(){
  document.documentElement.lang=language;document.title=config.name;
  for(const e of document.querySelectorAll('[data-game-name]'))e.textContent=config.name;
  $('tagline').textContent=gameText(config.tagline,language,config.description);$('instructions').textContent=gameText(config.instructions,language,config.description);
  canvas.setAttribute('aria-label',gameText(config.instructions,language,config.name));
  for(const [id,key] of Object.entries({start:'start',pause:'pause',resume:'resume',restart:'restart',replay:'again',share:'share',paused:'paused','time-label':'time','score-label':'score'}))$(id).textContent=t(key);
  $('action').textContent=gameText(config.action,language,'TAP');$('language').value=language;
  refresh();if(screen==='result')result();
 }
 for(const id of ['start','replay','restart'])$(id).addEventListener('click',start);
 $('pause').addEventListener('click',pause);$('resume').addEventListener('click',resume);
 $('language').addEventListener('change',()=>{language=normalizeLanguage($('language').value);put('language',language);translate();});
 for(const item of ['daily','practice']){
  $(item).addEventListener('click',()=>{if(screen==='running'||screen==='paused')return;mode=item;runId=item==='practice'?linked.runId:null;run=makeRun();sharing.reset();setScreen('idle');});
  $(item).addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){$(item==='daily'?'practice':'daily').click();$(mode).focus();event.preventDefault();}});
 }
 for(const node of [canvas,$('action')]){
  node.addEventListener('pointerdown',event=>{if(screen!=='running')return;event.preventDefault();held=true;presses++;node.setPointerCapture(event.pointerId);$('action').setAttribute('aria-pressed','true');});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])node.addEventListener(type,()=>{held=false;$('action').setAttribute('aria-pressed','false');});
 }
 document.addEventListener('keydown',event=>{
  if(event.target instanceof HTMLInputElement||event.target.tagName==='SELECT'||event.ctrlKey||event.metaKey||event.altKey)return;
  if(['KeyP','Escape'].includes(event.code)&&(screen==='running'||screen==='paused')){event.preventDefault();screen==='running'?pause():resume();return;}
  if(!['Space','Enter'].includes(event.code)||event.code==='Enter'&&event.target!==$('action'))return;
  if(event.target instanceof HTMLButtonElement&&event.target!==$('action'))return;
  if(screen==='idle'){event.preventDefault();start();return;}
  if(screen==='running'){event.preventDefault();if(!event.repeat)presses++;held=true;}
 });
 document.addEventListener('keyup',event=>{if(['Space','Enter'].includes(event.code))held=false;});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});window.addEventListener('blur',pause);
 function frame(now){
  const dt=Math.min((now-last)/1000,.1);last=now;
  if(screen==='running'){
   accumulator+=dt;
   while(accumulator>=1/120&&run.status==='running'){run=game.step(run,{held,presses},1/120)??run;presses=0;accumulator-=1/120;}
   tracking.progress({score:run.score});refresh();if(run.status==='finished')finish();
  }
  if(context&&screen!=='result')game.draw(context,run,{idle:screen==='idle',reduced:reduced.matches,colors:config.palette});
  requestAnimationFrame(frame);
 }
 window.addEventListener('pagehide',event=>{if(event.persisted)tracking.pause();else tracking.abandon('page_leave',{score:run?.score??0});});
 run=makeRun();translate();setScreen('idle');if(!context)$('start').disabled=true;requestAnimationFrame(frame);
}
