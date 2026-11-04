export const ROUND_SECONDS=30;
export const WARNING_SECONDS=.7;
export const BITE_SECONDS=.22;
export const FOODS=[
  {type:'tart',bites:8},{type:'bun',bites:10},{type:'toast',bites:12},
  {type:'noodles',bites:14},{type:'sandwich',bites:10},{type:'noodles',bites:12}
];
function randomFrom(seed) {
  let h=2166136261;
  for(const c of String(seed))h=Math.imul(h^c.charCodeAt(0),16777619);
  return ()=>{h+=0x6D2B79F5;let t=Math.imul(h^(h>>>15),h|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
}
export function createRun(seed='practice') {
  const random=randomFrom(seed),looks=[];
  let at=3.1+random()*.3;
  while(at<29) {
    const duration=1+random()*.4;
    looks.push({at,duration});
    at+=duration+1.8+random()*1.15;
  }
  return {seed:String(seed),status:'running',elapsed:0,looks,held:false,needsRelease:false,
    strikes:0,caughtUntil:0,caughtLookIds:[],nearMissLookIds:[],nearMisses:0,
    lastBiteAt:-100,releasedAt:-100,biteClock:0,bites:0,foodBites:0,foodIndex:0,
    snacks:0,score:0,event:null};
}
export function bossPhase(run) {
  if(run.elapsed<run.caughtUntil)return 'caught';
  for(const look of run.looks) {
    if(run.elapsed>=look.at&&run.elapsed<look.at+look.duration)return 'watching';
    if(run.elapsed>=look.at-WARNING_SECONDS&&run.elapsed<look.at)return 'warning';
  }
  return 'away';
}
export function currentFood(run) {return FOODS[run.foodIndex%FOODS.length];}
export function stepRun(run,held,seconds) {
  if(run.status!=='running'||!Number.isFinite(seconds)||seconds<=0)return run;
  const dt=Math.min(seconds,1/30,ROUND_SECONDS-run.elapsed);
  run.elapsed=Math.min(ROUND_SECONDS,run.elapsed+dt);
  held=held===true;
  if(!held&&run.held)run.releasedAt=run.elapsed;
  run.held=held;
  if(!held)run.needsRelease=false;
  const lookIndex=run.looks.findIndex(look=>run.elapsed>=look.at&&run.elapsed<look.at+look.duration);
  if(lookIndex>=0&&!held&&!run.caughtLookIds.includes(lookIndex)&&!run.nearMissLookIds.includes(lookIndex)) {
    const look=run.looks[lookIndex];
    if(run.releasedAt>look.at-.32&&run.releasedAt<look.at&&run.lastBiteAt>look.at-1) {
      run.nearMissLookIds.push(lookIndex);run.nearMisses++;run.score+=60;
      run.event={key:'nearMiss',at:run.elapsed};
    }
  }
  const phase=bossPhase(run);
  if(held&&phase==='watching'&&!run.caughtLookIds.includes(lookIndex)) {
    run.caughtLookIds.push(lookIndex);run.strikes++;run.caughtUntil=run.elapsed+1;
    run.needsRelease=true;run.foodBites=0;run.biteClock=0;run.foodIndex++;run.score=Math.max(0,run.score-80);
    run.event={key:'caught'+((run.strikes-1)%3),at:run.elapsed};
  } else if(held&&!run.needsRelease&&(phase==='away'||phase==='warning')) {
    run.biteClock+=dt;
    while(run.biteClock>=BITE_SECONDS) {
      run.biteClock-=BITE_SECONDS;run.bites++;run.foodBites++;run.score+=10;run.lastBiteAt=run.elapsed;
      if(run.foodBites>=currentFood(run).bites) {
        run.foodBites=0;run.foodIndex++;run.snacks++;run.score+=120;
        run.event={key:'snack'+((run.foodIndex-1)%6),at:run.elapsed};
      }
    }
  } else run.biteClock=0;
  if(run.strikes>=3){run.status='finished';run.reason='caught';}
  else if(run.elapsed>=ROUND_SECONDS-.000001){run.elapsed=ROUND_SECONDS;run.status='finished';run.reason='time';}
  return run;
}
export function summarizeRun(run) {
  return {score:run.score,bites:run.bites,snacks:run.snacks,strikes:run.strikes,nearMisses:run.nearMisses,
    seconds:Math.round(run.elapsed*10)/10,foodIndex:run.foodIndex,seed:run.seed,reason:run.reason,
    title:run.nearMisses>=3?'legend':run.snacks>=5?'vacuum':run.strikes>=3?'fired':run.snacks>=2?'sneaky':'innocent'};
}

