import {mountArcade} from './game-kit/arcade.js';
import {loadGameConfig} from './game-kit/config.js';
import * as game from './game.js';
try{mountArcade({config:await loadGameConfig(),game});}
catch{document.getElementById('kit-message').textContent='The game settings could not load. Refresh to try again. 無法載入遊戲設定，請重新整理。';}
