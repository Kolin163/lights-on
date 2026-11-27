import {approach, clamp} from '../../engine/geometry.js';
import {findSurface, stayInWorld} from '../world/platforms.js';

const GRAVITY = 1030;
const DROP_SPEED = 300;

function chooseDescent(game, enemy, origin, player) {
  let best;
  const center = enemy.x;
  const extra = enemy.w * .32 + 7;
  for (const surface of game.terrain) {
    const drop = surface.y - origin.y;
    if (drop < 36 || drop > 250) continue;
    const reach = DROP_SPEED * Math.sqrt(2 * drop / GRAVITY) - 16;
    const low = surface.x + 18, high = surface.x + surface.w - 18;
    for (const direction of [-1, 1]) {
      const exit = direction < 0 ? origin.x - extra : origin.x + origin.w + extra;
      const landing = clamp(exit, low, high);
      const horizontal = Math.abs(landing - exit);
      if (horizontal > reach || exit < 17 || exit > game.layout.length - 17) continue;
      // Prefer an adjoining lower deck, then the side that heads back toward the player.
      const cost = drop + Math.abs(exit - center) * .34 + horizontal * 1.04 + Math.abs(landing - player.x) * .12;
      if (!best || cost < best.cost) best = {origin, surface, direction, landing, cost};
    }
  }
  return best ?? null;
}

function walkRate(game, enemy, player) {
  const targetDistance = Math.abs(player.x - enemy.x);
  const verticalGap = player.y - enemy.y;
  if (enemy.mode === 'attack') return enemy.type === 'brute' ? 22 : 190;
  if (enemy.mode !== 'move') return 0;
  if (verticalGap < -162 || verticalGap > (game.layout.kind === 'vertical' ? 430 : 155)) return 0;
  if (targetDistance > 1060 && !enemy.wave && !enemy.provoked) return 0;
  if (enemy.type === 'brute' && !enemy.provoked && targetDistance < 230
    && targetDistance > 95 && Math.abs(verticalGap) < 95) return 0;
  return enemy.speed * (enemy.provoked ? 1.46 : enemy.wave ? 1.33 : 1);
}

export function walkEnemy(game, enemy, player, dt) {
  const terrain = game.terrain;
  let support = enemy.vy >= 0 ? findSurface(enemy, terrain, enemy.y + .5, 3) : null;
  if (enemy.hop || enemy.route?.left) support = null;
  if (support?.moving) enemy.x += support.delta;
  let direction = Math.sign(player.x - enemy.x);
  let speed = walkRate(game, enemy, player);
  const descentWanted = game.layout.kind === 'vertical' && player.y > enemy.y + 51 && player.y < enemy.y + 420;
  if (support && !support.ground && descentWanted && enemy.mode === 'move' && !enemy.route) {
    enemy.route = chooseDescent(game, enemy, support, player);
  }
  const route = enemy.route;
  if (route) {
    if (!route.left) {
      direction = route.direction;
      speed = Math.max(139, speed);
    } else {
      const target = clamp(route.landing, route.surface.x + 18, route.surface.x + route.surface.w - 18);
      direction = Math.sign(target - enemy.x);
      speed = Math.min(DROP_SPEED, Math.abs(target - enemy.x) * 6);
    }
  }

  if (support?.ground && direction && speed && game.layout.kind === 'ground') {
    const edge = direction > 0 ? support.x + support.w : support.x;
    const toEdge = (edge - enemy.x) * direction;
    if (toEdge <= 26 && (player.x - edge) * direction > 6) {
      const next = terrain.find(tile => tile.ground && tile !== support && (
        direction > 0 ? tile.x >= edge && tile.x - edge <= 183 : tile.x + tile.w <= edge && edge - tile.x - tile.w <= 183
      ));
      if (next && enemy.mode !== 'windup') {
        enemy.vy = -440;
        enemy.vx = direction * 258;
        enemy.hop = {direction};
        support = null;
      } else {
        speed = 0;
        enemy.x = edge - direction * 14;
      }
    }
  }

  // Keep uncommitted platform patrols on the deck in the tower.
  if (support && game.layout.kind === 'vertical' && !route) {
    const min = support.x + 10, max = support.x + support.w - 10;
    if (enemy.x <= min && direction < 0 || enemy.x >= max && direction > 0) {
      enemy.x = clamp(enemy.x, min, max);
      enemy.vx = 0;
      speed = 0;
    }
  }

  if (!enemy.hop) enemy.vx = approach(enemy.vx, direction * speed, (route?.left ? 1860 : 880) * dt);
  enemy.x += enemy.vx * dt;
  stayInWorld(game, enemy);

  if (route && !route.left) {
    const origin = route.origin;
    const margin = enemy.w * .32;
    route.left = enemy.x + margin <= origin.x || enemy.x - margin >= origin.x + origin.w;
  }

  enemy.vy = Math.min(810, enemy.vy + GRAVITY * dt);
  const nextY = enemy.y + enemy.vy * dt;
  const surface = enemy.vy >= 0 ? findSurface(enemy, terrain, nextY, 3, route?.left ? route.origin : null) : null;
  enemy.airborne = !surface;
  if (!surface) {
    enemy.y = nextY;
    if (enemy.y > game.layout.height + 68 && enemy.lastSafe) {
      enemy.x = enemy.lastSafe.x;
      enemy.y = enemy.lastSafe.y;
      enemy.hop = null;
      enemy.route = null;
      enemy.vx = 0;
      enemy.vy = 0;
    }
    return;
  }
  if (enemy.vy > 224) enemy.landing = .23;
  enemy.y = surface.y;
  enemy.vy = 0;
  enemy.hop = null;
  if (!route || route.left || surface !== route.origin) enemy.route = null;
  const margin = Math.max(12, enemy.w * .37);
  enemy.lastSafe = {x: clamp(enemy.x, surface.x + margin, surface.x + surface.w - margin), y: surface.y};
}
