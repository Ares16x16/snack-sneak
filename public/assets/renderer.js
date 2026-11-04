import { clamp, objectPosition } from './engine.js';
const P = { paper:'#faf6e9', ink:'#173e37', teal:'#2f6d5c', red:'#c63826', yellow:'#f4c75b' };
function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  ctx.beginPath(); ctx.roundRect(x, y, width, height, radius);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2.5; ctx.stroke(); }
}
function ellipse(ctx, x, y, rx, ry, fill) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
}
function cup(ctx, type, fill, angle) {
  const green = type === 'matcha';
  ctx.save();
  ctx.beginPath(); ctx.moveTo(-42,-132); ctx.lineTo(42,-132); ctx.lineTo(31,0); ctx.quadraticCurveTo(0,10,-31,0); ctx.closePath();
  ctx.fillStyle = '#fffdf0'; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.translate(0, -70); ctx.rotate(-angle);
  ctx.fillStyle = green ? '#8aab72' : '#c68a54';
  ctx.fillRect(-90, 70 - 133 * clamp(fill,0,1), 180, 170);
  ctx.fillStyle = green ? '#a6c08f' : '#e3b889'; ctx.fillRect(-90,70 - 133 * clamp(fill,0,1),180,12);
  ctx.restore();
  ctx.strokeStyle = P.ink; ctx.lineWidth = 3; ctx.stroke();
  ctx.strokeStyle = green ? P.teal : P.red; ctx.lineWidth = 8; ctx.lineCap='round'; ctx.beginPath();ctx.moveTo(12,-133);ctx.lineTo(20,-180);ctx.stroke();
  ellipse(ctx,0,-132,45,9,P.paper); ctx.strokeStyle=P.ink;ctx.lineWidth=3;ctx.stroke();
  ellipse(ctx,1,-131,34,3,green ? '#9ab583' : '#ce9b70');
  roundRect(ctx,-23,-78,46,34,9,P.paper);
  ctx.strokeStyle=P.ink;ctx.lineWidth=2.3;ctx.beginPath();ctx.arc(-8,-63,2,0,Math.PI*2);ctx.arc(8,-63,2,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.arc(0,-59,6,.15,Math.PI-.15);ctx.stroke();
  ctx.fillStyle=P.ink;ctx.font='700 10px "DM Sans",sans-serif';ctx.textAlign='center';ctx.fillText(green?'MATCHA':'MILK TEA',0,-20);
  ctx.restore();
}
function tart(ctx) {
  ctx.save(); ctx.translate(0,-28);
  ctx.beginPath();
  for(let n=0;n<32;n++){const a=n/32*Math.PI*2;const r=n%2?44:49;const x=Math.cos(a)*r,y=Math.sin(a)*r*.57;n===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}
  ctx.closePath();ctx.fillStyle='#c78b42';ctx.fill();ctx.strokeStyle=P.ink;ctx.lineWidth=2.5;ctx.stroke();
  ellipse(ctx,0,-5,38,19,P.yellow);ctx.strokeStyle='#a96625';ctx.lineWidth=2;ctx.stroke();
  ellipse(ctx,-10,-10,17,6,'#ffe295');
  ctx.fillStyle=P.ink;ctx.beginPath();ctx.arc(-9,-3,1.8,0,7);ctx.arc(9,-3,1.8,0,7);ctx.fill();
  ctx.beginPath();ctx.arc(0,1,5,.2,Math.PI-.2);ctx.strokeStyle=P.ink;ctx.lineWidth=2;ctx.stroke();
  ctx.restore();
}

function backdrop(ctx, time, reducedMotion) {
  ctx.fillStyle='#e8efe3';ctx.fillRect(0,0,760,460);
  roundRect(ctx,50,56,168,188,68,'#c6d6c3');
  roundRect(ctx,60,66,148,168,60,'#f5eacb');
  ctx.strokeStyle='#b7c5ae';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(134,69);ctx.lineTo(134,234);ctx.moveTo(62,153);ctx.lineTo(207,153);ctx.stroke();
  roundRect(ctx,541,56,168,188,68,'#c6d6c3');
  roundRect(ctx,551,66,148,168,60,'#d6e2d0');
  ctx.strokeStyle='#b7c5ae';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(625,69);ctx.lineTo(625,234);ctx.moveTo(554,153);ctx.lineTo(697,153);ctx.stroke();
  roundRect(ctx,265,40,230,105,10,P.paper,P.teal);
  ctx.fillStyle=P.teal;ctx.textAlign='center';ctx.font='900 35px "PingFang TC","Microsoft JhengHei",sans-serif';ctx.fillText('大吉茶記',380,93);
  ctx.font='700 11px "DM Sans",sans-serif';ctx.letterSpacing='2px';ctx.fillText('GOOD LUCK CAFÉ',380,119);ctx.letterSpacing='0px';
  ctx.fillStyle='#d3ddca';ctx.fillRect(0,270,760,8);
  ctx.fillStyle='#eed9b0';ctx.fillRect(0,278,760,182);
  ctx.fillStyle='#e3c99c';ctx.fillRect(0,278,760,15);
  ctx.strokeStyle='#ddc395';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,410);ctx.lineTo(760,410);ctx.moveTo(190,293);ctx.lineTo(190,460);ctx.moveTo(570,293);ctx.lineTo(570,460);ctx.stroke();
  // A real café awning; its stripes are part of the storefront, not page decoration.
  ctx.fillStyle=P.paper;ctx.fillRect(0,0,760,25);
  for(let i=0;i<19;i++){const x=i*40;ctx.fillStyle=i%2?P.paper:P.red;ctx.fillRect(x,0,40,18);ctx.beginPath();ctx.arc(x+20,17,20,0,Math.PI);ctx.fill();}
  ctx.fillStyle='#f4edd9';ctx.globalAlpha=.75;
  for(let i=0;i<3;i++){const y=230-(reducedMotion?0:Math.sin(time*1.4+i)*4);ctx.beginPath();ctx.arc(335+i*42,y,7,Math.PI,0);ctx.fill();}
  ctx.globalAlpha=1;
}

