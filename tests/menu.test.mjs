import test from 'node:test';
import assert from 'node:assert/strict';
import {menuItems} from '../public/assets/game-kit/menu-model.js';
test('game menus use localized names and keep a usable current-game fallback',()=>{
 assert.deepEqual(menuItems({name:'Noodle Rush'},'en'),[{href:'/',name:'Noodle Rush'}]);
 assert.deepEqual(menuItems({name:'Snack Sneak',games:[{href:'/',name:{en:'Snack Sneak','zh-Hant':'偷食記'}},{href:'/v1/',name:'Tray Chaos'}]},'zh-Hant'),[{href:'/',name:'偷食記'},{href:'/v1/',name:'Tray Chaos'}]);
});
test('game menu configuration cannot introduce executable or private external links',()=>{
 const games=['javascript:alert(1)','data:text/html,hi','//evil.example/','/../secret','https://127.0.0.1/','https://localhost/'].map(href=>({href,name:'Bad'}));
 games.push({href:'https://games.example/noodles/',name:'Noodle Rush'});
 assert.deepEqual(menuItems({name:'Game',games}),[{href:'https://games.example/noodles/',name:'Noodle Rush'}]);
});
