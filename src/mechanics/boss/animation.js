export const WALK_FRAME_DISTANCE = 21;

function frame(sheet, scale, [left, top, right, bottom, anchorX, anchorY]) {
  return {sheet, scale, left, top, right, bottom, anchorX, anchorY};
}

const walk = [
  [45, 15, 618, 587, 348, 583],
  [647, 6, 1128, 589, 954, 585],
  [32, 632, 593, 1223, 303, 1219],
  [648, 630, 1151, 1225, 950, 1221],
].map(bounds => frame('crane-walk', .302, bounds));

const [charge, fire, sweep, recoil, kneel, fallen] = [
  [11, 25, 499, 465, 341, 461],
  [515, 69, 988, 466, 849, 461],
  [1000, 101, 1527, 469, 1344, 461],
  [34, 527, 473, 975, 310, 970],
  [520, 624, 980, 973, 791, 969],
  [1005, 762, 1514, 983, 1291, 979],
].map(bounds => frame('crane-actions', .385, bounds));

const idle = frame('crane-demon-0', .301, [0, 0, 455, 565, 255, 563]);
const windup = frame('crane-demon-1', .380, [0, 0, 455, 439, 310, 436]);
const lunge = frame('crane-demon-2', .457, [0, 0, 455, 341, 310, 339]);
const recover = frame('crane-demon-3', .343, [0, 0, 455, 450, 324, 447]);

export function bossPose(boss) {
  if (!boss.hp) {
    if (boss.deadAge < .18) return recoil;
    return boss.deadAge < .56 ? kneel : fallen;
  }
  if (boss.mode === 'windup') return boss.attack === 'shot' && boss.timer < .62 ? charge : windup;
  if (boss.mode === 'strike') {
    if (boss.attack === 'shot') return fire;
    return boss.timer > .11 ? lunge : sweep;
  }
  if (boss.mode === 'stagger') return boss.timer > .64 ? recoil : recover;
  if (boss.flinch > 0) return recoil;
  if (boss.mode === 'recovery') return boss.timer > .18 ? recover : idle;
  if (boss.walking) return walk[Math.floor(boss.walkDistance / WALK_FRAME_DISTANCE) % walk.length];
  return idle;
}
