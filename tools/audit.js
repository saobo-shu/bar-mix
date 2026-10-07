/* =========================================================
   全面复核：把 杯型 × 冰量 × 口味 × 配方 全跑一遍，
   专找"行为反常"的地方——不是找口味对不对，是找自相矛盾。
   跑法：node tools/audit.js
   ========================================================= */
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..');

global.window = global;
const els = {};
global.document = {
  getElementById(id) {
    if (!els[id]) els[id] = { innerHTML: '', textContent: '', hidden: false, dataset: {},
      setAttribute() {}, addEventListener() {}, scrollIntoView() {}, closest() { return null; },
      classList: { toggle() {}, add() {}, remove() {} } };
    return els[id];
  },
  addEventListener() {}
};

const src = fs.readFileSync(path.join(dir, 'data.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(dir, 'app.js'), 'utf8') + '\n' +
  'global.__X = { PRESETS: PRESETS, INGREDIENTS: INGREDIENTS, GLASSES: GLASSES,' +
  ' TASTES: TASTES, ICE_LEVELS: ICE_LEVELS, PRESET_METHOD: PRESET_METHOD, TEMPS: TEMPS };';
eval(src);

const B = window.BarMix, X = global.__X;
const P = X.PRESETS, I = X.INGREDIENTS, GL = X.GLASSES, TA = X.TASTES, LV = X.ICE_LEVELS, PM = X.PRESET_METHOD;
const byId = {};
I.forEach(g => byId[g.id] = g);
const defaultIce = g => (g.ice === 'inglass' ? 'full' : 'none');

const problems = [];
const notes = [];
function bad(tag, msg) { problems.push('[' + tag + '] ' + msg); }
function note(tag, msg) { notes.push('[' + tag + '] ' + msg); }

/* 跑一杯：设定好杯子/冰量/口味，装杯，返回分数 */
function run(items, glass, ice, taste, method) {
  B.state.glass = glass; B.state.iceLevel = ice; B.state.taste = taste;
  if (method) B.state.method = method;
  const r = B.load(items);
  return { r: r, a: B.analyze(), advice: B.advise(B.analyze()) };
}
/* 跑一条配方：做法一定要跟着配方走。
   以前这里不传做法，于是"上一条配方用什么做法"会漏给下一条——
   养乐多烧酒按"摇和"算出了 3.6%，实际上它是兑和的 4.5%。 */
const runPreset = (p, glass, ice, taste) => run(p.items, glass, ice, taste, PM[p.name] || 'build');
const scale = (items, k) => items.map(it => [it[0], Math.round(it[1] * k * 100) / 100]);

/* ---------------- A. 取值范围 / NaN ---------------- */
let combos = 0;
P.forEach(p => {
  const glass = p.glass || 'icecup';
  GL.forEach(g => LV.forEach(lv => TA.forEach(t => {
    combos++;
    const o = run(p.items, g.id, lv.id, t.id, PM[p.name]);
    ['total', 'balance', 'strength', 'structure', 'complexity'].forEach(k => {
      const v = o.r[k];
      if (typeof v !== 'number' || !isFinite(v)) bad('NaN', p.name + ' / ' + g.name + ' / ' + lv.name + ' / ' + t.name + ' 的 ' + k + ' = ' + v);
      else if (v < 0 || v > 100) bad('越界', p.name + ' 的 ' + k + ' = ' + v.toFixed(1));
    });
    if (!(o.a.ph >= 1.9 && o.a.ph <= 7.1)) bad('pH', p.name + ' pH=' + o.a.ph);
    if (!(o.a.abv >= 0 && o.a.abv <= 70)) bad('ABV', p.name + ' abv=' + o.a.abv);
    if (o.a.liquid > 0 && o.advice.length === 0) bad('没建议', p.name + ' 有材料却没有任何建议');
    if (o.advice.length > 5) bad('建议过多', p.name + ' 有 ' + o.advice.length + ' 条');
  })));
});
console.log('跑了 ' + combos + ' 种组合（' + P.length + ' 配方 × ' + GL.length + ' 杯型 × '
  + LV.length + ' 冰量 × ' + TA.length + ' 口味）');

/* ---------------- B. 整体缩放不变性 ---------------- */
/* 把配方整体放大/缩小，比例没变 → 分数不该变。之前"用总量推理想浓度"就是死在这里。 */
P.forEach(p => {
  const glass = p.glass || 'icecup';
  const base = run(p.items, glass, defaultIce(GL.find(g => g.id === glass)), 'normal').r.total;
  [0.6, 1.6].forEach(k => {
    const o = run(scale(p.items, k), glass, defaultIce(GL.find(g => g.id === glass)), 'normal');
    if (Math.abs(o.r.total - base) > 6)
      bad('缩放', p.name + ' ×' + k + ' 之后总分从 ' + base.toFixed(1) + ' 变成 ' + o.r.total.toFixed(1)
        + '（比例完全一样，不该差这么多）');
  });
});

/* ---------------- C. 加基酒的方向性 ---------------- */
P.forEach(p => {
  const glass = GL.find(g => g.id === (p.glass || 'icecup'));
  const taste = TA[1];
  const o = run(p.items, glass.id, defaultIce(glass), taste.id);
  const baseItem = p.items.find(it => byId[it[0]] && byId[it[0]].cat === 'base');
  if (!baseItem) return;
  const plus = p.items.map(it => it[0] === baseItem[0] ? [it[0], it[1] + 30] : it);
  const o2 = run(plus, glass.id, defaultIce(glass), taste.id);
  const d = o2.r.total - o.r.total;
  const tooWeak = o.a.abv < taste.lo, tooStrong = o.a.abv > taste.hi;
  if (tooWeak && d < -0.5) bad('加酒方向', p.name + ' 偏淡（' + o.a.abv.toFixed(1) + '%）却没从加酒中获益（' + d.toFixed(1) + '）');
  /* 偏烈还涨分只在小幅时算正常（加酒会稀释掉过量的甜），
     真正有问题的是"浓度分反而涨了"或者总分涨很多 */
  if (tooStrong && (o2.r.strength > o.r.strength + 0.5 || d > 4))
    bad('加酒方向', p.name + ' 偏烈（' + o.a.abv.toFixed(1) + '%）却因为加酒涨分（+' + d.toFixed(1)
      + '，浓度 ' + o.r.strength + '→' + o2.r.strength + '）');
});

/* ---------------- D. 杯型方向性 ---------------- */
P.forEach(p => {
  const good = GL.find(g => g.id === (p.glass || 'icecup'));
  const base = runPreset(p, good.id, defaultIce(good), 'normal').r.total;
  GL.forEach(g => {
    LV.forEach(lv => {
      const o = runPreset(p, g.id, lv.id, 'normal');
      if (o.r.total > base + 3)
        bad('杯型', p.name + ' 用「' + g.name + '+' + lv.name + '」比它该用的「' + good.name + '」还高 '
          + (o.r.total - base).toFixed(1) + ' 分');
    });
  });
});

/* ---------------- E. 区分度 ---------------- */
console.log('\n各分项在 ' + P.length + ' 个配方（各自默认状态）上的分布：');
{
  const acc = { balance: [], strength: [], structure: [], complexity: [] };
  const totals = [];
  P.forEach(p => {
    const g = GL.find(x => x.id === (p.glass || 'icecup'));
    const o = runPreset(p, g.id, defaultIce(g), 'normal');
    ['balance', 'strength', 'structure', 'complexity'].forEach(k => acc[k].push(o.r[k]));
    totals.push(o.r.total);
  });
  const NAME = { balance: '平衡', strength: '浓度', structure: '结构', complexity: '复杂度' };
  Object.keys(acc).forEach(k => {
    const v = acc[k], mean = v.reduce((a, b) => a + b, 0) / v.length;
    const sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / v.length);
    const sat = v.filter(x => x >= 99.5).length;
    console.log('  ' + NAME[k] + '　' + Math.min.apply(null, v).toFixed(0) + '-' + Math.max.apply(null, v).toFixed(0)
      + '　标准差 ' + sd.toFixed(1) + '　满分 ' + sat + '/' + v.length + ' 个');
    if (sd < 3) note('区分度', NAME[k] + ' 几乎恒定（标准差 ' + sd.toFixed(1) + '），对总分没有区分作用');
    if (sat > v.length * 0.7) note('区分度', NAME[k] + ' 有 ' + sat + '/' + v.length + ' 个是满分，基本只在当护栏用');
  });
  console.log('  总分 ' + Math.min.apply(null, totals).toFixed(1) + '-' + Math.max.apply(null, totals).toFixed(1));
}

/* ---------------- F. 建议自相矛盾 ---------------- */
P.forEach(p => {
  const g = GL.find(x => x.id === (p.glass || 'icecup'));
  const adv = runPreset(p, g.id, defaultIce(g), 'normal').advice.map(x => x.text).join(' ');
  if (/偏甜|太甜/.test(adv) && /偏酸|太酸/.test(adv)) bad('建议矛盾', p.name + ' 同时说偏甜和偏酸');
  if (/加 15ml 鲜柠檬汁/.test(adv) && /去掉奶/.test(adv)) bad('建议矛盾', p.name + ' 一边让加酸一边说会结块');
});

/* ---------------- G. 数据完整性 ---------------- */
/* 每个配方自己配的杯子，和它自己的酒精度搭不搭 */
console.log('\n配方自带杯型与自身酒精度的匹配：');
let mismatch = 0;
P.forEach(p => {
  const g = GL.find(x => x.id === p.glass);
  const o = runPreset(p, g.id, defaultIce(g), 'normal');
  if (o.a.isHot) return;
  if (!(o.a.abv >= g.lo && o.a.abv <= g.hi)) {
    mismatch++;
    console.log('  · ' + p.name + '　' + o.a.abv.toFixed(1) + '% 配「' + g.name + '」（该杯型适合 '
      + g.lo + '-' + g.hi + '%）');
  }
});
if (!mismatch) console.log('  全部匹配。');

P.forEach(p => {
  if (!p.glass) bad('数据', p.name + ' 没有指定杯型');
  else if (!GL.some(g => g.id === p.glass)) bad('数据', p.name + ' 的杯型 ' + p.glass + ' 不存在');
  p.items.forEach(it => {
    const g = byId[it[0]];
    if (!g) bad('数据', p.name + ' 引用了不存在的材料 ' + it[0]);
    else if (!(it[1] > 0)) bad('数据', p.name + ' 里 ' + g.name + ' 的量是 ' + it[1]);
  });
});
I.forEach(g => {
  if (!g.f) bad('数据', g.id + ' 缺风味值');
  if (!(g.step > 0)) bad('数据', g.id + ' 的步进是 ' + g.step);
  if (!(g.def > 0)) bad('数据', g.id + ' 的默认量是 ' + g.def);
  if (g.unit === 'ml' && g.step !== 5 && g.id !== 'absinthe') note('步进', g.name + ' 步进是 ' + g.step + 'ml');
});

/* ---------------- H. 极端输入 ---------------- */
try {
  B.state.glass = 'coupe'; B.state.iceLevel = 'none'; B.state.taste = 'normal';
  const huge = I.filter(g => g.cat !== 'garnish').slice(0, 40).map(g => [g.id, 200]);
  const o = run(huge, 'coupe', 'none', 'normal');
  if (!isFinite(o.r.total)) bad('极端', '全加 200ml 时总分变成 ' + o.r.total);
  else note('极端', '把 40 种材料各倒 200ml：总分 ' + o.r.total.toFixed(1) + '，液体 '
    + Math.round(o.a.liquid) + 'ml，pH ' + o.a.ph.toFixed(2) + '，没崩');
} catch (e) { bad('极端', '极端输入把程序跑崩了：' + e.message); }

try {
  const o = run([], 'icecup', 'full', 'normal');
  if (o.r.total !== undefined && !isFinite(o.r.total)) bad('极端', '空杯时总分是 ' + o.r.total);
} catch (e) { bad('极端', '空杯把程序跑崩了：' + e.message); }

/* ---------------- 输出 ---------------- */
console.log('\n================ 发现 ================');
if (!problems.length) console.log('没有发现行为反常的地方。');
else problems.forEach(p => console.log('  ⚠ ' + p));
if (notes.length) {
  console.log('\n---- 提示（不算错误，但值得看一眼）----');
  notes.forEach(n => console.log('  · ' + n));
}
console.log('\n共 ' + problems.length + ' 个问题，' + notes.length + ' 条提示。');
