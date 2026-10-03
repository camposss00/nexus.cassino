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
            <button class="btn-ghost" id="sl-rules"><i class="fa-solid fa
