/* ——— тема ——— */
const root = document.documentElement;
const prefersLight = window.matchMedia('(prefers-color-scheme: light)');
const applyTheme = (light) => { root.dataset.theme = light ? 'light' : 'dark'; };
applyTheme(prefersLight.matches);
prefersLight.addEventListener('change', (e) => applyTheme(e.matches));

/* ——— печатающаяся подпись ——— */
const typedEl = document.getElementById('typed');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const PHRASES = [
  'Контент, видео и ищо чета там...',
  'фудкорд патруль вышел на ахоту)))..._)_),....ююю',
  'Мировая звезда, победитель Слей Кинг 2026',
  'Бля ща бы похавать в росте.....',
  'снимаю видео, пока не забанят',
  'мем-лорд, эксперт по рофлам',
  'контент выходит по расписанию, но не сегодня',
  'тгк читают двое: я и ты',
  'фудкорд-патруль, отдел пончиков'
];

const PAUSE_AFTER_PHRASE = 3000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const between = (min, max) => min + Math.random() * (max - min);

let queue = [];
let lastPhrase = '';

const takePhrase = () => {
  if (!queue.length) {
    queue = PHRASES.slice();
    for (let i = queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }
    // не начинаем новый круг с той же фразы, что только что была
    if (queue[queue.length - 1] === lastPhrase) {
      [queue[queue.length - 1], queue[0]] = [queue[0], queue[queue.length - 1]];
    }
  }
  return queue.pop();
};

const charDelay = (char) => {
  let delay = between(42, 92);
  if (char === ' ') delay = between(28, 58);
  if (',.:;!?'.includes(char)) delay += between(120, 260);
  if (char === ')' || char === '_') delay += between(40, 120);
  if (Math.random() < 0.06) delay += between(90, 220);
  return delay;
};

const typePhrase = async (phrase) => {
  for (let i = 1; i <= phrase.length; i++) {
    typedEl.textContent = phrase.slice(0, i);
    await sleep(charDelay(phrase[i - 1]));
  }
};

const erasePhrase = async (phrase) => {
  for (let i = phrase.length - 1; i >= 0; i--) {
    typedEl.textContent = phrase.slice(0, i);
    await sleep(between(10, 22));
  }
};

const runTypewriter = async () => {
  while (true) {
    if (reducedMotion.matches) return;
    lastPhrase = takePhrase();
    await typePhrase(lastPhrase);
    await sleep(PAUSE_AFTER_PHRASE);
    await erasePhrase(lastPhrase);
    await sleep(260);
  }
};

if (reducedMotion.matches) {
  typedEl.textContent = PHRASES[0];
} else {
  typedEl.textContent = '';
  setTimeout(runTypewriter, 1050);
}

/* ——— звук ——— */
let audioCtx = null;

const getAudio = () => {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
};

const meow = () => {
  const ctx = getAudio();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(540, now);
  osc.frequency.exponentialRampToValueAtTime(880, now + 0.14);
  osc.frequency.exponentialRampToValueAtTime(420, now + 0.46);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1800, now);
  filter.frequency.exponentialRampToValueAtTime(900, now + 0.46);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.16, now + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
  osc.connect(filter).connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.52);
};

const playNyan = (seconds = 8) => {
  const ctx = getAudio();
  const melody = window.NYAN_MELODY;
  if (!ctx || !melody) return;
  const step = 0.105;
  const start = ctx.currentTime + 0.05;
  const master = ctx.createGain();
  const tone = ctx.createBiquadFilter();
  master.gain.value = 0.12;
  tone.type = 'lowpass';
  tone.frequency.value = 3600;
  tone.Q.value = 0.6;
  master.connect(tone).connect(ctx.destination);

  const notes = melody.freq;
  const units = melody.units;
  const loop = melody.loop !== false;
  let t = 0;
  let i = 0;

  while (t < seconds - 0.01) {
    const len = (units[i] || 1) * step;
    const freq = notes[i];
    const at = start + t;
    const dur = Math.min(len * 0.92, seconds - t);

    if (freq && dur > 0.01) {
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, at);
      env.gain.exponentialRampToValueAtTime(0.5, at + 0.008);
      env.gain.exponentialRampToValueAtTime(0.22, at + Math.min(0.05, dur * 0.5));
      env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      env.connect(master);

      // лид: две квадратные волны с лёгким расщеплением
      [-4, 4].forEach((cents) => {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = freq;
        osc.detune.value = cents;
        osc.connect(env);
        osc.start(at);
        osc.stop(at + dur + 0.02);
      });

      // саб-октава для тела
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = 'triangle';
      sub.frequency.value = freq / 2;
      subGain.gain.value = 0.35;
      sub.connect(subGain).connect(env);
      sub.start(at);
      sub.stop(at + dur + 0.02);
    }

    t += len;
    i = (i + 1) % notes.length;
    if (!loop && i === 0) break;
  }

  // мягкое затухание в конце, чтобы не обрывалось
  const end = start + seconds;
  master.gain.setValueAtTime(0.12, end - 0.12);
  master.gain.exponentialRampToValueAtTime(0.0001, end);
  setTimeout(() => master.disconnect(), (seconds + 0.4) * 1000);
};

