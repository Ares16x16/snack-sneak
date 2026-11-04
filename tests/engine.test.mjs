import test from 'node:test';
import assert from 'node:assert/strict';
import { challengeDate, normalizeChallenge, createGame, stepGame, summarizeGame, shout } from '../public/assets/engine.js';

test('daily challenge changes at Hong Kong midnight regardless of device zone', () => {
  assert.equal(challengeDate(new Date('2026-10-28T15:59:59Z')), '2026-10-28');
  assert.equal(challengeDate(new Date('2026-10-28T16:00:00Z')), '2026-10-29');
});

test('challenge links reject impossible dates and arbitrary input', () => {
  assert.equal(normalizeChallenge('2026-10-29'), '2026-10-29');
  for (const input of ['2026-02-30', '2026-13-01', '<script>', null, '2026-1-1']) {
    assert.equal(normalizeChallenge(input), null);
  }
});

test('the same daily seed creates the same gusts and another seed changes the challenge', () => {
  assert.deepEqual(createGame({ seed: 'daily:2026-10-29' }).events, createGame({ seed: 'daily:2026-10-29' }).events);
  assert.deepEqual(createGame({ seed: 'daily:2026-10-29' }).objects, createGame({ seed: 'daily:2026-10-29' }).objects);
  assert.notDeepEqual(createGame({ seed: 'daily:2026-10-29' }).events, createGame({ seed: 'daily:2026-10-30' }).events);
});

test('a preserved tray completes at 30 seconds and scores surviving treats', () => {
  const state = createGame({ seed: 'calm' });
  state.events = [];
  state.objects = [];
  state.windScale = 0;
  for (let i = 0; i < 3601; i++) stepGame(state, 0, 1 / 120);
  assert.equal(state.status, 'finished');
  assert.equal(state.reason, 'time');
  assert.equal(state.elapsed, 30);
  const summary = summarizeGame(state);
  assert.equal(summary.saved, 3);
  assert.equal(summary.score, 700);
});

test('losing every treat ends the round early, and finished rounds remain frozen', () => {
  const state = createGame({ seed: 'loss' });
  state.items.forEach(item => { item.x = 1.2; });
  stepGame(state, 0, 1 / 120);
  assert.equal(state.status, 'finished');
  assert.equal(state.reason, 'spilled');
  assert.equal(summarizeGame(state).saved, 0);
  const before = structuredClone(state);
  stepGame(state, 1, 1 / 120);
  assert.deepEqual(state, before);
});

test('extreme or malformed input cannot create non-finite physics or reverse the clock', () => {
  const state = createGame({ seed: 'limits' });
  for (const input of [Infinity, NaN, -999, 999, undefined]) {
    stepGame(state, input, 1 / 120);
    assert.ok(Number.isFinite(state.angle));
    assert.ok(state.items.every(item => Number.isFinite(item.x) && Number.isFinite(item.vx)));
  }
  const elapsed = state.elapsed;
  stepGame(state, 0, -1);
  stepGame(state, 0, NaN);
  assert.equal(state.elapsed, elapsed);
});

test('fresh rounds do not inherit spilled treats from a previous attempt', () => {
  const oldRound = createGame({ seed: 'daily:2026-10-29' });
  oldRound.items[0].active = false;
  const nextRound = createGame({ seed: 'daily:2026-10-29' });
  assert.equal(nextRound.items.filter(item => item.active).length, 3);
  assert.equal(nextRound.elapsed, 0);
});

test('a receipt preserves which actual treats survived and their remaining contents', () => {
  const state = createGame({ seed: 'receipt' });
  state.items[0].active = false;
  state.items[2].fill = 0.6;
  const result = summarizeGame(state);
  assert.deepEqual(result.items, [
    { type: 'tea', active: false, fill: 0 },
    { type: 'tart', active: true, fill: 1 },
    { type: 'matcha', active: true, fill: 0.6 }
  ]);
});

test('catching a tip earns points and builds a combo', () => {
  const state = createGame({seed:'catch'});
  state.elapsed=1.1;
  state.objects=[{kind:'tip',at:0,x:0,speed:1,phase:0,resolved:false}];
  stepGame(state,0,1/120);
  assert.equal(state.points,50);
  assert.equal(state.combo,1);
  assert.equal(state.stats.tips,1);
});

test('a pigeon collision steals a treat and breaks the combo', () => {
  const state = createGame({seed:'pigeon'});
  state.elapsed=1;state.combo=4;
  state.objects=[{kind:'pigeon',at:0,x:0,speed:1,phase:0,resolved:false}];
  stepGame(state,0,1/120);
  assert.equal(state.items.filter(item=>item.active).length,2);
  assert.equal(state.combo,0);
  assert.equal(state.stats.stolen,1);
});

test('a well-timed shout scares away visible pigeons and has a real cooldown', () => {
  const state = createGame({seed:'shout'});
  state.elapsed=.6;
  state.objects=[{kind:'pigeon',at:0,x:0,speed:.6,phase:0,resolved:false}];
  assert.equal(shout(state),true);
  assert.equal(state.objects[0].resolution,'shoo');
  assert.equal(state.stats.shooed,1);
  assert.equal(state.points,25);
  assert.equal(shout(state),false);
});

test('catching a tart restores a stolen treat', () => {
  const state = createGame({seed:'rescue'});
  state.items[0].active=false;state.items[0].fill=0;
  state.elapsed=1.1;
  state.objects=[{kind:'tart',at:0,x:0,speed:1,phase:0,resolved:false}];
  stepGame(state,0,1/120);
  assert.equal(state.items.filter(item=>item.active).length,3);
  assert.equal(state.stats.tarts,1);
});

test('a tip landing on the visible outer tray is caught rather than passing through it', () => {
  const state=createGame({seed:'tray-edge'});
  state.elapsed=1.1;
  state.objects=[{kind:'tip',at:0,x:.6,speed:1,phase:0,resolved:false}];
  stepGame(state,0,1/120);
  assert.equal(state.points,50);
  assert.equal(state.stats.tips,1);
});

