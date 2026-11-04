export function createAudio() {
  let context;
  let enabled = false;
  function unlock() {
    if (!enabled) return;
    try {
      const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (Audio) { context ??= new Audio(); context.resume()?.catch(() => {}); }
    } catch { /* Sound is optional. */ }
  }
  function play(kind) {
    if (!enabled) return;
    unlock();
    if (!context) return;
    try {
      const oscillator=context.createOscillator(), gain=context.createGain();
      const start=context.currentTime;
      oscillator.type=kind==='warning'?'square':kind==='shout'?'triangle':'sine';
      oscillator.frequency.setValueAtTime(kind==='warning'?1100:kind==='watching'?240:kind==='shout'?180:kind==='spill'?330:kind==='end'?520:680,start);
      oscillator.frequency.exponentialRampToValueAtTime(kind==='warning'?700:kind==='watching'?110:kind==='shout'?65:kind==='spill'?110:kind==='end'?780:880,start+.16);
      gain.gain.setValueAtTime(.055,start);gain.gain.exponentialRampToValueAtTime(.001,start+.22);
      oscillator.connect(gain);gain.connect(context.destination);oscillator.start(start);oscillator.stop(start+.23);
    } catch { /* Audio failure never changes gameplay. */ }
  }
  return { setEnabled(value){enabled=Boolean(value);unlock();}, unlock, play };
}

