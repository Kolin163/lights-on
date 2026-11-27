import {MAX_ARMOR} from '../mechanics/player/health.js';
import {LANES} from '../mechanics/bike/ride.js';
import {MISSIONS} from '../levels/catalog.js';
import {assetUrl, storyUrl} from '../render/assets.js';

const byId = id => document.getElementById(id);
const formatMission = index => String(index + 1).padStart(2, '0');

export function isNonDesktopDevice(browser) {
  const agent = browser.userAgent;
  return Boolean(browser.userAgentData?.mobile
    || /Android|iPhone|iPad|iPod|Mobile|Tablet|Kindle|Silk|SmartTV|PlayStation|Nintendo|Xbox/i.test(agent)
    || (browser.maxTouchPoints > 1 && agent.includes('Macintosh')));
}

function setText(node, value) {
  if (node.textContent !== value) node.textContent = value;
}

function setFill(node, ratio) {
  const value = 'scaleX(' + ratio.toFixed(3) + ')';
  if (node.style.transform !== value) node.style.transform = value;
}

export function createInterface({onPlay, onResume, onPause, onTutorial, onRestart, onRetry, onMenu}) {
  const machine = document.querySelector('.machine');
  const stage = byId('stage');
  const canvas = byId('game');
  const overlay = byId('overlay');
  const screens = Object.fromEntries([...overlay.querySelectorAll('.screen')].map(node => [node.id.slice(7), node]));
  const hud = byId('hud');
  const touch = byId('touch');
  const health = byId('health');
  const charge = byId('charge');
  const chargeCaption = byId('charge-caption');
  const chargeFill = byId('charge-fill');
  const objective = byId('objective');
  const laneStatus = byId('lane-status');
  const route = byId('route');
  const notification = byId('notification');
  const noticeText = byId('notification-text');
  const line = byId('line');
  const lineSpeaker = byId('line-speaker');
  const lineText = byId('line-text');
  const interaction = byId('interaction');
  const interactionText = byId('interaction-text');
  const bossHud = byId('boss-hud');
  const bossFill = byId('boss-fill');
  const play = byId('play');
  const pause = byId('pause');
  const fade = byId('scene-fade');
  const storyNext = byId('story-next');
  const tutorialStart = byId('tutorial-start');
  const touchMode = matchMedia('(pointer: coarse)').matches;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let transition;
  let closeStory = null;

  const healthSegments = Array.from({length: MAX_ARMOR}, () => document.createElement('i'));
  health.replaceChildren(...healthSegments);

  function show(name, focus) {
    const previous = machine.dataset.screen;
    overlay.hidden = name === 'playing';
    overlay.dataset.screen = name;
    machine.dataset.screen = name;
    if (previous !== name) fade.style.opacity = '';
    if (previous !== name && previous !== 'tutorial' && previous !== 'pause'
      && name !== 'pause' && name !== 'dead' && name !== 'desktop-only' && !reduceMotion.matches) {
      transition?.cancel();
      transition = fade.animate([{opacity: 1}, {opacity: 0}], {duration: 480, easing: 'ease-out'});
    }
    for (const [key, node] of Object.entries(screens)) node.hidden = key !== name;
    canvas.tabIndex = name === 'playing' ? 0 : -1;
    hud.hidden = name !== 'playing';
    touch.hidden = name !== 'playing';
    if (name !== 'playing') for (const node of [line, notification, bossHud, interaction]) node.hidden = true;
    if (focus) focus.focus({preventScroll: true});
  }

  function beginStory({label, title, text, quote, art, action, onNext}) {
    closeStory = onNext;
    setText(byId('story-label'), label);
    setText(byId('story-title'), title);
    setText(storyNext, action);
    const paragraphs = text.map(value => {
      const p = document.createElement('p');
      p.textContent = value;
      return p;
    });
    if (quote) {
      const p = document.createElement('p');
      p.className = 'quote';
      p.textContent = '«' + quote + '»';
      paragraphs.push(p);
    }
    byId('story-body').replaceChildren(...paragraphs);
    screens.story.dataset.art = art;
    screens.story.style.setProperty('--scene-image', "url('" + storyUrl(art) + "')");
    show('story', storyNext);
  }

  function dismissStory() {
    if (!closeStory) return;
    const next = closeStory;
    closeStory = null;
    next();
  }

  function showMenu() {
    closeStory = null;
    show('menu', play.disabled ? null : play);
  }

  function paintHUD(game) {
    const p = game.player;
    healthSegments.forEach((segment, i) => segment.classList.toggle('full', i < p.hp));
    health.setAttribute('aria-valuenow', p.hp);
    const rounded = Math.floor(p.charge * 100);
    setText(chargeCaption, p.charge >= 1 ? '146%' : rounded + '%');
    charge.setAttribute('aria-valuenow', rounded);
    charge.classList.toggle('ready', p.charge >= 1);
    setFill(chargeFill, p.charge);
    setFill(route, game.route);
    setText(objective, game.objective);
    laneStatus.hidden = !game.ride;
    if (game.ride) setText(laneStatus, 'Полоса ' + (game.ride.lane + 1) + ' из ' + LANES.length);
    notification.hidden = !game.message;
    if (game.message) setText(noticeText, game.message.text);
    line.hidden = !game.dialogue;
    if (game.dialogue) {
      setText(lineSpeaker, game.dialogue.speaker);
      setText(lineText, game.dialogue.text);
    }
    interaction.hidden = !game.interaction;
    if (game.interaction) setText(interactionText, game.interaction);
    bossHud.hidden = !game.boss;
    if (game.boss) setFill(bossFill, game.boss.hp / game.boss.maxHp);
  }

  function paintCompletion(progress) {
    if (progress > 0 && transition) {
      transition.cancel();
      transition = null;
    }
    const opacity = progress > 0 ? String(Math.round(progress ** 1.5 * 1000) / 1000) : '';
    if (fade.style.opacity !== opacity) fade.style.opacity = opacity;
  }

  play.addEventListener('click', onPlay);
  storyNext.addEventListener('click', dismissStory);
  tutorialStart.addEventListener('click', onTutorial);
  pause.addEventListener('click', onPause);
  byId('resume').addEventListener('click', onResume);
  byId('restart').addEventListener('click', onRestart);
  byId('retry').addEventListener('click', onRetry);
  document.querySelectorAll('.menu-return').forEach(button => button.addEventListener('click', onMenu));

  if (touchMode) {
    byId('use-key').textContent = 'Действие';
    setText(tutorialStart, 'Начать миссию');
  }
  window.addEventListener('keydown', event => {
    if (machine.dataset.screen !== 'tutorial') return;
    if (event.key === 'Enter' && event.repeat) event.preventDefault();
    if (event.code !== 'Space' || event.metaKey || event.ctrlKey || event.altKey) return;
    event.preventDefault();
    if (!event.repeat) onTutorial();
  });

  // Freeze game controls at the defeat screen, including held jump and fire.
  // A deliberate Tab and Enter still works on a chosen button.
  window.addEventListener('keydown', event => {
    if (machine.dataset.screen !== 'dead') return;
    if (event.code === 'Space' || (event.key === 'Enter' && event.repeat)) event.preventDefault();
  });

  const titleScreen = screens.menu;
  titleScreen.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || reduceMotion.matches) return;
    const box = titleScreen.getBoundingClientRect();
    titleScreen.style.setProperty('--pointer-x', ((event.clientX - box.left) / box.width - .5).toFixed(3));
    titleScreen.style.setProperty('--pointer-y', ((event.clientY - box.top) / box.height - .5).toFixed(3));
  });
  titleScreen.addEventListener('pointerleave', () => {
    titleScreen.style.removeProperty('--pointer-x');
    titleScreen.style.removeProperty('--pointer-y');
  });

  return {
    canvas, touch, touchMode, beginStory, dismissStory, showMenu, paintHUD, paintCompletion,
    prepareMenu() {
      screens.menu.style.setProperty('--menu-image', "url('" + assetUrl('menu-back') + "')");
      byId('menu-hero').src = assetUrl('menu-hero');
      byId('menu-title-logo').src = assetUrl('menu-logo');
    },
    desktopOnly() {
      canvas.hidden = true;
      show('desktop-only', byId('desktop-only-title'));
    },
    loaded() {
      play.disabled = false;
      showMenu();
    },
    loadFailed(path) {
      setText(play, 'Игра недоступна');
      const error = byId('load-error');
      error.hidden = false;
      setText(error, 'Не удалось загрузить ' + path + '. Обнови страницу.');
    },
    playing(game) {
      stage.classList.toggle('is-boss', Boolean(game.boss));
      show('playing', canvas);
      paintHUD(game);
    },
    tutorial() {
      show('tutorial', tutorialStart);
    },
    paused() {
      show('pause', byId('resume'));
    },
    died(index) {
      setText(byId('dead-mission'), 'МИССИЯ ' + formatMission(index) + ' · ' + MISSIONS[index].title);
      show('dead', byId('dead-panel'));
    },
  };
}
