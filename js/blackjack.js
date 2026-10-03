// Blackjack — split, double, multi-mão
(function () {
  const SUITS = ['♠', '♥', '♦', '♣'];
  const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  const RED = new Set(['♥','♦']);
  let state = null;

  function buildDeck(n = 1) {
    const deck = [];
    for (let d = 0; d < n; d++) for (const s of SUITS) for (const r of RANKS) deck.push({ suit: s, rank: r, red: RED.has(s) });
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  function value(hand) {
    let total = 0, aces = 0;
    for (const c of hand) {
      if (c.rank === 'A') { total += 11; aces++; }
      else if (['K','Q','J','10'].includes(c.rank)) total += 10;
      else total += Number(c.rank);
    }
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return total;
  }
  function isBlackjack(hand) { return hand.length === 2 && value(hand) === 21; }
  function isSoft(hand) {
    let total = 0, aces = 0;
    for (const c of hand) {
      if (c.rank === 'A') { total += 11; aces++; }
      else if (['K','Q','J','10'].includes(c.rank)) total += 10;
      else total += Number(c.rank);
    }
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return aces > 0;
  }

  function cardHTML(c, hidden) {
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
          <h1>Blackjack</h1>
          <div class="tools">
            <button class="btn-ghost" id="bj-rules"><i class="fa-solid fa-circle-info"></i> Regras</button>
          </div>
        </div>
        <p class="demo-note">DEMO — TODOS OS VALORES SÃO FICTÍCIOS E NÃO POSSUEM VALOR MONETÁRIO.</p>

        <div class="table-stage green">
          <div class="hand-row">
            <span class="hand-label">Dealer</span>
            <div id="bj-dealer" class="dice-row"></div>
            <span class="score-pill" id="bj-dealer-score">—</span>
          </div>
          <div class="bj-hands" id="bj-hands"></div>
          <div id="bj-result" class="round-result hidden"></div>
        </div>

        <div class="stats-inline">
          <div class="cell"><div class="k">Cartas no shoe</div><div class="v" id="bj-shoe">—</div></div>
          <div class="cell"><div class="k">Mãos</div><div class="v" id="bj-hands-count">1</div></div>
        </div>

        <div class="controls">
          <div class="bet-amount">Aposta:</div>
          <div class="chip-grid" id="bj-chips">
            <button class="chip" data-amount="10">R$ 10</button>
            <button class="chip active" data-amount="25">R$ 25</button>
            <button class="chip" data-amount="50">R$ 50</button>
            <button class="chip" data-amount="100">R$ 100</button>
            <button class="chip" data-amount="250">R$ 250</button>
            <button class="chip" data-amount="500">R$ 500</button>
          </div>
        </div>

        <div class="controls">
          <button class="btn-primary" id="bj-deal" disabled>DISTRIBUIR</button>
          <button class="btn-ghost" id="bj-hit" disabled>COMPRAR</button>
          <button class="btn-ghost" id="bj-stand" disabled>PARAR</button>
          <button class="btn-ghost" id="bj-double" disabled>DOBRAR</button>
          <button class="btn-ghost" id="bj-split" disabled>SPLIT</button>
        </div>
      </div>
    `;

    state = {
      bet: 25, deck: buildDeck(6),
      dealer: [],
      hands: [],
      activeHand: 0,
      running: false,
      betweenHands: false,
    };

    view.querySelectorAll('#bj-chips .chip').forEach(c => {
      c.addEventListener('click', () => {
        if (state.running) return;
        view.querySelectorAll('#bj-chips .chip').forEach(x => x.classList.remove('active'));
        c.classList.add('active');
        state.bet = Number(c.dataset.amount);
        updateButtons();
      });
    });
    document.getElementById('bj-deal').addEventListener('click', deal);
    document.getElementById('bj-hit').addEventListener('click', hit);
    document.getElementById('bj-stand').addEventListener('click', stand);
    document.getElementById('bj-double').addEventListener('click', double);
    document.getElementById('bj-split').addEventListener('click', split);
    document.getElementById('bj-rules').addEventListener('click', showRules);
    updateButtons();
    renderShoeCount();
  }

  function renderShoeCount() {
    const el = document.getElementById('bj-shoe');
    if (el) el.textContent = state ? state.deck.length : '—';
  }

  function updateButtons() {
    const w = Wallet.get();
    const cur = state.hands[state.activeHand];
    const canDeal = !state.running && state.bet > 0 && state.bet <= w.balance;
    document.getElementById('bj-deal').disabled = !canDeal;
    document.getElementById('bj-deal').textContent = state.running ? 'EM JOGO…' : `DISTRIBUIR R$ ${state.bet}`;
    const inPlay = state.running && cur && !cur.done && !cur.bust;
    document.getElementById('bj-hit').disabled = !inPlay;
    document.getElementById('bj-stand').disabled = !inPlay;
    const canDouble = inPlay && cur.cards.length === 2 && !cur.doubled && w.balance >= cur.bet;
    document.getElementById('bj-double').disabled = !canDouble;
    const canSplit = inPlay && cur.cards.length === 2 &&
      ((cur.cards[0].rank === cur.cards[1].rank) ||
       (['10','J','Q','K'].includes(cur.cards[0].rank) && ['10','J','Q','K'].includes(cur.cards[1].rank))) &&
      state.hands.length < 4 && w.balance >= cur.bet;
    document.getElementById('bj-split').disabled = !canSplit;
    document.getElementById('bj-hands-count').textContent = state.hands.length || 1;
  }

  function draw() {
    if (state.deck.length < 20) state.deck = buildDeck(6);
    renderShoeCount();
    return state.deck.pop();
  }
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function renderHands(hideDealer) {
    document.getElementById('bj-dealer').innerHTML = state.dealer.map((c, i) => cardHTML(c, hideDealer && i === 1)).join('');
    document.getElementById('bj-dealer-score').textContent = hideDealer ? (state.dealer[0] ? value([state.dealer[0]]) : '—') : value(state.dealer);

    const el = document.getElementById('bj-hands');
    el.innerHTML = state.hands.map((h, i) => {
      const active = i === state.activeHand && !h.done;
      const cls = h.done || h.bust ? (h.result === 'win' ? 'win' : h.result === 'push' ? 'push' : 'loss') : (active ? 'active' : '');
      return `
        <div class="bj-hand ${cls}">
          <div class="hand-title">Mão ${i + 1} ${h.doubled ? '· DOBRADA' : ''} ${h.split ? '· SPLIT' : ''}</div>
          <div class="hand-cards">${h.cards.map(c => cardHTML(c)).join('')}</div>
          <div class="hand-score">${value(h.cards)} pontos${isSoft(h.cards) && value(h.cards) <= 21 ? ' (soft)' : ''}</div>
          ${h.result ? `<div class="hand-result">${h.result === 'win' ? `Ganhou ${fmt(h.payout)}` : h.result === 'push' ? 'Empate' : 'Perdeu'}</div>` : ''}
        </div>
      `;
    }).join('');
  }

  async function deal() {
    if (state.running) return;
    const ticket = Wallet.placeBet(state.bet, 'Blackjack');
    if (!ticket) { Notify.warn('Saldo insuficiente', 'Ajuste a aposta.'); return; }
    state.running = true;
    state.deck = buildDeck(6);
    state.dealer = [draw(), draw()];
    state.hands = [{ cards: [draw(), draw()], bet: ticket.amount, doubled: false, done: false, bust: false, split: false, result: null, payout: 0 }];
    state.activeHand = 0;
    document.getElementById('bj-result').classList.add('hidden');
    renderHands(true);
    updateButtons();

    const cur = state.hands[0];
    if (isBlackjack(cur.cards) || isBlackjack(state.dealer)) {
      await sleep(300);
      return finish();
    }
  }

  async function hit() {
    const cur = state.hands[state.activeHand];
    if (!state.running || !cur || cur.done) return;
    cur.cards.push(draw());
    renderHands(true);
    const v = value(cur.cards);
    if (v > 21) { cur.bust = true; cur.done = true; await sleep(200); return nextHandOrFinish(); }
    if (v === 21) { await sleep(200); return stand(); }
    updateButtons();
  }

  async function double() {
    const cur = state.hands[state.activeHand];
    if (!state.running || !cur || cur.cards.length !== 2 || cur.doubled) return;
    const removed = Wallet.removeVirtualBalance(cur.bet);
    if (removed === null) return;
    cur.bet += removed;
    cur.doubled = true;
    cur.cards.push(draw());
    renderHands(true);
    if (value(cur.cards) > 21) { cur.bust = true; }
    cur.done = true;
    await sleep(200);
    return nextHandOrFinish();
  }

  async function split() {
    const cur = state.hands[state.activeHand];
    if (!state.running || !cur || cur.cards.length !== 2) return;
    const removed = Wallet.removeVirtualBalance(cur.bet);
    if (removed === null) return;
    const [a, b] = cur.cards;
    cur.cards = [a, draw()];
    cur.split = true;
    const newHand = { cards: [b, draw()], bet: removed, doubled: false, done: false, bust: false, split: true, result: null, payout: 0 };
    state.hands.splice(state.activeHand + 1, 0, newHand);
    renderHands(true);
    updateButtons();
  }

  async function stand() {
    const cur = state.hands[state.activeHand];
    if (!state.running || !cur) return;
    cur.done = true;
    nextHandOrFinish();
  }

  async function nextHandOrFinish() {
    renderHands(true);
    const next = state.hands.findIndex(h => !h.done && !h.bust);
    if (next !== -1) {
      state.activeHand = next;
      updateButtons();
      renderHands(true);
      return;
    }
    // dealer joga
    renderHands(false);
    while (value(state.dealer) < 17) {
      state.dealer.push(draw());
      await sleep(280);
      renderHands(false);
    }
    finish();
  }

  function finish() {
    const dv = value(state.dealer);
    const dBJ = isBlackjack(state.dealer);
    let totalPayout = 0;
    let totalBet = 0;

    for (const h of state.hands) {
      totalBet += h.bet;
      if (h.bust) { h.result = 'loss'; h.payout = 0; continue; }
      const pv = value(h.cards);
      const pBJ = isBlackjack(h.cards);

      if (pBJ && !dBJ) { h.result = 'win'; h.payout = Math.round(h.bet * 2.5 * 100) / 100; }
      else if (dBJ && !pBJ) { h.result = 'loss'; h.payout = 0; }
      else if (pBJ && dBJ) { h.result = 'push'; h.payout = h.bet; }
      else if (dv > 21) { h.result = 'win'; h.payout = h.bet * 2; }
      else if (pv > dv) { h.result = 'win'; h.payout = h.bet * 2; }
      else if (pv < dv) { h.result = 'loss'; h.payout = 0; }
      else { h.result = 'push'; h.payout = h.bet; }
      if (h.payout > 0) { Wallet.payout(h.payout); totalPayout += h.payout; }
    }

    renderHands(false);

    const wins = state.hands.filter(h => h.result === 'win').length;
    const pushes = state.hands.filter(h => h.result === 'push').length;
    const losses = state.hands.filter(h => h.result === 'loss').length;

    const el = document.getElementById('bj-result');
    el.classList.remove('hidden','win','loss','push');
    if (wins > 0 && losses === 0) el.classList.add('win');
    else if (losses > 0 && wins === 0 && pushes === 0) el.classList.add('loss');
    else el.classList.add('push');

    el.textContent = `Resultado: ${wins}V ${pushes}E ${losses}D — Pago ${fmt(totalPayout)} virtuais`;

    if (wins > 0 && losses === 0) Notify.win(`+ ${fmt(totalPayout)} virtuais`, 'Blackjack — vitória');
    else if (losses > 0 && wins === 0) Notify.loss(`- ${fmt(totalBet - totalPayout)} virtuais`, 'Blackjack — derrota');
    else Notify.info('Resultado misto', `${wins}V ${pushes}E ${losses}D`);

    History.add({
      game: 'Blackjack', bet: totalBet, payout: totalPayout,
      result: wins > 0 && losses === 0 ? 'win' : losses > 0 && wins === 0 ? 'loss' : 'push',
      resultTag: `${wins}V${pushes}E${losses}D`,
      detail: `P${value(state.hands[0].cards)} D${dv}`,
    });
    History.recordRound({
      game: 'Blackjack', bet: totalBet, payout: totalPayout,
      result: wins > 0 && losses === 0 ? 'win' : losses > 0 && wins === 0 ? 'loss' : 'push',
    });

    state.running = false;
    state.betweenHands = false;
    state.bet = 25;
    document.querySelectorAll('#bj-chips .chip').forEach(x => x.classList.toggle('active', Number(x.dataset.amount) === 25));
    updateButtons();
  }

  function fmt(n) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

  function showRules() {
    window.App.openModal('Regras — Blackjack', `
      <p><strong>Objetivo:</strong> chegar o mais perto de 21 sem estourar, batendo o dealer.</p>
      <ul>
        <li>Dealer para em 17. Ás vale 1 ou 11.</li>
        <li>Blackjack paga 2,5x; vitória normal 2x; empate devolve.</li>
        <li>Dobrar: dobra aposta e recebe uma única carta.</li>
        <li>Split: mãos com par podem ser divididas em duas mãos independentes (até 4 mãos).</li>
        <li>Shoe de 6 baralhos — reembaralha automaticamente.</li>
      </ul>
      <p class="demo-note">Valores fictícios — sem valor monetário real.</p>
    `);
  }

  window.Blackjack = { render, showRules };
})();
