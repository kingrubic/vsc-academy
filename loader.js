(() => {
  const loader = document.querySelector('.vsc-loader');
  if (!loader) return;

  const startedAt = performance.now();
  const minimumDisplay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 120 : 1800;
  let dismissed = false;

  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    const wait = Math.max(0, minimumDisplay - (performance.now() - startedAt));
    window.setTimeout(() => {
      loader.classList.add('is-complete');
      document.body.classList.remove('is-loading');
      window.setTimeout(() => loader.remove(), 720);
    }, wait);
  };

  if (document.readyState === 'complete') dismiss();
  else window.addEventListener('load', dismiss, { once: true });

  window.setTimeout(dismiss, 4200);
})();
