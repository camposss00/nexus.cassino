// Wallet — saldo virtual, transações, lock de rodada
(function () {
  const KEY = 'nova7.wallet';

  const DEFAULT = { balance: 10000, initial: 10000 };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { ...DEFAULT };
      const parsed = JSON.parse(raw);
      return {
        balance: Number.isFinite(parsed.balance) ? parsed.balance : DEFAULT.balance,
        initial: Number.isFinite(parsed.initial) ? parsed.initial : DEFAULT.initial,
      };
    } catch { return { ...DEFAULT }; }
  }

  function save(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
    document.dispatchEvent(new CustomEvent('wallet:change', { detail: state }));
  }

  function fmt(n) {
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function validateAmount(n) {
    const v = Number(n);
    if (!Number.isFinite(v)) return null;
    if (v <= 0) return null;
    if (v > 1_000_000) return null;
    return Math.floor(v * 100) / 100;
  }

  // Lock por jogo — impede apostas simultâneas duplicando rodada
  const locks = new Set();

  const Wallet = {
    get() { return load(); },
    fmt,

    lock(game) {
      if (locks.has(game)) return false;
      locks.add(game);
      return true;
    },
    unlock(game) { locks.delete(game); },
    isLocked(game) { return locks.has(game); },

    placeBet(amount, game) {
      const v = validateAmount(amount);
      if (v === null) return null;
      const s = load();
      if (v > s.balance) return null;
      s.balance = Math.round((s.balance - v) * 100) / 100;
      save(s);
      return { amount: v, game, ts: Date.now() };
    },

    payout(amount) {
      const v = validateAmount(amount);
      if (v === null) return null;
      const s = load();
      s.balance = Math.round((s.balance + v) * 100) / 100;
      save(s);
      return v;
    },

    addVirtualBalance(amount) {
      const v = validateAmount(amount);
      if (v === null) return null;
      const s = load();
      s.balance = Math.round((s.balance + v) * 100) / 100;
      save(s);
      return v;
    },

    removeVirtualBalance(amount) {
      const v = validateAmount(amount);
      if (v === null) return null;
      const s = load();
      if (v > s.balance) return null;
      s.balance = Math.round((s.balance - v) * 100) / 100;
      save(s);
      return v;
    },

    reset() { save({ ...DEFAULT }); },
  };

  window.Wallet = Wallet;
})();
