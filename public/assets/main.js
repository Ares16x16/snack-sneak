import {decorateShareControl} from './game-kit/share-icons.js';
import {normalizeLanguage,browserLanguage} from './game-kit/locale.js';
import {analytics} from './game-kit/analytics.js';
import {createRoundTracker} from './game-kit/analytics-round.js';
const tracking=createRoundTracker(analytics);
import { ROUND_SECONDS, FIXED_STEP, clamp, challengeDate, normalizeChallenge, createGame, stepGame, summarizeGame, upcomingEvent, shout } from './engine.js';
import { readBest, recordBest, getPreference, setPreference } from './storage.js';
import { translate } from './i18n.js';
import { drawScene } from './renderer.js';
import { createAudio } from './audio.js';
import { challengeLink, resultImage, downloadImage } from './share.js';

const $ = id => document.getElementById(id);
const params=new URLSearchParams(location.search);
let storage;
try { storage=localStorage; } catch { storage=null; }
const preferred=getPreference(storage,'language',browserLanguage(navigator.language));
let language=normalizeLanguage(params.get('lang'),normalizeLanguage(preferred));
const linkedDate=normalizeChallenge(params.get('challenge'));
let date=linkedDate ?? challengeDate();
const linkedRun=/^[a-f0-9]{16}$/.test(params.get('run')??'')?params.get('run'):null;
let mode=linkedRun?'practice':'daily';
let practiceRun=linkedRun;
const rawTarget=params.get('target');
const target=/^\d{1,5}$/.test(rawTarget??'')&&Number(rawTarget)<=99999?Number(rawTarget):null;
let phase='idle', state=createGame({seed:'daily:'+date}), summary=null, image=null, imageVersion=0;
let audioEnabled=getPreference(storage,'sound','off')==='on';
const audio=createAudio();audio.setEnabled(audioEnabled);
const canvas=$('game-canvas'), context=canvas.getContext('2d');
const motion=matchMedia('(prefers-reduced-motion: reduce)');
const keys=new Set();
let pointerInput=0, buttonInput=0, dragStart=null, messageTimeout, accumulator=0, previousTime=performance.now();
const t=(key,values)=>translate(language,key,values);
const setText=(node,text)=>{if(node.textContent!==String(text))node.textContent=String(text);};
const bestKey=()=>'rush-v2:'+(mode==='daily'?'daily:'+date:'practice');
const scoreFormat=value=>new Intl.NumberFormat(language==='en'?'en':'zh-Hant').format(value);

