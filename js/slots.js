// Slots — 5×3, 10 símbolos, wild, scatter, free spins, 5 linhas
(function () {
  const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '🔔', '⭐', '💎', '7️⃣', '🃏', '🎁'];
  const WILD = '🃏';
  const SCATTER = '🎁';
  const WEIGHTS = [22, 20, 18, 14, 10, 6, 4, 2, 2, 2];
  const TOTAL = WEIGHTS.reduce((a,b) => a+b, 0);
  // linhas: [ [reel,col], ... ] para 5 rolos × 3 linhas
  const LINES = [
    [[0,1],[1,1],[2,1],[3,1],[4,1]], // meio
    [[0,0],[1,0],[2,0],[3,0],[4,0]], // topo
    [[0,2],[1,2],[2,2],[3,2],[4,2]], // base
    [[0,0],[1,1],[2,2],[3,1],[4,0]], // V
    [[0,2],[1,1],[2,0],[3,1],[4,2]], // Λ
  ];
  const LINE_PAYS = {
    3: 2, 4: 5, 5: 15,
  };
  const SYM_MULT = {
    '🍒': 1, '🍋': 1, '🍊': 1, '🍇': 1.2,
    '🔔': 1.5, '⭐': 2, '💎': 3, '7️⃣': 5,
  };

  let state = null;

  function pickSymbol() {
    let r = Math.random() * TOTAL;
    for (let i = 0; i < SYMBOLS.length; i++) {
      r -= WEIGHTS[i];
      if (r <= 0) return SYMBOLS[i];
    }
    return SYMBOLS[0];
  }

  function render() {
    const view = document.getElementById('view');
    const easy = Difficulty.isEasy();
    const linesToShow = easy ? 3 : 5;

    view.innerHTML = `
      <div class="game-shell">
        <div class="game-header">
          <h1>Caça-Níquel</h1>
          <div class="tools">
            <button class="btn-ghost" id="sl-rules"><i class="fa-solid fa-circle-info"></i> Regras</button>
          </div>
        </div>
        <p class="demo-note">DEMO — TODOS OS VALORES SÃO FICTÍCIOS E NÃO POSSUEM VALOR MONETÁRIO.</p>

        <div class="slots-machine">
          <div class="reels" id="sl-reels"></div>
          <div id="sl-result" class="round-result hidden"></div>
          <div class="stats-inline">
            <div class="cell"><div class="k">Linhas</div><div class="v">${linesToShow}</div></div>
            <div class="cell"><div class="k">Free spins</div><div class="v" id="sl-fs">0</div></div>
            <div class="cell"><div class="k">Multiplicador</div><div class="v" id="sl-mult">1x</div></div>
          </div>
          <div class="controls">
            <div class="bet-amount">Aposta (por linha):</div>
            <div class="chip-grid" id="sl-chips">
              <button class="chip" data-amount="1">R$ 1</button>
              <button class="chip active" data-amount="5">R$ 5</button>
              <button class="chip" data-amount="10">R$ 10</button>
              <button class="chip" data-amount="25">R$ 25</button>
              <button class="chip" data-amount="50">R$ 50</button>
            </div>
            <button class="btn-primary" id="sl-spin" style="margin-left:auto">GIRAR</button>
          </div>
          <div>
            <div class="section-title"><h2>Tabela (por linha)</h2></div>
            <table class="paytable">
              <thead><tr><th>Símbolo</th><th>3</th><th>4</th><th>5</th></tr></thead>
              <tbody>
                <tr><td>🍒 🍋 🍊 🍇</td><td>2x</td><td>5x</td><td>15x</td></tr>
                <tr><td>🔔 ⭐</td><td>3x</td><td>6x</td><td>18x</td></tr>
                <tr><td>💎 7️⃣</td><td>5x</td><td>12x</td><td>40x</td></tr>
                <tr><td>🃏 Wild</td><td colspan="3">substitui qualquer símbolo (exceto Scatter)</td></tr>
                <tr><td>🎁 Scatter</td><td colspan="3">3+ espalhados: 5 free spins</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    state = { bet: 5, running: false, lines: linesToShow, grid: null, freeSpins: 0, mult: 1 };

    const reels = document.getElementById('sl-reels');
    reels.innerHTML = Array.from({ length: 5 }).map((_, i) => `
      <div class="reel-column" data-col="${i}">
        ${Array.from({ length: 3 }).map((_, j) => `<div class="reel-cell" data-col="${i}" data-row="${j}">${pickSymbol()}</div>`).join('')}
      </div>
    `).join('');

    view.querySelectorAll('#sl-chips .chip').forEach(c => {
      c.addEventListener('click', () => {
        if (state.running) return;
        view.querySelectorAll('#sl-chips .chip').forEach(x => x.classList.remove('active'));
        c.classList.add('active');
        state.bet = Number(c.dataset.amount);
        updateSpin();
      });
    });
    document.getElementById('sl-spin').addEventListener('click', spin);
    document.getElementById('sl-rules').addEventListener('click', showRules);
    updateSpin();
  }

  function updateSpin() {
    const btn = document.getElementById('sl-spin');
    const w = Wallet.get();
    const cost = state.bet * state.lines;
    btn.disabled = state.running || cost > w.balance;
    btn.textContent = state.running ? 'GIRANDO…' : `GIRAR R$ ${cost}`;
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function spin() {
    if (state.running) return;
    const cost = state.bet * state.lines;
    const ticket = Wallet.placeBet(cost, 'Slots');
    if (!ticket) { Notify.warn('Saldo insuficiente', 'Ajuste a aposta.'); return; }
    state.running = true;
    updateSpin();
    document.getElementById('sl-result').classList.add('hidden');
    document.querySelectorAll('.reel-cell.win').forEach(c => c.classList.remove('win'));

    await runSpin();

    const grid = state.grid;
    const { total, wins } = evaluateGrid(grid);

    // scatter → free spins
    const scatterCount = grid.flat().filter(s => s === SCATTER).length;
    let freeSpinsAwarded = 0;
    if (scatterCount >= 3 && state.freeSpins === 0) {
      freeSpinsAwarded = 5;
      state.freeSpins += 5;
      document.getElementById('sl-fs').textContent = state.freeSpins;
      Notify.info(`+${freeSpinsAwarded} free spins`, '3+ 🎁 scatter');
    }

    let payout = total;
    if (payout > 0) {
      Wallet.payout(payout);
    }

    const el = document.getElementById('sl-result');
    el.classList.remove('hidden','win','loss');
    if (payout > 0) {
      el.classList.add('win');
      el.textContent = `Ganhou ${fmt(payout)} virtuais — ${wins} linha(s) vencedora(s)`;
      Notify.win(`+ ${fmt(payout)} virtuais`, 'Slots — vitória');
      History.add({ game: 'Slots', bet: cost, payout, result: 'win', resultTag: `${wins}L`, detail: `${wins} linha(s)` });
      History.recordRound({ game: 'Slots', bet: cost, payout, result: 'win' });
    } else {
      el.classList.add('loss');
      el.textContent = `Sem combinação — aposta perdida.`;
      Notify.loss(`- ${fmt(cost)} virtuais`, 'Slots');
      History.add({ game: 'Slots', bet: cost, payout: 0, result: 'loss', resultTag: 'x', detail: 'sem combinação' });
      History.recordRound({ game: 'Slots', bet: cost, payout: 0, result: 'loss' });
    }

    // consome free spin se houver e não foi pago
    if (state.freeSpins > 0 && freeSpinsAwarded === 0) {
      state.freeSpins -= 1;
      document.getElementById('sl-fs').textContent = state.freeSpins;
    }

    state.running = false;
    updateSpin();

    // auto-spin se ainda há free spins
    if (state.freeSpins > 0) {
      setTimeout(() => { if (state.freeSpins > 0 && !state.running) spin(); }, 800);
    }
  }

  async function runSpin() {
    // constrói grid final
    const finalGrid = [];
    for (let c = 0; c < 5; c++) {
      finalGrid.push([pickSymbol(), pickSymbol(), pickSymbol()]);
    }
    state.grid = finalGrid;

    // anima cada rolo
    for (let c = 0; c < 5; c++) {
      const cells = document.querySelectorAll(`.reel-cell[data-col="${c}"]`);
      cells.forEach(cell => cell.classList.add('spin'));
      const dur = 400 + c * 150;
      const start = Date.now();
      while (Date.now() - start < dur) {
        cells.forEach(cell => { cell.textContent = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]; });
        await sleep(60);
      }
      cells.forEach((cell, idx) => {
        cell.classList.remove('spin');
        cell.textContent = finalGrid[c][idx];
      });
    }
  }

  function evaluateGrid(grid) {
    let total = 0;
    let winCount = 0;
    const lineIdx = state.lines === 3 ? [0,1,2] : [0,1,2,3,4];

    for (const li of lineIdx) {
      const line = LINES[li];
      const symbols = line.map(([c, r]) => grid[c][r]);
      // avalia maior sequência a partir do primeiro
      const first = symbols[0] === WILD ? symbols.find(s => s !== WILD) || symbols[0] : symbols[0];
      if (!first || first === SCATTER) continue;

      let count = 0;
      for (let i = 0; i < symbols.length; i++) {
        if (symbols[i] === first || symbols[i] === WILD) count++;
        else break;
      }
      if (count >= 3) {
        const symMult = SYM_MULT[first] || 1;
        const lineMult = LINE_PAYS[count];
        const win = state.bet * lineMult * symMult;
        total += Math.round(win * 100) / 100;
        winCount++;
        // destaca a linha
        for (let i = 0; i < count; i++) {
          const [c, r] = line[i];
          const cell = document.querySelector(`.reel-cell[data-col="${c}"][data-row="${r}"]`);
          if (cell) cell.classList.add('win');
        }
      }
    }
    return { total, wins: winCount };
  }

  function fmt(n) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

  function showRules() {
    window.App.openModal('Regras — Caça-Níquel', `
      <p><strong>Objetivo:</strong> alinhar símbolos iguais a partir do rolo 1 em qualquer linha ativa.</p>
      <ul>
        <li>5 rolos × 3 linhas. Linhas 4 e 5 (V e Λ) só em dificuldade Normal/Avançado.</li>
        <li>Wild 🃏 substitui qualquer símbolo (exceto Scatter).</li>
        <li>Scatter 🎁 3+ espalhados concedem 5 free spins virtuais.</li>
        <li>Pagamento por linha: 3 = 2x, 4 = 5x, 5 = 15x, modulado pelo símbolo.</li>
      </ul>
      <p class="demo-note">Valores fictícios — sem valor monetário real.</p>
    `);
  }

  window.Slots = { render, showRules };
})();
