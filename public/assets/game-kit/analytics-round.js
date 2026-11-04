export function createRoundTracker(analytics,{now=()=>performance.now(),randomId=()=>crypto.randomUUID()}={}){
 let run=null,playedEpoch=null;
 const valid=()=>run?.tracked&&analytics.allowed()&&analytics.epoch()===run.epoch;
 const seconds=()=>Math.max(0,run.total+(run.running?Math.max(0,now()-run.since):0))/1000;
 function emit(event,extra={}){if(valid())analytics.capture(event,{...run.properties,...extra,run_id:run.id,active_seconds:seconds()});}
 function abandon(reason='page_leave',properties={}){if(!run)return;emit('game_abandon',{...properties,reason});run=null;}
 return {
  start(properties={}){
   if(run)abandon('restart');
   const tracked=analytics.allowed();run={properties:{...properties},tracked,epoch:analytics.epoch(),id:tracked?randomId():null,total:0,since:now(),running:true,lastProgress:0};
   if(playedEpoch===run.epoch)emit('game_replay');emit('game_start');if(tracked)playedEpoch=run.epoch;
  },
  pause(){if(!run?.running)return;emit('game_pause');run.total+=Math.max(0,now()-run.since);run.running=false;},
  resume(){if(!run||run.running)return;run.since=now();run.running=true;emit('game_resume');},
  progress(properties={}){if(!run?.running||!valid())return;const elapsed=seconds();if(elapsed-run.lastProgress>=10){run.lastProgress=elapsed;emit('game_progress',properties);}},
  finish(properties={}){if(!run)return;emit('game_end',properties);run=null;},
  share(channel,properties={}){analytics.capture('share_click',{...properties,channel});},
  abandon
 };
}
