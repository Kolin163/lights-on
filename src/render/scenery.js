import {WIDTH, HEIGHT} from '../engine/geometry.js';
import {SHOT_REACH, SHOT_Y} from '../mechanics/boss/encounter.js';
import {pointAvailable} from '../mechanics/world/objectives.js';
import {LANES} from '../mechanics/bike/ride.js';
import {tile, glow, centered, floorShadow} from './drawing.js';

function visible(game, x, y, w, h) {
  const camera = game.camera;
  return x + w >= camera.x - 55 && x <= camera.x + WIDTH + 55
    && y + h >= camera.y - 72 && y <= camera.y + HEIGHT + 72;
}

function propGlow(ctx, game, object) {
  if (object.style === 'terminal') {
    glow(ctx, object.x + object.w * .5, object.y - object.h * .74, 71, '#ffbc6873');
  }
  if (object.style === 'reserve' || object.style === 'main' || object.style === 'override') {
    const on = game.flags[object.style] || (object.style === 'main' && game.flags.power);
    const color = on ? '#a4e795a3' : '#feb665a3';
    glow(ctx, object.x + object.w * .53, object.y - object.h * .81, 60, color, .74 + Math.sin(game.time * 4.2) * .24);
    if (on) {
      ctx.fillStyle = '#b8e7a3';
      ctx.fillRect(object.x + object.w * .53 - 4, object.y - object.h * .79, 8, 5);
    }
  }
  if (object.style === 'yard-lamp' && (game.flags.power || game.flags.reserve)) {
    glow(ctx, object.x + object.w * .81, object.y - object.h * .84, 106, '#ffb75986', game.flags.power ? .95 : .56);
  }
  if (object.style === 'street-lamp' && [875, 2754, 4192].includes(object.x)) {
    const flicker = Math.sin(game.time * 7.3 + object.x) * .22 + .63;
    glow(ctx, object.x + object.w * .81, object.y - object.h * .84, 67, '#ebb46c48', flicker);
  }
}

function buildings(ctx, game, art) {
  for (const object of game.layout.props ?? []) {
    if (!visible(game, object.x, object.y - object.h, object.w, object.h)) continue;
    ctx.save();
    if (object.style === 'street-lamp' && ![875, 2754, 4192].includes(object.x)) ctx.filter = 'brightness(.44)';
    if (object.style === 'yard-lamp' && !game.flags.reserve && !game.flags.power) ctx.filter = 'brightness(.48)';
    ctx.drawImage(art[object.art], object.x, object.y - object.h, object.w, object.h);
    ctx.restore();
    propGlow(ctx, game, object);
  }
}

function beam(ctx, art, surface) {
  const {x, y, w} = surface;
  const image = art.scaffold;
  // Use the illustrated platform deck as a strip for smaller ledges.
  ctx.drawImage(image, 0, image.naturalHeight * .44, image.naturalWidth, image.naturalHeight * .16, x, y - 2, w, 23);
  const lip = ctx.createLinearGradient(x, y, x + w, y);
  lip.addColorStop(0, '#c2a7749c');
  lip.addColorStop(.5, '#ffd69a');
  lip.addColorStop(1, '#c2a7749c');
  ctx.fillStyle = lip;
  ctx.fillRect(x + 4, y, w - 8, 2);
}

function drawCard(ctx, game, art, segment) {
  const deckOffset = 99 / 528;
  const top = segment.y - segment.h * deckOffset;
  const left = segment.x;
  const width = segment.w;
  if (game.layout.kind === 'arena' || game.layout.kind === 'vertical') {
    ctx.strokeStyle = '#252527';
    ctx.lineWidth = game.boss ? 5 : 2;
    ctx.beginPath();
    ctx.moveTo(left + .073 * width, top + 2);
    ctx.lineTo(left + .18 * width, game.boss ? -120 : -48);
    ctx.moveTo(left + .942 * width, top + 2);
    ctx.lineTo(left + .82 * width, game.boss ? -120 : -48);
    ctx.stroke();
    ctx.strokeStyle = '#9c825a8a';
    ctx.lineWidth *= .36;
    ctx.stroke();
  }
  ctx.drawImage(art.gpu, left, top, width, segment.h);
  if (!game.boss || game.boss.phase === 1 || game.flags.override || !game.boss.hp) return;
  for (const center of [.25, .50, .75]) {
    const x = left + width * center;
    const y = top + segment.h * .59;
    const velocity = Math.max(.30, Math.abs(game.boss.wind));
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(game.time * (7 + velocity * 6));
    ctx.globalAlpha = velocity * .32;
    centered(ctx, art['charge-ring'], 0, 0, 94, 94);
    ctx.restore();
  }
}

