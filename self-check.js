/* 自检脚本：改了 data.js 之后，跑 `node self-check.js` 看看配方分数有没有跑偏 */
const fs = require('fs');
const path = require('path');
const dir = __dirname;

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
            'global.__PRESETS = PRESETS; global.__I = INGREDIENTS; global.__PH = PH; global.__SCHEMES = SCORING_SCHEMES; global.__G = GLASSES;';
eval(src);

const B = global.BarMix;
const rows = [];
global.__PRESETS.forEach(function (p) {
  const r = B.load(p.items);
  const a = B.analyze();
  const tips = B.advise(a);
  rows.push({ 名称: p.name, 分: r.total, 平衡: r.balance, 烈度: r.strength, 结构: r.structure, 复杂度: r.complexity, 酒精度: r.abv + '%', 液量: r.liquid });
  console.log('『' + p.name + '』 总分 ' + r.total + '  (平衡' + r.balance + ' 烈度' + r.strength + ' 结构' + r.structure + ' 复杂度' + r.complexity + ')  ' + r.abv + '%vol  ' + r.liquid + 'ml');
  tips.forEach(function (t) { console.log('    · ' + t.text.slice(0, 70)); });
});

console.log('\n--- 极端情况 ---');
const cases = {
  '空杯': [],
  '纯饮': [['monkey', 45]],
  '糖水（威士忌+可乐）': [['monkey', 45], ['coke', 150]],
  '无酒精': [['orange_juice', 60], ['soda', 90], ['syrup', 15], ['ice', 1]],
  '全酸': [['monkey', 45], ['lemon', 30], ['ice', 1]],
  '浓奶油': [['monkey', 45], ['coconut_milk', 30], ['baileys', 30], ['ice', 1]]
};
Object.keys(cases).forEach(function (k) {
  console.log(k.padEnd(22) + ' ' + JSON.stringify(B.load(cases[k])));
});

/* ---- 检查经典配方区渲染出来的分组和用料行 ---- */
/* ---- 检查「换基酒」面板 ---- */
/* ---- 各分项的波动范围：用来判断权重配得合不合理 ---- */
console.log('\n--- 四个分项在全部配方上的波动 ---');
(function () {
  const acc = { balance: [], strength: [], structure: [], complexity: [] };
  global.__PRESETS.forEach(function (p) {
    B.state.glass = p.glass || 'icecup';
    const r = B.load(p.items);
    acc.balance.push(r.balance); acc.strength.push(r.strength);
    acc.structure.push(r.structure); acc.complexity.push(r.complexity);
  });
  const W = { balance: 0.38, strength: 0.08, structure: 0.22, complexity: 0.32 };
  const NAME = { balance: '平衡', strength: '浓度', structure: '结构', complexity: '复杂度' };
  Object.keys(acc).forEach(function (k) {
    const v = acc[k];
    const lo = Math.min.apply(null, v), hi = Math.max.apply(null, v);
    const mean = v.reduce(function (a, b) { return a + b; }, 0) / v.length;
    const sd = Math.sqrt(v.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0) / v.length);
    console.log('  ' + NAME[k] + '　权重 ' + (W[k] * 100) + '%　范围 ' + lo + '-' + hi
      + '　标准差 ' + sd.toFixed(1) + '　对总分的最大影响 ' + (W[k] * (hi - lo)).toFixed(1) + ' 分');
  });
})();

/* ---- 子评分区渲染出来的文案 ---- */
/* ---- 分类标签：六大基酒应该是并列的独立分类 ---- */
/* ---- 纯饮判定不能误伤正常配方 ---- */
console.log('\n--- 纯饮判定 ---');
(function () {
  const wrong = [];
  global.__PRESETS.forEach(function (p) {
    const g = global.__G.find(function (x) { return x.id === (p.glass || 'icecup'); });
    B.state.glass = g.id; B.state.iceLevel = g.ice === 'inglass' ? 'full' : 'none';
    B.state.taste = 'normal'; B.state.scheme = 'balanced';
    B.load(p.items);
    if (B.analyze().neatPour) wrong.push(p.name);
  });
  console.log('  ' + (wrong.length ? '❌ ' + wrong.length + ' 个经典配方被误判成纯饮：' + wrong.join('、')
    : '✅ ' + global.__PRESETS.length + ' 个经典配方，一个都没被误判成纯饮'));

  const cases = [
    ['45ml 威士忌（纯饮）', [['bourbon', 45]], true],
    ['45ml 威士忌 + 冰', [['bourbon', 45]], true, 'inglass'],
    ['锈钉（威士忌 + 杜林标）', [['jw_black', 45], ['drambuie', 20]], false],
    ['教父（威士忌 + 杏仁利口酒）', [['jw_black', 45], ['disaronno', 20]], false],
    ['金巴利单喝（也是纯饮）', [['campari', 45]], true],
    ['只倒苏打水', [['soda', 90]], false],
    ['高球（威士忌 + 苏打）', [['kakubin', 45], ['soda', 120]], false],
    ['威士忌 + 一条橙皮', [['jw_black', 45], ['orange_peel', 1]], false],
    ['威士忌 + 2 滴苦精', [['jw_black', 45], ['angostura', 2]], false]
  ];
  cases.forEach(function (c) {
    B.state.glass = 'shot'; B.state.iceLevel = c[3] || 'none';
    B.state.taste = 'strong'; B.state.scheme = 'balanced';
    B.load(c[1]);
    const got = B.analyze().neatPour;
    console.log('  ' + (got === c[2] ? '✅' : '❌') + ' ' + c[0].padEnd(24)
      + '判定纯饮 = ' + got + '（预期 ' + c[2] + '）');
    if (got !== c[2]) bad('纯饮', c[0] + ' 的纯饮判定错了');
  });
})();

