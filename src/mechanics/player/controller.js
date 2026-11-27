import {approach} from '../../engine/geometry.js';
import {findSurface, stayInWorld} from '../world/platforms.js';
import {screenToWorld} from '../world/camera.js';
import {launchBolt, releaseSuper, provoke} from '../combat/combat.js';
import {HERO_NAME} from '../../levels/catalog.js';
import {mouseAim} from './aim.js';

import {MAX_ARMOR} from './health.js';
const GRAVITY = 1190;
const RUN_SPEED = 293;
const JUMP_SPEED = 655;

export function createPlayer(position, charge = 0) {
  return {
    x: position.x, y: position.y, w: 37, h: 84, vx: 0, vy: 0, face: 1, grounded: true, surface: null,
    dropSurface: null,
    hp: MAX_ARMOR, charge, invulnerable: 0, recoil: 0, cooldown: 0, healFlash: 0,
    hurtTime: 0, walkTime: 0, jumpAge: 0, landed: 0, coyote: 0, jumpBuffer: 0, holdJump: 0,
    shotDirection: {x: 1, y: 0}, tauntTime: 0, tauntDone: false,
    superTime: 0, superReleased: false, moving: false,
  };
}

export function updatePlayerTimers(player, dt) {
  for (const name of ['invulnerable', 'recoil', 'cooldown', 'hurtTime', 'healFlash', 'landed', 'coyote', 'jumpBuffer', 'holdJump']) {
    player[name] = Math.max(0, player[name] - dt);
  }
}

function keyboardAim(game, input, axis) {
  const player = game.player;
  if (!input.down('up') && !input.down('down')) return {x: player.face, y: 0};
  if (input.down('down') && player.grounded) return {x: player.face, y: 0};
  const x = axis ? .71 : .30;
  const aim = {x: player.face * x, y: Math.sqrt(1 - x * x) * (input.down('up') ? -1 : 1)};
  let best = .77;
  let assisted = aim;
  for (const target of game.enemies) {
    if (!target.hp) continue;
    const dy = target.y - target.h * .52 - (player.y - 58);
    const dx = target.x - player.x;
    const length = Math.hypot(dx, dy);
    if (length < 49 || length > 426 || dx * player.face < -11) continue;
    const alignment = (dx * aim.x + dy * aim.y) / length;
    if (alignment <= best) continue;
    best = alignment;
    assisted = {x: dx / length, y: dy / length};
  }
  return assisted;
}

export function updateAttacks(game, input, dt, axis = 0, bike = false) {
  const player = game.player;

  if (input.tap('taunt') && !player.tauntTime && !player.superTime && !player.hurtTime && player.grounded) {
    player.tauntTime = .94;
    player.tauntDone = false;
  }
  if (player.tauntTime > 0) {
    player.tauntTime = Math.max(0, player.tauntTime - dt);
    if (!player.tauntDone && player.tauntTime <= .56) {
      player.tauntDone = true;
      const phrases = game.mission.taunts.filter(line => !game.tauntHistory.includes(line));
      const phrase = phrases[Math.floor(Math.random() * phrases.length)];
      game.tauntHistory = [...game.tauntHistory.slice(-1), phrase];
      game.say(HERO_NAME, phrase, 2.55, true);
      game.sound('taunt');
      provoke(game);
    }
  }

  if (input.tap('super') && !player.superTime && !player.tauntTime) {
    if (player.charge >= 1 && (bike || player.grounded)) {
      player.charge = 0;
      player.superTime = .9;
      player.superReleased = false;
      game.sound('super-charge');
    } else {
      game.notify(player.charge < 1 ? 'Супер-атака ещё заряжается' : 'Для залпа нужно встать на землю', 1.25);
    }
  }
  if (player.superTime > 0) {
    player.superTime = Math.max(0, player.superTime - dt);
    if (!player.superReleased && player.superTime <= .36) {
      player.superReleased = true;
      releaseSuper(game);
    }
  }

  const fire = input.tap('fire') || input.down('fire');
  if (!fire || player.cooldown || player.tauntTime || player.superTime) return;
  player.shotDirection = bike ? {x: player.face, y: 0} : player.aim ?? keyboardAim(game, input, axis);
  player.cooldown = bike ? .162 : .148;
  player.recoil = .14;
  launchBolt(game, player.shotDirection);
}

