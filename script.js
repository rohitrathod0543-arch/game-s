
/* =====================================================
   RR GAMES — main script
   Sections: storage helpers, particle bg, UI chrome,
   catalog + rendering, modal/game engine, individual games,
   stats/ratings/reviews.
   ===================================================== */
 
/* ---------- Storage helpers ---------- */
const store = {
  get(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v === null ? fallback : v; }
    catch { return fallback; }
  },
  set(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
};
 
const HIGH_KEY = 'rr_highscores';
const RATE_KEY = 'rr_ratings';
const REVIEW_KEY = 'rr_reviews';
const PLAYS_KEY = 'rr_plays';
const SOUND_KEY = 'rr_sound';
const BADGE_KEY = 'rr_badges';
 
let highScores = store.get(HIGH_KEY, {});
let ratings = store.get(RATE_KEY, {});
let reviews = store.get(REVIEW_KEY, []);
let plays = store.get(PLAYS_KEY, {});
let soundOn = store.get(SOUND_KEY, true);
let badges = store.get(BADGE_KEY, []);
 
/* ---------- Simple sound (WebAudio beep, no assets) ---------- */
let actx;
function beep(freq = 440, dur = 0.08) {
  if (!soundOn) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain();
    o.frequency.value = freq; o.type = 'sine';
    o.connect(g); g.connect(actx.destination);
    g.gain.setValueAtTime(0.06, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
    o.start(); o.stop(actx.currentTime + dur);
  } catch { /* audio not available, ignore */ }
}
 
/* ---------- Loader ---------- */
window.addEventListener('load', () => {
  setTimeout(() => document.getElementById('loader').classList.add('hidden'), 900);
});
 
