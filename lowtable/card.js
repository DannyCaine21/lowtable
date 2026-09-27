/* Lowtable — carte repas (adaptée de la démo Claude Design, lot 1).
   Card.mount(root, opts) construit la carte dans `root` et gère : construction, assembler↔exploser,
   refus (swipe gauche), dressage (swipe droite). Retourne { destroy }.
   opts : { recipe, entry, svgInner, labels:[{id,title,qty,note}], onYes(), onNo(), toast(msg) } */
window.Card = (() => {
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const SPRING = 'cubic-bezier(.22,1.4,.36,1)', EASE = 'cubic-bezier(.2,.8,.2,1)';
  const S = .5, GAP = 170, OX = -104, THRESH = 110;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const PROTEIN = { poulet: 'Poulet', dinde: 'Dinde', boeuf: 'Bœuf', porc: 'Porc', poisson: 'Poisson', oeufs: 'Œufs', vege: 'Végé', agneau: 'Agneau' };

  /* Pile de repli (pas encore de composition dessinée) : assiette + disques colorés par famille d'ingrédient. */
  const PALETTE = { Boucherie: ['#E4B274', '#7A3F14'], Poissonnerie: ['#F2A98A', '#B9603F'], Légumes: ['#6AB24C', '#1B4A1A'], Crèmerie: ['#F6EFD8', '#C9B98A'], Épicerie: ['#E8B75E', '#B97A2C'], Autre: ['#D9D2C3', '#8E8676'] };
  function fallbackSvg(plateBase, layers) {
    const cys = [190, 184, 180, 172, 166, 158];
    let g = '';
    layers.forEach((L, k) => {
      const i = k + 1, cy = cys[i] || 158, rx = 96 - i * 12, ry = 30 - i * 3, [fill, edge] = PALETTE[L.rayon] || PALETTE.Autre;
      const rot = (i % 2 ? -3 : 3), sx = (i % 2 ? -8 : 8);
      g += `<g id="${L.id}" data-layer="${i}" data-explode="${sx},${rot},${cy}" data-anchor="${200 + rx - 6},${cy}" data-finish="0"><g class="L">
        <ellipse cx="200" cy="${cy + 4}" rx="${rx}" ry="${ry}" fill="${edge}" opacity=".55"/>
        <ellipse cx="200" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"/>
        <ellipse cx="${200 - rx * .3}" cy="${cy - ry * .35}" rx="${rx * .38}" ry="${ry * .3}" fill="#fff" opacity=".22"/></g></g>`;
    });
    return `${plateBase}${g}<path id="cloche" d="M70 150A130 96 0 0 1 330 150" fill="none" stroke="var(--ink)" stroke-width="1" opacity="0"/>`;
  }
  // plateBase = defs + assiette ; on l'enveloppe dans pile/float/dress
  function wrap(inner) { return inner.includes('id="pile"') ? inner : `<g id="pile"><g id="float"><g id="dress">${inner}</g></g></g>`; }

  function mount(root, o) {
    const r = o.recipe, e = o.entry || {};
    const tag = (r.tagline || '').split(/\s+/).filter(Boolean);
    const src = e.leftoverOf ? 'Reste d\'hier · rien à cuisiner' : (r.meals > 1 ? `À cuisiner · ${r.meals} repas pour 2` : 'À cuisiner');
    const labels = o.labels || [];
    root.innerHTML = `<article class="card" aria-label="Repas du jour">
      <div class="stamp yes" aria-hidden="true">MIAM</div><div class="stamp no" aria-hidden="true">NOPE</div>
      <div class="eyebrow">${esc(PROTEIN[r.protein] || r.protein)} · ${esc(src)}</div>
      ${tag.length ? `<div class="tagline" aria-label="${esc(r.tagline)}">${tag.map((w, i) => `<span><${i === tag.length - 1 ? 'em' : 'span'} data-word>${esc(w)}</${i === tag.length - 1 ? 'em' : 'span'}></span>`).join('')}</div>` : ''}
      <h1 class="title">${esc(r.name)}</h1>
      <div class="band">
        <div><b data-to="${r.time_min || 0}">0</b><small>MIN</small></div>
        <div><b data-to="${r.carbs || 0}">0</b><small>G GLUC.</small></div>
        <div><b data-to="${r.prot || 0}">0</b><small>G PROT.</small></div>
        <div><b data-to="${r.kcal || 0}">0</b><small>KCAL</small></div>
      </div>
      <div class="pileBox">
        <svg class="pileSvg" viewBox="0 90 400 210" role="img" aria-label="${esc(r.name)}, en couches">${wrap(o.svgInner)}</svg>
        <svg class="labelLines" aria-hidden="true"></svg>
        ${labels.map(L => `<div class="lab" data-for="${L.id}"><b>${esc(L.title)}${L.qty ? ` <span>${esc(L.qty)}</span>` : ''}</b>${L.note ? `<p>${esc(L.note)}</p>` : ''}</div>`).join('')}
      </div>
      <label class="scrub"><span class="eyebrow">Assemblé</span><input type="range" min="0" max="1" step="0.01" value="0" aria-label="Assembler ou exploser la pile"><span class="eyebrow">Explosé</span></label>
      ${(r.steps || []).length ? `<details class="steps"><summary>Étapes</summary><ol>${r.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol></details>` : ''}
    </article>`;

    const $ = s => root.querySelector(s);
    const card = $('.card'), box = $('.pileBox'), svg = $('.pileSvg'), pile = svg.querySelector('#pile'), lines = $('.labelLines');
    const range = $('.scrub input'), stampYes = $('.stamp.yes'), stampNo = $('.stamp.no');
    const fx = document.getElementById('fx');
    const layers = [...svg.querySelectorAll('[data-layer]')].map(g => {
      const [dx, rot, cy] = (g.dataset.explode || '0,0,190').split(',').map(Number);
      const [ax, ay] = (g.dataset.anchor || '0,0').split(',').map(Number);
      return { g, inner: g.firstElementChild, i: +g.dataset.layer, dx, rot, cy, ax, ay, label: root.querySelector(`[data-for="${g.id}"]`) };
    });
    const labelled = layers.filter(L => L.label).sort((a, b) => b.i - a.i);
    labelled.forEach(L => {
      const pl = document.createElementNS('http://www.w3.org/2000/svg', 'polyline'); pl.setAttribute('pathLength', '1'); L.line = pl; lines.appendChild(pl);
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); c.setAttribute('r', '2.5'); L.dot = c; lines.appendChild(c);
    });
    let t = 0, K = 1, busy = false, dead = false;
    const map = (t, x, y) => { const s = 1 - (1 - S) * t, vy = 90 - 360 * t; return [(200 + OX * t + (x - 200) * s) * K, (190 + (y - 190) * s - vy) * K]; };
    function render() {
      const W = box.clientWidth || 350; K = W / 400;
      const s = 1 - (1 - S) * t, vy = 90 - 360 * t, vh = 210 + 310 * t;
      svg.setAttribute('viewBox', `0 ${vy} 400 ${vh}`); svg.style.height = vh * K + 'px';
      pile.setAttribute('transform', `translate(${OX * t} 0) translate(200 190) scale(${s}) translate(-200 -190)`);
      layers.forEach(L => L.g.setAttribute('transform', `translate(${L.dx * t} ${-GAP * L.i * t}) rotate(${L.rot * t} 200 ${L.cy})`));
      const op = clamp((t - .6) / .4), LX = Math.round(W * .5);
      box.style.setProperty('--lab', op);
      let bottom = -1e9;
      labelled.forEach(L => {
        let [ax, ay] = map(t, L.ax + L.dx * t, L.ay - GAP * L.i * t);
        ax = Math.min(ax + 4, LX - 24);
        let y = ay - 8; if (y < bottom + 8) y = bottom + 8;
        L.label.style.transform = `translate(${LX}px, ${y}px)`;
        bottom = y + L.label.offsetHeight;
        L.line.setAttribute('points', `${ax},${ay} ${LX - 20},${ay} ${LX - 6},${y + 8}`);
        L.line.style.strokeDashoffset = 1 - op;
        L.dot.setAttribute('cx', ax); L.dot.setAttribute('cy', ay);
      });
      box.style.height = Math.max(vh * K, op > 0 ? bottom + 8 : 0) + 'px';
      range.value = t;
    }
    const setT = v => { t = clamp(v); render(); };
    function tween(from, to, dur, fn, done) {
      if (RM.matches) { fn(to); done && done(); return; }
      const t0 = performance.now(), back = x => 1 + 2.4 * Math.pow(x - 1, 3) + 1.4 * Math.pow(x - 1, 2);
      const step = now => { if (dead) return; const x = Math.min(1, (now - t0) / dur); fn(from + (to - from) * back(x)); x < 1 ? requestAnimationFrame(step) : (fn(to), done && done()); };
      requestAnimationFrame(step);
    }
    const snap = () => tween(t, t >= .5 ? 1 : 0, 350, setT);

    function build() {
      card.style.transform = ''; card.style.opacity = '';
      stampYes.style.opacity = stampNo.style.opacity = 0;
      if (RM.matches) return countUp(true);
      card.animate([{ transform: 'translateY(16px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 350, easing: EASE });
      layers.forEach(L => {
        const el = L.inner; if (!el) return;
        if (L.i === 0) return el.animate([{ transform: 'scale(.8)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 450, easing: SPRING, fill: 'backwards' });
        const d = 150 + (L.i - 1) * 90;
        if (L.g.dataset.finish === '1') return [...el.children].forEach(it => it.animate([{ transform: 'translateY(-34px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 300, easing: EASE, delay: d + Math.random() * 300, fill: 'backwards' }));
        const rr = (Math.random() * 6 - 3).toFixed(1);
        el.animate([{ transform: `translateY(-40px) rotate(${rr}deg)`, opacity: 0 }, { opacity: 1, offset: .35 }, { transform: 'none', opacity: 1 }], { duration: 450, easing: SPRING, delay: d, fill: 'backwards' });
      });
      root.querySelectorAll('[data-word]').forEach((w, j) => w.animate([{ transform: 'translateY(100%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 350, easing: EASE, delay: 200 + j * 120, fill: 'backwards' }));
      countUp();
    }
    function countUp(instant) {
      root.querySelectorAll('[data-to]').forEach(el => {
        const to = +el.dataset.to; if (instant) return (el.textContent = to);
        const t0 = performance.now();
        const step = now => { if (dead) return; const x = Math.min(1, (now - t0) / 400); el.textContent = Math.round(to * (1 - Math.pow(1 - x, 3))); if (x < 1) requestAnimationFrame(step); };
        requestAnimationFrame(step);
      });
    }
    function refuse() {
      if (busy) return; busy = true;
      if (RM.matches) return o.onNo();
      stampNo.animate([{ opacity: 0, transform: 'rotate(12deg) scale(.8)' }, { opacity: 1, transform: 'rotate(12deg) scale(1.1)' }], { duration: 200, easing: SPRING, fill: 'forwards' });
      const max = layers.length - 1;
      layers.forEach(L => {
        if (!L.inner) return;
        const plate = L.i === 0;
        const dx = plate ? -420 : (Math.random() * 2 - 1) * 220, dy = plate ? 20 : -60 - Math.random() * 120, rr = plate ? -10 : (Math.random() * 2 - 1) * 50;
        L.inner.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${dx}px,${dy}px) rotate(${rr}deg)`, opacity: 0 }], { duration: 320, easing: EASE, delay: (max - L.i) * 45, fill: 'forwards' });
      });
      card.animate([{ transform: card.style.transform || 'none' }, { transform: 'translateX(-120%) rotate(-14deg)', opacity: 0 }], { duration: 300, easing: EASE, delay: 260, fill: 'forwards' }).finished.then(() => o.onNo());
    }
    function accept() {
      if (busy) return; busy = true;
      if (RM.matches) return o.onYes();
      const go = () => {
        stampYes.animate([{ opacity: 0, transform: 'rotate(-12deg) scale(.8)' }, { opacity: 1, transform: 'rotate(-12deg) scale(1.1)' }], { duration: 200, easing: SPRING, fill: 'forwards' });
        const dress = svg.querySelector('#dress'), cloche = svg.querySelector('#cloche');
        dress && dress.animate([{ transform: 'none' }, { transform: 'scale(1.05,.92)', offset: .35 }, { transform: 'none' }], { duration: 420, easing: SPRING });
        cloche && cloche.animate([{ transform: 'translateY(0)', opacity: 0 }, { opacity: 1, offset: .25 }, { transform: 'translateY(-70px)', opacity: 0 }], { duration: 600, easing: EASE, delay: 120 });
        confetti();
        card.animate([{ transform: card.style.transform || 'none' }, { transform: 'translateX(120%) rotate(14deg)', opacity: 0 }], { duration: 350, easing: EASE, delay: 560, fill: 'forwards' }).finished.then(() => o.onYes());
      };
      t > .01 ? tween(t, 0, 250, setT, go) : go();
    }
    function confetti() {
      if (!fx) return;
      const cols = ['var(--green)', 'var(--lime)', 'var(--warm)', 'var(--ink)'];
      const rc = box.getBoundingClientRect(), fr = fx.getBoundingClientRect();
      const cx = rc.left - fr.left + rc.width / 2, cy = rc.top - fr.top + rc.height * .55;
      for (let j = 0; j < 22; j++) {
        const d = document.createElement('i'); d.className = 'confetto';
        d.style.background = cols[j % 4]; d.style.left = cx + 'px'; d.style.top = cy + 'px'; fx.appendChild(d);
        const a = Math.random() * Math.PI * 2, v = 90 + Math.random() * 110, x = Math.cos(a) * v, y = Math.sin(a) * v * .8 - 40;
        d.animate([{ transform: 'translate(-50%,-50%) scale(.4)', opacity: 1 }, { transform: `translate(calc(-50% + ${x * .8}px), calc(-50% + ${y}px)) scale(1)`, opacity: 1, offset: .55 }, { transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y + 70}px)) scale(.9)`, opacity: 0 }], { duration: 800, easing: EASE, fill: 'forwards' }).finished.then(() => d.remove());
      }
    }
    /* gestes : verrouillage d'axe */
    let g = null, raf = 0;
    const onDown = ev => { if (busy || ev.target.closest('button, input, summary, details')) return; g = { x: ev.clientX, y: ev.clientY, t0: t, mode: null, dx: 0, cx: 0, id: ev.pointerId }; };
    const onMove = ev => {
      if (!g) return;
      const dx = ev.clientX - g.x, dy = ev.clientY - g.y;
      if (!g.mode && Math.hypot(dx, dy) > 8) {
        g.mode = Math.abs(dx) > Math.abs(dy) ? 'swipe' : (ev.target.closest('.pileBox') ? 'scrub' : null);
        if (!g.mode) { g = null; return; }
        try { card.setPointerCapture(g.id); } catch (e) {}
        if (g.mode === 'swipe') loop();
      }
      if (g.mode === 'scrub') setT(g.t0 - dy / 220);
      if (g.mode === 'swipe') g.dx = dx;
      if (g.mode) ev.preventDefault();
    };
    function loop() {
      if (!g || g.mode !== 'swipe') return;
      g.cx += (g.dx - g.cx) * .15;
      card.style.transform = `translateX(${g.cx}px) rotate(${g.cx / 20}deg)`;
      const a = clamp(Math.abs(g.cx) / THRESH);
      const st = g.cx > 0 ? stampYes : stampNo, other = g.cx > 0 ? stampNo : stampYes;
      st.style.opacity = a; st.style.setProperty('--s', .8 + .3 * a); other.style.opacity = 0;
      raf = requestAnimationFrame(loop);
    }
    const onEnd = () => {
      if (!g) return;
      const m = g.mode, cx = g.cx; cancelAnimationFrame(raf); g = null;
      if (m === 'scrub') return snap();
      if (m !== 'swipe') return;
      if (cx > THRESH * .9) return accept();
      if (cx < -THRESH * .9) return refuse();
      card.animate([{ transform: card.style.transform }, { transform: 'none' }], { duration: 350, easing: SPRING });
      card.style.transform = ''; stampYes.style.opacity = stampNo.style.opacity = 0;
    };
    card.addEventListener('pointerdown', onDown); card.addEventListener('pointermove', onMove);
    card.addEventListener('pointerup', onEnd); card.addEventListener('pointercancel', onEnd);
    range.addEventListener('input', () => setT(+range.value)); range.addEventListener('change', snap);
    const onResize = () => render(); addEventListener('resize', onResize);

    render();
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { if (!dead) { render(); build(); } });
    return { accept, refuse, destroy() { dead = true; removeEventListener('resize', onResize); } };
  }
  return { mount, fallbackSvg };
})();
