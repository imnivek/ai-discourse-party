/* ============================================================
   AI 思辨派對 — 共用行為 brand.js  →  window.Brand
   依賴：p5.js 1.9.0（onView / 遊戲繪製）。已移除 Matter.js。
   ============================================================ */
(function (global) {
  'use strict';
  const Brand = {};
  const hasP5 = () => typeof global.p5 !== 'undefined';
  const isMobile = () => global.innerWidth < 720;
  const REDUCED = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 五型別色（與 brand.css 同步） */
  const TYPE_COLORS = { ask:'#E0A92E', listen:'#2F6DA8', debate:'#C0392B', build:'#4E9A4A', connect:'#7E5AA8' };
  Brand.colors = { red:'#7A1F1F', redBright:'#C0392B', ink:'#1A1613', paper:'#F3EEE2', ...TYPE_COLORS };

  /* ============================================================
     Brand.initChrome(active)  —  注入 nav + 手機漢堡面板 + footer
     ============================================================ */
  const NAV_ITEMS = [
    { key:'home', href:'index.html', label:'首頁' },
    { key:'topic', href:'topic-market.html', label:'議題園' },
    { key:'community', href:'community.html', label:'採集隊' },
    { key:'about', href:'about.html', label:'關於' }
  ];
  Brand.initChrome = function (active) {
    const links = NAV_ITEMS.map(i => `<a class="nav-link" data-key="${i.key}" href="${i.href}">${i.label}</a>`).join('');
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
      ${links}
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
          <a href="index.html">首頁</a><a href="topic-market.html">議題園</a>
          <a href="community.html">採集隊</a><a href="about.html">關於</a><a href="about.html#join">報名下一場</a>
        </nav>
        <div class="site-footer__copy">© 2026 AI DISCOURSE PARTY · 思辨小花園. ALL QUESTIONS RESERVED.</div>
      </div>
    </footer>`;
    document.body.insertAdjacentHTML('afterbegin', chrome);
    document.body.insertAdjacentHTML('beforeend', footer);
    if (active) document.querySelectorAll('.nav-link[data-key="' + active + '"]').forEach(l => l.classList.add('is-active'));
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
     Brand.state  —  localStorage 共用存檔（key: 'discourse_garden'）
     ============================================================ */
  const KEY = 'discourse_garden';
  Brand.state = {
    _read() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } },
    _write(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} },
    get() { const d = this._read(); return { score: d.score || 0, lines: d.lines || 0, unlocked: d.unlocked || [], posts: d.posts || [], crystals: d.crystals || [] }; },
    addScore(n = 1) { const d = this._read(); d.score = (d.score || 0) + n; this._write(d); return d.score; },
    unlock(type) { const d = this._read(); d.unlocked = d.unlocked || []; if (!d.unlocked.includes(type)) { d.unlocked.push(type); this._write(d); } return d.unlocked; },
    /** posts=議題池；lines 選填 */
    saveGarden(posts, crystals, score, lines) { const d = this._read(); d.posts = posts; d.crystals = crystals; if (score != null) d.score = score; if (lines != null) d.lines = lines; this._write(d); },
    reset() { try { localStorage.removeItem(KEY); } catch (e) {} }
  };

  /* ============================================================
     Brand.onView(el, sketchOrFactory)  —  進場才 loop、離場 noLoop
     ============================================================ */
  Brand.onView = function (el, sketchOrFactory) {
    if (!hasP5()) { console.warn('[Brand.onView] p5 未載入'); return null; }
    let sketch = sketchOrFactory;
    if (typeof sketchOrFactory === 'function' && sketchOrFactory.length === 0) {
      const r = sketchOrFactory(); if (typeof r === 'function') sketch = r;
    }
    const inst = new global.p5(sketch);
    const io = new IntersectionObserver((entries) => { entries[0].isIntersecting ? inst.loop() : inst.noLoop(); }, { threshold: 0.02 });
    io.observe(el);
    return inst;
  };

  /* ============================================================
     Brand.radar(ctx2d, values5, opts)  —  五軸雷達 helper
     ============================================================ */
  Brand.radar = function (ctx, values, opts) {
    opts = opts || {};
    const size = opts.size || 320, cx = size / 2, cy = size / 2, R = size * (opts.rScale || 0.30);
    const axes = opts.axes || ['vision', 'systems', 'depth', 'action', 'community'], n = values.length;
    const stroke = opts.stroke || '#7A1F1F', fill = opts.fill || 'rgba(122,31,31,0.14)';
    const dot = opts.dot || '#E0A92E', label = opts.label || '#5B5348', ring = opts.ring || 'rgba(90,80,65,0.28)';
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
    el.classList.add('mascot'); el.setAttribute('data-type', type);
    el.innerHTML = `<img src="assets/img/mascot-${type}.png" alt="${m.name}｜${type}" loading="lazy" draggable="false">`;
    return el;
  };

  /* ============================================================
     Brand.deliberationGame(mountEl, opts)  —  格狀俄羅斯方塊（Tetris）
     opts = { categories[], defaultCat, seed[], cols, rows, dropMs, onScore(fn), onLines(fn) }
     回傳 { p5, getScore(), getLines(), reset() }
     ============================================================ */
  const DEFAULT_CATEGORIES = [
    { id: 'anx',  label: '焦慮與心態', color: TYPE_COLORS.debate,  re: /怕|擔心|焦慮|淘汰|取代|不安|沒用|落後|來不及|恐懼|壓力/i },
    { id: 'tool', label: '工具與技術', color: TYPE_COLORS.listen,  re: /prompt|midjourney|chatgpt|gpt|claude|怎麼用|寫程式|工具|模型|api|自動化|coding|部署/i },
    { id: 'idea', label: '創意與應用', color: TYPE_COLORS.ask,     re: /點子|創作|企劃|發想|靈感|設計|內容|行銷|文案|品牌|影片/i },
    { id: 'eth',  label: '倫理與未來', color: TYPE_COLORS.build,   re: /版權|真實|人類|未來|價值|倫理|法規|道德|隱私|信任|責任/i }
  ];
  const DEFAULT_MISC = { id: 'misc', label: '待歸類', color: TYPE_COLORS.connect };
  const BUILTIN_POOL = [
    '好怕自己學不動被淘汰','AI 會不會取代我的工作','一直有種落後別人的焦慮','擔心自己變得沒有價值','來不及跟上更新速度','對未來感到不安',
    'prompt 一直寫不出想要的圖','想用 chatgpt 做工作流自動化','該學哪個工具才不會白學','怎麼用 claude 幫我寫程式','midjourney 參數好難調','想串 api 做自動化','模型太多不知道選哪個','怎麼部署自己的 AI 小工具',
    '沒靈感時能靠 AI 發想嗎','想做一個行銷文案產生器','用 AI 做設計會不會沒特色','想把點子變成企劃','AI 能幫我寫影片腳本嗎','怎麼做出有溫度的內容',
    'AI 生成的內容有版權嗎','AI 說的答案能相信嗎','未來人類還需要學畫畫嗎','誰為 AI 的錯負責','隱私資料會被拿去訓練嗎','真實與生成的界線在哪','AI 該有道德底線嗎','演算法在操控我的判斷嗎',
    '我到底該從哪裡開始','AI 讓我更懶還是更強','大家都在用我卻還沒跟上','想找人一起討論 AI','這一切會走向哪裡','如何不被資訊淹沒'
  ];
  /* 7 種標準 tetromino（矩陣） */
  const PIECES = {
    I: [[1,1,1,1]], O: [[1,1],[1,1]], T: [[1,1,1],[0,1,0]],
    S: [[0,1,1],[1,1,0]], Z: [[1,1,0],[0,1,1]], J: [[1,0,0],[1,1,1]], L: [[0,0,1],[1,1,1]]
  };
  const PKEYS = Object.keys(PIECES);
  const rot = (m) => { const R = m.length, C = m[0].length, o = []; for (let c = 0; c < C; c++) { o.push([]); for (let r = 0; r < R; r++) o[c][R - 1 - r] = m[r][c]; } return o; };

  Brand.deliberationGame = function (mountEl, opts) {
    opts = opts || {};
    if (!hasP5()) { console.warn('[Brand.deliberationGame] 需要 p5'); return null; }
    const CATS = opts.categories || DEFAULT_CATEGORIES;
    const DEF = opts.defaultCat || DEFAULT_MISC;
    const ALL = CATS.concat([DEF]);
    const POOL = opts.seed || BUILTIN_POOL;
    const COLS = opts.cols || 10;
    const ROWS = opts.rows || (isMobile() ? 16 : 18);
    const DROP_MS = opts.dropMs || (REDUCED ? 1100 : 720);
    const catById = (id) => ALL.find(c => c.id === id) || DEF;
    const classify = (t) => { for (const c of CATS) if (c.re.test(t)) return c; return DEF; };
    const mkItem = (t) => ({ t, c: classify(t).id });
    const randItem = () => mkItem(POOL[Math.floor(Math.random() * POOL.length)]);

    // ---- 注入 DOM ----
    mountEl.classList.add('dg');
    mountEl.innerHTML = `
      <div class="dg-wrap">
        <div class="dg-board-col">
          <div class="dg-current"></div>
          <div class="dg-canvas"></div>
          <div class="dg-overlay">
            <h4>堆到頂了！</h4><p>分數與已投入議題會保留</p>
            <button class="btn btn--primary dg-again" type="button">再玩一次 ↻</button>
          </div>
        </div>
        <aside class="dg-side">
          <div class="dg-panel"><div class="dg-stats">
            <div><div class="n dg-score">0</div><div class="l">SCORE 採集</div></div>
            <div><div class="n dg-lines">0</div><div class="l">LINES 消行</div></div>
          </div></div>
          <div class="dg-panel"><h5>NEXT 下一個</h5><div class="dg-nextgrid"></div></div>
          <div class="dg-panel"><h5>議題池 QUEUE</h5><div class="dg-queue"></div></div>
          <div class="dg-panel"><h5>類別</h5><div class="dg-legend"></div></div>
        </aside>
      </div>
      <div class="dg-controls">
        <button type="button" data-a="l" aria-label="左移">◀</button>
        <button type="button" data-a="rot" aria-label="旋轉">⟳</button>
        <button type="button" data-a="r" aria-label="右移">▶</button>
        <button type="button" data-a="soft" aria-label="軟降">▼</button>
        <button type="button" data-a="hard" class="hard" aria-label="硬降">⤓</button>
      </div>
      <div class="dg-inputrow">
        <form class="dg-inputbar" autocomplete="off">
          <input type="text" maxlength="40" placeholder="把你的 AI 卡關丟進來…">
          <button type="submit">投進議題池 🌱</button>
        </form>
      </div>`;
    const boardColEl = mountEl.querySelector('.dg-board-col');
    const canvasHost = mountEl.querySelector('.dg-canvas');
    const currentEl = mountEl.querySelector('.dg-current');
    const overlayEl = mountEl.querySelector('.dg-overlay');
    const scoreEl = mountEl.querySelector('.dg-score');
    const linesEl = mountEl.querySelector('.dg-lines');
    const nextGridEl = mountEl.querySelector('.dg-nextgrid');
    const queueEl = mountEl.querySelector('.dg-queue');
    const legendEl = mountEl.querySelector('.dg-legend');
    const formEl = mountEl.querySelector('.dg-inputbar');
    const inputEl = mountEl.querySelector('.dg-inputbar input');
    const againBtn = mountEl.querySelector('.dg-again');
    CATS.forEach(c => { const el = document.createElement('span'); el.className = 'dg-legend__chip'; el.innerHTML = `<i style="background:${c.color}"></i>${c.label}`; legendEl.appendChild(el); });
    for (let i = 0; i < 16; i++) nextGridEl.appendChild(document.createElement('i'));

    // ---- 遊戲狀態（deliberationGame 閉包，供 sketch 與 DOM 共用）----
    const st = Brand.state.get();
    let queue = (st.posts && st.posts.length) ? st.posts.slice() : shuffle(POOL.slice()).map(mkItem);
    let score = st.score || 0, lines = st.lines || 0;
    let grid, cur, nextP, gameOver = false, saveTimer = null, inView = true;

    function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
    function newGrid() { grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null)); }
    function takeItem() { const it = queue.length ? queue.shift() : randItem(); return it; }
    function makePiece() { const it = takeItem(); const key = PKEYS[Math.floor(Math.random() * PKEYS.length)]; return { mat: PIECES[key].map(r => r.slice()), cat: catById(it.c), item: it }; }
    function spawn() {
      cur = nextP || makePiece(); nextP = makePiece();
      cur.x = Math.floor((COLS - cur.mat[0].length) / 2); cur.y = 0;
      if (collide(cur.mat, cur.x, cur.y)) { gameOver = true; overlayEl.classList.add('is-show'); }
      renderNext(); renderQueue(); renderCurrent(); scheduleSave();
    }
    function collide(m, x, y) {
      for (let r = 0; r < m.length; r++) for (let c = 0; c < m[r].length; c++) {
        if (!m[r][c]) continue;
        const nr = y + r, nc = x + c;
        if (nc < 0 || nc >= COLS || nr >= ROWS) return true;
        if (nr >= 0 && grid[nr][nc]) return true;
      }
      return false;
    }

    // ---- DOM render ----
    function renderStats() { scoreEl.textContent = score; linesEl.textContent = lines; }
    function renderCurrent() { if (!cur) return; currentEl.innerHTML = `正在落下：<b>${esc(cur.item.t)}</b>　·　${cur.cat.label}`; }
    function renderNext() {
      const cells = nextGridEl.children; for (let i = 0; i < 16; i++) cells[i].style.background = '';
      if (!nextP) return; const m = nextP.mat, or = Math.floor((4 - m.length) / 2), oc = Math.floor((4 - m[0].length) / 2);
      for (let r = 0; r < m.length; r++) for (let c = 0; c < m[r].length; c++) if (m[r][c]) cells[(or + r) * 4 + (oc + c)].style.background = nextP.cat.color;
    }
    function renderQueue() {
      queueEl.innerHTML = '';
      const list = queue.slice(0, 6);
      if (!list.length) { queueEl.innerHTML = '<div class="dg-queue__item" style="color:var(--ink-soft)">（接下來為隨機思辨句）</div>'; return; }
      list.forEach(it => { const cat = catById(it.c); const d = document.createElement('div'); d.className = 'dg-queue__item'; d.innerHTML = `<i style="background:${cat.color}"></i>${esc(it.t)}`; queueEl.appendChild(d); });
    }
    function esc(s) { return String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m])); }
    function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(() => Brand.state.saveGarden(queue, [], score, lines), 350); }

    // ---- p5 sketch（盤面繪製 + 重力）----
    let api = {};
    const sketch = (p) => {
      let cs, boardW, boardH, acc = 0, sparks = [];
      function compute() {
        const availW = boardColEl.clientWidth;
        const availH = global.innerHeight * (isMobile() ? 0.5 : 0.6);
        cs = Math.max(14, Math.floor(Math.min(availW / COLS, availH / ROWS)));
        boardW = cs * COLS; boardH = cs * ROWS;
      }
      p.setup = () => {
        compute(); const c = p.createCanvas(boardW, boardH); c.parent(canvasHost);
        p.pixelDensity(Math.min(global.devicePixelRatio || 1, 1.5));
        p.textFont('Instrument Sans'); p.textAlign(p.CENTER, p.CENTER);
        newGrid(); nextP = makePiece(); spawn(); renderStats();
        bindTouch(c.elt);
        const io = new IntersectionObserver(e => { inView = e[0].isIntersecting; }, { threshold: 0.15 });
        io.observe(boardColEl);
      };
      p.draw = () => {
        p.clear(); p.background('#FBF6E9');
        drawGridLines(); drawSettled(); drawGhost(); drawPiece(); drawSparks();
        if (!gameOver) { acc += p.deltaTime; if (acc >= DROP_MS) { acc = 0; step(); } }
      };
      function px(c) { return c * cs; }
      function drawGridLines() { p.stroke(216, 207, 189, 90); p.strokeWeight(1); for (let c = 1; c < COLS; c++) p.line(px(c), 0, px(c), boardH); for (let r = 1; r < ROWS; r++) p.line(0, px(r), boardW, px(r)); }
      function block(c, r, col, a) { p.noStroke(); const cc = p.color(col); if (a != null) cc.setAlpha(a); p.fill(cc); p.rect(px(c) + 1, px(r) + 1, cs - 2, cs - 2, Math.max(3, cs * 0.18)); p.fill(255, 255, 255, (a != null ? a * 0.22 : 45)); p.rect(px(c) + cs * 0.18, px(r) + cs * 0.16, cs * 0.4, cs * 0.28, 3); }
      function drawSettled() { for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (grid[r][c]) block(c, r, grid[r][c]); }
      function drawPiece() {
        if (!cur) return; const m = cur.mat;
        for (let r = 0; r < m.length; r++) for (let c = 0; c < m[r].length; c++) if (m[r][c] && cur.y + r >= 0) block(cur.x + c, cur.y + r, cur.cat.color);
        // 方塊小標籤（類別）
        p.noStroke(); p.fill(cur.cat.color === TYPE_COLORS.ask ? '#1A1613' : '#FFFDF6');
        p.textSize(Math.max(9, cs * 0.42)); p.textStyle(p.BOLD);
        const cxp = (cur.x + m[0].length / 2) * cs, cyp = (cur.y + m.length / 2) * cs;
        if (cur.y >= 0) p.text(cur.cat.label.slice(0, 2), cxp, cyp);
      }
      function drawGhost() {
        if (!cur) return; let gy = cur.y; while (!collide(cur.mat, cur.x, gy + 1)) gy++;
        const m = cur.mat; p.noFill(); p.stroke(26, 22, 19, 60); p.strokeWeight(1.5);
        for (let r = 0; r < m.length; r++) for (let c = 0; c < m[r].length; c++) if (m[r][c] && gy + r >= 0) p.rect(px(cur.x + c) + 2, px(gy + r) + 2, cs - 4, cs - 4, cs * 0.16);
      }
      function drawSparks() { for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.x += s.vx; s.y += s.vy; s.vy += 0.15; s.life -= 0.035; p.noStroke(); const cc = p.color(s.c); cc.setAlpha(255 * Math.max(0, s.life)); p.fill(cc); p.push(); p.translate(s.x, s.y); p.rotate(s.life * 6); p.rect(0, 0, s.sz, s.sz, 2); p.pop(); if (s.life <= 0) sparks.splice(i, 1); } }
      function spark(row, colr) { if (REDUCED) return; for (let c = 0; c < COLS; c++) for (let k = 0; k < 2; k++) { const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 4; sparks.push({ x: px(c) + cs / 2, y: px(row) + cs / 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1, life: 1, c: colr, sz: 3 + Math.random() * 5 }); } }
      // ---- 邏輯 ----
      function lockPiece() {
        const m = cur.mat; let topped = false;
        for (let r = 0; r < m.length; r++) for (let c = 0; c < m[r].length; c++) if (m[r][c]) { const nr = cur.y + r, nc = cur.x + c; if (nr < 0) topped = true; else grid[nr][nc] = cur.cat.color; }
        clearLines();
        if (topped) { gameOver = true; overlayEl.classList.add('is-show'); return; }
        spawn();
      }
      function clearLines() {
        let cleared = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
          if (grid[r].every(x => x)) { spark(r, grid[r][0] || TYPE_COLORS.ask); grid.splice(r, 1); grid.unshift(Array(COLS).fill(null)); cleared++; r++; }
        }
        if (cleared > 0) { lines += cleared; score = Brand.state.addScore(cleared); renderStats(); if (opts.onScore) opts.onScore(score); if (opts.onLines) opts.onLines(lines); scheduleSave(); }
      }
      function step() { if (!collide(cur.mat, cur.x, cur.y + 1)) cur.y++; else lockPiece(); }
      // 對外操作
      api.move = (d) => { if (gameOver || !cur) return; if (!collide(cur.mat, cur.x + d, cur.y)) cur.x += d; };
      api.rotate = () => { if (gameOver || !cur) return; const nm = rot(cur.mat); for (const k of [0, -1, 1, -2, 2]) if (!collide(nm, cur.x + k, cur.y)) { cur.mat = nm; cur.x += k; return; } };
      api.soft = () => { if (gameOver || !cur) return; acc = 0; step(); };
      api.hard = () => { if (gameOver || !cur) return; while (!collide(cur.mat, cur.x, cur.y + 1)) cur.y++; lockPiece(); };
      api.reset = () => { newGrid(); sparks = []; gameOver = false; overlayEl.classList.remove('is-show'); nextP = makePiece(); spawn(); };
      p.windowResized = () => { compute(); p.resizeCanvas(boardW, boardH); };
      // ---- 觸控：滑動移動 / 點擊旋轉 / 下滑硬降 ----
      function bindTouch(el) {
        let sx = 0, sy = 0, lx = 0, moved = false;
        el.addEventListener('touchstart', (e) => { const t = e.touches[0]; sx = lx = t.clientX; sy = t.clientY; moved = false; }, { passive: true });
        el.addEventListener('touchmove', (e) => { const t = e.touches[0]; const dx = t.clientX - lx; if (Math.abs(dx) > cs) { api.move(dx > 0 ? 1 : -1); lx = t.clientX; moved = true; e.preventDefault(); } }, { passive: false });
        el.addEventListener('touchend', (e) => { const t = e.changedTouches[0]; const dx = t.clientX - sx, dy = t.clientY - sy; if (!moved) { if (dy > 46 && dy > Math.abs(dx)) api.hard(); else api.rotate(); } else if (dy > 60 && dy > Math.abs(dx)) api.hard(); }, { passive: true });
      }
    };

    const inst = Brand.onView(boardColEl, () => sketch);

    // ---- DOM 控制：鍵盤 / 按鈕 / 投稿 / 再玩 ----
    function act(a) { if (a === 'l') api.move && api.move(-1); else if (a === 'r') api.move && api.move(1); else if (a === 'rot') api.rotate && api.rotate(); else if (a === 'soft') api.soft && api.soft(); else if (a === 'hard') api.hard && api.hard(); }
    mountEl.querySelectorAll('.dg-controls button').forEach(b => b.addEventListener('click', () => act(b.dataset.a)));
    global.addEventListener('keydown', (e) => {
      if (!inView || gameOver) return;
      if (document.activeElement === inputEl) return;
      const K = { ArrowLeft: 'l', ArrowRight: 'r', ArrowUp: 'rot', ArrowDown: 'soft', ' ': 'hard' };
      if (K[e.key]) { e.preventDefault(); act(K[e.key]); }
    });
    formEl.addEventListener('submit', (e) => {
      e.preventDefault(); const v = inputEl.value.trim(); if (!v) return;
      queue.push(mkItem(v)); renderQueue(); scheduleSave();
      inputEl.value = ''; inputEl.placeholder = '已投進議題池，接下來會落下 🌱';
    });
    againBtn.addEventListener('click', () => { if (api.reset) api.reset(); });

    return { p5: inst, getScore: () => score, getLines: () => lines, reset: () => api.reset && api.reset() };
  };

  global.Brand = Brand;
})(window);