function pigeon(ctx, time, size=1, stolen=null) {
  ctx.save();ctx.scale(size,size);
  const flap=Math.sin(time*22)*0.5;
  ctx.save();ctx.rotate(-.5+flap);ellipse(ctx,-20,-9,30,10,'#5e7189');ctx.restore();
  ctx.save();ctx.rotate(.5-flap);ellipse(ctx,20,-9,30,10,'#5e7189');ctx.restore();
  ellipse(ctx,0,1,24,19,'#889bb0');ellipse(ctx,14,-16,17,17,'#a8b8c4');
  ctx.fillStyle='#e49c3f';ctx.beginPath();ctx.moveTo(27,-20);ctx.lineTo(42,-13);ctx.lineTo(27,-9);ctx.fill();
  ellipse(ctx,19,-21,5,6,'#fff8e5');ellipse(ctx,21,-20,2.8,3.6,P.ink);
  ctx.strokeStyle=P.ink;ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(15,-30);ctx.lineTo(25,-27);ctx.stroke();
  ctx.strokeStyle=P.red;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-5,15);ctx.lineTo(-8,25);ctx.moveTo(8,15);ctx.lineTo(12,25);ctx.stroke();
  if(stolen){ctx.save();ctx.translate(-4,45);ctx.scale(.23,.23);stolen==='tart'?tart(ctx):cup(ctx,stolen,1,0);ctx.restore();}
  ctx.restore();
}
function fallingObjects(ctx,state,time) {
  for(const object of state.objects??[]) {
    const p=objectPosition(object,state.elapsed);
    if(p.y<-.12)continue;
    const age=state.elapsed-(object.resolvedAt??state.elapsed);
    if(object.resolved&&(age>0.8||!['shoo','stole'].includes(object.resolution)))continue;
    ctx.save();ctx.translate(380+p.x,20+p.y*365);
    if(object.resolved){ctx.translate(age*230*(object.x>0?1:-1),-age*260);ctx.globalAlpha=Math.max(0,1-age);}
    if(object.kind==='pigeon')pigeon(ctx,time,object.size??1,object.stolen);
    else if(object.kind==='tart'){ctx.scale(.72,.72);tart(ctx);}
    else {
      ellipse(ctx,0,0,23,23,P.yellow);ctx.strokeStyle='#a46b12';ctx.lineWidth=3;ctx.stroke();
      ctx.fillStyle=P.ink;ctx.textAlign='center';ctx.font='700 12px "DM Sans",sans-serif';ctx.fillText('TIP',0,4);
      ctx.strokeStyle='#fff2b0';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,17,3.7,5.3);ctx.stroke();
    }
    ctx.restore();
  }
}

