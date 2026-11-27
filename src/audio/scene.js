import {clamp, HEIGHT, WIDTH} from '../engine/geometry.js';

export function playGameCue(audio, game, id, x, y) {
  if (x === undefined) {
    audio.play(id);
    return;
  }
  const screenX = x - game.camera.x;
  const screenY = y === undefined ? HEIGHT / 2 : y - game.camera.y;
  if (screenX < -80 || screenX > WIDTH + 80 || screenY < -50 || screenY > HEIGHT + 50) return;
  const distance = Math.hypot(x - game.player.x, y === undefined ? 0 : y - game.player.y);
  audio.play(id, {pan: clamp((screenX / WIDTH - .5) * 1.55, -.8, .8), volume: clamp(1 - distance / 1120, .24, 1)});
}

export function updateAmbience(audio, game) {
  if (game.ride) {
    const rate = Math.round(game.ride.speed / 355 * 30) / 30;
    audio.setAmbience('bike-engine', .22, 0, rate);
    return;
  }
  let nearest = null;
  let distance = 460;
  for (const x of game.layout.rifts ?? []) {
    const offset = Math.abs(x - game.player.x);
    if (offset >= distance) continue;
    distance = offset;
    nearest = x;
  }
  if (nearest === null) {
    audio.setAmbience(null);
    return;
  }
  const pan = Math.round(clamp((nearest - game.player.x) / 540, -.75, .75) * 20) / 20;
  const volume = (game.flags.power ? .10 : .33) * (1 - distance / 460);
  audio.setAmbience('portal-rumble', Math.round(volume * 100) / 100, pan);
}
