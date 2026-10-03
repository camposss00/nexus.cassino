// Baccarat — modo avançado: Pair, Perfect Pair, bead history, stats, contador
(function () {
  const SUITS = ['♠', '♥', '♦', '♣'];
  const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  const RED = new Set(['♥','♦']);
  const SHOE_SIZE = 8; // 8 decks

  let state = null;

  function buildShoe() {
    const shoe = [];
    for (let d = 0; d < SHOE_SIZE; d++) {
      for (const s of SUITS) for (const r of RANKS) shoe.push({ suit: s, rank: r, red: RED.has(s) });
    }
    for (let i = shoe.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
    }
    return shoe;
  }

  function cardValue(r) {
    if (r === 'A') return 1;
    if (['10','J','Q','K'].includes(r)) return 0;
    return Number(r);
  }
  function total(hand) { return hand.reduce((a, c) => a + cardValue(c.rank), 0) % 10; }
  function isPair(hand) { return hand.length >= 2 && hand[0].rank === hand[1].rank; }
  function isPerfectPair(hand) {
    return hand.length >= 2 && hand[0].rank === hand[1].rank && hand[0].suit === hand[1].suit;
  }

  function renderCard(c, hidden) {
    if (hidden) return `<div class="card back"><div class="top"></div><div class="mid"></div><div class="bot"></div></div>`;
    return `<div class="card ${c.red ? 'red' : ''}">
      <div class="top">${c.rank}${c.suit}</div>
      <div class="mid">${c.suit}</div>
      <div class="bot">${c.rank}${c.suit}</div>
    </div>`;
  }

  function render() {
    const view = document.getElementById('view');
    view.innerHTML = `
      <div class="game-shell">
        <div class="game-header">
          <h1>Baccarat</h1>
          <div class="tools">
            <button class="btn-ghost" id="b-rules"><i class="fa-solid fa-circle-info"></i> Regras</button>
          </div>
        </div>
        <p class="demo-note">DEMO — TODOS OS VALORES SÃO FICTÍCIOS E NÃO POSSUEM VALOR MONETÁRIO.</p>

        <div class="table-stage green">
          <div class="hand-row">
            <span class="hand-label">Player</span>
            <div id="b-player" class="dice-row"></div>
            <span class="score-pill" id="b-player-score">0</span>
          </div>
          <div class="hand-row">
            <span class="hand-label">Banker</span>
            <div id="b-banker" class="dice-row"></div>
            <span class="score-pill" id="b-banker-score">0</span>
          </div>
          <div id="b-result" class="round-result hidden"></div>
        </div>

        <div class="stats-inline" id="b-stats">
          <div class="cell"><div class="k">Player</div><div class="v" id="b-stat-p">0</div></div>
          <div class="cell"><div class="k">Banker</div><div class="v" id="b-stat-b">0</div></div>
          <div class="cell"><div class="k">Ties</div><div class="v" id="b-stat-t">0</div></div>
          <div class="cell"><div class="k">Pares</div><div class="v" id="b-stat-pair">0</div></div>
          <div class="cell"><div class="k">Rodada</div><div class="v" id="b-stat-round">0</div></div>
        </div>

        <div>
          <div class="section-title"><h2>Bead road</h2></div>
          <div class="beads" id="b-beads"></div>
        </div>

        <div class="controls">
          <div class="bet-amount">Aposta:</div>
          <div class="chip-grid" id="b-chips">
            <button class="chip" data-amount="10">R$ 10</button>
            <button class="chip active" data-amount="25">R$ 25</button>
            <button class="chip" data-amount="50">R$ 50</button>
            <button class="chip" data-amount="100">R$ 100</button>
            <button class="chip" data-amount="250">R$ 250</button>
            <button class="chip" data-amount="500">R$ 500</button>
          </div>
        </div>

        <div class="controls" id="b-side-panel">
          <div class="bet-amount">Aposta em:</div>
          <button class="btn-ghost side-btn" data-side="player">PLAYER (2x)</button>
          <button class="btn-ghost side-btn" data-side="banker">BANKER (1.95x)</button>
          <button class="btn-ghost side-btn" data-side="tie">TIE (9x)</button>
          <button class="btn-ghost side-btn" data-side="p_pair">PAR PLAYER (11x)</button>
          <button class="btn-ghost side-btn" data-side="b_pair">PAR BANKER (11x)</button>
          <button class="btn-ghost side-btn" data-side="pp_pair">PERFECT PAIR (25x)</button>
          <button class="btn-primary" id="b-play" disabled>APOSTAR</button>
        </div>
      </div>
    `;

    const stats0 = History.stats().byGame['Baccarat'] || 0;
    state = {
      bet: 25, side: null, running: false,
      shoe: buildShoe(),
      beadHistory: [],
      stats: { p: 0, b: 0, t: 0, pairs: 0, rounds: 0 },
    };
    // hidrata bead history a partir do histórico persistido
    History.all().filter(h => h.game === 'Baccarat').slice(0, 40).reverse().forEach(h => {
      const t = (h.resultTag || '').toLowerCase();
      if (['player','banker','tie'].includes(t)) state.beadHistory.push(t);
    });
    state.stats.rounds = stats0;

    renderStats();
    renderBeads();

    // dificuldade: modo fácil esconde pares
    if (Difficulty.isEasy()) {
      view.querySelectorAll('[data-side="p_pair"],[data-side="b_pair"],[data-side="pp_pair"]').forEach(b => b.style.display = 'none');
    }

    view.querySelectorAll('#b-chips .chip').forEach(c => {
      c.addEventListener('click', () => {
        if (state.running) return;
        view.querySelectorAll('#b-chips .chip').forEach(x => x.classList.remove('active'));
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
    document.getElementById('b-play').addEventListener('click', play);
    document.getElementById('b-rules').addEventListener('click', showRules);
  }

  function updatePlayButton() {
    const btn = document.getElementById('b-play');
    const w = Wallet.get();
    btn.disabled = state.running || !state.side || state.bet > w.balance;
    btn.textContent = state.running ? 'DISTRIBUINDO…' : `APOSTAR R$ ${state.bet}`;
  }

  function renderStats() {
    document.getElementById('b-stat-p').textContent = state.stats.p;
    document.getElementById('b-stat-b').textContent = state.stats.b;
    document.getElementById('b-stat-t').textContent = state.stats.t;
    document.getElementById('b-stat-pair').textContent = state.stats.pairs;
    document.getElementById('b-stat-round').textContent = state.stats.rounds;
  }
  function renderBeads() {
    const el = document.getElementById('b-beads');
    if (!el) return;
    el.innerHTML = state.beadHistory.slice(-60).map(t => {
      const cls = t === 'player' ? 'p' : t === 'banker' ? 'b' : 't';
      const ch = t === 'player' ? 'P' : t === 'banker' ? 'B' : 'T';
      return `<div class="bead ${cls}">${ch}</div>`;
    }).join('');
    el.scrollTop = el.scrollHeight;
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function drawFromShoe() {
    if (state.shoe.length < 20) state.shoe = buildShoe();
    return state.shoe.pop();
  }

  function renderHands(p, b, hideSecond) {
    document.getElementById('b-player').innerHTML = p.map(c => renderCard(c)).join('');
    document.getElementById('b-banker').innerHTML = b.map((c, i) => renderCard(c, hideSecond && i === 1)).join('');
    document.getElementById('b-player-score').textContent = total(p);
    document.getElementById('b-banker-score').textContent = hideSecond ? (b[0] ? cardValue(b[0].rank) : 0) : total(b);
  }

  async function play() {
    if (state.running || !state.side) return;
    const ticket = Wallet.placeBet(state.bet, 'Baccarat');
    if (!ticket) { Notify.warn('Saldo insuficiente', 'Ajuste a aposta.'); return; }
    state.running = true;
    updatePlayButton();
    document.getElementById('b-result').classList.add('hidden');

    const p = [], b = [];
    p.push(drawFromShoe()); b.push(drawFromShoe());
    renderHands(p, b, true);
    await sleep(260);
    p.push(drawFromShoe()); b.push(drawFromShoe());
    renderHands(p, b, true);
    await sleep(260);
    renderHands(p, b, false);
    await sleep(180);

    let pt = total(p), bt = total(b);
    let playerDrew = false;
    if (pt < 8 && bt < 8) {
      if (pt <= 5) { p.push(drawFromShoe()); playerDrew = true; renderHands(p, b, false); await sleep(260); pt = total(p); }
      const third = playerDrew ? cardValue(p[2].rank) : null;
      if (bt <= 2) { b.push(drawFromShoe()); renderHands(p, b, false); await sleep(260); bt = total(b); }
      else if (bt === 3 && (!playerDrew || third !== 8)) { b.push(drawFromShoe()); renderHands(p, b, false); await sleep(260); bt = total(b); }
      else if (bt === 4 && playerDrew && third !== null && third >= 2 && third <= 7) { b.push(drawFromShoe()); renderHands(p, b, false); await sleep(260); bt = total(b); }
      else if (bt === 5 && playerDrew && third !== null && third >= 4 && third <= 7) { b.push(drawFromShoe()); renderHands(p, b, false); await sleep(260); bt = total(b); }
      else if (bt === 6 && playerDrew && third !== null && (third === 6 || third === 7)) { b.push(drawFromShoe()); renderHands(p, b, false); await sleep(260); bt = total(b); }
    }

    pt = total(p); bt = total(b);
    const winner = pt === bt ? 'tie' : (pt > bt ? 'player' : 'banker');
    const pPair = isPair(p), bPair = isPair(b);
    const pPerfect = isPerfectPair(p), bPerfect = isPerfectPair(b);

    // pagamento por tipo de aposta
    const mults = { player: 2, banker: 1.95, tie: 9, p_pair: 11, b_pair: 11, pp_pair: 25 };
    let payout = 0, resultType = 'loss';
    const side = state.side;

    const sideWins = (
      (side === 'player' && winner === 'player') ||
      (side === 'banker' && winner === 'banker') ||
      (side === 'tie' && winner === 'tie') ||
      (side === 'p_pair' && pPair) ||
      (side === 'b_pair' && bPair) ||
      (side === 'pp_pair' && (pPerfect || bPerfect))
    );

    if (sideWins) {
      const m = mults[side];
      payout = Math.round(ticket.amount * m * 100) / 100;
      Wallet.payout(payout);
      resultType = 'win';
    } else if (winner === 'tie' && (side === 'player' || side === 'banker')) {
      payout = ticket.amount;
      Wallet.payout(payout);
      resultType = 'push';
    }

    // atualiza bead e stats
    state.beadHistory.push(winner);
    if (state.beadHistory.length > 200) state.beadHistory.length = 200;
    state.stats.rounds += 1;
    if (winner === 'player') state.stats.p += 1;
    else if (winner === 'banker') state.stats.b += 1;
    else state.stats.t += 1;
    if (pPair || bPair) state.stats.pairs += 1;
    renderBeads();
    renderStats();

    const el = document.getElementById('b-result');
    el.classList.remove('hidden','win','loss','push');
    if (resultType === 'win') {
      el.classList.add('win');
      el.textContent = `${side.toUpperCase().replace('_',' ')} venceu — ${fmt(payout)} virtuais`;
      Notify.win(`+ ${fmt(payout)} virtuais`, 'Baccarat — vitória');
    } else if (resultType === 'push') {
      el.classList.add('push');
      el.textContent = `Empate — aposta devolvida.`;
      Notify.info('Aposta devolvida', 'Baccarat — empate');
    } else {
      el.classList.add('loss');
      el.textContent = `${winner.toUpperCase()} — aposta perdida.`;
      Notify.loss(`- ${fmt(ticket.amount)} virtuais`, 'Baccarat — derrota');
    }

    History.add({
      game: 'Baccarat', bet: ticket.amount, payout,
      result: resultType, resultTag: winner,
      detail: `P${pt} B${bt}${pPair ? ' PP' : ''}${bPair ? ' BP' : ''}`,
    });
    History.recordRound({ game: 'Baccarat', bet: ticket.amount, payout, result: resultType });

    state.running = false;
    updatePlayButton();
  }

  function fmt(n) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

  function showRules() {
    window.App.openModal('Regras — Baccarat', `
      <p><strong>Objetivo:</strong> apostar em Player, Banker, Tie, Pair ou Perfect Pair.</p>
      <ul>
        <li>Cartas 2–9 valem face; 10/J/Q/K = 0; A = 1. Soma é módulo 10.</li>
        <li>Player 2x · Banker 1,95x · Tie 9x · Par 11x · Perfect Pair 25x.</li>
        <li>Empate devolve aposta de Player/Banker.</li>
        <li>Shoe de 8 baralhos — reembaralha automaticamente.</li>
      </ul>
      <p class="demo-note">Valores fictícios — sem valor monetário real.</p>
    `);
  }

  window.Baccarat = { render, showRules };
})();
