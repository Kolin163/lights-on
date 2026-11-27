import {WIDTH, HEIGHT} from '../engine/geometry.js';
import {ARENA_PIVOT, cameraPose} from '../mechanics/world/camera.js';
import {drawBackdrop} from './backdrops.js';
import {drawScenery, drawPickups, drawWarning, drawRideMarkers} from './scenery.js';
import {drawBoss, drawEnemies, drawPlayer} from './actors.js';
import {drawAir, drawEffects, drawProjectiles} from './fx.js';

export function createRenderer(canvas, art, reduceMotion = false) {
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = WIDTH * ratio;
  canvas.height = HEIGHT * ratio;
  const ctx = canvas.getContext('2d', {alpha: false});
  ctx.imageSmoothingEnabled = false;
  const vignette = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 196, WIDTH / 2, HEIGHT / 2, 551);
  vignette.addColorStop(0, '#0000');
  vignette.addColorStop(1, '#080b0e82');

  return game => {
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawBackdrop(ctx, game, art);
    const {x, y, roll} = cameraPose(game);
    ctx.save();
    ctx.translate(x, y);
    if (roll) {
      ctx.translate(ARENA_PIVOT.x, ARENA_PIVOT.y);
      ctx.rotate(roll);
      ctx.translate(-ARENA_PIVOT.x, -ARENA_PIVOT.y);
    }
    drawScenery(ctx, game, art, reduceMotion);
    drawWarning(ctx, game);
    drawPickups(ctx, game, art);
    drawEnemies(ctx, game, art);
    drawBoss(ctx, game, art);
    drawPlayer(ctx, game, art, reduceMotion);
    if (game.ride) drawRideMarkers(ctx, game);
    drawProjectiles(ctx, game, art);
    drawEffects(ctx, game, art, reduceMotion);
    ctx.restore();
    drawAir(ctx, game, reduceMotion);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  };
}
