import {clamp, HEIGHT, WIDTH} from './geometry.js';

const actions = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  Space: 'jump',
  KeyJ: 'fire', KeyZ: 'fire',
  KeyK: 'taunt', KeyX: 'taunt',
  KeyL: 'super', KeyC: 'super',
  KeyE: 'use',
};

export function createInput(surface, touchControls, onPause, isPlaying) {
  const keys = new Map();
  const pressed = new Set();
  const holds = new Map();
  const awaitingRelease = new Set();
  let cursor = null;
  let pointing = null;

  function press(id, action) {
    if (keys.has(id)) return;
    keys.set(id, action);
    const count = holds.get(action) ?? 0;
    if (!count) pressed.add(action);
    holds.set(action, count + 1);
  }

  function release(id) {
    const action = keys.get(id);
    if (!action) return;
    keys.delete(id);
    const count = holds.get(action) - 1;
    if (count) holds.set(action, count);
    else holds.delete(action);
  }

  function reset() {
    for (const id of keys.keys()) if (typeof id === 'string') awaitingRelease.add(id);
    keys.clear();
    holds.clear();
    pressed.clear();
    cursor = null;
    pointing = null;
    touchControls.querySelectorAll('.held').forEach(button => button.classList.remove('held'));
  }

  window.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.altKey || event.metaKey || event.ctrlKey) return;
    if (awaitingRelease.has(event.code)) {
      if (event.repeat) {
        event.preventDefault();
        return;
      }
      awaitingRelease.delete(event.code);
    }
    if (event.code === 'Escape' || event.code === 'KeyP') {
      if (!event.repeat && onPause()) event.preventDefault();
      return;
    }
    const action = actions[event.code];
    if (!action || !isPlaying()) return;
    event.preventDefault();
    if (!event.repeat) press(event.code, action);
  });
  window.addEventListener('keyup', event => {
    if (awaitingRelease.delete(event.code)) event.preventDefault();
    release(event.code);
  });
  window.addEventListener('blur', reset);

  function mapCursor() {
    if (!cursor) return;
    const bounds = surface.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    pointing = {
      x: clamp((cursor.x - bounds.left) / bounds.width, 0, 1) * WIDTH,
      y: clamp((cursor.y - bounds.top) / bounds.height, 0, 1) * HEIGHT,
    };
  }

  function recordCursor(event) {
    if (event.pointerType === 'touch' || !isPlaying()) return;
    cursor = {x: event.clientX, y: event.clientY};
    mapCursor();
  }

  surface.addEventListener('pointermove', recordCursor);
  surface.addEventListener('pointerleave', () => { cursor = pointing = null; });
  window.addEventListener('resize', mapCursor);
  surface.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !isPlaying() || event.pointerType === 'touch') return;
    recordCursor(event);
    surface.focus({preventScroll: true});
    surface.setPointerCapture(event.pointerId);
    press(event.pointerId, 'fire');
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    surface.addEventListener(event, pointer => release(pointer.pointerId));
  }

  for (const button of touchControls.querySelectorAll('[data-input]')) {
    button.addEventListener('pointerdown', event => {
      if (!isPlaying()) return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      button.classList.add('held');
      press(event.pointerId, button.dataset.input);
    });
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      button.addEventListener(event, pointer => {
        release(pointer.pointerId);
        if (!holds.has(button.dataset.input)) button.classList.remove('held');
      });
    }
    button.addEventListener('contextmenu', event => event.preventDefault());
  }

  return {
    down: action => holds.has(action),
    tap: action => pressed.delete(action),
    pointer: () => pointing,
    finishStep: () => pressed.clear(),
    reset,
  };
}
