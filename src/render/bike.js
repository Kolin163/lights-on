const SCALE = .292;
const UPPER_BODY_CUT = 195;
const WHEEL_INSET = 76;
const TURN = Math.PI * 2;

// Sprite coordinates. The stationary masks cover the fork, racks and drivetrain.
const rear = {
  x: 82, y: 370, radius: 83,
  frame: [
    [[10, 307], [66, 277], [123, 279], [149, 308], [142, 318], [103, 298], [60, 295], [20, 322]],
    [[64, 282], [81, 282], [87, 360], [76, 366], [66, 357]],
    [[66, 361], [154, 287], [171, 301], [86, 376], [73, 382], [63, 375]],
    [[68, 360], [177, 359], [177, 387], [77, 389], [66, 378]],
    [[67, 375], [88, 377], [96, 400], [87, 416], [64, 414], [59, 396]],
    [[74, 396], [169, 387], [176, 399], [75, 409]],
  ],
};
const front = {
  x: 348, y: 368, radius: 86,
  frame: [
    [[299, 280], [381, 272], [393, 291], [355, 297], [316, 308], [299, 304]],
    [[291, 278], [312, 272], [353, 350], [360, 367], [354, 378], [344, 382], [333, 375], [319, 340]],
  ],
};
const wheels = [rear, front];
const prepared = new WeakMap();

function layer(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

function wheelLayer(image) {
  const r = WHEEL_INSET;
  const ctx = layer(2 * r, 2 * r);
  ctx.beginPath();
  ctx.arc(r, r, r, 0, TURN);
  ctx.clip();
  // The lower-right quarter of the front wheel is clear of the chassis.
  for (const flipX of [-1, 1]) for (const flipY of [-1, 1]) {
    ctx.save();
    ctx.translate(r, r);
    ctx.scale(flipX, flipY);
    ctx.drawImage(image, front.x, front.y, r, r, 0, 0, r, r);
    ctx.restore();
  }
  return ctx.canvas;
}

function chassisLayer(image) {
  const ctx = layer(image.naturalWidth, image.naturalHeight);
  ctx.drawImage(image, 0, 0);
  for (const {x, y, frame} of wheels) {
    const r = WHEEL_INSET;
    // Keep the original tyre outline and blend the rotating texture into its edge.
    const erase = ctx.createRadialGradient(x, y, r - 4, x, y, r);
    erase.addColorStop(0, '#000');
    erase.addColorStop(1, '#0000');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = erase;
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    ctx.globalCompositeOperation = 'source-over';
    for (const [[startX, startY], ...points] of frame) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      for (const [px, py] of points) ctx.lineTo(px, py);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(image, 0, 0);
      ctx.restore();
    }
  }
  return ctx.canvas;
}

export function drawBike(ctx, game, art, reduceMotion) {
  const {player, ride} = game;
  const base = art['bike-ride'];
  let parts = prepared.get(base);
  if (!parts) {
    parts = {wheel: wheelLayer(base), chassis: chassisLayer(base)};
    prepared.set(base, parts);
  }
  const width = base.naturalWidth;
  const height = base.naturalHeight;
  const cut = UPPER_BODY_CUT;
  const lean = ride.lift > 2 ? Math.max(-.105, Math.min(.09, -ride.liftVelocity * .00038)) : 0;
  const suspension = reduceMotion || ride.lift > 1 ? 0 : Math.sin(game.time * 22) * .60;
  ctx.save();
  ctx.translate(player.x, player.y + suspension);
  ctx.rotate(lean);
  ctx.scale(SCALE, SCALE);
  ctx.translate(-width / 2, -height);
  for (const {x, y, radius} of wheels) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((player.x / (radius * SCALE)) % TURN);
    ctx.drawImage(parts.wheel, -WHEEL_INSET, -WHEEL_INSET);
    ctx.restore();
  }
  ctx.drawImage(parts.chassis, 0, cut, width, height - cut, 0, cut, width, height - cut);
  if (ride.aimHold > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(-15, -15, width + 112, cut + 16);
    ctx.clip();
    ctx.drawImage(art['bike-fire'], 25 - player.recoil * 12, 6);
    ctx.restore();
  } else {
    ctx.drawImage(base, 0, 0, width, cut, 0, 0, width, cut);
  }
  ctx.restore();
}
