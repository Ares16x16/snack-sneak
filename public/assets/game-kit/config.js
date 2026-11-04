import {localPath} from './site-path.js';
const defaults={paper:'#faf6e9',ink:'#173e37',accent:'#c63826',secondary:'#2f6d5c'};
export function validateGameConfig(value){
 if(!value||!/^[a-z0-9][a-z0-9-]{1,47}$/.test(value.id??''))throw new Error('Game id must be a lowercase slug of 2–48 characters.');
 if(typeof value.name!=='string'||!value.name.trim()||value.name.length>80)throw new Error('Game name must have 1–80 characters.');
 const challengeId=value.challengeId??value.id;if(!/^[a-z0-9][a-z0-9-]{1,47}$/.test(challengeId))throw new Error('Invalid challenge identity.');
 const roundSeconds=value.roundSeconds??30;if(!Number.isInteger(roundSeconds)||roundSeconds<1||roundSeconds>120)throw new Error('Round duration must be 1–120 seconds.');
 const palette={...defaults,...value.palette};
 for(const color of Object.values(palette))if(!/^#[\da-f]{6}$/i.test(color))throw new Error('Palette colors must be six-digit hex colors.');
 return {...value,name:value.name.trim(),palette,challengeId,roundSeconds};
}
export async function loadGameConfig(url=localPath('/game-config.json')){
 const response=await fetch(url);if(!response.ok)throw new Error('Game settings unavailable.');
 return validateGameConfig(await response.json());
}
export function gameText(value,language='en',fallback=''){
 return typeof value==='string'?value:value?.[language]??value?.en??fallback;
}
