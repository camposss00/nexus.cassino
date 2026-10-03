// Notify — toasts
(function () {
  const root = () => document.getElementById('toasts');

  function toast(kind, title, sub) {
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.innerHTML = `<strong>${title}</strong>${sub ? `<small>${sub}</small>` : ''}`;
    root().appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity 200ms, transform 200ms';
      el.style.opacity = '0';
      el.style.transform = 'translateX(20px)';
      setTimeout(() => el.remove(), 220);
    }, 3200);
  }

  window.Notify = {
    win(t, s) { toast('win', t, s); },
    loss(t, s) { toast('loss', t, s); },
    info(t, s) { toast('info', t, s); },
    warn(t, s) { toast('warn', t, s); },
  };
})();
