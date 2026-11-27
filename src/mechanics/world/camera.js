import {clamp, WIDTH, HEIGHT} from '../../engine/geometry.js';

function target(game) {
  if (game.layout.kind === 'bike') return {x: game.ride.distance, y: 0};
  const x = clamp(game.player.x - (game.player.face > 0 ? 350 : 540), 0, Math.max(0, game.layout.length - WIDTH));
  if (game.layout.kind !== 'vertical') return {x, y: 0};
  const y = clamp(game.player.y - 340, 0, game.layout.height - HEIGHT);
  return {x: 0, y};
}

export function updateCamera(game, dt, snap = false) {
  const next = target(game);
  const rate = snap || game.layout.kind === 'bike' ? 1 : 1 - Math.exp(-dt * 8);
  game.camera.x += (next.x - game.camera.x) * rate;
  game.camera.y += (next.y - game.camera.y) * rate;
  game.camera.shake = Math.max(0, game.camera.shake - dt * 32);
}