/* ---- 硬约束：任何评分方案里，"平衡"都必须是最大权重 ---- */
console.log('\n--- 评分方案 ---');
(function () {
  const NAME = { balance: '平衡', complexity: '复杂度', structure: '结构', strength: '浓度' };
  global.__SCHEMES.forEach(function (s) {
    const parts = Object.keys(s.w).map(function (k) { return [k, s.w[k]]; })
      .sort(function (a, b) { return b[1] - a[1]; });
    const sum = parts.reduce(function (a, b) { return a + b[1]; }, 0);
    const top = parts[0];
    const ok = top[0] === 'balance' && Math.abs(sum - 1) < 1e-9;
    console.log('  ' + (ok ? '✅' : '❌') + ' ' + s.name.padEnd(6) + '　'
      + parts.map(function (p) { return NAME[p[0]] + ' ' + Math.round(p[1] * 100) + '%'; }).join(' · ')
      + '　合计 ' + Math.round(sum * 100) + '%'
      + (top[0] === 'balance' ? '' : '　⚠ 最大权重不是平衡'));
  });
})();

/* ---- 浓缩液倒多了必须报警 ---- */
console.log('\n--- 浓缩液的用量报警 ---');
[
  ['12ml（合理）', [['makers', 45], ['maple', 15], ['sunquick', 12]]],
  ['15ml（默认）', [['makers', 45], ['maple', 15], ['sunquick', 15]]],
  ['65ml（截图里那杯）', [['makers', 45], ['maple', 15], ['sunquick', 65]]]
].forEach(function (c) {
  B.state.glass = 'rocks'; B.state.iceLevel = 'full'; B.state.taste = 'normal';
  const r = B.load(c[1]);
  const hit = B.advise(B.analyze()).filter(function (x) { return x.text.indexOf('浓缩液') >= 0; });
  console.log('  ' + c[0].padEnd(18) + '总分 ' + String(r.total).padStart(5) + '　平衡 '
    + String(r.balance).padStart(5) + '　' + (hit.length ? '⚠ 报警' : '无报警'));
});

/* ---- pH 表和材料表必须对得上（写错 id 会静默失效） ---- */
console.log('\n--- pH 表的 id 对账 ---');
(function () {
  const ids = {};
  global.__I.forEach(g => ids[g.id] = 1);
  const keys = Object.keys(global.__PH);
  const orphan = keys.filter(k => !ids[k]);
  console.log('  表里有 ' + keys.length + ' 条，材料库里没有的 id：'
    + (orphan.length ? '⚠ ' + orphan.join('、') : '无 ✓'));
  const missing = global.__I.filter(g => g.mlu > 0 && g.abv === 0 && !global.__PH[g.id]
    && g.cat !== 'sweet' && g.cat !== 'bitter');
  console.log('  液体材料里没标 pH 的（按 6.0 算）：'
    + (missing.length ? missing.map(g => g.name).join('、') : '无 ✓'));
})();