export function drawScene(ctx, state, { idle=false, reducedMotion=false, time=0 }={}) {
  ctx.save();ctx.clearRect(0,0,760,460);backdrop(ctx,time,reducedMotion);
  const angle=idle?(reducedMotion?-.025:Math.sin(time*.8)*.025):state.angle;
  const x=380+(idle?0:state.playerX??0)*200,y=355;
  ellipse(ctx,x+angle*18,412,195,15,'#d4ba8b');
  if(!idle)fallingObjects(ctx,state,time);
  else {ctx.save();ctx.translate(650,190);pigeon(ctx,reducedMotion?0:time,.9);ctx.restore();}
  if(!idle && Math.abs(state.wind)>.65 && !reducedMotion) {
    const direction=Math.sign(state.wind);
    ctx.strokeStyle='#8fab94';ctx.lineWidth=3;ctx.lineCap='round';
    for(let i=0;i<4;i++){const px=(time*170*direction+i*190+1500)%900-70;const py=190+i*35;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+50*direction,py);ctx.stroke();}
  }
  ctx.translate(x,y);ctx.rotate(angle);ctx.scale(.8,.8);
  // Sleeves and hands underneath the tray.
  ctx.fillStyle=P.teal;ctx.beginPath();ctx.moveTo(-215,100);ctx.lineTo(-205,35);ctx.lineTo(-158,35);ctx.lineTo(-135,100);ctx.fill();
  ctx.beginPath();ctx.moveTo(135,100);ctx.lineTo(158,35);ctx.lineTo(205,35);ctx.lineTo(215,100);ctx.fill();
  roundRect(ctx,-209,9,59,37,16,'#d6a574',P.ink);roundRect(ctx,150,9,59,37,16,'#d6a574',P.ink);
  roundRect(ctx,-267,-7,534,31,15,P.teal,P.ink);
  roundRect(ctx,-255,-13,510,21,10,'#a8c6ad',P.ink);
  ctx.fillStyle='#c7d9b9';ctx.fillRect(-226,-8,452,5);
  for(const item of state.items) {
    const falling=!item.active;
    const age=falling?state.elapsed-item.lostAt:0;
    if(falling && age>1.2) continue;
    ctx.save();ctx.translate(item.x*247,falling?age*age*460:0);
    if(falling){ctx.rotate(Math.sign(item.x)*age*2);ctx.globalAlpha=Math.max(0,1-age*.7);}
    item.type==='tart'?tart(ctx):cup(ctx,item.type,falling?0:item.fill,angle);
    ctx.restore();
  }
  ctx.restore();
  if(!idle&&state.shoutPulse>0) {
    const progress=1-state.shoutPulse/.65;
    ctx.save();ctx.globalAlpha=1-progress;ctx.strokeStyle=P.red;ctx.lineWidth=5;
    ctx.beginPath();ctx.ellipse(x,275,60+progress*300,35+progress*165,0,Math.PI,Math.PI*2);ctx.stroke();
    ctx.translate(x,260-progress*80);ctx.rotate(-.1);
    ctx.font='400 58px "Changa One",sans-serif';ctx.textAlign='center';ctx.fillStyle=P.red;ctx.fillText('AIYA!',0,0);ctx.restore();
  }
  if(!idle&&state.toast?.points>0&&state.elapsed-state.toast.at<.9) {
    ctx.save();ctx.globalAlpha=1-(state.elapsed-state.toast.at)/.9;ctx.fillStyle=P.teal;ctx.font='400 38px "Changa One",sans-serif';ctx.textAlign='center';ctx.fillText('+'+state.toast.points,x,210-(state.elapsed-state.toast.at)*50);ctx.restore();
  }
}

export function drawShareCard(ctx, summary, { title, detail, date, language }) {
  ctx.fillStyle=P.paper;ctx.fillRect(0,0,1080,1350);
  ctx.fillStyle=P.ink;ctx.fillRect(0,0,1080,140);
  ctx.textAlign='center';ctx.fillStyle=P.paper;ctx.font='400 65px "Changa One",sans-serif';ctx.fillText('tray chaos.',540,93);
  ctx.fillStyle=P.teal;ctx.font='700 25px "DM Sans",sans-serif';ctx.fillText(language==='zh-HK'?'你張收工單':language.startsWith('zh')?'你的收工單':'YOUR SHIFT RECEIPT',540,210);
  ctx.fillStyle=P.red;ctx.font=(language.startsWith('zh')?'900 66px "PingFang TC",sans-serif':'400 68px "Changa One",sans-serif');
  ctx.fillText(title,540,307,950);
  ctx.fillStyle=P.ink;ctx.font='400 200px "Changa One",sans-serif';ctx.fillText(String(summary.score),540,510);
  ctx.font='700 27px "DM Sans","PingFang TC",sans-serif';ctx.fillText(detail,540,573,940);
  ctx.save();ctx.translate(70,630);ctx.scale(940/760,940/760);
  const state={angle:-.045,wind:0,elapsed:0,items:summary.items.map((item,index)=>({
    ...item,x:(index-1)*.48,lostAt:-3
  }))};
  drawScene(ctx,state,{idle:true,reducedMotion:true,time:0});ctx.restore();
  ctx.fillStyle=P.ink;ctx.font='700 25px "DM Sans","PingFang TC",sans-serif';ctx.fillText(date,540,1251);
  ctx.fillStyle=P.red;ctx.font='700 24px "DM Sans","PingFang TC",sans-serif';ctx.fillText(language==='zh-HK'?'你隻手定得過我？':language.startsWith('zh')?'你的手比我穩嗎？':'Steadier hands than mine? Your turn.',540,1302);
}

