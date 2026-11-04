// Replace this module to create a different game. Keep the four exports.
// State is plain serializable data. Input: {held:boolean, presses:number}.
export function create(seed,config){
 return {seed,name:config.name,duration:config.roundSeconds,elapsed:0,status:'running',score:0,taps:0,lastTap:-100};
}
export function step(state,input,seconds){
 if(state.status!=='running'||!Number.isFinite(seconds)||seconds<=0)return state;
 state.elapsed=Math.min(state.duration,state.elapsed+Math.min(seconds,1/30));
 if(input.presses>0){const taps=Math.min(10,Math.floor(input.presses));state.taps+=taps;state.score+=taps*100;state.lastTap=state.elapsed;}
 if(state.elapsed>=state.duration)state.status='finished';return state;
}
export function result(state,language){
 return {score:state.score,title:language==='zh-HK'?'蓋印快手王。':language.startsWith('zh')?'蓋章高手。':'Officially overqualified.',stats:[{label:language.startsWith('zh')?'張訂單':'orders stamped',value:state.taps},{label:language.startsWith('zh')?'秒':'seconds',value:state.duration}]};
}
export function draw(c,state,{reduced=false,colors={}}={}){
 const ink=colors.ink??'#173e37',accent=colors.accent??'#c63826',paper=colors.paper??'#faf6e9';
 c.fillStyle='#e9eee1';c.fillRect(0,0,820,500);c.fillStyle=ink;c.fillRect(0,366,820,134);
 c.save();c.translate(410,229);c.rotate(-.025);
 c.fillStyle=paper;c.beginPath();c.roundRect(-171,-173,342,341,9);c.fill();
 c.textAlign='center';c.fillStyle=ink;c.font='700 23px "DM Sans",sans-serif';c.fillText(state.name,0,-126,300);
 c.font='500 15px "DM Sans",sans-serif';c.fillText('ORDER '+String(state.taps+1).padStart(3,'0'),0,-88);
 c.strokeStyle='#b7c3b0';c.lineWidth=3;
 for(let i=0;i<4;i++){c.beginPath();c.moveTo(-125,-48+i*31);c.lineTo(i%2?74:124,-48+i*31);c.stroke();}
 if(state.taps>0){
  const age=state.elapsed-state.lastTap,press=reduced?0:Math.max(0,1-age/.22);
  c.save();c.translate(0,57+press*10);c.rotate(-.11);c.strokeStyle=accent;c.lineWidth=5;c.strokeRect(-126,-31,252,72);c.fillStyle=accent;
  c.font='400 43px "Changa One",sans-serif';c.fillText('APPROVED',0,20);c.restore();
 }
 c.restore();c.textAlign='center';c.fillStyle=paper;c.font='400 40px "Changa One",sans-serif';c.fillText('ONE MORE ORDER.',410,449);
}
