import {clamp, WIDTH} from '../../engine/geometry.js';
import {spawnEnemy} from '../combat/enemies.js';
import {MAX_ARMOR} from '../player/health.js';
import {HERO_NAME} from '../../levels/catalog.js';

export function initialObjective(game) {
  if (game.layout.kind === 'ground' && game.layout.gate && game.flags.reserve) return 'Дойти до главного рубильника';
  return game.mission.objective;
}

function isPast(game, threshold) {
  if (game.layout.kind === 'vertical') return game.player.y <= threshold + .25;
  if (game.layout.kind === 'bike') return game.ride.distance >= threshold;
  return game.player.x >= threshold;
}

export function restoreObjectives(game) {
  game.objective = initialObjective(game);
  game.stops = new Set();
  if (game.checkpointIndex >= 0) {
    const threshold = game.layout.checkpoints[game.checkpointIndex].threshold;
    for (const [i, stop] of game.layout.stops.entries()) {
      const past = game.layout.kind === 'vertical' ? stop.at >= threshold : stop.at <= threshold;
      if (past) game.stops.add(i);
    }
  }
  game.interaction = null;
}

export function recordProgress(game) {
  for (const [i, stop] of game.layout.stops.entries()) {
    if (game.stops.has(i) || !isPast(game, stop.at)) continue;
    game.stops.add(i);
    if (stop.tip) game.notify(game.touch && stop.touch ? stop.touch : stop.tip);
    if (stop.text) game.say(stop.speaker, stop.text, 2.8);
  }

  for (let i = game.checkpointIndex + 1; i < game.layout.checkpoints.length; i++) {
    const point = game.layout.checkpoints[i];
    if (!isPast(game, point.threshold)) continue;
    if (game.layout.kind === 'vertical' && !game.player.grounded) continue;
    game.checkpointIndex = i;
    game.checkpointFlags = {reserve: game.flags.reserve, charge: game.player.charge};
    game.notify('Контрольная точка', 1.6);
    game.effects.ring(game.player.x, game.player.y - 25, '#c0dca0', 44);
    game.sound('checkpoint');
  }
}

export function collectPickup(game, item) {
  if (item.taken) return;
  const p = game.player;
  if (p.hp >= MAX_ARMOR) return;
  p.hp = Math.min(MAX_ARMOR, p.hp + 2);
  p.healFlash = .35;
  game.effects.ring(p.x, p.y - 40, '#9cf1b7', 45);
  item.taken = true;
  game.sound('repair');
}

function activatePoint(game, point) {
  game.sound('switch-relay', point.x, point.y - 29);
  if (point.id === 'office') {
    game.notify('Подстанция · удалённого доступа нет', 1.5);
    game.complete();
    return;
  }
  if (point.id === 'reserve') {
    game.flags.reserve = true;
    game.objective = 'Дойти до главного рубильника';
    game.camera.shake = 5;
    game.effects.ring(point.x, point.y - 44, '#e7c979', 85);
    game.say(HERO_NAME, 'Резерв есть. Теперь можно пройти к главному щиту.', 3);
    return;
  }
  if (point.id === 'main') {
    game.flags.wave = true;
    game.wave = {round: 0, queue: [], timer: 0};
    beginWave(game);
    game.say(HERO_NAME, 'Они услышали запуск. От главного щита ни шагу.', 3);
    return;
  }
  game.flags.override = true;
  game.boss.mode = 'stagger';
  game.boss.timer = 1.2;
  game.player.face = Math.sign(game.boss.x - game.player.x) || 1;
  game.objective = 'Добить демона-крановщика';
  game.effects.ring(point.x, point.y - 35, '#ffbd66', 76);
  game.say(HERO_NAME, 'Подвес зафиксирован. Теперь отвешу ему за окно.', 3, true);
}

export function pointAvailable(game, point) {
  if (point.id === 'reserve') return !game.flags.reserve;
  if (point.id === 'main') return game.flags.reserve && !game.flags.wave && !game.flags.power;
  if (point.id === 'override') return game.boss.phase >= 3 && !game.flags.override;
  return true;
}