console.log('\n--- 分类标签 ---');
(function () {
  B.state.hideRisky = false;
  const tabs = Array.from(els['cats'].innerHTML.matchAll(/data-cat="([a-z_]+)">([^<]+)</g))
    .map(m => ({ id: m[1], name: m[2] }));
  console.log('  共 ' + tabs.length + ' 个：' + tabs.map(t => t.name).join(' / '));
  const empty = [];
  tabs.forEach(function (t) {
    B.state.cat = t.id;
    B.load([]);
    const n = (els['lib'].innerHTML.match(/class="chip/g) || []).length;
    if (!n) empty.push(t.name);
  });
  console.log('  空分类：' + (empty.length ? '⚠ ' + empty.join('、') : '无 ✓'));
  ['whisky', 'gin', 'rum', 'vodka', 'tequila', 'brandy'].forEach(function (id) {
    const t = tabs.find(x => x.id === id);
    if (!t) bad('分类', '六大基酒里的 ' + id + ' 没有独立标签');
  });
  B.state.cat = 'sour';
})();

/* ---- 杯子预览图：颗粒数、颜色、注水比例 ---- */
console.log('\n--- 杯子预览图 ---');
[
  ['冰杯', 'icecup', [['havana3', 45], ['yakult', 1], ['apple_juice', 120], ['ice', 1]]],
  ['古典杯', 'rocks', [['bourbon', 45], ['lemon', 20], ['syrup', 15], ['egg_white', 15], ['angostura', 2], ['ice', 1]]],
  ['马天尼杯', 'coupe', [['tanqueray', 60], ['dry_vermouth', 10], ['orange_bitters', 1]]],
  ['高球杯', 'highball', [['havana3', 45], ['lime', 20], ['syrup', 15], ['mint', 8], ['soda', 60], ['ice', 1]]],
  ['空杯', 'icecup', []]
].forEach(function (c) {
  B.state.glass = c[1];
  B.load(c[2]);
  const svg = els['glassPreview'].innerHTML;
  const dots = (svg.match(/<(circle|polygon|rect)[^>]*fill="#/g) || []).length;
  const colors = Array.from(new Set(svg.match(/#[0-9a-f]{6}/g) || []));
  const fill = els['glassNote'].innerHTML.replace(/<[^>]*>/g, ' ');
  console.log('  ' + c[0].padEnd(10) + '颗粒 ' + String(dots).padStart(4) + '　颜色 ' + colors.length
    + ' 种　' + (fill.match(/液体 \d+ \/ 上限 \d+ml/) || ['液体 -'])[0]);
});

B.load([['havana3', 45], ['yakult', 1], ['apple_juice', 120], ['ice', 1]]);
console.log('\n--- 子评分区渲染出来的样子 ---');
els['subScores'].innerHTML
  .split('<div class="sub">').join('\n')
  .replace(/<[^>]*>/g, ' ')
  .replace(/[ \t]+/g, ' ')
  .split('\n')
  .forEach(function (line) { if (line.trim()) console.log('  ' + line.trim()); });

/* ---- 回归检查：结块警告只在"厚奶 + 外加酸"时出现 ---- */
/* ---- 回归检查：烈度分必须看杯量，不能"酒越多分越高" ---- */
console.log('\n--- 回归：兑稀了，浓度分必须下降 ---');
[
  ['苹果汁 120ml', [['havana3', 45], ['yakult', 1], ['apple_juice', 120], ['ice', 1]]],
  ['苹果汁 150ml', [['havana3', 45], ['yakult', 1], ['apple_juice', 150], ['ice', 1]]],
  ['苹果汁 210ml', [['havana3', 45], ['yakult', 1], ['apple_juice', 210], ['ice', 1]]]
].forEach(function (c) {
  const r = B.load(c[1]);
  const a = B.analyze();
  console.log('  ' + c[0] + ' → 浓度 ' + r.strength + '　总分 ' + r.total + '　液体 '
    + Math.round(a.liquid) + 'ml　' + a.abv.toFixed(1) + '%');
});

console.log('\n--- 烈度：同样一杯酒，多加基酒不该加分 ---');
[
  ['养乐多橙汁朗姆 30ml（用户说好喝的那杯）', [['rum', 30], ['yakult', 1], ['orange_juice', 90], ['ice', 1]]],
  ['同配方把朗姆加到 90ml', [['rum', 90], ['yakult', 1], ['orange_juice', 90], ['ice', 1]]]
].forEach(function (c) {
  const r = B.load(c[1]);
  const a = B.analyze();
  console.log('  ' + c[0]);
  console.log('     总分 ' + r.total + '　浓度 ' + r.strength + '　'
    + Math.round(a.finalVol) + 'ml　' + a.abv.toFixed(1) + '%');
});

console.log('\n--- 结块 / 分层的判定（看 pH 和蛋白酶） ---');
[
  ['养乐多 + 烧酒（不该警告）', [['soju', 60], ['yakult', 1], ['sprite', 60], ['ice', 1]], false],
  ['养乐多 + 柠檬（不该警告）', [['yakult', 1], ['lemon', 20], ['soda', 60], ['ice', 1]], false],
  ['白俄罗斯（不该警告）', [['vodka', 45], ['kahlua', 20], ['cream', 20], ['ice', 1]], false],
  ['爱尔兰咖啡（不该警告）', [['jw_black', 45], ['coffee_hot', 120], ['demerara', 10], ['cream', 20]], false],
  ['椰林飘香（该警告·酶）', [['rum', 45], ['pineapple', 90], ['coconut_milk', 30], ['ice', 1]], true],
  ['牛奶 + 柠檬（该警告·pH）', [['vodka', 45], ['milk', 60], ['lemon', 20], ['ice', 1]], true],
  ['椰浆 + 青柠（该警告·pH）', [['rum', 45], ['coconut_milk', 30], ['lime', 15], ['ice', 1]], true]
].forEach(function (c) {
  B.load(c[1]);
  const a = B.analyze();
  /* 只看硬警告；"补酸会结块"是降低甜度的建议，不算 */
  const hit = B.advise(a).some(function (x) { return x.text.indexOf('⚠️') >= 0; });
  console.log('  ' + (hit === c[2] ? '✅' : '❌') + ' ' + c[0]
    + ' → ' + (hit ? '警告' : '无警告') + '（pH ' + a.ph.toFixed(1) + '）');
});

/* ---- pH 模型的标定检查 ---- */
console.log('\n--- pH 估算的标定 ---');
[
  ['纯柠檬汁', [['lemon', 20]], 2.2],
  ['纯菠萝汁', [['pineapple', 90]], 3.5],
  ['威士忌酸', [['bourbon', 45], ['lemon', 20], ['syrup', 15], ['egg_white', 15], ['ice', 1]], 3.2],
  ['威士忌高球', [['kakubin', 45], ['soda', 120], ['ice', 1]], null],
  ['自由古巴', [['havana3', 45], ['coke', 100], ['lime', 10], ['ice', 1]], 2.9]
].forEach(function (c) {
  B.load(c[1]);
  const ph = B.analyze().ph;
  const mark = c[2] === null ? '·' : (Math.abs(ph - c[2]) < 0.45 ? '✅' : '⚠️');
  console.log('  ' + mark + ' ' + c[0] + ' → pH ' + ph.toFixed(2) + (c[2] ? '（参考 ' + c[2] + '）' : ''));
});

els['swapPanel'].hidden = true;
els['swapPanel'].innerHTML = '';
B.state.swapOpen = true;
B.load([['rye', 60], ['vermouth', 20], ['angostura', 2], ['ice', 1]]);
const swapHtml = els['swapPanel'].innerHTML;
const swapChips = [...swapHtml.matchAll(/class="schip( on)?" data-swap="([a-z0-9_]+)"/g)];
const swapCur = swapHtml.match(/hint swap-hint">([^<]*)</);
console.log('\n--- 换基酒面板 ---');
console.log('  展开状态 hidden=' + els['swapPanel'].hidden + '，可选基酒 ' + swapChips.length + ' 瓶');
console.log('  当前高亮：' + swapChips.filter(function (c) { return c[1]; }).map(function (c) { return c[2]; }).join('、'));
console.log('  提示：' + (swapCur ? swapCur[1] : '(无)'));
B.state.swapOpen = false;
B.load([]);

/* 回归检查：每个面板都必须在启动时渲染出内容，防空面板 */
const panels = { cats: '分类', lib: '材料库', presets: '经典配方', stats: '参数', subScores: '子评分' };
let empty = [];
Object.keys(panels).forEach(function (k) {
  if (!els[k] || !String(els[k].innerHTML).trim()) empty.push(panels[k]);
});
console.log('\n--- 面板渲染检查 ---');
console.log(empty.length ? '❌ 空白面板：' + empty.join('、') : '✅ 所有面板都渲染出了内容');

const html = els['presets'].innerHTML;
const cardRe = /<span class="p-name">([^<]*)<\/span><span class="p-sub">([^<]*)<\/span><span class="p-comp">([^<]*)<\/span>/g;
let m, n = 0;
const seenGroups = [];
/* 分组标题里现在还有 "N 个" 的说明，所以只取到下一个 '<' 之前 */
const parts = html.split('<div class="pgroup">');
parts.forEach(function (chunk, idx) {
  if (idx === 0) return;
  const name = chunk.slice(0, chunk.indexOf('<'));
  seenGroups.push(name);
  console.log('\n===== ' + name + ' =====');
  let c;
  while ((c = cardRe.exec(chunk))) {
    n++;
    console.log('  ' + c[1] + '  →  ' + c[3]);
  }
  cardRe.lastIndex = 0;
});
console.log('\n共渲染 ' + n + ' 张配方卡，' + seenGroups.length + ' 个分组');