function platforms(ctx, game, art) {
  for (const segment of game.terrain) {
    if (!visible(game, segment.x, segment.y - 31, segment.w, segment.h + 35)) continue;
    const {x, y, w, h} = segment;
    if (segment.ground) {
      const road = segment.art === 'asphalt';
      const artTop = y - (road ? 1 : 30);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, artTop, w, y + h - artTop);
      ctx.clip();
      ctx.fillStyle = road ? '#161c20' : '#242220';
      ctx.fillRect(x, y, w, h);
      tile(ctx, art[segment.art], Math.max(game.camera.x - 140, x), Math.min(game.camera.x + WIDTH + 140, x + w), artTop, road ? 108 : 127, 1110, 0);
      ctx.restore();
    } else if (segment.art === 'beam') {
      beam(ctx, art, segment);
    } else if (segment.art === 'gpu') {
      if (game.layout.kind !== 'vertical' || game.player.y < 455) drawCard(ctx, game, art, segment);
    } else if (segment.art === 'scaffold') {
      ctx.drawImage(art.scaffold, x, y - 47, w, 91);
      ctx.fillStyle = '#b18c58';
      ctx.fillRect(x + 6, y, w - 12, 2);
    } else {
      ctx.drawImage(art[segment.art], x, y, w, h);
    }
  }
}

function portals(ctx, game, art, reduceMotion) {
  for (const x of game.layout.rifts ?? []) {
    if (!visible(game, x - 80, 260, 160, 177)) continue;
    const time = reduceMotion ? 0 : game.time;
    const cycle = time * 6 + (x % 13) * .081;
    const elapsed = cycle - Math.floor(cycle);
    const index = Math.floor(cycle) % 4;
    const alpha = (game.flags.power ? .25 : .88) * (.83 + .17 * Math.sin(time * 2.2 + x));
    const w = 133 + Math.sin(time * 3.7 + x) * 6;
    const h = 185 - Math.cos(time * 2.6 + x) * 9;
    glow(ctx, x, 354, 119, '#bb343a77', alpha);
    ctx.save();
    ctx.translate(x, 353);
    ctx.rotate(Math.sin(time * 1.7 + x) * .056);
    ctx.globalAlpha = alpha * (1 - elapsed * .77);
    centered(ctx, art['portal-' + index], 0, 0, w, h);
    ctx.globalAlpha = alpha * elapsed * .82;
    centered(ctx, art['portal-' + ((index + 1) % 4)], 0, 0, w, h);
    ctx.globalAlpha = alpha;
    const count = reduceMotion ? 0 : 13;
    for (let i = 0; i < count; i++) {
      const angle = time * (1.8 + i % 3 * .37) + i * 2.398;
      const r = .89 + .2 * Math.sin(i * 6.8 + time * 1.5);
      const xx = Math.cos(angle) * w * .50 * r;
      const yy = Math.sin(angle) * h * .48 * r;
      ctx.fillStyle = i % 3 ? '#f36a3c' : '#ffd48d';
      ctx.fillRect(xx, yy, i % 3 ? 1.5 : 2.5, i % 3 ? 1.5 : 2.5);
    }
    ctx.restore();
  }
}

function switchMarkers(ctx, game, reduceMotion) {
  for (const point of game.layout.points ?? []) {
    if ((point.id !== 'main' && point.id !== 'reserve') || !pointAvailable(game, point)) continue;
    const prop = game.layout.props.find(item => item.style === point.id);
    const bob = reduceMotion ? 0 : Math.sin(game.time * 4.1) * 4;
    const y = prop.y - prop.h - 27 + bob;
    if (!visible(game, point.x - 20, y - 20, 40, 40)) continue;
    glow(ctx, point.x, y, 41, '#ffad4d90', .8);
    ctx.save();
    ctx.translate(point.x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#1a2222';
    ctx.strokeStyle = '#ffc77e';
    ctx.lineWidth = 2;
    ctx.fillRect(-10, -10, 20, 20);
    ctx.strokeRect(-10, -10, 20, 20);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = '#ffe2a8';
    ctx.font = '900 21px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', 0, -.8);
    ctx.restore();
  }
}

