import {approach, body, clamp, overlaps} from '../../engine/geometry.js';
import {receiveDamage} from '../player/health.js';
import {enemyOrb} from '../combat/enemies.js';
import {HERO_NAME} from '../../levels/catalog.js';
import {WALK_FRAME_DISTANCE} from './animation.js';

const HEALTH = 85;
const ARMOR_FLOOR = 18;
export const DECK = 388;
export const SHOT_Y = DECK - 26;
export const SHOT_REACH = 103;

export function createBoss() {
  return {
    x: 739, y: DECK, h: 129, w: 96, hp: HEALTH, maxHp: HEALTH, face: -1,
    phase: 1, fanStrikes: 0, mode: 'walk', timer: 1.22, strike: 0, attackX: 0,
    attackDirection: -1, attack: 'lunge', hurt: 0, wind: 0, deadAge: 0, shieldAge: 0,
    repairTimer: 3, walking: false, walkDistance: 0, flinch: 0, flinchCooldown: 0,
  };
}

export function bossTarget(boss) {
  return body(boss);
}

export function hitBoss(game, force, superShot) {
  const b = game.boss;
  if (!b.hp) return;
  if (b.phase === 3 && !game.flags.override) {
    if (!b.shieldAge) game.effects.ring(b.x, b.y - 70, '#f6ab53', 49);
    b.shieldAge = .2;
    return;
  }
  const exposed = b.mode === 'recovery' || b.mode === 'stagger';
  const damage = superShot ? force * 1.26 : force * (exposed ? 1.45 : b.mode === 'windup' ? .82 : .64);
  const floor = game.flags.override ? 0 : b.phase === 2 && b.fanStrikes < 2 ? ARMOR_FLOOR + 1 : ARMOR_FLOOR;
  const previousHP = b.hp;
  b.hp = Math.max(floor, b.hp - damage);
  if (b.hp > 0 && b.hp < previousHP) game.sound('boss-hit', b.x, b.y - 71);
  b.hurt = .12;
  if ((exposed || b.mode === 'walk') && (superShot || !b.flinchCooldown)) {
    b.flinch = superShot ? .25 : .13;
    b.flinchCooldown = .86;
  }
  game.effects.hit(b.x - b.face * 8, b.y - 71, '#ffad65', superShot ? 19 : 5);
  if (b.hp <= ARMOR_FLOOR && b.phase < 3) {
    b.phase = 3;
    b.mode = 'recovery';
    b.timer = 1.8;
    game.objective = 'Зафиксировать подвес у щита';
    game.notify('Демон закрылся. Подойди к щиту слева.', 3);
    game.say(HERO_NAME, 'Пока карту не уронил, надо зафиксировать подвес.', 3.1, true);
  } else if (b.hp <= 57 && b.phase === 1) {
    b.phase = 2;
    game.objective = 'Удержаться на видеокарте';
    game.notify('Вентиляторы включены', 2.15);
    game.camera.shake = 8;
  }
  if (b.hp > 0) return;
  b.mode = 'defeated';
  b.deadAge = .01;
  b.wind = 0;
  game.effects.hit(b.x, b.y - 81, '#ffbb70', 31);
  game.objective = 'Видеокарта спасена';
  game.notify('Видеокарта спасена', 2);
  game.sound('boss-collapse', b.x, b.y - 70);
  game.complete(1.8);
}

function prepareStrike(game, b, p) {
  b.mode = 'windup';
  b.attack = b.strike % 2 === 1 ? 'shot' : 'lunge';
  b.timer = b.attack === 'shot' ? .96 : .71;
  b.attackDirection = p.x < b.x ? -1 : 1;
  b.face = b.attackDirection;
  b.attackX = clamp(p.x + p.vx * .08, 107, 853);
  if (b.attack === 'shot') {
    game.notify(game.touch ? 'Низкий снаряд · прыгай' : 'Низкий снаряд · Пробел', 1.15);
    game.sound('boss-windup', b.x, b.y - 63);
  }
}

