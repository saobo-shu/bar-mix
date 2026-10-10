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
  /* 把 click 处理器存下来，测试里可以真的模拟一次点击 */
  _handlers: {},
  addEventListener(type, fn) { this._handlers[type] = fn; }
};

const src = fs.readFileSync(path.join(dir, 'data.js'), 'utf8') + '\n' +
            fs.readFileSync(path.join(dir, 'app.js'), 'utf8') + '\n' +
            'global.__PRESETS = PRESETS; global.__I = INGREDIENTS; global.__PH = PH; global.__SCHEMES = SCORING_SCHEMES; global.__G = GLASSES; global.__PM = PRESET_METHOD;'
            + ' global.__TEMPS = TEMPS; global.__TD = TEMP_DEFAULT; global.__TF = TEMP; global.__TC = TEMP_CYCLE;'
            + ' global.__METHODS = METHODS;';
eval(src);

const B = global.BarMix;

/* 失败要记下来，而不是抛异常中断——之前 bad() 根本没定义，
   一旦哪条检查不通过，脚本会以 ReferenceError 崩掉，后面的检查全不跑，
   看起来像"程序坏了"，而不是"这条检查没过"。 */
const PROBLEMS = [];
function bad(tag, msg) {
  PROBLEMS.push('[' + tag + '] ' + msg);
  console.log('      ⛔ ' + msg);
}

/* 忠实地模拟一次点击：假元素的 closest() 必须按选择器判断，不能无脑返回。
   之前这里无脑返回 dataset，于是"只认 <button>"那个 bug 测不出来。 */
function fire(dataset, tag) {
  const click = global.document._handlers.click;
  const el = { tagName: (tag || 'button').toUpperCase(), dataset: dataset };
  el.closest = function (sel) {
    const parts = sel.split(',').map(function (s) { return s.trim(); });
    for (const p of parts) {
      if (p === 'button' && el.tagName === 'BUTTON') return el;
      const m = p.match(/^\[([a-z-]+)\]$/);
      if (m) {
        /* 真实 DOM 里 data-expand 对应 dataset.expand，所以要去掉 data- 前缀 */
        const key = m[1].replace(/^data-/, '').replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); });
        if (el.dataset[key] !== undefined) return el;
      }
    }
    return null;
  };
  click({ target: el });
}