function gate(ctx, game) {
  if (!game.layout.gate || game.flags.reserve) return;
  const x = game.layout.gate;
  ctx.fillStyle = '#394b4a';
  ctx.fillRect(x - 6, 289, 15, 157);
  ctx.fillStyle = '#a39259';
  ctx.fillRect(x - 6, 289, 16, 4);
  const pulse = .55 + Math.sin(game.time * 8) * .17;
  glow(ctx, x + 3, 321, 52, '#ff594464', pulse);
  ctx.fillStyle = '#ff8158';
  ctx.fillRect(x - 2, 316, 9, 6);
}

export function drawScenery(ctx, game, art, reduceMotion) {
  portals(ctx, game, art, reduceMotion);
  buildings(ctx, game, art);
  platforms(ctx, game, art);
  if (game.ride) drawRoad(ctx, game, art);
  gate(ctx, game);
  switchMarkers(ctx, game, reduceMotion);
}

function drawRoad(ctx, game, art) {
  const ride = game.ride;
  const left = ride.distance - 40;
  ctx.fillStyle = '#192529';
  ctx.fillRect(left, 269, WIDTH + 90, 271);
  tile(ctx, art['road-surface'], left, left + WIDTH + 90, 270, 251, 1130, 0);
  const lines = [272, ...LANES.slice(0, -1).map((lane, i) => (lane + LANES[i + 1]) / 2), 516];
  for (const i of LANES.keys()) {
    ctx.fillStyle = i === ride.lane ? '#69d9bd2e' : i % 2 ? '#080f1c28' : '#080f1c14';
    ctx.fillRect(left, lines[i], WIDTH + 90, lines[i + 1] - lines[i]);
  }
  for (const [i, y] of lines.entries()) {
    const shoulder = i === 0 || i === lines.length - 1;
    const activeEdge = i === ride.lane || i === ride.lane + 1;
    ctx.fillStyle = activeEdge ? '#a4efdcba' : '#e8dfc295';
    if (shoulder) {
      ctx.fillRect(left, y, WIDTH + 90, 3);
    } else {
      ctx.fillStyle = activeEdge ? '#b0f4e047' : '#f1e1be38';
      ctx.fillRect(left, y, WIDTH + 90, 1);
      ctx.fillStyle = activeEdge ? '#a4efdcde' : '#eee6d2a6';
      for (let x = Math.floor(left / 101) * 101; x < left + WIDTH + 90; x += 101) {
        ctx.fillRect(x, y, 51, 2);
      }
    }
  }

  const strip = ctx.createLinearGradient(0, 518, 0, 540);
  strip.addColorStop(0, '#1e252bd4');
  strip.addColorStop(1, '#0a1113');
  ctx.fillStyle = strip;
  ctx.fillRect(left, 519, WIDTH + 90, 23);
  for (const obstacle of ride.obstacles) {
    const x = obstacle.x;
    if (x < left - 160 || x > left + WIDTH + 156) continue;
    const y = LANES[obstacle.lane];
    if (obstacle.art === 'crack') {
      ctx.fillStyle = '#080d10';
      ctx.beginPath();
      ctx.moveTo(x - 22, y - 29);
      ctx.lineTo(x + 58, y - 31);
      ctx.lineTo(x + 44, y - 21);
      ctx.lineTo(x + 61, y - 10);
      ctx.lineTo(x + 17, y - 6);
      ctx.lineTo(x + 38, y + 12);
      ctx.lineTo(x - 26, y + 13);
      ctx.lineTo(x - 15, y - 7);
      ctx.lineTo(x - 34, y - 16);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#cb7659';
      ctx.lineWidth = 1.1;
      ctx.stroke();
    } else {
      const car = obstacle.art === 'car';
      floorShadow(ctx, x, y, car ? 64 : 37);
      ctx.drawImage(art[obstacle.art], x - (car ? 61 : 37), y - (car ? 55 : 35), car ? 122 : 74, car ? 56 : 35);
    }
  }
}

