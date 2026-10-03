// Aviator — jogo dedicado com rounds contínuas, fase de aposta, voo e crash
(function () {
  const HISTORY_KEY = 'nova7.aviator.history';
  const MAX_HISTORY = 24;

  let state = null;

  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
    catch { return []; }
  }
  function saveHistory(list) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_HISTORY)));
  }

  // Distribuição realista: caudas altas raras
  function genCrashPoint() {
    const r = Math.random();
    if (r < 0.05) return 1.0 + Math.random() * 0.05;       // ~5% crash instantâneo
    if (r < 0.55) return 1.05 + Math.random() * 0.95;      // baixo
    if (r < 0.85) return 2.0 + Math.random() * 2.0;        // médio
    if (r < 0.96) return 4.0 + Math.random() * 6.0;        // alto
    if (r < 0.995) return 10.0 + Math.random() * 40.0;     // muito alto
    return 50.0 + Math.random() * 200.0;                    // cauda rara
  }

  function fmt(n) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

  function render() {
    const view = document.getElementById('view');
    const history = loadHistory();

    view.innerHTML = `
      <div class="game-shell">
        <div class="game-header">
          <h1><i class="fa-solid fa-plane" style="color:var(--gold)"></i> Aviator</h1>
          <div class="tools">
            <button class="btn-ghost" id="av-rules"><i class="fa-solid fa-circle-info"></i> Regras</button>
          </div>
        </div>
        <p class="demo-note">DEMO — TODOS OS VALORES SÃO FICTÍCIOS E NÃO POSSUEM VALOR MONETÁRIO.</p>

        <div class="aviator-shell">
          <div class="aviator-stage" id="av-stage">
            <div class="aviator-mult" id="av-mult">1.00x</div>
            <canvas id="av-canvas"></canvas>
            <div class="aviator-plane" id="av-plane">✈</div>
            <div class="aviator-status" id="av-status">Aguardando aposta…</div>
            <div class="aviator-countdown" id="av-count">—</div>
          </div>

          <div class="aviator-side">
            <div class="side-block">
              <span class="label">Aposta (virtual)</span>
              <div class="bet-row">
                <input id="av-bet" type="number" min="1" step="1" value="25" />
                <span style="color:var(--muted);font-size:12px">R$</span>
              </div>
              <div class="bet-quick" id="av-quick">
                <button class="chip" data-amount="10">10</button>
                <button class="chip" data-amount="25">25</button>
                <button class="chip" data-amount="50">50</button>
                <button class="chip" data-amount="100">100</button>
                <button class="chip" data-amount="250">250</button>
                <button class="chip" data-amount="500">500</button>
              </div>
            </div>

            <button class="btn-primary btn-bet" id="av-bet-btn">APOSTAR</button>
            <button class="btn-cash" id="av-cash-btn" disabled>SACAR</button>

            <div class="side-block">
              <span class="label">Últimos multiplicadores</span>
              <div class="aviator-history" id="av-history"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    state = {
      phase: 'idle',       // idle | betting | flying | crashed
      betAmount: 25,
      placed: false,
      cashed: false,
      ticket: null,
      mult: 1.0,
      crashPoint: 0,
      startTime: 0,
      rafId: null,
      history: loadHistory(),
      countdown: null,
      pendingTimer: null,
    };

    // restore
    if (state.history.length) {
      const last = state.history[0];
      document.getElementById('av-mult').textContent = `${last.toFixed(2)}x`;
    }

    renderHistory();
    bind();
    resizeCanvas();
    // ciclo automático
    beginBettingPhase();
  }

  function bind() {
    const view = document.getElementById('view');
    document.getElementById('av-rules').addEventListener('click', showRules);

    view.querySelectorAll('#av-quick .chip').forEach(c => {
      c.addEventListener('click', () => {
        if (state.phase !== 'idle' && state.phase !== 'betting') return;
        view.querySelectorAll('#av-quick .chip').forEach(x => x.classList.remove('active'));
        c.classList.add('active');
        state.betAmount = Number(c.dataset.amount);
        document.getElementById('av-bet').value = state.betAmount;
      });
    });

    document.getElementById('av-bet').addEventListener('input', (e) => {
      if (state.phase !== 'idle' && state.phase !== 'betting') {
        e.target.value = state.betAmount;
        return;
      }
      const v = Math.max(1, Math.floor(Number(e.target.value) || 0));
      state.betAmount = v;
    });

    document.getElementById('av-bet-btn').addEventListener('click', placeBet);
    document.getElementById('av-cash-btn').addEventListener('click', cashOut);
    window.addEventListener('resize', resizeCanvas);
  }

  function renderHistory() {
    const el = document.getElementById('av-history');
    if (!el) return;
    el.innerHTML = state.history.slice(0, MAX_HISTORY).map(m => {
      const cls = m < 1.5 ? 'low' : m < 3 ? 'mid' : m < 10 ? 'high' : 'mega';
      return `<span class="h-chip ${cls}">${m.toFixed(2)}x</span>`;
    }).join('');
  }

  function resizeCanvas() {
    const cv = document.getElementById('av-canvas');
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    cv.width = Math.floor(r.width * devicePixelRatio);
    cv.height = Math.floor(r.height * devicePixelRatio);
  }

  function setStatus(txt) {
    const el = document.getElementById('av-status');
    if (el) el.textContent = txt;
  }
  function setCountdown(txt) {
    const el = document.getElementById('av-count');
    if (el) el.textContent = txt;
  }

  // ============== FASE DE APOSTA ==============
  function beginBettingPhase() {
    state.phase = 'betting';
    state.placed = false;
    state.cashed = false;
    state.ticket = null;
    state.mult = 1.0;
    state.crashPoint = 0;
    document.getElementById('av-mult').textContent = '1.00x';
    document.getElementById('av-mult').classList.remove('crashed');
    document.getElementById('av-plane').style.opacity = '0';
    document.getElementById('av-cash-btn').disabled = true;
    document.getElementById('av-bet-btn').disabled = false;
    document.getElementById('av-bet-btn').textContent = 'APOSTAR';
    setStatus('Aguardando aposta…');

    let seconds = 6;
    setCountdown(`Início em ${seconds}s`);
    clearInterval(state.countdown);
    state.countdown = setInterval(() => {
      seconds -= 1;
      if (seconds > 0) setCountdown(`Início em ${seconds}s`);
      else {
        clearInterval(state.countdown);
        setCountdown('Decolando…');
        startFlight();
      }
    }, 1000);
  }

  function placeBet() {
    if (state.phase !== 'betting' && state.phase !== 'idle') return;
    if (state.placed) return;
    const amount = Math.max(1, Math.floor(Number(state.betAmount) || 0));
    if (amount <= 0) { Notify.warn('Valor inválido'); return; }
    const ticket = Wallet.placeBet(amount, 'Aviator');
    if (!ticket) { Notify.warn('Saldo insuficiente', 'Ajuste a aposta.'); return; }
    state.ticket = ticket;
    state.placed = true;
    document.getElementById('av-bet-btn').disabled = true;
    document.getElementById('av-bet-btn').textContent = `APOSTADO ${fmt(amount)}`;
    setStatus('Aposta confirmada — aguardando decolagem');
  }

  // ============== VOO ==============
  function startFlight() {
    if (state.phase !== 'betting') return;
    state.phase = 'flying';
    state.mult = 1.0;
    state.crashPoint = genCrashPoint();
    state.startTime = performance.now();

    document.getElementById('av-cash-btn').disabled = !state.placed;
    document.getElementById('av-plane').style.opacity = '1';
    setStatus('Em voo…');
    setCountdown('');

    // no Aviator: se o jogador não apostou, ainda roda o voo — sem trade
    const cv = document.getElementById('av-canvas');
    const ctx = cv.getContext('2d');
    const pts = [];
    const plane = document.getElementById('av-plane');

    const tick = () => {
      const elapsed = (performance.now() - state.startTime) / 1000;
      // crescimento suave exponencial
      state.mult = Math.pow(1.06, elapsed * 2);
      if (state.mult >= state.crashPoint) state.mult = state.crashPoint;

      const m = state.mult;
      document.getElementById('av-mult').textContent = `${m.toFixed(2)}x`;
      if (state.placed && !state.cashed) {
        const v = Math.round(state.ticket.amount * m * 100) / 100;
        document.getElementById('av-cash-btn').textContent = `SACAR ${fmt(v)}`;
      }

      // curva de voo — posição no canvas
      const w = cv.width, h = cv.height;
      const px = Math.min(w - 40, elapsed * 130 * devicePixelRatio);
      const py = h - 40 - Math.min(h - 80, (m - 1) * 60 * devicePixelRatio);
      pts.push({ x: px, y: py });
      if (pts.length > 500) pts.shift();

      ctx.clearRect(0, 0, w, h);
      // grid
      ctx.strokeStyle = 'rgba(108,92,255,0.15)';
      ctx.lineWidth = 1 * devicePixelRatio;
      for (let i = 1; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(0, (h / 5) * i);
        ctx.lineTo(w, (h / 5) * i);
        ctx.stroke();
      }
      for (let i = 1; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo((w / 6) * i, 0);
        ctx.lineTo((w / 6) * i, h);
        ctx.stroke();
      }
      // trajetória
      if (pts.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(23,209,165,0.95)';
        ctx.lineWidth = 3 * devicePixelRatio;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.stroke();
        // glow sob a linha
        ctx.strokeStyle = 'rgba(23,209,165,0.25)';
        ctx.lineWidth = 8 * devicePixelRatio;
        ctx.stroke();
      }

      plane.style.left = `${px / devicePixelRatio - 14}px`;
      plane.style.top = `${py / devicePixelRatio - 14}px`;
      plane.style.transform = 'rotate(-25deg)';

      if (m < state.crashPoint) {
        state.rafId = requestAnimationFrame(tick);
      } else {
        crash();
      }
    };
    state.rafId = requestAnimationFrame(tick);
  }

  // ============== SAQUE ==============
  function cashOut() {
    if (state.phase !== 'flying' || !state.placed || state.cashed) return;
    state.cashed = true;
    const m = state.mult;
    const payout = Math.round(state.ticket.amount * m * 100) / 100;
    Wallet.payout(payout);
    Notify.win(`+ ${fmt(payout)} virtuais`, `Aviator — saque em ${m.toFixed(2)}x`);
    History.add({
      game: 'Aviator', bet: state.ticket.amount, payout,
      result: 'win', resultTag: m.toFixed(2), detail: `saque ${m.toFixed(2)}x`,
    });
    History.recordRound({ game: 'Aviator', bet: state.ticket.amount, payout, result: 'win', mult: m });
    History.recordAviator({ crashed: false, cashMult: m, crashMult: 0, cashAmount: payout });
    pushHistory(m);
    document.getElementById('av-cash-btn').disabled = true;
    document.getElementById('av-cash-btn').textContent = `SACADO ${fmt(payout)}`;
    setStatus(`Saque em ${m.toFixed(2)}x`);
    // voo continua até crash visualmente, mas já saiu
  }

  // ============== CRASH ==============
  function crash() {
    cancelAnimationFrame(state.rafId);
    const m = state.mult;
    state.phase = 'crashed';

    document.getElementById('av-mult').classList.add('crashed');
    document.getElementById('av-mult').textContent = `CRASH ${m.toFixed(2)}x`;
    const plane = document.getElementById('av-plane');
    plane.style.transition = 'opacity 300ms';
    plane.style.opacity = '0.3';

    if (state.placed && !state.cashed) {
      // aposta perdida
      Notify.loss(`- ${fmt(state.ticket.amount)} virtuais`, `Aviator — crash em ${m.toFixed(2)}x`);
      History.add({
        game: 'Aviator', bet: state.ticket.amount, payout: 0,
        result: 'loss', resultTag: m.toFixed(2), detail: `crash ${m.toFixed(2)}x`,
      });
      History.recordRound({ game: 'Aviator', bet: state.ticket.amount, payout: 0, result: 'loss', mult: m });
      History.recordAviator({ crashed: true, cashMult: 0, crashMult: m, cashAmount: 0 });
    } else {
      History.recordAviator({ crashed: true, cashMult: 0, crashMult: m, cashAmount: 0 });
    }
    pushHistory(m);

    document.getElementById('av-cash-btn').disabled = true;
    document.getElementById('av-cash-btn').textContent = 'SACAR';
    document.getElementById('av-bet-btn').disabled = true;
    setStatus(`Crash em ${m.toFixed(2)}x`);

    // próxima rodada após 2.5s
    setTimeout(() => {
      document.getElementById('av-plane').style.transition = '';
      beginBettingPhase();
    }, 2500);
  }

  function pushHistory(m) {
    state.history.unshift(Number(m.toFixed(2)));
    if (state.history.length > MAX_HISTORY) state.history.length = MAX_HISTORY;
    saveHistory(state.history);
    renderHistory();
  }

  // ============== REGRAS ==============
  function showRules() {
    window.App.openModal('Regras — Aviator', `
      <p><strong>Objetivo:</strong> sacar antes do avião cair.</p>
      <ul>
        <li>Fase de aposta: você tem alguns segundos para apostar.</li>
        <li>Ao decolar, o multiplicador começa em 1.00x e sobe continuamente.</li>
        <li>Saque em X garante aposta × X em créditos virtuais.</li>
        <li>Crash antes do saque: aposta perdida.</li>
        <li>Rodadas rodam automaticamente — há sempre uma nova rodada começando.</li>
      </ul>
      <p class="demo-note">Valores fictícios — sem valor monetário real.</p>
    `);
  }

  // hook de limpeza
  window.addEventListener('hashchange', () => {
    if (state && state.rafId) cancelAnimationFrame(state.rafId);
    if (state && state.countdown) clearInterval(state.countdown);
  });

  window.Aviator = { render, showRules };
})();
