export const ROUND_SECONDS = 30;
export const FIXED_STEP = 1 / 120;
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function challengeDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Hong_Kong', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const get = type => parts.find(part => part.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function normalizeChallenge(value) {
  if (typeof value !== 'string' || !/^20\d{2}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
}

function seededRandom(seed) {
  let hash = 2166136261;
  for (const char of String(seed)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return () => {
    hash += 0x6D2B79F5;
    let t = Math.imul(hash ^ (hash >>> 15), 1 | hash);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createGame({ seed = 'practice', mode = 'daily' } = {}) {
  const random = seededRandom(seed);
  return {
    seed: String(seed), mode, status: 'running', reason: null, elapsed: 0,
    angle: 0, angularVelocity: 0, wind: 0, windScale: 1, phase: random() * Math.PI * 2,
    playerX: 0, playerVelocity: 0, points: 0, combo: 0, bestCombo: 0,
    shoutCooldown: 0, shoutPulse: 0, toast: null,
    stats: { tips: 0, tarts: 0, stolen: 0, shooed: 0, dodged: 0 },
    objects: Array.from({ length: 32 }, (_, index) => ({
      at: 0.6 + index * 0.85, x: index === 0 ? 0 : (random() * 2 - 1) * 0.82,
      kind: index < 2 ? 'tip' : index % 8 === 7 || random() < 0.4 ? 'pigeon' : random() < 0.7 ? 'tip' : 'tart',
      phase: random() * 6.28, speed: 0.43 + random() * 0.12,
      resolved: false, size: index % 8 === 7 ? 1.25 : 1
    })),
    events: Array.from({ length: 5 }, (_, index) => ({
      at: 4 + index * 5 + random() * 0.5,
      direction: random() > 0.5 ? 1 : -1,
      strength: 1.25 + index * 0.16 + random() * 0.4,
      kind: ['scooter', 'door', 'rush'][index % 3]
    })),
    items: [
      { type: 'tea', x: -0.48, vx: 0, fill: 1, active: true, grip: 0.95, lostAt: null },
      { type: 'tart', x: 0, vx: 0, fill: 1, active: true, grip: 1.1, lostAt: null },
      { type: 'matcha', x: 0.48, vx: 0, fill: 1, active: true, grip: 0.88, lostAt: null }
    ]
  };
}

export function upcomingEvent(state) {
  return state.events.find(event => event.at + 1.8 > state.elapsed) ?? null;
}

export function objectPosition(object, elapsed) {
  const age = elapsed - object.at;
  return { x: object.x * 300 + (object.kind === 'pigeon' ? Math.sin(age * 4 + object.phase) * 26 : 0), y: age * object.speed - 0.15 };
}

function notice(state, key, points = 0) {
  state.toast = { key, points, at: state.elapsed };
}

export function shout(state) {
  if (state.status !== 'running' || state.shoutCooldown > 0) return false;
  state.shoutCooldown = 5; state.shoutPulse = 0.65;
  let scared = 0;
  for (const object of state.objects) {
    if (!object.resolved && object.kind === 'pigeon' && objectPosition(object, state.elapsed).y > 0) {
      object.resolved = true; object.resolution = 'shoo'; object.resolvedAt = state.elapsed; scared++;
    }
  }
  state.stats.shooed += scared; state.points += scared * 25;
  notice(state, scared ? 'birdPanic' : 'shoutEmpty', scared * 25);
  return true;
}

export function stepGame(state, input, seconds) {
  if (state.status !== 'running' || !Number.isFinite(seconds) || seconds <= 0) return state;
  const dt = Math.min(seconds, 1 / 30, ROUND_SECONDS - state.elapsed);
  const control = Number.isFinite(input) ? clamp(input, -1, 1) : 0;
  state.elapsed = Math.min(ROUND_SECONDS, state.elapsed + dt);
  const t = state.elapsed;
  state.shoutCooldown = Math.max(0, state.shoutCooldown - dt);
  state.shoutPulse = Math.max(0, state.shoutPulse - dt);
  const movement = control * 9 - state.playerVelocity * 7;
  state.playerVelocity += movement * dt;
  state.playerX = clamp(state.playerX + state.playerVelocity * dt, -0.75, 0.75);
  if (Math.abs(state.playerX) === 0.75) state.playerVelocity *= 0.85;
  let wind = Math.sin(t * 1.33 + state.phase) * 0.34 + Math.sin(t * 0.71) * 0.22;
  for (const event of state.events) {
    const progress = (t - event.at) / 1.6;
    if (progress >= 0 && progress <= 1) wind += Math.sin(progress * Math.PI) * event.direction * event.strength;
  }
  state.wind = wind * state.windScale;
  const targetAngle = control * 0.13 + state.playerVelocity * 0.035 + state.wind * 0.065;
  const acceleration = (targetAngle - state.angle) * 22 - state.angularVelocity * 7;
  state.angularVelocity += acceleration * dt;
  state.angle = clamp(state.angle + state.angularVelocity * dt, -0.72, 0.72);
  if (Math.abs(state.angle) === 0.72) state.angularVelocity *= 0.92;

  for (const item of state.items) {
    if (!item.active) continue;
    item.vx += (Math.sin(state.angle) * 1.3 - movement * 0.035) * item.grip * dt;
    item.vx *= Math.exp(-1.6 * dt);
    item.x += item.vx * dt;
    if (item.type !== 'tart') item.fill = Math.max(0, item.fill - Math.max(0, Math.abs(state.angle) - 0.33) * dt * 0.38);
    if (Math.abs(item.x) > 0.93 || item.fill < 0.2) {
      item.active = false;
      item.lostAt = t;
      item.fill = 0;
      state.combo = 0;
      notice(state, 'spillOops');
    }
  }
  for (const object of state.objects) {
    if (object.resolved || t < object.at) continue;
    const position = objectPosition(object, t);
    if (position.y < (object.kind === 'pigeon' ? 0.78 : 0.9)) continue;
    object.resolved = true; object.resolvedAt = t;
    const nearestTreat = state.items.filter(item => item.active).sort((a,b) => Math.abs(a.x*198+state.playerX*200-position.x)-Math.abs(b.x*198+state.playerX*200-position.x))[0];
    const caught = object.kind === 'pigeon'
      ? Boolean(nearestTreat && Math.abs(nearestTreat.x*198+state.playerX*200-position.x)<64)
      : Math.abs(position.x-state.playerX*200)<195;
    if (object.kind === 'pigeon') {
      if (caught) {
        const treat = nearestTreat;
        if (treat) { treat.active=false;treat.fill=0;treat.lostAt=t-2;object.stolen=treat.type;state.stats.stolen++; }
        state.combo=0;object.resolution='stole';notice(state, 'stolen'+(object.stolen??'tea'));
      } else { state.stats.dodged++;state.points+=20;object.resolution='dodged';notice(state,'niceDodge',20); }
    } else if (caught) {
      state.combo++;state.bestCombo=Math.max(state.bestCombo,state.combo);
      const earned=(object.kind==='tip'?50:90)*Math.min(4,1+Math.floor(state.combo/3));
      state.points+=earned;object.resolution='caught';
      if(object.kind==='tip') {state.stats.tips++;notice(state,'tipCatch',earned);}
      else {
        state.stats.tarts++;
        const lost=state.items.find(item=>!item.active);
        if(lost){lost.active=true;lost.fill=1;lost.x=(state.items.indexOf(lost)-1)*.48;lost.vx=0;lost.lostAt=null;notice(state,'tartRescue',earned);}
        else {state.items.forEach(item=>{item.fill=Math.min(1,item.fill+.12);});notice(state,'tartCatch',earned);}
      }
    } else {state.combo=0;object.resolution='missed';}
  }
  if (state.items.every(item => !item.active)) {
    state.status = 'finished';
    state.reason = 'spilled';
  } else if (state.elapsed >= ROUND_SECONDS - 0.000001) {
    state.elapsed = ROUND_SECONDS;
    state.status = 'finished';
    state.reason = 'time';
  }
  return state;
}

export function summarizeGame(state) {
  const saved = state.items.filter(item => item.active).length;
  const preservation = state.items.reduce((sum, item) => sum + (item.active ? item.fill : 0), 0) / state.items.length;
  return {
    score: state.points + Math.round(state.elapsed * 5 + saved * 150 + preservation * 100),
    saved, preservation: Math.round(preservation * 100), seconds: Math.round(state.elapsed * 10) / 10,
    title: state.stats.shooed >= 3 ? 'birdBoss' : state.bestCombo >= 6 ? 'legend' : saved >= 2 ? 'guardian' : saved === 1 ? 'survivor' : 'trainee',
    seed: state.seed, mode: state.mode, reason: state.reason,
    items: state.items.map(item => ({ type: item.type, active: item.active, fill: item.active ? item.fill : 0 })),
    stats: { ...state.stats }, bestCombo: state.bestCombo
  };
}

