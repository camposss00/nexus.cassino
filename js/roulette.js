// Roulette — modo completo: apostas múltiplas, vizinhos, colunas, dúzias
(function () {
  const REDS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
  const ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
  let state = null;

  function colorOf(n) { return n === 0 ? 'green' : (REDS.has(n) ? 'red' : 'black'); }

  function render() {
    const view = document.getElementById('view');
    view.innerHTML = `
      <div class="game-shell">
        <div class="game-header">
          <h1>Roleta</h1>
          <div class="tools">
            <button class="btn-ghost" id="r-rules"><i class="fa-solid fa-circle-info"></i> Regras</button>
            <button class="btn-ghost" id="r-clear">Limpar apostas</button>
          </div>
        </div>
        <p class="demo-note">DEMO — TODOS OS VALORES SÃO FICTÍCIOS E NÃO POSSUEM VALOR MONETÁRIO.</p>

        <div class="roulette-wrap">
          <div class="wheel-holder">
            <div style="position:relative">
              <div class="wheel-pointer"></div>
              <div class="wheel" id="r-wheel"></div>
            </div>
          </div>
          <div>
            <div class="bet-grid" id="r-grid"></div>
            <div class="controls" style="margin-top:12px">
              <div class="bet-amount">Ficha:</div>
              <div class="chip-grid" id="r-chips">
                <button class="chip active" data-amount="10">R$ 10</button>
                <button class="chip" data-amount="25">R$ 25</button>
                <button class="chip" data-amount="50">R$ 50</button>
                <button class="chip" data-amount="100">R$ 100</button>
                <button class="chip" data-amount="250">R$ 250</button>
                <button class="chip" data-amount="500">R$ 500</button>
              </div>
            </div>
            <div class="controls" style="margin-top:12px">
              <div class="bet-amount">Total apostado:</div>
              <span class="score-pill" id="r-total">R$ 0</span>
              <button class="btn-primary" id="r-spin" disabled style="margin-left:auto">GIRAR</button>
            </div>
            <div id="r-result" class="round-result hidden" style="margin-top:12px"></div>
          </div>
        </div>

        <div>
          <div class="section-title"><h2>Últimos números</h2></div>
          <div class="crash-history" id="r-history"></div>
        </div>
      </div>
    `;

    state = { chip: 10, bets: {}, running: false, results: [] };
    History.all().filter(h => h.game === 'Roleta').slice(0, 12).reverse().forEach(h => state.results.push(Number(h.resultTag)));
    renderHistory();

    const grid = document.getElementById('r-grid');
    let html = `<button class="bet-cell green" data-bet="zero">0 — Verde (36x)</button>`;
    for (let n = 1; n <= 36; n++) {
      const c = colorOf(n);
      html += `<button class="bet-cell ${c}" data-bet="num" data-num="${n}">${n}<span class="bet-marker" style="display:none"></span></button>`;
    }
    html += `
      <button class="bet-cell" data-bet="red" style="grid-column:span 3;background:#2a0f18;">VERMELHO (2x)</button>
      <button class="bet-cell" data-bet="black" style="grid-column:span 3;background:#0f0f14;">PRETO (2x)</button>
      <button class="bet-cell" data-bet="even" style="grid-column:span 2;">PAR (2x)</button>
      <button class="bet-cell" data-bet="odd" style="grid-column:span 2;">ÍMPAR (2x)</button>
      <button class="bet-cell" data-bet="low" style="grid-column:span 2;">1–18 (2x)</button>
      <button class="bet-cell" data-bet="high" style="grid-column:span 3;">19–36 (2x)</button>
      <button class="bet-cell" data-bet="dozen1" style="grid-column:span 2;">1ª dúzia (3x)</button>
      <button class="bet-cell" data-bet="dozen2" style="grid-column:span 2;">2ª dúzia (3x)</button>
      <button class="bet-cell" data-bet="dozen3" style="grid-column:span 2;">3ª dúzia (3x)</button>
      <button class="bet-cell" data-bet="col1" style="grid-column:span 2;">Col. 1 (3x)</button>
      <button class="bet-cell" data-bet="col2" style="grid-column:span 2;">Col. 2 (3x)</button>
      <button class="bet-cell" data-bet="col3" style="grid-column:span 2;">Col. 3 (3x)</button>
    `;
    grid.innerHTML = html;

    grid.querySelectorAll('.bet-cell').forEach(b => {
      b.addEventListener('click', () => {
        if (state.running) return;
        const key = b.dataset.bet === 'num' ? `num-${b.dataset.num}` : b.dataset.bet;
        const amount = state.chip;
        // valida saldo considerando total apostado já
        const totalNow = totalBets();
        const wallet = Wallet.get();
        if (totalNow + amount > wallet.balance) {
          Notify.warn('Saldo insuficiente', 'Apostas somadas excedem o saldo.');
          return;
        }
        state.bets[key] = (state.bets[key] || 0) + amount;
        const marker = b.querySelector('.bet-marker');
        if (marker) {
          marker.style.display = 'inline';
          marker.textContent = state.bets[key];
        } else {
          b.dataset.amount = state.bets[key];
          b.style.boxShadow = '0 0 0 2px var(--gold)';
          b.title = `Apostado: R$ ${state.bets[key]}`;
        }
        updateTotals();
      });
    });
    view.querySelectorAll('#r-chips .chip').forEach(c => {
      c.addEventListener('click', () => {
        if (state.running) return;
        view.querySelectorAll('#r-chips .chip').forEach(x => x.classList.remove('active'));
        c.classList.add('active');
        state.chip = Number(c.dataset.amount);
      });
    });
    document.getElementById('r-spin').addEventListener('click', spin);
    document.getElementById('r-rules').addEventListener('click', showRules);
    document.getElementById('r-clear').addEventListener('click', clearBets);
    updateTotals();
  }

  function totalBets() {
    return Object.values(state.bets).reduce((a, b) => a + b, 0);
  }

  function updateTotals() {
    const t = totalBets();
    document.getElementById('r-total').textContent = t.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const spinBtn = document.getElementById('r-spin');
    const w = Wallet.get();
    spinBtn.disabled = state.running || t === 0 || t > w.balance;
    spinBtn.textContent = state.running ? 'GIRANDO…' : `GIRAR R$ ${t}`;
  }

  function clearBets() {
    if (state.running) return;
    state.bets = {};
    document.querySelectorAll('#r-grid .bet-cell').forEach(b => {
      const marker = b.querySelector('.bet-marker');
      if (marker) { marker.style.display = 'none'; marker.textContent = ''; }
      b.style.boxShadow = '';
      b.title = '';
      b.removeAttribute('data-amount');
    });
    updateTotals();
  }

  function renderHistory() {
    const el = document.getElementById('r-history');
    el.innerHTML = state.results.map(n => {
      const c = colorOf(n);
      const bg = c === 'red' ? 'background:#2a0f18;' : c === 'black' ? 'background:#0f0f14;' : 'background:#0c2218;';
      return `<span class="crash-chip" style="${bg}">${n}</span>`;
    }).join('');
  }
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function payoutFor(key, n) {
    const c = colorOf(n);
    if (key.startsWith('num-')) {
      const target = Number(key.split('-')[1]);
      if (target === n) return 36;
      // neighbours: se caiu em um vizinho direto, paga 18x (aposta de vizinhos simplificada)
      const idx = ORDER.indexOf(target);
      const prev = ORDER[(idx - 1 + 37) % 37];
      const next = ORDER[(idx + 1) % 37];
      if (n === prev || n === next) return 18;
      return 0;
    }
    switch (key) {
      case 'zero': return n === 0 ? 36 : 0;
      case 'red': return c === 'red' ? 2 : 0;
      case 'black': return c === 'black' ? 2 : 0;
      case 'even': return n !== 0 && n % 2 === 0 ? 2 : 0;
      case 'odd': return n !== 0 && n % 2 === 1 ? 2 : 0;
      case 'low': return n >= 1 && n <= 18 ? 2 : 0;
      case 'high': return n >= 19 && n <= 36 ? 2 : 0;
      case 'dozen1': return n >= 1 && n <= 12 ? 3 : 0;
      case 'dozen2': return n >= 13 && n <= 24 ? 3 : 0;
      case 'dozen3': return n >= 25 && n <= 36 ? 3 : 0;
      case 'col1': return n !== 0 && n % 3 === 1 ? 3 : 0;
      case 'col2': return n !== 0 && n % 3 === 2 ? 3 : 0;
      case 'col3': return n !== 0 && n % 3 === 0 ? 3 : 0;
      default: return 0;
    }
  }

  async function spin() {
    if (state.running) return;
    const total = totalBets();
    if (total === 0) { Notify.warn('Sem apostas', 'Escolha pelo menos uma posição.'); return; }
    const ticket = Wallet.placeBet(total, 'Roleta');
    if (!ticket) { Notify.warn('Saldo insuficiente', 'Ajuste as apostas.'); return; }
    state.running = true;
    updateTotals();
    document.getElementById('r-result').classList.add('hidden');

    const n = Math.floor(Math.random() * 37);
    const idx = ORDER.indexOf(n);
    const targetAngle = 360 * 6 + (360 - (idx / 37) * 360);
    const wheel = document.getElementById('r-wheel');
    wheel.style.transform = `rotate(${targetAngle}deg)`;
    await sleep(4100);

    // destaca o vencedor
    document.querySelectorAll('#r-grid .bet-cell').forEach(b => b.style.outline = '');
    const winCell = document.querySelector(`#r-grid [data-num="${n}"]`) || document.querySelector(`#r-grid [data-bet="zero"]`);
    if (winCell) winCell.style.outline = '2px solid var(--gold)';

    let totalPayout = 0;
    for (const [key, amount] of Object.entries(state.bets)) {
      const m = payoutFor(key, n);
      if (m) totalPayout += Math.round(amount * m * 100) / 100;
    }
    let resultType = totalPayout > 0 ? 'win' : 'loss';
    if (totalPayout > 0) Wallet.payout(totalPayout);

    const el = document.getElementById('r-result');
    el.classList.remove('hidden','win','loss');
    const c = colorOf(n);
    if (resultType === 'win') {
      el.classList.add('win');
      el.textContent = `NÚMERO ${n} (${c}) — +${fmt(totalPayout)} virtuais`;
      Notify.win(`+ ${fmt(totalPayout)} virtuais`, `Roleta — ${n} ${c}`);
    } else {
      el.classList.add('loss');
      el.textContent = `NÚMERO ${n} (${c}) — aposta perdida.`;
      Notify.loss(`- ${fmt(total)} virtuais`, `Roleta — ${n} ${c}`);
    }

    History.add({
      game: 'Roleta', bet: total, payout: totalPayout,
      result: resultType, resultTag: n, detail: `#${n} ${c}`,
    });
    History.recordRound({ game: 'Roleta', bet: total, payout: totalPayout, result: resultType });
    state.results.unshift(n);
    if (state.results.length > 12) state.results.length = 12;
    renderHistory();

    // limpa após a rodada
    setTimeout(() => {
      state.bets = {};
      clearBets();
      state.running = false;
      updateTotals();
    }, 800);
  }

  function fmt(n) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

  function showRules() {
    window.App.openModal('Regras — Roleta', `
      <p><strong>Objetivo:</strong> apostar em múltiplas posições antes de girar. Cada posição que casa paga conforme a tabela.</p>
      <ul>
        <li>Número exato 36x · vizinhos diretos 18x (aposta em número paga bônus de vizinhança).</li>
        <li>Vermelho/Preto/Par/Ímpar/1–18/19–36: 2x · Dúzias 3x · Colunas 3x · Zero 36x.</li>
        <li>Múltiplas apostas na mesma rodada: apostas somadas, apostas independentes avaliadas.</li>
      </ul>
      <p class="demo-note">Valores fictícios — sem valor monetário real.</p>
    `);
  }

  window.Roulette = { render, showRules };
})();
