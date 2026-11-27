import {createInput} from './engine/input.js';
import {GameSession, STEP} from './engine/session.js';
import {createGameAudio} from './audio/mixer.js';
import {playGameCue, updateAmbience} from './audio/scene.js';
import {MISSIONS} from './levels/catalog.js';
import {loadArt} from './render/assets.js';
import {createRenderer} from './render/renderer.js';
import {createInterface, isNonDesktopDevice} from './ui/interface.js';

const audio = createGameAudio();
const missionTheme = index => index === MISSIONS.length - 1 ? 'on-the-cables' : 'livewire';

function playTitleMusic() {
  audio.setMusic('blackout', .28);
}

function menu() {
  machine.status = 'menu';
  input.reset();
  audio.resetEffects();
  audio.setPaused(false);
  audio.setAmbience(null);
  playTitleMusic();
  audio.play('interface-confirm');
  ui.showMenu();
}

const storyActions = ['Выйти на улицу', 'Сесть на велосипед', 'Идти к подстанции', 'Подняться на стройку', 'Вернуть видеокарту'];

function intro(index, carriedCharge = 0) {
  machine.status = 'story';
  input.reset();
  audio.setAmbience(null);
  audio.setMusic(index === 0 ? 'blackout' : missionTheme(index - 1), .18);
  if (index === 1) audio.preload('bike-engine');
  if (index === MISSIONS.length - 1) audio.preload(missionTheme(index));
  const mission = MISSIONS[index];
  ui.beginStory({
    ...mission.intro,
    art: mission.art,
    label: 'МИССИЯ ' + String(index + 1).padStart(2, '0') + ' · ' + mission.location,
    action: storyActions[index],
    onNext: () => launch(index, false, carriedCharge, index === 0),
  });
}

function launch(index, retry = false, carriedCharge = 0, showControls = false) {
  accumulator = 0;
  input.reset();
  audio.resetEffects();
  audio.setPaused(false);
  machine.start(index, retry, carriedCharge);
  if (showControls) {
    machine.status = 'tutorial';
    ui.tutorial();
  } else {
    audio.setMusic(missionTheme(index), .29);
    updateAmbience(audio, machine);
    ui.playing(machine);
  }
  audio.play('interface-confirm');
  render(machine);
}

function dismissTutorial() {
  if (machine.status !== 'tutorial') return;
  accumulator = 0;
  input.reset();
  machine.status = 'playing';
  audio.setMusic(missionTheme(machine.index), .29);
  audio.play('interface-confirm');
  ui.playing(machine);
}

function pause() {
  if (machine.status === 'playing') {
    if (machine.finishDelay !== null) return false;
    input.reset();
    machine.status = 'paused';
    audio.setPaused(true);
    ui.paused();
    return true;
  }
  if (machine.status !== 'paused') return false;
  accumulator = 0;
  input.reset();
  machine.status = 'playing';
  audio.setPaused(false);
  ui.playing(machine);
  return true;
}

function completed(index, ending) {
  input.reset();
  if (!ending) {
    intro(index + 1, machine.player.charge);
    return;
  }
  machine.status = 'story';
  audio.setAmbience(null);
  audio.setMusic('blackout', .18);
  ui.beginStory({
    ...ending,
    label: 'БУЗУЛУК · ДОМА',
    action: 'В меню',
    onNext: menu,
  });
}

const ui = createInterface({
  onMenu: menu,
  onPlay: () => {
    audio.unlock();
    machine.tauntHistory.length = 0;
    intro(0);
    audio.play('interface-confirm');
    audio.preload('livewire', 'portal-rumble');
    audio.preloadEffects();
  },
  onPause: pause,
  onTutorial: dismissTutorial,
  onResume: pause,
  onRestart: () => launch(machine.index, false, machine.missionCharge),
  onRetry: () => launch(machine.index, true),
});
const machine = new GameSession({
  touch: ui.touchMode,
  onComplete: completed,
  onSound: (id, x, y) => playGameCue(audio, machine, id, x, y),
  onFail: index => {
    input.reset();
    audio.setAmbience(null);
    audio.setMusic(missionTheme(index), .12);
    ui.died(index);
  },
});
const input = createInput(ui.canvas, ui.touch, pause, () => machine.status === 'playing');
let render;
let accumulator = 0;
let lastTime = performance.now();

function frame(now) {
  const elapsed = Math.min((now - lastTime) / 1000, .065);
  lastTime = now;
  if (machine.status === 'playing') {
    accumulator += elapsed;
    while (accumulator >= STEP && machine.status === 'playing') {
      machine.step(input, STEP);
      accumulator -= STEP;
    }
    if (machine.status === 'playing' || machine.status === 'dead') render(machine);
    if (machine.status === 'playing') {
      updateAmbience(audio, machine);
      ui.paintHUD(machine);
      ui.paintCompletion(machine.finishProgress);
    }
  }
  requestAnimationFrame(frame);
}

document.addEventListener('visibilitychange', () => {
  audio.setHidden(document.hidden);
  if (document.hidden && machine.status === 'playing') pause();
});

if (isNonDesktopDevice(navigator)) {
  ui.desktopOnly();
} else {
  function enableTitleMusic(event) {
    if (!event.isTrusted || machine.status !== 'menu') return;
    audio.unlock();
    playTitleMusic();
  }
  audio.setHidden(document.hidden);
  document.addEventListener('click', enableTitleMusic);
  document.addEventListener('keydown', enableTitleMusic);
  ui.prepareMenu();
  loadArt().then(art => {
    render = createRenderer(ui.canvas, art, matchMedia('(prefers-reduced-motion: reduce)').matches);
    ui.loaded();
    playTitleMusic();
    requestAnimationFrame(frame);
  }).catch(error => {
    ui.loadFailed(error.message);
  });
}