function announce(message) {
  $('live-message').textContent=message;
  clearTimeout(messageTimeout);
  messageTimeout=setTimeout(()=>{$('live-message').textContent='';},5500);
}
function refreshSound() {
  $('sound-toggle').setAttribute('aria-pressed',String(audioEnabled));
  $('sound-toggle').setAttribute('aria-label',t(audioEnabled?'soundOff':'soundOn'));
  $('sound-toggle').innerHTML=audioEnabled
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4zM17 8a6 6 0 0 1 0 8M19 5a10 10 0 0 1 0 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4zM17 9l4 6m0-6-4 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}
function updateBest() {
  const best=readBest(storage,bestKey());
  $('best-score').textContent=best?scoreFormat(best):'—';
}
function refreshMode() {
  for(const item of ['daily','practice']) {
    $('mode-'+item).setAttribute('aria-selected',String(mode===item));
    $('mode-'+item).tabIndex=mode===item?0:-1;
    $('mode-'+item).disabled=phase==='running'||phase==='paused';
  }
  $('mode-description').textContent='';$('mode-description').hidden=true;
  const matchingTarget=target!==null&&(linkedRun?mode==='practice'&&practiceRun===linkedRun:linkedDate&&mode==='daily'&&date===linkedDate);
  $('challenge-target').hidden=!matchingTarget;
  if(matchingTarget)$('challenge-target').textContent=t('target',{score:scoreFormat(target)});
  updateBest();
}
function applyLanguage() {
  document.documentElement.lang=language;
  for(const node of document.querySelectorAll('[data-i18n]')) {
    node.textContent=t(node.dataset.i18n);
    if(node.dataset.i18n==='controlsHint'||node.dataset.i18n==='littleBalance')node.style.whiteSpace='pre-line';
  }
  $('language-toggle').value=language;
  $('tilt-left').setAttribute('aria-label',t('tiltLeft'));
  $('tilt-right').setAttribute('aria-label',t('tiltRight'));
  $('pause-button').setAttribute('aria-label',t('pause'));
  canvas.setAttribute('aria-label',t('canvasLabel'));
  $('station-label').textContent=t(phase==='idle'?'ready':phase==='running'?'running':phase==='paused'?'paused':'finished');
  refreshMode();refreshSound();
  for(const [id,key,icon] of [['share-button','share','native'],['copy-button','copyChallenge','copy'],['download-button','saveImage','save']])decorateShareControl($(id),icon,t(key));
  if(summary){renderResult();prepareImage();}
}
function resetInput() {
  keys.clear();pointerInput=0;buttonInput=0;dragStart=null;
  $('tilt-left').classList.remove('is-held');$('tilt-right').classList.remove('is-held');
}
function setPhase(next) {
  phase=next;document.body.dataset.state=next;
  $('start-panel').hidden=next!=='idle';
  $('play-controls').hidden=next!=='running';
  $('result-bottom').hidden=next!=='result';
  $('pause-button').hidden=next!=='running';
  $('idle-duration').hidden=next==='running';
  $('pause-overlay').hidden=next!=='paused';
  $('result-overlay').hidden=next!=='result';
  $('station-label').textContent=t(next==='idle'?'ready':next==='running'?'running':next==='paused'?'paused':'finished');
  if(next!=='running')$('gust-notice').hidden=true;
  refreshMode();
}
function newPracticeRun() {
  try { return Array.from(crypto.getRandomValues(new Uint8Array(8)),value=>value.toString(16).padStart(2,'0')).join(''); }
  catch { return Math.random().toString(16).slice(2).padEnd(16,'0').slice(0,16); }
}
function startRound() {
  if(!context)return;
  if(mode==='daily'&&!linkedDate)date=challengeDate();
  if(mode==='practice')practiceRun??=newPracticeRun();
  state=createGame({seed:mode==='daily'?'daily:'+date:'practice:'+practiceRun,mode});
  analytics.play();tracking.start({game_id:'tray-chaos',mode,language});
  summary=null;image=null;imageVersion++;accumulator=0;previousTime=performance.now();resetInput();
  $('new-best').hidden=true;$('manual-share-link').hidden=true;
  setPhase('running');audio.unlock();audio.play('start');canvas.focus({preventScroll:true});
  if(matchMedia('(max-width:760px)').matches)$('game').scrollIntoView({behavior:motion.matches?'instant':'smooth',block:'start'});
  renderHud();
}
function pauseRound() {
  if(phase!=='running')return;
  tracking.pause();resetInput();accumulator=0;setPhase('paused');$('resume-button').focus({preventScroll:true});
}
function resumeRound() {
  if(phase!=='paused')return;
  tracking.resume();resetInput();accumulator=0;previousTime=performance.now();setPhase('running');canvas.focus({preventScroll:true});
}
function finishRound() {
  summary=summarizeGame(state);
  tracking.finish({score:summary.score,reason:summary.reason,round_seconds:summary.seconds,saved:summary.saved,best_combo:summary.bestCombo});
  const previousBest=readBest(storage,bestKey());
  recordBest(storage,bestKey(),summary.score);
  resetInput();setPhase('result');renderResult();
  $('new-best').hidden=summary.score<=previousBest;
  $('result-overlay').focus({preventScroll:true});
  audio.play('end');prepareImage();
}
function renderResult() {
  $('result-title').textContent=t(summary.title);
  $('result-score').textContent=scoreFormat(summary.score);
  $('result-detail').textContent=t('resultDetail',{...summary,...summary.stats});
}
async function prepareImage() {
  const version=++imageVersion;
  image=null;$('download-button').disabled=true;
  try {
    const blob=await resultImage(summary,{title:t(summary.title),detail:t('resultDetail',{...summary,...summary.stats}),date:mode==='daily'?date:t('practice'),language});
    if(version===imageVersion){image=blob;$('download-button').disabled=false;}
  } catch { if(version===imageVersion)announce(t('imageFailed')); }
}
function getLink() {
  return challengeLink({origin:location.origin,mode,seed:summary.seed,date,score:summary.score,language});
}
async function copyLink(track=true) {
  if(track)tracking.share('copy_link',{game_id:'tray-chaos',mode,language});
  const link=getLink();
  const field=$('manual-share-link');field.hidden=false;field.value=link;
  try {
    if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(link);announce(t('copied'));
  } catch {
    field.focus();field.select();announce(t('copyFallback'));
  }
}
async function shareResult() {
  if(!summary)return;
  tracking.share('native',{game_id:'tray-chaos',mode,language});
  const title='Tray Chaos',text=t('shareText',summary),url=getLink();
  try {
    if(image&&navigator.canShare) {
      const file=new File([image],'tray-chaos-'+(mode==='daily'?date:'practice')+'.png',{type:'image/png'});
      if(navigator.canShare({files:[file]})){await navigator.share({title,text:text+' '+url,files:[file]});return;}
    }
    if(navigator.share){await navigator.share({title,text,url});return;}
    await copyLink(false);
  } catch(error) {
    if(error.name==='AbortError')announce(t('shareCancelled'));
    else { announce(t('shareFailed'));const field=$('manual-share-link');field.hidden=false;field.value=url; }
  }
}
function renderHud() {
  const current=summarizeGame(state);
  setText($('time-left'),Math.ceil(ROUND_SECONDS-state.elapsed));
  $('saved-count').innerHTML=current.saved+'<span class="hud-slash"> / 3</span>';
  setText($('live-score'),phase==='idle'?0:scoreFormat(state.points));
  const combo=$('combo-count');combo.hidden=phase!=='running'||state.combo<2;combo.textContent=t('combo',{count:state.combo,multiplier:Math.min(4,1+Math.floor(state.combo/3))});
  $('shout-button').disabled=state.shoutCooldown>0;
  $('shout-label').textContent=state.shoutCooldown>0?Math.ceil(state.shoutCooldown)+'s':'AIYA!';
  $('time-progress').style.transform='scaleX('+Math.max(0,1-state.elapsed/ROUND_SECONDS)+')';
  const event=upcomingEvent(state);
  const notice=$('gust-notice');
  if(phase==='running'&&state.toast&&state.elapsed-state.toast.at<1.15){
    setText(notice,t(state.toast.key));notice.hidden=false;
  } else if(phase==='running'&&event&&event.at-state.elapsed<1.2) {
    const text=t(event.kind)+' · '+t(event.direction>0?'counterLeft':'counterRight');
    setText(notice,text);notice.hidden=false;
  } else notice.hidden=true;
}
function chooseMode(next) {
  if(phase==='running'||phase==='paused')return;
  mode=next;
  if(next==='practice')practiceRun=linkedRun??null;
  summary=null;image=null;imageVersion++;resetInput();
  state=createGame({seed:next==='daily'?'daily:'+date:'practice-preview',mode:next});
  setPhase('idle');renderHud();
}
function inputValue() {
  const keyboard=(keys.has('ArrowRight')||keys.has('KeyD')?1:0)-(keys.has('ArrowLeft')||keys.has('KeyA')?1:0);
  return keyboard||buttonInput||(dragStart!==null?clamp((pointerInput-state.playerX)*4,-1,1):0);
}
function frame(now) {
  const seconds=Math.min((now-previousTime)/1000,.12);
  previousTime=now;
  if(phase==='running') {
    accumulator+=seconds;
    const before=state.items.filter(item=>item.active).length;
    while(accumulator>=FIXED_STEP&&state.status==='running'){stepGame(state,inputValue(),FIXED_STEP);accumulator-=FIXED_STEP;}
    if(state.items.filter(item=>item.active).length<before)audio.play('spill');
    tracking.progress({score:state.points});renderHud();
    if(state.status==='finished')finishRound();
  }
  if(context)drawScene(context,state,{idle:phase==='idle',reducedMotion:motion.matches,time:phase==='idle'?now/1000:state.elapsed});
  requestAnimationFrame(frame);
}

