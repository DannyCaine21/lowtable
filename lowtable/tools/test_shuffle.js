
const window={LOWTABLE_CONFIG:{carbMax:30,historyWeeks:3}},document={},matchMedia=()=>({matches:false});
const CFG=window.LOWTABLE_CONFIG;const $=()=>null;
const KINDS=["breakfast","lunch","dinner"]; const KIND_LABEL={breakfast:"Petit-déj",lunch:"Déjeuner",dinner:"Dîner"};
const isBf=r=>r&&r.meal_type==="breakfast";
const PROTEIN_LABEL={poulet:"Poulet",dinde:"Dinde",boeuf:"Bœuf",porc:"Porc",poisson:"Poisson",oeufs:"Œufs",vege:"Végé",agneau:"Agneau"};
const RAYONS=["Boucherie","Poissonnerie","Légumes","Crèmerie","Épicerie","Autre"];
const CARB_MAX=CFG.carbMax||30, HISTORY_WEEKS=CFG.historyWeeks||3;



let session=null, recipes=require("./all_recipes.json"), plans={}, currentWeek, tab="today", openRecipe=null, ready=false, cardInst=null, justShuffled=false;

// ---------- helpers
let toastTimer;function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("on");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("on"),2200);}
function show(id,on){document.getElementById(id).classList.toggle("hidden",!on);}
function isoWeek(d){const x=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));const day=x.getUTCDay()||7;x.setUTCDate(x.getUTCDate()+4-day);const y=x.getUTCFullYear();const w=Math.ceil(((x-Date.UTC(y,0,1))/864e5+1)/7);return y+"-W"+String(w).padStart(2,"0");}
function weekStart(key){const [y,w]=key.split("-W").map(Number);const jan4=new Date(Date.UTC(y,0,4));const day=jan4.getUTCDay()||7;const mon=new Date(jan4);mon.setUTCDate(jan4.getUTCDate()-day+1+(w-1)*7);const sun=new Date(mon);sun.setUTCDate(mon.getUTCDate()-1);return sun;}
function shiftWeek(key,n){const s=weekStart(key);s.setUTCDate(s.getUTCDate()+7*n+1);return isoWeek(new Date(s.getUTCFullYear(),s.getUTCMonth(),s.getUTCDate()));}
function fmtDate(d){return d.getUTCDate()+"/"+String(d.getUTCMonth()+1).padStart(2,"0");}
function weekLabel(key){const s=weekStart(key);const e=new Date(s);e.setUTCDate(s.getUTCDate()+6);return "Sem. "+key.split("-W")[1]+" · "+fmtDate(s)+" → "+fmtDate(e);}
function currentWeekKey(){const d=new Date();if(d.getDay()===0){const m=new Date(d);m.setDate(d.getDate()+1);return isoWeek(m);}return isoWeek(d);}
function slotKey(d,k){return d+"-"+k;}
function rnd(a){return a[Math.floor(Math.random()*a.length)];}
function byId(id){return recipes.find(r=>r.id===id);}
function esc(s){return String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
function fmtQty(q){return Number.isInteger(q)?q:String(q).replace(".",",");}
function seqSlots(){const s=[];for(let d=0;d<7;d++)for(const k of KINDS)s.push({d,k,key:slotKey(d,k)});return s;}
currentWeek=currentWeekKey();

// ---------- compositions (lot 1) : svg + étiquettes par recette, repli générique sinon
const compCache={}; let plateBase=null;
async function fetchText(u){try{const r=await fetch(u,{cache:"no-cache"});return r.ok?await r.text():null;}catch(e){return null;}}
async function getPlate(){if(plateBase==null)plateBase=(await fetchText("compositions/_plate.svg"))||"";return plateBase;}
async function getComposition(r){
  if(compCache[r.id])return compCache[r.id];
  let out=null;
  const P=window.LowtablePlates;
  const pid=P&&(P.resolve(r.name)||P.resolve(r.id.replace(/^r\d\d-/,"")));
  if(pid){
    const svg=await P.load(pid);
    if(svg){
      const inner=svg.replace(/^[\s\S]*?<svg[^>]*>/,"").replace(/<\/svg>\s*$/,"");
      const meta=P.meta[pid]||{};
      const labels=(meta.layers||[]).map(L=>({id:`${pid}-l${L.layer}`,title:L.label?.name||"",qty:(L.label?.qty)||qtyFor(r,L.label?.name),note:L.label?.note||""}));
      out={svgInner:inner,labels,tagline:(meta.tagline||[]).join(" ")};
    }
  }
  if(!out){
    const layers=fallbackLayers(r);
    out={svgInner:window.Card.fallbackSvg(await getPlate(),layers),labels:layers.map(L=>({id:L.id,title:L.title,qty:L.qty,note:L.note})),tagline:""};
  }
  compCache[r.id]=out;return out;
}
const norm=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/œ/g,"oe").replace(/[^a-z0-9]+/g," ").trim();
function qtyFor(r,name){
  const n=norm(name);if(!n)return "";
  const STOP=new Set(["avec","dans","pour","sauce","base"]);
  const words=n.split(" ").filter(w=>w.length>=4&&!STOP.has(w));
  const hit=(r.ingredients||[]).find(i=>{const m=norm(i.name);return m===n||words.some(w=>m.includes(w.slice(0,5)));});
  return hit?`${fmtQty(hit.qty)} ${hit.unit||""}`.trim():"";
}
function fallbackLayers(r){
  const order=["Épicerie","Boucherie","Poissonnerie","Légumes","Crèmerie","Autre"];
  const groups={};(r.ingredients||[]).forEach(i=>{const k=RAYONS.includes(i.rayon)?i.rayon:"Autre";(groups[k]=groups[k]||[]).push(i);});
  const layers=[];
  order.forEach(k=>{const g=groups[k];if(!g||layers.length>=5)return;const first=g[0];
    layers.push({id:"fb-"+layers.length,rayon:k,title:first.name.charAt(0).toUpperCase()+first.name.slice(1)+(g.length>1?` + ${g.length-1}`:""),qty:`${fmtQty(first.qty)} ${first.unit||""}`.trim(),note:g.length>1?g.slice(1).map(x=>x.name).join(", "):""});});
  return layers;
}