const rows = [];
global.__PRESETS.forEach(function (p, i) {
  const r = B.preset(i);
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
  global.__PRESETS.forEach(function (p, i) {
    const r = B.preset(i);
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
/* ---- 真的模拟一次点击：改度数这条路必须走得通 ---- */
console.log('\n--- 点击交互（模拟真实点击，不是读代码）---');
(function () {
  B.state.glass = 'shot'; B.state.iceLevel = 'none';
  B.state.taste = 'strong'; B.state.scheme = 'balanced';
  B.load([['tanqueray', 45]]);

  const before = B.analyze().abv;
  const asked = [];
  global.window.prompt = function (msg, def) { asked.push(def); return '50'; };
  fire({ abv: 'tanqueray' });
  const after = B.analyze().abv;
  const ok = Math.abs(before - 47.3) < 0.05 && Math.abs(after - 50) < 0.05;
  console.log('  ' + (ok ? '✅' : '❌') + ' 点度数按钮：' + before.toFixed(1) + '% → ' + after.toFixed(1)
    + '%（弹窗默认填 ' + asked[0] + '）');
  if (!ok) bad('交互', '点度数按钮没生效：' + before.toFixed(1) + ' → ' + after.toFixed(1));

  global.window.prompt = function () { return 'abc'; };
  fire({ abv: 'tanqueray' });
  const back = B.analyze().abv;
  const ok2 = Math.abs(back - 47.3) < 0.05;
  console.log('  ' + (ok2 ? '✅' : '❌') + ' 输入乱码：恢复到默认 ' + back.toFixed(1) + '%');
  if (!ok2) bad('交互', '输入非法值后没恢复默认，当前 ' + back.toFixed(1) + '%');

  global.window.prompt = function () { return null; };
  /* 点杯子里的那一行 → 展开/收起完整说明 */
  /* 注意：这一行在真实页面里是 <div>，不是 <button>。
     所以这里必须按 div 模拟——否则测不出"只认 button"那个 bug。 */
  B.state.glass = 'icecup'; B.state.iceLevel = 'full';
  B.load([['tanqueray', 45], ['sunquick', 30]]);
  const foldBefore = els['cupList'].innerHTML.indexOf('看全部 ▾') >= 0;
  fire({ expand: 'sunquick' }, 'div');
  const opened = els['cupList'].innerHTML.indexOf('cup-item open') >= 0
    && els['cupList'].innerHTML.indexOf('收起 ▴') >= 0;
  fire({ expand: 'sunquick' }, 'div');
  const closed = els['cupList'].innerHTML.indexOf('cup-item open') < 0;
  console.log('  ' + (foldBefore && opened && closed ? '✅' : '❌')
    + ' 点说明那一行（div 元素）：展开 → 收起');
  if (!(foldBefore && opened && closed)) bad('交互', '点说明那一行不能展开/收起');

  /* 反向验证：一个既不是 button、也没有 data-expand 的元素，点了应该什么都不做 */
  const snap = els['cupList'].innerHTML;
  fire({}, 'div');
  console.log('  ' + (els['cupList'].innerHTML === snap ? '✅' : '❌') + ' 点无关的 div：没有副作用');

  global.window.prompt = function () { return null; };
  fire({ act: 'plus', id: 'tanqueray' });
  const plus = B.state.cup.get('tanqueray');
  fire({ act: 'minus', id: 'tanqueray' });
  const minus = B.state.cup.get('tanqueray');
  fire({ act: 'del', id: 'tanqueray' });
  const del = B.state.cup.has('tanqueray');
  const ok3 = plus === 50 && minus === 45 && del === false;
  console.log('  ' + (ok3 ? '✅' : '❌') + ' 加/减/删：45 → +' + plus + ' → ' + minus
    + ' → ' + (del ? '还在' : '删掉了'));
  if (!ok3) bad('交互', '加/减/删按钮有问题：' + plus + '/' + minus + '/' + del);
})();

/* ---- 做法：和参考字典对账 ---- */
console.log('\n--- 做法（和经典字典对账）---');
(function () {
  const ref = JSON.parse(fs.readFileSync(path.join(__dirname, 'tools', 'reference-recipes.json'), 'utf8'));
  const MAP = { shake: 'shake', stir: 'stir', build: 'build', smash: 'build', rolling: 'build', blended: 'shake' };
  const OUR = { build: '兑和', stir: '搅拌', shake: '摇和' };
  const norm = function (s) {
    return String(s || '').replace(/[（(].*?[)）]/g, '').replace(/[\s·\/]/g, '')
      .replace(/^生锈钉$/, '锈钉').replace(/^古典鸡尾酒$/, '古典');
  };
  const byName = {};
  ref.forEach(function (r) { byName[norm(r.zh)] = r; });
  let same = 0; const diff = []; const missing = [];
  global.__PRESETS.forEach(function (p) {
    const mine = global.__PM[p.name];
    const r = byName[norm(p.name)];
    if (!r) { missing.push(p.name); return; }
    const theirs = MAP[r.method] || '?';
    if (theirs === mine) same++;
    else diff.push(p.name + '：我写「' + OUR[mine] + '」，字典是「' + (r.method || '?') + '」');
  });
  console.log('  44 条里能对上字典的 ' + (global.__PRESETS.length - missing.length) + ' 条，做法一致 ' + same + ' 条');
  if (missing.length) console.log('  字典里没同名条目：' + missing.join('、'));
  diff.forEach(function (d) { console.log('  ⚠ ' + d); });
})();

/* ---- 做法：每条配方都得有，而且点一张卡片必须真的把做法带进来 ---- */
console.log('\n--- 做法（覆盖 + 点卡片）---');
(function () {
  const ids = global.__METHODS.map(function (m) { return m.id; });
  const miss = [], wrong = [];
  global.__PRESETS.forEach(function (p) {
    const m = global.__PM[p.name];
    if (!m) miss.push(p.name);
    else if (ids.indexOf(m) < 0) wrong.push(p.name + '=' + m);
  });
  console.log('  ' + (miss.length || wrong.length ? '❌' : '✅') + ' ' + global.__PRESETS.length
    + ' 个经典配方都有做法' + (miss.length ? '，缺：' + miss.join('、') : '')
    + (wrong.length ? '，非法值：' + wrong.join('、') : ''));
  if (miss.length || wrong.length) bad('做法', '配方缺做法或做法非法：' + miss.concat(wrong).join('、'));

  /* 点「萨泽拉克」这张卡片：配方是搅拌的，点完做法就该是 stir，酒精度也该跟着降。
     这一步以前漏了——点进去出来的是"兑和"，38.2%，比实际的 31% 烈。 */
  const i = global.__PRESETS.findIndex(function (p) { return p.name === '萨泽拉克'; });
  B.state.method = 'build'; B.state.glass = 'icecup'; B.state.iceLevel = 'full';
  B.state.temps = {}; B.state.taste = 'normal';
  fire({ preset: String(i) });
  const after = B.analyze();
  const ok = B.state.method === 'stir' && after.prepDil > 0;
  console.log('  ' + (ok ? '✅' : '❌') + ' 点「萨泽拉克」：做法变成 ' + B.state.method
    + '，稀释 ' + Math.round(after.prepDil) + 'ml，酒精度 ' + after.abv.toFixed(1) + '%');
  if (!ok) bad('做法', '点配方没有把做法带进来：method=' + B.state.method);
})();

/* ---- 温度 / 化水：热量平衡必须真的算出来，而且方向不能反 ---- */
console.log('\n--- 温度 / 化水（热量平衡）---');
(function () {
  const ids = global.__TEMPS.map(function (t) { return t.id; });
  const badT = [];
  global.__I.forEach(function (g) {
    const id = B.tempIdOf(g);
    if (ids.indexOf(id) < 0) badT.push(g.id + '=' + id);
  });
  console.log('  ' + (badT.length ? '❌' : '✅') + ' ' + global.__I.length + ' 样材料都能落到一个合法温度'
    + (badT.length ? '：' + badT.join('、') : ''));
  if (badT.length) bad('温度', '这些材料没有合法温度：' + badT.join('、'));

  const recipe = [['tanqueray', 45], ['tonic', 150], ['ice', 1]];
  B.state.glass = 'icecup'; B.state.iceLevel = 'full'; B.state.method = 'build';
  B.state.taste = 'normal'; B.state.scheme = 'balanced';

  B.state.temps = {};
  B.load(recipe);
  const cold = B.analyze();
  B.state.temps = { tanqueray: 'frozen' };
  B.load(recipe);
  const frozen = B.analyze();
  B.state.temps = { tanqueray: 'room', tonic: 'room' };
  B.load(recipe);
  const warm = B.analyze();
  B.state.temps = {};

  console.log('  同一杯金汤力（冰杯·满冰），只有材料温度不同：');
  console.log('     冷冻基酒 + 冷藏汤力水 → 倒入即化 ' + frozen.meltIce + 'ml　酒精度 ' + frozen.abv.toFixed(1) + '%');
  console.log('     常温基酒 + 冷藏汤力水 → 倒入即化 ' + cold.meltIce + 'ml　酒精度 ' + cold.abv.toFixed(1) + '%');
  console.log('     全部常温　　　　　　　 → 倒入即化 ' + warm.meltIce + 'ml　酒精度 ' + warm.abv.toFixed(1) + '%');

  const okOrder = frozen.meltIce <= cold.meltIce && cold.meltIce < warm.meltIce
    && warm.meltIce - cold.meltIce >= 15 && warm.abv < cold.abv;
  console.log('  ' + (okOrder ? '✅' : '❌') + ' 顺序是对的：越冷化得越少，常温材料会明显把酒冲淡');
  if (!okOrder) bad('温度', '化水方向不对：冷冻 ' + frozen.meltIce + ' / 冷藏 ' + cold.meltIce
    + ' / 常温 ' + warm.meltIce + '，酒精度 ' + warm.abv.toFixed(1) + ' vs ' + cold.abv.toFixed(1));

  const okCap = warm.meltIce <= warm.iceMass && cold.meltIce >= 0;
  console.log('  ' + (okCap ? '✅' : '❌') + ' 化掉的水不会超过杯里的冰（' + warm.meltIce
    + 'ml ≤ ' + warm.iceMass + 'g），也不会是负数');
  if (!okCap) bad('温度', '化水量越界：' + warm.meltIce + 'ml / 冰 ' + warm.iceMass + 'g');

  /* 不加冰：一滴水都不该有 */
  B.state.iceLevel = 'none';
  const noIce = B.analyze();
  const okNone = noIce.iceMass === 0 && noIce.meltIce === 0;
  console.log('  ' + (okNone ? '✅' : '❌') + ' 选"不加冰"：杯里没有冰，倒入即化 0ml');
  if (!okNone) bad('温度', '不加冰却算出了化水：' + noIce.meltIce + 'ml');

  /* 热饮：不放冰，也不该去算化水 */
  B.state.glass = 'mug'; B.state.iceLevel = 'none'; B.state.temps = {};
  B.load([['jw_black', 45], ['hot_water', 90], ['honey', 15]]);
  const hot = B.analyze();
  const okHot = hot.isHot && hot.iceMass === 0 && hot.meltIce === 0;
  console.log('  ' + (okHot ? '✅' : '❌') + ' 热托蒂（加热水）：判定为热饮，不放冰、不算化水');
  if (!okHot) bad('温度', '热饮判定出问题：isHot=' + hot.isHot + ' 冰=' + hot.iceMass);
  B.state.temps = {}; B.state.glass = 'icecup'; B.state.iceLevel = 'full';
})();

/* ---- 化水那一栏的说法：不能把"放十几分钟化的水"说成"冰全化开" ---- */
console.log('\n--- 化水文案（用户拿两张截图问"这是不是冲突的"）---');
(function () {
  const strip = s => String(s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  /* 摇和 + 古典杯满冰：以前这里说"「古典杯」里的冰全化开（约 +25ml）"，
     可 128g 冰全化开是 +128ml，25ml 只是室温十几分钟化的量——自相矛盾。 */
  const i = global.__PRESETS.findIndex(p => p.name === '威士忌酸');
  B.preset(i);
  const sour = strip(els['diluteBox'].innerHTML);
  const noAllMelt = sour.indexOf('全化开') < 0;
  const hasGram = /\d+g 冰/.test(sour);
  const hasShake = sour.indexOf('摇壶') >= 0;
  const hasTime = sour.indexOf('十几分钟') >= 0;
  console.log('  ' + (noAllMelt ? '✅' : '❌') + ' 不再说"冰全化开"（杯里的冰有 128g，全化开是 +128ml）');
  console.log('  ' + (hasGram ? '✅' : '❌') + ' 写出了杯里冰的实际克数');
  console.log('  ' + (hasTime ? '✅' : '❌') + ' 说清了这是"放着十几分钟"的量');
  console.log('  ' + (hasShake ? '✅' : '❌') + ' 摇和的酒说明了摇壶那笔水和杯里化冰不重复');
  if (!noAllMelt) bad('化水文案', '还在说"冰全化开"，但数字只是室温十几分钟化的量');
  if (!hasGram) bad('化水文案', '化水那栏没写出杯里有多少克冰');
  if (!hasTime) bad('化水文案', '没说明 +25ml 是放多久化出来的');
  if (!hasShake) bad('化水文案', '摇和的酒没说清两笔水的来源');

  /* 兑和 + 冰：这一杯倒进去那一刻的水必须写出来 */
  const j = global.__PRESETS.findIndex(p => p.name === '金汤力');
  B.preset(j);
  const gin = strip(els['diluteBox'].innerHTML);
  const okPre = gin.indexOf('倒进去那一刻') >= 0;
  console.log('  ' + (okPre ? '✅' : '❌') + ' 兑和的酒写出了"倒进去那一刻"化的水');
  if (!okPre) bad('化水文案', '兑和的酒没有算"倒进去那一刻"化的水');

  /* 杯子上限必须跟着冰量走：不加冰能倒的比满冰多 */
  B.state.glass = 'rocks'; B.state.iceLevel = 'full'; B.state.temps = {};
  B.load([['bourbon', 45], ['coke', 150]]);
  const full = els['glassNote'].innerHTML.match(/上限 (\d+)ml/);
  B.state.iceLevel = 'none';
  B.load([['bourbon', 45], ['coke', 150]]);
  const none = els['glassNote'].innerHTML.match(/上限 (\d+)ml/);
  const okCap = full && none && +none[1] > +full[1];
  console.log('  ' + (okCap ? '✅' : '❌') + ' 上限跟着冰量变：满冰 ' + (full ? full[1] : '?')
    + 'ml → 不加冰 ' + (none ? none[1] : '?') + 'ml');
  if (!okCap) bad('化水文案', '换冰量之后杯子的液体上限没跟着变');
  B.state.iceLevel = 'full';
})();

/* ---- 这杯酒最后的构成（带子）：三笔水必须加起来正好是总液量 ---- */
console.log('\n--- 这杯酒最后的构成（带子）---');
(function () {
  const strip = s => String(s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  function widths(html) {
    return Array.from(html.matchAll(/style="width:([\d.]+)%"/g)).map(m => +m[1]);
  }

  /* 摇和的威士忌酸：酒液 96 + 摇壶 24 = 120ml，杯里的冰不再化水 */
  B.preset(global.__PRESETS.findIndex(p => p.name === '威士忌酸'));
  const html = els['mixBar'].innerHTML;
  const w = widths(html), sum = w.reduce((x, y) => x + y, 0);
  const text = strip(html);
  const a = B.analyze();
  const okSum = w.length > 0 && Math.abs(sum - 100) < 0.5;
  const okTxt = /倒进去的酒液\s*96ml/.test(text) && /摇和 \/ 搅拌加的水\s*24ml/.test(text)
    && /冰化出来的水\s*0ml/.test(text) && /合计\s*120ml/.test(text);
  console.log('  ' + (okSum ? '✅' : '❌') + ' 各段加起来正好 100%（' + w.map(x => x.toFixed(0) + '%').join(' + ') + '）');
  console.log('  ' + (okTxt ? '✅' : '❌') + ' 威士忌酸：' + text.replace(/\s+/g, ' ').slice(0, 60));
  if (!okSum) bad('构成带', '各段宽度加起来不是 100%：' + w.join(' + ') + ' = ' + sum.toFixed(1));
  if (!okTxt) bad('构成带', '威士忌酸的构成不对：' + text);
  const okVol = Math.abs(a.liquid + a.prepDil + a.meltIce - a.finalVol) < 0.01;
  if (!okVol) bad('构成带', '三笔水加起来不等于总液量');

  /* 兑和 + 冰：这时冰化的水必须单独有一段 */
  B.preset(global.__PRESETS.findIndex(p => p.name === '金汤力'));
  const gin = els['mixBar'].innerHTML;
  /* 兑和没有摇壶那笔水，所以带子上是两段：酒液 + 冰化出来的水 */
  const okMelt = /冰化出来的水\s*\d+ml/.test(strip(gin))
    && strip(gin).indexOf('冰化出来的水 0ml') < 0 && widths(gin).length === 2;
  console.log('  ' + (okMelt ? '✅' : '❌') + ' 兑和的酒多出一段「冰化出来的水」');
  if (!okMelt) bad('构成带', '兑和的酒没有把冰化的水单独画出来');

  /* 空杯：整条带子不出现 */
  B.load([]);
  console.log('  ' + (els['mixBar'].innerHTML === '' ? '✅' : '❌') + ' 空杯子：不画这条带子');
  if (els['mixBar'].innerHTML !== '') bad('构成带', '空杯子还画了构成带');
})();

/* ---- 温度标签：点一下要能轮换（span 不能被"展开说明"那一行吃掉点击）---- */
console.log('\n--- 点温度标签 ---');
(function () {
  B.state.temps = {};
  B.load([['coke', 150]]);
  const seq = [B.tempIdOf(B.BY_ID['coke'])];
  fire({ temp: 'coke' }, 'span');
  seq.push(B.tempIdOf(B.BY_ID['coke']));
  fire({ temp: 'coke' }, 'span');
  seq.push(B.tempIdOf(B.BY_ID['coke']));
  fire({ temp: 'coke' }, 'span');
  seq.push(B.tempIdOf(B.BY_ID['coke']));
  const ok = seq.join('>') === 'cold>room>frozen>cold';
  console.log('  ' + (ok ? '✅' : '❌') + ' 可乐：' + seq.join(' → ') + '（默认 冷藏，点一下常温，再点冷冻，转回默认）');
  if (!ok) bad('温度', '点温度标签没有轮换：' + seq.join('>'));

  /* 标签必须真的画在杯子里（杯子那栏和材料库都要有） */
  const cupHtml = els['cupList'].innerHTML;
  const libHtml = els['lib'].innerHTML;
  const drawn = cupHtml.indexOf('data-temp="coke"') >= 0 && cupHtml.indexOf('tempchip t-cold') >= 0;
  console.log('  ' + (drawn ? '✅' : '❌') + ' 杯子那一行画出了可点的温度标签（材料库里是只读的标签）');
  if (!drawn) bad('温度', '杯子那一行没有画出温度标签');
  if (libHtml.indexOf('tagtemp') < 0) bad('温度', '材料库没有画出温度标签');
  else console.log('  ✅ 材料库里的每种材料也标了建议温度');

  /* 热水这种只能热的材料，不该被点成冷冻 */
  B.state.temps = {};
  B.load([['hot_water', 90]]);
  const before = B.tempIdOf(B.BY_ID['hot_water']);
  fire({ temp: 'hot_water' }, 'span');
  const next = B.tempIdOf(B.BY_ID['hot_water']);
  const okH = before === 'hot' && next === 'room';
  console.log('  ' + (okH ? '✅' : '❌') + ' 热水：' + before + ' → ' + next + '（只在水温和常温之间换）');
  if (!okH) bad('温度', '热水的温度切换不对：' + before + ' → ' + next);
  B.state.temps = {};
})();

/* ---- 哪些材料才该有温度标签：装饰、苦精不该有（点了也不会有反应，像坏了）---- */
console.log('\n--- 哪些材料才有温度 ---');
(function () {
  const noTemp = ['mint', 'lemon_peel', 'orange_peel', 'cucumber', 'rosemary', 'cherry',
    'angostura', 'salt_water', 'orange_flower', 'tabasco'];
  const wrong = noTemp.filter(function (id) { return B.BY_ID[id] && B.hasTemp(B.BY_ID[id]); });
  console.log('  ' + (wrong.length ? '❌' : '✅') + ' 装饰和按滴算的材料一共 ' + noTemp.length
    + ' 样，都不该有温度' + (wrong.length ? '，可是这些有：' + wrong.join('、') : ''));
  if (wrong.length) bad('温度', '这些东西不该有温度标签：' + wrong.join('、'));

  B.state.temps = {};
  B.load([['mint', 8], ['lemon_peel', 1], ['angostura', 2], ['makers', 45]]);
  const cup = els['cupList'].innerHTML;
  const drawn = noTemp.filter(function (id) { return cup.indexOf('data-temp="' + id + '"') >= 0; });
  const okCup = drawn.length === 0 && cup.indexOf('data-temp="makers"') >= 0;
  console.log('  ' + (okCup ? '✅' : '❌') + ' 杯子那行：装饰和苦精上没有温度标签，美格波本上有');
  if (!okCup) bad('温度', '杯子那行的温度标签画错了：' + (drawn.length ? drawn.join('、') : '波本没画出来'));

  const before2 = B.analyze().meltIce;
  fire({ temp: 'mint' }, 'span');          /* 万一还有人点到装饰 */
  const after2 = B.analyze().meltIce;
  const okMis = before2 === after2 && !B.state.temps.mint;
  console.log('  ' + (okMis ? '✅' : '❌') + ' 误点薄荷的温度：不会往状态里塞一个没用的温度');
  if (!okMis) bad('温度', '点装饰的温度仍然会改状态');

  /* 材料库：每个分类里的温度标签数，必须正好等于"有温度的材料"数。
     蛋清是个特例——它归在「点缀」里，但一次 15ml、是真会倒进杯子的液体，所以它有温度；
     柠檬皮、薄荷叶那些才是真装饰。用这条不变量兜住，比一个个列出来可靠。 */
  B.state.hideRisky = false;
  const cats = Array.from(new Set(global.__I.map(function (g) { return g.cat; })));
  const libBad = [];
  cats.forEach(function (c) {
    B.state.cat = c;
    B.load([]);
    const html = els['lib'].innerHTML;
    const got = (html.match(/class="tagtemp/g) || []).length;
    const want = global.__I.filter(function (g) { return g.cat === c && B.hasTemp(g); }).length;
    const shown = (html.match(/class="chip/g) || []).length;
    const total = global.__I.filter(function (g) { return g.cat === c; }).length;
    if (got !== want || shown !== total) libBad.push(c + '（标签 ' + got + '/' + want + '，材料 ' + shown + '/' + total + '）');
  });
  console.log('  ' + (libBad.length ? '❌' : '✅') + ' 材料库 ' + cats.length
    + ' 个分类里，温度标签的数量都对得上' + (libBad.length ? '：' + libBad.join('、') : ''));
  if (libBad.length) bad('温度', '材料库的温度标签数量对不上：' + libBad.join('、'));
  B.state.cat = 'sour';
})();

/* ---- 改温度必须真的改变结果：兑和看化水，摇和看加水量 ---- */
console.log('\n--- 改温度要真的有反应 ---');
(function () {
  /* 兑和 + 冰杯：可乐从冷藏改成常温，冰化出来的水必须变多 */
  B.state.glass = 'icecup'; B.state.iceLevel = 'full'; B.state.method = 'build';
  B.state.temps = {};
  B.load([['havana3', 45], ['coke', 100]]);
  const coldBefore = B.analyze();
  fire({ temp: 'coke' }, 'span');          /* 冷藏 → 常温 */
  const warmAfter = B.analyze();
  const ok1 = warmAfter.meltIce > coldBefore.meltIce;
  console.log('  ' + (ok1 ? '✅' : '❌') + ' 兑和：可乐 冷藏→常温，冰化的水 '
    + coldBefore.meltIce + 'ml → ' + warmAfter.meltIce + 'ml');
  if (!ok1) bad('温度', '改温度没有影响化水：' + coldBefore.meltIce + ' → ' + warmAfter.meltIce);

  /* 摇和：基酒从常温改成冷冻，摇壶加的水必须变少、酒精度变高 */
  B.state.temps = {};
  B.state.glass = 'coupe'; B.state.iceLevel = 'none'; B.state.method = 'shake';
  B.load([['tanqueray', 45], ['lemon', 20], ['syrup', 15]]);
  const room = B.analyze();
  fire({ temp: 'tanqueray' }, 'span');     /* 常温 → 冷冻 */
  const frozen = B.analyze();
  const ok2 = frozen.prepDil < room.prepDil - 0.5 && frozen.abv > room.abv;
  console.log('  ' + (ok2 ? '✅' : '❌') + ' 摇和：基酒 常温→冷冻，摇壶加的水 '
    + Math.round(room.prepDil) + 'ml → ' + Math.round(frozen.prepDil) + 'ml，酒精度 '
    + room.abv.toFixed(1) + '% → ' + frozen.abv.toFixed(1) + '%');
  if (!ok2) bad('温度', '摇和时改温度没有影响加水量');
  B.state.temps = {};

  /* 冷量：0 = 全常温，1 = 全冻透。这个数决定结构分里"够不够冰"那一项 */
  function coldOf(items, temps) {
    B.state.temps = temps || {};
    B.load(items);
    return B.analyze().cold;
  }
  const ginT = [['tanqueray', 45], ['tonic', 120]];
  const c0 = coldOf(ginT, { tanqueray: 'room', tonic: 'room' });
  const c1 = coldOf(ginT, { tanqueray: 'frozen', tonic: 'frozen' });
  const ok3 = c0 < 0.05 && c1 > 0.95;
  console.log('  ' + (ok3 ? '✅' : '❌') + ' 冷量：全常温 ' + c0.toFixed(2) + '，全冷冻 ' + c1.toFixed(2));
  if (!ok3) bad('温度', '冷量算错了：' + c0.toFixed(2) + ' / ' + c1.toFixed(2));
  B.state.temps = {};
})();

/* ---- 冷冻基酒做烈酒向的酒，必须真的更好（结构分 + 加水更少）---- */
console.log('\n--- 冷冻基酒 vs 常温基酒（马天尼）---');
(function () {
  const mj = [['tanqueray', 60], ['dry_vermouth', 10], ['orange_bitters', 1]];
  function martini(temps) {
    B.state.glass = 'coupe'; B.state.iceLevel = 'none'; B.state.method = 'stir';
    B.state.taste = 'strong'; B.state.scheme = 'balanced'; B.state.temps = temps;
    B.load(mj);
    const a = B.analyze(), s = B.scores();
    return { a: a, s: s, tips: B.advise(a).map(function (x) { return x.text; }).join(' ') };
  }
  const room = martini({});
  const froz = martini({ tanqueray: 'frozen' });
  console.log('  常温金酒：加水 ' + Math.round(room.a.prepDil) + 'ml　' + room.a.abv.toFixed(1)
    + '%　结构 ' + room.s.structure.toFixed(0) + '　总分 ' + room.s.total.toFixed(1));
  console.log('  冷冻金酒：加水 ' + Math.round(froz.a.prepDil) + 'ml　' + froz.a.abv.toFixed(1)
    + '%　结构 ' + froz.s.structure.toFixed(0) + '　总分 ' + froz.s.total.toFixed(1));
  const ok = froz.a.prepDil < room.a.prepDil - 3 && froz.s.structure > room.s.structure
    && froz.s.total > room.s.total;
  console.log('  ' + (ok ? '✅' : '❌') + ' 冷冻基酒：加水更少，结构分和总分都更高');
  if (!ok) bad('温度', '冷冻基酒没有体现出优势');
  const told = /冷冻/.test(room.tips) && /冷冻/.test(froz.tips);
  console.log('  ' + (told ? '✅' : '❌') + ' 两种情况都有一句话解释这件事');
  if (!told) bad('温度', '建议里没解释基酒温度这件事');
  B.state.temps = {};
})();

/* ---- 这次补的材料：查得到、度数是规规矩矩的 ---- */
console.log('\n--- 补的材料 ---');
(function () {
  const want = [
    ['malibu', '马利宝', 21],
    ['botanist', '植物学家', 46],
    ['nordes', '诺迪斯', 40],
    ['monkey47', '猴王47', 47],
    ['roku', '六金酒', 43]
  ];
  want.forEach(function (w) {
    const g = B.BY_ID[w[0]];
    const ok = g && g.name.indexOf(w[1]) >= 0 && Math.abs(g.abv - w[2]) < 0.05;
    console.log('  ' + (ok ? '✅' : '❌') + ' ' + (g ? g.name + '　' + g.abv + '%' : w[0] + ' 没找到'));
    if (!ok) bad('材料', '没查到这个材料的正确数据：' + w[0]);
  });
  console.log('  ✅ 金酒 ' + global.__I.filter(function (g) { return g.cat === 'gin'; }).length
    + ' 瓶，材料一共 ' + global.__I.length + ' 样');
})();

/* ---- 三种模式：鸡尾酒评分 / 纯饮描述 / 单独一样材料不算酒 ---- */
console.log('\n--- 三种模式 ---');
(function () {
  const cases = [
    ['45ml 纯可乐（找麻烦）', [['coke', 45]], 'shot', 'none', 'single'],
    ['45ml 纯苏打水', [['soda', 90]], 'highball', 'full', 'single'],
    ['45ml 纯橙汁', [['orange_juice', 60]], 'highball', 'full', 'single'],
    ['45ml 麦卡伦（纯饮）', [['macallan', 45]], 'shot', 'none', 'neat'],
    ['威士忌可乐', [['bourbon', 45], ['coke', 100]], 'icecup', 'full', 'cocktail'],
    ['三样材料的无酒精特调', [['orange_juice', 60], ['soda', 90], ['syrup', 15]], 'highball', 'full', 'cocktail'],
    ['锈钉（两样都是酒）', [['jw_black', 45], ['drambuie', 20]], 'rocks', 'full', 'cocktail']
  ];
  const NAMES = { single: '不是酒', neat: '纯饮', cocktail: '鸡尾酒' };
  cases.forEach(function (c) {
    B.state.glass = c[2]; B.state.iceLevel = c[3];
    B.state.taste = 'normal'; B.state.scheme = 'balanced';
    B.load(c[1]);
    const a = B.analyze();
    const got = a.singleSoft ? 'single' : (a.neatPour ? 'neat' : 'cocktail');
    const ok = got === c[4];
    console.log('  ' + (ok ? '✅' : '❌') + ' ' + c[0].padEnd(22) + '判定 ' + NAMES[got]
      + '（预期 ' + NAMES[c[4]] + '）');
    if (!ok) bad('模式', c[0] + ' 被判成 ' + NAMES[got] + '，应该是 ' + NAMES[c[4]]);
  });
})();

/* ---- 酒精度：纯饮必须等于原瓶度数 ---- */
console.log('\n--- 酒精度 ---');
(function () {
  ['bourbon', 'macallan', 'wild_turkey', 'glenfiddich', 'soju'].forEach(function (id) {
    const g = global.__I.find(function (x) { return x.id === id; });
    if (!g) return;
    B.state.glass = 'shot'; B.state.iceLevel = 'none';
    B.state.taste = 'strong'; B.state.scheme = 'balanced';
    B.load([[id, 45]]);
    const a = B.analyze();
    const ok = Math.abs(a.abv - g.abv) < 0.05;
    console.log('  ' + (ok ? '✅' : '❌') + ' ' + g.name.padEnd(20) + '原瓶 ' + g.abv
      + '%　纯饮算出 ' + a.abv.toFixed(1) + '%');
    if (!ok) bad('酒精度', g.name + ' 纯饮算成 ' + a.abv.toFixed(1) + '%，应该等于原瓶的 ' + g.abv + '%');
  });
  const cases = [
    /* 做法必须一起给：马天尼是搅拌出来的（约 20% 水），高球是现调，酸要摇 */
    ['干马天尼', [['tanqueray', 60], ['dry_vermouth', 10], ['orange_bitters', 1]], 'coupe', 'none', 'stir', 30, 40],
    ['威士忌高球', [['kakubin', 45], ['soda', 120], ['lemon_peel', 1]], 'highball', 'full', 'build', 8, 13],
    ['威士忌酸', [['bourbon', 45], ['lemon', 20], ['syrup', 15], ['egg_white', 15]], 'rocks', 'full', 'shake', 13, 21]
  ];
  cases.forEach(function (c) {
    B.state.glass = c[2]; B.state.iceLevel = c[3];
    B.state.method = c[4];
    B.state.taste = 'normal'; B.state.scheme = 'balanced';
    B.load(c[1]);
    const v = B.analyze().abv;
    const ok = v >= c[5] && v <= c[6];
    console.log('  ' + (ok ? '✅' : '❌') + ' ' + c[0].padEnd(20) + '算出 ' + v.toFixed(1)
      + '%　（合理区间 ' + c[5] + '-' + c[6] + '%）');
    if (!ok) bad('酒精度', c[0] + ' 的酒精度 ' + v.toFixed(1) + '% 不在合理区间');
  });
})();

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

/* ---- 汇总 ---- */
/* ---- 操作说明：用户反馈"没人知道「常温」和「40%」能点" ---- */
console.log('\n--- 操作说明（页面里有没有教怎么用）---');
(function () {
  const html = fs.readFileSync(path.join(dir, 'dev.html'), 'utf8');
  const need = [
    ['「怎么用」这一块', /怎么用 · 30 秒看完/],
    ['温度按钮怎么点', /「常温」＝ 温度/],
    ['度数按钮怎么点', /「40%」＝ 酒精度/],
    ['三个温度都写了数值', /冷冻 -18℃/],
    ['杯子那栏的常驻提示', /cuphint/],
    ['四个开关都解释了', /做法<\/b>（兑和 Build/],
    ['纯饮不评分也说了', /只有一样酒<\/b>（比如纯饮一杯威士忌）时不评分/]
  ];
  need.forEach(function (n) {
    const ok = n[1].test(html);
    console.log('  ' + (ok ? '✅' : '❌') + ' ' + n[0]);
    if (!ok) bad('操作说明', '页面里少了：' + n[0]);
  });
})();

/* ---- 统计：加了百度统计，但只能加这一个外部请求，而且本地文件不能上报 ---- */
console.log('\n--- 访问统计 ---');
(function () {
  const html = fs.readFileSync(path.join(dir, 'dev.html'), 'utf8');
  const id = html.match(/hm\.baidu\.com\/hm\.js\?([0-9a-f]{32})/);
  console.log('  ' + (id ? '✅' : '❌') + ' dev.html 里有百度统计代码' + (id ? '（ID ' + id[1].slice(0, 8) + '…）' : ''));
  if (!id) bad('统计', 'dev.html 里没有百度统计代码');

  const guard = /location\.protocol/.test(html) && /document\.createElement/.test(html);
  console.log('  ' + (guard ? '✅' : '❌') + ' 只在 http(s) 下上报：本地双击打开的 html 不计入访问量');
  if (!guard) bad('统计', '统计代码没有做协议判断，本地文件也会上报');

  /* 页面里说的和 README 里写的不能互相矛盾 */
  const readme = fs.readFileSync(path.join(dir, 'README.md'), 'utf8');
  const okReadme = readme.indexOf('不收集任何数据') < 0 && readme.indexOf('百度统计') >= 0;
  console.log('  ' + (okReadme ? '✅' : '❌') + ' README 不再声称"不收集任何数据"，并说明了统计范围');
  if (!okReadme) bad('统计', 'README 和实际行为对不上：要么还写着不收集数据，要么没提统计');

  const told = /百度统计/.test(html) && /调了什么酒/.test(html);
  console.log('  ' + (told ? '✅' : '❌') + ' 页面自己也说明了：只统计访问量，不记录调了什么');
  if (!told) bad('统计', '页面里没有告诉用户这件事');
})();

console.log('\n================ 自检结果 ================');
if (PROBLEMS.length) {
  console.log('❌ ' + PROBLEMS.length + ' 项没通过：');
  PROBLEMS.forEach(function (p) { console.log('   · ' + p); });
  process.exitCode = 1;
} else {
  console.log('✅ 全部检查通过');
}
