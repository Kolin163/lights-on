import {approach, clamp, WIDTH} from '../../engine/geometry.js';
import {receiveDamage} from '../player/health.js';
import {updateAttacks, updatePlayerTimers} from '../player/controller.js';
import {enemyOrb, spawnEnemy} from '../combat/enemies.js';
import {collectPickup} from '../world/objectives.js';

export const LANES = [308, 367, 426, 485];
// Rider and threats share a fixed firing line in each road lane.
const rideThreatHeights = { imp: 111, flyer: 83, brute: 114 };

export function createRide(layout, distance = 0) {
  const ahead = distance + 120;
  return {
    distance, speed: 355, offset: 160, lane: 1, laneY: LANES[1],
    lift: 0, liftVelocity: 0, brake: 0, laneTap: 0, aimHold: 0,
    queue: layout.pursuers.filter(([x]) => x >= ahead),
    obstacles: layout.obstacles.filter(([x]) => x >= ahead)
      .map(([x, lane, art]) => ({x, lane, art, checked: false})),
  };
}

function deployPursuers(game) {
  const ride = game.ride;
  while (ride.queue.length && ride.queue[0][0] <= ride.distance + WIDTH + 110) {
    const [x, lane, type] = ride.queue.shift();
    const y = LANES[lane] - (type === 'flyer' ? 44 : 0);
    const enemy = spawnEnemy({type, x, y, h: rideThreatHeights[type]}, game.layout);
    enemy.lane = lane;
    enemy.laneY = LANES[lane];
    enemy.awake = true;
    enemy.fired = false;
    game.enemies.push(enemy);
  }
}

function movePursuers(game, dt) {
  for (const enemy of game.enemies) {
    if (enemy.hp <= 0) {
      enemy.deadAge += dt;
      continue;
    }
    enemy.hurt = Math.max(0, enemy.hurt - dt);
    enemy.provoked = Math.max(0, enemy.provoked - dt);
    enemy.vx = enemy.type === 'flyer' ? -42 : -95;
    enemy.x += enemy.vx * dt;
    if (enemy.type === 'flyer') enemy.y = enemy.startY + Math.sin(game.time * 5 + enemy.startX) * 10;
    const p = game.player;
    const difference = enemy.x - p.x;
    const sameLane = Math.abs(LANES[enemy.lane] - game.ride.laneY) < 26;
    if (!enemy.alerted && difference > 0 && difference < 475) {
      enemy.alerted = true;
      game.sound('demon-alert', enemy.x, enemy.y - enemy.h * .55);
    }
    if (enemy.type !== 'imp' && !enemy.fired && difference > 250 && difference < 625 && enemy.mode === 'move') {
      enemy.mode = 'windup';
      enemy.timer = enemy.type === 'brute' ? .61 : .51;
    }
    if (enemy.mode === 'windup' && (enemy.timer -= dt) <= 0) {
      const brute = enemy.type === 'brute';
      const y = enemy.y - (brute ? 45 : 13);
      enemyOrb(game, enemy.x - 12, y, -1, 0, brute ? 331 : 272,
        brute ? 9 : 8, enemy.laneY, brute ? 'heavy' : 'orb');
      enemy.mode = 'attack';
      enemy.timer = .28;
      enemy.fired = true;
    }
    if (enemy.mode === 'attack' && (enemy.timer -= dt) <= 0) enemy.mode = 'move';
    if (Math.abs(difference) < 47 && sameLane && game.ride.lift < 48 && enemy.type !== 'flyer') {
      receiveDamage(game, 1, enemy.x);
    }
  }
  game.enemies = game.enemies.filter(enemy => enemy.x >= game.ride.distance - 155 && enemy.deadAge < .55);
}

function checkRoad(game) {
  const r = game.ride;
  const p = game.player;
  for (const obstacle of r.obstacles) {
    if (obstacle.checked || p.x < obstacle.x - 31) continue;
    const delta = p.x - obstacle.x;
    if (delta > 68) {
      obstacle.checked = true;
      continue;
    }
    const height = obstacle.art === 'car' ? 58 : obstacle.art === 'barrier' ? 33 : 18;
    if (Math.abs(r.laneY - LANES[obstacle.lane]) > 23 || r.lift >= height) continue;
    obstacle.checked = true;
    if (receiveDamage(game, 1, obstacle.x)) {
      r.brake = .4;
      game.sound('bike-skid');
    }
  }
  for (const item of game.pickups) {
    if (!item.taken && Math.abs(item.x - p.x) < 46 && Math.abs(LANES[item.lane] - r.laneY) < 25 && r.lift < 54) {
      collectPickup(game, item);
    }
  }
}

export function updateRide(game, input, dt) {
  const r = game.ride;
  const p = game.player;
  updatePlayerTimers(p, dt);
  r.laneTap = Math.max(0, r.laneTap - dt);
  const up = input.tap('up');
  const down = input.tap('down');
  const steer = Number(down || (!r.laneTap && input.down('down'))) - Number(up || (!r.laneTap && input.down('up')));
  if (steer) {
    r.lane = clamp(r.lane + steer, 0, LANES.length - 1);
    r.laneTap = .175;
  }
  r.laneY = approach(r.laneY, LANES[r.lane], 486 * dt);
  const axis = Number(input.down('right')) - Number(input.down('left'));
  r.offset = clamp(r.offset + axis * 121 * dt, 104, 252);

  if (input.tap('jump') && !r.lift && !p.superTime) {
    r.liftVelocity = 361;
    game.effects.dust(p.x, r.laneY, -1.9, 5);
    game.sound('jump');
  }
  const wasAirborne = r.lift > 0;
  r.liftVelocity -= 842 * dt;
  r.lift = Math.max(0, r.lift + r.liftVelocity * dt);
  if (wasAirborne && !r.lift) game.sound('land');
  if (!r.lift) r.liftVelocity = 0;
  p.grounded = r.lift < 2;
  r.brake = Math.max(0, r.brake - dt);
  const targetSpeed = (r.brake ? 267 : 353) + r.distance * .0039;
  r.speed = approach(r.speed, targetSpeed, dt * 680);
  r.distance += r.speed * dt;
  p.x = r.distance + r.offset;
  p.y = r.laneY - r.lift;
  p.face = 1;

  deployPursuers(game);
  movePursuers(game, dt);
  if (game.finishDelay === null) checkRoad(game);
  const aiming = input.down('fire') || p.superTime > 0;
  r.aimHold = aiming ? .28 : Math.max(0, r.aimHold - dt);
  updateAttacks(game, input, dt, 0, true);
  if (r.distance >= game.layout.length && game.finishDelay === null) {
    game.objective = 'Полевой съезд достигнут';
    game.notify('Дальше пешком', 1.5);
    game.complete();
  }
}

