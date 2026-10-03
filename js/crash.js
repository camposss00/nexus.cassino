// Crash — jogo original mantido (coexiste com Aviator)
(function () {
  let state = null;
  let rafId = null;
  let startTime = 0;
  let crashPoint = 0;
  let cashedOut = false;
  let mult = 1;

  function generateCrashPoint() {
    const r = Math.random();
    const p = Math.max(1.01, 0.99 / (1 - r));
    return Math.min(p, 100);
  }

  function render() {
    const view = document.getElementById('view');
    view.innerHTML = `
      <div class="game-shell">
        <div class="game-header">
          <h1>Crash</h1>
          <div class="tools">
            <button class="btn-ghost" id="cr-rules"><i class="fa-solid fa-circle-info"></i> Regras</button>
          </div>
        </div>
        <p class="demo-note">DEMO — TODOS OS VALORES SÃO FICTÍCIOS E NÃO POSSUEM VALOR MONETÁRIO.</p>

        <div class="crash-stage" id="cr-stage">
          <div class="crash-mult" id="cr-mult">1.00x</div>
          <canvas id="crash-canvas"></canvas>
          <div class="crash-plane" id="cr-plane">✈</div>
        </div>

        <div class="controls">
          <div class="bet-amount">Aposta:</div>
          <div class="chip-grid" id="cr-chips">
            <button class="chip" data-amount="10">R$ 10</button>
            <button class="chip active" data-amount="25">R$ 25</button>
            <button class="chip" data-amount="50">R$ 50</button>
            <button class="chip" data-amount="100">R$ 100</button>
            <button class="chip" data-amount="250">R$ 250</button>
            <button class="chip" data-amount="500">R$ 500</button>
          </div>
          <button class="btn-primary" id="cr-start" style="margin-left:auto">INICIAR</button>
          <button class="btn-ghost" id="cr-cash" disabled>SACAR</button>
        </div>

        <div>
          <div class="section-title"><h2>Últimos multiplicadores</h2></div>
          <div class="crash-history" id="cr-history"></div>
        </div>
      </div>
    `;

    state = { bet: 25, running: false, results: [] };
    History.all().filter(h => h.game === 'Crash').slice(0, 14).reverse().forEach(h => state.results.push(Number(h.resultTag)));
    renderHistory();

    view.querySelectorAll('#cr-chips .chip').forEach(c => {
      c.addEventListener('click', () => {
        if (state.running) return;
        view.querySelectorAll('#cr-chips .chip').forEach(x => x.classList.remove('active'));
        c.classList.add('active');
        state.bet = Number(c.dataset.amount);
        updateButtons();
      });
    });
    document.getElementById('cr-start').addEventListener('click', start);
    document.getElementById('cr-cash').addEventListener('click', cashOut);
    document.getElementById('cr-rules').addEventListener('click', showRules);
    window.addEventListener('resize', resizeCanvas);
    updateButtons();
    resizeCanvas();
  }

  function updateButtons() {
    const w = Wallet.get();
    const startBtn = document.getElementById('cr-start');
    const cashBtn = document.getElementById('cr-cash');
    if (!startBtn || !cashBtn) return;
    startBtn.disabled = state.running || state.bet > w.balance;
    startBtn.textContent = state.running ? 'EM VOO…' : `INICIAR R$ ${state.bet}`;
    cashBtn.disabled = !state.running || cashedOut;
    if (state.running) {
      const val = Math.round(state.bet * mult * 100) / 100;
      cashBtn.textContent = `SACAR ${val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
    } else {
      cashBtn.textContent = 'SACAR';
    }
  }
  function renderHistory() {
    const el = document.getElementById('cr-history');
    if (!el) return;
    el.innerHTML = state.results.map(m => {
      const cls = m < 1.5 ? 'low' : m < 3 ? 'mid' : 'high';
      return `<span class="crash-chip ${cls}">${m.toFixed(2)}x</span>`;
    }).join('');
  }
  function resizeCanvas() {
    const cv = document.getElementById('crash-canvas');
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    cv.width = r.width * devicePixelRatio;
    cv.height = r.height * devicePixelRatio;
  }
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function start() {
    if (state.running) return;
    const ticket = Wallet.placeBet(state.bet, 'Crash');
    if (!ticket) { Notify.warn('Saldo insuficiente', 'Ajuste a aposta.'); return; }
    state.ticket = ticket;
    state.running = true;
    cashedOut = false;
    mult = 1;
    crashPoint = generateCrashPoint();
    startTime = performance.now();
    document.getElementById('cr-mult').classList.remove('crashed');
    document.getElementById('cr-mult').textContent = '1.00x';
    updateButtons();

    cancelAnimationFrame(rafId);
    const cv = document.getElementById('crash-canvas');
    const ctx = cv.getContext('2d');
    const pts = [];
    const plane = document.getElementById('cr-plane');

    const tick = () => {
      const t = (performance.now() - startTime) / 1000;
      mult = Math.pow(1.0006, (performance.now() - startTime) * 0.5);
      mult = Math.max(1.0, Math.min(mult, crashPoint));

      document.getElementById('cr-mult').textContent = mult.toFixed(2) + 'x';
      updateButtons();

      const w = cv.width, h = cv.height;
      const x = Math.min(w - 40, t * 90 * devicePixelRatio);
      const y = h - 40 - Math.min(h - 80, (mult - 1) * 60 * devicePixelRatio);
      pts.push({ x, y });

      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(108,92,255,0.35)';
      ctx.lineWidth = 1 * devicePixelRatio;
      for (let i = 1; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(0, (h / 5) * i);
        ctx.lineTo(w, (h / 5) * i);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(23,209,165,0.95)';
      ctx.lineWidth = 3 * devicePixelRatio;
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.stroke();

      plane.style.left = (x / devicePixelRatio - 12) + 'px';
      plane.style.top = (y / devicePixelRatio - 12) + 'px';
      plane.style.transform = `rotate(-20deg)`;

      if (mult < crashPoint) {
        rafId = requestAnimationFrame(tick);
      } else {
        end(true);
      }
    };
    rafId = requestAnimationFrame(tick);
  }

  function cashOut() {
    if (!state.running || cashedOut) return;
    cashedOut = true;
    const payout = Math.round(state.ticket.amount * mult * 100) / 100;
    Wallet.payout(payout);
    Notify.win(`+ ${fmt(payout)} virtuais`, `Crash — saque em ${mult.toFixed(2)}x`);
    History.add({ game: 'Crash', bet: state.ticket.amount, payout, result: 'win', resultTag: mult.toFixed(2), detail: `saque ${mult.toFixed(2)}x` });
    History.recordRound({ game: 'Crash', bet: state.ticket.amount, payout, result: 'win', mult });
    History.recordMultiplier(mult);
    state.results.unshift(mult);
    if (state.results.length > 14) state.results.length = 14;
    renderHistory();
    end(false);
  }

  function end(crashed) {
    cancelAnimationFrame(rafId);
    const el = document.getElementById('cr-mult');
    el.classList.add('crashed');
    el.textContent = crashed ? `CRASH ${mult.toFixed(2)}x` : `${mult.toFixed(2)}x`;
    if (crashed) {
      Notify.loss(`- ${fmt(state.ticket.amount)} virtuais`, `Crash em ${mult.toFixed(2)}x`);
      History.add({ game: 'Crash', bet: state.ticket.amount, payout: 0, result: 'loss', resultTag: mult.toFixed(2), detail: `crash ${mult.toFixed(2)}x` });
      History.recordRound({ game: 'Crash', bet: state.ticket.amount, payout: 0, result: 'loss', mult });
      History.recordMultiplier(mult);
      state.results.unshift(mult);
      if (state.results.length > 14) state.results.length = 14;
      renderHistory();
    }
    state.running = false;
    state.ticket = null;
    updateButtons();
  }

  function fmt(n) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

  function showRules() {
    window.App.openModal('Regras — Crash', `
      <p><strong>Objetivo:</strong> sacar antes do multiplicador crashar.</p>
      <ul>
        <li>Multiplicador começa em 1.00x e cresce continuamente.</li>
        <li>Saque em X garante aposta × X. Crash antes = perda.</li>
      </ul>
      <p class="demo-note">Valores fictícios — sem valor monetário real.</p>
    `);
  }

  window.Crash = { render, showRules };
})();
