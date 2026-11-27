export function tile(ctx, art, left, right, y, height, width, travel, mirror = true) {
  const first = Math.floor((left + travel) / width);
  const last = Math.ceil((right + travel) / width);
  for (let i = first; i < last; i++) {
    const x = Math.floor(i * width - travel);
    if (mirror && Math.abs(i % 2) === 1) {
      ctx.save();
      ctx.translate(x + width, y);
      ctx.scale(-1, 1);
      ctx.drawImage(art, 0, 0, width + 1, height);
      ctx.restore();
    } else {
      ctx.drawImage(art, x, y, width + 1, height);
    }
  }
}

export function glow(ctx, x, y, radius, color, intensity = 1) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, '#0000');
  ctx.save();
  ctx.globalAlpha *= intensity;
  ctx.fillStyle = gradient;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  ctx.restore();
}

export function centered(ctx, art, x, y, width, height, face = 1) {
  if (face === 1) {
    ctx.drawImage(art, x - width / 2, y - height / 2, width, height);
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(-1, 1);
  ctx.drawImage(art, -width / 2, -height / 2, width, height);
  ctx.restore();
}

export function floorShadow(ctx, x, y, w, opacity = .28) {
  ctx.fillStyle = 'rgba(5,8,8,' + opacity + ')';
  ctx.beginPath();
  ctx.ellipse(x, y - 1, w, 7, 0, 0, Math.PI * 2);
  ctx.fill();
}
