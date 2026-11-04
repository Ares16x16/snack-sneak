import {isPublicURL} from './challenge.js';
const labels={en:{points:'points',beat:'CAN YOU BEAT THIS?',preview:'Preview · challenge link available after launch',daily:'DAILY CHALLENGE',practice:'PRACTICE RUN'},'zh-Hant':{points:'分',beat:'夠唔夠膽挑戰？',preview:'預覽 · 發佈後即可分享挑戰連結',daily:'每日挑戰',practice:'練習挑戰'}};
labels['zh-HK']=labels['zh-Hant'];
labels['zh-TW']={...labels['zh-Hant'],beat:'敢不敢挑戰？',preview:'預覽 · 發布後即可分享挑戰連結'};
function lines(c,value,width,max=2){
 const words=String(value??'').split(/(\s+)/).filter(Boolean),out=[];let line='';
 for(const word of words){
  if(c.measureText(line+word).width<=width){line+=word;continue;}
  if(line.trim()){out.push(line.trim());line='';}
  for(const character of Array.from(word)){
   if(c.measureText(line+character).width>width&&line){out.push(line);line='';}
   line+=character;
  }
 }
 if(line.trim())out.push(line.trim());
 if(out.length>max){out.length=max;let last=out[max-1];while(last&&c.measureText(last+'…').width>width)last=last.slice(0,-1);out[max-1]=last+'…';}
 return out;
}
function textBlock(c,value,x,y,width,lineHeight,max=2){for(const [i,line] of lines(c,value,width,max).entries())c.fillText(line,x,y+i*lineHeight);}
function brand(c,value,y){
 let size=64,text=String(value);c.font='400 '+size+'px "Changa One","PingFang TC",sans-serif';
 while(size>36&&c.measureText(text).width>936){size-=2;c.font='400 '+size+'px "Changa One","PingFang TC",sans-serif';}
 if(c.measureText(text).width>936){while(text&&c.measureText(text+'…').width>936)text=Array.from(text).slice(0,-1).join('');text+='…';}
 c.fillText(text,540,y);
}
export function drawShareCard(c,config,result,{format='story',language='en',url,drawArtwork}={}){
 const story=format==='story',height=story?1920:1350,p=config.palette,t=labels[language]??(language.startsWith('zh')?labels['zh-Hant']:labels.en);
 const display=language.startsWith('zh')?'900':'400',face=language.startsWith('zh')?'"PingFang TC","Microsoft JhengHei",sans-serif':'"Changa One",sans-serif';
 c.fillStyle=p.paper;c.fillRect(0,0,1080,height);c.textAlign='center';
 c.fillStyle=p.ink;c.fillRect(0,0,1080,story?108:28);
 c.fillStyle=p.ink;brand(c,config.name,story?212:116);
 c.font='700 26px "DM Sans","PingFang TC",sans-serif';c.fillStyle=p.secondary;
 c.fillText(result.mode==='practice'?t.practice:t.daily,540,story?294:180);
 c.fillStyle=p.accent;c.font=display+' '+(story?64:56)+'px '+face;textBlock(c,result.title,540,story?392:254,930,story?73:62,2);
 c.fillStyle=p.ink;c.font='400 '+(story?204:160)+'px "Changa One",sans-serif';c.fillText(new Intl.NumberFormat(language).format(result.score),540,story?688:507,950);
 c.font='700 30px "DM Sans","PingFang TC",sans-serif';c.fillText(t.points,540,story?739:549);
 const stats=(result.stats??[]).slice(0,3),spacing=936/Math.max(1,stats.length);
 for(const [index,stat] of stats.entries()){
  const x=72+spacing*(index+.5);c.fillStyle=p.ink;c.font='700 44px "DM Sans","PingFang TC",sans-serif';c.fillText(String(stat.value),x,story?820:608,spacing-20);
  c.fillStyle=p.secondary;c.font='500 26px "DM Sans","PingFang TC",sans-serif';textBlock(c,stat.label,x,story?858:647,spacing-20,30,2);
 }
 const picture={x:72,y:story?922:706,w:936,h:story?571:400};
 c.save();c.beginPath();c.roundRect(picture.x,picture.y,picture.w,picture.h,18);c.clip();
 if(drawArtwork){
  c.translate(picture.x,picture.y);c.scale(picture.w/820,picture.h/500);drawArtwork(c);
 }else{
  c.fillStyle=p.secondary;c.fillRect(picture.x,picture.y,picture.w,picture.h);c.fillStyle=p.paper;
  c.font='400 80px "Changa One",sans-serif';c.fillText(config.name,540,picture.y+picture.h*.58,picture.w-80);
 }
 c.restore();c.strokeStyle=p.ink;c.lineWidth=3;c.beginPath();c.roundRect(picture.x,picture.y,picture.w,picture.h,18);c.stroke();
 c.fillStyle=p.accent;c.font=display+' 51px '+face;c.fillText(t.beat,540,story?1608:1205,940);
 c.fillStyle=p.ink;c.font='600 31px "DM Sans","PingFang TC",sans-serif';
 const address=isPublicURL(url)?new URL(url).hostname:t.preview;c.fillText(address,540,story?1672:1264,950);
 c.font='500 25px "DM Sans","PingFang TC",sans-serif';c.fillStyle=p.secondary;c.fillText(result.date??'',540,story?1732:1313);
}
export async function createCardBlob(config,result,options={}){
 await document.fonts?.ready;await options.ready;
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=options.format==='post'?1350:1920;
 const c=canvas.getContext('2d');if(!c)throw new Error('Image export unavailable');
 drawShareCard(c,config,result,options);
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Image export unavailable')),'image/png'));
}
