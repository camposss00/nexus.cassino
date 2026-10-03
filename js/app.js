// App — bootstrap, rotas, dashboard, dificuldade, stats detalhados
(function () {
  const GAMES = [
    { id: 'aviator',   name: 'Aviator',    desc: 'Multiplicador crescente com avião.',  icon: '✈', popularity: 94, render: () => Aviator.render() },
    { id: 'crash',     name: 'Crash',      desc: 'Saque antes do crash.',                icon: '📈', popularity: 88, render: () => Crash.render() },
    { id: 'baccarat',  name: 'Baccarat',   desc: 'Player, Banker, Tie, Pares.',          icon: '♠',  popularity: 92, render: () => Baccarat.render() },
    { id: 'bacbo',     name: 'Bac Bo',     desc: 'Duelo de dados com pares.',            icon: '🎲', popularity: 78, render: () => BacBo.render() },
    { id: 'roulette',  name: 'Roleta',     desc: 'Apostas múltiplas e vizinhos.',        icon: '🎡', popularity: 90, render: () => Roulette.render() },
    { id: 'blackjack', name: 'Blackjack',  desc: 'Split, double, multi-mão.',            icon: '🃏', popularity: 95, render: () => Blackjack.render() },
    { id: 'slots',     name: 'Caça-Níquel',desc: '5 rolos, wild, scatter, free spins.',  icon: '🎰', popularity: 86, render: () => Slots.render() },
  ];

  function fmt(n) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

  const App = {
    openModal(title, html, footerHTML) {
      const root = document.getElementById('modal-root');
      document.getElementById('modal-title').textContent = title;
      document.getElementById('modal-body').innerHTML = html;
      document.getElementById('modal-foot').innerHTML = footerHTML || '';
      root.classList.remove('hidden');
      root.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', () => App.closeModal()));
    },
    closeModal() {
      document.getElementById('modal-root').classList.add('hidden');
    },
    go: (t) => go(t),
  };
  window.App = App;

  function paintBalance() {
    const w = Wallet.get();
    const el = document.getElementById('balance');
    if (el) el.textContent = fmt(w.balance);
  }

  // ===== DASHBOARD =====
  function renderDashboard() {
    const w = Wallet.get();
    const s = History.stats();
    const favIds = History.favorites();

    const stats = [
      { label: 'Total apostado', value: fmt(s.totalBet) },
      { label: 'Total ganho', value: fmt(s.totalWin), cls: 'positive' },
      { label: 'Total perdido', value: fmt(s.totalLoss), cls: 'negative' },
      { label: 'Partidas', value: s.rounds },
      { label: 'Maior vitória', value: fmt(s.biggestWin), cls: 'positive' },
      { label: 'Maior multiplicador', value: s.biggestMult ? s.biggestMult.toFixed(2) + 'x' : '—' },
      { label: 'Jogo mais usado', value: topGame(s.byGame) },
    ];

    const view = document.getElementById('view');
    view.innerHTML = `
      <div class="balance-hero">
        <h3>Saldo virtual</h3>
        <div class="big">${fmt(w.balance)}</div>
        <p class="demo-note">DEMO — TODOS OS VALORES SÃO FICTÍCIOS E NÃO POSSUEM VALOR MONETÁRIO.</p>
        <div class="actions">
          <button class="btn-primary" id="dash-add"><i class="fa-solid fa-plus"></i> ADICIONAR SALDO</button>
          <button class="btn-ghost" id="dash-reset">RESETAR DEMO</button>
        </div>
      </div>

      <div class="section-title"><h2>Estatísticas</h2></div>
      <div class="stats-grid">
        ${stats.map(st => `
          <div class="stat-card ${st.cls || ''}">
            <div class="label">${st.label}</div>
            <div class="value">${st.value}</div>
          </div>`).join('')}
      </div>

      <div class="section-title"><h2>Jogos</h2></div>
      <div class="cards-grid">
        ${GAMES.map(g => `
          <div class="game-card">
            <button class="fav-btn ${favIds.includes(g.id) ? 'on' : ''}" data-fav="${g.id}" aria-label="Favoritar">
              <i class="fa-${favIds.includes(g.id) ? 'solid' : 'regular'} fa-star"></i>
            </button>
            <div class="thumb">${g.icon}</div>
            <div class="body">
              <h3>${g.name}</h3>
              <p>${g.desc}</p>
              <div class="foot">
                <span class="pop"><span class="dot">●</span> ${g.popularity}% popularidade</span>
                <button class="btn-primary" data-play="${g.id}">Jogar</button>
              </div>
            </div>
          </div>`).join('')}
      </div>
    `;

    view.querySelectorAll('[data-play]').forEach(b => b.addEventListener('click', () => go(b.dataset.play)));
    view.querySelectorAll('[data-fav]').forEach(b => b.addEventListener('click', () => {
      const on = History.toggleFavorite(b.dataset.fav);
      b.classList.toggle('on', on);
      b.innerHTML = `<i class="fa-${on ? 'solid' : 'regular'} fa-star"></i>`;
    }));
    document.getElementById('dash-add').addEventListener('click', openAddBalance);
    document.getElementById('dash-reset').addEventListener('click', resetDemo);
  }

  function topGame(byGame) {
    const entries = Object.entries(byGame || {});
    if (!entries.length) return '—';
    entries.sort((a, b) => b[1] - a[1]);
    return entries[0][0];
  }

  // ===== FAVORITOS =====
  function renderFavorites() {
    const favIds = History.favorites();
    const favs = GAMES.filter(g => favIds.includes(g.id));
    const view = document.getElementById('view');
    view.innerHTML = `
      <div class="section-title"><h2>Meus favoritos</h2></div>
      ${favs.length === 0 ? `<p style="color:var(--muted)">Você ainda não marcou nenhum jogo com ★.</p>` : `
      <div class="cards-grid">
        ${favs.map(g => `
          <div class="game-card">
            <button class="fav-btn on" data-fav="${g.id}"><i class="fa-solid fa-star"></i></button>
            <div class="thumb">${g.icon}</div>
            <div class="body">
              <h3>${g.name}</h3>
              <p>${g.desc}</p>
              <div class="foot">
                <span class="pop"><span class="dot">●</span> ${g.popularity}%</span>
                <button class="btn-primary" data-play="${g.id}">Jogar</button>
              </div>
            </div>
          </div>`).join('')}
      </div>`}
    `;
    view.querySelectorAll('[data-play]').forEach(b => b.addEventListener('click', () => go(b.dataset.play)));
    view.querySelectorAll('[data-fav]').forEach(b => b.addEventListener('click', () => {
      History.toggleFavorite(b.dataset.fav);
      renderFavorites();
    }));
  }

  // ===== HISTÓRICO =====
  function renderHistoryView() {
    const list = History.all();
    const view = document.getElementById('view');
    view.innerHTML = `
      <div class="section-title"><h2>Histórico</h2></div>
      ${list.length === 0 ? `<p style="color:var(--muted)">Sem registros ainda.</p>` : `
      <div class="history-list">
        ${list.map(h => {
          const cls = h.result === 'win' ? 'positive' : h.result === 'loss' ? 'negative' : 'credit';
          const sign = h.result === 'win' ? `+${fmt(h.payout)}` : h.result === 'loss' ? `-${fmt(h.bet)}` : `±${fmt(h.payout)}`;
          const tag = h.result === 'win' ? 'Vitória' : h.result === 'loss' ? 'Perda' : 'Empate';
          return `<div class="history-row">
            <span class="time">${h.time}</span>
            <span>${h.game}</span>
            <span class="value ${cls}">${sign}</span>
            <span class="tag">${tag}</span>
          </div>`;
        }).join('')}
      </div>`}
    `;
  }

  // ===== ESTATÍSTICAS =====
  function renderStatsView() {
    const s = History.stats();
    const winRate = s.rounds ? ((s.wins / s.rounds) * 100).toFixed(1) + '%' : '—';
    const a = s.aviator;
    const avgMult = a.rounds ? (a.sumMult / a.rounds).toFixed(2) + 'x' : '—';

    const view = document.getElementById('view');
    view.innerHTML = `
      <div class="section-title"><h2>Estatísticas gerais</h2></div>
      <div class="stats-grid">
        <div class="stat-card"><div class="label">Partidas</div><div class="value">${s.rounds}</div></div>
        <div class="stat-card positive"><div class="label">Vitórias</div><div class="value">${s.wins}</div></div>
        <div class="stat-card negative"><div class="label">Derrotas</div><div class="value">${s.losses}</div></div>
        <div class="stat-card"><div class="label">Empates</div><div class="value">${s.pushes}</div></div>
        <div class="stat-card"><div class="label">Taxa de vitória</div><div class="value">${winRate}</div></div>
        <div class="stat-card positive"><div class="label">Maior ganho</div><div class="value">${fmt(s.biggestWin)}</div></div>
        <div class="stat-card"><div class="label">Maior multiplicador</div><div class="value">${s.biggestMult ? s.biggestMult.toFixed(2) + 'x' : '—'}</div></div>
        <div class="stat-card"><div class="label">Jogo favorito</div><div class="value">${topGame(s.byGame)}</div></div>
      </div>

      <div class="section-title"><h2>Aviator</h2></div>
      <div class="stats-grid">
        <div class="stat-card"><div class="label">Rodadas</div><div class="value">${a.rounds}</div></div>
        <div class="stat-card positive"><div class="label">Saques</div><div class="value">${a.cashes}</div></div>
        <div class="stat-card negative"><div class="label">Crashes</div><div class="value">${a.crashes}</div></div>
        <div class="stat-card positive"><div class="label">Maior saque</div><div class="value">${fmt(a.biggestCash)}</div></div>
        <div class="stat-card positive"><div class="label">Maior mult. saque</div><div class="value">${a.biggestMult ? a.biggestMult.toFixed(2) + 'x' : '—'}</div></div>
        <div class="stat-card negative"><div class="label">Maior crash</div><div class="value">${a.biggestCrash ? a.biggestCrash.toFixed(2) + 'x' : '—'}</div></div>
        <div class="stat-card"><div class="label">Média mult.</div><div class="value">${avgMult}</div></div>
      </div>

      <div class="section-title"><h2>Distribuição por jogo</h2></div>
      <div class="stats-grid">
        ${Object.entries(s.byGame).length ? Object.entries(s.byGame).map(([k, v]) => `
          <div class="stat-card"><div class="label">${k}</div><div class="value">${v} rodadas</div></div>
        `).join('') : `<p style="color:var(--muted)">Sem dados.</p>`}
      </div>
    `;
  }

  function renderProfile() {
    const w = Wallet.get();
    const s = History.stats();
    const winRate = s.rounds ? ((s.wins / s.rounds) * 100).toFixed(1) + '%' : '—';
    const view = document.getElementById('view');
    view.innerHTML = `
      <div class="section-title"><h2>Perfil</h2></div>
      <div class="balance-hero">
        <h3>Jogador</h3>
        <div class="big">NOVA7 Demo Player</div>
        <p class="demo-note">DEMO — VALORES FICTÍCIOS, SEM CONTA REAL.</p>
      </div>
      <div class="stats-grid" style="margin-top:16px">
        <div class="stat-card"><div class="label">Saldo</div><div class="value">${fmt(w.balance)}</div></div>
        <div class="stat-card"><div class="label">Partidas</div><div class="value">${s.rounds}</div></div>
        <div class="stat-card positive"><div class="label">Vitórias</div><div class="value">${s.wins}</div></div>
        <div class="stat-card negative"><div class="label">Derrotas</div><div class="value">${s.losses}</div></div>
        <div class="stat-card"><div class="label">Taxa de vitória</div><div class="value">${winRate}</div></div>
        <div class="stat-card positive"><div class="label">Maior ganho</div><div class="value">${fmt(s.biggestWin)}</div></div>
        <div class="stat-card"><div class="label">Maior multiplicador</div><div class="value">${s.biggestMult ? s.biggestMult.toFixed(2) + 'x' : '—'}</div></div>
        <div class="stat-card"><div class="label">Jogo favorito</div><div class="value">${topGame(s.byGame)}</div></div>
      </div>
    `;
  }

  function renderWithdraw() {
    const view = document.getElementById('view');
    view.innerHTML = `
      <div class="section-title"><h2>Saque virtual</h2></div>
      <div class="withdraw-card">
        <p>Selecione um valor fictício. Nenhuma conta é solicitada. Nenhum valor real é movimentado.</p>
        <div class="chip-grid" id="w-chips">
          <button class="chip" data-amount="100">R$ 100</button>
          <button class="chip" data-amount="500">R$ 500</button>
          <button class="chip" data-amount="1000">R$ 1.000</button>
          <button class="chip" data-amount="5000">R$ 5.000</button>
        </div>
        <div class="withdraw-note">
          Este é um cassino demonstrativo. O saldo exibido é fictício e não pode ser convertido em dinheiro real.
        </div>
        <button class="btn-primary" id="w-sim">SIMULAR SAQUE</button>
        <div id="w-out" style="margin-top:12px"></div>
      </div>
    `;
    view.querySelectorAll('#w-chips .chip').forEach(c => c.addEventListener('click', () => {
      view.querySelectorAll('#w-chips .chip').forEach(x => x.classList.remove('active'));
      c.classList.add('active');
    }));
    document.getElementById('w-sim').addEventListener('click', () => {
      document.getElementById('w-out').innerHTML = `<div class="round-result win">Simulação concluída. Nenhum dinheiro real foi movimentado.</div>`;
      Notify.info('Simulação concluída', 'Nenhum dinheiro real foi movimentado.');
    });
  }

  function renderSettings() {
    const cur = Difficulty.get();
    const view = document.getElementById('view');
    view.innerHTML = `
      <div class="section-title"><h2>Configurações</h2></div>
      <div class="withdraw-card">
        <h3 style="margin:0 0 6px;font-size:15px">Dificuldade</h3>
        <p style="color:var(--muted);font-size:13px">Muda a complexidade da experiência. Nunca altera as probabilidades.</p>
        <div class="chip-grid" id="set-diff">
          <button class="chip ${cur === 'easy' ? 'active' : ''}" data-diff="easy">FÁCIL</button>
          <button class="chip ${cur === 'normal' ? 'active' : ''}" data-diff="normal">NORMAL</button>
          <button class="chip ${cur === 'hard' ? 'active' : ''}" data-diff="hard">AVANÇADO</button>
        </div>
      </div>
      <div class="withdraw-card" style="margin-top:16px">
        <h3 style="margin:0 0 6px;font-size:15px">Reset</h3>
        <p style="color:var(--muted);font-size:13px">Apaga saldo fictício, histórico e estatísticas. Favoritos são mantidos.</p>
        <button class="btn-danger" id="set-reset">RESETAR DEMO</button>
      </div>
    `;
    view.querySelectorAll('#set-diff .chip').forEach(c => c.addEventListener('click', () => {
      Difficulty.set(c.dataset.diff);
      renderSettings();
      Notify.info('Dificuldade', `Modo ${c.textContent}`);
    }));
    document.getElementById('set-reset').addEventListener('click', resetDemo);
  }

  // ===== NAV =====
  const ROUTES = {
    dashboard: renderDashboard,
    favorites: renderFavorites,
    history: renderHistoryView,
    stats: renderStatsView,
    profile: renderProfile,
    withdraw: renderWithdraw,
    settings: renderSettings,
  };

  function setActive(view) {
    document.querySelectorAll('.nav-item, .bottom-item').forEach(el => {
      el.classList.toggle('active', el.dataset.view === view);
    });
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');
  }

  function go(target) {
    const game = GAMES.find(g => g.id === target);
    if (game) { setActive(null); game.render(); return; }
    if (ROUTES[target]) { setActive(target); ROUTES[target](); }
  }

  // ===== CRÉDITO =====
  function openAddBalance() { document.getElementById('add-balance-modal').classList.remove('hidden'); }
  function closeAddBalance() {
    document.getElementById('add-balance-modal').classList.add('hidden');
    document.getElementById('custom-credit').value = '';
  }
  function confirmCredit(amount) {
    const ok = Wallet.addVirtualBalance(amount);
    if (!ok) { Notify.warn('Valor inválido', 'Use um valor entre R$ 1 e R$ 1.000.000.'); return; }
    History.add({ game: 'Saldo virtual', bet: 0, payout: ok, result: 'credit', resultTag: 'credit', detail: 'Crédito fictício' });
    Notify.info(`+ ${fmt(ok)} virtuais`, 'Crédito fictício adicionado');
    closeAddBalance();
  }

  // ===== RESET =====
  function resetDemo() {
    App.openModal('Resetar demo', `
      <p>Tem certeza? Isso apagará seu saldo e histórico fictícios.</p>
      <p class="demo-note">Favoritos são mantidos.</p>
    `, `
      <button class="btn-ghost" data-close>Cancelar</button>
      <button class="btn-danger" id="confirm-reset">Resetar</button>
    `);
    setTimeout(() => {
      const btn = document.getElementById('confirm-reset');
      if (!btn) return;
      btn.addEventListener('click', () => {
        Wallet.reset();
        History.clear();
        History.resetStats();
        localStorage.removeItem('nova7.aviator.history');
        App.closeModal();
        Notify.info('Demo resetada', 'Saldo e histórico apagados.');
        go('dashboard');
      });
    }, 0);
  }

  // ===== BOOT =====
  function boot() {
    const welcome = document.getElementById('welcome');
    const app = document.getElementById('app');
    const seen = localStorage.getItem('nova7.seenWelcome');

    if (!seen) {
      welcome.classList.remove('hidden');
      app.classList.add('hidden');
    } else {
      welcome.classList.add('hidden');
      app.classList.remove('hidden');
    }

    document.getElementById('btn-start').addEventListener('click', () => {
      localStorage.setItem('nova7.seenWelcome', '1');
      welcome.classList.add('hidden');
      app.classList.remove('hidden');
      go('dashboard');
    });

    document.querySelectorAll('.nav-item, .bottom-item').forEach(a => {
      a.addEventListener('click', (e) => { e.preventDefault(); go(a.dataset.view); });
    });
    document.getElementById('menu-toggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });
    document.getElementById('btn-add-balance').addEventListener('click', openAddBalance);
    document.getElementById('btn-notify').addEventListener('click', () => {
      Notify.info('Notificações', 'Aqui aparecem avisos de vitória, derrota e créditos.');
    });

    document.querySelectorAll('[data-close-balance]').forEach(el => el.addEventListener('click', closeAddBalance));
    document.querySelectorAll('#quick-credit .chip').forEach(c => c.addEventListener('click', () => confirmCredit(Number(c.dataset.amount))));
    document.getElementById('btn-confirm-credit').addEventListener('click', () => {
      const v = Number(document.getElementById('custom-credit').value);
      confirmCredit(v);
    });
    document.querySelectorAll('#modal-root [data-close]').forEach(el => el.addEventListener('click', () => App.closeModal()));

    document.addEventListener('wallet:change', paintBalance);
    document.addEventListener('difficulty:change', () => {
      // re-renderiza view atual se for jogo/config
      const active = document.querySelector('.nav-item.active');
      if (active) go(active.dataset.view);
    });

    paintBalance();
    if (seen) go('dashboard');
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
