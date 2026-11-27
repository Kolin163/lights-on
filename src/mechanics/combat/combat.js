import {body, traceBox, WIDTH, HEIGHT} from '../../engine/geometry.js';
import {receiveDamage} from '../player/health.js';
import {hitBoss, bossTarget} from '../boss/encounter.js';

export function launchBolt(game, direction) {
  const p = game.player;
  const motor = game.layout.kind === 'bike';
  const aimX = motor ? p.face : direction.x;
  const aimY = motor ? 0 : direction.y;
  const steep = Math.abs(direction.y) > .56;
  const reach = steep ? 42 : 45;
  const x = p.x + aimX * (motor ? 54 : reach);
  const y = motor ? p.y - 113 : p.y - 55 + aimY * reach;
  const speed = (motor ? game.ride.speed : 0) + 975;
  game.projectiles.push({
    owner: 'player', x, y, vx: speed * aimX, vy: speed * aimY,
    radius: 4, life: 1.18, damage: 1, laneY: motor ? game.ride.laneY : null,
  });
  game.effects.hit(x, y, '#ffbf6b', 2);
  game.sound(motor ? 'bike-shot' : 'pulse-shot');
}

function hitEnemy(game, enemy, damage) {
  const player = game.player;
  enemy.hp = Math.max(0, enemy.hp - damage - (enemy.provoked ? 1 : 0));
  enemy.hurt = .18;
  enemy.vx *= .64;
  game.effects.hit(enemy.x, enemy.y - enemy.h * .53, '#ff9c59', enemy.hp > 0 ? 5 : 15);
  game.sound(enemy.hp ? 'demon-hit' : 'demon-fall', enemy.x, enemy.y - enemy.h * .53);
  if (enemy.hp) return;
  player.charge = Math.min(1, player.charge + (enemy.type === 'brute' ? .34 : .25));
  enemy.deadAge = .005;
}

export function releaseSuper(game) {
  const p = game.player;
  const y = p.y - (game.layout.kind === 'bike' ? 104 : 59);
  const reach = game.layout.kind === 'arena' ? 800 : 681;
  game.effects.beam(p.x + p.face * 23, y, p.face, reach);
  game.effects.hit(p.x + p.face * 56, y, '#ffc46b', 20);
  game.camera.shake = Math.max(game.camera.shake, 13);
  game.sound('super-blast');
  if (game.finishDelay !== null) return;
  for (const enemy of game.enemies) {
    const dx = (enemy.x - p.x) * p.face;
    if (!enemy.hp || dx < -10 || dx > reach || Math.abs(enemy.y - enemy.h * .5 - y) > 99 + dx * .08) continue;
    hitEnemy(game, enemy, 7);
  }
  if (game.boss && game.boss.hp > 0) {
    const forward = (game.boss.x - p.x) * p.face;
    if (forward >= -32 && forward <= reach && Math.abs(game.boss.y - 66 - y) <= 130) hitBoss(game, 10, true);
  }
  game.projectiles = game.projectiles.filter(projectile => projectile.owner === 'player'
    || (projectile.x - p.x) * p.face < 0 || (projectile.x - p.x) * p.face > reach
    || Math.abs(projectile.y - y) > 118);
}

export function provoke(game) {
  const p = game.player;
  const candidates = game.enemies.filter(enemy => enemy.hp > 0 && Math.abs(enemy.x - p.x) < 345
    && Math.abs(enemy.y - p.y) < 151 && (enemy.x - p.x) * p.face >= -24);
  const target = candidates.sort((a, b) => Math.abs(p.x - a.x) - Math.abs(p.x - b.x))[0];
  if (!target) return;
  target.awake = true;
  target.mode = 'move';
  target.provoked = 1.43;
  target.cooldown = 1.2;
  game.effects.ring(target.x, target.y - target.h * .82, '#efb475', 31);
}

function intersectsShot(projectile, oldX, oldY, target) {
  const r = projectile.radius;
  return traceBox(oldX, oldY, projectile.x, projectile.y, {
    x: target.x - r, y: target.y - r, w: target.w + r * 2, h: target.h + r * 2,
  });
}

export function updateProjectiles(game, dt) {
  const pBox = body(game.player);
  const view = game.camera;
  for (const bolt of game.projectiles) {
    const previousX = bolt.x, previousY = bolt.y;
    bolt.x += bolt.vx * dt;
    bolt.y += bolt.vy * dt;
    bolt.life -= dt;
    if (bolt.life <= 0 || bolt.x < view.x - 235 || bolt.x > view.x + WIDTH + 300
      || bolt.y < view.y - 230 || bolt.y > view.y + HEIGHT + 165) {
      bolt.life = 0;
      continue;
    }
    if (game.finishDelay !== null) continue;
    if (bolt.owner === 'enemy') {
      if (game.ride && Math.abs(bolt.laneY - game.ride.laneY) > 27) continue;
      if (intersectsShot(bolt, previousX, previousY, pBox)) {
        receiveDamage(game, bolt.damage, previousX);
        bolt.life = 0;
      }
      continue;
    }
    if (game.boss?.hp > 0 && intersectsShot(bolt, previousX, previousY, bossTarget(game.boss))) {
      hitBoss(game, bolt.damage, false);
      bolt.life = 0;
      continue;
    }
    for (const enemy of game.enemies) {
      if (!enemy.hp || (game.ride && Math.abs(bolt.laneY - enemy.laneY) > 27)
        || !intersectsShot(bolt, previousX, previousY, body(enemy))) continue;
      hitEnemy(game, enemy, bolt.damage);
      bolt.life = 0;
      break;
    }
  }
  game.projectiles = game.projectiles.filter(bolt => bolt.life > 0);
}
