import {approach, body, clamp, overlaps, WIDTH, HEIGHT} from '../../engine/geometry.js';
import {receiveDamage} from '../player/health.js';
import {walkEnemy} from './navigation.js';

const TYPES = {
  imp: {w: 53, h: 64, hp: 3, speed: 139, range: 67},
  flyer: {w: 53, h: 49, hp: 3, speed: 102, range: 366},
  brute: {w: 82, h: 94, hp: 7, speed: 86, range: 510},
};

export function spawnEnemy(source, layout, wave = false) {
  const definition = TYPES[source.type];
  const y = source.y ?? layout.start.y;
  return {
    ...definition, ...source, y, wave, hp: definition.hp, maxHp: definition.hp,
    startX: source.x, startY: y, face: -1, vx: 0, vy: 0, awake: wave, alerted: false, deadAge: 0,
    mode: 'move', timer: 0, cooldown: .14 + (source.x % 109) / 110, hurt: 0, provoked: 0,
    airborne: false, landing: 0, hop: null, route: null,
    lastSafe: {x: source.x, y},
  };
}

export function enemyOrb(game, x, y, dx, dy, speed = 302, radius = 8, laneY = null, kind = 'orb') {
  const magnitude = Math.hypot(dx, dy) || 1;
  game.projectiles.push({
    owner: 'enemy', kind, x, y, vx: speed * dx / magnitude, vy: speed * dy / magnitude,
    radius, life: 4.3, damage: 1, laneY,
  });
  game.sound(kind === 'boss-shot' ? 'boss-bolt' : 'demon-orb', x, y);
}

function updateFlight(game, enemy, player, dt) {
  const vertical = game.layout.kind === 'vertical';
  const distance = player.x - enemy.x;
  const height = enemy.wave ? Math.min(enemy.startY + 19, player.y - 119) : enemy.startY;
  const target = height + Math.sin(game.time * 2.2 + enemy.startX * .011) * 23;
  enemy.y = approach(enemy.y, target, 93 * dt);
  if (enemy.mode === 'windup') return;
  if (!vertical || Math.abs(enemy.y - player.y) < 388) {
    const pace = enemy.speed * (enemy.wave ? 1.63 : enemy.provoked ? 1.53 : 1);
    if (Math.abs(distance) > 111) enemy.x += Math.sign(distance) * pace * dt;
    if (Math.abs(distance) < 65) enemy.x -= Math.sign(distance) * pace * dt * .49;
  }
  const roam = enemy.wave ? game.layout.length : 370;
  enemy.x = clamp(enemy.x, Math.max(20, enemy.startX - roam), Math.min(game.layout.length - 20, enemy.startX + roam));
}

function attack(game, enemy, p) {
  if (enemy.type === 'flyer') {
    enemyOrb(game, enemy.x, enemy.y - 24, p.x - enemy.x, p.y - p.h * .57 - (enemy.y - 24), 286);
  } else if (enemy.type === 'brute') {
    const x = enemy.x + enemy.face * 36, y = enemy.y - 49;
    enemyOrb(game, x, y, enemy.face, 0, 348, 9, null, 'heavy');
    game.effects.hit(x, y, '#ffa756', 5);
  } else {
    game.sound('demon-claws', enemy.x, enemy.y - 36);
  }
}

export function updateEnemies(game, dt) {
  const p = game.player;
  const cam = game.camera;
  const wake = game.layout.kind !== 'ground' || game.pursuitStarted || p.x >= game.layout.start.x + 90 || p.recoil > 0;
  game.pursuitStarted ||= wake;
  for (const enemy of game.enemies) {
    if (enemy.hp <= 0) {
      enemy.deadAge += dt;
      continue;
    }
    const verticalRange = enemy.y >= cam.y - 265 && enemy.y <= cam.y + HEIGHT + 155;
    enemy.awake ||= wake && verticalRange && Math.abs(enemy.x - p.x) < (game.layout.kind === 'vertical' ? WIDTH : 1160);
    if (!enemy.awake) continue;
    if (!enemy.alerted && Math.abs(enemy.x - p.x) < 520 && Math.abs(enemy.y - p.y) < 205) {
      enemy.alerted = true;
      game.sound('demon-alert', enemy.x, enemy.y - enemy.h * .55);
    }
    enemy.hurt = Math.max(0, enemy.hurt - dt);
    enemy.provoked = Math.max(0, enemy.provoked - dt);
    enemy.cooldown = Math.max(0, enemy.cooldown - dt);
    enemy.landing = Math.max(0, enemy.landing - dt);
    if (enemy.mode === 'move') enemy.face = enemy.route?.direction ?? enemy.hop?.direction ?? (p.x < enemy.x ? -1 : 1);
    enemy.timer -= dt;

    if (enemy.mode === 'windup' && enemy.timer <= 0) {
      attack(game, enemy, p);
      enemy.mode = 'attack';
      enemy.timer = .24;
    }
    if (enemy.mode === 'attack' && enemy.timer <= 0) {
      enemy.mode = 'move';
      enemy.cooldown = enemy.type === 'imp' ? .87 : enemy.type === 'brute' ? 1.38 : 1.96;
    }
    const inRange = Math.abs(p.x - enemy.x) < enemy.range
      && Math.abs(p.y - enemy.y) < (enemy.type === 'flyer' ? 235 : 84);
    if (enemy.mode === 'move' && inRange && !enemy.cooldown && !enemy.provoked && !enemy.airborne && !enemy.route) {
      enemy.mode = 'windup';
      enemy.timer = enemy.type === 'imp' ? .27 : enemy.type === 'brute' ? .65 : .47;
    }

    if (enemy.type === 'flyer') updateFlight(game, enemy, p, dt);
    else walkEnemy(game, enemy, p, dt);
    if (overlaps(body(enemy), body(p))) receiveDamage(game, 1, enemy.x);
  }
}

export function enemyPose(enemy, time) {
  if (!enemy.hp || enemy.hurt > .095) return enemy.type === 'brute' ? 4 : 6;
  if (enemy.mode === 'windup') return enemy.type === 'brute' ? 5 : 3;
  if (enemy.mode === 'attack') return enemy.type === 'brute' ? 6 : 3;
  if (enemy.type === 'flyer') return [0, 1, 4, 2, 5][Math.floor(time * 11 + enemy.startX * .013) % 5];
  if (enemy.airborne) return enemy.type === 'brute' ? 2 : 4;
  if (enemy.landing) return enemy.type === 'brute' ? 1 : 5;
  if (Math.abs(enemy.vx) < 10) return 0;
  return enemy.type === 'brute' ? (Math.floor(time * 8) % 2) * 2 : 1 + Math.floor(time * 9) % 2;
}
