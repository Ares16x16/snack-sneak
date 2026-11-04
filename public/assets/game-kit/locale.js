export const languages=['en','zh-HK','zh-TW'];
export function normalizeLanguage(value,fallback='en'){
 if(value==='zh-Hant')return 'zh-TW';
 return languages.includes(value)?value:fallback;
}
export function browserLanguage(value='en'){return /^zh-(?:TW|Hant-TW)/i.test(value)?'zh-TW':/^zh/i.test(value)?'zh-HK':'en';}
export function localeCopy(copy,language){return copy[normalizeLanguage(language)]??(/^zh/.test(language)?copy['zh-Hant']:null)??copy.en;}