canvas.tabIndex=0;
function triggerShout(){if(phase==='running'&&shout(state)){audio.play('shout');}}
$('shout-button').addEventListener('click',triggerShout);
$('start-button').addEventListener('click',startRound);
$('replay-button').addEventListener('click',startRound);
$('restart-button').addEventListener('click',startRound);
$('pause-button').addEventListener('click',pauseRound);
$('resume-button').addEventListener('click',resumeRound);
$('share-button').addEventListener('click',shareResult);
$('copy-button').addEventListener('click',()=>copyLink());
$('download-button').addEventListener('click',()=>{if(image){tracking.share('save_post',{game_id:'tray-chaos',mode,language});downloadImage(image,'tray-chaos-'+(mode==='daily'?date:'practice')+'.png');announce(t('downloading'));}});
$('language-toggle').addEventListener('change',()=>{language=normalizeLanguage($('language-toggle').value);setPreference(storage,'language',language);applyLanguage();});
$('sound-toggle').addEventListener('click',()=>{audioEnabled=!audioEnabled;audio.setEnabled(audioEnabled);setPreference(storage,'sound',audioEnabled?'on':'off');refreshSound();if(audioEnabled)audio.play('start');});
for(const choice of ['daily','practice']) {
  $('mode-'+choice).addEventListener('click',()=>chooseMode(choice));
  $('mode-'+choice).addEventListener('keydown',event=>{
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
      event.preventDefault();const next=choice==='daily'?'practice':'daily';chooseMode(next);$('mode-'+next).focus();
    }
  });
}
canvas.addEventListener('pointerdown',event=>{
  if(phase!=='running')return;
  event.preventDefault();dragStart=event.clientX;const bounds=canvas.getBoundingClientRect();pointerInput=clamp((event.clientX-bounds.left-bounds.width/2)/(bounds.width*.35),-.75,.75);canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove',event=>{
  if(dragStart===null||phase!=='running')return;
  const bounds=canvas.getBoundingClientRect();pointerInput=clamp((event.clientX-bounds.left-bounds.width/2)/(bounds.width*.35),-.75,.75);
});
const releasePointer=()=>{pointerInput=0;dragStart=null;};
canvas.addEventListener('pointerup',releasePointer);canvas.addEventListener('pointercancel',releasePointer);canvas.addEventListener('lostpointercapture',releasePointer);
for(const [id,direction] of [['tilt-left',-1],['tilt-right',1]]) {
  const button=$(id);
  button.addEventListener('pointerdown',event=>{
    if(phase!=='running')return;
    event.preventDefault();buttonInput=direction;button.classList.add('is-held');button.setPointerCapture(event.pointerId);
  });
  const release=()=>{buttonInput=0;button.classList.remove('is-held');};
  button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
  button.addEventListener('keydown',event=>{if((event.code==='Space'||event.code==='Enter')&&phase==='running'){event.preventDefault();buttonInput=direction;button.classList.add('is-held');}});
  button.addEventListener('keyup',event=>{if(event.code==='Space'||event.code==='Enter')release();});
}
document.addEventListener('keydown',event=>{
  if(event.target instanceof HTMLInputElement||event.target.tagName==='SELECT'||event.metaKey||event.ctrlKey||event.altKey)return;
  if((event.code==='Escape'||event.code==='KeyP')&&(phase==='running'||phase==='paused')){
    event.preventDefault();phase==='running'?pauseRound():resumeRound();return;
  }
  if(phase==='running'&&event.code==='Space'&&!event.repeat&&(event.target===canvas||event.target===document.body||event.target.id==='shout-button')){event.preventDefault();triggerShout();return;}
  if(phase==='running'&&['ArrowLeft','ArrowRight','KeyA','KeyD'].includes(event.code)){event.preventDefault();keys.add(event.code);}
});
document.addEventListener('keyup',event=>keys.delete(event.code));
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseRound();});
window.addEventListener('blur',pauseRound);
window.addEventListener('pagehide',event=>{if(event.persisted)tracking.pause();else tracking.abandon('page_leave',{score:state.points});});
applyLanguage();setPhase('idle');renderHud();
if(!context){$('start-button').disabled=true;announce(t('noCanvas'));}
requestAnimationFrame(frame);

