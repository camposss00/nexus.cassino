// History + Stats — histórico, agregados por jogo, favoritos
(function () {
  const HKEY = 'nova7.history';
  const SKEY = 'nova7.stats';
  const FKEY = 'nova7.favorites';

  const DEFAULT_STATS = {
    totalBet: 0, totalWin: 0, totalLoss: 0,
    rounds: 0, wins: 0, losses: 0, pushes: 0,
    biggestWin: 0, biggestMult: 0,
    byGame: {},
    aviator: {
      rounds: 0, cashes: 0, crashes: 0,
      biggestMult: 0, biggestCrash: 0,
      biggestCash: 0, sumMult: 0,
    },
  };

  function loadArr(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
  }
  function loadObj(key, def) {
    const stored = (() => { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; } })();
    const merged = { ...def, ...stored };
    // merge nested
    if (def.aviator) merged.aviator = { ...def.aviator, ...(stored.aviator || {}) };
    if (def.byGame) merged.byGame = { ...def.byGame, ...(stored.byGame || {}) };
    return merged;
  }
  function persistObj(key, obj) { localStorage.setItem(key, JSON.stringify(obj)); }

  const History = {
    all() { return loadArr(HKEY); },

    add(entry) {
      const list = loadArr(HKEY);
      list.unshift({
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        ts: Date.now(),
        ...entry,
      });
      if (list.length > 300) list.length = 300;
      localStorage.setItem(HKEY, JSON.stringify(list));
      document.dispatchEvent(new CustomEvent('history:change'));
    },

    clear() {
      localStorage.removeItem(HKEY);
      document.dispatchEvent(new CustomEvent('history:change'));
    },

    stats() { return loadObj(SKEY, DEFAULT_STATS); },

    recordRound({ game, bet, payout, result, mult }) {
      const s = loadObj(SKEY, DEFAULT_STATS);
      s.rounds += 1;
      s.totalBet += bet;
      if (result === 'win') {
        s.wins += 1;
        s.totalWin += payout;
        if (payout > s.biggestWin) s.biggestWin = payout;
      } else if (result === 'loss') {
        s.losses += 1;
        s.totalLoss += bet;
      } else {
        s.pushes += 1;
      }
      s.byGame[game] = (s.byGame[game] || 0) + 1;
      if (mult && mult > s.biggestMult) s.biggestMult = mult;
      persistObj(SKEY, s);
      document.dispatchEvent(new CustomEvent('history:change'));
    },

    recordAviator({ crashed, cashMult, crashMult, cashAmount }) {
      const s = loadObj(SKEY, DEFAULT_STATS);
      s.aviator.rounds += 1;
      if (crashed) {
        s.aviator.crashes += 1;
        if (crashMult > s.aviator.biggestCrash) s.aviator.biggestCrash = crashMult;
        s.aviator.sumMult += crashMult;
      } else {
        s.aviator.cashes += 1;
        if (cashMult > s.aviator.biggestMult) s.aviator.biggestMult = cashMult;
        if (cashAmount > s.aviator.biggestCash) s.aviator.biggestCash = cashAmount;
        s.aviator.sumMult += cashMult;
      }
      persistObj(SKEY, s);
      document.dispatchEvent(new CustomEvent('history:change'));
    },

    recordMultiplier(mult) {
      const s = loadObj(SKEY, DEFAULT_STATS);
      if (mult > s.biggestMult) s.biggestMult = mult;
      persistObj(SKEY, s);
      document.dispatchEvent(new CustomEvent('history:change'));
    },

    resetStats() {
      localStorage.removeItem(SKEY);
      document.dispatchEvent(new CustomEvent('history:change'));
    },

    favorites() { return loadArr(FKEY); },
    isFavorite(id) { return this.favorites().includes(id); },
    toggleFavorite(id) {
      let list = this.favorites();
      if (list.includes(id)) list = list.filter(x => x !== id);
      else list.push(id);
      localStorage.setItem(FKEY, JSON.stringify(list));
      document.dispatchEvent(new CustomEvent('favorites:change'));
      return list.includes(id);
    },
  };

  window.History = History;
})();