// ---------- vignettes (mini-piles 40 px, couches "mini" du registre)
const miniCache={};
async function miniSvg(r){
  if(miniCache[r.id]!==undefined)return miniCache[r.id];
  const P=window.LowtablePlates;let out=null;
  const pid=P&&(P.resolve(r.name)||P.resolve(r.id.replace(/^r\d\d-/,"")));
  if(pid){const svg=await P.load(pid);if(svg){
    const keep=new Set(((P.meta[pid]||{}).mini||[0,1,2]).map(String));
    const doc=new DOMParser().parseFromString(svg,"image/svg+xml");const root=doc.documentElement;
    [...root.children].forEach(el=>{if(el.hasAttribute("data-layer")){if(!keep.has(el.getAttribute("data-layer")))el.remove();else el.removeAttribute("id");}});
    root.setAttribute("viewBox","55 126 290 112");root.removeAttribute("width");root.removeAttribute("height");root.removeAttribute("role");root.setAttribute("aria-hidden","true");
    out=root.outerHTML;}}
  miniCache[r.id]=out;return out;
}
function fillMinis(scope){
  scope.querySelectorAll(".mini[data-mini]").forEach(async el=>{const r=byId(el.dataset.mini);if(!r)return;const s=await miniSvg(r);if(s&&el.isConnected){el.innerHTML=s;el.classList.add("on");}else el.remove();});
}
function countUp(scope){
  scope.querySelectorAll("[data-to]").forEach(el=>{const to=+el.dataset.to;if(matchMedia("(prefers-reduced-motion: reduce)").matches)return el.textContent=to;const t0=performance.now();const step=now=>{const x=Math.min(1,(now-t0)/400);el.textContent=Math.round(to*(1-Math.pow(1-x,3)));if(x<1)requestAnimationFrame(step);};requestAnimationFrame(step);});
}
// ---------- shuffle
function recentIds(week){const ids=new Set();for(let i=1;i<=HISTORY_WEEKS;i++){const p=plans[shiftWeek(week,-i)];if(p&&p.slots)Object.values(p.slots).forEach(s=>s&&!s.leftoverOf&&ids.add(s.id));}return ids;}
function shuffle(prev){
  const active=recipes.filter(r=>r.active!==false&&!isBf(r)&&(r.carbs??0)<=CARB_MAX);
  const bfPool=recipes.filter(r=>r.active!==false&&isBf(r)&&(r.carbs??0)<=CARB_MAX);
  if(active.length<6)return null;
  const bfUsed=[];
  const recent=recentIds(currentWeek);
  const slots={}; const locked=(prev&&prev.locked)||{};
  const cooked=new Set(); const queue=[]; const dinnerProteins=[];
  const plan=seqSlots();
  for(const s of plan){const ps=prev&&prev.slots&&prev.slots[s.key];if(locked[s.key]&&ps&&!ps.leftoverOf){slots[s.key]={id:ps.id};cooked.add(ps.id);}}
  for(const s of plan){
    if(slots[s.key]){const ps=slots[s.key];const r=byId(ps.id);if(s.k==="breakfast"){bfUsed.push(ps.id);continue;}if(r)for(let i=1;i<(r.meals||1);i++)queue.push({id:r.id,leftoverOf:s.key});if(s.k==="dinner")dinnerProteins.push(r&&r.protein);continue;}
    if(s.k==="breakfast"){
      if(!bfPool.length)continue;
      let p=bfPool.filter(r=>!bfUsed.includes(r.id));if(!p.length)p=bfPool.filter(r=>r.id!==bfUsed[bfUsed.length-1]);if(!p.length)p=bfPool;
      const b=rnd(p);slots[s.key]={id:b.id};bfUsed.push(b.id);continue;
    }
    if(s.k==="lunch"&&queue.length){slots[s.key]=queue.shift();continue;}
    // capacité en restes : déjeuners encore libres après ce créneau, moins ceux réservés au batch du mercredi
    const lunchesAfter=plan.filter(x=>x.k==="lunch"&&x.d>s.d).length;
    const isWedBatch=s.k==="dinner"&&s.d===3;
    const reserve=(!isWedBatch&&(s.d<3||(s.d===3&&s.k==="lunch")))?2:0;
    const cap=Math.max(0,lunchesAfter-queue.length-reserve);
    const fits=r=>(r.meals||1)-1<=cap;
    const needLarge=s.k==="dinner"&&(s.d===0||s.d===3);
    const lastProt=dinnerProteins.slice(-2);
    const pool=active.filter(r=>!cooked.has(r.id));
    const slotOk=s.k==="lunch"?(r=>(r.meals||1)<=2&&(r.time_min||0)<=25):(r=>true);
    // relâchement dans l'ordre : rotation 3 semaines, puis protéine ; jamais la capacité (pas de restes jetés)
    const tiers=s.k==="dinner"?[r=>!recent.has(r.id)&&!lastProt.includes(r.protein),r=>!lastProt.includes(r.protein),r=>true]:[r=>!recent.has(r.id),r=>true];
    let pick=null;
    if(needLarge)for(const tier of tiers){const p=pool.filter(r=>tier(r)&&fits(r)&&(r.meals||1)>=3);if(p.length){pick=rnd(p);break;}}
    if(!pick)for(const tier of tiers){
      let p=pool.filter(r=>tier(r)&&fits(r));
      const q=p.filter(slotOk);if(q.length)p=q;
      if(p.length){pick=rnd(p);break;}
    }
    if(!pick)pick=rnd(pool.length?pool:active);
    slots[s.key]={id:pick.id};cooked.add(pick.id);
    for(let i=1;i<(pick.meals||1);i++)queue.push({id:pick.id,leftoverOf:s.key});
    if(s.k==="dinner")dinnerProteins.push(pick.protein);
  }
  return {week:currentWeek,slots,locked,checked:{}};
}