function strike(game, b) {
  b.mode = 'strike';
  b.timer = b.attack === 'shot' ? .25 : .30;
  b.strike++;
  if (b.phase === 2) b.fanStrikes++;
  const dir = b.attackDirection;
  game.camera.shake = Math.max(game.camera.shake, b.attack === 'shot' ? 4 : 7);
  if (b.attack === 'shot') {
    const x = b.x + dir * SHOT_REACH;
    enemyOrb(game, x, SHOT_Y, dir, 0, 334, 12, null, 'boss-shot');
    game.effects.hit(x, SHOT_Y, '#ffac66', 10);
  } else {
    game.effects.dust(b.x - dir * 29, DECK - 3, dir * 2, 11);
    game.sound('boss-dash', b.x, b.y - 53);
  }
}

function replenishRepair(game, b, dt) {
  b.repairTimer = Math.max(0, b.repairTimer - dt);
  if (b.repairTimer || game.player.hp > 4 || game.pickups.some(item => !item.taken)) return;
  const x = b.x > 480 ? 275 : 686;
  game.pickups.push({type: 'repair', x, y: DECK - 28, taken: false});
  game.effects.ring(x, DECK - 29, '#9cf1b7', 48);
  b.repairTimer = 6.2;
}

export function updateBoss(game, dt) {
  const b = game.boss;
  const p = game.player;
  b.hurt = Math.max(0, b.hurt - dt);
  if (!b.hp) {
    b.deadAge += dt;
    return;
  }
  b.flinch = Math.max(0, b.flinch - dt);
  b.flinchCooldown = Math.max(0, b.flinchCooldown - dt);
  b.shieldAge = Math.max(0, b.shieldAge - dt);
  const gust = b.phase === 1 || game.flags.override ? 0 : Math.max(0, Math.sin(game.time * 2.5));
  const wind = gust * (b.strike % 2 === 0 ? -1 : 1);
  b.wind = approach(b.wind, wind, dt * 1.8);
  if (Math.abs(b.wind) > .15) p.x = clamp(p.x + b.wind * (p.grounded ? 28 : 79) * dt, 22, 938);

  replenishRepair(game, b, dt);
  const previousX = b.x;
  b.timer -= dt;
  if (b.mode === 'walk') {
    const delta = p.x - b.x;
    b.face = Math.sign(delta) || b.face;
    if (Math.abs(delta) > 195) b.x += b.face * (b.phase === 1 ? 74 : 88) * dt;
    if (b.timer <= 0) prepareStrike(game, b, p);
  } else if (b.mode === 'windup' && b.timer <= 0) {
    strike(game, b);
  } else if (b.mode === 'strike') {
    if (b.attack === 'lunge') {
      b.x += b.attackDirection * (b.phase === 1 ? 337 : 395) * dt;
      const close = Math.abs(p.x - b.x) < 149;
      if (close && ((Math.abs(p.x - b.attackX) < 65 && p.y > DECK - 51) || overlaps(body(p), body(b)))) {
        receiveDamage(game, 1, b.x);
      }
    }
    if (b.timer <= 0) {
      b.mode = 'recovery';
      b.timer = b.attack === 'shot' ? 1.08 : .95;
    }
  } else if ((b.mode === 'recovery' || b.mode === 'stagger') && b.timer <= 0) {
    b.mode = 'walk';
    b.timer = b.phase === 1 ? 1.27 : 1.04;
  }
  b.x = clamp(b.x, 132, 834);
  b.walking = b.mode === 'walk' && Math.abs(b.x - previousX) > .01;
  if (b.walking) {
    const stride = WALK_FRAME_DISTANCE * 2;
    const previousFootfall = Math.floor(b.walkDistance / stride);
    b.walkDistance += Math.abs(b.x - previousX);
    if (Math.floor(b.walkDistance / stride) > previousFootfall) {
      game.effects.dust(b.x + b.face * 34, DECK - 2, b.face * -.6, 4);
      game.sound('boss-step', b.x, DECK);
    }
  }
}
