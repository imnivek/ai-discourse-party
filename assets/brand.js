/* ============================================================
   AI 思辨派對 — 共用行為 brand.js  →  window.Brand
   依賴：p5.js 1.9.0（onView / 遊戲）、matter-js 0.19.0（deliberationGame）。
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
     Brand.initChrome(active)  —  注入 nav + 手機漢堡面板 + footer
     active ∈ 'home' | 'topic' | 'community' | 'about'
     ============================================================ */
  const NAV_ITEMS = [
    { key:'home', href:'index.html', label:'首頁' },
    { key:'topic', href:'topic-market.html', label:'議題園' },
    { key:'community', href:'community.html', label:'採集隊' },
    { key:'about', href:'about.html', label:'關於' }
  ];
  Brand.initChrome = function (active) {
    const links = NAV_ITEMS.map(i => `<a class="nav-link" data-key="${i.key}" href="${i.href}">${i.label}</a>`).join('');
    const panelLinks = NAV_ITEMS.map(i => `<a class="nav-link" data-key="${i.key}" href="${i.href}">${i.label}</a>`).join('');
    const chrome = `
    <header class="site-nav">
      <a class="site-nav__logo" href="index.html"><span class="site-nav__leaf">🌱</span>AI 思辨派對</a>
      <nav class="site-nav__links">
        ${links}
        <a class="nav-cta" href="about.html#join">報名下一場</a>
      </nav>
      <button class="site-nav__burger" type="button" aria-label="開啟選單" aria-expanded="false" aria-controls="siteNavPanel">
        <span></span><span></span><span></span>
      </button>
    </header>
    <div class="site-nav__panel" id="siteNavPanel">
      ${panelLinks}
      <a class="nav-cta" href="about.html#join">報名下一場</a>
    </div>`;
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
    document.body.insertAdjacentHTML('afterbegin', chrome);
    document.body.insertAdjacentHTML('beforeend', footer);
    if (active) {
      document.querySelectorAll('.nav-link[data-key="' + active + '"]').forEach(l => l.classList.add('is-active'));
    }
    // 漢堡互動
    const burger = document.querySelector('.site-nav__burger');
    const panel = document.getElementById('siteNavPanel');
    if (burger && panel) {
      const setOpen = (open) => {
        panel.classList.toggle('is-open', open);
        burger.classList.toggle('is-open', open);
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
        document.body.style.overflow = open ? 'hidden' : '';
      };
      burger.addEventListener('click', () => setOpen(!panel.classList.contains('is-open')));
      panel.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setOpen(false)));
      global.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
    }
  };

  /* ============================================================
     Brand.state  —  localStorage 共用存檔
     key: 'discourse_garden'
     ============================================================ */
  const KEY = 'discourse_garden';
  Brand.state = {
    _read() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } },
    _write(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} },
    get() { const d = this._read(); return { score: d.score || 0, unlocked: d.unlocked || [], posts: d.posts || [], crystals: d.crystals || [] }; },
    addScore(n = 1) { const d = this._read(); d.score = (d.score || 0) + n; this._write(d); return d.score; },
    unlock(type) { const d = this._read(); d.unlocked = d.unlocked || []; if (!d.unlocked.includes(type)) { d.unlocked.push(type); this._write(d); } return d.unlocked; },
    saveGarden(posts, crystals, score) { const d = this._read(); d.posts = posts; d.crystals = crystals; if (score != null) d.score = score; this._write(d); },
    reset() { try { localStorage.removeItem(KEY); } catch (e) {} }
  };

  /* ============================================================
     Brand.onView(el, sketchOrFactory)
     el 進入視窗才 p5 loop、離開 noLoop。回傳 p5 instance。
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
     Brand.radar(ctx2d, values5, opts)  —  五軸雷達繪製 helper
     opts = { size, axes[], stroke, fill, dot, label, ring, rScale, showLabels }
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
    ctx.lineWidth = 1; ctx.strokeStyle = ring;
    for (let g = 1; g <= 3; g++) { ctx.beginPath(); for (let i = 0; i < n; i++) { const [x, y] = pt(i, R * g / 3); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath(); ctx.stroke(); }
    for (let i = 0; i < n; i++) { const [x, y] = pt(i, R); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke(); }
    ctx.beginPath(); for (let i = 0; i < n; i++) { const [x, y] = pt(i, R * values[i]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath();
    ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = stroke; ctx.stroke();
    ctx.fillStyle = dot; for (let i = 0; i < n; i++) { const [x, y] = pt(i, R * values[i]); ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); }
    if (opts.showLabels !== false) {
      ctx.fillStyle = label; ctx.font = '600 ' + Math.max(9, size * 0.04) + "px 'IBM Plex Mono', monospace";
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let i = 0; i < n; i++) { const [x, y] = pt(i, R + size * 0.07); ctx.fillText(String(axes[i]).toUpperCase(), x, y); }
    }
    ctx.restore();
  };

  /* ============================================================
     Brand.mascot(el, type)  —  注入真實去背公仔圖
     type ∈ 'ask' | 'listen' | 'debate' | 'build' | 'connect'
     待機動畫由 brand.css 的 .mascot img 提供（尊重 reduced-motion）
     ============================================================ */
  const MASCOT_META = {
    ask:     { color: TYPE_COLORS.ask,     name: '問問', tag: 'ASK · 提問者' },
    listen:  { color: TYPE_COLORS.listen,  name: '聽聽', tag: 'LISTEN · 傾聽者' },
    debate:  { color: TYPE_COLORS.debate,  name: '辨辨', tag: 'DEBATE · 思辨者' },
    build:   { color: TYPE_COLORS.build,   name: '做做', tag: 'BUILD · 實作者' },
    connect: { color: TYPE_COLORS.connect, name: '連連', tag: 'CONNECT · 連結者' }
  };
  Brand.mascotMeta = MASCOT_META;

  Brand.mascot = function (el, type) {
    if (!el) return;
    const m = MASCOT_META[type] || MASCOT_META.ask;
    el.classList.add('mascot');
    el.setAttribute('data-type', type);
    el.innerHTML = `<img src="assets/img/mascot-${type}.png" alt="${m.name}｜${type}" loading="lazy" draggable="false">`;
    return el;
  };

  /* ============================================================
     Brand.deliberationGame(mountEl, opts)  —  思辨方塊遊戲
     opts = { categories[], defaultCat, seed[], maxBlocks, builtinCount, onScore(fn) }
     回傳 { p5, getScore(), clear() }
     ============================================================ */
  const DEFAULT_CATEGORIES = [
    { id: 'anx',  label: '焦慮與心態', color: TYPE_COLORS.debate,  re: /怕|擔心|焦慮|淘汰|取代|不安|沒用|落後|來不及|恐懼|壓力/i },
    { id: 'tool', label: '工具與技術', color: TYPE_COLORS.listen,  re: /prompt|midjourney|chatgpt|gpt|claude|怎麼用|寫程式|工具|模型|api|自動化|coding|部署/i },
    { id: 'idea', label: '創意與應用', color: TYPE_COLORS.ask,     re: /點子|創作|企劃|發想|靈感|設計|內容|行銷|文案|品牌|影片/i },
    { id: 'eth',  label: '倫理與未來', color: TYPE_COLORS.build,   re: /版權|真實|人類|未來|價值|倫理|法規|道德|隱私|信任|責任/i }
  ];
  const DEFAULT_MISC = { id: 'misc', label: '待歸類', color: TYPE_COLORS.connect };

  /* 內建方塊池（取樣自各類別，可自由增修）*/
  const BUILTIN_POOL = [
    // 焦慮與心態
    '好怕自己學不動被淘汰','AI 會不會取代我的工作','一直有種落後別人的焦慮','擔心自己變得沒有價值','來不及跟上更新速度','對未來感到不安',
    // 工具與技術
    'prompt 一直寫不出想要的圖','想用 chatgpt 做工作流自動化','該學哪個工具才不會白學','怎麼用 claude 幫我寫程式','midjourney 參數好難調','想串 api 做自動化','模型太多不知道選哪個','怎麼部署自己的 AI 小工具','coding 全靠 AI 會不會退化',
    // 創意與應用
    '沒靈感時能靠 AI 發想嗎','想做一個行銷文案產生器','用 AI 做設計會不會沒特色','想把點子變成企劃','AI 能幫我寫影片腳本嗎','怎麼做出有溫度的內容','想用 AI 經營自媒體品牌',
    // 倫理與未來
    'AI 生成的內容有版權嗎','AI 說的答案能相信嗎','未來人類還需要學畫畫嗎','誰為 AI 的錯負責','隱私資料會被拿去訓練嗎','真實與生成的界線在哪','AI 該有道德底線嗎','演算法在操控我的判斷嗎',
    // 綜合 / 待歸類
    '我到底該從哪裡開始','AI 讓我更懶還是更強','大家都在用我卻還沒跟上','想找人一起討論 AI','這一切會走向哪裡','如何不被資訊淹沒','AI 時代還要不要念大學','我想保留一點不被自動化的東西'
  ];

  /* 正規 tetromino（cell 佈局），三消以「顏色/類別」判定，形狀為視覺變化 */
  const SHAPES = {
    I: [[0,0],[1,0],[2,0],[3,0]],
    O: [[0,0],[1,0],[0,1],[1,1]],
    T: [[0,0],[1,0],[2,0],[1,1]],
    L: [[0,0],[0,1],[0,2],[1,2]],
    J: [[1,0],[1,1],[1,2],[0,2]],
    S: [[1,0],[2,0],[0,1],[1,1]],
    Z: [[0,0],[1,0],[1,1],[2,1]]
  };
  const TETROMINOES = ['I','O','T','L','J','S','Z'];
  const randomShape = () => TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)];

  Brand.deliberationGame = function (mountEl, opts) {
    opts = opts || {};
    if (!hasP5() || !hasMatter()) { console.warn('[Brand.deliberationGame] 需要 p5 與 matter-js'); return null; }
    const CATS = opts.categories || DEFAULT_CATEGORIES;
    const DEF = opts.defaultCat || DEFAULT_MISC;
    const ALL = CATS.concat([DEF]);
    const SEED = opts.seed || BUILTIN_POOL;
    const MAXB = opts.maxBlocks || (isMobile() ? 40 : 70);
    const BUILTIN_COUNT = opts.builtinCount || (isMobile() ? 18 : 36);
    const SPAWN_INTERVAL = 120;
    const catById = (id) => ALL.find(c => c.id === id) || DEF;
    const classify = (t) => { for (const c of CATS) if (c.re.test(t)) return c; return DEF; };
    const M = global.Matter;
    const NS = 'http://www.w3.org/2000/svg';

    // ---- 注入 DOM（HUD/圖例/清空在專屬頂列；輸入在專屬底列，皆高於 canvas）----
    mountEl.classList.add('dg');
    mountEl.innerHTML = `
      <div class="dg-stage">
        <div class="dg-topbar">
          <span class="dg-band-label">✦ 星空檔案庫 · 思想結晶漂浮區</span>
          <div class="dg-hud">
            <div class="dg-legend"></div>
            <button class="dg-clear" type="button">🧹 清空</button>
          </div>
        </div>
        <div class="dg-canvas"></div>
        <div class="dg-tip"></div>
        <div class="dg-mindmap"></div>
        <div class="dg-inputrow">
          <form class="dg-inputbar" autocomplete="off">
            <input type="text" maxlength="40" placeholder="把你的 AI 卡關丟進來…">
            <button type="submit">種下去 🌱</button>
          </form>
        </div>
      </div>`;
    const stageEl = mountEl.querySelector('.dg-stage');
    const topbarEl = mountEl.querySelector('.dg-topbar');
    const canvasHost = mountEl.querySelector('.dg-canvas');
    const tipEl = mountEl.querySelector('.dg-tip');
    const mmEl = mountEl.querySelector('.dg-mindmap');
    const legendEl = mountEl.querySelector('.dg-legend');
    const inputRowEl = mountEl.querySelector('.dg-inputrow');
    const formEl = mountEl.querySelector('.dg-inputbar');
    const inputEl = mountEl.querySelector('.dg-inputbar input');
    const clearBtn = mountEl.querySelector('.dg-clear');
    CATS.forEach(c => { const el = document.createElement('span'); el.className = 'dg-legend__chip'; el.innerHTML = `<i style="background:${c.color}"></i>${c.label}`; legendEl.appendChild(el); });

    let score = Brand.state.get().score || 0;

    const sketch = (p) => {
      let engine, world, mouse, mc, W, H, CELL, BAND, playBottom;
      let walls = [], crystals = [], sparks = [], orderSeq = 0, frameC = 0, saveTimer = null;
      const getBlocks = () => M.Composite.allBodies(world).filter(b => b.plugin && b.plugin.isBlock);
      const inputH = () => (inputRowEl && inputRowEl.offsetHeight) || (isMobile() ? 58 : 64);
      const field = () => ({ left: 14, right: W - 14, bottom: playBottom, top: BAND });

      function computeBounds() { BAND = Math.round(H * 0.24); playBottom = H - inputH(); }
      function buildWalls() {
        walls.forEach(w => M.Composite.remove(world, w)); walls = [];
        const o = { isStatic: true, restitution: 0.1, friction: 0.6 };
        walls.push(M.Bodies.rectangle(W / 2, playBottom + 30, W * 1.5, 60, o)); // 地板：輸入列上緣之上
        walls.push(M.Bodies.rectangle(-30, H / 2, 60, H * 2, o));
        walls.push(M.Bodies.rectangle(W + 30, H / 2, 60, H * 2, o));
        M.Composite.add(world, walls);
      }

      p.setup = () => {
        W = stageEl.clientWidth; H = stageEl.clientHeight;
        CELL = isMobile() ? 17 : 24; computeBounds();
        const c = p.createCanvas(W, H); c.parent(canvasHost);
        p.pixelDensity(1);
        p.textFont('Instrument Sans'); p.textAlign(p.CENTER, p.CENTER); p.rectMode(p.CENTER);
        engine = M.Engine.create(); world = engine.world; engine.gravity.y = REDUCED ? 0.35 : 1;
        buildWalls();
        mouse = M.Mouse.create(c.elt); mouse.pixelRatio = 1;
        mc = M.MouseConstraint.create(engine, { mouse, constraint: { stiffness: 0.18, render: { visible: false } } });
        M.Composite.add(world, mc);
        setupTouch(c.elt);
        restoreState();
      };

      /* 觸控：放行頁面捲動，只有起點在方塊上才攔截拖曳 */
      function setupTouch(el) {
        try {
          el.removeEventListener('wheel', mouse.mousewheel);
          el.removeEventListener('mousewheel', mouse.mousewheel);
          el.removeEventListener('DOMMouseScroll', mouse.mousewheel);
        } catch (e) {}
        try {
          el.removeEventListener('touchstart', mouse.mousedown);
          el.removeEventListener('touchmove', mouse.mousemove);
          el.removeEventListener('touchend', mouse.mouseup);
        } catch (e) {}
        let dragging = false;
        el.addEventListener('touchstart', (e) => {
          const r = el.getBoundingClientRect(), t = e.touches[0];
          const x = t.clientX - r.left, y = t.clientY - r.top;
          if (M.Query.point(getBlocks(), { x, y }).length) { dragging = true; mouse.mousedown(e); }
          else dragging = false;
        }, { passive: false });
        el.addEventListener('touchmove', (e) => { if (dragging) mouse.mousemove(e); }, { passive: false });
        el.addEventListener('touchend', (e) => { if (dragging) mouse.mouseup(e); dragging = false; }, { passive: false });
      }

      p.draw = () => {
        M.Engine.update(engine, 1000 / 60);
        p.clear();
        drawGround(); drawBlocks(); drawBand(); updateCrystals(); drawSparks();
        frameC++; if (frameC % 7 === 0) detectMatches();
        handleHover();
      };

      function drawGround() {
        p.noStroke(); p.fill('#E4D3A8'); p.rectMode(p.CORNER); p.rect(0, playBottom - 12, W, 12); p.rectMode(p.CENTER);
        p.stroke('#8FAF63'); p.strokeWeight(2);
        for (let x = 12; x < W; x += 34) { p.line(x, playBottom - 12, x - 4, playBottom - 20); p.line(x, playBottom - 12, x, playBottom - 23); p.line(x, playBottom - 12, x + 4, playBottom - 20); }
        p.noStroke();
      }
      function cell(x, y, ang, col) {
        p.push(); p.translate(x, y); p.rotate(ang);
        p.fill(col); p.noStroke(); p.rect(0, 0, CELL * 0.98, CELL * 0.98, 6);
        p.fill(255, 255, 255, 50); p.rect(-CELL * 0.16, -CELL * 0.18, CELL * 0.42, CELL * 0.3, 4);
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
        p.noStroke(); p.fill(26, 22, 19, 14); p.rectMode(p.CORNER); p.rect(0, 0, W, BAND); p.rectMode(p.CENTER);
        p.stroke(122, 31, 31, 55); p.strokeWeight(1); p.drawingContext.setLineDash([5, 6]);
        p.line(0, BAND, W, BAND); p.drawingContext.setLineDash([]); p.noStroke();
      }
      function spawnCrystal(x, y, cat, texts, settled) {
        const r = isMobile() ? 15 : 19; const slotY = 30 + Math.random() * (BAND - 46);
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
        const cells = SHAPES[o.shape] || SHAPES[randomShape()];
        const f = field();
        const sx = o.x !== undefined ? o.x : p.random(f.left + 40, f.right - 40);
        const sy = o.y !== undefined ? o.y : (REDUCED ? f.bottom - 150 - Math.random() * 120 : -30 - Math.random() * 90);
        const parts = cells.map(cc => M.Bodies.rectangle(sx + cc[0] * CELL, sy + cc[1] * CELL, CELL * 0.94, CELL * 0.94, { chamfer: { radius: 6 } }));
        const body = M.Body.create({ parts, friction: 0.55, frictionStatic: 0.8, restitution: REDUCED ? 0 : 0.14, frictionAir: 0.02 });
        body.plugin = { isBlock: true, cat, text, order: orderSeq++ };
        M.Composite.add(world, body); return body;
      }
      function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(save, 400); }
      function save() { const posts = getBlocks().map(b => ({ t: b.plugin.text, c: b.plugin.cat.id })); const cr = crystals.map(c => ({ c: c.cat.id, t: c.texts })); Brand.state.saveGarden(posts, cr, score); }
      function seedBuiltins() {
        const pool = SEED.slice();
        for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp; }
        const count = Math.min(BUILTIN_COUNT, pool.length);
        for (let i = 0; i < count; i++) { const t = pool[i]; setTimeout(() => addBlock(t, classify(t)), REDUCED ? 0 : i * SPAWN_INTERVAL); }
      }
      function restoreState() {
        const d = Brand.state.get();
        if ((!d.posts || !d.posts.length) && (!d.crystals || !d.crystals.length)) { seedBuiltins(); scheduleSave(); return; }
        (d.posts || []).forEach((pp, i) => setTimeout(() => addBlock(pp.t, catById(pp.c)), REDUCED ? 0 : i * 90));
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
      p.windowResized = () => {
        W = stageEl.clientWidth; H = stageEl.clientHeight; CELL = isMobile() ? 17 : 24;
        computeBounds(); p.resizeCanvas(W, H); buildWalls();
      };
      p._api = {
        submit: (text) => { addBlock(text, classify(text)); scheduleSave(); },
        clear: () => { getBlocks().forEach(b => M.Composite.remove(world, b)); crystals = []; sparks = []; score = 0; Brand.state.saveGarden([], [], 0); if (opts.onScore) opts.onScore(0); seedBuiltins(); scheduleSave(); }
      };
    };

    const inst = Brand.onView(stageEl, () => sketch);
    formEl.addEventListener('submit', (e) => { e.preventDefault(); const v = inputEl.value.trim(); if (!v) return; if (inst._api) inst._api.submit(v); inputEl.value = ''; inputEl.placeholder = '再種一個卡關 🌱'; });
    clearBtn.addEventListener('click', () => { if (confirm('確定清空你的思辨牆？（會重新種一批內建方塊）') && inst._api) inst._api.clear(); });

    return { p5: inst, getScore: () => score, clear: () => inst._api && inst._api.clear() };
  };

  global.Brand = Brand;
})(window);