const fails={};const bad=(k)=>fails[k]=(fails[k]||0)+1;
let week="2026-W40";const N=300;
for(let n=0;n<N;n++){
  currentWeek=week;const p=shuffle(null);plans[week]=p;
  const sl=p.slots,byK=k=>Object.entries(sl).filter(([key])=>key.endsWith("-"+k));
  // 1. 21 créneaux remplis
  if(Object.keys(sl).length!==21)bad("créneaux != 21");
  // 2. petits-déj : que des petits-déj, jamais deux jours de suite le même
  const bfs=[0,1,2,3,4,5,6].map(d=>sl[d+"-breakfast"]&&sl[d+"-breakfast"].id);
  bfs.forEach((id,i)=>{if(!isBf(byId(id)))bad("petit-déj hors pool");if(i&&id===bfs[i-1])bad("petit-déj répété J+1");});
  // 3. déjeuners/dîners : jamais un petit-déj ; glucides <= 30
  Object.entries(sl).forEach(([k,s])=>{const r=byId(s.id);if(!k.endsWith("breakfast")&&isBf(r))bad("petit-déj en repas principal");if(r.carbs>30)bad("glucides > 30");});
  // 4. deux grands batchs (dim et mer)
  [0,3].forEach(d=>{if((byId(sl[d+"-dinner"].id).meals||1)<3)bad("pas de grand batch "+["dim","","","mer"][d]);});
  // 5. protéines des dîners : pas deux fois de suite
  const pr=[0,1,2,3,4,5,6].map(d=>byId(sl[d+"-dinner"].id).protein);pr.forEach((x,i)=>{if(i&&x===pr[i-1])bad("même protéine 2 dîners de suite");});
  // 6. restes : chaque recette cuisinée à N repas a exactement N-1 restes
  const cooked=Object.entries(sl).filter(([k,s])=>!s.leftoverOf&&!k.endsWith("breakfast"));
  cooked.forEach(([k,s])=>{const want=(byId(s.id).meals||1)-1,got=Object.values(sl).filter(x=>x.leftoverOf===k).length;if(got<want)bad("restes perdus (batch non consommé)");if(got>want)bad("restes en trop");});
  // 7. rotation : pas de recette cuisinée dans les 3 semaines précédentes
  const recent=recentIds(week);cooked.forEach(([k,s])=>{if(recent.has(s.id))bad("recette des 3 dernières semaines");});
  week=shiftWeek(week,1);
}
console.log(JSON.stringify({semaines:N,echecs:fails},null,1));
// diagnostic : où se perdent les restes
const lost={};week="2026-W40";plans={};
for(let n=0;n<300;n++){currentWeek=week;const p=shuffle(null);plans[week]=p;const sl=p.slots;
 Object.entries(sl).filter(([k,s])=>!s.leftoverOf&&!k.endsWith("breakfast")).forEach(([k,s])=>{const want=(byId(s.id).meals||1)-1,got=Object.values(sl).filter(x=>x.leftoverOf===k).length;if(got<want)lost[k]=(lost[k]||0)+(want-got);});
 week=shiftWeek(week,1);}
console.log("portions perdues par créneau :",JSON.stringify(lost));
