import {MISSIONS, ENDING} from '../levels/catalog.js';
import {LAYOUTS} from '../levels/layouts.js';
import {createPlayer, updatePlayer} from '../mechanics/player/controller.js';
import {spawnEnemy, updateEnemies} from '../mechanics/combat/enemies.js';
import {updateProjectiles} from '../mechanics/combat/combat.js';
import {Effects} from '../mechanics/combat/effects.js';
import {createRide, updateRide} from '../mechanics/bike/ride.js';
import {createBoss, updateBoss} from '../mechanics/boss/encounter.js';
import {createTerrain, findSurface, movePlatforms} from '../mechanics/world/platforms.js';
import {updateCamera} from '../mechanics/world/camera.js';
import {restoreObjectives, updateObjectives} from '../mechanics/world/objectives.js';

export const STEP = 1 / 120;

export class GameSession {
  constructor({onComplete, onFail, onSound = () => {}, touch = false, reduceMotion = false}) {
    this.status = 'menu';
    this.index = 0;
    this.tauntHistory = [];
    this.touch = touch;
    this.reduceMotion = reduceMotion;
    this.onComplete = onComplete;
    this.onFail = onFail;
    this.sound = onSound;
  }

  start(index, retry = false, carriedCharge = 0) {
    this.index = index;
    this.mission = MISSIONS[index];
    this.layout = LAYOUTS[index];
    if (!retry) {
      this.checkpointIndex = -1;
      this.checkpointFlags = null;
      this.missionCharge = carriedCharge;
    }
    const point = this.layout.checkpoints[this.checkpointIndex];
    const spawn = point ?? this.layout.start;
    const isBike = this.layout.kind === 'bike';
    this.flags = {reserve: Boolean(this.checkpointFlags?.reserve), power: false, powerAge: 0, wave: false, override: false};
    this.player = createPlayer(spawn, this.checkpointFlags?.charge ?? this.missionCharge);
    this.terrain = createTerrain(this.layout);
    const remaining = (source) => {
      if (!point) return true;
      if (this.layout.kind === 'vertical') return (source.y ?? 0) < point.y - 32;
      return source.x > point.x - 23;
    };
    this.enemies = (this.layout.enemies ?? []).filter(remaining).map(source => spawnEnemy(source, this.layout));
    this.pickups = (this.layout.pickups ?? []).filter(remaining).map(source => ({...source, taken: false}));
    this.projectiles = [];
    this.wave = null;
    this.pursuitStarted = Boolean(point);
    this.ride = isBike ? createRide(this.layout, point?.x ?? 0) : null;
    this.boss = this.layout.kind === 'arena' ? createBoss() : null;
    if (isBike) {
      this.player.x = this.ride.distance + this.ride.offset;
      this.player.y = this.ride.laneY;
    } else {
      this.player.surface = findSurface(this.player, this.terrain, this.player.y);
      this.player.grounded = Boolean(this.player.surface);
    }
    this.effects = new Effects();
    this.camera = {x: 0, y: 0, shake: 0};
    this.time = 0;
    this.finishDelay = null;
    this.finishDuration = 0;
    this.message = null;
    this.dialogue = null;
    this.route = 0;
    this.status = 'playing';
    restoreObjectives(this);
    updateCamera(this, 0, true);
    this.notify(this.mission.location, 2.3);
  }

  say(speaker, text, duration = 2.7, priority = false) {
    if (this.dialogue?.priority && !priority) return;
    this.dialogue = {speaker, text, remaining: duration, priority};
  }

  notify(text, duration = 2.65) {
    this.message = {text, remaining: duration};
  }

  get finishProgress() {
    return this.finishDelay === null ? 0 : 1 - this.finishDelay / this.finishDuration;
  }

  complete(duration = .95) {
    if (this.finishDelay !== null || this.status !== 'playing') return;
    this.finishDuration = duration;
    this.finishDelay = duration;
    this.interaction = null;
    this.route = 1;
  }

  fail() {
    if (this.status !== 'playing' || this.finishDelay !== null) return;
    this.status = 'dead';
    this.sound('game-over');
    this.onFail(this.index);
  }

  step(input, dt) {
    if (this.status !== 'playing') return;
    const finishing = this.finishDelay !== null;
    this.time += dt;
    if (this.message && (this.message.remaining -= dt) <= 0) this.message = null;
    if (this.dialogue && (this.dialogue.remaining -= dt) <= 0) this.dialogue = null;

    movePlatforms(this);
    if (this.ride) updateRide(this, input, dt);
    else updatePlayer(this, input, dt);
    if (this.status !== 'playing') return;
    updateCamera(this, dt);
    if (!this.ride) updateEnemies(this, dt);
    if (this.boss) updateBoss(this, dt);
    if (this.status !== 'playing') return;
    updateProjectiles(this, dt);
    if (this.status !== 'playing') return;
    if (this.finishDelay === null) updateObjectives(this, input, dt);
    if (this.flags.power) this.flags.powerAge = Math.min(1, this.flags.powerAge + dt * .65);
    this.effects.update(dt);
    input.finishStep();

    if (!finishing) return;
    this.finishDelay = Math.max(0, this.finishDelay - dt);
    if (this.finishDelay === 0) {
      this.status = 'complete';
      this.sound('level-complete');
      this.onComplete(this.index, this.index === MISSIONS.length - 1 ? ENDING : null);
    }
  }
}
