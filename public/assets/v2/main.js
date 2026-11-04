import {analytics} from '../game-kit/analytics.js';
import {createRoundTracker} from '../game-kit/analytics-round.js';
const tracking=createRoundTracker(analytics);
import {localPath} from '../game-kit/site-path.js';
import {createRun,stepRun,bossPhase,currentFood,summarizeRun,ROUND_SECONDS} from './engine.js';
import {drawScene,drawReview,drawResultScene} from './renderer.js';
import {foodArtReady} from './food-art.js';
import {text} from './i18n.js';
import {challengeDate,normalizeChallenge,challengeLink} from '../game-kit/challenge.js';
import {loadGameConfig,validateGameConfig} from '../game-kit/config.js';
import {shareMessage} from '../game-kit/share-model.js';
import {createSharePanel} from '../game-kit/share-panel.js';
import {readBest,recordBest,getPreference,setPreference} from '../storage.js';
import {createAudio} from '../audio.js';

const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
let storage;try{storage=localStorage;}catch{storage=null;}
const preferred=getPreference(storage,'language',navigator.language.startsWith('zh')?'zh-Hant':'en');
let lang=['en','zh-Hant'].includes(params.get('lang'))?params.get('lang'):['en','zh-Hant'].includes(preferred)?preferred:'en';
const linkedDate=normalizeChallenge(params.get('challenge'));
const linkedPractice=/^[a-f0-9]{16}$/.test(params.get('run')??'')?params.get('run'):null;
let date=linkedDate??challengeDate(),mode=linkedPractice?'practice':'daily',practiceId=linkedPractice;
const target=/^\d{1,5}$/.test(params.get('target')??'')?Number(params.get('target')):null;
let screen='idle',run=createRun('daily:'+date),summary=null;
const canvas=$('snack-canvas'),ctx=canvas.getContext('2d'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
const pointers=new Set();let keyHeld=false,last=performance.now(),accumulator=0,lastBoss='',messageTimer;
const audio=createAudio();let sound=getPreference(storage,'sound','off')==='on';audio.setEnabled(sound);
const gameConfig=await loadGameConfig().catch(()=>validateGameConfig({id:'snack-sneak',challengeId:'v2',name:'Snack Sneak'}));
const sharing=createSharePanel({root:$('result-sharing'),trigger:$('share-review'),config:gameConfig,onStatus:message=>say(message),onAction:channel=>tracking.share(channel,{game_id:gameConfig.id,mode,language:lang})});
const t=(key,values)=>text(lang,key,values);
const bestKey=()=>'boss-v2:'+(mode==='daily'?date:'practice');
const format=n=>new Intl.NumberFormat(lang==='en'?'en':'zh-Hant').format(n);
function say(message){$('snack-message').textContent=message;clearTimeout(messageTimer);messageTimer=setTimeout(()=>{$('snack-message').textContent='';},4500);}
function resetInput(){pointers.clear();keyHeld=false;$('eat-button').classList.remove('is-held');}
function soundState(){
 $('sound-button').setAttribute('aria-pressed',String(sound));$('sound-button').setAttribute('aria-label',t(sound?'soundOff':'soundOn'));
 $('sound-button').innerHTML=sound?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4zM17 8a6 6 0 0 1 0 8M19 5a10 10 0 0 1 0 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4zM17 9l4 6m0-6-4 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}
function refreshMode(){
 for(const value of ['daily','practice']){const button=$(value+'-mode');button.setAttribute('aria-selected',String(mode===value));button.disabled=screen==='running'||screen==='paused';button.tabIndex=mode===value?0:-1;}
 $('seed-note').textContent=mode==='daily'?t('dailyNote',{date}):t('practiceNote');
 const best=readBest(storage,bestKey());$('best').textContent=best?format(best):'—';
 const show=target!==null&&(linkedPractice?mode==='practice'&&practiceId===linkedPractice:linkedDate&&mode==='daily'&&date===linkedDate);
 $('target-note').hidden=!show;if(show)$('target-note').textContent=t('target',{score:format(target)});
}
function setScreen(next){
 screen=next;document.body.dataset.screen=next;
 $('start-layer').hidden=next!=='idle';$('pause-layer').hidden=next!=='paused';$('review-layer').hidden=next!=='result';
 $('pause-run').hidden=next!=='running';$('idle-tag').hidden=next==='running';
 $('hold-controls').hidden=next!=='running';$('reaction').hidden=next==='result';$('snack-game').querySelector('.snack-food').hidden=next==='result';
 refreshMode();
}
function language(){
 document.documentElement.lang=lang;
 lastBoss='';
 for(const element of document.querySelectorAll('[data-copy]'))element.textContent=t(element.dataset.copy);
 $('lang-button').textContent=lang==='en'?'繁中':'EN';$('lang-button').setAttribute('aria-label',lang==='en'?'切換至繁體中文':'Switch to English');
 canvas.setAttribute('aria-label',t('canvas'));soundState();refreshMode();renderHud();
 if(summary){renderResult();prepareImage();}
}
function randomId(){try{return Array.from(crypto.getRandomValues(new Uint8Array(8)),n=>n.toString(16).padStart(2,'0')).join('');}catch{return Math.random().toString(16).slice(2).padEnd(16,'0').slice(0,16);}}
function start(){
 if(!ctx)return;
 if(mode==='daily'&&!linkedDate)date=challengeDate();
 if(mode==='practice')practiceId??=randomId();
 run=createRun(mode==='daily'?'daily:'+date:'practice:'+practiceId);
 tracking.start({game_id:gameConfig.id,mode,language:lang});
 summary=null;sharing.reset();resetInput();accumulator=0;last=performance.now();lastBoss='';
 $('record-note').hidden=true;
 setScreen('running');audio.unlock();audio.play('start');canvas.focus({preventScroll:true});
 $('snack-game').scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});renderHud();
}
function pause(){if(screen!=='running')return;tracking.pause();resetInput();accumulator=0;setScreen('paused');$('resume-run').focus({preventScroll:true});}
function resume(){if(screen!=='paused')return;tracking.resume();resetInput();accumulator=0;lastBoss='';last=performance.now();setScreen('running');canvas.focus({preventScroll:true});}
function finish(){
 summary=summarizeRun(run);tracking.finish({score:summary.score,reason:summary.reason,round_seconds:summary.seconds,bites:summary.bites,snacks:summary.snacks,strikes:summary.strikes,near_misses:summary.nearMisses});const previous=readBest(storage,bestKey());recordBest(storage,bestKey(),summary.score);
 resetInput();setScreen('result');renderResult();$('record-note').hidden=summary.score<=previous;
 $('review-layer').focus({preventScroll:true});audio.play('end');prepareImage();
}
function renderResult(){
 $('review-title').textContent=t(summary.title);$('review-score').textContent=format(summary.score);$('review-detail').textContent=t('resultDetail',summary);
}
function renderHud(){
 $('remaining').textContent=Math.max(0,Math.ceil(ROUND_SECONDS-run.elapsed));
 $('strikes').textContent=run.strikes+' / 3';$('score').textContent=format(run.score);
 const phase=bossPhase(run);document.body.dataset.boss=phase;
 if(phase!==lastBoss){
  if(screen==='running'){
   $('accessible-cue').textContent=t('cue'+phase);
   if(phase==='warning'||phase==='watching')audio.play(phase);
  }
  lastBoss=phase;
 }
 $('look-text').textContent=t(phase==='away'?'safe':phase);
 const food=currentFood(run);$('food-name').textContent=t(food.type);
 $('food-count').textContent=t('foodProgress',{count:run.foodBites,total:food.bites});
 $('food-progress').style.transform='scaleX('+run.foodBites/food.bites+')';
 const held=pointers.size>0||keyHeld;
 $('eat-button').classList.toggle('is-held',held);
 $('eat-button').setAttribute('aria-pressed',String(held));
 $('eat-label').textContent=t(run.needsRelease?'hide':phase==='watching'?'handsOff':phase==='warning'?'hide':held?'eat':'hold');
 const event=run.event&&run.elapsed-run.event.at<1.8?run.event.key:run.needsRelease?'release':'eventDefault';
 if($('reaction').textContent!==t(event))$('reaction').textContent=t(event);
}
function chooseMode(value){
 if(screen==='running'||screen==='paused')return;
 mode=value;if(value==='practice')practiceId=linkedPractice??null;
 run=createRun('daily:'+date);
 summary=null;sharing.reset();resetInput();setScreen('idle');renderHud();
}
function getLink(){
 return challengeLink({origin:location.origin,path:localPath('/'),gameId:gameConfig.challengeId,mode,date,runId:practiceId,score:summary.score,language:lang});
}
async function prepareImage(){
 if(!summary)return;const snapshot={...summary},language=lang,title=t(summary.title),detail=t('resultDetail',summary),labelDate=mode==='daily'?date:t('practice');
 const stats=[{label:lang==='en'?'snacks':'份美食',value:snapshot.snacks},{label:lang==='en'?'bites':'啖',value:snapshot.bites},{label:lang==='en'?'close calls':'次驚險逃過',value:snapshot.nearMisses}];
 await sharing.setResult({...snapshot,title,detail,stats,mode,date:labelDate,url:getLink(),message:shareMessage(gameConfig,snapshot,lang)},{language,ready:foodArtReady,drawArtwork:c=>drawResultScene(c,snapshot),makePost:async()=>{
  await Promise.all([document.fonts?.ready,foodArtReady]);const card=document.createElement('canvas');card.width=1080;card.height=1350;
  drawReview(card.getContext('2d'),snapshot,{title,detail,date:labelDate,language});return new Promise((resolve,reject)=>card.toBlob(blob=>blob?resolve(blob):reject(new Error('Image unavailable')),'image/png'));
 }});
}
function frame(now){
 const dt=Math.min((now-last)/1000,.1);last=now;
 if(screen==='running'){
  accumulator+=dt;const beforeBites=run.bites,beforeStrikes=run.strikes,beforeSnacks=run.snacks;
  while(accumulator>=1/120&&run.status==='running'){stepRun(run,pointers.size>0||keyHeld,1/120);accumulator-=1/120;}
  if(run.strikes>beforeStrikes)audio.play('spill');else if(run.snacks>beforeSnacks)audio.play('end');else if(run.bites>beforeBites)audio.play('start');
  tracking.progress({score:run.score});renderHud();if(run.status==='finished')finish();
 }
 if(ctx)drawScene(ctx,run,{idle:screen==='idle',reduced:reduced.matches,time:screen==='idle'?now/1000:run.elapsed});
 requestAnimationFrame(frame);
}
$('start-run').addEventListener('click',start);$('again-run').addEventListener('click',start);$('restart-run').addEventListener('click',start);
$('pause-run').addEventListener('click',pause);$('resume-run').addEventListener('click',resume);
$('lang-button').addEventListener('click',()=>{lang=lang==='en'?'zh-Hant':'en';setPreference(storage,'language',lang);language();});
$('sound-button').addEventListener('click',()=>{sound=!sound;setPreference(storage,'sound',sound?'on':'off');audio.setEnabled(sound);soundState();if(sound)audio.play('start');});
for(const value of ['daily','practice']){
 const button=$(value+'-mode');button.addEventListener('click',()=>chooseMode(value));
 button.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();const next=value==='daily'?'practice':'daily';chooseMode(next);$(next+'-mode').focus();}});
}
for(const element of [canvas,$('eat-button')]){
 element.addEventListener('pointerdown',event=>{if(screen!=='running')return;event.preventDefault();pointers.add(event.pointerId);element.setPointerCapture(event.pointerId);audio.unlock();});
 const release=event=>pointers.delete(event.pointerId);
 element.addEventListener('pointerup',release);element.addEventListener('pointercancel',release);element.addEventListener('lostpointercapture',release);
}
$('eat-button').addEventListener('keydown',event=>{if(event.code==='Enter'&&screen==='running'){event.preventDefault();keyHeld=true;}});
$('eat-button').addEventListener('keyup',event=>{if(event.code==='Enter')keyHeld=false;});
document.addEventListener('keydown',event=>{
 if(event.target instanceof HTMLInputElement||event.ctrlKey||event.metaKey||event.altKey)return;
 if(['Escape','KeyP'].includes(event.code)&&(screen==='running'||screen==='paused')){event.preventDefault();screen==='running'?pause():resume();return;}
 if(event.code!=='Space')return;
 if(event.target instanceof HTMLButtonElement&&event.target.id!=='eat-button')return;
 if(screen==='idle'){event.preventDefault();start();return;}
 if(screen==='running'){event.preventDefault();keyHeld=true;}
});
document.addEventListener('keyup',event=>{if(event.code==='Space'||event.code==='Enter')keyHeld=false;});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});window.addEventListener('blur',pause);
window.addEventListener('pagehide',event=>{if(event.persisted)tracking.pause();else tracking.abandon('page_leave',{score:run.score});});
language();setScreen('idle');renderHud();if(!ctx)$('start-run').disabled=true;requestAnimationFrame(frame);