/* ——— кот: мяу и дождь из котов ——— */
const CAT_CLICKS_TOTAL = 15;
const catBtn = document.querySelector('.avatar-wrap');
const MIAU_WORDS = ['мяу', 'meow'];
const MIAU_COLORS = ['#c6ff3d', '#ff2e63', '#4ea1ff', '#ffb020', '#b06bff'];
let catClicks = 0;
let miauLayer = null;

const spawnMiau = () => {
  if (reducedMotion.matches || !catBtn) return;
  if (!miauLayer) {
    miauLayer = document.createElement('div');
    miauLayer.className = 'miau-layer';
    miauLayer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(miauLayer);
  }
  const rect = catBtn.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const count = 8;
  for (let i = 0; i < count; i++) {
    const word = document.createElement('span');
    word.className = 'miau';
    word.textContent = MIAU_WORDS[Math.floor(Math.random() * MIAU_WORDS.length)];
    const angle = (Math.PI * 2 * i) / count + between(-0.4, 0.4);
    const distance = between(74, 168);
    word.style.setProperty('--x', `${cx.toFixed(0)}px`);
    word.style.setProperty('--y', `${cy.toFixed(0)}px`);
    word.style.setProperty('--dx', `${(Math.cos(angle) * distance).toFixed(0)}px`);
    word.style.setProperty('--dy', `${(Math.sin(angle) * distance).toFixed(0)}px`);
    word.style.setProperty('--rot', `${between(-55, 55).toFixed(0)}deg`);
    word.style.setProperty('--sc', between(0.85, 1.3).toFixed(2));
    word.style.setProperty('--size', `${between(11, 17).toFixed(0)}px`);
    word.style.setProperty('--dur', `${between(620, 920).toFixed(0)}ms`);
    word.style.setProperty('--c', MIAU_COLORS[Math.floor(Math.random() * MIAU_COLORS.length)]);
    word.setAttribute('aria-hidden', 'true');
    word.addEventListener('animationend', () => word.remove(), { once: true });
    miauLayer.appendChild(word);
  }
};

const CAT_SHOW_MS = 8000;
let catsActive = false;

const catRain = (duration = CAT_SHOW_MS) => {
  if (reducedMotion.matches) return;
  const layer = document.createElement('div');
  layer.className = 'cat-rain';
  layer.setAttribute('aria-hidden', 'true');
  const count = 54;
  for (let i = 0; i < count; i++) {
    const img = document.createElement('img');
    const fall = 1.6 + Math.random() * 1.1;
    const delay = Math.random() * Math.max(0, duration / 1000 - fall);
    img.src = 'assets/avatar.webp';
    img.alt = '';
    img.decoding = 'async';
    img.style.setProperty('--size', `${Math.round(24 + Math.random() * 44)}px`);
    img.style.setProperty('--dur', `${fall.toFixed(2)}s`);
    img.style.setProperty('--delay', `${delay.toFixed(2)}s`);
    img.style.setProperty('--rot', `${Math.round(Math.random() * 300 - 150)}deg`);
    img.style.left = `${(Math.random() * 96).toFixed(1)}%`;
    layer.appendChild(img);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), duration + 400);
};

const playCatShow = () => {
  if (catsActive) return;
  catsActive = true;
  playNyan(CAT_SHOW_MS / 1000);
  catRain(CAT_SHOW_MS);
  setTimeout(() => { catsActive = false; }, CAT_SHOW_MS);
};

if (catBtn) {
  catBtn.addEventListener('click', () => {
    meow();
    spawnMiau();
    catBtn.classList.remove('is-pet');
    void catBtn.offsetWidth;
    catBtn.classList.add('is-pet');
    if (catsActive) return;
    catClicks += 1;
    if (catClicks >= CAT_CLICKS_TOTAL) {
      catClicks = 0;
      playCatShow();
    }
  });
}

/* ——— счётчик визитов ——— */
const viewsEl = document.getElementById('viewsCount');
const VISIT_KEY = 'vyssoo:lastVisit';
const VIEWS_CACHE_KEY = 'vyssoo:views';
// совпадает с серверным окном антинакрутки: один визит с браузера за 24 часа
const VISIT_WINDOW = 24 * 60 * 60 * 1000;
const viewsFormat = new Intl.NumberFormat('ru-RU');

const cachedViews = Number(localStorage.getItem(VIEWS_CACHE_KEY));
if (viewsEl && Number.isFinite(cachedViews) && cachedViews > 0) {
  viewsEl.textContent = viewsFormat.format(cachedViews);
}

const requestCount = async (method) => {
  const res = await fetch('/api/visit', { method, cache: 'no-store' });
  if (!res.ok) throw new Error(`status ${res.status}`);
  return res.json();
};

const loadViews = async () => {
  if (!viewsEl) return;
  const last = Number(localStorage.getItem(VISIT_KEY)) || 0;
  const isNewVisit = Date.now() - last > VISIT_WINDOW;
  const method = isNewVisit ? 'POST' : 'GET';
  try {
    let data;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        data = await requestCount(method);
        break;
      } catch (err) {
        if (attempt === 2) throw err;
        // сеть до Functions иногда обрывается — повторяем с паузой
        await sleep(1200 * (attempt + 1));
      }
    }
    viewsEl.textContent = viewsFormat.format(data.count);
    localStorage.setItem(VIEWS_CACHE_KEY, String(data.count));
    if (isNewVisit) localStorage.setItem(VISIT_KEY, String(Date.now()));
  } catch (err) {
    // оставляем закешированное число или «—»
  }
};

loadViews();


if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
