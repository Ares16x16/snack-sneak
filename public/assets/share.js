import {localPath} from './game-kit/site-path.js';
import { drawShareCard } from './renderer.js';

export function challengeLink({ origin, path=localPath('/v1/'), mode, seed, date, score, language }) {
  const url=new URL(path,origin);
  if(mode==='daily') url.searchParams.set('challenge',date);
  else url.searchParams.set('run',seed.replace(/^practice:/,''));
  url.searchParams.set('target',String(score));
  url.searchParams.set('lang',language);
  return url.href;
}
export async function resultImage(summary, options) {
  await document.fonts?.ready;
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;
  const context=canvas.getContext('2d');
  if(!context) throw new Error('Canvas unavailable');
  drawShareCard(context,summary,options);
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Image unavailable')),'image/png'));
}
export function downloadImage(blob, filename) {
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}

