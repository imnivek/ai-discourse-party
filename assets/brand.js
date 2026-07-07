/* ============================================================
   AI 思辨派對 — 共用行為 brand.js  →  window.Brand
   依賴：p5.js 1.9.0（onView / mascot 動畫 / 遊戲）、
        matter-js 0.19.0（deliberationGame）。
   若頁面不需遊戲，可只載 p5（或都不載，其餘 API 仍可用）。
   ============================================================ */
(function (global) {
  'use strict';
  const Brand = {};
  const hasP5 = () => typeof global.p5 !== 'undefined';
  const hasMatter = () => typeof global.Matter !== 'undefined';
  const isMobile = () => global.innerWidth < 720;
  const REDUCED = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 五型別色（與 brand.css 同步） */
  const TYPE_COLORS = { ask:'#E0A92E', listen:'#2F6DA8', debate:'#C0392B', build:'#4E9A4A', connect:'#7E5AA8' };
  Brand.colors = { red:'#7A1F1F', redBright:'#C0392B', ink:'#1A1613', paper:'#F3EEE2', ...TYPE_COLORS };

  /* ============================================================
     Brand.initChrome(active)  —  注入 nav + footer
     active ∈ 'home' | 'topic' | 'community' | 'about'
     ============================================================ */
  Brand.initChrome = function (active) {
    const nav = `
    <header class="site-nav">
      <a class="site-nav__logo" href="index.html"><span class="site-nav__leaf">🌱</span>AI 思辨派對</a>
      <nav class="site-nav__links">
        <a class="nav-link" data-key="home" href="index.html">首頁</a>
        <a class="nav-link" data-key="topic" href="topic-market.html">議題園</a>
        <a class="nav-link" data-key="community" href="community.html">採集隊</a>
        <a class="nav-link" data-key="about" href="about.html">關於</a>
        <a class="nav-cta" href="about.html#join">報名下一場</a>
      </nav>
    </header>`;
    const footer = `
    <footer class="site-footer">
      <div class="site-footer__inner">
        <div>
          <div class="site-footer__brand"><span class="leaf"></span>AI 思辨派對</div>
          <p class="site-footer__tag">帶著卡關進場，帶著思辨獸離開。答案不在講台上，而在每一張願意把問題拿出來的桌子上。</p>
        </div>
        <nav class="site-footer__links">
          <a href="index.html">首頁</a>
          <a href="topic-market.html">議題園</a>
          <a href="community.html">採集隊</a>
          <a href="about.html">關於</a>
          <a href="about.html#join">報名下一場</a>
        </nav>
        <div class="site-footer__copy">© 2026 AI DISCOURSE PARTY · 思辨小花園. ALL QUESTIONS RESERVED.</div>
      </div>
    </footer>`;
    document.body.insertAdjacentHTML('afterbegin', nav);
    document.body.insertAdjacentHTML('beforeend', footer);
    if (active) {
      const link = document.querySelector('.site-nav .nav-link[data-key="' + active + '"]');
      if (link) link.classList.add('is-active');
    }
  };

  /* ============================================================
     Brand.state  —  localStorage 共用存檔（採集分數 / 解鎖 / 議題園）
     key: 'discourse_garden'
     ============================================================ */
  const KEY = 'discourse_garden';
  Brand.state = {
    _read() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } },
    _write(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} },
    /** 讀全部狀態 → {score, unlocked[], posts[], crystals[]} */
    get() { const d = this._read(); return { score: d.score || 0, unlocked: d.unlocked || [], posts: d.posts || [], crystals: d.crystals || [] }; },
    /** 採集分數 +n，回傳新分數 */
    addScore(n = 1) { const d = this._read(); d.score = (d.score || 0) + n; this._write(d); return d.score; },
    /** 解鎖型態 type */
    unlock(type) { const d = this._read(); d.unlocked = d.unlocked || []; if (!d.unlocked.includes(type)) { d.unlocked.push(type); this._write(d); } return d.unlocked; },
    /** 存議題園（思辨方塊）資料 */
    saveGarden(posts, crystals, score) { const d = this._read(); d.posts = posts; d.crystals = crystals; if (score != null) d.score = score; this._write(d); },
    /** 全部清空 */
    reset() { try { localStorage.removeItem(KEY); } catch (e) {} }
  };

  /* ============================================================
     Brand.onView(el, sketchOrFactory)
     el 進入視窗才 p5 loop、離開 noLoop。回傳 p5 instance。
     sketchOrFactory：instance-mode sketch (p)=>{}，或回傳 sketch 的 factory ()=>fn
     ============================================================ */
  Brand.onView = function (el, sketchOrFactory) {
    if (!hasP5()) { console.warn('[Brand.onView] p5 未載入'); return null; }
    let sketch = sketchOrFactory;
    if (typeof sketchOrFactory === 'function' && sketchOrFactory.length === 0) {
      const r = sketchOrFactory();
      if (typeof r === 'function') sketch = r;
    }
    const inst = new global.p5(sketch);
    const io = new IntersectionObserver((entries) => {
      entries[0].isIntersecting ? inst.loop() : inst.noLoop();
    }, { threshold: 0.02 });
    io.observe(el);
    return inst;
  };

  /* ============================================================
     Brand.radar(ctx2d, values5, opts)
     在 2D context（可傳 p5 的 p.drawingContext）畫五軸雷達。
     座標以 CSS px 計；p5 已對 drawingContext 套 pixelDensity 縮放。
     opts = { size, axes[], stroke, fill, dot, label, ring, showLabels }
     ============================================================ */
  Brand.radar = function (ctx, values, opts) {
    opts = opts || {};
    const size = opts.size || 320;
    const cx = size / 2, cy = size / 2, R = size * (opts.rScale || 0.30);
    const axes = opts.axes || ['vision', 'systems', 'depth', 'action', 'community'];
    const n = values.length;
    const stroke = opts.stroke || '#7A1F1F';
    const fill = opts.fill || 'rgba(122,31,31,0.14)';
    const dot = opts.dot || '#E0A92E';
    const label = opts.label || '#5B5348';
    const ring = opts.ring || 'rgba(90,80,65,0.28)';
    const pt = (i, r) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
    ctx.save();
    // 環
    ctx.lineWidth = 1; ctx.strokeStyle = ring;
    for (let g = 1; g <= 3; g++) { ctx.beginPath(); for (let i = 0; i < n; i++) { const [x, y] = pt(i, R * g / 3); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath(); ctx.stroke(); }
    // 軸
    for (let i = 0; i < n; i++) { const [x, y] = pt(i, R); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke(); }
    // 資料多邊形
    ctx.beginPath(); for (let i = 0; i < n; i++) { const [x, y] = pt(i, R * values[i]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath();
    ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = stroke; ctx.stroke();
    // 頂點
    ctx.fillStyle = dot; for (let i = 0; i < n; i++) { const [x, y] = pt(i, R * values[i]); ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); }
    // 標籤
    if (opts.showLabels !== false) {
      ctx.fillStyle = label; ctx.font = '600 ' + Math.max(9, size * 0.04) + "px 'IBM Plex Mono', monospace";
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let i = 0; i < n; i++) { const [x, y] = pt(i, R + size * 0.07); ctx.fillText(String(axes[i]).toUpperCase(), x, y); }
    }
    ctx.restore();
  };

  /* ============================================================
     Brand.mascot(el, type)  —  程式生成幾何植物小怪（SVG）
     type ∈ 'ask' | 'listen' | 'debate' | 'build' | 'connect'
     ============================================================ */
  const MASCOT_META = {
    ask:     { color: TYPE_COLORS.ask,     name: '問問', tag: 'ASK · 提問者' },
    listen:  { color: TYPE_COLORS.listen,  name: '聽聽', tag: 'LISTEN · 傾聽者' },
    debate:  { color: TYPE_COLORS.debate,  name: '辨辨', tag: 'DEBATE · 思辨者' },
    build:   { color: TYPE_COLORS.build,   name: '做做', tag: 'BUILD · 實作者' },
    connect: { color: TYPE_COLORS.connect, name: '連連', tag: 'CONNECT · 連結者' }
  };
  Brand.mascotMeta = MASCOT_META;

  function mascotSVG(type) {
    const m = MASCOT_META[type] || MASCOT_META.ask;
    const c = m.color;
    const dark = shade(c, -28), light = shade(c, 30);
    // 共用身體 + 臉
    const face = `
      <ellipse class="mascot-body" cx="50" cy="82" rx="26" ry="27" fill="${c}"/>
      <ellipse cx="50" cy="90" rx="18" ry="12" fill="${dark}" opacity=".35"/>
      <circle cx="42" cy="80" r="3.4" fill="#1A1613"/>
      <circle cx="58" cy="80" r="3.4" fill="#1A1613"/>
      <circle cx="43.2" cy="79" r="1.1" fill="#fff"/>
      <circle cx="59.2" cy="79" r="1.1" fill="#fff"/>
      <path d="M44 89 Q50 93 56 89" stroke="#1A1613" stroke-width="2" fill="none" stroke-linecap="round"/>
      <ellipse cx="38" cy="86" rx="3.4" ry="2.2" fill="${light}" opacity=".7"/>
      <ellipse cx="62" cy="86" rx="3.4" ry="2.2" fill="${light}" opacity=".7"/>`;
    let feature = '';
    if (type === 'ask') {
      feature = `<g class="mascot-feature">
        <rect x="47.5" y="40" width="5" height="20" rx="2.5" fill="${dark}"/>
        <path d="M42 40 q8 -22 16 -6 q4 8 -5 12" stroke="${c}" stroke-width="6" fill="none" stroke-linecap="round"/>
        <circle cx="44" cy="60" r="3.2" fill="${c}"/></g>`;
    } else if (type === 'listen') {
      feature = `<g class="mascot-feature">
        <path d="M28 74 Q10 60 22 44 Q34 56 34 72 Z" fill="${c}"/>
        <path d="M72 74 Q90 60 78 44 Q66 56 66 72 Z" fill="${c}"/>
        <path d="M28 70 Q20 60 25 52" stroke="${dark}" stroke-width="2" fill="none"/>
        <path d="M72 70 Q80 60 75 52" stroke="${dark}" stroke-width="2" fill="none"/>
        <rect x="48" y="46" width="4" height="14" rx="2" fill="${dark}"/></g>`;
    } else if (type === 'debate') {
      feature = `<g class="mascot-feature">
        <polygon points="42,58 34,34 46,50" fill="${c}"/>
        <polygon points="58,58 66,34 54,50" fill="${dark}"/>
        <polygon points="50,58 50,32 44,48" fill="${light}"/>
        <line x1="42" y1="58" x2="58" y2="58" stroke="${dark}" stroke-width="2"/></g>`;
    } else if (type === 'build') {
      feature = `<g class="mascot-feature">
        <g transform="translate(50 46)">
          <circle r="12" fill="${c}"/><circle r="4.5" fill="${dark}"/>
          ${Array.from({length:8}).map((_,i)=>{const a=i*Math.PI/4;return `<rect x="${Math.cos(a)*11-2.5}" y="${Math.sin(a)*11-2.5}" width="5" height="5" rx="1" fill="${c}" transform="rotate(${i*45})"/>`;}).join('')}
        </g>
        <path d="M74 78 l10 -10 a4 4 0 0 0 -6 -6 l-10 10" fill="${dark}"/>
        <circle cx="76" cy="70" r="3" fill="${light}"/></g>`;
    } else { // connect
      feature = `<g class="mascot-feature">
        <path d="M50 58 Q34 46 40 30 Q52 36 50 52" stroke="${c}" stroke-width="4" fill="none" stroke-linecap="round"/>
        <path d="M50 58 Q66 48 62 32" stroke="${dark}" stroke-width="4" fill="none" stroke-linecap="round"/>
        <circle cx="40" cy="30" r="4" fill="${c}"/><circle cx="62" cy="32" r="4" fill="${dark}"/>
        <circle cx="50" cy="52" r="3.2" fill="${light}"/></g>`;
    }
    return `<svg viewBox="0 0 100 120" role="img" aria-label="${m.name} ${type} 吉祥物">${feature}${face}</svg>`;
  }

  Brand.mascot = function (el, type) {
    if (!el) return;
    el.classList.add('mascot');
    el.setAttribute('data-type', type);
    el.innerHTML = mascotSVG(type);
    return el;
  };

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
    r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  /* ============================================================
     Brand.deliberationGame(mountEl, opts)  —  思辨方塊遊戲
     opts = { categories[], defaultCat, seed[], maxBlocks, onScore(fn) }
     回傳 { p5, getScore(), clear() }
     ============================================================ */
  const DEFAULT_CATEGORIES = [
    { id: 'anx',  label: '焦慮與心態', color: TYPE_COLORS.debate,  shape: 'L', re: /怕|擔心|焦慮|淘汰|取代|不安|沒用|落後|來不及|恐懼|壓力/i },
    { id: 'tool', label: '工具與技術', color: TYPE_COLORS.listen,  shape: 'O', re: /prompt|midjourney|chatgpt|gpt|claude|怎麼用|寫程式|工具|模型|api|自動化|coding|部署/i },
    { id: 'idea', label: '創意與應用', color: TYPE_COLORS.ask,     shape: 'T', re: /點子|創作|企劃|發想|靈感|設計|內容|行銷|文案|品牌|影片/i },
    { id: 'eth',  label: '倫理與未來', color: TYPE_COLORS.build,   shape: 'I', re: /版權|真實|人類|未來|價值|倫理|法規|道德|隱私|信任|責任/i }
  ];
  const DEFAULT_MISC = { id: 'misc', label: '待歸類', color: TYPE_COLORS.connect, shape: 'S1' };
  const DEFAULT_SEED = [
    'AI 會不會取代我的工作', 'prompt 一直寫不出想要的圖', '想用 chatgpt 做工作流自動化',
    '沒靈感時能靠 AI 發想嗎', 'AI 生成的內容有版權嗎', '好怕自己學不動被淘汰',
    '該學哪個工具才不會白學', '想做一個行銷文案產生器', 'AI 說的答案能相信嗎', '未來人類還需要學畫畫嗎'
  ];
  const SHAPES = { L: [[0,0],[0,1],[0,2],[1,2]], O: [[0,0],[1,0],[0,1],[1,1]], T: [[0,0],[1,0],[2,0],[1,1]], I: [[0,0],[0,1],[0,2],[0,3]], S1: [[0,0],[1,0]] };

  Brand.deliberationGame = function (mountEl, opts) {
    opts = opts || {};
    if (!hasP5() || !hasMatter()) { console.warn('[Brand.deliberationGame] 需要 p5 與 matter-js'); return null; }
    const CATS = opts.categories || DEFAULT_CATEGORIES;
    const DEF = opts.defaultCat || DEFAULT_MISC;
    const ALL = CATS.concat([DEF]);
    const SEED = opts.seed || DEFAULT_SEED;
    const MAXB = opts.maxBlocks || (isMobile() ? 26 : 40);
    const catById = (id) => ALL.find(c => c.id === id) || DEF;
    const classify = (t) => { for (const c of CATS) if (c.re.test(t)) return c; return DEF; };
    const M = global.Matter;
    const NS = 'http://www.w3.org/2000/svg';

    // ---- 注入 DOM ----
    mountEl.classList.add('dg');
    mountEl.innerHTML = `
      <div class="dg-stage">
        <span class="dg-band-label">✦ 星空檔案庫 · 思想結晶漂浮區</span>
        <div class="dg-hud">
          <div class="dg-legend"></div>
          <button class="dg-clear" type="button">🧹 清空</button>
        </div>
        <div class="dg-canvas"></div>
        <div class="dg-tip"></div>
        <div class="dg-mindmap"></div>
        <form class="dg-inputbar" autocomplete="off">
          <input type="text" maxlength="40" placeholder="把你的 AI 卡關丟進來…">
          <button type="submit">種下去 🌱</button>
        </form>
      </div>`;
    const stageEl = mountEl.querySelector('.dg-stage');
    const canvasHost = mountEl.querySelector('.dg-canvas');
    const tipEl = mountEl.querySelector('.dg-tip');
    const mmEl = mountEl.querySelector('.dg-mindmap');
    const legendEl = mountEl.querySelector('.dg-legend');
    const formEl = mountEl.querySelector('.dg-inputbar');
    const inputEl = mountEl.querySelector('.dg-inputbar input');
    const clearBtn = mountEl.querySelector('.dg-clear');
    CATS.forEach(c => { const el = document.createElement('span'); el.className = 'dg-legend__chip'; el.innerHTML = `<i style="background:${c.color}"></i>${c.label}`; legendEl.appendChild(el); });

    let score = Brand.state.get().score || 0;

    const sketch = (p) => {
      let engine, world, mouse, mc, W, H, CELL, BAND;
      let walls = [], crystals = [], sparks = [], orderSeq = 0, frameC = 0, saveTimer = null;
      const getBlocks = () => M.Composite.allBodies(world).filter(b => b.plugin && b.plugin.isBlock);
      const field = () => ({ left: 14, right: W - 14, bottom: H - 14, top: BAND });

      function buildWalls() {
        walls.forEach(w => M.Composite.remove(world, w)); walls = [];
        const o = { isStatic: true, restitution: 0.1, friction: 0.6 };
        walls.push(M.Bodies.rectangle(W / 2, H + 30, W * 1.4, 60, o));
        walls.push(M.Bodies.rectangle(-30, H / 2, 60, H * 2, o));
        walls.push(M.Bodies.rectangle(W + 30, H / 2, 60, H * 2, o));
        M.Composite.add(world, walls);
      }

      p.setup = () => {
        W = stageEl.clientWidth; H = stageEl.clientHeight;
        CELL = isMobile() ? 19 : 25; BAND = Math.round(H * 0.26);
        const c = p.createCanvas(W, H); c.parent(canvasHost);
        p.pixelDensity(1);
        p.textFont('Instrument Sans'); p.textAlign(p.CENTER, p.CENTER); p.rectMode(p.CENTER);
        engine = M.Engine.create(); world = engine.world; engine.gravity.y = REDUCED ? 0.35 : 1;
        buildWalls();
        mouse = M.Mouse.create(c.elt); mouse.pixelRatio = 1;
        mc = M.MouseConstraint.create(engine, { mouse, constraint: { stiffness: 0.18, render: { visible: false } } });
        M.Composite.add(world, mc);
        restoreState();
      };

      p.draw = () => {
        M.Engine.update(engine, 1000 / 60);
        p.clear();
        drawGround(); drawBlocks(); drawBand(); updateCrystals(); drawSparks();
        frameC++; if (frameC % 7 === 0) detectMatches();
        handleHover();
      };

      function drawGround() {
        p.noStroke(); p.fill('#E4D3A8'); p.rectMode(p.CORNER); p.rect(0, H - 15, W, 15); p.rectMode(p.CENTER);
        p.stroke('#8FAF63'); p.strokeWeight(2);
        for (let x = 12; x < W; x += 34) { p.line(x, H - 15, x - 4, H - 23); p.line(x, H - 15, x, H - 26); p.line(x, H - 15, x + 4, H - 23); }
        p.noStroke();
      }
      function cell(x, y, ang, col) {
        p.push(); p.translate(x, y); p.rotate(ang);
        p.fill(col); p.noStroke(); p.rect(0, 0, CELL * 0.98, CELL * 0.98, 7);
        p.fill(255, 255, 255, 50); p.rect(-CELL * 0.16, -CELL * 0.18, CELL * 0.42, CELL * 0.3, 5);
        p.pop();
      }
      function drawBlocks() {
        for (const b of getBlocks()) {
          const col = b.plugin.cat.color;
          for (let i = 1; i < b.parts.length; i++) { const pt = b.parts[i]; cell(pt.position.x, pt.position.y, pt.angle, col); }
          p.push(); p.translate(b.position.x, b.position.y); p.rotate(b.angle);
          const t = b.plugin.text; const disp = t.length > 6 ? t.slice(0, 6) + '…' : t;
          p.textSize(CELL * 0.42); p.textStyle(p.BOLD);
          p.fill(col === TYPE_COLORS.ask ? '#1A1613' : '#FFFDF6'); p.text(disp, 0, 0); p.pop();
        }
      }
      function drawBand() {
        p.noStroke(); p.fill(26, 22, 19, 16); p.rectMode(p.CORNER); p.rect(0, 0, W, BAND); p.rectMode(p.CENTER);
        p.stroke(122, 31, 31, 60); p.strokeWeight(1); p.drawingContext.setLineDash([5, 6]);
        p.line(0, BAND, W, BAND); p.drawingContext.setLineDash([]); p.noStroke();
      }
      function spawnCrystal(x, y, cat, texts, settled) {
        const r = isMobile() ? 16 : 20; const slotY = 34 + Math.random() * (BAND - 52);
        crystals.push({ x: settled ? (30 + Math.random() * (W - 60)) : x, y: settled ? slotY : y, tx: 30 + Math.random() * (W - 60), ty: slotY, cat, texts, r, phase: Math.random() * p.TWO_PI, settled: !!settled, _drawY: settled ? slotY : y });
      }
      function updateCrystals() {
        for (const c of crystals) {
          c.phase += 0.05;
          if (!c.settled) { c.x = p.lerp(c.x, c.tx, 0.06); c.y = p.lerp(c.y, c.ty, 0.06); if (Math.abs(c.x - c.tx) < 1 && Math.abs(c.y - c.ty) < 1) c.settled = true; }
          const yy = c.y + (c.settled ? Math.sin(c.phase) * 3 : 0);
          p.noStroke();
          for (let i = 3; i >= 1; i--) { const gc = p.color(c.cat.color); gc.setAlpha(26); p.fill(gc); p.circle(c.x, yy, c.r * 2 + i * 7); }
          p.fill(c.cat.color); p.circle(c.x, yy, c.r * 2);
          p.fill(255, 255, 255, 210); p.circle(c.x - c.r * 0.3, yy - c.r * 0.3, c.r * 0.5);
          p.fill('#FFFDF6'); p.textSize(c.r * 1.1); p.text('✦', c.x, yy + 1);
          c._drawY = yy;
        }
      }
      function sparkBurst(x, y, color) { if (REDUCED) return; for (let i = 0; i < 20; i++) { const a = p.random(p.TWO_PI), s = p.random(2, 7); sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, c: color, sz: p.random(4, 9) }); } }
      function drawSparks() {
        for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.x += s.vx; s.y += s.vy; s.vy += 0.12; s.life -= 0.03;
          p.noStroke(); const c = p.color(s.c); c.setAlpha(255 * Math.max(0, s.life)); p.fill(c);
          p.push(); p.translate(s.x, s.y); p.rotate(s.life * 6); p.rect(0, 0, s.sz, s.sz, 2); p.pop();
          if (s.life <= 0) sparks.splice(i, 1); }
      }
      function detectMatches() {
        const blocks = getBlocks(); if (blocks.length < 3) return;
        const parent = {}; const find = a => parent[a] === a ? a : (parent[a] = find(parent[a]));
        blocks.forEach(b => parent[b.id] = b.id);
        for (const pair of engine.pairs.list) {
          if (!pair.isActive) continue;
          const A = pair.bodyA.parent, B = pair.bodyB.parent;
          if (A === B) continue;
          if (!(A.plugin && A.plugin.isBlock) || !(B.plugin && B.plugin.isBlock)) continue;
          if (A.plugin.cat.id !== B.plugin.cat.id) continue;
          if (parent[A.id] === undefined || parent[B.id] === undefined) continue;
          parent[find(A.id)] = find(B.id);
        }
        const groups = {}; blocks.forEach(b => { const r = find(b.id); (groups[r] = groups[r] || []).push(b); });
        for (const k in groups) { const g = groups[k]; if (g.length >= 3) { mergeThree(g.slice(0, 3)); return; } }
      }
      function mergeThree(three) {
        const cat = three[0].plugin.cat; let cx = 0, cy = 0; const texts = [];
        three.forEach(b => { cx += b.position.x; cy += b.position.y; texts.push(b.plugin.text); });
        cx /= 3; cy /= 3; sparkBurst(cx, cy, cat.color);
        three.forEach(b => M.Composite.remove(world, b));
        spawnCrystal(cx, cy, cat, texts, false);
        score++; Brand.state.addScore(1); if (opts.onScore) opts.onScore(score); scheduleSave();
      }
      function handleHover() {
        const hits = M.Query.point(getBlocks(), { x: p.mouseX, y: p.mouseY });
        if (hits.length && p.mouseX > 0 && p.mouseX < W && p.mouseY > 0 && p.mouseY < H) {
          const b = hits[0].parent && hits[0].parent.plugin ? hits[0].parent : hits[0];
          tipEl.textContent = b.plugin.text;
          tipEl.style.left = Math.min(W - 160, p.mouseX + 12) + 'px';
          tipEl.style.top = Math.max(4, p.mouseY - 10) + 'px';
          tipEl.classList.add('is-show');
        } else tipEl.classList.remove('is-show');
      }
      p.mousePressed = () => {
        if (p.mouseX < 0 || p.mouseX > W || p.mouseY < 0 || p.mouseY > H) return;
        for (const c of crystals) { const yy = c._drawY || c.y; if (p.dist(p.mouseX, p.mouseY, c.x, yy) < c.r + 8) { openMindmap(c); return; } }
      };
      function addBlock(text, cat, o) {
        o = o || {}; const blocks = getBlocks();
        if (blocks.length >= MAXB) { let old = blocks[0]; blocks.forEach(b => { if (b.plugin.order < old.plugin.order) old = b; }); M.Composite.remove(world, old); }
        const cells = SHAPES[cat.shape] || SHAPES.S1; const f = field();
        const sx = o.x !== undefined ? o.x : p.random(f.left + 50, f.right - 50);
        const sy = o.y !== undefined ? o.y : (REDUCED ? f.bottom - 140 - Math.random() * 80 : BAND + 20);
        const parts = cells.map(cc => M.Bodies.rectangle(sx + cc[0] * CELL, sy + cc[1] * CELL, CELL * 0.94, CELL * 0.94, { chamfer: { radius: 7 } }));
        const body = M.Body.create({ parts, friction: 0.55, frictionStatic: 0.8, restitution: REDUCED ? 0 : 0.14, frictionAir: 0.02 });
        body.plugin = { isBlock: true, cat, text, order: orderSeq++ };
        M.Composite.add(world, body); return body;
      }
      function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(save, 400); }
      function save() { const posts = getBlocks().map(b => ({ t: b.plugin.text, c: b.plugin.cat.id })); const cr = crystals.map(c => ({ c: c.cat.id, t: c.texts })); Brand.state.saveGarden(posts, cr, score); }
      function restoreState() {
        const d = Brand.state.get();
        if ((!d.posts || !d.posts.length) && (!d.crystals || !d.crystals.length)) {
          SEED.forEach((t, i) => setTimeout(() => addBlock(t, classify(t)), REDUCED ? 0 : i * 170)); scheduleSave(); return;
        }
        (d.posts || []).forEach((pp, i) => setTimeout(() => addBlock(pp.t, catById(pp.c)), REDUCED ? 0 : i * 130));
        (d.crystals || []).forEach(cc => spawnCrystal(0, 0, catById(cc.c), cc.t, true));
      }
      function openMindmap(cr) {
        mmEl.innerHTML = ''; mmEl.classList.add('is-open');
        const cw = mmEl.clientWidth, ch = mmEl.clientHeight, cx = cw / 2, cy = ch / 2;
        const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'dg-mm__svg'); svg.setAttribute('width', cw); svg.setAttribute('height', ch); mmEl.appendChild(svg);
        const center = document.createElement('div'); center.className = 'dg-mm__center'; center.style.setProperty('--c', cr.cat.color); center.style.left = cx + 'px'; center.style.top = cy + 'px';
        center.innerHTML = `<span class="dg-mm__center-emo">🌱</span><b>${cr.cat.label}</b><small>思想結晶 · ${cr.texts.length} 則投稿</small>`; mmEl.appendChild(center);
        const n = cr.texts.length, R = Math.min(cw, ch) * 0.33;
        cr.texts.forEach((t, i) => {
          const a = -Math.PI / 2 + i * 2 * Math.PI / n, nx = cx + Math.cos(a) * R, ny = cy + Math.sin(a) * R;
          const line = document.createElementNS(NS, 'line'); line.setAttribute('x1', cx); line.setAttribute('y1', cy); line.setAttribute('x2', nx); line.setAttribute('y2', ny);
          line.setAttribute('class', 'dg-mm__line'); line.style.stroke = cr.cat.color; line.style.color = cr.cat.color;
          const len = Math.hypot(nx - cx, ny - cy); line.style.strokeDasharray = len; line.style.strokeDashoffset = REDUCED ? 0 : len; svg.appendChild(line);
          const bub = document.createElement('div'); bub.className = 'dg-mm__bubble'; bub.textContent = t; bub.style.setProperty('--c', cr.cat.color); bub.style.left = nx + 'px'; bub.style.top = ny + 'px'; mmEl.appendChild(bub);
          if (REDUCED) bub.style.transform = 'translate(-50%,-50%) scale(1)';
          else requestAnimationFrame(() => requestAnimationFrame(() => { line.style.strokeDashoffset = 0; bub.style.transform = 'translate(-50%,-50%) scale(1)'; }));
        });
        const hint = document.createElement('div'); hint.className = 'dg-mm__hint'; hint.textContent = '點空白處收合 ✕'; mmEl.appendChild(hint);
        mmEl.onclick = (e) => { if (e.target === mmEl || e.target === hint) { mmEl.classList.remove('is-open'); mmEl.innerHTML = ''; } };
      }
      p.windowResized = () => { W = stageEl.clientWidth; H = stageEl.clientHeight; BAND = Math.round(H * 0.26); p.resizeCanvas(W, H); buildWalls(); };
      // 對外
      p._api = {
        submit: (text) => { addBlock(text, classify(text)); scheduleSave(); },
        clear: () => { getBlocks().forEach(b => M.Composite.remove(world, b)); crystals = []; sparks = []; score = 0; Brand.state.saveGarden([], [], 0); if (opts.onScore) opts.onScore(0); SEED.forEach((t, i) => setTimeout(() => addBlock(t, classify(t)), REDUCED ? 0 : i * 120)); scheduleSave(); }
      };
    };

    const inst = Brand.onView(stageEl, () => sketch);
    formEl.addEventListener('submit', (e) => { e.preventDefault(); const v = inputEl.value.trim(); if (!v) return; if (inst._api) inst._api.submit(v); inputEl.value = ''; inputEl.placeholder = '再種一個卡關 🌱'; });
    clearBtn.addEventListener('click', () => { if (confirm('確定清空你的思辨牆？（會重新種一批預設方塊）') && inst._api) inst._api.clear(); });

    return { p5: inst, getScore: () => score, clear: () => inst._api && inst._api.clear() };
  };

  global.Brand = Brand;
})(window);