function laneBadge(ctx, x, y, value, color, active = false, size = 18) {
  const half = size / 2;
  ctx.fillStyle = active ? '#153e36' : '#121d21ed';
  ctx.fillRect(x - half, y - half, size, size);
  ctx.strokeStyle = color;
  ctx.lineWidth = active ? 2 : 1;
  ctx.strokeRect(x - half, y - half, size, size);
  ctx.fillStyle = color;
  ctx.font = '900 ' + (size - 6) + 'px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(value), x, y + .4);
}

function actorLaneMarker(ctx, actor, laneY, lane, rider = false) {
  const x = actor.x;
  const y = laneY + 8;
  const radius = rider ? 55 : 26;
  const color = rider ? '#bcf9e9' : '#ffab8a';
  if (laneY - actor.y > 15) {
    ctx.strokeStyle = rider ? '#a9efe8a8' : '#ff9d7ab5';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(x, actor.y + 5);
    ctx.lineTo(x, y - 4);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.beginPath();
  ctx.moveTo(x - radius, y - 4);
  ctx.lineTo(x - radius + 5, y);
  ctx.lineTo(x + radius - 5, y);
  ctx.lineTo(x + radius, y - 4);
  ctx.strokeStyle = '#0b1417';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  laneBadge(ctx, x, y + 1, lane + 1, color, rider, 16);
}

export function drawRideMarkers(ctx, game) {
  const {player, ride, camera} = game;
  ctx.save();
  for (const [index, y] of LANES.entries()) {
    const active = index === ride.lane;
    laneBadge(ctx, camera.x + 24, y, index + 1, active ? '#baf6e8' : '#d9ded5', active, 25);
  }
  for (const enemy of game.enemies) {
    if (!enemy.hp || !visible(game, enemy.x - 25, enemy.laneY - 5, 50, 17)) continue;
    actorLaneMarker(ctx, enemy, enemy.laneY, enemy.lane);
  }
  actorLaneMarker(ctx, player, ride.laneY, ride.lane, true);
  ctx.restore();
}

export function drawPickups(ctx, game, art) {
  const t = game.time;
  for (const item of game.pickups) {
    const bike = game.layout.kind === 'bike';
    const y = bike ? LANES[item.lane] - 23 : item.y;
    if (item.taken || !visible(game, item.x - 24, y - 18, 44, 39)) continue;
    const floating = y + Math.sin(t * 5 + item.x * .07) * 4;
    glow(ctx, item.x, floating, 30, '#79eeb0ad', .8);
    centered(ctx, art.pickup, item.x, floating, 39, 23);
  }
}

export function drawWarning(ctx, game) {
  const b = game.boss;
  if (!b || !b.hp) return;
  if (b.mode === 'windup') {
    const shot = b.attack === 'shot';
    const intensity = .4 + (1 - b.timer / (shot ? .96 : .71)) * .6;
    ctx.save();
    ctx.globalAlpha = intensity;
    if (shot) {
      const muzzle = b.x + b.attackDirection * SHOT_REACH;
      const edge = b.attackDirection > 0 ? 912 : 49;
      glow(ctx, muzzle, SHOT_Y, 40 + intensity * 13, '#ff65387a');
      ctx.strokeStyle = '#ffbc79';
      ctx.lineWidth = 1.7;
      ctx.setLineDash([12, 9]);
      ctx.beginPath();
      ctx.moveTo(muzzle, SHOT_Y);
      ctx.lineTo(edge, SHOT_Y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(muzzle, SHOT_Y, 11 + intensity * 5, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      glow(ctx, b.attackX, 380, 89, '#ee5c475a');
      ctx.fillStyle = '#fd996c';
      ctx.fillRect(b.attackX - 65, 384, 130, 3);
      ctx.fillStyle = '#ffd2a4';
      ctx.beginPath();
      ctx.moveTo(b.attackX - 10, 371);
      ctx.lineTo(b.attackX + 10, 371);
      ctx.lineTo(b.attackX, 382);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  if (Math.abs(b.wind) < .15) return;
  ctx.strokeStyle = 'rgba(186,221,207,' + Math.abs(b.wind) * .23 + ')';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i < 20; i++) {
    const x = 67 + ((i * 69 + game.time * 320 * b.wind) % 820 + 820) % 820;
    const y = 352 - (i % 7) * 30 + Math.cos(game.time * 2.9 + i) * 11;
    ctx.moveTo(x, y);
    ctx.lineTo(x + 25 + (i % 3) * 16, y - 5);
  }
  ctx.stroke();
}
