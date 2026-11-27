import {clamp} from '../../engine/geometry.js';

export const MAX_ARMOR = 6;

export function receiveDamage(game, amount, sourceX) {
  const p = game.player;
  if (p.invulnerable || game.finishDelay !== null || game.status !== 'playing') return false;
  p.invulnerable = game.boss ? 1.33 : 1.07;
  p.hurtTime = .39;
  p.tauntTime = 0;
  p.hp = clamp(p.hp - amount, 0, MAX_ARMOR);
  p.vx += Math.sign(p.x - sourceX) * 165;
  game.camera.shake = Math.max(6, game.camera.shake);
  game.effects.hit(p.x, p.y - p.h * .55, '#f1775a', 12);
  if (p.hp) game.sound('hero-hit');
  if (!p.hp) game.fail();
  return true;
}