function beginWave(game) {
  const wave = game.wave;
  const round = wave.round;
  wave.queue = [...game.layout.waves[round]];
  wave.timer = round ? .92 : .25;
  game.objective = 'Защитить щит · волна ' + (round + 1) + ' из ' + game.layout.waves.length;
  game.notify('Волна ' + (round + 1) + ' из ' + game.layout.waves.length, 1.6);
  const main = game.layout.points.find(point => point.id === 'main');
  if (round) {
    const side = round % 2 ? -1 : 1;
    game.pickups.push({type: 'repair', x: main.x + side * 127, y: main.y - 25, taken: false});
  }
}

function deployWaveEnemy(game, [type, preferred]) {
  const left = game.camera.x - 96;
  const right = game.camera.x + WIDTH + 96;
  const roomLeft = left >= 75;
  const roomRight = right <= game.layout.length - 75;
  let side = preferred;
  if (side < 0 && !roomLeft) side = 1;
  if (side > 0 && !roomRight) side = -1;
  const spread = game.wave.queue.length % 3 * 27;
  let x = side < 0 ? left - spread : right + spread;
  const ground = game.terrain.find(surface => surface.ground && x >= surface.x + 23 && x <= surface.x + surface.w - 23);
  if (!ground) {
    const fields = game.terrain.filter(surface => surface.ground &&
      (side < 0 ? surface.x + 45 < left : surface.x + surface.w - 45 > right));
    const edge = side < 0 ? fields.at(-1) : fields[0];
    if (edge) x = clamp(x, edge.x + 30, edge.x + edge.w - 30);
  }
  x = clamp(x, 26, game.layout.length - 26);
  const y = type === 'flyer' ? 296 : game.layout.start.y;
  game.enemies.push(spawnEnemy({type, x, y}, game.layout, true));
}

function updateWave(game, dt) {
  const wave = game.wave;
  if (wave.queue.length) {
    wave.timer -= dt;
    if (wave.timer <= 0) {
      deployWaveEnemy(game, wave.queue.shift());
      wave.timer = .64;
    }
    return;
  }
  if (game.enemies.some(enemy => enemy.wave && enemy.hp > 0)) return;
  wave.round++;
  if (wave.round < game.layout.waves.length) {
    beginWave(game);
    return;
  }
  game.flags.power = true;
  game.flags.powerAge = 0;
  game.objective = 'Свет в Бузулуке восстановлен';
  game.interaction = null;
  game.notify('Бузулук снова со светом', 3);
  game.say(HERO_NAME, 'Вот и всё. Домой.', 3, true);
  game.sound('power-restore');
  game.complete(1.8);
}

export function updateObjectives(game, input, dt) {
  recordProgress(game);
  const p = game.player;
  if (game.layout.kind !== 'bike') {
    for (const item of game.pickups) {
      if (!item.taken && Math.abs(item.x - p.x) < 34 && Math.abs(item.y - p.y + 31) < 47) collectPickup(game, item);
    }
  }

  const point = game.layout.points?.find(item => pointAvailable(game, item)
    && Math.abs(item.x - p.x) < 92 && Math.abs(item.y - p.y) < 76);
  game.interaction = point?.label ?? null;
  if (point && input.tap('use')) activatePoint(game, point);

  if (game.flags.wave && !game.flags.power) updateWave(game, dt);
  if (game.finishDelay !== null) return;

  if (game.layout.kind === 'vertical' && p.grounded && p.surface?.art === 'gpu' && p.y <= game.layout.exitY + 5) {
    game.objective = 'Видеокарта настигнута';
    game.complete();
    return;
  }

  if (game.layout.kind === 'bike') game.route = clamp(game.ride.distance / game.layout.length, 0, 1);
  else if (game.layout.kind === 'vertical') game.route = clamp(1 - (p.y - game.layout.exitY) / (game.layout.start.y - game.layout.exitY), 0, 1);
  else if (game.layout.kind === 'arena') game.route = 1 - game.boss.hp / game.boss.maxHp;
  else game.route = clamp(p.x / game.layout.length, 0, 1);
}
