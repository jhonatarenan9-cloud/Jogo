// Simulador de economia do Mina Idle.
// Um robô joga sozinho, em velocidade acelerada, usando as funções reais do jogo (produce, compras, missões),
// e anota quando cada conquista acontece. Uso:  node tools/simular_economia.js [horas] [estrategia]
// estratégias: barato (compra o mais barato), minas (prioriza a próxima mina), fabricas (prioriza novas indústrias), todas
const {chromium} = require('playwright');
const path = require('path');
const HORAS = +(process.argv[2] || 6), EST = process.argv[3] || 'todas';
const MARCOS = [5, 15, 30, 60, 180, 360, 720, 1440, 2160, 2880, 4320, 10080];   // minutos

function bot(cfg){
  const MARCOS = [5, 15, 30, 60, 180, 360, 720, 1440, 2160, 2880, 4320, 10080];
  window.requestAnimationFrame = () => 0; window.world3d = undefined; window.SIM = true;   // para o jogo real e o 3D: só a simulação roda
  window.toast = () => {}; document.getElementById('toast').remove?.();
  localStorage.clear(); S = newState(); S.zoom = 1;
  const src = {};   // dinheiro por origem
  const wrap = (name, tag) => { const f = window[name]; window[name] = function(...a){ const m0 = S.money; const r = f.apply(this, a); const d = S.money - m0; if(d > 0) src[tag||name] = (src[tag||name]||0) + d; return r; }; };
  ['sellByBelts','sellAll','qPay','stagePay','sellBatteries','sellGallons','sellForest','carBuy','checkMissions','checkAchievements','lakeStep'].forEach(n=>wrap(n));
  const log = [], seen = {}, mark = (k, t) => { if(!seen[k]){ seen[k] = t; log.push([t, k]); } };
  const fins = []; let nextMark = 0;
  const DT = 0.5, SWING = 2.0, total = cfg.horas*3600, ACTIVE = cfg.ativo*3600;
  let sellT = 0, evalT = 0;
  const nextTool = () => TOOLS.find(t => !S.tools[t.id]);
  function cands(){
    const c = [], add = (k, cost, fn, kind) => { if(cost > 0 && isFinite(cost)) c.push({k, cost, fn, kind}); };
    const nt = nextTool(); if(nt) add('tool:'+nt.id, remaining(nt), ()=>buyTool(nt), 'mina');
    for(const m of MINES){ if(!isUnlocked(m)) continue; const st = S.staff[m.id];
      if(st.n < MAX_HELPERS) add('helper:'+m.id, helperCost(m), ()=>hireHelper(m), 'equipe');
      else if(!st.mgr) add('mgr:'+m.id, managerCost(m), ()=>hireManager(m), 'equipe');
      if(st.n >= 1 && (st.tool||0) < 2) add('htool:'+m.id, helperToolCost(m), ()=>upgradeHelperTool(m), 'equipe');
      if(!m.fuel){ if(!S.smelters[m.id]) add('smelter:'+m.id, smelterLeft(m), ()=>buySmelter(m), 'fundicao');
        else { if(!S.belts[m.id]) add('belt:'+m.id, BELT_COST[m.id], ()=>buyBelt(m), 'fundicao'); if(!S.sellBelts[m.id]) add('sellbelt:'+m.id, SELLBELT_COST[m.id], ()=>buySellBelt(m), 'fundicao'); } } }
    add('sharpen', sharpenCost(), buySharpen, 'melhoria');
    add('boost', boostCost(), buyBoost, 'melhoria');
    if(S.staff.carvao.n) add('drill', coalDrillCost(), buyCoalDrill, 'melhoria');
    if(MINES.some(hasBelt)) add('turbo', beltSpeedCost(), buyTurbo, 'melhoria');
    if(MINES.some(m=>!m.fuel && S.smelters[m.id])){
      if(!S.power.open) add('usina', powerOpenLeft(), openPowerBuy, 'fabrica');
      else { POWER_ITEMS.filter(pwCan).forEach(it=>add('pw:'+it.id, pwLeft(it), ()=>buildPowerItem(it), 'fabrica')); if(S.power.tb) add('boiler', boilerCost(), upgradeBoiler, 'melhoria'); } }
    if(S.depotOpen || S.power.tb){
      if(!S.oil.open) add('oil', oilOpenLeft(), ()=>{ S.money -= oilOpenLeft(); openOil(); }, 'fabrica');
      else { OIL_ITEMS.filter(oilCan).forEach(it=>add('oil:'+it.id, oilLeft(it), ()=>buildOilItem(it), 'fabrica')); if(S.oil.ps) add('pumpUp', pumpCost(), upgradePump, 'melhoria'); } }
    if(S.tools.ferro){
      if(!S.forest.open && lvlOk('forest')) add('forest', forestOpenLeft(), ()=>{ S.money -= forestOpenLeft(); openForest(); }, 'fabrica');
      else { FOREST_ITEMS.filter(fCan).forEach(it=>add('fo:'+it.id, fLeft(it), ()=>buildForestItem(it), 'fabrica')); if(S.forest.sr) add('forestUp', forestLvlCost(), upgradeForest, 'melhoria'); }
      if(!S.quarry.open && lvlOk('quarry')) add('quarry', qOpenLeft(), ()=>{ S.money -= qOpenLeft(); openQuarry(); }, 'fabrica');
      else if(S.quarry.open){ Object.keys(Q_BUY).filter(qCanBuy).forEach(k=>add('q:'+k, qBuyCost(k), ()=>quarryBuy(k), /open/i.test(k) ? 'fabrica' : 'equipe'));
        Object.keys(Q_UP).filter(qCanUp).forEach(k=>add('qu:'+k, qUpCost(k), ()=>quarryUp(k), 'melhoria')); }
      if(lakeUnlocked()){ if(!S.lake.open) add('lake', lakeOpenLeft(), ()=>{ S.money -= lakeOpenLeft(); openLake(); }, 'fabrica');
        else { Object.keys(L_BUY).filter(lCanBuy).forEach(k=>add('l:'+k, lBuyCost(k), ()=>lakeBuy(k), 'fabrica')); Object.keys(L_UP).forEach(k=>add('lu:'+k, lUpCost(k), ()=>lakeUp(k), 'melhoria')); } } }
    return c;
  }
  function openPowerBuy(){ S.money -= powerOpenLeft(); openPower(); }
  function decide(){
    const c = cands().filter(x=>x.cost <= S.money); if(!c.length) return false;
    const nt = nextTool(), toolC = nt ? remaining(nt) : Infinity;
    let pick;
    if(cfg.est === 'minas'){ pick = c.find(x=>x.kind === 'mina') || c.filter(x=>x.cost <= 0.15*toolC).sort((a,b)=>a.cost-b.cost)[0]; }
    else if(cfg.est === 'fabricas'){ pick = c.filter(x=>x.kind === 'fabrica').sort((a,b)=>a.cost-b.cost)[0] || c.find(x=>x.kind === 'mina') || c.filter(x=>x.cost <= 0.3*toolC).sort((a,b)=>a.cost-b.cost)[0]; }
    else if(cfg.est === 'equipe'){ pick = c.filter(x=>x.kind === 'equipe' || x.kind === 'fundicao').sort((a,b)=>a.cost-b.cost)[0] || c.find(x=>x.kind === 'mina') || c.filter(x=>x.cost <= 0.2*toolC).sort((a,b)=>a.cost-b.cost)[0]; }
    else pick = c.sort((a,b)=>a.cost-b.cost)[0];
    if(!pick) return false;
    const m0 = S.money; pick.fn(); if(S.money === m0) return false;
    mark(pick.k, t); mark('nível '+lvl(), t); return true;
  }
  let t = 0;
  for(; t < total; t += DT){
    const ativo = t < ACTIVE;
    if(ativo){ const m = [...MINES].reverse().find(x=>!x.fuel && isUnlocked(x)); S.active = m.id; addOre(m.id, clickPower()*SWING*DT); }
    produce(DT);
    sellT += DT; if(sellT >= (ativo ? 20 : 1e9)){ sellT = 0; sellAll(true, !!S.autoSell); if(S.power.batteries) sellBatteries(); if(S.oil.gal >= 1 && S.oil.fuel >= fuelCap() - 15) sellGallons(); if(S.forest.sack >= 1 || S.forest.paper >= 1) sellForest(); }
    evalT += DT; if(evalT >= 2){ evalT = 0; checkMissions(); checkAchievements(); if(ativo){ for(let i=0;i<5 && decide();i++); if(machines().some(x=>cond(x.key) < 0.6)) repairAll(); } }
    if(S.won) mark('MAGNATA', t);
    if(nextMark < MARCOS.length && t >= MARCOS[nextMark]*60){ fins.push({min:MARCOS[nextMark], money:S.money, earned:S.earned, tools:TOOLS.filter(x=>S.tools[x.id]).length, rate:incomePerSec(), lvl:lvl(), esm:Math.round(S.mined.esmeralda), src:Object.fromEntries(Object.entries(src).map(([k,v])=>[k,Math.round(v)]))}); nextMark++; }
  }
  return {log, fins, earned:S.earned};
}

