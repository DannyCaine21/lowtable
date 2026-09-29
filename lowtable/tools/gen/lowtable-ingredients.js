/* Lowtable — générateur d'ingrédients (rendu réaliste 4a). Déterministe : même id + pose => même SVG.
   Chaque pose est dessinée autour de (0,0) puis posée en (200,184) dans un viewBox 400×320. */
var LT = (function () {
  const f = v => Math.round(v * 10) / 10;
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) % 2147483645 + 1; };
  const rng = seed => { let s = seed; return () => { s = s * 16807 % 2147483647; return (s - 1) / 2147483646; }; };
  const bp = (r, rx, ry, n, jit) => { const o = [], ph = r() * 6.2832; for (let j = 0; j < n; j++) { const a = j / n * 6.2832 + ph, k = 1 + (r() * 2 - 1) * jit; o.push([Math.cos(a) * rx * k, Math.sin(a) * ry * k]); } return o; };
  /* courbe fermée lissée par milieux + contrôles quadratiques (4 nombres par segment) */
  const sm = P => { const n = P.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; const m0 = mid(P[n - 1], P[0]); let d = `M${f(m0[0])} ${f(m0[1])}`; for (let j = 0; j < n; j++) { const p = P[j], m = mid(p, P[(j + 1) % n]); d += `Q${f(p[0])} ${f(p[1])} ${f(m[0])} ${f(m[1])}`; } return d + 'Z'; };
  const mv = (P, dx, dy, s = 1) => P.map(([x, y]) => [x * s + dx, y * s + dy]);
  const blob = (r, rx, ry, n = 8, jit = .15, dx = 0, dy = 0) => sm(mv(bp(r, rx, ry, n, jit), dx, dy));
  const ell = (rx, ry, dx = 0, dy = 0) => `M${f(dx - rx)} ${f(dy)}a${f(rx)} ${f(ry)} 0 1 0 ${f(2 * rx)} 0a${f(rx)} ${f(ry)} 0 1 0 ${f(-2 * rx)} 0Z`;
  const leaf = (wl, wr, h, dx = 0, dy = 0) => `M${f(dx)} ${f(dy - h)}C${f(dx + wr)} ${f(dy - h * .35)} ${f(dx + wr * .9)} ${f(dy + h * .55)} ${f(dx)} ${f(dy + h)}C${f(dx - wl * .9)} ${f(dy + h * .55)} ${f(dx - wl)} ${f(dy - h * .35)} ${f(dx)} ${f(dy - h)}Z`;
  const rrect = (w, h, q, dx = 0, dy = 0) => { const x = dx - w / 2, y = dy - h / 2; return `M${f(x + q)} ${f(y)}H${f(x + w - q)}Q${f(x + w)} ${f(y)} ${f(x + w)} ${f(y + q)}V${f(y + h - q)}Q${f(x + w)} ${f(y + h)} ${f(x + w - q)} ${f(y + h)}H${f(x + q)}Q${f(x)} ${f(y + h)} ${f(x)} ${f(y + h - q)}V${f(y + q)}Q${f(x)} ${f(y)} ${f(x + q)} ${f(y)}Z`; };
  const cres = (r, len, th, bend) => { const o = [], i = [], N = 6; for (let j = 0; j <= N; j++) { const t = j / N, x = (t - .5) * len, b = 1 - Math.pow(2 * t - 1, 2), y = -bend * b + (r() - .5) * .8; o.push([x, y]); i.push([x * .96, y + th * (.25 + .75 * b)]); } return sm(o.concat(i.reverse())); };
  const P = (d, fill) => `<path d="${d}" fill="${fill}"/>`;
  const S = (d, c, w) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const SH = () => ''; /* les ombres de contact sont regroupées par pose, voir renderPose */
  const u = n => `url(#lg-${n})`;
  const body = (d, g) => SH(d) + P(d, u(g));
  const HL = (r, rx, ry, dx, dy, a = .4) => P(blob(r, rx, ry, 6, .2, dx, dy), `rgba(255,255,255,${a})`);
  const T = (x, y, rot = 0, s = 1) => `translate(${f(x)} ${f(y)})${rot ? ` rotate(${f(rot)})` : ''}${s !== 1 ? ` scale(${Math.round(s * 100) / 100})` : ''}`;
  const seeds = (r, rx, ry, c) => { let m = ''; for (let j = 0; j < 7; j++) { const a = j * .8976 + r() * .3; m += P(ell(.9, .55, Math.cos(a) * rx, Math.sin(a) * ry), c); } return m; };
  const strand = (r, w, h) => { const p = () => [f((r() * 2 - 1) * w), f((r() * 2 - 1) * h)]; const a = p(), b = p(), c = p(), d = p(); return `M${a[0]} ${a[1]}C${b[0]} ${b[1]} ${c[0]} ${c[1]} ${d[0]} ${d[1]}`; };
  const crumble = g => r => { let m = ''; for (let j = 0; j < 4; j++) { const x = (r() * 2 - 1) * 9, y = (r() * 2 - 1) * 5; m += body(blob(r, 4 + r() * 3, 3 + r() * 2, 6, .3, x, y), g); } for (let j = 0; j < 2; j++) m += P(ell(.9, .7, (r() * 2 - 1) * 8, (r() * 2 - 1) * 4), 'rgba(240,190,150,.5)'); return m; };

  /* ---------- dégradés partagés ---------- */
  const GR = {};
  const tone = (n, a, b, c, cx = .36, cy = .3, rr = .8) => { GR[n] = { cx, cy, r: rr, stops: [[0, a], [.5, b], [1, c]] }; };
  GR.shadow = { cx: .5, cy: .5, r: .5, stops: [[0, '#3A2A14', .26], [.6, '#3A2A14', .12], [1, '#3A2A14', 0]] };
  GR.plate = { cx: .42, cy: .35, r: .75, stops: [[0, '#FFFFFF'], [.7, '#F3F0EA'], [1, '#DAD4C8']] };
  GR.well = { cx: .5, cy: .62, r: .7, stops: [[0, '#FBFAF7'], [.75, '#EFEBE3'], [1, '#E2DCD0']] };
  GR.sheen = { cx: .5, cy: .5, r: .5, stops: [[0, '#FFFFFF', .7], [1, '#FFFFFF', 0]] };
  GR.sear = { cx: .5, cy: .5, r: .5, stops: [[0, '#7A3F14', .75], [.6, '#8E4E1E', .35], [1, '#8E4E1E', 0]] };
  tone('chicken', '#F6DDB0', '#E4B274', '#9A5A26'); tone('chickpale', '#FAEBD2', '#EBCC9E', '#B98A52');
  tone('roast', '#F2C07A', '#D9913E', '#8A4A18'); tone('mince', '#A8684A', '#6E3520', '#3E1A0C');
  tone('turkeymince', '#EACBA4', '#C29366', '#8E6038'); tone('beef', '#9A5234', '#6A2C16', '#3E160A');
  tone('braise', '#9A5230', '#6A2E14', '#3A1606'); tone('porksear', '#C88A56', '#9E5E2E', '#6E3A16');
  tone('porkpink', '#F8DCC8', '#EDB9A0', '#D8987A'); tone('porkpale', '#F7E2CE', '#E8C4A4', '#C99C76');
  tone('ham', '#F8C2BA', '#E8928A', '#B8625E'); tone('lardon', '#EDB096', '#C8704E', '#8A3A22');
  tone('escalope', '#F4DAA4', '#DDAA62', '#A8702E'); tone('salmon', '#FDBB96', '#F2875C', '#C2502E');
  tone('smoked', '#FFC2A2', '#F79266', '#D2603A'); tone('cod', '#FFFFFF', '#F4EDE0', '#D8CCB6');
  tone('trout', '#FAC0A4', '#EC8E70', '#B85A40'); tone('shrimp', '#FFCDAE', '#F7925F', '#D2582E');
  tone('tuna', '#DDBAA6', '#B48A76', '#7A5646'); tone('eggwhite', '#FFFFFF', '#F6F2E8', '#DAD2C0');
  tone('yolkcooked', '#FFDC78', '#F4B832', '#D8901A'); tone('yolk', '#FFD85E', '#F5A81E', '#C8700A', .35, .28, .75);
  tone('tofu', '#F8E2B0', '#E0B46A', '#B07A34'); tone('zuccskin', '#5A9A3C', '#3A7028', '#244C18');
  tone('zuccflesh', '#F8F8D2', '#E6EAB0', '#C9D488'); tone('stem', '#D2E498', '#A6C466', '#7A9A40');
  tone('broc', '#6AA646', '#3E7A2C', '#1F4A16'); tone('pepred', '#FF8466', '#E0452C', '#9E2414');
  tone('pepyellow', '#FFE594', '#F2B632', '#C98410'); tone('spinach', '#6AB24C', '#3C8A2F', '#1B4A1A', .35, .3, .85);
  tone('tomato', '#FF947A', '#E8432A', '#A82414'); tone('cherry', '#FF8068', '#E0341E', '#961808', .35, .3, .75);
  tone('eggplant', '#F2D8A2', '#D8A862', '#9E6A2E'); tone('mush', '#EFDDC2', '#CCA67E', '#8A6444');
  tone('mushflesh', '#FBF3E4', '#EEDFC6', '#D2BC98'); tone('bean', '#96CA60', '#548F32', '#2E5E1A');
  tone('sprout', '#B2D672', '#74A842', '#3E7222'); tone('cucskin', '#467A30', '#2E5A20', '#1C3A14');
  tone('cucflesh', '#F6F9E2', '#E2ECBA', '#C6D896'); tone('avo', '#EEF2A6', '#BED060', '#6E8F2A');
  tone('onion', '#FFFBF0', '#F4EBD2', '#E6D6AE'); tone('lettuce', '#DCF2A8', '#A2D262', '#5E9A34');
  tone('leek', '#F2F8DA', '#D6E6AA', '#AEC87A'); tone('goat', '#FFFFFF', '#F7F3EA', '#DCD3C0');
  tone('feta', '#FFFFFF', '#F4F0E4', '#D6CEBC'); tone('cream', '#FFFFFF', '#F8F4EC', '#E0D8C8');
  tone('butter', '#FFF6BE', '#F8DE7A', '#D8B444'); tone('mustard', '#F6D05A', '#D8A21E', '#A87410');
  tone('herb', '#9ED66A', '#5FA23E', '#3D7A28', .35, .3, .85); tone('parsley', '#78B850', '#3E8A2A', '#24561A');
  tone('lemonrind', '#FFEE7A', '#F6CC2A', '#D8A410'); tone('lemonflesh', '#FFF8BE', '#F8E274', '#EAC840');
  tone('ginger', '#F6E2AE', '#E0C080', '#C79F5A'); tone('curry', '#F2A857', '#D2702A', '#9E4415');
  tone('omelette', '#FFEFA2', '#F6D25C', '#D8A430'); tone('frittata', '#FBE09A', '#EDBE5C', '#C08A34');
  tone('meatball', '#B8744A', '#8A4A26', '#52260E'); tone('patty', '#8E4E2E', '#62301A', '#3A180A');
  tone('scrambled', '#FFF3AE', '#F8DA66', '#DDB030');
  tone('sauce', '#F6DC98', '#E8B75E', '#B97A2C', .4, .36, .72); tone('tomsauce', '#F58A62', '#D8432A', '#9E2A18', .4, .36, .72);
  tone('soy', '#A8683A', '#5A2E12', '#2E1406', .4, .36, .72); tone('veloute', '#D8E89A', '#AECA62', '#7A9A3A', .4, .36, .72);
  tone('broth', '#F8E4A0', '#E8BE62', '#C98E34', .4, .36, .72); tone('winesauce', '#9A4A34', '#5E1E14', '#3A0E08', .4, .36, .72);

  const defsFor = names => names.map(n => { const g = GR[n]; return `<radialGradient id="lg-${n}" cx="${g.cx}" cy="${g.cy}" r="${g.r}">${g.stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined && a < 1 ? ` stop-opacity="${a}"` : ''}/>`).join('')}</radialGradient>`; }).join('');
  const usedGrads = markup => [...new Set([...markup.matchAll(/url\(#lg-([a-z0-9]+)\)/g)].map(m => m[1]))];

  /* ---------- pièces ---------- */
  const PC = {
    'poulet-blanc': r => body(blob(r, 22, 11, 8, .1), 'chickpale') + S('M-12 -5L-4 6M-2 -7L6 5M8 -6L14 3', 'rgba(150,90,40,.38)', 2.2) + HL(r, 9, 2.5, -5, -6),
    'poulet-cuisse': r => { const rx = 20 + r() * 6, ry = 13 + r() * 4; let m = body(blob(r, rx, ry, 9, .16), 'chicken'); for (let j = 0; j < 2; j++) m += P(blob(r, rx * (.3 + r() * .25), ry * (.25 + r() * .2), 7, .3, (r() * 2 - 1) * rx * .4, (r() * 2 - 1) * ry * .35), u('sear')); for (let j = 0; j < 3; j++) { const y = (r() * 2 - 1) * ry * .5; m += S(`M${f(-rx * .55)} ${f(y)}Q0 ${f(y - 3)} ${f(rx * .5)} ${f(y + 1)}`, 'rgba(140,80,30,.28)', .9); } return m + HL(r, rx * .35, ry * .18, -rx * .25, -ry * .5, .45); },
    'poulet-roti': r => { const d = blob(r, 58, 34, 10, .06); let m = SH(d) + P(blob(r, 19, 12, 7, .1, -50, 14), u('roast')) + P(blob(r, 19, 12, 7, .1, 50, 14), u('roast')) + P(d, u('roast')); for (let j = 0; j < 6; j++) m += P(blob(r, 6 + r() * 6, 3 + r() * 3, 6, .3, (r() * 2 - 1) * 40, (r() * 2 - 1) * 18), u('sear')); return m + S('M-30 -4Q0 -14 30 -4', 'rgba(120,60,20,.35)', 1.2) + HL(r, 24, 6, -14, -18, .4) + HL(r, 8, 3, -50, 10, .35); },
    'pilon': r => { const d = blob(r, 16, 10, 8, .08); return SH(d) + P(ell(3.6, 2.8, 17, 1), '#F3EBDA') + P(d, u('roast')) + P(blob(r, 6, 3, 6, .3, -2, 1), u('sear')) + HL(r, 6, 1.8, -4, -5, .4); },
    'boeuf-hache': crumble('mince'),
    'dinde-hachee': crumble('turkeymince'),
    'thon': r => crumble('tuna')(r) + S('M-6 -2Q0 -4 6 -1', 'rgba(250,230,215,.5)', .8),
    'bavette': r => { const d = sm(bp(r, 24, 5.5, 10, .08).map(([x, y]) => [x, y + x * x * .012])); return body(d, 'beef') + P(sm(bp(r, 17, 1.6, 8, .1).map(([x, y]) => [x, y + x * x * .012 - .5])), 'rgba(196,84,74,.75)') + HL(r, 10, 1.4, -6, -3, .3); },
    'boeuf-braise': r => body(blob(r, 12, 10.5, 6, .12), 'braise') + P(blob(r, 5, 3, 6, .2, -3, -3), 'rgba(255,200,160,.18)') + HL(r, 4, 1.8, -4, -5, .5),
    'filet-mignon': r => body(blob(r, 17, 10.5, 9, .06), 'porksear') + P(blob(r, 13.5, 7.8, 9, .05, -.8, -1.4), u('porkpink')) + HL(r, 5, 1.6, -4, -5, .35),
    'porc-roti': r => body(blob(r, 30, 15, 10, .06), 'porksear') + P(blob(r, 26, 12, 10, .05, -1, -1.5), u('porkpale')) + S('M-24 -6Q0 -15 24 -6', 'rgba(255,244,228,.75)', 1.6) + HL(r, 10, 2.5, -8, -6, .3),
    'jambon': r => body(blob(r, 26, 13, 11, .2), 'ham') + S('M-22 -6Q-6 -14 10 -10Q20 -8 24 -2', '#FFF1EC', 2.2) + S('M-10 2Q2 -2 14 4', 'rgba(160,70,70,.35)', 1.1) + HL(r, 8, 2, -6, -4, .35),
    'lardons': r => body(rrect(15, 9, 2.5), 'lardon') + P(rrect(13, 2.4, 1.2, 0, -1), '#FBEBDD') + HL(r, 4, 1, -3, -3, .4),
    'dinde-escalope': r => { let m = body(blob(r, 32, 16, 10, .12), 'escalope'); for (let j = 0; j < 3; j++) m += P(blob(r, 5 + r() * 5, 3 + r() * 2, 6, .3, (r() * 2 - 1) * 18, (r() * 2 - 1) * 7), u('sear')); return m + HL(r, 12, 3, -8, -8, .35); },
    'dinde-lamelle': r => { const d = sm(bp(r, 18, 5, 9, .1).map(([x, y]) => [x, y + x * x * .01])); return body(d, 'escalope') + P(blob(r, 5, 2, 6, .3, 3, 0), u('sear')) + HL(r, 7, 1.2, -4, -2.5, .35); },
    'saumon-pave': r => { let m = body(blob(r, 30, 17, 8, .05), 'salmon'); for (let j = 0; j < 4; j++) { const x = -18 + j * 11; m += S(`M${x} -13Q${x + 6} 0 ${x} 13`, 'rgba(255,236,222,.75)', 1.3); } return m + P(blob(r, 20, 6, 7, .2, -2, -8), 'rgba(190,105,45,.35)') + HL(r, 10, 2.5, -8, -9, .4); },
    'saumon-fume': r => { let m = body(blob(r, 26, 10, 12, .22), 'smoked'); for (let j = 0; j < 3; j++) { const y = -5 + j * 4.5; m += S(`M-20 ${f(y)}Q0 ${f(y - 3)} 20 ${f(y + 1)}`, 'rgba(255,225,205,.6)', 1); } return m + HL(r, 9, 2, -6, -5, .35); },
    'cabillaud': r => { let m = body(blob(r, 30, 16, 9, .08), 'cod'); for (let j = 0; j < 4; j++) { const x = -16 + j * 10; m += S(`M${x} -11Q${x + 5} 0 ${x - 1} 11`, 'rgba(190,172,145,.55)', 1.1); } return m + P(blob(r, 18, 5, 7, .2, 0, -8), 'rgba(232,192,118,.35)') + HL(r, 9, 2.5, -8, -8, .5); },
    'truite': r => { const d = blob(r, 32, 11, 10, .06); let m = SH(d) + P(blob(r, 32, 11.5, 10, .03, 0, 1.8), '#9EA5A0') + P(d, u('trout')); for (let j = 0; j < 4; j++) { const x = -18 + j * 12; m += S(`M${x} -8Q${x + 4} 0 ${x} 8`, 'rgba(255,230,215,.6)', 1); } return m + HL(r, 10, 2, -8, -6, .35); },
    'crevettes': r => { const o = [], i = [], N = 7; for (let j = 0; j <= N; j++) { const t = j / N, a = (-.1 + t * 1.2) * Math.PI, th = (1 - t * .6) * 4.4; o.push([Math.cos(a) * (9 + th), Math.sin(a) * (9 + th) * .82]); i.push([Math.cos(a) * (9 - th), Math.sin(a) * (9 - th) * .82]); } const seg = o.map((k, j) => [k, i[j]]); let m = body(sm(o.concat(i.slice().reverse())), 'shrimp'); for (let j = 1; j < N; j++) { const [k, q] = seg[j]; m += S(`M${f(k[0])} ${f(k[1])}L${f(q[0])} ${f(q[1])}`, 'rgba(255,235,220,.55)', .8); } const e = o[N]; return m + P(blob(r, 4, 2.6, 6, .2, e[0] - 2, e[1] + 1), '#E0602F') + HL(r, 4, 1.4, -6, 4, .45); },
    'oeuf-entier': r => body(blob(r, 16, 11, 9, .05), 'eggwhite') + P(blob(r, 7.5, 6, 8, .06, 1, -.5), u('yolkcooked')) + HL(r, 5, 1.6, -7, -5, .6),
    'oeuf-poche': r => body(blob(r, 21, 14, 11, .24), 'eggwhite') + P(ell(9, 7.5, 1, -2), 'rgba(160,110,20,.2)') + P(blob(r, 8.5, 7, 9, .05, 0, -3), u('yolk')) + HL(r, 3.5, 2, -3, -6, .8) + HL(r, 7, 2, -10, -6, .5),
    'tofu': r => body(rrect(20, 15, 3.5), 'tofu') + P(rrect(16, 5, 2.5, -1, -4), 'rgba(255,240,205,.45)') + P(blob(r, 5, 2, 6, .3, 3, 3), 'rgba(150,90,30,.3)'),
    'courgette-rondelles': r => { const d = ell(11, 8.6); return SH(d) + P(d, u('zuccskin')) + P(ell(9.4, 7.2, -.3, -.4), u('zuccflesh')) + seeds(r, 5.2, 4, 'rgba(196,202,120,.85)') + P(blob(r, 5, 2.4, 6, .3, 1, 1), 'rgba(176,138,60,.28)') + HL(r, 4, 1.2, -3, -4.5, .35); },
    'courgette-spaghettis': r => { let m = ''; for (let j = 0; j < 6; j++) { const d = strand(r, 18, 8); m += S(d, '#9FB463', 3.4) + S(d, '#DDE6A6', 2.2); } return m; },
    'brocoli': r => { let m = SH(ell(12, 9, 0, 2)) + P(blob(r, 4.5, 7, 6, .1, 0, 7), u('stem')); [[-7, -1, 6], [0, -4, 7], [7, -1, 6], [-3, 3, 5.5], [4, 3, 5.5], [0, -9, 5]].forEach(([x, y, s]) => { m += P(blob(r, s, s * .86, 5, .14, x, y), u('broc')); }); for (let j = 0; j < 4; j++) m += P(ell(.9, .8, (r() * 2 - 1) * 9, -2 + (r() * 2 - 1) * 6), 'rgba(150,205,115,.55)'); return m + HL(r, 4, 1.5, -4, -10, .25); },
    'poivron': r => body(cres(r, 26, 5, 5), r() < .3 ? 'pepyellow' : 'pepred') + S('M-10 -4Q0 -8 10 -4', 'rgba(255,255,255,.55)', 1.2),
    'epinards': r => { const w = 10 + r() * 4, h = 20 + r() * 7, wl = w * (.85 + r() * .3), wr = w * (.85 + r() * .3); let m = P(leaf(wl * 1.04, wr * 1.04, h * 1.02, 1, 3), 'rgba(20,50,15,.3)') + P(leaf(wl, wr, h), u('spinach')) + P(leaf(wl * .45, wr * .3, h * .7, -w * .3, -h * .1), 'rgba(255,255,255,.1)') + S(`M0 ${f(-h * .8)}Q${f(w * .15)} 0 0 ${f(h * .95)}`, 'rgba(190,230,160,.55)', 1.1); const y = -h * .1; m += S(`M${f(-wl * .6)} ${f(y - 5)}Q${f(-wl * .3)} ${f(y - 1)} 0 ${f(y)}Q${f(wr * .3)} ${f(y - 1)} ${f(wr * .6)} ${f(y - 5)}`, 'rgba(190,230,160,.3)', .8); return m; },
    'tomate': r => { const d = ell(12, 10); let m = SH(d) + P(d, u('tomato')) + P(ell(10, 8.2), 'rgba(255,120,95,.5)'); for (let j = 0; j < 3; j++) { const a = j * 2.094 + .3; m += P(blob(r, 3.4, 2.6, 6, .15, Math.cos(a) * 4.8, Math.sin(a) * 4), 'rgba(255,196,150,.7)') + P(ell(.8, .55, Math.cos(a) * 5, Math.sin(a) * 4.2), '#F6E3A0'); } return m + HL(r, 4, 1.4, -4, -5, .45); },
    'tomates-cerises': r => { const d = ell(6.4, 6); return SH(d) + P(d, u('cherry')) + P(ell(2, 1.3, -2, -2.6), 'rgba(255,255,255,.75)') + (r() < .5 ? S('M0 -6L-2 -8M0 -6L2 -8.2M0 -6L0 -9', '#4E7A2E', 1) : ''); },
    'aubergine': r => { const d = ell(13, 10); return SH(d) + P(d, '#3E2244') + P(ell(11.4, 8.6, -.2, -.4), u('eggplant')) + P(blob(r, 6, 3, 6, .3, 1, 1), 'rgba(140,80,30,.35)') + seeds(r, 5, 3.6, 'rgba(170,120,60,.5)') + HL(r, 4, 1.2, -3, -5, .3); },
    'champignons': r => { const cap = 'M-11 1C-11 -9 11 -9 11 1C6 3 -6 3 -11 1Z'; return SH(cap) + P('M-3.5 1L-3 9Q0 10.5 3 9L3.5 1Z', u('mushflesh')) + P(cap, u('mush')) + S('M-10 0C-10 -8 10 -8 10 0', '#7A5436', 1.4) + S('M-6 2L-2 7M0 2L0 8M6 2L2 7', 'rgba(120,90,60,.35)', .7) + HL(r, 4, 1.3, -3, -5, .3); },
    'haricots-verts': r => body(sm(bp(r, 22, 2.8, 10, .06).map(([x, y]) => [x, y + x * x * .01])), 'bean') + S('M-16 1.4Q0 -1.2 16 1.4', 'rgba(220,245,180,.5)', .8),
    'choux-bruxelles': r => { let m = body(blob(r, 10, 9, 8, .06), 'sprout'); for (let j = 1; j < 4; j++) m += S(`M${-9 + j * 2} ${f(2 - j * 2.3)}Q0 ${f(-j * 3.8)} ${9 - j * 2} ${f(2 - j * 2.3)}`, 'rgba(232,246,196,.7)', .9); return m + P(blob(r, 5, 3, 6, .3, 1, 2), 'rgba(150,110,40,.35)'); },
    'concombre': r => { const d = ell(11, 8.6); return SH(d) + P(d, u('cucskin')) + P(ell(9.6, 7.4, -.2, -.3), u('cucflesh')) + seeds(r, 3.6, 2.6, 'rgba(210,222,170,.95)') + HL(r, 4, 1.2, -3, -4.5, .4); },
    'avocat': r => { const d = cres(r, 28, 6, 4); return body(d, 'avo') + S('M-14 0Q0 -8 14 0', '#2E3A1A', 1.8) + HL(r, 6, 1.2, -3, -1, .3); },
    'oignon': r => { const rx = 10 + r() * 3, ring = `M${f(-rx)} 0A${f(rx)} ${f(rx * .75)} 0 0 1 ${f(rx)} 0L${f(rx - 4)} 0A${f(rx - 4)} ${f(rx * .75 - 2.8)} 0 0 0 ${f(-(rx - 4))} 0Z`; return SH(ring) + P(ring, u('onion')) + S(`M${f(-rx + 1)} 0A${f(rx - 1)} ${f(rx * .75 - 1)} 0 0 1 ${f(rx - 1)} 0`, 'rgba(255,255,255,.8)', .8); },
    'laitue': r => { let m = body(blob(r, 30, 17, 15, .2), 'lettuce') + S('M-24 3Q0 -2 24 -4', 'rgba(240,252,215,.75)', 1.3); for (let j = 0; j < 4; j++) { const x = -16 + j * 10; m += S(`M${x} 1Q${x + 3} -6 ${x + 6} -12`, 'rgba(240,252,215,.45)', .8); } return m; },
    'poireau': r => { const d = ell(9, 7.2); let m = SH(d) + P(d, u('leek')); [6.6, 4.4, 2.4].forEach(k => { m += S(ell(k, k * .8), 'rgba(150,185,100,.6)', .8); }); return m; },
    'fromage-rape': r => { let m = ''; for (let j = 0; j < 3; j++) { const x = (r() * 2 - 1) * 7, y = (r() * 2 - 1) * 4, a = r() * 3.14, dx = Math.cos(a) * 5, dy = Math.sin(a) * 2, d = `M${f(x - dx)} ${f(y - dy)}Q${f(x)} ${f(y - 2)} ${f(x + dx)} ${f(y + dy)}`; m += S(d, '#C99A2A', 2.8) + S(d, '#F7D86E', 1.8); } return m; },
    'chevre': r => body(blob(r, 12, 10, 9, .05), 'goat') + S(ell(11.2, 9.2), '#E6DECB', 1.6) + P(blob(r, 3, 2, 6, .3, 3, 2), 'rgba(210,200,180,.5)') + HL(r, 4, 1.5, -4, -4, .6),
    'feta': r => body(blob(r, 7, 6, 5, .22), 'feta') + P(ell(.8, .6, 2, 1), 'rgba(200,190,170,.6)') + HL(r, 3, 1.2, -2, -3, .6),
    'creme-yaourt': r => body(blob(r, 19, 11, 10, .12), 'cream') + S('M-12 0Q-4 -8 6 -4Q12 -1 6 3', 'rgba(210,200,180,.55)', 1.4) + S('M-10 -2Q-3 -9 6 -6', 'rgba(255,255,255,.95)', 1.6),
    'beurre': r => P(blob(r, 15, 9, 9, .2, 0, 3), 'rgba(248,222,122,.55)') + body(rrect(18, 12, 3), 'butter') + P(rrect(14, 3.5, 1.5, -1, -3.5), 'rgba(255,255,235,.6)'),
    'moutarde': r => { let m = body(blob(r, 10, 6, 8, .12), 'mustard') + S('M-6 0Q0 -5 5 -1', 'rgba(255,245,190,.7)', 1.1); for (let j = 0; j < 6; j++) m += P(ell(.9, .7, (r() * 2 - 1) * 6, (r() * 2 - 1) * 3), 'rgba(150,100,20,.55)'); return m; },
    'coriandre': r => { const k = .8 + r() * .5; return [-48, 0, 48].map(an => { const a = an * Math.PI / 180; return P(leaf(3.1 * k, 3.4 * k, 4.3 * k, Math.sin(a) * 4.4 * k, -Math.cos(a) * 4.4 * k), u('herb')); }).join('') + S(`M0 ${f(6 * k)}L0 0`, '#5E8F3A', .9); },
    'persil': r => { const k = .8 + r() * .4; return [-58, 0, 58].map(an => { const a = an * Math.PI / 180; return P(leaf(2.6 * k, 2.9 * k, 4 * k, Math.sin(a) * 4.6 * k, -Math.cos(a) * 4.6 * k), u('parsley')); }).join('') + S(`M0 ${f(6 * k)}L0 0`, '#3E6E28', .9); },
    'aneth': r => { let m = S('M0 7Q1 0 0 -8', '#5E8A34', .9); for (let j = 0; j < 5; j++) { const y = 5 - j * 3, s = j % 2 ? 1 : -1; m += S(`M0 ${y}Q${s * 3} ${y - 2} ${s * 6} ${y - 4}`, '#7AAE44', .7); } return m; },
    'citron-rondelle': r => { const d = ell(12, 10.6); let m = SH(d) + P(d, u('lemonrind')) + P(ell(10.4, 9, 0, -.2), '#FFF7D0') + P(ell(9.6, 8.3, 0, -.2), u('lemonflesh')); for (let j = 0; j < 8; j++) { const a = j * .785; m += S(`M0 -.2L${f(Math.cos(a) * 9.4)} ${f(Math.sin(a) * 8.1 - .2)}`, 'rgba(255,250,225,.9)', .8); } return m + HL(r, 4, 1.3, -4, -5, .4); },
    'citron-quartier': r => { const d = 'M-14 0Q0 -12 14 0Q0 4 -14 0Z'; return SH(d) + P(d, u('lemonflesh')) + S('M-14 0Q0 -12 14 0', '#F2C21E', 2.6) + S('M-9 0L-4 -5M0 0L0 -6M9 0L4 -5', 'rgba(255,250,225,.9)', .7); },
    'sesame': r => P(ell(1.7, 1), '#EBD9B0'),
    'amandes': r => { const d = blob(r, 5.5, 2.4, 7, .12); return SH(d) + P(d, '#F3E2C0') + S('M-5 1.6Q0 3 5 1.4', '#B98A54', .9); },
    'ail': r => { const d = rrect(3.2, 2.6, .8); return P(d, '#F9F3DF') + S(d, 'rgba(200,185,140,.6)', .4); },
    'gingembre': r => P('M-8 -1.4L8 -1.8L8.4 1.4L-7.6 1.8Z', u('ginger')) + S('M-7 -.8L7 -1.1', 'rgba(255,245,210,.7)', .6),
    'pate-curry': r => P(blob(r, 5.5, 4, 7, .25), u('curry')) + P(ell(1.6, 1, -1.5, -1.5), 'rgba(255,220,170,.6)'),
    'omelette': r => { const d = 'M-44 6C-44 -26 44 -26 44 6C20 14 -20 14 -44 6Z'; let m = SH(d) + P(d, u('omelette')); for (let j = 0; j < 6; j++) m += P(blob(r, 5 + r() * 6, 2 + r() * 2, 6, .3, (r() * 2 - 1) * 28, -6 + (r() * 2 - 1) * 6), 'rgba(200,140,40,.3)'); return m + S('M-40 4C-20 10 20 10 40 4', 'rgba(180,120,30,.4)', 1.2) + HL(r, 16, 3, -8, -12, .35); },
    'frittata': r => { const d = ell(52, 24); let m = SH(d) + P(ell(52, 24, 0, 4), '#C98A34') + P(d, u('frittata')); for (let j = 0; j < 9; j++) m += P(blob(r, 4 + r() * 6, 2 + r() * 3, 6, .3, (r() * 2 - 1) * 36, (r() * 2 - 1) * 14), 'rgba(190,120,40,.32)'); return m + HL(r, 18, 4, -12, -12, .3); },
    'boulette': r => body(blob(r, 8, 7, 8, .06), 'meatball') + P(blob(r, 3, 2, 6, .3, 2, 2), 'rgba(60,25,10,.35)') + HL(r, 3.2, 1.6, -2.5, -3.5, .45),
    'steak-hache': r => { const d = blob(r, 30, 17, 11, .06); let m = SH(d) + P(blob(r, 30, 17, 11, .05, 0, 3), '#3E1A0C') + P(d, u('patty')); for (let j = 0; j < 14; j++) m += P(ell(1 + r() * 1.4, .7 + r(), (r() * 2 - 1) * 22, (r() * 2 - 1) * 11), 'rgba(40,15,5,.35)'); return m + HL(r, 10, 2.5, -8, -8, .25); },
    'oeufs-brouilles': r => { let m = ''; for (let j = 0; j < 3; j++) m += body(blob(r, 5 + r() * 3, 3.5 + r() * 2, 7, .25, (r() * 2 - 1) * 5, (r() * 2 - 1) * 3), 'scrambled'); return m + HL(r, 3, 1, -2, -3, .45); }
  };

  /* ---------- nappes ---------- */
  const NAPPE = {
    'lait-coco': { g: 'sauce', edge: 'rgba(150,95,30,.28)', swirl: 'rgba(255,248,228,.5)', spot: 'rgba(214,112,34,.75)' },
    'sauce-tomate': { g: 'tomsauce', edge: 'rgba(120,30,15,.3)', swirl: 'rgba(255,160,120,.35)', spot: 'rgba(120,25,10,.5)' },
    'sauce-soja': { g: 'soy', edge: 'rgba(40,15,5,.3)', swirl: 'rgba(180,110,50,.3)' },
    'veloute-courgette': { g: 'veloute', edge: 'rgba(70,90,30,.25)', swirl: 'rgba(245,250,225,.5)' },
    'bouillon': { g: 'broth', edge: 'rgba(150,100,30,.25)', spot: 'rgba(255,232,150,.85)' },
    'sauce-vin': { g: 'winesauce', edge: 'rgba(40,10,5,.3)', swirl: 'rgba(150,70,50,.35)' }
  };
  function nappe(r, sp, rx, ry) {
    const P0 = bp(r, rx, ry, 14, .06); let m = P(sm(mv(P0, 2, 3, 1.03)), sp.edge) + P(sm(P0), u(sp.g));
    if (sp.swirl) for (let j = 0; j < 7; j++) m += P(blob(r, (10 + r() * 14) * rx / 114, (4 + r() * 4) * ry / 47, 7, .3, (r() * 2 - 1) * rx * .7, (r() * 2 - 1) * ry * .6), sp.swirl);
    if (sp.spot) for (let j = 0; j < Math.round(12 * rx / 114); j++) m += P(ell(1.5 + r() * 2.5, 1 + r() * 1.6, (r() * 2 - 1) * rx * .8, (r() * 2 - 1) * ry * .7), sp.spot);
    return m + P(blob(r, rx * .35, ry * .2, 8, .2, -rx * .3, -ry * .5), u('sheen'));
  }
  function drizzle(r, sp) {
    let m = '';
    for (let j = 0; j < 5; j++) { const x = (r() * 2 - 1) * 80, y = (r() * 2 - 1) * 28; m += nappe(r, { ...sp, spot: null }, 16 + r() * 10, 7 + r() * 3).replace(/<path /g, `<path transform="translate(${f(x)} ${f(y)})" `); }
    return m;
  }

  /* ---------- registre ---------- */
  const D = { spread: 84, rot: 25, fx: 12, fy: 8, mound: 10, minD: 20 };
  const R = (name, cat, kind, o = {}) => ({ name, cat, kind, ...D, ...o });
  const ING = {
    'poulet-blanc': R('Blanc de poulet', 'proteine', 'pieces', { k: 1.1, n: [7, 8, 5], fx: 22, fy: 11, rot: 30, minD: 30 }),
    'poulet-cuisse': R('Hauts de cuisse', 'proteine', 'pieces', { k: 1.1, n: [8, 8, 6], fx: 22, fy: 14, rot: 20, minD: 28 }),
    'poulet-roti': R('Poulet rôti entier', 'proteine', 'whole', { k: .72, fx: 70, fy: 36, cut: 'pilon', cutN: 5, cfx: 20, cfy: 10 }),
    'boeuf-hache': R('Bœuf haché', 'proteine', 'pieces', { k: 1.2, n: [13, 12, 9], fx: 13, fy: 8, rot: 180, minD: 18 }),
    'bavette': R('Bavette en lamelles', 'proteine', 'pieces', { k: 1.2, n: [9, 10, 7], fx: 24, fy: 7, rot: 40, minD: 24 }),
    'boeuf-braise': R('Bœuf braisé en cubes', 'proteine', 'pieces', { k: 1.2, n: [10, 11, 7], fx: 12, fy: 10, rot: 20, minD: 22 }),
    'filet-mignon': R('Filet mignon', 'proteine', 'pieces', { k: 1.2, n: [7, 7, 6], fx: 17, fy: 11, rot: 10, minD: 28 }),
    'porc-roti': R('Rôti de porc', 'proteine', 'pieces', { n: [4, 4, 3], fx: 30, fy: 15, rot: 12, minD: 40, spread: 70 }),
    'jambon': R('Jambon', 'proteine', 'pieces', { n: [4, 5, 4], fx: 26, fy: 13, rot: 40, minD: 34 }),
    'lardons': R('Lardons', 'proteine', 'pieces', { k: 1.2, n: [14, 14, 10], fx: 8, fy: 5, rot: 60, minD: 14 }),
    'dinde-hachee': R('Dinde hachée', 'proteine', 'pieces', { k: 1.2, n: [13, 12, 9], fx: 13, fy: 8, rot: 180, minD: 18 }),
    'dinde-escalope': R('Escalope de dinde', 'proteine', 'whole', { fx: 34, fy: 17, cut: 'dinde-lamelle', cutN: 7, cfx: 18, cfy: 6 }),
    'saumon-pave': R('Pavé de saumon', 'proteine', 'whole', { fx: 30, fy: 17 }),
    'saumon-fume': R('Saumon fumé', 'proteine', 'pieces', { n: [4, 5, 4], fx: 26, fy: 10, rot: 35, minD: 30 }),
    'cabillaud': R('Cabillaud', 'proteine', 'whole', { fx: 30, fy: 16 }),
    'truite': R('Truite', 'proteine', 'whole', { fx: 32, fy: 12 }),
    'crevettes': R('Crevettes', 'proteine', 'pieces', { k: 1.2, n: [9, 10, 8], fx: 13, fy: 11, rot: 180, minD: 22 }),
    'thon': R('Thon', 'proteine', 'pieces', { k: 1.2, n: [10, 10, 7], fx: 13, fy: 8, rot: 180, minD: 18 }),
    'oeuf-entier': R('Œuf dur', 'proteine', 'pieces', { k: 1.2, n: [5, 5, 4], fx: 16, fy: 11, rot: 20, minD: 30 }),
    'oeuf-poche': R('Œuf poché', 'proteine', 'pieces', { k: 1.2, n: [3, 2, 3], fx: 21, fy: 14, rot: 15, minD: 44, spread: 64 }),
    'tofu': R('Tofu', 'proteine', 'pieces', { k: 1.2, n: [9, 10, 7], fx: 10, fy: 8, rot: 15, minD: 22 }),
    'courgette-rondelles': R('Courgette en rondelles', 'legume', 'pieces', { k: 1.1, n: [12, 11, 8], fx: 11, fy: 9, rot: 10, minD: 22 }),
    'courgette-spaghettis': R('Courgette en spaghettis', 'legume', 'pieces', { n: [6, 6, 5], fx: 18, fy: 8, rot: 30, minD: 24 }),
    'brocoli': R('Brocoli', 'legume', 'pieces', { k: 1.4, n: [8, 9, 6], fx: 12, fy: 12, rot: 15, minD: 24 }),
    'poivron': R('Poivron', 'legume', 'pieces', { k: 1.2, n: [10, 10, 8], fx: 13, fy: 6, rot: 180, minD: 20 }),
    'epinards': R('Épinards', 'legume', 'pieces', { k: 1.1, n: [9, 9, 7], fx: 12, fy: 14, rot: 180, minD: 22 }),
    'tomate': R('Tomate', 'legume', 'pieces', { n: [7, 7, 5], fx: 12, fy: 10, rot: 10, minD: 24 }),
    'tomates-cerises': R('Tomates cerises', 'legume', 'pieces', { k: 1.3, n: [9, 10, 7], fx: 6.4, fy: 6, rot: 0, minD: 16 }),
    'aubergine': R('Aubergine', 'legume', 'pieces', { k: 1.1, n: [8, 8, 6], fx: 13, fy: 10, rot: 10, minD: 26 }),
    'champignons': R('Champignons', 'legume', 'pieces', { k: 1.3, n: [9, 9, 7], fx: 11, fy: 9, rot: 25, minD: 22 }),
    'haricots-verts': R('Haricots verts', 'legume', 'pieces', { k: 1.1, n: [14, 14, 10], fx: 22, fy: 4, rot: 50, minD: 14 }),
    'choux-bruxelles': R('Choux de Bruxelles', 'legume', 'pieces', { k: 1.3, n: [9, 10, 7], fx: 10, fy: 9, rot: 20, minD: 21 }),
    'concombre': R('Concombre', 'legume', 'pieces', { k: 1.1, n: [11, 10, 8], fx: 11, fy: 9, rot: 10, minD: 22 }),
    'avocat': R('Avocat', 'legume', 'pieces', { k: 1.2, n: [7, 7, 6], fx: 14, fy: 6, rot: 40, minD: 22 }),
    'oignon': R('Oignon', 'legume', 'pieces', { n: [8, 8, 6], fx: 12, fy: 9, rot: 180, minD: 22 }),
    'laitue': R('Laitue', 'legume', 'pieces', { k: 1.2, n: [5, 5, 4], fx: 30, fy: 17, rot: 40, minD: 36 }),
    'poireau': R('Poireau', 'legume', 'pieces', { n: [10, 10, 7], fx: 9, fy: 7, rot: 0, minD: 18 }),
    'fromage-rape': R('Fromage râpé', 'cremerie', 'pieces', { k: 1.2, n: [14, 13, 10], fx: 9, fy: 5, rot: 180, minD: 12 }),
    'chevre': R('Chèvre frais', 'cremerie', 'pieces', { k: 1.2, n: [5, 4, 5], fx: 12, fy: 10, rot: 10, minD: 26 }),
    'feta': R('Feta', 'cremerie', 'pieces', { k: 1.2, n: [10, 10, 8], fx: 7, fy: 6, rot: 40, minD: 15 }),
    'creme-yaourt': R('Crème / yaourt', 'cremerie', 'whole', { fx: 19, fy: 11 }),
    'beurre': R('Beurre', 'cremerie', 'whole', { fx: 18, fy: 12 }),
    'lait-coco': R('Lait de coco', 'sauce', 'nappe'),
    'sauce-tomate': R('Sauce tomate', 'sauce', 'nappe'),
    'sauce-soja': R('Sauce soja', 'sauce', 'nappe'),
    'veloute-courgette': R('Velouté de courgettes', 'sauce', 'nappe'),
    'bouillon': R('Bouillon', 'sauce', 'nappe'),
    'sauce-vin': R('Sauce au vin', 'sauce', 'nappe'),
    'moutarde': R('Moutarde', 'sauce', 'whole', { fx: 10, fy: 6 }),
    'pate-curry': R('Pâte de curry', 'sauce', 'rain', { n: [6, 7, 6], fx: 5.5, fy: 4 }),
    'persil': R('Persil', 'finition', 'rain', { n: [12, 14, 16], fx: 6, fy: 6 }),
    'coriandre': R('Coriandre', 'finition', 'rain', { n: [12, 15, 18], fx: 6, fy: 6 }),
    'aneth': R('Aneth', 'finition', 'rain', { n: [12, 14, 18], fx: 6, fy: 7 }),
    'citron-rondelle': R('Citron en rondelle', 'finition', 'whole', { fx: 12, fy: 10.6 }),
    'citron-quartier': R('Citron en quartier', 'finition', 'whole', { fx: 14, fy: 6 }),
    'sesame': R('Graines de sésame', 'finition', 'rain', { n: [40, 50, 60], fx: 2, fy: 1.2 }),
    'amandes': R('Amandes effilées', 'finition', 'rain', { n: [14, 18, 20], fx: 5.5, fy: 2.5 }),
    'ail': R('Ail', 'finition', 'rain', { n: [20, 24, 28], fx: 2, fy: 1.6 }),
    'gingembre': R('Gingembre', 'finition', 'rain', { n: [6, 7, 5], fx: 8, fy: 2 }),
    'omelette': R('Omelette', 'plat', 'whole', { fx: 44, fy: 20 }),
    'frittata': R('Frittata', 'plat', 'whole', { fx: 52, fy: 26 }),
    'boulette': R('Boulettes', 'plat', 'pieces', { k: 1.4, n: [8, 9, 7], fx: 8, fy: 7, rot: 0, minD: 18 }),
    'steak-hache': R('Steak haché', 'plat', 'whole', { fx: 30, fy: 17 }),
    'oeufs-brouilles': R('Œufs brouillés', 'plat', 'pieces', { k: 1.2, n: [14, 14, 9], fx: 10, fy: 6, rot: 180, minD: 14, spread: 76 })
  };
  const POSES = ['plat', 'tas', 'eparpille'];
  const PI = { plat: 0, tas: 1, eparpille: 2 };

  /* ---------- placement ---------- */
  function place(r, o, pose, n, fx, fy) {
    const RX = o.spread, RY = RX * .4, out = [];
    const rot = () => (r() * 2 - 1) * o.rot;
    if (pose === 'tas') {
      for (let j = 0; j < n; j++) { const a = r() * 6.2832, d = Math.sqrt((j + .5) / n) * (.9 + r() * .1); out.push({ x: Math.cos(a) * RX * .5 * d, y: Math.sin(a) * RY * .5 * d - (1 - d * d) * o.mound, rot: rot(), s: 1.04 - .1 * d, d }); }
      return out.sort((a, b) => b.d - a.d);
    }
    if (pose === 'plat') {
      for (let j = 0; j < n; j++) { const a = j * 2.39996 + r() * .3, d = Math.sqrt((j + .5) / n); out.push({ x: Math.cos(a) * RX * d + (r() - .5) * 4, y: Math.sin(a) * RY * d + (r() - .5) * 2, rot: rot(), s: .94 + r() * .12 }); }
    } else {
      for (let j = 0; j < n; j++) { let best = null; for (let k = 0; k < 40; k++) { const a = r() * 6.2832, d = Math.sqrt(r()), x = Math.cos(a) * RX * 1.06 * d, y = Math.sin(a) * RY * 1.05 * d, ok = out.every(p => Math.hypot(p.x - x, (p.y - y) * 2.4) > o.minD); if (ok) { best = { x, y }; break; } if (!best) best = { x, y }; } out.push({ ...best, rot: rot(), s: .9 + r() * .15 }); }
    }
    return out.sort((a, b) => a.y - b.y);
  }
  function renderPose(id, pose) {
    const o = ING[id]; if (!o) throw new Error('ingrédient inconnu ' + id);
    const r = rng(hash(id + ':' + pose));
    let m = '', shadow = '', bb = { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 };
    const grow = (x, y, fx, fy) => { bb.x0 = Math.min(bb.x0, x - fx); bb.x1 = Math.max(bb.x1, x + fx); bb.y0 = Math.min(bb.y0, y - fy); bb.y1 = Math.max(bb.y1, y + fy); };
    const put = (fn, list, fx, fy, cast = o.kind !== 'rain') => list.forEach(p0 => { const p = { ...p0, s: p0.s * (o.k || 1) }; m += `<g transform="${T(p.x, p.y, p.rot, p.s)}">${fn(r)}</g>`; grow(p.x, p.y, fx * p.s, fy * p.s); if (cast) { const c = Math.cos(p.rot * Math.PI / 180), s0 = Math.sin(p.rot * Math.PI / 180), ex = fx * p.s * .9, ey = fy * p.s * .6; const pts = []; for (let j = 0; j < 8; j++) { const a = j * .7854, x = Math.cos(a) * ex, y = Math.sin(a) * ey; pts.push([p.x + 1.5 + x * c - y * s0, p.y + fy * p.s * .4 + (x * s0 + y * c) * .7]); } shadow += sm(pts); } });
    if (o.kind === 'nappe') {
      const sp = NAPPE[id];
      if (pose === 'plat') { m = nappe(r, sp, 114, 47); grow(0, 0, 114, 47); }
      else if (pose === 'tas') { m = `<g transform="translate(0 -2)">${nappe(r, sp, 58, 24)}</g>`; grow(0, -2, 58, 24); }
      else { m = drizzle(r, sp); grow(0, 0, 100, 36); }
    } else if (o.kind === 'rain') {
      const n = o.n[PI[pose]], k = pose === 'tas' ? .42 : pose === 'plat' ? .85 : 1.08, list = [];
      for (let j = 0; j < n; j++) { const a = r() * 6.2832, d = Math.sqrt(r()); list.push({ x: Math.cos(a) * 92 * k * d, y: Math.sin(a) * 36 * k * d - (pose === 'tas' ? (1 - d) * 6 : 0), rot: r() * 360, s: .85 + r() * .3 }); }
      put(PC[id], list, o.fx, o.fy);
    } else if (o.kind === 'whole') {
      const small = o.fx < 24;
      if (pose === 'plat') put(PC[id], small ? [{ x: 0, y: 0, rot: (r() * 2 - 1) * 8, s: 1.2 }] : [{ x: 0, y: 0, rot: (r() * 2 - 1) * 5, s: 1.45 }], o.fx, o.fy);
      else if (pose === 'tas') put(PC[id], small ? [{ x: -12, y: 3, rot: -12, s: .9 }, { x: 11, y: 4, rot: 10, s: .88 }, { x: 0, y: -5, rot: 4, s: .95 }] : [{ x: -18, y: 6, rot: -8, s: 1.2 }, { x: 16, y: -3, rot: 7, s: 1.25 }], o.fx, o.fy);
      else if (o.cut) put(PC[o.cut], place(r, { ...o, rot: 60, minD: o.cfx * 1.4 }, 'eparpille', o.cutN), o.cfx, o.cfy);
      else put(PC[id], place(r, { ...o, rot: small ? 20 : 12, minD: o.fx * 1.1 }, 'eparpille', small ? 4 : 3).map(p => ({ ...p, s: p.s * (small ? .75 : .6) })), o.fx, o.fy);
    } else {
      put(PC[id], place(r, o, pose, o.n[PI[pose]]), o.fx, o.fy);
    }
    if (shadow) m = P(shadow, 'rgba(45,28,10,.15)') + m;
    if (o.kind !== 'nappe') { const G = 1.3; m = `<g transform="scale(${G})">${m}</g>`; bb = { x0: bb.x0 * G, x1: bb.x1 * G, y0: bb.y0 * G, y1: bb.y1 * G }; }
    m = m.replace(/([\s,(MLCQAHVZmlcqahvz-])0\./g, '$1.');
    return { markup: m, bbox: bb };
  }
  function plate() {
    return [P(ell(190, 70, 6, 26), u('shadow')), P(ell(172, 78), u('plate')), S(ell(170, 76), 'rgba(120,110,95,.18)', 1), S('M-150 -28Q-60 -80 60 -76', 'rgba(255,255,255,.95)', 3), P(ell(130, 57, 0, -3), u('well')), S(ell(130, 57, 0, -3), 'rgba(110,100,85,.16)', 1.5)].join('');
  }
  const PLATE_Y = 190, POSE_Y = 184, LIFT = 4;
  return { ING, POSES, GR, renderPose, plate, defsFor, usedGrads, PLATE_Y, POSE_Y, LIFT };
})();
if (typeof module !== 'undefined') module.exports = LT;
