export const WIDTH = 960;
export const HEIGHT = 540;

export function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value));
}

export function approach(value, target, amount) {
  return value + clamp(target - value, -amount, amount);
}

export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x
    && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function body(entity) {
  return {x: entity.x - entity.w / 2, y: entity.y - entity.h, w: entity.w, h: entity.h};
}

export function traceBox(x1, y1, x2, y2, box) {
  let near = 0;
  let far = 1;
  for (const [start, end, min, max] of [[x1, x2, box.x, box.x + box.w], [y1, y2, box.y, box.y + box.h]]) {
    const delta = end - start;
    if (delta === 0) {
      if (start < min || start > max) return false;
      continue;
    }
    const a = (min - start) / delta;
    const b = (max - start) / delta;
    near = Math.max(near, Math.min(a, b));
    far = Math.min(far, Math.max(a, b));
    if (near > far) return false;
  }
  return true;
}
