import {HEIGHT, WIDTH, clamp} from '../engine/geometry.js';
import {glow, tile} from './drawing.js';

function sky(ctx, art, x, rise) {
  ctx.fillStyle = '#152126';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  tile(ctx, art.sky, 0, WIDTH, -rise, HEIGHT + 112, 1270, x * .047);
}

function skyline(ctx, game, art) {
  const {camera, flags} = game;
  const lit = flags.powerAge;
  tile(ctx, art['city-far'], 0, WIDTH, 262, 125, 1420, camera.x * .22);
  tile(ctx, art['city-mid'], 0, WIDTH, 203, 242, 1170, camera.x * .59);
  ctx.fillStyle = 'rgba(9,17,23,' + (.24 - lit * .22) + ')';
  ctx.fillRect(0, 160, WIDTH, 286);
}

function plains(ctx, game, art) {
  const {x} = game.camera;
  const road = game.layout.setting === 'road';
  const base = road ? 322 : game.layout.start.y;
  if (!road) {
    const earth = ctx.createLinearGradient(0, base - 15, 0, HEIGHT);
    earth.addColorStop(0, '#302f2700');
    earth.addColorStop(.17, '#2d2e27');
    earth.addColorStop(1, '#0a1114');
    ctx.fillStyle = earth;
    ctx.fillRect(0, base - 15, WIDTH, HEIGHT - base + 15);
  }
  tile(ctx, art['steppe-far'], 0, WIDTH, base - 194, 190, 1460, x * .17);
  if (game.flags.power) {
    ctx.save();
    ctx.globalAlpha = game.flags.powerAge * .75;
    ctx.filter = 'brightness(1.38) saturate(1.16)';
    tile(ctx, art['city-far'], 0, WIDTH, 233, 80, 1200, x * .21);
    ctx.restore();
  }
  tile(ctx, art['steppe-mid'], 0, WIDTH, base - (road ? 247 : 243), 246, 1315, x * .48);
  if (game.flags.power) {
    const lit = game.flags.powerAge;
    ctx.save();
    ctx.globalAlpha = lit * .94;
    for (let i = 0; i < 28; i++) {
      const px = (i * 109.57 + 382) % 963;
      const y = 252 + Math.sin(i * 19 + 2) * 13;
      glow(ctx, px, y, 8 + (i % 5) * 3, '#ffc875b0');
      ctx.fillStyle = '#ffe89f';
      ctx.fillRect(px, y, i % 3 + 2, 2);
    }
    glow(ctx, WIDTH * .48, 274, 266, '#e29d3b3f');
    ctx.restore();
  }
}

function rooftops(ctx, game, art) {
  const inArena = game.layout.kind === 'arena';
  const y = inArena ? 0 : game.camera.y;
  const fromGround = inArena ? 1 : clamp(1 - y / (game.layout.height - HEIGHT), 0, 1);
  const farY = 232 + fromGround * 145;
  ctx.save();
  ctx.filter = 'brightness(1.17) saturate(1.18)';
  tile(ctx, art['city-far'], 0, WIDTH, farY, 162, 1300, y * .045);
  tile(ctx, art['city-mid'], 0, WIDTH, farY + 85, 216, 1150, y * .076);
  ctx.restore();

  for (let i = 0; i < 15; i++) {
    const x = (i * 77.21 + 28) % WIDTH;
    const height = farY + 62 + (i % 5) * 16;
    glow(ctx, x, height, 45, '#d58e3e4c', .65 + Math.sin(i * 11) * .1);
  }

  if (inArena) return;
  const base = 432 + (game.layout.height - HEIGHT - y) * .65;
  const buildings = [
    {x: -86, w: 273, stories: 3, level: 276, opacity: .71},
    {x: 166, w: 308, stories: 2, level: 284, opacity: .48},
    {x: 743, w: 301, stories: 4, level: 263, opacity: .78},
    {x: 478, w: 228, stories: 2, level: 246, opacity: .39},
  ];
  const buildingArt = art.apartment;
  for (const building of buildings) {
    ctx.globalAlpha = .94;
    ctx.filter = 'brightness(' + (building.opacity + .15) + ')';
    for (let i = 0; i < building.stories; i++) {
      const top = base - (i + 1) * building.level;
      if (top > HEIGHT || top + building.level < 0) continue;
      if (i === building.stories - 1) {
        ctx.drawImage(buildingArt, building.x, top, building.w, building.level + 1);
      } else {
        const cropY = Math.round(buildingArt.naturalHeight * .16);
        ctx.drawImage(buildingArt, 0, cropY, buildingArt.naturalWidth, buildingArt.naturalHeight * .74,
          building.x, top, building.w, building.level + 1);
      }
    }
  }
  ctx.filter = 'none';
  ctx.globalAlpha = .75;
  ctx.drawImage(art.crane, 9, 24 - y * .58, 902, 913);
  ctx.globalAlpha = 1;


}

export function drawBackdrop(ctx, game, art) {
  const {layout, camera} = game;
  const rise = Math.min(100, camera.y * .035);
  sky(ctx, art, camera.x + camera.y * .23, rise);
  if (layout.setting === 'city') skyline(ctx, game, art);
  if (layout.setting === 'steppe' || layout.setting === 'road') plains(ctx, game, art);
  if (layout.setting === 'construction' || layout.setting === 'rooftop') rooftops(ctx, game, art);
  const shade = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  shade.addColorStop(0, '#07101443');
  shade.addColorStop(.48, '#0000');
  shade.addColorStop(1, '#0a0c11ab');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}
