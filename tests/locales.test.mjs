import {arcadeText} from '../public/assets/game-kit/arcade.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {languages,normalizeLanguage,browserLanguage} from '../public/assets/game-kit/locale.js';
import {text,copy} from '../public/assets/v2/i18n.js';
import {messages,translate} from '../public/assets/i18n.js';
import {challengeLink,readChallenge} from '../public/assets/game-kit/challenge.js';
test('EN, HK and TW have complete gameplay dictionaries and distinct regional wording',()=>{
 for(const lang of languages){assert.deepEqual(Object.keys(copy[lang]).sort(),Object.keys(copy.en).sort());assert.deepEqual(Object.keys(messages[lang]).sort(),Object.keys(messages.en).sort());}
 assert.equal(text('zh-HK','intro'),'撳住偷食，老闆擰轉頭就放手。');assert.equal(text('zh-TW','intro'),'按住偷吃，老闆回頭就放手。');assert.equal(translate('zh-HK','how'),'點玩');assert.equal(translate('zh-TW','how'),'怎麼玩');
 assert.equal(normalizeLanguage('zh-Hant'),'zh-TW');assert.equal(browserLanguage('zh-HK'),'zh-HK');assert.equal(browserLanguage('zh-TW'),'zh-TW');
});
test('challenge links preserve regional locale and remain readable',()=>{
 for(const language of languages){const url=new URL(challengeLink({origin:'https://arcade.example',path:'/snack-sneak/',gameId:'v2',date:'2026-11-04',language}));assert.equal(readChallenge(url.searchParams,{gameId:'v2'}).language,language);}
});

test('generated games keep regional pause copy distinct',()=>{assert.equal(arcadeText('zh-HK','paused'),'抖一抖先。');assert.equal(arcadeText('zh-TW','paused'),'休息一下。');});
