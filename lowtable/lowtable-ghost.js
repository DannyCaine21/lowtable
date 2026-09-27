/* Parallaxe du wordmark fantôme : ≤ 8 px, desktop uniquement, coupée sous prefers-reduced-motion. */
(function () {
  const el = document.querySelector('.lt-ghost'); if (!el) return;
  const desk = matchMedia('(min-width: 900px)'), rm = matchMedia('(prefers-reduced-motion: reduce)');
  let raf = 0;
  const upd = () => { raf = 0; const max = Math.max(1, document.documentElement.scrollHeight - innerHeight); el.style.setProperty('--lt-ghost-y', (desk.matches && !rm.matches ? -8 * scrollY / max : 0).toFixed(2) + 'px'); };
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(upd); }, { passive: true });
  addEventListener('resize', upd); upd();
})();