export function updatePlayer(game, input, dt) {
  const player = game.player;
  updatePlayerTimers(player, dt);
  const axis = Number(input.down('right')) - Number(input.down('left'));
  const locked = player.tauntTime > 0 || player.superTime > 0;
  if (axis && !locked) player.face = axis;
  const target = locked ? 0 : axis * RUN_SPEED;
  player.vx = approach(player.vx, target, (player.grounded ? 2120 : 1520) * dt);
  if (player.surface?.moving && player.grounded) player.x += player.surface.delta;
  player.x += player.vx * dt;
  stayInWorld(game, player);

  const jumpPressed = input.tap('jump');
  const dropPressed = input.tap('down');
  if (dropPressed && !locked && player.grounded && player.surface && !player.surface.ground && game.layout.kind !== 'arena') {
    player.dropSurface = player.surface;
    player.surface = null;
    player.grounded = false;
    player.coyote = 0;
    player.jumpBuffer = 0;
    player.holdJump = 0;
    player.jumpAge = .09;
    player.vy = 116;
  } else if (jumpPressed) {
    player.jumpBuffer = .125;
  }
  if (player.grounded) player.coyote = .105;
  if (player.jumpBuffer && player.coyote && !locked) {
    player.jumpBuffer = 0;
    player.coyote = 0;
    player.grounded = false;
    player.surface = null;
    player.vy = -JUMP_SPEED;
    player.holdJump = .15;
    player.jumpAge = 0;
    game.effects.dust(player.x, player.y - 3, player.face * -.65, 7);
    game.sound('jump');
  }
  const shortHop = player.vy < -235 && !input.down('jump') && player.holdJump > 0;
  if (shortHop) {
    player.vy *= .61;
    player.holdJump = 0;
  }

  const previousGrounded = player.grounded;
  player.vy = Math.min(980, player.vy + GRAVITY * dt);
  const nextY = player.y + player.vy * dt;
  const surface = player.vy >= 0 ? findSurface(player, game.terrain, nextY, undefined, player.dropSurface) : null;
  player.grounded = Boolean(surface);
  player.surface = surface;
  if (surface) {
    if (!previousGrounded && player.vy > 250) {
      game.effects.dust(player.x, surface.y - 3, player.vx * .005, 8);
      player.landed = .105;
      game.sound('land');
    }
    player.y = surface.y;
    player.vy = 0;
  } else {
    player.y = nextY;
    player.jumpAge += dt;
  }
  if (player.dropSurface && player.y > player.dropSurface.y + 5) player.dropSurface = null;

  player.moving = Math.abs(player.vx) > 12;
  if (player.moving && player.grounded) {
    const step = Math.floor(player.walkTime * 4.5);
    player.walkTime += dt * Math.abs(player.vx) / RUN_SPEED;
    if (Math.floor(player.walkTime * 4.5) > step && !player.landed) {
      const material = surface.art === 'soil' ? 'dirt' : surface.art === 'asphalt' ? 'asphalt' : 'metal';
      game.sound('boot-' + material);
    }
  }
  const pointer = input.pointer?.();
  if (pointer && !locked && !player.hurtTime) {
    const moving = Boolean(axis) || player.moving;
    const target = screenToWorld(game, pointer);
    const dx = target.x - player.x;
    if (!moving && Math.abs(dx) > 3) player.face = Math.sign(dx);
    player.aim = mouseAim(player, target, moving);
  } else {
    player.aim = keyboardAim(game, input, axis);
  }
  updateAttacks(game, input, dt, axis);

  if (player.y > game.layout.height + 85) game.fail();
}

