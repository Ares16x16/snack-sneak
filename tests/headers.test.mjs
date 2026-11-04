import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {headersForPath} from '../scripts/headers.mjs';
test('the launch policy blocks inline scripts and objects while allowing the game and blob images',async()=>{
 const file=await readFile(new URL('../public/_headers',import.meta.url),'utf8');
 const h=headersForPath(file,'/');
 assert.match(h['Content-Security-Policy'],/script-src 'self'/);assert.doesNotMatch(h['Content-Security-Policy'],/script-src[^;]*unsafe-inline/);
 assert.match(h['Content-Security-Policy'],/object-src 'none'/);assert.match(h['Content-Security-Policy'],/img-src[^;]*blob:/);
 assert.match(h['Permissions-Policy'],/web-share=\(self\)/);
});
test('local header matching retains global protection on nested game assets',()=>{
 const h=headersForPath('/*\n  X-Content-Type-Options: nosniff\n/assets/*.js\n  Cache-Control: no-cache\n','/assets/game-kit/arcade.js');
 assert.equal(h['X-Content-Type-Options'],'nosniff');assert.equal(h['Cache-Control'],'no-cache');
});
