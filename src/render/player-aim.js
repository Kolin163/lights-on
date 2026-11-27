function drawSection(ctx, image, frame, box, top, bottom) {
  const height = bottom - top;
  ctx.drawImage(image, frame.left, frame.top + (top - box.top) / box.scaleY,
    frame.right - frame.left, height / box.scaleY, box.left, top, box.width, height);
}

function drawWaistTriangle(ctx, image, frame, box, top, bottom, origin, across, vertical, reverse = false) {
  const width = box.width;
  const height = bottom - top;
  const sign = reverse ? -1 : 1;
  // Map one half of the waist strip between the rotated torso and the planted legs.
  ctx.save();
  ctx.transform((across.x - origin.x) / (sign * width), (across.y - origin.y) / (sign * width),
    (vertical.x - origin.x) / (sign * height), (vertical.y - origin.y) / (sign * height), origin.x, origin.y);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(sign * (width + .65), 0);
  ctx.lineTo(0, sign * (height + .65));
  ctx.closePath();
  ctx.clip();
  ctx.translate(reverse ? -box.right : -box.left, reverse ? -bottom : -top);
  drawSection(ctx, image, frame, box, top, bottom);
  ctx.restore();
}

export function drawAimedHero(ctx, art, {pose, angle}) {
  const {frame, gripX, gripY, muzzleY, restAngle} = pose;
  const image = art[frame.sheet];
  const scaleY = frame.scaleY ?? frame.scale;
  const box = {
    left: (frame.left - frame.anchorX) * frame.scale,
    right: (frame.right - frame.anchorX) * frame.scale,
    top: (frame.top - frame.anchorY) * scaleY,
    bottom: (frame.bottom - frame.anchorY) * scaleY,
    width: (frame.right - frame.left) * frame.scale,
    scaleY,
  };
  const turn = angle - restAngle;
  if (Math.abs(turn) < .008) {
    drawSection(ctx, image, frame, box, box.top, box.bottom);
    return;
  }

  const top = Math.max(-48, muzzleY + 10);
  const bottom = -6;
  const sine = Math.sin(turn), cosine = Math.cos(turn);
  const rotate = (x, y) => ({
    x: gripX + (x - gripX) * cosine - (y - gripY) * sine,
    y: gripY + (x - gripX) * sine + (y - gripY) * cosine,
  });
  const tl = rotate(box.left, top);
  const tr = rotate(box.right, top);
  const bl = {x: box.left, y: bottom};
  const br = {x: box.right, y: bottom};
  drawSection(ctx, image, frame, box, bottom, box.bottom);
  drawWaistTriangle(ctx, image, frame, box, top, bottom, tl, tr, bl);
  drawWaistTriangle(ctx, image, frame, box, top, bottom, br, bl, tr, true);
  ctx.save();
  ctx.translate(gripX, gripY);
  ctx.rotate(turn);
  ctx.translate(-gripX, -gripY);
  drawSection(ctx, image, frame, box, box.top, top);
  ctx.restore();
}
