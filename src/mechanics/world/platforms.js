import {clamp} from '../../engine/geometry.js';

export function createTerrain(layout) {
  return (layout.terrain ?? []).map(segment => ({
    ...segment, baseX: segment.x, delta: 0,
  }));
}

export function movePlatforms(game) {
  for (const segment of game.terrain) {
    if (!segment.moving) continue;
    const previous = segment.x;
    segment.x = segment.baseX + Math.sin(game.time * 1.13 + segment.y * .013) * segment.moving;
    segment.delta = segment.x - previous;
  }
}

export function findSurface(entity, terrain, nextY, tolerance = 5, ignore = null) {
  let best = null;
  for (const surface of terrain) {
    if (surface === ignore) continue;
    if (entity.x + entity.w * .32 <= surface.x || entity.x - entity.w * .32 >= surface.x + surface.w) continue;
    if (surface.y < entity.y - tolerance || surface.y > nextY) continue;
    if (!best || surface.y < best.y) best = surface;
  }
  return best;
}

export function stayInWorld(game, entity) {
  const edge = game.layout.length;
  entity.x = clamp(entity.x, entity.w * .5, edge - entity.w * .5);
  if (!game.layout.gate || game.flags.reserve) return;
  const limit = game.layout.gate - entity.w * .6;
  if (entity.x > limit) entity.x = limit;
}
