import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, stepRun, bossPhase, summarizeRun } from '../public/assets/v2/engine.js';

function calmRun() {
  const run=createRun('test');
  run.looks=[{at:10,duration:1}];
  return run;
}
function advance(run,held,seconds) {
  for(let i=0;i<Math.round(seconds*120);i++)stepRun(run,held,1/120);
}

test('daily seeds reproduce the same warning and look sequence',()=>{
  assert.deepEqual(createRun('daily:2026-10-29').looks,createRun('daily:2026-10-29').looks);
  assert.notDeepEqual(createRun('daily:2026-10-29').looks,createRun('daily:2026-10-30').looks);
});

test('the boss warns before looking and then looks away again',()=>{
  const run=calmRun();
  run.elapsed=9.2;assert.equal(bossPhase(run),'away');
  run.elapsed=9.5;assert.equal(bossPhase(run),'warning');
  run.elapsed=10.2;assert.equal(bossPhase(run),'watching');
  run.elapsed=11.2;assert.equal(bossPhase(run),'away');
});

test('holding eats a snack and releasing immediately stops progress',()=>{
  const run=calmRun();
  advance(run,true,.5);
  assert.ok(run.bites>=2);
  const bites=run.bites;
  advance(run,false,.5);
  assert.equal(run.bites,bites);
});

test('holding through a look gives one strike and requires a release',()=>{
  const run=calmRun();run.elapsed=10;
  advance(run,true,.7);
  assert.equal(run.strikes,1);
  assert.equal(run.needsRelease,true);
  run.elapsed=12;advance(run,true,.5);
  assert.equal(run.bites,0);
  advance(run,false,.1);advance(run,true,.3);
  assert.ok(run.bites>0);
});

test('completing a snack advances to the next food and earns a real bonus',()=>{
  const run=calmRun();advance(run,true,2);
  assert.equal(run.snacks,1);
  assert.equal(run.foodIndex,1);
  assert.ok(run.score>=200);
});

test('a last-moment release can earn a near miss without a strike',()=>{
  const run=calmRun();run.elapsed=9.45;
  advance(run,true,.3);advance(run,false,.35);
  assert.equal(run.strikes,0);
  assert.equal(run.nearMisses,1);
});

test('a fake tap without eating cannot farm near-miss points',()=>{
  const run=calmRun();run.elapsed=9.7;
  advance(run,true,.1);advance(run,false,.3);
  assert.equal(run.nearMisses,0);assert.equal(run.score,0);
});

test('three different looks end the run, and finished runs remain frozen',()=>{
  const run=createRun('caught');run.looks=[{at:1,duration:.6},{at:3,duration:.6},{at:5,duration:.6}];
  for(const at of [1,3,5]) {run.elapsed=at;stepRun(run,false,1/120);stepRun(run,true,1/120);}
  assert.equal(run.status,'finished');assert.equal(run.strikes,3);
  const frozen=structuredClone(run);stepRun(run,true,1/120);assert.deepEqual(run,frozen);
});

test('a complete run stops at 30 seconds and ignores invalid clock deltas',()=>{
  const run=calmRun();run.looks=[];
  stepRun(run,true,-1);stepRun(run,true,NaN);assert.equal(run.elapsed,0);
  advance(run,false,30.1);
  assert.equal(run.elapsed,30);assert.equal(run.status,'finished');
  assert.equal(summarizeRun(run).score,0);
});