(async()=>{
  const b = await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const ests = EST === 'todas' ? ['barato','minas','equipe','fabricas'] : [EST];
  for(const est of ests){
    const p = await b.newPage(); p.on('pageerror', e=>console.log('ERRO', e.message));
    await p.goto('file://' + path.resolve(__dirname, '..', 'index.html')); await p.waitForTimeout(1200);
    const r = await p.evaluate(`(${bot.toString()})(${JSON.stringify({horas:HORAS, ativo:HORAS, est})})`);
    const hm = s => { s = Math.round(s); const h = Math.floor(s/3600), m = Math.floor(s%3600/60); return h ? `${h}h${String(m).padStart(2,'0')}` : `${m}min${String(s%60).padStart(2,'0')}`; };
    console.log(`\n===== estratégia: ${est} (${HORAS}h de jogo ativo) =====`);
    const keys = ['helper:cobre','smelter:cobre','usina','pw:tb','belt:cobre','tool:ferro','oil','oil:ps','tool:britadeira','forest','quarry','q:bOpen','lake','q:cOpen','tool:carregadeira','tool:escavadeira','MAGNATA'];
    for(const k of keys){ const e = r.log.find(x=>x[1] === k); console.log(`  ${k.padEnd(20)} ${e ? hm(e[0]) : '—'}`); }
    console.log('  marcos:'); r.fins.forEach(f=>console.log(`   ${String(f.min).padStart(5)} min · dinheiro ${Math.round(f.money)} · ganho total ${Math.round(f.earned)} · minas ${f.tools} · ${Math.round(f.rate)}/s · NÍVEL ${f.lvl} · esmeraldas ${f.esm}\n        ${JSON.stringify(f.src)}`));
    await p.close();
  }
  await b.close();
})();
