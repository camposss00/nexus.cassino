// Bac Bo — modo avançado: 4 dados, somas, pares, histórico
(function () {
  let state = null;

  function roll() { return 1 + Math.floor(Math.random() * 6); }

  function render() {
    const view = document.getElementById('view');
    view.innerHTML = `
      <div class="game-shell">
        <div class="game-header">
          <h1>Bac Bo</h1>
          <div class="tools">
            <button class="btn-ghost" id="bb-rules"><i class="fa-solid fa-circle-info"></i> Regras</button>
          </div>
        </div>
        <p class="demo-note">DEMO — TODOS OS VALORES SÃO FICTÍCIOS E NÃO POSSUEM VALOR MONETÁRIO.</p>

        <div class="table-stage">
          <div class="hand-row">
            <span class="hand-label">Player</span>
            <div class="dice-row" id="bb-player"></div>
            <span class="score-pill" id="bb-p-score">—</span>
          </div>
          <div class="hand-row">
            <span class="hand-label">Banker</span>
            <div class="dice-row" id="bb-banker"></div>
            <span class="score-pill" id="bb-b-score">—</span>
          </div>
          <div id="bb-result" class="round-result hidden"></div>
        </div>

        <div class="stats-inline" id="bb-stats">
          <div class="cell"><div class="k">Rodadas</div><div class="v" id="bb-rounds">0</div></div>
          <div class="cell"><div class="k">Player</div><div class="v" id="bb-wp">0</div></div>
          <div class="cell"><div class="k">Banker</div><div class="v" id="bb-wb">0</div></div>
          <div class="cell"><div class="k">Ties</div><div class="v" id="bb-wt">0</div></div>
          <div class="cell"><div class="k">Pares</div><div class="v" id="bb-pairs">0</div></div>
        </div>

        <div class="controls">
          <div class="bet-amount">Aposta:</div>
          <div class="chip-grid" id="bb-chips">
            <button class="chip" data-amount="10">R$ 10</button>
            <button class="chip active" data-amount="25">R$ 25</button>
            <button class="chip" data-amount="50">R$ 50</button>
            <button class="chip" data-amount="100">R$ 100</button>
            <button class="chip" data-amount="250">R$ 250</button>
            <button class="chip" data-amount="500">R$ 500</button>
          </div>
        </div>

        <div class="controls">
          <div class="bet-amount">Aposta em:</div>
          <button class="btn-ghost side-btn" data-side="player">PLAYER (2x)</button>
          <button class="btn-ghost side-btn" data-side="banker">BANKER (1.95x)</button>
          <button class="btn-ghost side-btn" data-side="tie">TIE (8x)</button>
          <button class="btn-ghost side-btn" data-side="p_pair">PAR PLAYER (5x)</button>
          <button class="btn-ghost side-btn" data-side="b_pair">PAR BANKER (5x)</button>
          <button class="btn-primary" id="bb-play" disabled>LANÇAR</button>
        </div>

        <div>
          <div class="section-title"><h2>Últimos resultados</h2></div>
          <div class="crash-history" id="bb-history"></div>
        </div>
      </div>
    `;

    state = {
      bet: 25, side: null, running: false, results: [],
      stats: { rounds: 0, wp: 0, wb: 0, wt: 0, pairs: 0 },
    };
    History.all().filter(h => h.game === 'Bac Bo').slice(0, 20).reverse().forEach(h => {
      const t = h.resultTag;
      if (['player','banker','tie'].includes(t)) state.results.push(t);
    });
    const stored = History.stats().byGame['Bac Bo'] || 0;
    state.stats.rounds = stored;
    renderHistory();
    renderStats();

    if (Difficulty.isEasy()) {
      view.querySelectorAll('[data-side="p_pair"],[data-side="b_pair"]').forEach(b => b.style.display = 'none');
    }

    view.querySelectorAll('#bb-chips .chip').forEach(c => {
      c.addEventListener('click', () => {
        if (state.running) return;
        view.querySelectorAll('#bb-chips .chip').forEach(x => x.classList.remove('active'));
        c.classList.add('active');
        state.bet = Number(c.dataset.amount);
        updatePlayButton();
      });
    });
    view.querySelectorAll('.side-btn').forEach(b => {
      b.addEventListener('click', () => {
        if (state.running) return;
        view.querySelectorAll('.side-btn').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        state.side = b.dataset.side;
        updatePlayButton();
      });
    });
    document.getElementById('bb-play').addEventListener('click', play);
    document.getElementById('bb-rules').addEventListener('click', showRules);
  }

  function updatePlayButton() {
    const btn = document.getElementById('bb-play');
    const w = Wallet.get();
    btn.disabled = state.running || !state.side || state.bet > w.balance;
    btn.textContent = state.running ? 'LANÇANDO…' : `LANÇAR R$ ${state.bet}`;
  }
  function renderHistory() {
    const el = document.getElementById('bb-history');
    if (!el) return;
    const labels = { player: 'PLAYER', banker: 'BANKER', tie: 'TIE' };
    el.innerHTML = state.results.map(t => `<span class="crash-chip ${t === 'player' ? 'low' : t === 'banker' ? 'mid' : 'high'}">${labels[t] || t}</span>`).join('');
  }
  function renderStats() {
    document.getElementById('bb-rounds').textContent = state.stats.rounds;
    document.getElementById('bb-wp').textContent = state.stats.wp;
    document.getElementById('bb-wb').textContent = state.stats.wb;
    document.getElementById('bb-wt').textContent = state.stats.wt;
    document.getElementById('bb-pairs').textContent = state.stats.pairs;
  }

  function dieEl(v, rolling) {
    return `<div class="die ${rolling ? 'rolling' : ''}">${v ?? '?'}</div>`;
  }
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function play() {
    if (state.running || !state.side) return;
    const ticket = Wallet.placeBet(state.bet, 'Bac Bo');
    if (!ticket) { Notify.warn('Saldo insuficiente', 'Ajuste a aposta.'); return; }
    state.running = true;
    updatePlayButton();
    document.getElementById('bb-result').classList.add('hidden');

    const pEl = document.getElementById('bb-player');
    const bEl = document.getElementById('bb-banker');

    // animação com rolling nos 4 dados
    const p1 = roll(), p2 = roll(), b1 = roll(), b2 = roll();
    pEl.innerHTML = dieEl('?', true) + dieEl('?', true);
    bEl.innerHTML = dieEl('?', true) + dieEl('?', true);
    await sleep(700);
    pEl.innerHTML = dieEl(p1) + dieEl('?', true);
    bEl.innerHTML = dieEl(b1) + dieEl('?', true);
    await sleep(400);
    pEl.innerHTML = dieEl(p1) + dieEl(p2);
    bEl.innerHTML = dieEl(b1) + dieEl(b2);

    const ps = p1 + p2, bs = b1 + b2;
    const pPair = p1 === p2, bPair = b1 === b2;
    document.getElementById('bb-p-score').textContent = ps;
    document.getElementById('bb-b-score').textContent = bs;

    let winner = ps === bs ? 'tie' : (ps > bs ? 'player' : 'banker');
    const mults = { player: 2, banker: 1.95, tie: 8, p_pair: 5, b_pair: 5 };
    const side = state.side;
    const sideWins =
      (side === 'player' && winner === 'player') ||
      (side === 'banker' && winner === 'banker') ||
      (side === 'tie' && winner === 'tie') ||
      (side === 'p_pair' && pPair) ||
      (side === 'b_pair' && bPair);

    let payout = 0, resultType = 'loss';
    if (sideWins) {
      payout = Math.round(ticket.amount * mults[side] * 100) / 100;
      Wallet.payout(payout);
      resultType = 'win';
    } else if (winner === 'tie' && (side === 'player' || side === 'banker')) {
      payout = ticket.amount;
      Wallet.payout(payout);
      resultType = 'push';
    }

    // stats
    state.stats.rounds += 1;
    if (winner === 'player') state.stats.wp += 1;
    else if (winner === 'banker') state.stats.wb += 1;
    else state.stats.wt += 1;
    if (pPair || bPair) state.stats.pairs += 1;
    renderStats();

    const el = document.getElementById('bb-result');
    el.classList.remove('hidden','win','loss','push');
    if (resultType === 'win') {
      el.classList.add('win');
      el.textContent = `${side.toUpperCase().replace('_',' ')} venceu — ${fmt(payout)} virtuais`;
      Notify.win(`+ ${fmt(payout)} virtuais`, 'Bac Bo — vitória');
    } else if (resultType === 'push') {
      el.classList.add('push');
      el.textContent = `Empate — aposta devolvida.`;
      Notify.info('Aposta devolvida', 'Bac Bo — empate');
    } else {
      el.classList.add('loss');
      el.textContent = `${winner.toUpperCase()} venceu — aposta perdida.`;
      Notify.loss(`- ${fmt(ticket.amount)} virtuais`, 'Bac Bo — derrota');
    }

    History.add({
      game: 'Bac Bo', bet: ticket.amount, payout,
      result: resultType, resultTag: winner,
      detail: `P:${p1}+${p2}=${ps} B:${b1}+${b2}=${bs}${pPair ? ' PP' : ''}${bPair ? ' BP' : ''}`,
    });
    History.recordRound({ game: 'Bac Bo', bet: ticket.amount, payout, result: resultType });

    state.results.unshift(winner);
    if (state.results.length > 12) state.results.length = 12;
    renderHistory();

    state.running = false;
    updatePlayButton();
  }

  function fmt(n) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

  function showRules() {
    window.App.openModal('Regras — Bac Bo', `
      <p><strong>Objetivo:</strong> dois dados para Player e dois para Banker. Soma maior vence.</p>
      <ul>
        <li>Player 2x · Banker 1,95x · Tie 8x · Par 5x.</li>
        <li>Empate devolve aposta de Player/Banker.</li>
        <li>Par: os dois dados do lado saem com o mesmo valor.</li>
      </ul>
      <p class="demo-note">Valores fictícios — sem valor monetário real.</p>
    `);
  }

  window.BacBo = { render, showRules };
})();