/* ---------- Particle background ---------- */
const canvas = document.getElementById('particles');
const ctx = canvas.getContext('2d');
let particles = [];
function resizeCanvas() { canvas.width = innerWidth; canvas.height = innerHeight; }
function initParticles() {
  const count = Math.min(70, Math.floor((innerWidth * innerHeight) / 18000));
  particles = Array.from({ length: count }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.8 + 0.6,
    vx: (Math.random() - 0.5) * 0.25,
    vy: (Math.random() - 0.5) * 0.25,
    hue: [217, 262, 178][Math.floor(Math.random() * 3)]
  }));
}
function drawParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => {
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
    if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${p.hue},90%,65%,0.55)`;
    ctx.fill();
  });
  requestAnimationFrame(drawParticles);
}
resizeCanvas(); initParticles(); drawParticles();
window.addEventListener('resize', () => { resizeCanvas(); initParticles(); });
 
/* ---------- Nav ---------- */
document.getElementById('navToggle').addEventListener('click', () => {
  document.querySelector('.nav-links').classList.toggle('open-mobile');
});
document.getElementById('soundToggle').addEventListener('click', (e) => {
  soundOn = !soundOn; store.set(SOUND_KEY, soundOn);
  e.target.textContent = soundOn ? '🔊' : '🔇';
});
document.getElementById('soundToggle').textContent = soundOn ? '🔊' : '🔇';
 
/* ---------- Game catalog ---------- */
const CATALOG = [
  { id: 'ttt', name: 'Tic Tac Toe', desc: '2-player grid classic. First to three in a row wins.', icon: '⭕', type: 'game', tag: 'Featured', build: buildTicTacToe },
  { id: 'rps', name: 'Rock Paper Scissors', desc: 'Best of streaks against the house.', icon: '✊', type: 'fast', tag: 'Quick Play', build: buildRPS },
  { id: 'guess', name: 'Guess The Number', desc: 'Crack the 1–100 code in the fewest tries.', icon: '🎯', type: 'game', tag: 'Featured', build: buildGuess },
  { id: 'reaction', name: 'Reaction Speed Test', desc: 'Tap the instant it turns green. Milliseconds count.', icon: '⚡', type: 'fast', tag: 'Trending', build: buildReaction },
  { id: 'color', name: 'Color Match', desc: 'Match the swatch before the clock runs out.', icon: '🎨', type: 'game', tag: 'Trending', build: buildColorMatch },
  { id: 'calc', name: 'Calculator', desc: 'A clean, glowing calculator for quick math.', icon: '🧮', type: 'tool', tag: 'Tool', build: buildCalculator }
];
 
const featuredGrid = document.getElementById('featuredGrid');
const trendingGrid = document.getElementById('trendingGrid');
const ratingsGrid = document.getElementById('ratingsGrid');
 
function starString(avg) {
  const full = Math.round(avg);
  return '★★★★★'.slice(0, full) + '☆☆☆☆☆'.slice(0, 5 - full);
}
function avgRating(id) {
  const arr = ratings[id] || [];
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
 
function cardHTML(g) {
  const hs = highScores[g.id];
  return `
  <div class="game-card glass" data-id="${g.id}" data-type="${g.type}" data-name="${g.name.toLowerCase()}">
    ${hs !== undefined ? `<span class="card-high">High: ${hs}</span>` : ''}
    <div class="card-icon">${g.icon}</div>
    <h3>${g.name}</h3>
    <p>${g.desc}</p>
    <div class="card-foot">
      <span class="card-tag">${g.tag}</span>
      <button class="play-btn" data-play="${g.id}">Play</button>
    </div>
  </div>`;
}
 
function renderCatalog() {
  featuredGrid.innerHTML = CATALOG.filter(g => g.tag === 'Featured' || g.tag === 'Tool').map(cardHTML).join('');
  trendingGrid.innerHTML = CATALOG.filter(g => g.tag === 'Trending' || g.tag === 'Quick Play').map(cardHTML).join('');
  ratingsGrid.innerHTML = CATALOG.map(g => `
    <div class="rating-card">
      <h4>${g.icon} ${g.name}</h4>
      <span class="stars">${starString(avgRating(g.id))}</span>
      <span class="rating-count">${(ratings[g.id] || []).length} ratings</span>
    </div>`).join('');
}
renderCatalog();
 
/* Delegate play buttons + card click */
document.body.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-play]');
  if (btn) openGame(btn.dataset.play);
});
 
/* ---------- Search + filter ---------- */
const searchInput = document.getElementById('searchInput');
const filters = document.getElementById('filters');
let activeFilter = 'all';
 
function applyFilter() {
  const q = searchInput.value.trim().toLowerCase();
  document.querySelectorAll('.game-card').forEach(card => {
    const matchesType = activeFilter === 'all' || card.dataset.type === activeFilter;
    const matchesQuery = !q || card.dataset.name.includes(q);
    card.style.display = (matchesType && matchesQuery) ? '' : 'none';
  });
}
searchInput.addEventListener('input', applyFilter);
filters.addEventListener('click', (e) => {
  const chip = e.target.closest('.filter-chip');
  if (!chip) return;
  filters.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  activeFilter = chip.dataset.filter;
  applyFilter();
});
 
/* ---------- Modal / game engine ---------- */
const modal = document.getElementById('gameModal');
const modalTitle = document.getElementById('modalTitle');
const modalScore = document.getElementById('modalScore');
const stage = document.getElementById('gameStage');
const restartBtn = document.getElementById('restartBtn');
const closeModalBtn = document.getElementById('closeModal');
const modalStarInput = document.getElementById('modalStarInput');
 
let currentGame = null;
let currentRestart = null;
 
function openGame(id) {
  const g = CATALOG.find(x => x.id === id);
  if (!g) return;
  currentGame = g;
  modalTitle.textContent = `${g.icon} ${g.name}`;
  plays[id] = (plays[id] || 0) + 1;
  store.set(PLAYS_KEY, plays);
  setModalStars(0);
  buildAndMount();
  modal.classList.add('open');
  updateStatsDashboard();
}
function buildAndMount() {
  stage.innerHTML = '';
  modalScore.textContent = '';
  currentRestart = currentGame.build(stage, updateModalScore);
}
function updateModalScore(text) { modalScore.textContent = text; }
 
closeModalBtn.addEventListener('click', () => modal.classList.remove('open'));
modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });
restartBtn.addEventListener('click', () => { if (currentRestart) currentRestart(); else buildAndMount(); beep(300); });
 
/* Star widgets (shared for review form + modal rating) */
function wireStarInput(el, onSet) {
  el.querySelectorAll('span').forEach(star => {
    star.addEventListener('click', () => {
      const val = +star.dataset.star;
      el.dataset.value = val;
      el.querySelectorAll('span').forEach(s => s.classList.toggle('filled', +s.dataset.star <= val));
      onSet(val);
    });
  });
}
function setModalStars(v) {
  modalStarInput.dataset.value = v;
  modalStarInput.querySelectorAll('span').forEach(s => s.classList.toggle('filled', +s.dataset.star <= v));
}
wireStarInput(modalStarInput, (val) => {
  if (!currentGame) return;
  ratings[currentGame.id] = ratings[currentGame.id] || [];
  ratings[currentGame.id].push(val);
  store.set(RATE_KEY, ratings);
  renderCatalog();
  applyFilter();
  beep(600, 0.05);
});
 
/* ---------- High score + badge helpers used by games ---------- */
function reportScore(gameId, score, higherIsBetter = true) {
  const prev = highScores[gameId];
  const better = prev === undefined || (higherIsBetter ? score > prev : score < prev);
  if (better) { highScores[gameId] = score; store.set(HIGH_KEY, highScores); renderCatalog(); applyFilter(); }
  checkBadges();
  updateStatsDashboard();
  return better;
}
const BADGE_DEFS = [
  { id: 'first_play', label: 'First Steps', test: () => Object.values(plays).reduce((a, b) => a + b, 0) >= 1 },
  { id: 'ten_plays', label: 'Regular', test: () => Object.values(plays).reduce((a, b) => a + b, 0) >= 10 },
  { id: 'all_games', label: 'Explorer', test: () => CATALOG.every(g => (plays[g.id] || 0) > 0) },
  { id: 'ttt_win', label: 'Tactician', test: () => (highScores['ttt'] || 0) >= 1 },
  { id: 'fast_reflex', label: 'Lightning Reflexes', test: () => highScores['reaction'] !== undefined && highScores['reaction'] <= 300 }
];
function checkBadges() {
  BADGE_DEFS.forEach(b => { if (!badges.includes(b.id) && b.test()) badges.push(b.id); });
  store.set(BADGE_KEY, badges);
  renderBadges();
}
function renderBadges() {
  document.getElementById('badgesRow').innerHTML = BADGE_DEFS.map(b =>
    `<span class="badge ${badges.includes(b.id) ? 'earned' : ''}">${badges.includes(b.id) ? '🏅' : '🔒'} ${b.label}</span>`
  ).join('');
}
 
/* ---------- Stats dashboard ---------- */
function updateStatsDashboard() {
  document.getElementById('statGames').textContent = Object.values(plays).reduce((a, b) => a + b, 0);
  const best = Math.max(0, ...Object.values(highScores));
  document.getElementById('statHigh').textContent = best;
  document.getElementById('statBadges').textContent = badges.length;
  document.getElementById('statReviews').textContent = reviews.length;
}
updateStatsDashboard();
renderBadges();
 
/* =====================================================
   INDIVIDUAL GAMES
   Each build(stage, setScore) renders itself into `stage`
   and returns a restart() function.
   ===================================================== */
 
/* ---- 1. Tic Tac Toe (2 players, same device) ---- */
function buildTicTacToe(stage) {
  let board, turn, over;
  function render() {
    stage.innerHTML = `
      <div class="ttt-board">${board.map((c, i) => `<div class="ttt-cell ${c ? c.toLowerCase() : ''}" data-i="${i}">${c || ''}</div>`).join('')}</div>
      <p style="color:var(--text-dim);font-size:.85rem;">${over ? over : `Turn: <strong style="color:${turn === 'X' ? 'var(--cyan)' : 'var(--purple)'}">${turn}</strong>`}</p>`;
  }
  const WINS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  function checkWin() {
    for (const [a,b,c] of WINS) if (board[a] && board[a]===board[b] && board[a]===board[c]) return board[a];
    return board.every(Boolean) ? 'draw' : null;
  }
  function restart() { board = Array(9).fill(null); turn = 'X'; over = null; render(); }
  stage.addEventListener('click', (e) => {
    const cell = e.target.closest('.ttt-cell'); if (!cell || over) return;
    const i = +cell.dataset.i; if (board[i]) return;
    board[i] = turn; beep(turn === 'X' ? 520 : 400);
    const w = checkWin();
    if (w) { over = w === 'draw' ? "It's a draw!" : `${w} wins!`; if (w !== 'draw') reportScore('ttt', 1); }
    else turn = turn === 'X' ? 'O' : 'X';
    render();
  });
  restart();
  return restart;
}
 
/* ---- 2. Rock Paper Scissors ---- */
function buildRPS(stage, setScore) {
  let streak = 0;
  const opts = { rock: '✊', paper: '✋', scissors: '✌️' };
  function render() {
    stage.innerHTML = `
      <div class="rps-choices">${Object.entries(opts).map(([k,v]) => `<button class="rps-btn" data-choice="${k}">${v}</button>`).join('')}</div>
      <p class="rps-result" id="rpsResult"></p>`;
  }
  function play(choice) {
    const keys = Object.keys(opts);
    const cpu = keys[Math.floor(Math.random() * 3)];
    let result;
    if (choice === cpu) result = "It's a tie!";
    else if ((choice==='rock'&&cpu==='scissors')||(choice==='paper'&&cpu==='rock')||(choice==='scissors'&&cpu==='paper')) {
      result = `You win! (${opts[choice]} beats ${opts[cpu]})`; streak++; beep(600);
    } else { result = `You lose! (${opts[cpu]} beats ${opts[choice]})`; streak = 0; beep(200); }
    document.getElementById('rpsResult').textContent = result;
    reportScore('rps', streak);
    setScore(`Current streak: ${streak}`);
  }
  stage.addEventListener('click', (e) => { const b = e.target.closest('[data-choice]'); if (b) play(b.dataset.choice); });
  function restart() { streak = 0; render(); setScore('Current streak: 0'); }
  restart();
  return restart;
}
 
/* ---- 3. Guess The Number ---- */
function buildGuess(stage, setScore) {
  let target, tries;
  function render(msg) {
    stage.innerHTML = `
      <p style="color:var(--text-dim);">I'm thinking of a number between 1 and 100.</p>
      <div class="guess-wrap"><input id="guessInput" type="number" min="1" max="100" placeholder="Your guess"><button class="btn btn-primary" id="guessBtn">Guess</button></div>
      <p class="guess-msg">${msg || ''}</p>`;
    document.getElementById('guessBtn').addEventListener('click', submit);
    document.getElementById('guessInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  }
  function submit() {
    const input = document.getElementById('guessInput');
    const val = +input.value; if (!val) return;
    tries++;
    if (val === target) { render(`🎉 Correct! You got it in ${tries} tries.`); reportScore('guess', tries, false); setScore(`Solved in ${tries} tries`); beep(700); }
    else { render(val < target ? '📈 Too low — try higher.' : '📉 Too high — try lower.'); setScore(`Tries: ${tries}`); beep(300); document.getElementById('guessInput').value=''; document.getElementById('guessInput').focus(); }
  }
  function restart() { target = Math.floor(Math.random() * 100) + 1; tries = 0; render(); setScore('Tries: 0'); }
  restart();
  return restart;
}
 
/* ---- 4. Reaction Speed Test ---- */
function buildReaction(stage, setScore) {
  let state, startTime, timeoutId;
  function render(label, cls) {
    stage.innerHTML = `<div class="reaction-box ${cls}" id="reactBox">${label}</div>`;
    document.getElementById('reactBox').addEventListener('click', handleClick);
  }
  function arm() {
    state = 'waiting';
    render('Wait for green...', 'wait');
    const delay = 1200 + Math.random() * 2200;
    timeoutId = setTimeout(() => { state = 'go'; startTime = performance.now(); render('CLICK NOW!', 'go'); }, delay);
  }
  function handleClick() {
    if (state === 'waiting') { clearTimeout(timeoutId); render('Too soon! Click to retry.', 'wait'); state = 'early'; beep(180); return; }
    if (state === 'go') {
      const ms = Math.round(performance.now() - startTime);
      render(`${ms} ms — click to retry`, 'wait'); state = 'done';
      reportScore('reaction', ms, false); setScore(`Last: ${ms} ms`); beep(650); return;
    }
    arm();
  }
  function restart() { clearTimeout(timeoutId); arm(); setScore('Tap the box to start'); }
  restart();
  return restart;
}
 
/* ---- 5. Color Match ---- */
function buildColorMatch(stage, setScore) {
  let score, timer, timeLeft, target;
  const PALETTE = ['#3b82ff','#9b5cff','#34e7e0','#ff5c8a','#ffd23f','#5cff8f'];
  function pick() {
    target = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    const options = new Set([target]);
    while (options.size < 6) options.add(PALETTE[Math.floor(Math.random() * PALETTE.length)]);
    return [...options].sort(() => Math.random() - 0.5);
  }
  function render() {
    const options = pick();
    stage.innerHTML = `
      <div class="color-target" style="background:${target}"></div>
      <p style="color:var(--text-dim);font-size:.85rem;">Match this color — ${timeLeft}s left</p>
      <div class="color-options">${options.map(c => `<button class="color-opt" data-c="${c}" style="background:${c}"></button>`).join('')}</div>`;
  }
  function tick() {
    timeLeft--;
    if (timeLeft <= 0) { clearInterval(timer); stage.innerHTML += `<p>⏱ Time up! Final score: ${score}</p>`; reportScore('color', score); return; }
    render();
  }
  stage.addEventListener('click', (e) => {
    const b = e.target.closest('[data-c]'); if (!b) return;
    if (b.dataset.c === target) { score++; beep(700); } else beep(180);
    setScore(`Score: ${score}`);
    render();
  });
  function restart() { clearInterval(timer); score = 0; timeLeft = 20; setScore('Score: 0'); render(); timer = setInterval(tick, 1000); }
  restart();
  return restart;
}
 
/* ---- 6. Calculator ---- */
function buildCalculator(stage) {
  let expr = '';
  const keys = ['7','8','9','/','4','5','6','*','1','2','3','-','0','.','=','+','C'];
  function render() {
    stage.innerHTML = `
      <div class="calc">
        <div class="calc-display" id="calcDisplay">${expr || '0'}</div>
        <div class="calc-grid">${keys.map(k => `<button class="calc-key ${'*/+-'.includes(k)?'op':''} ${k==='='?'eq':''}" data-key="${k}">${k}</button>`).join('')}</div>
      </div>`;
  }
  stage.addEventListener('click', (e) => {
    const b = e.target.closest('[data-key]'); if (!b) return;
    const k = b.dataset.key;
    if (k === 'C') expr = '';
    else if (k === '=') {
      try { if (!/^[0-9+\-*/.\s]+$/.test(expr)) throw 0; expr = String(Function(`"use strict";return (${expr})`)()); }
      catch { expr = 'Error'; }
    } else expr += k;
    document.getElementById('calcDisplay').textContent = expr || '0';
    beep(350, 0.04);
  });
  function restart() { expr = ''; render(); }
  restart();
  return restart;
}
 
/* =====================================================
   REVIEWS
   ===================================================== */
const reviewsList = document.getElementById('reviewsList');
const starInput = document.getElementById('starInput');
let selectedStars = 0;
wireStarInput(starInput, (v) => selectedStars = v);
 
function renderReviews() {
  reviewsList.innerHTML = reviews.slice().reverse().map(r => `
    <div class="review-item">
      <div class="rhead"><strong>${r.name}</strong><span class="stars">${starString(r.stars)}</span></div>
      <p>${r.text}</p>
    </div>`).join('') || '<p style="color:var(--text-dim);text-align:center;">No reviews yet — be the first.</p>';
}
renderReviews();
 
document.getElementById('submitReview').addEventListener('click', () => {
  const name = document.getElementById('reviewName').value.trim() || 'Anonymous';
  const text = document.getElementById('reviewText').value.trim();
  if (!text) { document.getElementById('reviewText').focus(); return; }
  reviews.push({ name, text, stars: selectedStars || 5 });
  store.set(REVIEW_KEY, reviews);
  document.getElementById('reviewName').value = '';
  document.getElementById('reviewText').value = '';
  selectedStars = 0; starInput.dataset.value = 0;
  starInput.querySelectorAll('span').forEach(s => s.classList.remove('filled'));
  renderReviews(); updateStatsDashboard(); beep(700);
});
 
/* ---------- Contact form (demo only, no backend) ---------- */
document.getElementById('contactForm').addEventListener('submit', (e) => {
  e.preventDefault();
  e.target.reset();
  alert('Message sent — thanks for reaching out!');
});
 
/* ---------- Fade-in on scroll ---------- */
const io = new IntersectionObserver((entries) => {
  entries.forEach(en => { if (en.isIntersecting) { en.target.style.opacity = 1; en.target.style.transform = 'translateY(0)'; } });
}, { threshold: 0.15 });
document.querySelectorAll('.section').forEach(sec => {
  sec.style.opacity = 0; sec.style.transform = 'translateY(24px)';
  sec.style.transition = 'opacity .7s ease, transform .7s ease';
  io.observe(sec);
});
 
