const EFFECT_GAINS = {
  'interface-confirm': .48,
  'checkpoint': .48,
  'level-complete': .59,
  'game-over': .58,
  'pulse-shot': .34,
  'bike-shot': .34,
  'super-charge': .52,
  'super-blast': .64,
  'boot-asphalt': .26,
  'boot-dirt': .29,
  'boot-metal': .27,
  jump: .39,
  land: .40,
  'hero-hit': .54,
  repair: .52,
  taunt: .47,
  'demon-alert': .42,
  'demon-claws': .42,
  'demon-orb': .43,
  'demon-hit': .32,
  'demon-fall': .42,
  'boss-step': .49,
  'boss-windup': .70,
  'boss-bolt': .65,
  'boss-dash': .60,
  'boss-hit': .46,
  'boss-collapse': .65,
  'bike-skid': .50,
  'switch-relay': .54,
  'power-restore': .62,
};

export const SOUND_FILES = Object.freeze([
  ...Object.keys(EFFECT_GAINS), 'blackout', 'livewire', 'on-the-cables', 'portal-rumble', 'bike-engine',
]);

export function createGameAudio() {
  const buffers = new Map();
  const voices = new Set();
  const loops = {music: null, ambience: null};
  let context;
  let master;
  let paused = false;
  let hidden = false;
  let effectGeneration = 0;

  function load(id) {
    if (!buffers.has(id)) {
      const file = new URL('../../assets/audio/' + id + '.mp3', import.meta.url);
      buffers.set(id, fetch(file).then(response => {
        if (!response.ok) return null;
        return response.arrayBuffer().then(data => context.decodeAudioData(data));
      }).catch(() => null));
    }
    return buffers.get(id);
  }

  function syncActivity() {
    if (!context) return;
    const change = paused || hidden ? context.suspend() : context.resume();
    change.catch(() => {});
  }

  function prepare() {
    if (context) return;
    const Audio = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!Audio) return;
    try {
      context = new Audio();
    } catch {
      return;
    }
    master = context.createGain();
    master.gain.value = .84;
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 10;
    master.connect(limiter).connect(context.destination);
    if (paused || hidden) syncActivity();
  }

  function unlock() {
    prepare();
    if (context?.state !== 'running') syncActivity();
  }

  function voice(buffer, volume, pan, rate, loop) {
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    source.playbackRate.value = rate;
    const gain = context.createGain();
    gain.gain.value = volume;
    const position = context.createStereoPanner?.();
    source.connect(gain);
    if (position) {
      position.pan.value = pan;
      gain.connect(position).connect(master);
    } else {
      gain.connect(master);
    }
    source.onended = () => {
      voices.delete(source);
      source.disconnect();
      gain.disconnect();
      position?.disconnect();
    };
    source.start();
    return {source, gain, position};
  }

  function ramp(param, value, seconds) {
    const now = context.currentTime;
    param.cancelScheduledValues(now);
    param.setTargetAtTime(value, now, seconds);
  }

  function setLoop(channel, id, volume = 0, pan = 0, rate = 1) {
    if (!context) return;
    const current = loops[channel];
    if (current?.id === id) {
      if (current.track) {
        const {source, gain, position} = current.track;
        if (volume !== current.volume) ramp(gain.gain, volume, .08);
        if (position && pan !== current.pan) ramp(position.pan, pan, .08);
        if (rate !== current.rate) ramp(source.playbackRate, rate, .09);
      }
      Object.assign(current, {volume, pan, rate});
      return;
    }
    if (current?.track) {
      ramp(current.track.gain.gain, 0, .065);
      current.track.source.stop(context.currentTime + .38);
    }
    if (!id) {
      loops[channel] = null;
      return;
    }
    const next = {id, volume, pan, rate, track: null};
    loops[channel] = next;
    load(id).then(buffer => {
      if (!buffer || loops[channel] !== next) return;
      next.track = voice(buffer, 0, next.pan, next.rate, true);
      ramp(next.track.gain.gain, next.volume, .1);
    });
  }

  function play(id, {pan = 0, volume = 1} = {}) {
    if (!context || paused || hidden || !Object.hasOwn(EFFECT_GAINS, id)) return;
    const generation = effectGeneration;
    const requestedAt = context.currentTime;
    load(id).then(buffer => {
      if (!buffer || paused || hidden || generation !== effectGeneration || context.currentTime - requestedAt > .42) return;
      if (voices.size >= 18) {
        const oldest = voices.values().next().value;
        voices.delete(oldest);
        oldest.stop();
      }
      voices.add(voice(buffer, volume * EFFECT_GAINS[id], pan, 1, false).source);
    });
  }

  return {
    unlock, play,
    preload(...ids) {
      if (context) for (const id of ids) load(id);
    },
    preloadEffects() {
      if (context) for (const id of Object.keys(EFFECT_GAINS)) load(id);
    },
    setMusic(id, volume) {
      if (id) prepare();
      setLoop('music', id, volume);
    },
    setAmbience(id, volume, pan, rate) {
      setLoop('ambience', id, volume, pan, rate);
    },
    setPaused(value) {
      if (paused === value) return;
      paused = value;
      syncActivity();
    },
    setHidden(value) {
      if (hidden === value) return;
      hidden = value;
      syncActivity();
    },
    resetEffects() {
      effectGeneration++;
      for (const source of voices) source.stop();
      voices.clear();
    },
  };
}
