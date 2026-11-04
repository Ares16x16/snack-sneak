import {bossPhase,currentFood,FOODS} from './engine.js';
import {drawFood,drawBite,drawCrumbs,drawSlurp} from './food-art.js';
const C={paper:'#faf6e9',ink:'#173e37',teal:'#2f6d5c',red:'#c63826',gold:'#f4c75b',skin:'#e1ab7d',wall:'#e9eee1'};
function oval(c,x,y,rx,ry,color){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();}
function box(c,x,y,w,h,r,fill,stroke){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=3;c.stroke();}}
function line(c,points,color=C.ink,width=3){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();}
function fallbackFood(c,type) {
 c.save();
 if(type==='tart'){
  c.beginPath();for(let i=0;i<40;i++){const a=i/40*Math.PI*2,r=i%2?89:99;const x=Math.cos(a)*r,y=Math.sin(a)*r*.62;i?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();c.fillStyle='#c88942';c.fill();c.strokeStyle=C.ink;c.lineWidth=4;c.stroke();
  oval(c,0,-8,79,44,'#f4c75b');oval(c,-23,-20,31,12,'#ffe5a0');
 } else if(type==='bun') {
  oval(c,0,0,103,68,'#cb873a');oval(c,0,-14,98,63,'#efba57');
  c.save();c.beginPath();c.ellipse(0,-14,96,61,0,0,7);c.clip();
  for(let i=-3;i<=3;i++){line(c,[[i*35-80,-90],[i*35+80,70]],'#be8437',3);line(c,[[i*35+80,-90],[i*35-80,70]],'#be8437',3);}
  c.restore();
 } else if(type==='toast') {
  box(c,-96,-64,192,100,16,'#bf742d',C.ink);box(c,-87,-70,174,85,13,'#e5a442',C.ink);
  box(c,-29,-61,58,20,4,'#ffe2a0');line(c,[[-65,-30],[58,-30]],'#b8752f',5);
 } else if(type==='noodles') {
  oval(c,0,22,109,54,C.paper);oval(c,0,-8,108,34,'#b78042');
  line(c,[[-90,41],[-52,59],[48,59],[90,41]],'#517c99',5);
  for(let i=0;i<8;i++){c.beginPath();c.moveTo(-78+i*20,-4);c.bezierCurveTo(-89+i*20,-36,-62+i*20,-33,-72+i*20,5);c.strokeStyle=C.gold;c.lineWidth=4;c.stroke();}
  box(c,-69,-31,51,20,8,'#875230');box(c,14,-28,53,20,8,'#875230');
 } else {
  c.beginPath();c.moveTo(-98,18);c.lineTo(0,-81);c.lineTo(98,18);c.closePath();c.fillStyle='#ffefcc';c.fill();c.strokeStyle=C.ink;c.lineWidth=3;c.stroke();
  line(c,[[-88,21],[88,21]],'#dea183',9);line(c,[[-84,30],[84,30]],C.gold,9);line(c,[[-83,40],[83,40]],'#ffefcc',13);
 }
 c.restore();
}
function hand(c,x,y,mirror,lift,grip){
 c.save();c.translate(x,y-lift*.85);c.scale(mirror?-1:1,1);c.rotate(-grip*.06);
 box(c,-43,-17,87,37,17,C.skin,C.ink);
 // The thumb wraps over the snack; separated finger creases read as a grip.
 c.beginPath();c.moveTo(17,-14);c.bezierCurveTo(30,-27-grip*4,55,-28,64,-13);
 c.quadraticCurveTo(71,-2,61,13);c.quadraticCurveTo(56,22,42,20);
 c.lineTo(19,17);c.closePath();c.fillStyle=C.skin;c.fill();c.strokeStyle=C.ink;c.lineWidth=3;c.stroke();
 c.beginPath();c.moveTo(26,-12);c.bezierCurveTo(29,-32-grip*3,47,-35,52,-22);
 c.quadraticCurveTo(54,-13,44,-8);c.strokeStyle=C.ink;c.lineWidth=3;c.stroke();
 line(c,[[48,1],[62,3]],'#b77c56',2);line(c,[[45,10],[58,13]],'#b77c56',2);
 box(c,-79,-25,52,53,7,C.teal,C.ink);line(c,[[-39,-18],[-39,21]],'#4c8b74',3);c.restore();
}
function boss(c,phase,time,reduced) {
 const alert=phase==='watching'||phase==='caught',turn=phase==='warning';
 c.save();c.translate(590,199);
 if(phase==='caught'&&!reduced)c.translate(Math.sin(time*70)*3,0);
 box(c,-86,54,179,153,25,C.teal,C.ink);
 box(c,-56,88,122,120,10,C.paper);line(c,[[-43,67],[-43,105],[53,105],[53,67]],'#d4dccb',6);
 // Phone and sleeves stay in the physical café scene.
 c.save();c.translate(105,113);c.rotate(alert?-.65:.15);box(c,-23,-52,55,89,9,'#284b42',C.ink);box(c,-15,-40,38,61,4,'#b7d5c2');line(c,[[-8,-22],[14,-22]],C.paper,5);line(c,[[-8,-8],[8,-8]],C.paper,5);oval(c,0,36,29,20,C.skin);c.restore();
 oval(c,0,2,80,79,C.skin);
 oval(c,-79,12,12,18,C.skin);oval(c,78,12,12,18,C.skin);
 if(alert) {
  oval(c,-29,-7,19,24,'#fffaf0');oval(c,29,-7,19,24,'#fffaf0');
  oval(c,-26,-5,7,11,C.ink);oval(c,25,-5,7,11,C.ink);
  line(c,[[-50,-37],[-13,-25]],C.ink,8);line(c,[[13,-25],[50,-37]],C.ink,8);
 } else {
  const shift=turn?5:13;
  oval(c,-25,-7,17,15,'#fffaf0');oval(c,31,-7,17,15,'#fffaf0');
  oval(c,-25+shift,-5,6,8,C.ink);oval(c,31+shift,-5,6,8,C.ink);
  line(c,[[-43,-31],[-12,-34]],C.ink,7);line(c,[[18,-34],[46,-31]],C.ink,7);
 }
 oval(c,6,20,11,7,'#c9885f');
 if(phase==='caught'){oval(c,0,48,24,20,C.ink);box(c,-17,34,34,10,3,C.paper);}
 else {line(c,[[-14,47],[18,47]],C.ink,5);line(c,[[-27,32],[-6,41],[2,36],[10,41],[29,32]],C.ink,5);}
 // The tall baker's hat makes his turning silhouette unmistakable.
 box(c,-73,-90,146,30,10,C.paper,C.ink);
 oval(c,-49,-103,39,31,C.paper);oval(c,0,-116,43,39,C.paper);oval(c,49,-103,39,31,C.paper);
 line(c,[[-72,-78],[72,-78]],'#d4dccb',3);
 if(alert){c.fillStyle=C.red;c.font='400 55px "Changa One",sans-serif';c.textAlign='center';c.fillText('!',111,-79);}
 c.restore();
}
export function drawScene(c,run,{idle=false,reduced=false,time=0}={}) {
 c.clearRect(0,0,820,500);c.fillStyle=C.wall;c.fillRect(0,0,820,500);
 box(c,44,38,245,157,12,C.paper,C.teal);c.fillStyle=C.teal;c.textAlign='center';c.font='900 35px "PingFang TC","Microsoft JhengHei",sans-serif';c.fillText('好運冰室',166,103);c.font='400 23px "Changa One",sans-serif';c.fillText('GOOD LUCK CAFÉ',166,148);
 box(c,335,45,80,76,8,'#d4ddca');oval(c,375,84,27,27,C.paper);line(c,[[375,64],[375,84],[391,91]],C.ink,3);
 c.fillStyle='#d4dccb';c.fillRect(0,284,820,16);
 const phase=idle?'away':bossPhase(run);boss(c,phase,time,reduced);
 c.fillStyle='#d2a972';c.fillRect(0,337,820,163);c.fillStyle='#e8c694';c.fillRect(0,337,820,18);
 line(c,[[0,462],[820,462]],'#bb905e',2);
 oval(c,275,438,151,40,'#b98e58');oval(c,275,419,151,46,'#fffaf0');oval(c,275,419,123,34,'#f1e8d7');
 const eating=!idle&&run.held&&!run.needsRelease&&(phase==='away'||phase==='warning');
 const snack=currentFood(run),progress=run.foodBites/snack.bites,age=run.elapsed-run.lastBiteAt;
 const pulse=!reduced&&eating&&age>=0&&age<.22?Math.sin(age/.22*Math.PI):0;
 const lift=snack.type==='noodles'?0:pulse*21,grip=eating?(reduced?0:.35+pulse*.65):0;
 const arriving=!idle&&!reduced&&run.foodBites===0&&run.snacks>0&&age>=0&&age<.22&&!run.needsRelease;
 const entry=arriving?.82+.18*Math.min(1,age/.18):1;
 oval(c,275,430,86-lift*.6,13-lift*.2,'#92704933');
 c.save();c.translate(275,430-lift);c.rotate(pulse*Math.sin(run.bites*2)*.035);
 c.scale(entry*(1+pulse*.045),entry*(1-pulse*.025));drawFood(c,snack.type,progress,fallbackFood);c.restore();
 hand(c,94+grip*8,428,false,lift,grip);hand(c,456-grip*8,428,true,lift,grip);
 if(snack.type==='noodles'&&eating){c.save();c.translate(275,430);drawSlurp(c,reduced?-1:age,reduced?0:pulse);c.restore();}
 // Physical "display only" tag. Its prohibition is the joke, not an instruction panel.
 c.save();c.translate(98,288);c.rotate(-.06);box(c,-68,-27,136,57,5,C.paper,C.red);c.fillStyle=C.red;c.textAlign='center';c.font='700 18px "DM Sans",sans-serif';c.fillText('DO NOT EAT',0,-2);c.font='700 11px "DM Sans",sans-serif';c.fillText('MANAGEMENT',0,16);c.restore();
 if(!idle&&!reduced&&phase!=='caught'&&age>=0&&age<.38){
  const completed=run.foodBites===0&&run.snacks>0;
  const bitten=completed?FOODS[(run.foodIndex-1+FOODS.length)%FOODS.length]:snack;
  const eaten=completed?1:progress;
  c.save();c.translate(275,430-lift);
  drawBite(c,bitten.type,eaten,1/bitten.bites,age,fallbackFood);
  drawCrumbs(c,bitten.type,eaten,age,run.bites);c.restore();
 }
}
export function drawReview(c,result,{title,detail,language,date}) {
 c.fillStyle=C.paper;c.fillRect(0,0,1080,1350);
 c.fillStyle=C.ink;c.fillRect(0,0,1080,140);c.fillStyle=C.paper;c.textAlign='center';c.font='400 64px "Changa One",sans-serif';c.fillText('SNACK SNEAK',540,94);
 c.fillStyle=C.red;c.font=language.startsWith('zh')?'900 58px "PingFang TC",sans-serif':'400 64px "Changa One",sans-serif';c.fillText(title,540,260,965);
 c.fillStyle=C.ink;c.font='400 165px "Changa One",sans-serif';c.fillText(String(result.score),540,449);
 c.font='700 26px "DM Sans","PingFang TC",sans-serif';c.fillText(detail,540,512,950);
 c.save();c.translate(40,570);c.scale(1000/820,1000/820);
 drawResultScene(c,result);c.restore();
 c.fillStyle=C.ink;c.font='700 25px "DM Sans",sans-serif';c.fillText(date,540,1250);
 c.fillStyle=C.red;c.font='700 26px "DM Sans","PingFang TC",sans-serif';c.fillText(language==='zh-HK'?'你張評核會靚啲咩？':language.startsWith('zh')?'你的工作評核會比較好嗎？':'Your performance review could be worse. Try it.',540,1304,960);
}
export function drawResultScene(c,result){
 const r={elapsed:0,caughtUntil:result.strikes>=3?1:0,looks:[],held:false,needsRelease:false,foodIndex:result.foodIndex,foodBites:0,lastBiteAt:-100};
 drawScene(c,r,{idle:false,reduced:true,time:0});
}

