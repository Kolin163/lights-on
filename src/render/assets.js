const backgrounds = ['city-far', 'city-mid', 'asphalt', 'road-surface', 'steppe-far', 'steppe-mid', 'soil'];
const props = ['apartment', 'crane', 'plant', 'scaffold', 'station', 'car', 'barrier', 'office', 'lamp', 'pickup', 'gpu'];
const effects = ['bolt', 'orb', 'impact', 'charge-ring', 'arc'];

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
for (const type of ['imp', 'flyer', 'brute']) {
  for (let i = 0; i < 7; i++) paths[type + '-' + i] = 'sprites/enemies/' + type + '-' + i + '.webp';
}
for (let i = 0; i < 4; i++) {
  paths['crane-demon-' + i] = 'sprites/enemies/crane-demon-v4-' + i + '.webp';
  paths['portal-' + i] = 'effects/portal-' + i + '.webp';
}
for (const aim of ['up-0', 'up-1', 'down-0', 'down-1']) paths['aim-' + aim] = 'sprites/player/aim-' + aim + '.webp';

export function assetUrl(name) {
  return new URL('../../assets/' + paths[name], import.meta.url).href;
}

function load(name) {
  const image = new Image();
  image.src = assetUrl(name);
  return image.decode().then(() => [name, image]).catch(() => {
    throw new Error(paths[name]);
  });
}

export async function loadArt() {
  return Object.fromEntries(await Promise.all(Object.keys(paths).map(load)));
}

export function storyUrl(name) {
  return assetUrl(name === 'field' ? 'sky' : 'story-' + name);
}
