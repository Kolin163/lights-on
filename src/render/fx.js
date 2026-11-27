import {WIDTH, HEIGHT} from '../engine/geometry.js';
import {centered, glow} from './drawing.js';

export function drawProjectiles(ctx, game, art) {
  for (const bolt of game.projectiles) {
    ctx.save();
    ctx.translate(bolt.x, bolt.y);
    ctx.rotate(Math.atan2(bolt.vy, bolt.vx));
    if (bolt.owner === 'player') {
      const size = 53;
      glow(ctx, -7, 0, 29, '#fa98466f');
      ctx.drawImage(art.bolt, -size * .70, -6, size, 12);
    } else {
      const boss = bolt.kind === 'boss-shot';
      const heavy = bolt.kind === 'heavy';
      const size = boss ? 49 : heavy ? 36 : bolt.radius * 3.8;
      glow(ctx, 0, 0, size * .96, boss ? '#fe7b4a9b' : '#e45d4980');
      centered(ctx, art.orb, 0, 0, size * (boss || heavy ? 1.26 : 1), size);
    }
    ctx.restore();
  }
}

function drawSuper(ctx, art, effect, progress, strength) {
  const {x, y, face, size} = effect;
  const length = Math.min(size, 155 + progress * 3400);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face, 1);
  ctx.globalAlpha = strength * .9;
  const glowLine = ctx.createLinearGradient(0, -28, 0, 28);
  glowLine.addColorStop(0, '#ff6f3600');
  glowLine.addColorStop(.5, '#ffb452cf');
  glowLine.addColorStop(1, '#ff6f3600');
  ctx.fillStyle = glowLine;
  ctx.fillRect(17, -28, length, 56);
  ctx.drawImage(art.arc, 25, -27, length, 54);
  ctx.strokeStyle = '#ffe4a9';
  ctx.lineWidth = 3 + strength * 2;
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(length + 12, 0);
  ctx.stroke();
  glow(ctx, 28, 0, 89, '#ffbc689a');
  ctx.restore();
}

export function drawEffects(ctx, game, art, reduceMotion) {
  for (const e of game.effects.items) {
    const strength = Math.max(0, e.life / e.length);
    const progress = 1 - strength;
    if (e.kind === 'wave') {
      drawSuper(ctx, art, e, progress, strength);
      continue;
    }
    if (reduceMotion && e.kind === 'spark') continue;
    ctx.save();
    ctx.globalAlpha = strength;
    if (e.kind === 'flash') {
      const size = e.size * (1 + progress);
      centered(ctx, art.impact, e.x, e.y, size * 1.6, size);
    } else if (e.kind === 'ring') {
      const size = e.size * (.45 + progress * 1.62);
      centered(ctx, art['charge-ring'], e.x, e.y, size, size);
      glow(ctx, e.x, e.y, 58, e.color, .24);
    } else if (e.kind === 'dust') {
      ctx.fillStyle = '#a58b73';
      ctx.globalAlpha *= .28;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size * (.85 + progress), 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = e.color;
      ctx.lineWidth = e.size;
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      ctx.lineTo(e.x - e.vx * .025, e.y - e.vy * .017);
      ctx.stroke();
    }
    ctx.restore();
  }
}

export function drawAir(ctx, game, reduceMotion) {
  const phase = game.time;
  const scene = game.layout.setting;
  const count = reduceMotion ? 15 : 44;
  ctx.save();
  for (let i = 0; i < count; i++) {
    const rain = scene === 'city' && i % 3 === 0;
    const speed = rain ? 340 + (i % 5) * 36 : 18 + (i % 7) * 9;
    const rawX = i * 107.491 - phase * speed * (rain ? .28 : .35) - game.camera.x * .22;
    const rawY = i * 49.873 + (rain ? phase : -phase) * speed - game.camera.y * .23;
    const x = ((rawX % WIDTH) + WIDTH) % WIDTH;
    const y = ((rawY % HEIGHT) + HEIGHT) % HEIGHT;
    ctx.globalAlpha = (rain ? .12 : .20) + (Math.cos(i * 2.77 + phase) + 1) * .16;
    if (rain) {
      ctx.strokeStyle = '#8badb8';
      ctx.lineWidth = .65;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 3.6, y + 12);
      ctx.stroke();
    } else {
      ctx.fillStyle = i % 5 ? '#bb8254' : '#ffe1a0';
      ctx.fillRect(x, y, i % 7 === 0 ? 2 : 1.2, i % 7 === 0 ? 2 : 1.2);
    }
  }
  ctx.restore();
}
