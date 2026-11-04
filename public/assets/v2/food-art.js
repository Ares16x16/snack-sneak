// A local sprite atlas supplies the food; the bite edge is real transparency.
const INK='#173e37',WIDTH=384,HEIGHT=320,BASE=280,DENSITY=2;
const foods={
 tart:{cell:0,width:232,height:140,inside:'#ffe6a0',crumb:'#bf7734'},
 bun:{cell:1,width:232,height:166,inside:'#fff0c6',crumb:'#bc7733'},
 toast:{cell:2,width:228,height:154,inside:'#ffe7a8',crumb:'#ad6b30'},
 noodles:{cell:3,width:238,height:184,inside:'#e6b859',crumb:'#9f613c'},
 broth:{cell:4,width:238,height:184,inside:'#d8a658',crumb:'#9f613c'},
 sandwich:{cell:5,width:230,height:160,inside:'#fff0d3',crumb:'#d99562'}
};
let atlas=null,atlasVersion=0,bounds={},cachedKey='',pieceKey='';
let cutout=null,piece=null,noodleLayer=null;
function layer(){
 const canvas=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(WIDTH*DENSITY,HEIGHT*DENSITY):document.createElement('canvas');
 canvas.width=WIDTH*DENSITY;canvas.height=HEIGHT*DENSITY;return canvas;
}
function measure(image){
 const sheet=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(image.width,image.height):document.createElement('canvas');
 sheet.width=image.width;sheet.height=image.height;
 const c=sheet.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0);
 const pixels=c.getImageData(0,0,image.width,image.height).data,cw=Math.floor(image.width/3),ch=Math.floor(image.height/2);
 for(const [type,food] of Object.entries(foods)){
  const left=Math.round(food.cell%3*cw),top=Math.round(Math.floor(food.cell/3)*ch);
  // Ignore a neighboring sprite's stray edge at a cell boundary. The largest
  // connected silhouette is the food, rather than every nontransparent pixel.
  const seen=new Uint8Array(cw*ch),queue=new Int32Array(cw*ch);let best=null;
  for(let start=0;start<seen.length;start++){
   if(seen[start])continue;seen[start]=1;
   const sx=start%cw,sy=Math.floor(start/cw);
   if(pixels[((top+sy)*image.width+left+sx)*4+3]<80)continue;
   let head=0,tail=1,x1=sx,x2=sx,y1=sy,y2=sy;queue[0]=start;
   while(head<tail){
    const at=queue[head++],x=at%cw,y=Math.floor(at/cw);
    x1=Math.min(x1,x);x2=Math.max(x2,x);y1=Math.min(y1,y);y2=Math.max(y2,y);
    const neighbors=[x>0?at-1:-1,x<cw-1?at+1:-1,y>0?at-cw:-1,y<ch-1?at+cw:-1];
    for(const next of neighbors){
     if(next<0||seen[next])continue;seen[next]=1;
     const nx=next%cw,ny=Math.floor(next/cw);
     if(pixels[((top+ny)*image.width+left+nx)*4+3]>=80)queue[tail++]=next;
    }
   }
   if(!best||tail>best.count)best={count:tail,x:x1,y:y1,w:x2-x1+1,h:y2-y1+1};
  }
  if(best)bounds[type]={x:left+best.x,y:top+best.y,w:best.w,h:best.h};
 }
}
export const foodArtReady=new Promise(resolve=>{
 if(typeof Image==='undefined'){resolve(false);return;}
 const image=new Image();image.decoding='async';
 image.onload=()=>{try{measure(image);atlas=image;atlasVersion++;resolve(true);}catch{resolve(false);}};
 image.onerror=()=>resolve(false);image.src=new URL('./food-atlas.png',import.meta.url).href;
});
function dimensions(type){
 const f=foods[type]??foods.tart,b=bounds[type];
 if(!b)return {w:f.width,h:f.height};
 const scale=Math.min(f.width/b.w,f.height/b.h);return {w:b.w*scale,h:b.h*scale};
}
// The diagonal edge starts at the upper-left crust, then advances through the
// food. Small uneven tooth impressions stay connected to that outside edge.
function edgeX(y,p,w,h){
 const t=Math.max(0,Math.min(1,(y+h)/h));
 return -w*.60+w*1.05*p+w*.15*Math.sin(t*Math.PI);
}
function biteEdge(c,p,w,h,close=false){
 const top=-h-24,bottom=24,step=26;
 c.beginPath();c.moveTo(edgeX(top,p,w,h),top);
 for(let y=top;y<bottom;y+=step){
  const next=Math.min(y+step,bottom),middle=(y+next)/2;
  c.quadraticCurveTo(edgeX(middle,p,w,h)+5+Math.sin(y*.17)*1.5,middle,edgeX(next,p,w,h),next);
 }
 if(close){c.lineTo(-WIDTH/2,bottom);c.lineTo(-WIDTH/2,top);c.closePath();}
}
function sprite(c,type){
 const b=bounds[type],{w,h}=dimensions(type);
 c.drawImage(atlas,b.x,b.y,b.w,b.h,-w/2,-h,w,h);
}
function noodles(c,progress){
 // The ceramic bowl never gets eaten. Only the noodle heap settles into the
 // matching broth sprite; the front lip remains in front of the food.
 sprite(c,'broth');if(progress>=1)return;
 noodleLayer??=layer();const n=noodleLayer.getContext('2d');n.resetTransform();n.clearRect(0,0,noodleLayer.width,noodleLayer.height);
 n.setTransform(DENSITY,0,0,DENSITY,WIDTH/2*DENSITY,BASE*DENSITY);
 const {w}=dimensions('noodles'),bowl=dimensions('broth'),lip=-bowl.h*.43;
 n.save();n.beginPath();n.ellipse(0,-bowl.h*.68,w*.438,bowl.h*.23,0,0,Math.PI*2);n.clip();
 sprite(n,'noodles');n.restore();
 c.save();c.translate(0,lip);c.scale(1,1-progress*.9);c.translate(0,-lip);
 c.drawImage(noodleLayer,-WIDTH/2,-BASE,WIDTH,HEIGHT);c.restore();
}
function paint(canvas,type,progress,fallback){
 const c=canvas.getContext('2d');c.resetTransform();c.clearRect(0,0,canvas.width,canvas.height);
 c.setTransform(DENSITY,0,0,DENSITY,WIDTH/2*DENSITY,BASE*DENSITY);
 c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
 if(type==='noodles'&&atlas&&bounds.noodles&&bounds.broth){noodles(c,progress);return;}
 const f=foods[type]??foods.tart,{w,h}=dimensions(type),b=bounds[type];
 if(atlas&&b)c.drawImage(atlas,b.x,b.y,b.w,b.h,-w/2,-h,w,h);
 else {c.save();c.translate(0,-45);fallback(c,type);c.restore();}
 if(type==='noodles')return;
 if(progress<=0)return;
 if(progress>=1){c.resetTransform();c.clearRect(0,0,canvas.width,canvas.height);return;}
 // The exposed crumb/filling follows the cut. source-atop keeps it inside
 // the sprite, so neither frosting nor flakes can paint over the scenery.
 c.globalCompositeOperation='source-atop';
 biteEdge(c,progress,w,h);c.lineWidth=16;c.strokeStyle=f.inside;c.stroke();
 for(let i=0;i<20;i++){
  const y=-h+i*h/19,x=edgeX(y,progress,w,h)+4+(i%3)*2;
  c.fillStyle=i%3?f.crumb:f.inside;
  c.beginPath();c.moveTo(x,y);c.lineTo(x+3+(i%2)*2,y+1);c.lineTo(x+1,y+4);c.closePath();c.fill();
 }
 biteEdge(c,progress,w,h);c.lineWidth=2.2;c.strokeStyle=INK;c.stroke();
 c.globalCompositeOperation='destination-out';biteEdge(c,progress,w,h,true);c.fill();
 c.globalCompositeOperation='source-over';
}
function prepared(type,progress,fallback){
 cutout??=layer();const p=Math.max(0,Math.min(1,progress));
 const key=type+':'+p.toFixed(4)+':'+atlasVersion;
 if(key!==cachedKey){paint(cutout,type,p,fallback);cachedKey=key;}
 return cutout;
}
export function drawFood(c,type,progress,fallback){
 c.drawImage(prepared(type,progress,fallback),-WIDTH/2,-BASE,WIDTH,HEIGHT);
}
export function drawBite(c,type,progress,biteSize,age,fallback){
 if(type==='noodles'||age<0||age>.3)return;
 piece??=layer();
 const key=type+':'+progress.toFixed(4)+':'+biteSize+':'+atlasVersion;
 if(key!==pieceKey){
  paint(piece,type,Math.max(0,progress-biteSize),fallback);
  const p=piece.getContext('2d');p.resetTransform();p.globalCompositeOperation='destination-out';
  p.drawImage(prepared(type,progress,fallback),0,0);p.globalCompositeOperation='source-over';pieceKey=key;
 }
 // A morsel follows the player's implied mouth below the camera, then vanishes.
 const travel=age/.3;c.save();c.translate(18*travel,72*travel*travel);
 c.rotate(-.18*travel);c.scale(1-.5*travel,1-.5*travel);c.globalAlpha=1-travel*travel;
 c.drawImage(piece,-WIDTH/2,-BASE,WIDTH,HEIGHT);c.restore();
}
export function drawCrumbs(c,type,progress,age,biteNumber){
 if(type==='noodles'||age<0||age>.38)return;
 const f=foods[type]??foods.tart,{w,h}=dimensions(type),origin=edgeX(-h*.45,progress,w,h);
 c.save();c.globalAlpha=Math.max(0,1-age/.38);
 for(let i=0;i<7;i++){
  const direction=i%2?1:-1;
  const x=origin+direction*(12+i*7)*age*3;
  const y=-h*.42-(45+i*9)*age+430*age*age;
  c.save();c.translate(x,y);c.rotate((i+biteNumber)*1.7+age*direction*7);
  c.fillStyle=i%3?f.crumb:f.inside;c.beginPath();c.moveTo(-3,-2);
  c.lineTo(3+i%2,-1);c.lineTo(2,3);c.lineTo(-2,2);c.closePath();c.fill();c.restore();
 }
 c.restore();
}
export function drawSlurp(c,age,pulse){
 const lift=pulse*43,tipX=5,tipY=-87-lift;
 c.save();c.lineCap='round';
 for(let i=0;i<2;i++){
  c.beginPath();c.moveTo(174,-11-lift*.2+i*11);c.lineTo(tipX+i*10,tipY+i*3);
  c.strokeStyle=INK;c.lineWidth=7;c.stroke();c.strokeStyle='#c58b4c';c.lineWidth=3.5;c.stroke();
 }
 if(age>=0&&age<.22){
  const length=18+(1-age/.22)*48;
  for(let i=0;i<5;i++){
   const x=tipX+3+i*4;
   c.beginPath();c.moveTo(x,tipY+4);
   c.bezierCurveTo(x+12,tipY+length*.3,x-10,tipY+length*.7,x+3,tipY+length);
   c.strokeStyle='#9b682e';c.lineWidth=4.5;c.stroke();c.strokeStyle='#f4ce72';c.lineWidth=2.5;c.stroke();
  }
 }
 c.restore();
}
