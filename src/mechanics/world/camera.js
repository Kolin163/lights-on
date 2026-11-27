import {clamp, WIDTH, HEIGHT} from '../../engine/geometry.js';

export const ARENA_PIVOT = {x: 480, y: 390};

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

export function cameraPose(game) {
  const {x, y, shake} = game.camera;
  const amplitude = game.reduceMotion ? 0 : shake;
  const rocking = !game.reduceMotion && game.boss && !game.flags.override;
  return {
    x: -x + Math.sin(game.time * 76) * amplitude,
    y: -y + Math.cos(game.time * 89) * amplitude * .51,
    roll: rocking ? Math.sin(game.time * 1.53) * (game.boss.phase > 1 ? .023 : .008) : 0,
  };
}

export function screenToWorld(game, point) {
  const {x, y, roll} = cameraPose(game);
  if (!roll) return {x: point.x - x, y: point.y - y};
  const relativeX = point.x - x - ARENA_PIVOT.x;
  const relativeY = point.y - y - ARENA_PIVOT.y;
  const sin = Math.sin(roll), cos = Math.cos(roll);
  return {
    x: ARENA_PIVOT.x + relativeX * cos + relativeY * sin,
    y: ARENA_PIVOT.y + relativeY * cos - relativeX * sin,
  };
}
