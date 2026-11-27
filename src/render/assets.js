const backgrounds = ['city-far', 'city-mid', 'asphalt', 'road-surface', 'steppe-far', 'steppe-mid', 'soil'];
const props = ['apartment', 'crane', 'plant', 'scaffold', 'station', 'car', 'barrier', 'office', 'lamp', 'pickup', 'gpu'];
const effects = ['bolt', 'orb', 'impact', 'charge-ring', 'arc'];
const enemyFrames = ['imp', 'flyer', 'brute'].flatMap(type => Array.from({length: 7}, (_, i) => type + '-' + i));
const bossFrames = Array.from({length: 4}, (_, i) => 'crane-demon-' + i);
const portalFrames = Array.from({length: 4}, (_, i) => 'portal-' + i);
const aimFrames = ['aim-up-0', 'aim-up-1', 'aim-down-0', 'aim-down-1'];
const onFoot = ['hero-core', 'hero-extra', 'hero-run-up', ...aimFrames];
const cityLayers = ['city-far', 'city-mid'];
const fieldLayers = ['steppe-far', 'steppe-mid'];
const missionArt = {
  city: [...onFoot, ...cityLayers, 'asphalt', 'car', 'barrier', 'scaffold', 'office', 'lamp', 'station', ...enemyFrames, ...portalFrames],
  road: ['bike-ride', 'bike-fire', ...fieldLayers, 'road-surface', 'car', 'barrier', ...enemyFrames],
  steppe: [...onFoot, ...fieldLayers, 'city-far', 'soil', 'barrier', 'scaffold', 'plant', 'lamp', 'station', ...enemyFrames, ...portalFrames],
  construction: [...onFoot, ...cityLayers, 'apartment', 'crane', 'asphalt', 'scaffold', 'gpu', ...enemyFrames],
  rooftop: [...onFoot, ...cityLayers, 'gpu', 'station', 'crane-walk', 'crane-actions', ...bossFrames],
};

const paths = {
  sky: 'backgrounds/sky.jpg',
  'hero-core': 'sprites/player/marine-right-core-matched.webp',
  'hero-extra': 'sprites/player/marine-right-extra-matched.webp',
  'hero-run-up': 'sprites/player/marine-run-up.webp',
  'menu-logo': 'story/title-logo.webp',
  'menu-hero': 'story/menu-hero.webp',
  'menu-back': 'story/menu-back.jpg',
  'bike-ride': 'sprites/vehicles/e-bike-0.webp',
  'bike-fire': 'sprites/vehicles/e-bike-3.webp',
  'crane-walk': 'sprites/enemies/crane-walk.webp',
  'crane-actions': 'sprites/enemies/crane-actions.webp',
  'story-arena': 'story/arena-v1.jpg',
  'story-home': 'story/home-v5.jpg',
  ...Object.fromEntries(backgrounds.map(name => [name, 'backgrounds/' + name + '.webp'])),
  ...Object.fromEntries(props.map(name => [name, 'props/' + name + '.webp'])),
  ...Object.fromEntries(effects.map(name => [name, 'effects/' + name + '.webp'])),
  ...Object.fromEntries(['blackout', 'office', 'theft'].map(name => [
    'story-' + name, 'story/' + name + '-v4.jpg',
  ])),
};
for (const name of enemyFrames) paths[name] = 'sprites/enemies/' + name + '.webp';
for (const name of bossFrames) paths[name] = 'sprites/enemies/' + name.replace('crane-demon-', 'crane-demon-v4-') + '.webp';
for (const name of portalFrames) paths[name] = 'effects/' + name + '.webp';
for (const name of aimFrames) paths[name] = 'sprites/player/' + name + '.webp';

const images = new Map();

export function assetUrl(name) {
  return new URL('../../assets/' + paths[name], import.meta.url).href;
}

async function decodeImage(name) {
  const image = new Image();
  let timer;
  try {
    image.src = assetUrl(name);
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Image request timed out')), 30000);
    });
    await Promise.race([image.decode(), timeout]);
    return image;
  } catch {
    image.removeAttribute('src');
    throw new Error(paths[name]);
  } finally {
    clearTimeout(timer);
  }
}

function load(name) {
  if (!images.has(name)) {
    images.set(name, decodeImage(name).catch(error => {
      images.delete(name);
      throw error;
    }));
  }
  return images.get(name);
}

export async function loadArt(names = Object.keys(paths), report) {
  let ready = 0;
  const entries = await Promise.all(names.map(async name => {
    const image = await load(name);
    report?.(++ready / names.length);
    return [name, image];
  }));
  return Object.fromEntries(entries);
}

export function loadMissionArt(setting, report) {
  return loadArt(['sky', 'pickup', ...effects, ...missionArt[setting]], report);
}

export function storyUrl(name) {
  return assetUrl(name === 'field' ? 'sky' : 'story-' + name);
}
