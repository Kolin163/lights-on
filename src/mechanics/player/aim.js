import {clamp} from '../../engine/geometry.js';
import {mouseAimFrame} from './animation.js';

// Original keyboard limits for running and standing shots.
const RUN_LIMIT = Math.acos(.71);
const STANDING_LIMIT = Math.acos(.30);

export function mouseAim(player, target, moving) {
  const dx = target.x - player.x;
  const dy = target.y - player.y;
  const forward = dx * player.face;
  const behind = forward < 0;
  const guess = behind ? 0 : Math.atan2(dy + 59, forward);
  const pose = mouseAimFrame(player, guess);
  const limit = moving ? RUN_LIMIT : STANDING_LIMIT;
  const angle = behind ? 0 : clamp(Math.atan2(dy - pose.gripY, Math.max(0, forward - pose.gripX)), -limit, limit);
  const x = Math.cos(angle) * player.face;
  const y = Math.sin(angle);
  return {x, y, angle, pose};
}

export function aimMuzzle(direction) {
  const {pose, angle} = direction;
  return {
    x: pose.gripX + pose.length * Math.cos(angle),
    y: pose.gripY + pose.length * Math.sin(angle),
  };
}
