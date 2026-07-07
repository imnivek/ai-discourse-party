/* ============================================================
   AI 思辨派對 — 共用行為 brand.js  →  window.Brand
   依賴：p5.js 1.9.0（onView / 遊戲繪製）。無 Matter.js。
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
     Brand.deliberationGame(mountEl, opts)  —  2D 卷軸議題收集遊戲（選角）
     opts = { seed[], target, onScore(fn), onLines(fn) }
     回傳 { p5, getScore(), getLines(), reset() }（保留簽名相容）
     ============================================================ */
  const BUILTIN_POOL = [
    '好怕自己學不動被淘汰','AI 會不會取代我的工作','一直有種落後別人的焦慮','擔心自己變得沒有價值','來不及跟上更新速度','對未來感到不安',
    'prompt 一直寫不出想要的圖','想用 chatgpt 做工作流自動化','該學哪個工具才不會白學','怎麼用 claude 幫我寫程式','midjourney 參數好難調','想串 api 做自動化','模型太多不知道選哪個','怎麼部署自己的 AI 小工具',
    '沒靈感時能靠 AI 發想嗎','想做一個行銷文案產生器','用 AI 做設計會不會沒特色','想把點子變成企劃','AI 能幫我寫影片腳本嗎','怎麼做出有溫度的內容',
    'AI 生成的內容有版權嗎','AI 說的答案能相信嗎','未來人類還需要學畫畫嗎','誰為 AI 的錯負責','隱私資料會被拿去訓練嗎','真實與生成的界線在哪','AI 該有道德底線嗎','演算法在操控我的判斷嗎',
    '我到底該從哪裡開始','AI 讓我更懶還是更強','大家都在用我卻還沒跟上','想找人一起討論 AI','這一切會走向哪裡','如何不被資訊淹沒'
  ];
  const ELEM_TYPES = ['ask', 'listen', 'debate', 'build', 'connect'];
  const BEASTS = {
    ask:     { name: '問問獸', want: '問題種子' },
    listen:  { name: '聽聽獸', want: '觀點水滴' },
    debate:  { name: '辨辨獸', want: '辯證碎片' },
    build:   { name: '做做獸', want: '行動齒輪' },
    connect: { name: '連連獸', want: '連結節點' }
  };
  const colorOf = (t) => TYPE_COLORS[t] || '#7A1F1F';

  Brand.deliberationGame = function (mountEl, opts) {
    opts = opts || {};
    if (!hasP5()) { console.warn('[Brand.deliberationGame] 需要 p5'); return null; }
    const POOL = opts.seed || BUILTIN_POOL;
    const BASE_TARGET = opts.target || (isMobile() ? 6 : 8);
    const randType = () => ELEM_TYPES[Math.floor(Math.random() * ELEM_TYPES.length)];
    const randSentence = () => POOL[Math.floor(Math.random() * POOL.length)];
    const esc = (s) => String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
    const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };

    // ---- DOM ----
    mountEl.classList.add('dg', 'dg2');
    mountEl.innerHTML = `
      <div class="dg2-stage">
        <div class="dg2-canvas"></div>
        <div class="dg2-hud">
          <img class="dg2-hud__ava" alt="" style="display:none">
          <div class="dg2-hud__mission"><span class="dg2-hud__task">選擇你的採集獸 →</span><div class="dg2-hud__bar"><i></i></div></div>
          <div class="dg2-hud__score"><div class="n">0</div><small>採集分數</small></div>
        </div>
        <div class="dg2-float"></div>
        <div class="dg2-ctrl">
          <button class="dg2-btn" type="button" data-a="up" aria-label="上移">▲</button>
          <button class="dg2-btn" type="button" data-a="down" aria-label="下移">▼</button>
        </div>
        <div class="dg2-select is-show">
          <div class="dg2-select__title">選一隻採集獸進場 🌱</div>
          <div class="dg2-cards"></div>
        </div>
        <div class="dg2-done">
          <h4>任務完成 ✦</h4><p class="dg2-done__msg"></p>
          <div class="dg2-done__btns">
            <button class="btn btn--primary" type="button" data-a="next">下一波 →</button>
            <button class="btn btn--ghost" type="button" data-a="swap">換一隻獸</button>
          </div>
        </div>
      </div>
      <div class="dg2-side">
        <h5>已收集 · 議題池</h5>
        <div class="dg2-list"></div>
      </div>
      <div class="dg2-inputrow">
        <form class="dg2-inputbar" autocomplete="off">
          <input type="text" maxlength="40" placeholder="把你的 AI 卡關丟進來，變成金色元素飛入場…">
          <button type="submit">投進場中 🌟</button>
        </form>
      </div>`;
    const stageEl = mountEl.querySelector('.dg2-stage');
    const canvasHost = mountEl.querySelector('.dg2-canvas');
    const avaEl = mountEl.querySelector('.dg2-hud__ava');
    const taskEl = mountEl.querySelector('.dg2-hud__task');
    const barEl = mountEl.querySelector('.dg2-hud__bar i');
    const scoreEl = mountEl.querySelector('.dg2-hud__score .n');
    const floatEl = mountEl.querySelector('.dg2-float');
    const selectEl = mountEl.querySelector('.dg2-select');
    const cardsEl = mountEl.querySelector('.dg2-cards');
    const doneEl = mountEl.querySelector('.dg2-done');
    const doneMsg = mountEl.querySelector('.dg2-done__msg');
    const listEl = mountEl.querySelector('.dg2-list');
    const formEl = mountEl.querySelector('.dg2-inputbar');
    const inputEl = mountEl.querySelector('.dg2-inputbar input');

    // ---- 狀態 ----
    const stt = Brand.state.get();
    let queue = (stt.posts && stt.posts.length) ? stt.posts.slice() : shuffle(POOL.slice()).map(t => ({ t, c: randType() }));
    let score = stt.score || 0;
    let beast = null, mission = { target: BASE_TARGET, count: 0 }, running = false, inView = true, saveTimer = null, floatTimer = null;
    const api = {};

    function saveState() { clearTimeout(saveTimer); saveTimer = setTimeout(() => Brand.state.saveGarden(queue, [], score), 350); }
    function addQueue(t, type) { if (!queue.some(q => q.t === t)) { queue.unshift({ t, c: type }); if (queue.length > 40) queue.pop(); } renderList(); saveState(); }
    function toast(text, color) {
      floatEl.textContent = text; floatEl.style.setProperty('--c', color);
      floatEl.classList.remove('is-show'); void floatEl.offsetWidth; floatEl.classList.add('is-show');
      clearTimeout(floatTimer); floatTimer = setTimeout(() => floatEl.classList.remove('is-show'), 1600);
    }
    function renderHUD() {
      scoreEl.textContent = score;
      if (beast) {
        const b = BEASTS[beast];
        avaEl.style.display = ''; avaEl.src = 'assets/img/mascot-' + beast + '.png'; avaEl.alt = b.name;
        taskEl.textContent = `採集 ${b.want}　${mission.count}/${mission.target}`;
        barEl.style.width = Math.min(100, mission.count / mission.target * 100) + '%';
        barEl.style.background = colorOf(beast);
      } else { avaEl.style.display = 'none'; taskEl.textContent = '選擇你的採集獸 →'; barEl.style.width = '0%'; }
    }
    function renderList() {
      listEl.innerHTML = '';
      const list = queue.slice(0, 14);
      if (!list.length) { listEl.innerHTML = '<span class="dg2-list__chip">（收集到的思辨句會出現在這裡）</span>'; return; }
      list.forEach(it => { const s = document.createElement('span'); s.className = 'dg2-list__chip'; s.innerHTML = `<i style="background:${colorOf(it.c)}"></i>${esc(it.t)}`; listEl.appendChild(s); });
    }
    function buildSelect() {
      cardsEl.innerHTML = '';
      ELEM_TYPES.forEach(type => {
        const b = BEASTS[type];
        const card = document.createElement('button'); card.type = 'button'; card.className = 'dg2-card'; card.dataset.type = type;
        card.innerHTML = `<img src="assets/img/mascot-${type}.png" alt="${b.name}" loading="lazy"><b>${b.name}</b><span>採集<br>${b.want}</span>`;
        card.addEventListener('click', () => startGame(type));
        cardsEl.appendChild(card);
      });
    }
    function startGame(type) {
      beast = type; mission = { target: BASE_TARGET, count: 0 }; running = true;
      selectEl.classList.remove('is-show'); doneEl.classList.remove('is-show');
      if (api.reset) api.reset(); renderHUD();
    }
    function missionDone() {
      running = false;
      doneMsg.textContent = `${BEASTS[beast].name} 採集了 ${mission.target} 顆 ${BEASTS[beast].want}！`;
      doneEl.classList.add('is-show');
    }

    // ---- p5 sketch（2D 卷軸）----
    const sketch = (p) => {
      let W, H, imgM = {}, imgE = {}, elems = [], parts = [], player, spawnT = 0, off = 0;
      let mUp = false, mDown = false, touchY = null;
      p.preload = () => { ELEM_TYPES.forEach(t => { imgM[t] = p.loadImage('assets/img/mascot-' + t + '.png'); imgE[t] = p.loadImage('assets/img/element-' + t + '.png'); }); };
      function size() { W = stageEl.clientWidth || 600; H = Math.max(240, Math.min(isMobile() ? 300 : 420, Math.round(W * 0.56))); }
      function pr() { return H * 0.11; }
      function er() { return H * 0.088; }
      p.setup = () => {
        size(); const c = p.createCanvas(W, H); c.parent(canvasHost);
        p.pixelDensity(Math.min(global.devicePixelRatio || 1, 1.5));
        p.imageMode(p.CENTER); p.textAlign(p.CENTER, p.CENTER); p.textFont('Instrument Sans');
        player = { x: W * 0.17, y: H * 0.5, bob: 0 };
        bindTouch(c.elt);
        const io = new IntersectionObserver(e => { inView = e[0].isIntersecting; }, { threshold: 0.15 });
        io.observe(stageEl);
        buildSelect(); renderHUD(); renderList();
      };
      p.draw = () => {
        const k = Math.min(3, p.deltaTime / 16.7);
        p.clear(); drawBg(k);
        if (running) { spawnLoop(); movePlayer(k); updateElems(k); }
        drawElems(); if (beast) drawPlayer(); updateParts(k);
      };
      function drawBg(k) {
        p.background('#FBF6E9');
        off += (REDUCED ? 0.4 : 1.6) * k;
        p.noStroke(); p.fill(216, 207, 189, 110);
        for (let i = 0; i < 16; i++) { let x = (i * 74 - off * 0.5) % (W + 74); if (x < -20) x += W + 74; p.circle(x, (i * 47) % (H - 40) + 12, 3); }
        p.fill('#E4D3A8'); p.rectMode(p.CORNER); p.rect(0, H - 14, W, 14); p.rectMode(p.CENTER);
        p.stroke('#8FAF63'); p.strokeWeight(2);
        for (let g = -((off * 1.5) % 42); g < W; g += 42) { const x = g < 0 ? g + 42 : g; p.line(x, H - 14, x - 3, H - 21); p.line(x, H - 14, x + 3, H - 21); }
        p.noStroke();
      }
      function movePlayer(k) {
        if (touchY != null) player.y += (touchY - player.y) * 0.35;
        else player.y += ((mDown ? 1 : 0) - (mUp ? 1 : 0)) * H * 0.02 * k;
        player.y = Math.max(H * 0.14, Math.min(H - 22 - pr() * 0.4, player.y));
      }
      function spawnLoop() {
        spawnT += p.deltaTime;
        const interval = Math.max(680, 1150 - (mission.target - BASE_TARGET) * 70);
        if (spawnT >= interval) { spawnT = 0; spawnElem(false); }
      }
      function spawnElem(gold, text) {
        const type = gold ? beast : (Math.random() < 0.45 ? beast : randType());
        const t = text || randSentence();
        elems.push({ x: W + er(), y: p.random(H * 0.18, H - 26 - er()), type, text: t, gold: !!gold, ph: p.random(p.TWO_PI) });
      }
      function updateElems(k) {
        const spd = W * 0.006 * (1 + (mission.target - BASE_TARGET) * 0.05) * k;
        for (let i = elems.length - 1; i >= 0; i--) {
          const e = elems[i]; e.x -= spd; e.ph += 0.06 * k;
          const ey = e.y + Math.sin(e.ph) * 4;
          if (p.dist(player.x, player.y, e.x, ey) < pr() * 0.72 + er() * 0.6) { doCatch(e); elems.splice(i, 1); continue; }
          if (e.x < -er() * 1.5) elems.splice(i, 1);
        }
      }
      function doCatch(e) {
        const match = e.gold || e.type === beast;
        if (match) {
          score = Brand.state.addScore(e.gold ? 2 : 1);
          scoreEl.textContent = score; if (opts.onScore) opts.onScore(score);
          mission.count++; addQueue(e.text, e.type); toast(e.text, colorOf(e.type));
          burst(e.x, e.y, colorOf(e.type)); renderHUD();
          if (opts.onLines) opts.onLines(mission.count);
          if (mission.count >= mission.target) missionDone();
        } else { burst(e.x, e.y, '#B7A990'); }
      }
      function burst(x, y, col) { if (REDUCED) return; for (let i = 0; i < 12; i++) { const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 4; parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, c: col, sz: 3 + Math.random() * 5 }); } }
      function updateParts(k) {
        for (let i = parts.length - 1; i >= 0; i--) { const s = parts[i]; s.x += s.vx * k; s.y += s.vy * k; s.vy += 0.14 * k; s.life -= 0.035 * k; p.noStroke(); const cc = p.color(s.c); cc.setAlpha(255 * Math.max(0, s.life)); p.fill(cc); p.push(); p.translate(s.x, s.y); p.rotate(s.life * 6); p.rect(0, 0, s.sz, s.sz, 2); p.pop(); if (s.life <= 0) parts.splice(i, 1); }
      }
      function drawElems() {
        for (const e of elems) {
          const ey = e.y + Math.sin(e.ph) * 4, R = er();
          if (e.gold) { p.noFill(); for (let g = 3; g >= 1; g--) { p.stroke(255, 200, 60, 40); p.strokeWeight(g * 2); p.circle(e.x, ey, R * 2 + g * 6); } p.noStroke(); }
          const img = imgE[e.type];
          if (img) p.image(img, e.x, ey, R * 2, R * 2);
          else { p.noStroke(); p.fill(colorOf(e.type)); p.circle(e.x, ey, R * 1.6); }
        }
      }
      function drawPlayer() {
        player.bob += 0.08; const y = player.y + Math.sin(player.bob) * 3, S = pr() * 2;
        const img = imgM[beast];
        p.noStroke(); p.fill(0, 0, 0, 22); p.ellipse(player.x, player.y + pr() * 0.9, S * 0.6, S * 0.16);
        if (img) p.image(img, player.x, y, S, S);
      }
      function bindTouch(el) {
        el.addEventListener('touchstart', (e) => { const r = el.getBoundingClientRect(); touchY = e.touches[0].clientY - r.top; }, { passive: true });
        el.addEventListener('touchmove', (e) => { const r = el.getBoundingClientRect(); touchY = e.touches[0].clientY - r.top; e.preventDefault(); }, { passive: false });
        el.addEventListener('touchend', () => { touchY = null; }, { passive: true });
      }
      p.windowResized = () => { size(); p.resizeCanvas(W, H); player.x = W * 0.17; };
      api.setUp = (v) => { mUp = v; };
      api.setDown = (v) => { mDown = v; };
      api.reset = () => { elems = []; parts = []; spawnT = 0; if (player) player.y = H * 0.5; };
      api.spawnGold = (text) => { if (running && beast) spawnElem(true, text); };
    };
    const inst = Brand.onView(stageEl, () => sketch);

    // ---- 控制：按鈕 / 鍵盤 / 投稿 / 完成 ----
    mountEl.querySelectorAll('.dg2-ctrl .dg2-btn').forEach(b => {
      const dir = b.dataset.a === 'up' ? 'setUp' : 'setDown';
      const on = () => api[dir] && api[dir](true);
      const off = () => api[dir] && api[dir](false);
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); on(); });
      b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
    });
    global.addEventListener('keydown', (e) => {
      if (!inView || !running) return; if (document.activeElement === inputEl) return;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { e.preventDefault(); api.setUp && api.setUp(true); }
      else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { e.preventDefault(); api.setDown && api.setDown(true); }
    });
    global.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') api.setUp && api.setUp(false);
      else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') api.setDown && api.setDown(false);
    });
    formEl.addEventListener('submit', (e) => {
      e.preventDefault(); const v = inputEl.value.trim(); if (!v) return;
      const type = beast || randType(); addQueue(v, type);
      if (api.spawnGold) api.spawnGold(v);
      inputEl.value = ''; inputEl.placeholder = running ? '金色元素已飛入場，去接住它！🌟' : '已存進議題池，選一隻獸開始收集 🌱';
    });
    doneEl.querySelector('[data-a="next"]').addEventListener('click', () => { mission.target += 2; mission.count = 0; running = true; doneEl.classList.remove('is-show'); if (api.reset) api.reset(); renderHUD(); });
    doneEl.querySelector('[data-a="swap"]').addEventListener('click', () => { running = false; beast = null; selectEl.classList.add('is-show'); doneEl.classList.remove('is-show'); renderHUD(); });

    return { p5: inst, getScore: () => score, getLines: () => mission.count, reset: () => { running = false; beast = null; selectEl.classList.add('is-show'); doneEl.classList.remove('is-show'); if (api.reset) api.reset(); renderHUD(); } };
  };

  global.Brand = Brand;
})(window);
