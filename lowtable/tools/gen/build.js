/* Build du lot 2. Exécuté par l'outil de génération avec readFile/saveFile/log fournis.
   En Node : remplacer readFile/saveFile par fs.promises.readFile/writeFile. */
async function buildLot2({ readFile, saveFile, log }) {
  const src = await readFile('export/lot2/src/lowtable-ingredients.js');
  const LT = new Function(src + '\nreturn LT;')();
  const recipesSrc = JSON.parse(await readFile('export/lot2/src/recettes-source.json'));
  const { ING, POSES, renderPose, plate, defsFor, usedGrads, POSE_Y, LIFT } = LT;
  const DX = [0, 0, 16, -12, 14, -6], ROT = [0, -3, 4, -4, 3, -2];
  const f = v => Math.round(v * 10) / 10;
  const poses = {}, files = {}, symbols = {};
  const plateMk = plate().replace(/([\s,(MLCQAHVZmlcqahvz-])0\./g, '$1.');
  symbols['ing-assiette'] = `<symbol id="ing-assiette" viewBox="0 0 400 320"><g transform="translate(200 190)">${plateMk}</g></symbol>`;
  files['icons/ing/assiette.svg'] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320"><defs>${defsFor(usedGrads(plateMk))}</defs><g id="ing-assiette" data-layer="0" transform="translate(200 190)">${plateMk}</g></svg>`;
  let maxPose = 0, totalPose = 0;
  for (const id of Object.keys(ING)) for (const pose of POSES) {
    const { markup, bbox } = renderPose(id, pose), sid = `ing-${id}-${pose}`;
    poses[sid] = { bbox, id };
    symbols[sid] = `<symbol id="${sid}" viewBox="0 0 400 320"><g transform="translate(200 ${POSE_Y})">${markup}</g></symbol>`;
    const file = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320"><defs>${defsFor(usedGrads(markup))}</defs><g id="${sid}" transform="translate(200 ${POSE_Y})">${markup}</g></svg>`;
    files[`icons/ing/${id}-${pose}.svg`] = file; maxPose = Math.max(maxPose, file.length); totalPose += file.length;
  }
  const allDefs = defsFor(Object.keys(LT.GR));
  const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none"><defs>${allDefs}</defs>\n${Object.values(symbols).join('\n')}\n</svg>`;
  files['sprite.svg'] = sprite;

  const recipes = [], compSizes = [];
  for (const rc of recipesSrc) {
    const layers = [{ layer: 0, refs: ['ing-assiette'], lift: 0 }];
    rc.layers.forEach((L, k) => {
      const i = k + 1, refs = L[0].split('+').map(s => { const [id, pose] = s.split(':'); if (!ING[id]) throw new Error('inconnu ' + id + ' dans ' + rc.id); return `ing-${id}-${pose}`; });
      const lift = -LIFT * (i - 1); let x1 = -1e9; const ys = [];
      refs.forEach(sid => { const b = poses[sid].bbox; x1 = Math.max(x1, b.x1); ys.push((b.y0 + b.y1) / 2); });
      const ax = f(Math.min(200 + x1 - 6, 322)), ay = f(POSE_Y + ys.reduce((a, b) => a + b, 0) / ys.length + lift);
      const finish = refs.every(sid => ING[poses[sid].id].kind === 'rain');
      layers.push({ layer: i, refs, lift, label: { name: L[1], qty: L[3] || null, note: L[2] }, anchor: [ax, ay], explode: { dx: DX[i] || 0, rot: ROT[i] || 0, cy: ay }, finish });
    });
    const nonRain = layers.filter(l => l.layer > 0 && !l.finish).map(l => l.layer);
    recipes.push({ id: rc.id, name: rc.name, tagline: rc.tagline, layers, mini: [0, ...nonRain.slice(-2)] });
    const used = [...new Set(layers.flatMap(l => l.refs))], symMk = used.map(s => symbols[s]).join('');
    const bodyMk = layers.map(l => `<g id="${rc.id}-l${l.layer}" data-layer="${l.layer}" data-explode="${l.layer ? `${l.explode.dx},${l.explode.rot},${l.explode.cy}` : '0,0,190'}"${l.layer ? ` data-anchor="${l.anchor.join(',')}" data-finish="${l.finish ? 1 : 0}"` : ''}><g class="L">${l.refs.map(r => `<use href="#${r}"${l.lift ? ` transform="translate(0 ${l.lift})"` : ''}/>`).join('')}</g></g>`).join('\n');
    const comp = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320" role="img" aria-label="${rc.name}"><defs>${defsFor(usedGrads(symMk))}${symMk}</defs>\n${bodyMk}\n</svg>`;
    files[`compositions/${rc.id}.svg`] = comp; compSizes.push([rc.id, comp.length]);
  }
  const ingredientsJson = {};
  for (const [id, o] of Object.entries(ING)) ingredientsJson[id] = { name: o.name, category: o.cat, kind: o.kind, poses: Object.fromEntries(POSES.map(p => [p, { symbol: `ing-${id}-${p}`, file: `icons/ing/${id}-${p}.svg`, bbox: Object.fromEntries(Object.entries(poses[`ing-${id}-${p}`].bbox).map(([k, v]) => [k, f(v)])) }])) };
  files['recettes.json'] = JSON.stringify({
    version: '1.4.0', viewBox: '0 0 400 320', plate: { symbol: 'ing-assiette', center: [200, 190] }, poseOrigin: [200, POSE_Y], layerLift: LIFT,
    explode: { scaleAtOne: .5, gapPerLayer: 170, offsetX: -104, labelsFrom: .6, note: 'Couche i à t : translate(dx·t, −gap·i·t) rotate(rot·t, 200, cy) dans un groupe translate(offsetX·t) + scale(1 − 0,5·t) centré sur (200,190). Implémentation de référence : card-demo.js (lot 1).' },
    sprite: 'sprite.svg', poses: POSES, ingredients: ingredientsJson, recipes
  }, null, 1);

  const cats = { proteine: 'Protéines', legume: 'Légumes', cremerie: 'Crèmerie', sauce: 'Sauces & nappes', finition: 'Finitions', plat: 'Préparations' };
  const useL = l => l.refs.map(r => `<use href="#${r}"${l.lift ? ` transform="translate(0 ${l.lift})"` : ''}/>`).join('');
  let ingHtml = '';
  for (const [ck, cl] of Object.entries(cats)) {
    const ids = Object.keys(ING).filter(id => ING[id].cat === ck);
    ingHtml += `<h2>${cl} <span>${ids.length}</span></h2><div class="ing-grid">` + ids.map(id => `<div class="ing"><div class="ing-h"><b>${ING[id].name}</b><code>${id}</code></div><div class="poses">${POSES.map(p => `<figure><div class="crop"><img loading="lazy" alt="" src="icons/ing/${id}-${p}.svg"></div><figcaption>${p === 'eparpille' ? 'éparpillé' : p === 'plat' ? 'à plat' : 'en tas'}</figcaption></figure>`).join('')}<figure class="mini"><div class="m"><img alt="" loading="lazy" src="icons/ing/assiette.svg"><img alt="" loading="lazy" src="icons/ing/${id}-tas.svg"></div><figcaption>40 px</figcaption></figure></div></div>`).join('') + '</div>';
  }
  const kb = n => Math.round(n / 102.4) / 10 + ' Ko';
  const compHtml = recipes.map(rc => `<article class="comp"><div class="comp-art"><div class="ccrop"><img alt="${rc.name}" src="compositions/${rc.id}.svg"></div><div class="m40"><div class="m">${rc.mini.flatMap(i => rc.layers[i].refs).map(r => `<img alt="" loading="lazy" src="icons/ing/${r.replace('ing-', '')}.svg">`).join('')}</div></div></div><div class="tag">${rc.tagline.map((w, i) => i === 2 ? `<em>${w}</em>` : `<span>${w}</span>`).join('')}</div><h3>${rc.name}</h3><ol>${rc.layers.slice(1).reverse().map(l => `<li><b>${l.label.name}</b>${l.label.qty ? ` <i>${l.label.qty}</i>` : ''}<span>${l.label.note}</span></li>`).join('')}</ol><code>compositions/${rc.id}.svg · ${kb(compSizes.find(c => c[0] === rc.id)[1])}</code></article>`).join('');
  const page = PAGE => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lowtable — bibliothèque d'ingrédients</title>
<link rel="stylesheet" href="integration/lowtable-ghost.css">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;700;800&family=Instrument+Serif:ital@0;1&display=swap">
<style>
:root{--ghost:rgba(42,125,38,.07);--bg:#FAF8F2;--surface:#FFFFFF;--surface2:#EFECE3;--ink:#141414;--muted:#6B6F68;--line:#DAD6CA;--green:#2A7D26}
:root[data-theme=dark]{--ghost:rgba(95,203,74,.06);--bg:#0E120F;--surface:#171C18;--surface2:#222822;--ink:#F3F1E8;--muted:#9AA394;--line:#2C332C;--green:#5FCB4A}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:'Inter Tight',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
a{color:var(--green)}a:hover{opacity:.8}
.wrap{position:relative;z-index:1;max-width:1280px;margin:0 auto;padding:48px 24px 96px;display:flex;flex-direction:column;gap:24px}
.top{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:16px}
.eyebrow{font:700 11px/1 'Inter Tight';letter-spacing:.16em;text-transform:uppercase;color:var(--green)}
h1{margin:8px 0 0;font:400 48px/1.05 'Instrument Serif',serif}h1 em{color:var(--green)}
.lead{margin:0;max-width:720px;font:500 15px/1.45 'Inter Tight';color:var(--muted)}
.themes{display:flex;gap:4px;padding:4px;border-radius:999px;background:var(--surface2)}
.themes button{height:36px;padding:0 14px;border:0;border-radius:999px;background:transparent;color:var(--muted);font:700 12px 'Inter Tight';cursor:pointer}
.themes button[aria-pressed=true]{background:var(--surface);color:var(--ink)}
.tabs{display:flex;gap:8px}.tabs a{height:44px;padding:0 18px;border:2px solid var(--ink);border-radius:999px;display:flex;align-items:center;font:800 12px 'Inter Tight';letter-spacing:.06em;text-transform:uppercase;color:var(--ink);text-decoration:none}
h2{margin:32px 0 0;font:800 22px 'Inter Tight';letter-spacing:-.02em;display:flex;gap:10px;align-items:baseline}h2 span{font-size:13px;color:var(--muted)}
.ing-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,560px),1fr));gap:12px}
.ing{background:var(--surface);border-radius:16px;padding:12px 16px;display:flex;flex-direction:column;gap:8px;content-visibility:auto;contain-intrinsic-size:auto 170px}
.ing-h{display:flex;justify-content:space-between;gap:12px;align-items:baseline}.ing-h b{font:700 15px 'Inter Tight'}code{font:500 11px ui-monospace,monospace;color:var(--muted)}
.poses{display:grid;grid-template-columns:repeat(3,minmax(0,1fr)) 56px;gap:8px;align-items:end}
figure{margin:0;display:flex;flex-direction:column;align-items:center;gap:4px}figure svg{width:100%;height:auto;display:block}
figcaption{font:700 11px 'Inter Tight';letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.crop{position:relative;width:100%;aspect-ratio:260/132;overflow:hidden}.crop img{position:absolute;width:153.8%;left:-26.9%;top:-89.4%}.m{position:relative;width:40px;height:32px;overflow:hidden}.m img{position:absolute;inset:0;width:40px;height:32px}
.comp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:16px}
.comp{background:var(--surface);border-radius:24px;padding:20px;display:flex;flex-direction:column;gap:10px;content-visibility:auto;contain-intrinsic-size:auto 560px}
.comp-art{position:relative}.ccrop{position:relative;width:100%;aspect-ratio:400/204;overflow:hidden}.ccrop img{position:absolute;width:100%;left:0;top:-47%}.m40{position:absolute;right:0;top:0;padding:4px;background:var(--surface2);border-radius:10px;line-height:0}
.tag{font:400 28px/1.05 'Instrument Serif',serif;display:flex;flex-direction:column}.tag em{color:var(--green)}
h3{margin:0;font:800 22px/1 'Inter Tight';letter-spacing:-.03em}
ol{margin:0;padding:10px 0 0;list-style:none;display:flex;flex-direction:column;gap:6px;border-top:1px solid var(--line)}
li{display:flex;flex-wrap:wrap;gap:0 6px;font:500 13px/1.35 'Inter Tight'}li b{font-weight:700}li i{font-style:normal;color:var(--muted)}li span{flex-basis:100%;color:var(--muted);font-size:12px}
</style></head><body>
<div class="lt-ghost" aria-hidden="true">lowtable</div>
<div class="wrap">
<div class="top"><div><div class="eyebrow">Lowtable · lot 2 · v1.4</div><h1>La bibliothèque. <em>Tout ce qui tient dans l'assiette.</em></h1></div>
<div class="themes" role="group" aria-label="Thème"><button data-t="light" aria-pressed="true">Clair</button><button data-t="dark" aria-pressed="false">Sombre</button></div></div>
<p class="lead">${Object.keys(ING).length} ingrédients × 3 poses, tous dans le même viewBox 400×320, ancrés sur la même assiette. Les compositions référencent les poses par symbole (sprite.svg), sans redessin. En haut à droite de chaque carte, la vignette 40 px (assiette + deux couches).</p>
<div class="tabs"><a href="galerie.html">30 compositions</a><a href="galerie-ingredients.html">Ingrédients</a></div>
${PAGE === 'comp' ? `<h2>Compositions <span>30</span></h2><div class="comp-grid">${compHtml}</div>` : `<div>${ingHtml}</div>`}
</div>
<script>document.querySelectorAll('[data-t]').forEach(function(b){b.addEventListener('click',function(){document.documentElement.setAttribute('data-theme',b.dataset.t);document.querySelectorAll('[data-t]').forEach(function(x){x.setAttribute('aria-pressed',x===b)})})});</script>
<script src="integration/lowtable-ghost.js"></script>
</body></html>`;
  files['galerie.html'] = page('comp'); files['galerie-ingredients.html'] = page('ing');
  for (const [p, c] of Object.entries(files)) await saveFile('export/lot2/' + p, c);
  const cs = compSizes.map(c => c[1]);
  log('ingrédients', Object.keys(ING).length, '| poses', Object.keys(ING).length * 3, '| pose moy.', kb(totalPose / (Object.keys(ING).length * 3)), 'max', kb(maxPose));
  log('sprite', kb(sprite.length), '| compo moy.', kb(cs.reduce((a, b) => a + b, 0) / cs.length), 'max', kb(Math.max(...cs)), '| >40 Ko :', compSizes.filter(c => c[1] > 40960).map(c => c[0] + ' ' + kb(c[1])).join(', ') || 'aucune');
}
