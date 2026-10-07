/* KivuPlay — main.js (vanilla, no dependencies) */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const restart = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const DICT = window.KIVU_I18N || { en: {}, ui: {} };
  const page = document.body.dataset.page || 'home';

  const storage = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } }
  };

  /* ------------------------------------------------------------------
     i18n — Turkish lives in the markup, English comes from i18n.js
     ------------------------------------------------------------------ */
  const metaDesc = $('meta[name="description"]');
  const original = {
    title: document.title,
    desc: metaDesc ? metaDesc.content : ''
  };
  const textNodes = $$('[data-i18n]');
  const labelNodes = $$('[data-i18n-label]');
  textNodes.forEach((el) => { el._tr = el.innerHTML; });
  labelNodes.forEach((el) => { el._tr = el.getAttribute('aria-label'); });

  let lang = 'tr';
  const ui = (key) => (DICT.ui[lang] || {})[key] ?? (DICT.ui.tr || {})[key];

  const HL_COLORS = ['#FF5A5F', '#FF9F1C', '#16B887', '#1FA3E0', '#9B5DE5', '#F15BB5'];
  function splitLetters() {
    $$('.hl').forEach((el) => {
      const word = el.textContent.trim();
      const letters = [...word].map((ch, i) =>
        `<span class="ltr" style="--i:${i};--c:${HL_COLORS[i % HL_COLORS.length]}">${ch}</span>`).join('');
      el.innerHTML = `<span class="sr-only">${word}</span><span aria-hidden="true">${letters}</span>`;
    });
  }

  function applyLang(next) {
    lang = next === 'en' ? 'en' : 'tr';
    document.documentElement.lang = lang;

    textNodes.forEach((el) => {
      const v = lang === 'en' ? DICT.en[el.dataset.i18n] : el._tr;
      if (v != null) el.innerHTML = v;
    });
    labelNodes.forEach((el) => {
      const v = lang === 'en' ? DICT.en['@' + el.dataset.i18nLabel] : el._tr;
      if (v != null) el.setAttribute('aria-label', v);
    });

    document.title = (lang === 'en' && DICT.en[`meta.${page}.title`]) || original.title;
    if (metaDesc) metaDesc.content = (lang === 'en' && DICT.en[`meta.${page}.desc`]) || original.desc;

    $$('.lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
    splitLetters();
    document.dispatchEvent(new CustomEvent('kivu:lang', { detail: lang }));
  }

  const savedLang = storage.get('kivu-lang');
  const browserLang = (navigator.language || 'tr').toLowerCase().startsWith('tr') ? 'tr' : 'en';
  applyLang(savedLang || browserLang);

  $$('.lang button').forEach((btn) => btn.addEventListener('click', () => {
    if (btn.dataset.lang === lang) return;
    storage.set('kivu-lang', btn.dataset.lang);
    applyLang(btn.dataset.lang);
  }));

  /* ------------------------------------------------------------------
     Header + mobile menu
     ------------------------------------------------------------------ */
  const header = $('.header');
  const onScroll = () => header && header.classList.toggle('is-stuck', scrollY > 24);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const burger = $('.burger');
  const setMenu = (open) => {
    document.body.classList.toggle('menu-open', open);
    burger && burger.setAttribute('aria-expanded', String(open));
  };
  burger && burger.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  $$('.nav a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  /* ------------------------------------------------------------------
     Reveal on scroll (+ stagger)
     ------------------------------------------------------------------ */
  $$('[data-stagger]').forEach((group) => {
    [...group.children].forEach((child, i) => child.style.setProperty('--rd', `${i * 0.09}s`));
  });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    $$('.reveal').forEach((el) => io.observe(el));
  } else {
    $$('.reveal').forEach((el) => el.classList.add('in'));
  }

  /* ------------------------------------------------------------------
     Sound effects (Web Audio, generated — no files)
     ------------------------------------------------------------------ */
  const sfx = (() => {
    let ctx = null;
    let on = storage.get('kivu-sound') !== 'off';
    const audio = () => {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    };
    function tone(freq, { type = 'sine', dur = 0.25, vol = 0.2, slide = 0, delay = 0 } = {}) {
      if (!on) return;
      const c = audio(); if (!c) return;
      const t0 = c.currentTime + delay;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t0);
      if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(c.destination);
      o.start(t0);
      o.stop(t0 + dur + 0.05);
    }
    function noise(dur = 0.07, vol = 0.3) {
      if (!on) return;
      const c = audio(); if (!c) return;
      const len = Math.floor(c.sampleRate * dur);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
      const src = c.createBufferSource();
      const filter = c.createBiquadFilter();
      const g = c.createGain();
      src.buffer = buf;
      filter.type = 'bandpass'; filter.frequency.value = 1700; filter.Q.value = 0.8;
      g.gain.value = vol;
      src.connect(filter).connect(g).connect(c.destination);
      src.start();
    }
    return {
      get on() { return on; },
      set on(v) { on = v; storage.set('kivu-sound', v ? 'on' : 'off'); },
      pop(freq) {
        noise(0.06, 0.32);
        tone(freq, { type: 'triangle', dur: 0.38, vol: 0.22 });
        tone(freq * 2, { type: 'sine', dur: 0.2, vol: 0.05, delay: 0.015 });
      },
      giggle() {
        [0, 1, 2, 3].forEach((i) => tone(680 + i * 110 + Math.random() * 60, { dur: 0.1, vol: 0.13, slide: 1.35, delay: i * 0.085 }));
      },
      cheer() {
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, { type: 'triangle', dur: 0.32, vol: 0.16, delay: i * 0.1 }));
      },
      buzz() { tone(240, { type: 'square', dur: 0.18, vol: 0.05, slide: 0.75 }); }
    };
  })();

  /* ------------------------------------------------------------------
     Hero: Kivu follows the pointer, reacts to taps; toys parallax
     ------------------------------------------------------------------ */
  const kivu = $('#kivu');
  const toys = $$('.toy');
  if (kivu) {
    const pupils = $$('.kivu__pupil', kivu);
    let px = innerWidth / 2;
    let py = innerHeight / 3;
    let raf = 0;

    const frame = () => {
      raf = 0;
      pupils.forEach((p) => {
        const r = p.previousElementSibling.getBoundingClientRect();
        const dx = px - (r.left + r.width / 2);
        const dy = py - (r.top + r.height / 2);
        const d = Math.hypot(dx, dy) || 1;
        const m = Math.min(12, d / 16);
        p.setAttribute('transform', `translate(${(dx / d * m).toFixed(2)} ${(dy / d * m).toFixed(2)})`);
      });
      if (finePointer && !reduceMotion) {
        const x = px / innerWidth - 0.5;
        const y = py / innerHeight - 0.5;
        toys.forEach((t) => {
          const depth = Number(t.dataset.depth) || 20;
          t.style.transform = `translate(${(x * depth).toFixed(1)}px, ${(y * depth).toFixed(1)}px)`;
        });
      }
    };
    addEventListener('pointermove', (e) => {
      px = e.clientX; py = e.clientY;
      if (!raf) raf = requestAnimationFrame(frame);
    }, { passive: true });
    frame();

    const speech = $('.speech');
    let line = 0;
    const poke = () => {
      restart(kivu, 'jump');
      const lines = ui('kivuLines') || [];
      if (speech && lines.length) {
        line = (line + 1) % lines.length;
        speech.textContent = lines[line];
        restart(speech, 'bump');
      }
      sfx.giggle();
    };
    kivu.addEventListener('click', poke);
    kivu.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); poke(); }
    });
    document.addEventListener('kivu:lang', () => { line = 0; });
  }

  /* ------------------------------------------------------------------
     Game cards: gentle 3D tilt
     ------------------------------------------------------------------ */
  if (finePointer && !reduceMotion) {
    $$('[data-tilt]').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.setProperty('--ry', `${(x * 10).toFixed(2)}deg`);
        card.style.setProperty('--rx', `${(-y * 10).toFixed(2)}deg`);
      });
      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ------------------------------------------------------------------
     Playground: balloon pop mini-game
     ------------------------------------------------------------------ */
  const pg = $('#playground');
  if (pg) {
    const COLORS = [
      { c: '#FF5A5F', l: '#FF9EA1', d: '#D63B40', tr: 'Kırmızı', en: 'Red',    note: 523.25 },
      { c: '#FF9F1C', l: '#FFC772', d: '#D97F00', tr: 'Turuncu', en: 'Orange', note: 587.33 },
      { c: '#FFD23F', l: '#FFE891', d: '#DDAE00', tr: 'Sarı',    en: 'Yellow', note: 659.25 },
      { c: '#2ED3A0', l: '#86EDCB', d: '#14A57A', tr: 'Yeşil',   en: 'Green',  note: 783.99 },
      { c: '#3AB8F5', l: '#93DAFB', d: '#1B8FCB', tr: 'Mavi',    en: 'Blue',   note: 880.00 },
      { c: '#9B5DE5', l: '#C9A3F3', d: '#7A3FC4', tr: 'Mor',     en: 'Purple', note: 1046.5 },
      { c: '#F15BB5', l: '#F8A6D7', d: '#C93D8F', tr: 'Pembe',   en: 'Pink',   note: 1174.66 }
    ];
    const scoreEl = $('#score');
    const scoreBox = scoreEl.closest('.score');
    const cheer = $('.pg__cheer', pg);
    const soundBtn = $('#soundToggle');
    let score = 0;
    let visible = false;
    let timer = 0;
    let lastColor = null;

    soundBtn.setAttribute('aria-pressed', String(sfx.on));
    soundBtn.addEventListener('click', () => {
      sfx.on = !sfx.on;
      soundBtn.setAttribute('aria-pressed', String(sfx.on));
    });

    function spawn() {
      if (!visible || document.hidden) return;
      if ($$('.balloon:not(.popped)', pg).length >= 9) return;
      let col;
      do { col = pick(COLORS); } while (col === lastColor);
      lastColor = col;

      const w = pg.clientWidth;
      const h = pg.clientHeight;
      const small = w < 600;
      const s = Math.round(rand(small ? 60 : 76, small ? 82 : 106));
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'balloon';
      b.setAttribute('aria-label', `${col[lang]} ${ui('balloon')}`);
      b.style.cssText = [
        `--x:${rand(9, 91).toFixed(1)}%`,
        `--s:${s}px`,
        `--c:${col.c}`, `--c-l:${col.l}`, `--c-d:${col.d}`,
        `--d:${(reduceMotion ? rand(15, 19) : rand(6.5, 10)).toFixed(2)}s`,
        `--sd:${rand(-3, 0).toFixed(2)}s`,
        `--rise:${-(h + s * 2.6)}px`
      ].join(';');
      b.innerHTML = '<span class="balloon__b"></span>';
      const go = (e) => { e.preventDefault(); pop(b, col); };
      b.addEventListener('pointerdown', go);
      b.addEventListener('click', go);
      b.addEventListener('animationend', (e) => { if (e.animationName === 'rise') b.remove(); });
      pg.appendChild(b);
    }

    function pop(b, col) {
      if (b.classList.contains('popped')) return;
      b.classList.add('popped');
      const pr = pg.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      const x = br.left - pr.left + br.width / 2;
      const y = br.top - pr.top + br.height * 0.45;

      sfx.pop(col.note);
      burst(x, y, col.c);
      floatWord(x, y, col[lang], col.c);

      score += 1;
      scoreEl.textContent = score;
      restart(scoreBox, 'bump');
      pg.classList.add('started');
      if (score % 10 === 0) celebrate();
      setTimeout(() => b.remove(), 260);
    }

    function burst(x, y, color) {
      const n = 14;
      for (let i = 0; i < n; i++) {
        const s = document.createElement('span');
        const a = (Math.PI * 2 * i) / n + rand(-0.2, 0.2);
        const d = rand(44, 96);
        s.className = i % 3 === 0 ? 'spark spark--star' : 'spark';
        s.style.cssText = `left:${x}px;top:${y}px;--c:${i % 4 === 0 ? '#FFFFFF' : color};--dx:${(Math.cos(a) * d).toFixed(1)}px;--dy:${(Math.sin(a) * d).toFixed(1)}px`;
        s.addEventListener('animationend', () => s.remove());
        pg.appendChild(s);
      }
    }

    function floatWord(x, y, text, color) {
      const w = document.createElement('span');
      w.className = 'pop-word';
      w.textContent = text;
      w.style.cssText = `left:${x}px;top:${y}px;--c:${color}`;
      w.addEventListener('animationend', () => w.remove());
      pg.appendChild(w);
    }

    function celebrate() {
      cheer.textContent = pick(ui('cheers') || ['!']);
      restart(cheer, 'show');
      sfx.cheer();
      const h = pg.clientHeight;
      for (let i = 0; i < 60; i++) {
        const c = document.createElement('span');
        c.className = 'confetti';
        c.style.cssText = [
          `left:${rand(0, 100).toFixed(1)}%`,
          `--c:${pick(COLORS).c}`,
          `--d:${rand(1.6, 2.8).toFixed(2)}s`,
          `--dl:${rand(0, 0.5).toFixed(2)}s`,
          `--dx:${rand(-80, 80).toFixed(0)}px`,
          `--h:${h + 60}px`,
          `--rot:${rand(-720, 720).toFixed(0)}deg`
        ].join(';');
        c.addEventListener('animationend', () => c.remove());
        pg.appendChild(c);
      }
    }

    const start = () => {
      if (timer) return;
      spawn();
      setTimeout(spawn, 350);
      setTimeout(spawn, 800);
      timer = setInterval(spawn, 950);
    };
    const stop = () => { clearInterval(timer); timer = 0; };

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        visible ? start() : stop();
      }, { threshold: 0.25 }).observe(pg);
    } else {
      visible = true; start();
    }

    document.addEventListener('kivu:lang', () => {
      $$('.balloon', pg).forEach((b) => b.remove());
    });
  }

  /* ------------------------------------------------------------------
     Parental gate demo
     ------------------------------------------------------------------ */
  const gate = $('#gate');
  if (gate) {
    const msg = $('.gate__msg', gate);
    const aEl = $('#gateA');
    const bEl = $('#gateB');
    const buttons = $$('.gate__opts button', gate);
    let locked = false;

    const newQuestion = () => {
      const a = Math.floor(rand(2, 7));
      const b = Math.floor(rand(2, 6));
      const answer = a + b;
      const wrong = new Set();
      while (wrong.size < 2) {
        const w = answer + pick([-3, -2, -1, 1, 2, 3]);
        if (w > 0 && w !== answer) wrong.add(w);
      }
      const options = [answer, ...wrong].sort(() => Math.random() - 0.5);
      aEl.textContent = a;
      bEl.textContent = b;
      buttons.forEach((btn, i) => {
        btn.textContent = options[i];
        if (options[i] === answer) btn.dataset.ok = '1'; else delete btn.dataset.ok;
      });
    };

    buttons.forEach((btn) => btn.addEventListener('click', () => {
      if (locked) return;
      if (btn.dataset.ok) {
        locked = true;
        gate.classList.add('ok');
        msg.textContent = ui('gateOk');
        sfx.cheer();
        setTimeout(() => {
          gate.classList.remove('ok');
          msg.textContent = '';
          newQuestion();
          locked = false;
        }, 2600);
      } else {
        restart(btn, 'wrong');
        msg.textContent = ui('gateNo');
        sfx.buzz();
      }
    }));
  }
})();
