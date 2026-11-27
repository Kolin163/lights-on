import {WIDTH, HEIGHT} from '../engine/geometry.js';
import {aimFrame, heroFrame, playerPose, runningFrame} from '../mechanics/player/animation.js';
import {aimMuzzle} from '../mechanics/player/aim.js';
import {enemyPose} from '../mechanics/combat/enemies.js';
import {bossPose} from '../mechanics/boss/animation.js';
import {floorShadow, glow} from './drawing.js';
import {drawBike} from './bike.js';
import {drawAimedHero} from './player-aim.js';

function drawFrame(ctx, art, frame) {
  const w = frame.right - frame.left;
  const h = frame.bottom - frame.top;
  const scale = frame.scale;
  const scaleY = frame.scaleY ?? scale;
  ctx.drawImage(art[frame.sheet], frame.left, frame.top, w, h,
    (frame.left - frame.anchorX) * scale, (frame.top - frame.anchorY) * scaleY, w * scale, h * scaleY);
}

function muzzleFlash(ctx, art, x, y, angle, recoil) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha *= (recoil - .105) / .035;
  glow(ctx, 6, 0, 16, '#ffb04990');
  ctx.drawImage(art.impact, -3, -8, 23, 16);
  ctx.restore();
}

function drawStandingSprite(ctx, image, x, y, height, flip) {
  const width = image.naturalWidth / image.naturalHeight * height;
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(image, -width / 2, -height, width, height);
  ctx.restore();
}

export function drawPlayer(ctx, game, art, reduceMotion) {
  const p = game.player;
  if (p.grounded) floorShadow(ctx, p.x, p.y, game.ride ? 61 : 30);
  ctx.save();
  if (!reduceMotion && p.invulnerable > .06 && Math.floor(p.invulnerable * 19) % 2) ctx.globalAlpha = .62;
  if (p.healFlash > 0) ctx.filter = 'brightness(1.25)';
  if (game.ride) {
    drawBike(ctx, game, art, reduceMotion);
    ctx.restore();
    return;
  }
  if (p.superTime > .36) glow(ctx, p.x + p.face * 56, p.y - 57, 90, '#fc853b8a', (1 - p.superTime) * 1.7);
  const aim = p.aim?.pose || !p.recoil ? p.aim : p.shotDirection;
  const canAim = !p.hurtTime && !p.tauntTime && !p.superTime;
  const angled = canAim && aim && Math.abs(aim.y) > .56;
  const [row, col] = playerPose(p, game.time);
  ctx.translate(p.x, p.y);
  if (p.face < 0) ctx.scale(-1, 1);
  if (canAim && aim?.pose) {
    drawAimedHero(ctx, art, aim);
    if (p.recoil > .105) {
      const {x, y} = aimMuzzle(aim);
      muzzleFlash(ctx, art, x, y, aim.angle, p.recoil);
    }
  } else if (canAim && p.moving && p.grounded && (row === 1 || p.recoil > 0 || angled)) {
    const aimUp = angled && aim.y < 0;
    const frame = runningFrame(p.walkTime, aimUp);
    drawFrame(ctx, art, frame);
    if (p.recoil > .105) {
      const [sourceX, sourceY] = frame.muzzle;
      const x = (sourceX - frame.anchorX) * frame.scale;
      const y = (sourceY - frame.anchorY) * frame.scaleY;
      muzzleFlash(ctx, art, x, y, aimUp ? -Math.PI / 4 : 0, p.recoil);
    }
  } else {
    const frame = angled
      ? aimFrame('aim-' + (aim.y < 0 ? 'up-' : 'down-') + Number(p.recoil > .09))
      : heroFrame(row, col);
    drawFrame(ctx, art, frame);
  }
  ctx.restore();
}

export function drawEnemies(ctx, game, art) {
  for (const enemy of game.enemies) {
    if ((!enemy.hp && enemy.deadAge >= .49)
      || enemy.x < game.camera.x - 140 || enemy.x > game.camera.x + WIDTH + 140
      || enemy.y < game.camera.y - 145 || enemy.y > game.camera.y + HEIGHT + 120) continue;
    const pose = enemyPose(enemy, game.time);
    let height = enemy.type === 'flyer' ? [103, 96, 73, 82, 79, 86, 79][pose] : enemy.type === 'brute' ? 114 : [77, 77, 76, 86, 79, 67, 79][pose];
    if (game.ride && enemy.type === 'imp') height = enemy.h + 1 + (height - 77) * .28;
    if (enemy.type !== 'flyer' && enemy.hp && !enemy.airborne) floorShadow(ctx, enemy.x, enemy.y, enemy.w * .59);
    ctx.save();
    if (!enemy.hp) ctx.globalAlpha = Math.max(0, (.49 - enemy.deadAge) * 2);
    if (enemy.hp && enemy.hurt) ctx.filter = 'brightness(1.39) saturate(1.26)';
    const y = enemy.hp ? enemy.y : enemy.y + enemy.deadAge * 21;
    drawStandingSprite(ctx, art[enemy.type + '-' + pose], enemy.x, y, height, enemy.face === 1);
    ctx.restore();
    if (enemy.hp && (enemy.mode === 'windup' || enemy.provoked)) {
      const color = enemy.provoked ? '#ecc87d8a' : '#ef643c87';
      const charging = enemy.type === 'brute' && enemy.mode === 'windup';
      glow(ctx, enemy.x + (charging ? enemy.face * 36 : 0), enemy.y - (charging ? 49 : height * .76),
        charging ? 32 : 26, color, charging ? .65 + .28 * Math.sin(game.time * 31) : .76);
    }
    if (enemy.type === 'brute' && enemy.hp > 0 && enemy.hp < enemy.maxHp) {
      ctx.fillStyle = '#251917';
      ctx.fillRect(enemy.x - 23, y - height - 9, 46, 4);
      ctx.fillStyle = '#da8459';
      ctx.fillRect(enemy.x - 23, y - height - 9, 46 * enemy.hp / enemy.maxHp, 3);
    }
  }
}

export function drawBoss(ctx, game, art) {
  const boss = game.boss;
  if (!boss) return;
  floorShadow(ctx, boss.x, boss.y, boss.deadAge >= .56 ? 87 : 62, .37);
  ctx.save();
  ctx.translate(boss.x, boss.y);
  if (boss.face > 0) ctx.scale(-1, 1);
  if (boss.hurt > 0) ctx.filter = 'brightness(1.38) saturate(1.16)';
  drawFrame(ctx, art, bossPose(boss));
  ctx.restore();
  if (boss.hp > 0 && boss.phase === 3 && !game.flags.override) {
    const alpha = boss.shieldAge > 0 ? .66 : .29;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(art['charge-ring'], boss.x - 62, boss.y - 142, 124, 151);
    ctx.restore();
  }
}
