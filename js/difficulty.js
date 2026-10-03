// Difficulty — FÁCIL / NORMAL / AVANÇADO (muda UI, nunca probabilidade)
(function () {
  const KEY = 'nova7.difficulty';
  const LEVELS = {
    easy:   { label: 'Fácil',    mode: 1 },
    normal: { label: 'Normal',   mode: 2 },
    hard:   { label: 'Avançado', mode: 3 },
  };

  const Difficulty = {
    levels: LEVELS,
    get() {
      const v = localStorage.getItem(KEY);
      return LEVELS[v] ? v : 'normal';
    },
    set(level) {
      if (!LEVELS[level]) return;
      localStorage.setItem(KEY, level);
      document.dispatchEvent(new CustomEvent('difficulty:change', { detail: level }));
    },
    mode() { return LEVELS[this.get()].mode; },
    isEasy() { return this.mode() === 1; },
    isNormal() { return this.mode() === 2; },
    isHard() { return this.mode() >= 3; },
    // mostra elementos que exigem no mínimo `min` (1/2/3)
    atLeast(min) { return this.mode() >= min; },
  };

  window.Difficulty = Difficulty;
})();
