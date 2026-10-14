/* 自检脚本：改了 data.js 之后，跑 `node self-check.js` 看看配方分数有没有跑偏 */
const fs = require('fs');
const path = require('path');
const dir = __dirname;

global.window = global;
const els = {};
/* 一个真的会记事的 classList——页面切换就是靠它判断的 */
function mkClassList() {
  const set = new Set();
  return {
    _set: set,
    toggle(n, on) {
      const v = on === undefined ? !set.has(n) : !!on;
      if (v) set.add(n); else set.delete(n);
      return v;
    },
    add(n) { set.add(n); },
    remove(n) { set.delete(n); },
    contains(n) { return set.has(n); }
  };
}
global.document = {
  getElementById(id) {
    if (!els[id]) els[id] = { innerHTML: '', textContent: '', hidden: false, dataset: {},
      setAttribute() {}, addEventListener() {}, scrollIntoView() {}, closest() { return null; },
      classList: mkClassList() };
    return els[id];
  },
  /* 把 click 处理器存下来，测试里可以真的模拟一次点击 */
  _handlers: {},
  addEventListener(type, fn) { this._handlers[type] = fn; },
  /* 主题要在 <html> 上挂属性，这里给个最小的替身 */
  documentElement: {
    _a: {},
    getAttribute(n) { return this._a[n] === undefined ? null : this._a[n]; },
    setAttribute(n, v) { this._a[n] = String(v); },
    removeAttribute(n) { delete this._a[n]; }
  },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  body: { classList: mkClassList() }
};
/* 主题和"手边有什么"的选择都存在本地，测试里给个内存版 */
/* 启动地址栏：给一条带配方码的网址，验证"扫码/点链接就直接装杯"这条路 */
global.location = { search: '?r=BM1-rocks-full-build-bourbon.45-coke.150', hash: '' };
global.localStorage = {
  _d: {},
  getItem(k) { return this._d[k] === undefined ? null : this._d[k]; },
  setItem(k, v) { this._d[k] = String(v); },
  removeItem(k) { delete this._d[k]; }
};

const src = fs.readFileSync(path.join(dir, 'data.js'), 'utf8') + '\n' +
            fs.readFileSync(path.join(dir, 'ref-recipes.js'), 'utf8') + '\n' +
            fs.readFileSync(path.join(dir, 'qrcode.js'), 'utf8') + '\n' +
            fs.readFileSync(path.join(dir, 'app.js'), 'utf8') + '\n' +
            'global.__PRESETS = PRESETS; global.__I = INGREDIENTS; global.__PH = PH; global.__SCHEMES = SCORING_SCHEMES; global.__G = GLASSES; global.__PM = PRESET_METHOD;'
            + ' global.__TEMPS = TEMPS; global.__TD = TEMP_DEFAULT; global.__TF = TEMP; global.__TC = TEMP_CYCLE;'
            + ' global.__METHODS = METHODS; global.__REF = REF_RECIPES; global.__CATS = CATS;'
            + ' global.__OPT = OPTIONAL_ING; global.__HOUSE = HOUSE_PRESETS;'
            + ' global.__MAP = REF_PRESET_MAP; global.__SWAP = SWAP_NOTE;'
            + ' global.__ORIGIN = ORIGIN; global.__PICKLINE = PICK_LINE;';
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
/* ---- 启动时地址栏里带着配方码：必须已经把那杯装好了 ---- */
console.log('\n--- 带配方码的网址（?r=…）---');
(function () {
  const boot = [...B.state.cup.entries()];
  const ok = boot.length === 2 && boot[0][0] === 'bourbon' && boot[0][1] === 45
    && boot[1][0] === 'coke' && boot[1][1] === 150
    && B.state.glass === 'rocks' && B.state.iceLevel === 'full' && B.state.method === 'build'
    && B.page.current() === 'bar';
  console.log('  ' + (ok ? '✅' : '❌') + ' 打开 ?r=… 就直接装出那一杯并停在调酒台：'
    + JSON.stringify(boot));
  if (!ok) bad('配方码', '网址里带的配方码没有自动装杯：' + JSON.stringify(boot));
  B.load([]);
})();

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
  const idx = global.__PRESETS.findIndex(function (p) { return p.name === '干马天尼'; });
  function martini(temps) {
    B.state.scheme = 'balanced'; B.state.temps = temps;
    B.preset(idx);                 /* 走和用户点卡片一样的路：顺带把口味也设好 */
    const a = B.analyze(), s = B.scores();
    return { a: a, s: s, taste: B.state.taste,
             tips: B.advise(a).map(function (x) { return x.text; }).join(' ') };
  }
  const room = martini({});
  const froz = martini({ tanqueray: 'frozen' });
  console.log('  点配方自带的口味：' + room.taste + '（马天尼 35% 该配「浓烈」）');
  console.log('  常温金酒：加水 ' + Math.round(room.a.prepDil) + 'ml　' + room.a.abv.toFixed(1)
    + '%　结构 ' + room.s.structure.toFixed(0) + '　总分 ' + room.s.total.toFixed(1));
  console.log('  冷冻金酒：加水 ' + Math.round(froz.a.prepDil) + 'ml　' + froz.a.abv.toFixed(1)
    + '%　结构 ' + froz.s.structure.toFixed(0) + '　总分 ' + froz.s.total.toFixed(1));
  const ok = froz.a.prepDil < room.a.prepDil - 3 && froz.s.structure > room.s.structure
    && froz.s.total > room.s.total;
  console.log('  ' + (ok ? '✅' : '❌') + ' 冷冻基酒：加水更少，结构分和总分都更高（用户说过：常温不能比冷冻高）');
  if (!ok) bad('温度', '冷冻基酒没有体现出优势');
  if (room.taste !== 'strong') bad('评分', '点马天尼没有自动配好口味：' + room.taste);
  const told = /冷冻/.test(room.tips) && /冷冻/.test(froz.tips);
  console.log('  ' + (told ? '✅' : '❌') + ' 两种情况都有一句话解释这件事');
  if (!told) bad('温度', '建议里没解释基酒温度这件事');
  B.state.temps = {};
})();

/* ---- 点配方要顺手把「口味」也配好（不然点马天尼一进来就被判"太烈"）---- */
console.log('\n--- 点配方自动配口味 ---');
(function () {
  const cases = [['干马天尼', 'strong'], ['金汤力', 'normal'], ['养乐多烧酒', 'light'], ['威士忌酸', 'normal']];
  cases.forEach(function (c) {
    const i = global.__PRESETS.findIndex(function (p) { return p.name === c[0]; });
    B.state.taste = 'normal'; B.state.temps = {}; B.state.scheme = 'balanced';
    B.preset(i);
    const got = B.state.taste, abv = B.analyze().abv;
    const ok = got === c[1];
    console.log('  ' + (ok ? '✅' : '❌') + ' ' + c[0] + '（' + abv.toFixed(1) + '%）→ ' + got
      + (ok ? '' : '（预期 ' + c[1] + '）'));
    if (!ok) bad('评分', '点 ' + c[0] + ' 应该把口味设成 ' + c[1] + '，现在是 ' + got);
  });
})();

/* ---- "这杯没经过冰"这句话不能乱说：滤冰出品的酒也做过冰 ---- */
console.log('\n--- "没经过冰"什么时候才该说 ---');
(function () {
  function tips(items, glass, ice, method) {
    B.state.glass = glass; B.state.iceLevel = ice; B.state.method = method;
    B.state.taste = 'normal'; B.state.temps = {}; B.state.scheme = 'balanced';
    B.load(items);
    return B.advise(B.analyze()).map(function (x) { return x.text; }).join(' ');
  }
  const stirred = tips([['tanqueray', 60], ['dry_vermouth', 10]], 'coupe', 'none', 'stir');
  const noIce = tips([['jw_black', 45], ['soda', 60]], 'highball', 'none', 'build');
  const okA = stirred.indexOf('没碰过冰') < 0;
  const okB = noIce.indexOf('没碰过冰') >= 0;
  console.log('  ' + (okA ? '✅' : '❌') + ' 搅拌后滤进马天尼杯：不说"没经过冰"（它是搅拌出来的）');
  console.log('  ' + (okB ? '✅' : '❌') + ' 兑和 + 不放冰：才说"这杯从头到尾没碰过冰"');
  if (!okA) bad('文案', '把搅拌出来的酒说成"没有冰/没经过冰"了');
  if (!okB) bad('文案', '真的没碰过冰的酒反而不提醒了');
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

/* 回归检查：每个面板都必须在启动时渲染出内容，防空面板。
   （"经典配方"面板已经从调酒台搬去酒单的「住处特调」栏，这里不再有它） */
const panels = { cats: '分类', lib: '材料库', stats: '参数', subScores: '子评分' };
let empty = [];
Object.keys(panels).forEach(function (k) {
  if (!els[k] || !String(els[k].innerHTML).trim()) empty.push(panels[k]);
});
console.log('\n--- 面板渲染检查 ---');
console.log(empty.length ? '❌ 空白面板：' + empty.join('、') : '✅ 所有面板都渲染出了内容');

/* 「住处特调」栏的 11 张卡片（原来挂在调酒台的那块） */
B.menu.setTab('house');
const houseHtml = els.menuList.innerHTML;
const houseCards = [...houseHtml.matchAll(/<span class="p-name">([^<]*)<\/span><span class="p-sub">([^<]*)<\/span><span class="p-comp">([^<]*)<\/span>/g)];
console.log('\n===== 住处特调（酒单里） =====');
houseCards.forEach(c => console.log('  ' + c[1] + '  →  ' + c[3]));
const okHouse = houseCards.length === global.__HOUSE.length;
console.log((okHouse ? '✅' : '❌') + ' 共 ' + houseCards.length + ' 张（预期 ' + global.__HOUSE.length + '）');
if (!okHouse) bad('酒单', '住处特调栏的卡片数不对：' + houseCards.length);
B.menu.reset();

/* ---- ④ 手边有什么：反向查配方 ---- */
console.log('\n--- 手边有什么 → 现在能做什么 ---');
(function () {
  const strip = s => String(s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const R = global.__REF;
  console.log('  参考配方 ' + R.length + ' 份，推荐 ' + R.filter(r => r.pick).length + ' 份');

  /* 一份都没勾的时候，右边应该是引导语，不是空的 */
  B.have.reset();
  const empty = strip(els.haveOut.innerHTML);
  const ok0 = empty.indexOf('现在就能做') >= 0 && empty.indexOf('还缺') >= 0;
  console.log('  ' + (ok0 ? '✅' : '❌') + ' 什么都没勾：给出引导（' + empty.slice(0, 24) + '…）');
  if (!ok0) bad('手边有什么', '没勾材料时右边没有引导语');

  /* 左边改成"分类标签 + 九宫格"了：每个分类里画出来的卡片数，必须和库里那个分类的数量一样 */
  const catBad = [];
  global.__CATS.forEach(function (c) {
    B.have.setCat(c.id);
    const got = (els.haveList.innerHTML.match(/data-have="/g) || []).length;
    const want = global.__I.filter(function (g) { return g.cat === c.id; }).length;
    if (got !== want) catBad.push(c.name + ' ' + got + '/' + want);
  });
  const catTabs = (els.haveCats.innerHTML.match(/data-havecat="/g) || []).length;
  const okRows = catBad.length === 0 && catTabs === global.__CATS.length;
  console.log('  ' + (okRows ? '✅' : '❌') + ' 左边 ' + catTabs + ' 个分类标签，每个分类的材料数都对得上（共 '
    + global.__I.length + ' 样）' + (catBad.length ? '：' + catBad.join('、') : ''));
  if (!okRows) bad('手边有什么', '分类里的材料数对不上：' + catBad.join('、'));
  B.have.setCat('rum');
  B.have.reset();

  /* 只勾一瓶白朗姆：自由古巴要出现，并写明还缺哪两样 */
  B.have.toggle('rum');
  const out1 = strip(els.haveOut.innerHTML);
  const freeIdx0 = R.findIndex(r => r.zh === '自由古巴');
  const miss0 = B.have.missing(freeIdx0).join('、');
  const ok1 = out1.indexOf('还缺 2 种') >= 0 && miss0 === '可乐、青柠汁';
  console.log('  ' + (ok1 ? '✅' : '❌') + ' 只勾白朗姆：自由古巴"还缺 2 种：' + miss0 + '"');
  if (!ok1) bad('手边有什么', '勾了白朗姆之后自由古巴缺的东西算错了：' + miss0);

  /* 补上可乐和青柠 → 自由古巴应该变成"现在就能做" */
  B.have.toggle('coke'); B.have.toggle('lime');
  const out2 = els.haveOut.innerHTML;
  const card = out2.match(/<button[^>]*data-ref="(\d+)"[^>]*>[\s\S]*?<\/button>/g) || [];
  const free = card.find(c => c.indexOf('自由古巴') >= 0);
  const ok2 = !!free && free.indexOf('refcard done') >= 0 && free.indexOf('材料齐了') >= 0;
  console.log('  ' + (ok2 ? '✅' : '❌') + ' 补上可乐和青柠：自由古巴变成"材料齐了，现在就能做"');
  if (!ok2) bad('手边有什么', '材料齐了之后没有标成"现在就能做"');

  /* 点它 → 按标准配方装进杯子 */
  const idx = R.findIndex(r => r.zh === '自由古巴');
  B.have.load(idx);
  const a = B.analyze();
  const cup = Array.from(B.state.cup.keys());
  const ok3 = cup.indexOf('rum') >= 0 && cup.indexOf('coke') >= 0 && cup.indexOf('lime') >= 0
    && B.state.cup.get('coke') === 120 && B.state.method === 'build';
  console.log('  ' + (ok3 ? '✅' : '❌') + ' 点自由古巴：装进杯子 ' + cup.join('+')
    + '（可乐 ' + B.state.cup.get('coke') + 'ml，做法 ' + B.state.method + '，' + a.abv.toFixed(1) + '%）');
  if (!ok3) bad('手边有什么', '点配方没有正确装杯：' + JSON.stringify(cup));

  /* 来源和缺什么要写在杯子下面 */
  const note = strip(els.recipeNote.innerHTML);
  const ok4 = note.indexOf('自由古巴') >= 0 && note.indexOf('Cuba Libre') >= 0;
  console.log('  ' + (ok4 ? '✅' : '❌') + ' 杯子下面写着这杯的来源和备注：' + note.slice(0, 34) + '…');
  if (!ok4) bad('手边有什么', '没有写明这杯是从哪条配方来的');

  /* 自己动手改一杯 → 来源提示要消失（不然会误导） */
  B.state.cup.clear();
  B.state.cup.set('gin', 45);
  fire({ add: 'tonic' });
  const note2 = strip(els.recipeNote.innerHTML);
  console.log('  ' + (note2 === '' ? '✅' : '❌') + ' 自己加了别的材料：来源提示自动消失');
  if (note2 !== '') bad('手边有什么', '自己改了杯子之后还留着"来自某配方"');

  /* 量的换算 */
  const P = B.have.parse;
  const cases = [['45ml', 'lemon', 45], ['2dash', 'angostura', 2], ['3片', 'mint', 3],
    ['一个', 'egg_white', 15], ['15g', 'butter', 15], ['5颗', 'cherry', 5]];
  const bad4 = cases.filter(c => Math.abs(P(c[0], B.BY_ID[c[1]]) - c[2]) > 0.01);
  console.log('  ' + (bad4.length ? '❌' : '✅') + ' 用量换算 6 种写法都对'
    + (bad4.length ? '（错的：' + bad4.map(c => c[0]).join('、') + '）' : ''));
  if (bad4.length) bad('手边有什么', '用量换算不对：' + bad4.map(c => c[0]).join('、'));

  /* 191 份里不许出现"对不上的需求" */
  const kinds = R.every(r => r.needs.every(nd => nd.need.id || nd.need.cat || nd.need.ids
    || nd.need.type || nd.need.family));
  console.log('  ' + (kinds ? '✅' : '❌') + ' 191 份配方里的每一条需求都指向了库里的材料');
  if (!kinds) bad('手边有什么', '有需求的 kind 认不出来');

  B.have.reset();
})();

/* ---- 类型：谁跟谁能替（用户逐条定的规则）---- */
console.log('\n--- 类型：同组能替要标注，不能替就算缺 ---');
(function () {
  const strip = s => String(s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const R = global.__REF;
  const cardOf = (name) => (els.haveOut.innerHTML.match(/<button[^>]*class="refcard[^"]*"[^>]*>[\s\S]*?<\/button>/g) || [])
    .find(c => c.indexOf('>' + name + '<') >= 0 || c.indexOf(name) >= 0);
  const martini = R.findIndex(r => r.zh === '马天尼');

  /* 1. 干金是一个家族（伦敦干金 + 现代干金）：植物学家算"有"，而且不用标注——
        因为配方只要"干金"，不挑风格。以前会把"季之美"这种配料名当成要求，多出没用的标注。 */
  B.have.reset();
  B.have.toggle('botanist'); B.have.toggle('dry_vermouth');
  const miss1 = B.have.missingLabel(martini);
  const card1 = cardOf('马天尼') || '';
  const ok1 = miss1.indexOf('干金酒') < 0 && card1.indexOf('用上你的') >= 0
    && card1.indexOf('植物学家') >= 0 && card1.indexOf('风味会不一样') < 0;
  console.log('  ' + (ok1 ? '✅' : '❌') + ' 植物学家金酒算干金：算有，不用标注'
    + '（还缺：' + miss1.join('、') + '）');
  if (!ok1) bad('类型', '现代干金没有被算进干金家族');

  /* 2. 老汤姆 → 不能替，算缺，并说明"不在这一类" */
  B.have.reset();
  B.have.toggle('old_tom'); B.have.toggle('dry_vermouth');
  const miss2 = B.have.missingLabel(martini);
  const card2 = cardOf('马天尼') || '';
  const ok2 = miss2.indexOf('干金酒') >= 0 && card2.indexOf('不在这一类') >= 0;
  console.log('  ' + (ok2 ? '✅' : '❌') + ' 老汤姆：算缺（还缺：' + miss2.join('、') + '），并说明"你的老汤姆金酒不在这一类"');
  if (!ok2) bad('类型', '老汤姆替干金没有被判成缺');

  /* 2b. 威士忌反过来：跨风格能替，但必须标注（用户原话） */
  B.have.reset();
  /* 苏格兰 + 其它几样，让这杯够得着（缺 ≤2 才会画出来） */
  ['jw_black', 'lemon', 'syrup', 'angostura'].forEach(function (id) { B.have.toggle(id); });
  const sour = R.findIndex(r => r.zh === '威士忌酸');
  const missW = B.have.missingLabel(sour);
  const cardW = cardOf('威士忌酸') || '';
  const okW = missW.indexOf('波本威士忌') < 0 && cardW.indexOf('风味会不一样') >= 0
    && cardW.indexOf('波本威士忌') >= 0;
  console.log('  ' + (okW ? '✅' : '❌') + ' 苏格兰替波本做威士忌酸：算有，但标注"配方一般是波本威士忌，风味会不一样"');
  if (!okW) bad('类型', '威士忌跨风格的替换没有标注');

  /* 2c. 白朗姆替不了黑朗姆（用户说不能） */
  B.have.reset();
  B.have.toggle('rum');               /* 百加得白朗姆 */
  const dark = R.findIndex(r => r.zh === '黑夜风暴');
  const missD = B.have.missingLabel(dark);
  console.log('  ' + (missD.indexOf('黑朗姆') >= 0 ? '✅' : '❌')
    + ' 只有白朗姆：黑朗姆那杯仍然算缺（还缺：' + missD.join('、') + '）');
  if (missD.indexOf('黑朗姆') < 0) bad('类型', '白朗姆被当成了黑朗姆');

  /* 3. 白朗姆是按类型认的：勾哈瓦那3年，自由古巴就认账 */
  B.have.reset(); B.have.toggle('havana3');
  const cuba = R.findIndex(r => r.zh === '自由古巴');
  const miss3 = B.have.missingLabel(cuba);
  const ok3 = miss3.join('、') === '可乐、鲜青柠汁';
  console.log('  ' + (ok3 ? '✅' : '❌') + ' 勾哈瓦那3年：自由古巴还缺「' + miss3.join('、') + '」'
    + '（不再说缺白朗姆）');
  if (!ok3) bad('类型', '白朗姆没有按类型认账：' + miss3.join('、'));

  /* 4. 卡莎莎不算"朗姆酒" */
  B.have.reset(); B.have.toggle('cachaca');
  const rumRec = R.findIndex(r => r.needs.some(nd => nd.need.family === 'rum'));
  const miss4 = B.have.missingLabel(rumRec);
  console.log('  ' + (miss4.indexOf('朗姆酒') >= 0 ? '✅' : '❌')
    + ' 只有卡莎莎：配方要"朗姆酒"时仍然算缺（还缺：' + miss4.join('、') + '）');
  if (miss4.indexOf('朗姆酒') < 0) bad('类型', '卡莎莎被当成了朗姆酒');

  /* 5. 硬门槛：勾了金酒，不该冒出教父这种跟金酒无关的 */
  B.have.reset(); B.have.toggle('gin');
  const html5 = els.haveOut.innerHTML;
  const ok5 = html5.indexOf('教父') < 0 && html5.indexOf('马天尼') >= 0;
  console.log('  ' + (ok5 ? '✅' : '❌') + ' 只勾金酒：不再推荐教父，只推用得上金酒的');
  if (!ok5) bad('手边有什么', '还是推荐了跟勾选材料无关的配方');

  /* 6. 买单建议：只报类型，不报牌子 */
  B.have.reset(); B.have.toggle('orange_juice');
  const html6 = els.haveOut.innerHTML;
  const brand = ['绝对伏特加', '斯米诺', '添加利', '百加得', '美格', '轩尼诗'].filter(b => html6.indexOf(b) >= 0);
  const ok6 = html6.indexOf('先买哪一类酒最划算') >= 0 && html6.indexOf('伏特加') >= 0 && brand.length === 0;
  console.log('  ' + (ok6 ? '✅' : '❌') + ' 只勾橙汁：给出"先买哪一类酒"的建议，且不含品牌名'
    + (brand.length ? '（出现了：' + brand.join('、') + '）' : ''));
  if (!ok6) bad('手边有什么', '买单建议里出现了品牌，或者没给建议');

  /* 7. 排序：每个分组里，"用上你最多的"排前面 */
  B.have.reset();
  ['gin', 'lime', 'syrup', 'soda', 'coke'].forEach(id => B.have.toggle(id));
  const chunks = els.haveOut.innerHTML.split('<div class="refgroup">').slice(1);
  let orderBad = 0;
  chunks.forEach(chunk => {
    const ids = [...chunk.matchAll(/data-ref="(\d+)"/g)].map(m => +m[1]);
    const used = ids.map(i => B.have.used(i));
    for (let i = 1; i < used.length; i++) if (used[i] > used[i - 1]) orderBad++;
  });
  console.log('  ' + (orderBad === 0 ? '✅' : '❌') + ' 每个分组里都按"用上你几样"从多到少排');
  if (orderBad) bad('手边有什么', '排序没有按"用上你最多"来');

  B.have.reset();
})();

/* ---- 点缀和"口感"类不算缺（用户：威士忌酸带不带蛋清都能喝）---- */
console.log('\n--- 蛋清、柠檬片这类不算"还缺一样" ---');
(function () {
  const strip = s => String(s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const R = global.__REF;

  /* 不变量：装饰这一栏里的每一样，都必须在"可省"表里。
     用户在界面上看到的是"装饰"——它要是不算缺，表里就必须有它。
     以后往装饰栏加东西忘了同步，这条会报红。 */
  const deco = global.__I.filter(g => g.cat === 'garnish').map(g => g.id);
  const notOptional = deco.filter(id => !global.__OPT[id]);
  console.log('  ' + (notOptional.length ? '❌' : '✅') + ' 装饰栏 ' + deco.length
    + ' 样全都在"可省"表里' + (notOptional.length ? '，漏了：' + notOptional.join('、') : ''));
  if (notOptional.length) bad('可省', '装饰栏里这些没进可省表：' + notOptional.join('、'));

  /* 香料和黄瓜也按用户说的算可省；苦精、薄荷、姜仍然必需 */
  const optIds = ['clove', 'cinnamon_stick', 'star_anise', 'cardamom', 'black_pepper', 'cucumber', 'salt_water'];
  const notInOpt = optIds.filter(id => !global.__OPT[id]);
  const mustIds = ['angostura', 'orange_bitters', 'peychaud', 'mint', 'ginger_fresh'];
  const wronglyOpt = mustIds.filter(id => global.__OPT[id]);
  console.log('  ' + (notInOpt.length ? '❌' : '✅') + ' 香料、黄瓜、盐水都算可省');
  console.log('  ' + (wronglyOpt.length ? '❌' : '✅') + ' 苦精三兄弟、薄荷、生姜仍然算必需'
    + (wronglyOpt.length ? '（被误标：' + wronglyOpt.join('、') + '）' : ''));
  if (notInOpt.length) bad('可省', '这些该算可省的没进表：' + notInOpt.join('、'));
  if (wronglyOpt.length) bad('可省', '这些是骨架/主体，不该算可省：' + wronglyOpt.join('、'));

  B.have.reset();
  ['pisco', 'syrup', 'lime'].forEach(id => B.have.toggle(id));
  const i = R.findIndex(r => r.zh === '皮斯科酸');
  const miss = B.have.missing(i);
  const html = els.haveOut.innerHTML;
  const card = (html.match(/<button[^>]*class="refcard[^"]*"[^>]*>[\s\S]*?<\/button>/g) || [])
    .find(c => c.indexOf('皮斯科酸') >= 0);
  const ok = miss.length === 0 && !!card && card.indexOf('refcard done') >= 0
    && card.indexOf('可选：蛋白') >= 0;
  console.log('  ' + (ok ? '✅' : '❌') + ' 皮斯科酸配齐三样：判成"现在就能做"，蛋清写成"可选"'
    + '（缺 ' + miss.length + ' 样）');
  if (!ok) bad('手边有什么', '蛋清被当成缺一样了');
  B.have.reset();
})();

/* ---- 展开之后要能收回去 ---- */
console.log('\n--- 展开 / 收起 ---');
(function () {
  B.have.reset();
  /* 勾一批常见的，好让某一组的结果超过 8 条（不然没有"展开"按钮） */
  ['rum', 'coke', 'gin', 'lemon', 'lime', 'syrup', 'soda'].forEach(id => B.have.toggle(id));
  const before = els.haveOut.innerHTML;
  const hasMore = before.indexOf('data-havemore="2"') >= 0 && before.indexOf('展开剩下的') >= 0;
  fire({ havemore: '2' });
  const afterOpen = els.haveOut.innerHTML;
  const hasHide = afterOpen.indexOf('data-havemore="2"') >= 0 && afterOpen.indexOf('收起') >= 0;
  fire({ havemore: '2' });
  const afterClose = els.haveOut.innerHTML;
  const backToMore = afterClose.indexOf('展开剩下的') >= 0 && afterClose.indexOf('收起') < 0;
  console.log('  ' + (hasMore ? '✅' : '❌') + ' 结果多的那一组有「展开剩下的 N 款」');
  console.log('  ' + (hasHide ? '✅' : '❌') + ' 展开之后出现「收起」按钮');
  console.log('  ' + (backToMore ? '✅' : '❌') + ' 点收起能收回原样');
  if (!hasMore) bad('手边有什么', '没有展开按钮');
  if (!hasHide) bad('手边有什么', '展开之后没有收起按钮（用户提的）');
  if (!backToMore) bad('手边有什么', '点了收起没有收回去');
  B.have.reset();
})();

/* ---- 经典配方的备注挪到杯子下面 ---- */
console.log('\n--- 备注挪到杯子下面 ---');
(function () {
  const strip = s => String(s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const i = global.__PRESETS.findIndex(p => p.name === '威士忌酸');
  B.preset(i);
  const tip = global.__PRESETS[i].tip;
  const note = strip(els.recipeNote.innerHTML);
  /* 卡片上不再重复这段备注——现在卡片在酒单的「住处特调」栏里 */
  B.menu.setTab('house');
  const cardHtml = els.menuList.innerHTML;
  const ok1 = note.indexOf('威士忌酸') >= 0 && tip && note.indexOf(tip.slice(0, 12)) >= 0;
  const ok2 = cardHtml.indexOf('p-tip') < 0;
  B.menu.reset();
  console.log('  ' + (ok1 ? '✅' : '❌') + ' 点卡片后，备注显示在杯子下面：' + note.slice(0, 30) + '…');
  console.log('  ' + (ok2 ? '✅' : '❌') + ' 配方卡片上不再重复这段备注');
  if (!ok1) bad('版式', '备注没有显示到杯子下面');
  if (!ok2) bad('版式', '配方卡片上还留着备注');
  /* 自己动手改一杯 → 备注收起来 */
  B.state.cup.set('gin', 45);
  fire({ add: 'tonic' });
  const after = strip(els.recipeNote.innerHTML);
  console.log('  ' + (after === '' ? '✅' : '❌') + ' 自己改了杯子：备注自动收走');
  if (after !== '') bad('版式', '改了杯子之后还挂着别的配方备注');
})();

/* ---- 杯子那张图的说明已经搬进「怎么用」 ---- */
console.log('\n--- 图例搬进怎么用 ---');
(function () {
  const html = fs.readFileSync(path.join(dir, 'dev.html'), 'utf8');
  const inHowto = /杯子里的那张图怎么看/.test(html);
  const oldLine = /class="hint legendline"/.test(html);
  console.log('  ' + (inHowto ? '✅' : '❌') + ' 「怎么用」里有「杯子里的那张图怎么看」');
  console.log('  ' + (!oldLine ? '✅' : '❌') + ' ① 杯子里那行旧图例已经挪走');
  if (!inHowto) bad('版式', '怎么用里没有图例说明');
  if (oldLine) bad('版式', '① 里还留着旧的图例行');
})();

/* ---- 汇总 ---- */
/* ---- 酒单：经典 191 / 我的收藏 / 我的特调 ---- */
console.log('\n--- 酒单 ---');
(function () {
  const strip = s => String(s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  B.menu.reset();
  const all = B.menu.list();
  console.log('  ' + (all === global.__REF.length ? '✅' : '❌') + ' 经典一栏列出 ' + all + ' 款（参考数据 '
    + global.__REF.length + ' 款）');
  if (all !== global.__REF.length) bad('酒单', '经典一栏的数量不对：' + all);

  /* 筛选：只看金酒 */
  B.menu.setFam('gin');
  const ginN = B.menu.list();
  const ginHtml = els.menuList.innerHTML;
  const okGin = ginN > 0 && ginN < all && ginHtml.indexOf('金酒') >= 0;
  console.log('  ' + (okGin ? '✅' : '❌') + ' 按"金酒"筛：' + all + ' → ' + ginN + ' 款');
  if (!okGin) bad('酒单', '基酒筛选没生效');
    /* 筛选：只看清爽起泡 */
    B.menu.reset(); B.menu.setTaste('fizz');
    const fizzN = B.menu.list();
    console.log('  ' + (fizzN > 0 && fizzN < all ? '✅' : '❌') + ' 按"带气泡"筛：' + fizzN + ' 款');
    if (!(fizzN > 0 && fizzN < all)) bad('酒单', '味道筛选没生效');

    /* 清爽和气泡是两个口径：有人明确不喝带气的 */
    B.menu.reset(); B.menu.setTaste('fresh');
    const freshN = B.menu.list();
    console.log('  ' + (freshN > 0 && freshN < all ? '✅' : '❌') + ' 按"清爽"筛：' + freshN + ' 款');
    if (!(freshN > 0 && freshN < all)) bad('酒单', '"清爽"筛选没生效');

    /* 技法筛选：用户提的——"我没有摇壶，就只想看 stir 和 build"
       摇和（含 blended）要摇壶；搅拌（含 rolling）勺子就行；兑和、捣压、没写做法的不用器材。 */
    const NEED_SHAKER = { shake: 1, blended: 1 };
    const NOSH = { build: 1, stir: 1, smash: 1, rolling: 1, undefined: 1 };
    function byTech(t) {
      B.menu.reset();
      B.menu.setTech(t);
      return B.menu.listRefs();
    }
    B.menu.reset();
    const chipHtml = els.menuFilters.innerHTML;
    const chipN = (chipHtml.match(/data-menu-tech="/g) || []).length;
    const okChip = chipN === 5 && chipHtml.indexOf('不用摇壶') >= 0;
    console.log('  ' + (okChip ? '✅' : '❌') + ' 技法那一行有 ' + chipN + ' 个按钮：全部 / 兑和 / 搅拌 / 摇和 / 不用摇壶');
    if (!okChip) bad('酒单', '技法筛选那一行没画对（' + chipN + ' 个按钮）');

    const shakeList = byTech('shake');
    const stirList = byTech('stir');
    const buildList = byTech('build');
    const nosList = byTech('noshaker');
    const shakeBad = shakeList.filter(r => !NEED_SHAKER[r.method]);
    const stirBad = stirList.filter(r => r.method !== 'stir' && r.method !== 'rolling');
    const buildBad = buildList.filter(r => r.method === 'shake' || r.method === 'blended' || r.method === 'stir' || r.method === 'rolling');
    const nosBad = nosList.filter(r => NEED_SHAKER[r.method]);
    const sums = shakeList.length + stirList.length + buildList.length;
    console.log('  ' + (shakeBad.length ? '❌' : '✅') + ' 筛"摇和"：' + shakeList.length + ' 款，全是 shake/blended'
      + (shakeBad.length ? '，混进了 ' + shakeBad.slice(0, 2).map(r => r.zh).join('、') : ''));
    if (shakeBad.length) bad('酒单', '摇和筛选混进了别的技法：' + shakeBad.slice(0, 3).map(r => r.zh + '/' + r.method).join('、'));
    console.log('  ' + (stirBad.length ? '❌' : '✅') + ' 筛"搅拌"：' + stirList.length + ' 款，全是 stir/rolling');
    if (stirBad.length) bad('酒单', '搅拌筛选混进了别的技法：' + stirBad.slice(0, 3).map(r => r.zh + '/' + r.method).join('、'));
    console.log('  ' + (buildBad.length ? '❌' : '✅') + ' 筛"兑和"：' + buildList.length + ' 款，没有要摇、要搅的');
    if (buildBad.length) bad('酒单', '兑和筛选混进了摇/搅的酒：' + buildBad.slice(0, 3).map(r => r.zh + '/' + r.method).join('、'));
    console.log('  ' + (nosBad.length ? '❌' : '✅') + ' 筛"不用摇壶"：' + nosList.length + ' 款，一杯都不用摇'
      + '（= 兑和 ' + buildList.length + ' + 搅拌 ' + stirList.length + '）');
    if (nosBad.length) bad('酒单', '"不用摇壶"里出现了要摇壶的酒：' + nosBad.slice(0, 3).map(r => r.zh + '/' + r.method).join('、'));
    if (nosList.length !== buildList.length + stirList.length) bad('酒单', '"不用摇壶"的数量对不上：' + nosList.length);
    if (sums !== global.__REF.length) bad('酒单', '三种技法加起来不等于全部：' + sums + ' / ' + global.__REF.length);

    /* 卡片上要有技法标签，不然扫一眼看不出哪杯要摇壶 */
    B.menu.reset(); B.menu.setTech('shake');
    const tagHtml = els.menuList.innerHTML;
    const okTag = tagHtml.indexOf('mc-tech t-shake') >= 0;
    console.log('  ' + (okTag ? '✅' : '❌') + ' 卡片上带技法标签（点开前就知道要不要摇壶）');
    if (!okTag) bad('酒单', '卡片上没有技法标签');
    B.menu.reset();

    /* 香槟杯：参考本写"香槟杯"的那几款必须配到细长笛形 */
    const fluteBad = [];
    global.__REF.forEach(r => {
      if (!/香槟杯/.test(r.glass || '')) return;
      B.menu.open(global.__REF.indexOf(r));
      const txt = strip(els.menuDetail.innerHTML);
      if (txt.indexOf('香槟杯') < 0) fluteBad.push(r.zh || r.en);
    });
    console.log('  ' + (fluteBad.length ? '❌' : '✅') + ' 参考本写"香槟杯"的都装进香槟杯'
      + (fluteBad.length ? '：' + fluteBad.slice(0, 3).join('、') : ''));
    if (fluteBad.length) bad('酒单', '香槟类酒没配香槟杯：' + fluteBad.slice(0, 3).join('、'));

    /* 薄荷叶不该带气泡（data.js 里曾经写成 7，于是"薄荷朱丽普"和"绿蚱蜢"
       都被筛进"清爽起泡"，而真的加汽水的"莫斯科骡子"反倒进不去） */
    const okMint = B.BY_ID.mint && (B.BY_ID.mint.f.fizz || 0) === 0;
    console.log('  ' + (okMint ? '✅' : '❌') + ' 薄荷叶的气泡值是 0（它又不是汽水）');
    if (!okMint) bad('材料库', '薄荷叶带着气泡值，会把薄荷类的酒误判成"清爽起泡"');

    /* 这一维现在只认真碳酸，所以名字就叫「气泡」最直白：
       数值 = 碳酸带来的刺激有多强。不冒气的材料（黄瓜、冰红茶那些"清凉感"）走香料/醇厚。 */
    const dimFizz = B.dims.filter(d => d.k === 'fizz')[0];
    const okDimName = dimFizz && dimFizz.name === '气泡';
    console.log('  ' + (okDimName ? '✅' : '❌') + ' 雷达图这一维叫「气泡」（它现在只认真碳酸）');
    if (!okDimName) bad('材料库', 'fizz 这一维的名字不是"气泡"');

    const STILL = ['mint', 'cucumber', 'iced_tea', 'vitale', 'hendricks', 'egg_white'];
    const stillFizzy = STILL.filter(id => B.BY_ID[id] && (B.BY_ID[id].f.fizz || 0) > 0)
      .map(id => B.BY_ID[id].name);
    console.log('  ' + (stillFizzy.length ? '❌' : '✅')
      + ' 不冒气的材料杀口感是 0（薄荷叶/黄瓜/冰红茶/维他柠檬茶/亨利爵士/蛋清）'
      + (stillFizzy.length ? '：' + stillFizzy.join('、') : ''));
    if (stillFizzy.length) bad('材料库', '不冒气的材料带了杀口感：' + stillFizzy.join('、'));

    /* 筛出来"清爽起泡"的，杯里必须真的有带气的材料 */
    B.menu.reset(); B.menu.setTaste('fizz');    /* 上面切到"清爽"了，这里切回来再取名单 */
    const fizzIdx = (els.menuList.innerHTML.match(/data-menu="(\d+)"/g) || [])
      .map(s => +s.replace(/\D/g, ''));
    const noBubble = [];
    fizzIdx.forEach(i => {
      B.have.load(i);
      if (!B.analyze().hasFizzIng) noBubble.push(global.__REF[i].zh || global.__REF[i].en);
    });
    console.log('  ' + (noBubble.length ? '❌' : '✅')
      + ' 筛出来的"带气泡"每杯都有真带气的材料（' + fizzN + ' 款）'
      + (noBubble.length ? '，这几杯没有：' + noBubble.slice(0, 3).join('、') : ''));
    if (noBubble.length) bad('酒单', '没有气泡材料的酒被筛进了"带气泡"：' + noBubble.slice(0, 3).join('、'));

    /* 参考本里的"薄荷利口酒"是利口酒，不是那几片新鲜薄荷叶 */
    const mintBad = [];
    global.__REF.forEach(r => r.needs.forEach(nd => {
      if (nd.n.indexOf('薄荷利口酒') < 0) return;
      const id = nd.need.id || (nd.need.ids || [])[0] || '';
      if (id === 'mint') mintBad.push((r.zh || r.en) + '：' + nd.n);
    }));
    console.log('  ' + (mintBad.length ? '❌' : '✅') + ' 参考本的"薄荷利口酒"没被当成新鲜薄荷叶'
      + (mintBad.length ? '：' + mintBad.slice(0, 2).join('、') : ''));
    if (mintBad.length) bad('材料库', '"薄荷利口酒"配到了薄荷叶：' + mintBad.slice(0, 2).join('、'));

    B.menu.reset();

  /* 收藏：点星 → 进"我的收藏" */
  B.menu.fav('黑俄罗斯');
  B.menu.setTab('favs');
  const favsN = B.menu.list();
  const favHtml = els.menuList.innerHTML;
  const okFav = favsN === 1 && favHtml.indexOf('黑俄罗斯') >= 0;
  console.log('  ' + (okFav ? '✅' : '❌') + ' 收藏一杯：我的收藏出现 ' + favsN
    + ' 款，本地也存下了（' + JSON.stringify(global.localStorage.getItem('barmix.favs')) + '）');
  if (!okFav) bad('酒单', '收藏没有进"我的收藏"');
  B.menu.fav('黑俄罗斯');
  console.log('  ' + (B.menu.favs().length === 0 ? '✅' : '❌') + ' 再点一次取消收藏');
  if (B.menu.favs().length) bad('酒单', '取消收藏没生效');

  /* 我的特调：调酒台保存一杯 → 出现在酒单 */
  B.load([['gin', 45], ['tonic', 120], ['lime', 10]]);
  global.window.prompt = function () { return '我的第一杯'; };
  B.menu.save();
  B.menu.setTab('mine');
  const mineHtml = els.menuList.innerHTML;
  const okMine = B.menu.mine().length === 1 && B.menu.mine()[0] === '我的第一杯'
    && mineHtml.indexOf('我的第一杯') >= 0 && mineHtml.indexOf('装进杯子') >= 0;
  console.log('  ' + (okMine ? '✅' : '❌') + ' 调酒台「保存这杯」→ 我的特调里有「' + B.menu.mine()[0] + '」');
  if (!okMine) bad('酒单', '保存的配方没有出现在"我的特调"');
  /* 空杯子不让存 */
  global.window.alert = function () {};
  B.load([]);
  B.menu.save();
  console.log('  ' + (B.menu.mine().length === 1 ? '✅' : '❌') + ' 空杯子点保存：拦住，不存空配方');
  if (B.menu.mine().length !== 1) bad('酒单', '空杯子也能存进"我的特调"');

  /* 详情面板 */
  B.menu.reset();
  const idx = global.__REF.findIndex(r => r.zh === '尼格罗尼');
  B.menu.open(idx);
  const detail = strip(els.menuDetail.innerHTML);
  const okDetail = detail.indexOf('尼格罗尼') >= 0 && detail.indexOf('30ml') >= 0
    && detail.indexOf('装进杯子') >= 0 && detail.indexOf('来历') >= 0;
  console.log('  ' + (okDetail ? '✅' : '❌') + ' 详情面板：材料带用量、有装杯按钮、有来历那栏');
  if (!okDetail) bad('酒单', '详情面板内容不全：' + detail.slice(0, 60));

  /* "用户有权知道原方长什么样"——换过东西的必须能看到原文和替换理由 */
  const hit = global.__REF.findIndex(r => r.needs.some(nd => nd.need.approx));
  B.menu.open(hit);
  const dbg = strip(els.menuDetail.innerHTML);
  const okOrig = dbg.indexOf('原方长什么样') >= 0 && dbg.indexOf('我改过的地方') >= 0;
  console.log('  ' + (okOrig ? '✅' : '❌') + ' 有替换的那杯：详情里能展开看「原方」和「我改过的地方」（'
    + global.__REF[hit].zh + '）');
  if (!okOrig) bad('酒单', '详情里没有"原方 / 替换说明"');

  /* 真换了东西的（原方和替换名没有共同词）必须写理由 */
  const noNote = [];
  global.__REF.forEach(r => r.needs.forEach(nd => {
    if (!nd.need.approx) return;
    const a = String(nd.n).replace(/[（(].*?[）)]/g, ''), b = String(nd.n);
    const to = nd.need.id && B.BY_ID[nd.need.id] ? B.BY_ID[nd.need.id].name : '';
    if (!global.__SWAP[nd.n]) {
      /* 名字里有一半重合 = 只是写法不同，不算换东西 */
      const shared = to && (to.indexOf(a.slice(0, 2)) >= 0 || a.indexOf(to.slice(0, 2)) >= 0);
      if (!shared) noNote.push(nd.n + '→' + to);
    }
  }));
  console.log('  ' + (noNote.length ? '⚠ ' + noNote.length + ' 项换了东西但没写理由：'
    + noNote.slice(0, 5).join('、') : '✅ 换了东西的都写了理由'));

  /* 有本站配比的 33 款：详情里"差别"那栏写到的材料，必须是这份预设真有的东西。
     以前这里直接套用库里的通用替换理由，会出现"蔓越莓糖浆 → 白糖浆"和这句备注
     "蔓越莓汁本身够甜，不用再加糖浆"同时显示——自己跟自己打架。 */
  const badSwap = [];
  /* "干金酒"这种类型 / 家族名也算对得上——杯子里的哥顿本来就是干金酒 */
  const labelFits = (txt, ownIds, own) => {
    if (own.some(o => o.indexOf(txt) >= 0 || txt.indexOf(o.replace(/（.*?）/, '')) >= 0)) return true;
    const types = ownIds.map(id => DRINK_TYPE[id] || id);
    return Object.keys(FAMILY_NAME).some(f => FAMILY_NAME[f] === txt
        && (FAMILY_TYPES[f] || []).some(t => types.indexOf(t) >= 0))
      || Object.keys(TYPE_NAME).some(t => TYPE_NAME[t] === txt && types.indexOf(t) >= 0);
  };
  global.__REF.forEach((r, i) => {
    const nm = r.zh || r.en;
    const pi = global.__PRESETS.findIndex(p => p.name === global.__MAP[nm]);
    if (pi < 0) return;
    const ownIds = global.__PRESETS[pi].items.map(it => it[0]);
    const own = ownIds.map(id => (B.BY_ID[id] ? B.BY_ID[id].name : id));
    B.menu.open(i);
    const m = els.menuDetail.innerHTML.match(/<ul class="menulist swapnote">([\s\S]*?)<\/ul>/);
    if (!m) return;
    (m[1].match(/<b>[\s\S]*?<\/b>/g) || []).forEach(t => {
      const txt = t.replace(/<\/?b>/g, '')
        .replace(/[\d.]+\s*(ml|g|片|个|滴|根|把勺|块)?/g, '').trim();
      if (txt && !labelFits(txt, ownIds, own)) {
        badSwap.push(nm + '：' + txt + '（这杯只有 ' + own.join('、') + '）');
      }
    });
  });
  console.log('  ' + (badSwap.length ? '❌' : '✅') + ' 有本站配比的：差别栏提到的材料都真在这杯里'
    + (badSwap.length ? '（' + badSwap.length + ' 处对不上）' : ''));
  if (badSwap.length) bad('酒单', '差别栏提到了这杯没有的材料：' + badSwap.slice(0, 3).join('；'));

  /* 大都会这杯专门盯着：参考本里的蔓越莓糖浆本站没用，就不能再说"用白糖浆替" */
  B.menu.open(global.__REF.findIndex(r => r.zh === '大都会'));
  const cosmo = strip(els.menuDetail.innerHTML);
  const okCosmo = cosmo.indexOf('蔓越莓糖浆') >= 0 && cosmo.indexOf('这杯没放') >= 0
    && cosmo.indexOf('用白糖浆 + 蔓越莓汁替') < 0;
  console.log('  ' + (okCosmo ? '✅' : '❌') + ' 大都会：写成"参考本写了、这杯没放"（不再套用库里的通用理由）');
  if (!okCosmo) bad('酒单', '大都会的差别栏又套用了通用替换理由');

  /* 来历：推荐的那 51 款必须都写上了（都是查证过的），
     没查证的不许硬编——显示"暂缺"就行。 */
  const noOrigin = [];
  global.__REF.forEach(r => {
    if (!r.pick) return;
    const nm = r.zh || r.en;
    B.menu.open(global.__REF.indexOf(r));
    const txt = strip(els.menuDetail.innerHTML);
    if (!global.__ORIGIN[nm] || txt.indexOf('来历：' + global.__ORIGIN[nm].slice(0, 8)) < 0) noOrigin.push(nm);
  });
  const extraOrigin = Object.keys(global.__ORIGIN)
    .filter(nm => !global.__REF.some(r => r.pick && (r.zh || r.en) === nm));
  console.log('  ' + (noOrigin.length || extraOrigin.length ? '❌' : '✅')
    + ' 51 款推荐都写了来历（' + Object.keys(global.__ORIGIN).length + ' 条）'
    + (noOrigin.length ? '，漏了：' + noOrigin.slice(0, 3).join('、') : '')
    + (extraOrigin.length ? '，多写了非推荐款：' + extraOrigin.slice(0, 3).join('、') : ''));
  if (noOrigin.length || extraOrigin.length) {
    bad('酒单', '推荐款的来历不全：缺 ' + noOrigin.length + ' 条 / 多写 ' + extraOrigin.length + ' 条');
  }
  /* 没查证过的必须老实说"暂缺"，不能留旧的占位话术 */
  B.menu.open(global.__REF.findIndex(r => r.zh === '长岛冰茶'));
  const staleIdea = strip(els.menuDetail.innerHTML).indexOf('正在补') >= 0;
  console.log('  ' + (staleIdea ? '❌' : '✅') + ' 没查证过的来历写成"暂缺"，不再写"正在补…"这种空话');
  if (staleIdea) bad('酒单', '来历还留着"正在补"的占位话术');

  /* 一句话定位：51 款推荐每杯都要有一行，而且得真的渲染出来 */
  const noLine = [];
  global.__REF.forEach((r, i) => {
    if (!r.pick) return;
    const nm = r.zh || r.en;
    B.menu.open(i);
    const txt = strip(els.menuDetail.innerHTML);
    if (!global.__PICKLINE[nm] || txt.indexOf(global.__PICKLINE[nm].slice(0, 8)) < 0) noLine.push(nm);
  });
  const extraLine = Object.keys(global.__PICKLINE)
    .filter(nm => !global.__REF.some(r => r.pick && (r.zh || r.en) === nm));
  console.log('  ' + (noLine.length || extraLine.length ? '❌' : '✅')
    + ' 51 款推荐每杯都有一句话定位（' + Object.keys(global.__PICKLINE).length + ' 行）'
    + (noLine.length ? '，漏了：' + noLine.slice(0, 3).join('、') : '')
    + (extraLine.length ? '，多写了非推荐款：' + extraLine.slice(0, 3).join('、') : ''));
  if (noLine.length || extraLine.length) {
    bad('酒单', '推荐款的一句话定位不全：缺 ' + noLine.length + ' 条 / 多写 ' + extraLine.length + ' 条');
  }

  /* 预设跟参考本一模一样的（材料和量都对得上），不能再挂"本站配比"的牌子。
     盘尼西林原来把拉弗格换成了黑方——参考本点名要的泥煤味，库里有正主就不该省。 */
  const sameCase = (name, wantText, wantPick) => {
    B.menu.open(global.__REF.findIndex(r => r.zh === name));
    const txt = strip(els.menuDetail.innerHTML);
    return txt.indexOf(wantText) >= 0 && (txt.indexOf('本站配比') >= 0) === wantPick;
  };
  const okSame = sameCase('盘尼西林', '拉弗格', false)
    && sameCase('爱尔兰咖啡', '爱尔兰威士忌', false)
    && sameCase('椰林飘香', '青柠', true)
    && sameCase('大都会', '蔓越莓糖浆', true);
  console.log('  ' + (okSame ? '✅' : '❌')
    + ' 预设跟参考本一样的（青霉素 / 爱尔兰咖啡）不再挂"本站配比"；该用正主的用正主');
  if (!okSame) bad('酒单', '预设和参考本的关系标错了（青霉素 / 爱尔兰咖啡 / 椰林飘香）');

  /* 用户说"按人家的酒单挑出来的一定比咱们配的好喝"——那"不一样"就必须一眼看到，
     不能只藏在折叠里。这里把 <details> 整段抠掉，剩下的部分仍然要写清楚。 */
  const visible = i => {
    B.menu.open(i);
    return els.menuDetail.innerHTML.replace(/<details[\s\S]*?<\/details>/g, '');
  };
  const iAt = n => global.__REF.findIndex(r => r.zh === n);
  const okVisible = visible(iAt('纸飞机')).indexOf('和参考本不一样') >= 0
    && visible(iAt('大都会')).indexOf('蔓越莓糖浆') >= 0
    && visible(iAt('盘尼西林')).indexOf('和参考配方本一致') >= 0;
  console.log('  ' + (okVisible ? '✅' : '❌') + ' 不一样的地方写在常驻位置（不用点开折叠就看得到）');
  if (!okVisible) bad('酒单', '"和参考本不一样"又藏回折叠里了');

  /* 材料表上挂过「替」的杯子，前一句必须已经说了"不一样" */
  const hidSwap = [];
  global.__REF.forEach((r, i) => {
    B.menu.open(i);
    const all = els.menuDetail.innerHTML;
    if (all.indexOf('class="opt swap"') < 0) return;
    if (visible(i).indexOf('和参考本不一样') < 0) hidSwap.push(r.zh || r.en);
  });
  console.log('  ' + (hidSwap.length ? '❌' : '✅') + ' 带「替」字的杯子都有常驻提醒'
    + (hidSwap.length ? '（漏了 ' + hidSwap.slice(0, 3).join('、') + '）' : ''));
  if (hidSwap.length) bad('酒单', '材料表挂了「替」却没告诉用户和参考本不一样：' + hidSwap.slice(0, 3).join('、'));

  /* 反过来：名字互相包含、其实是两样东西的（桃子果泥 / 桃子利口酒、西柚气泡水 / 西柚汁），
     不能因为"名字像"就判成"和参考本一致"。真正的叫法差异（红味美思）才判一致。 */
    const okClass = visible(iAt('贝里尼')).indexOf('和参考本不一样') >= 0
      && visible(iAt('僵尸')).indexOf('和参考本不一样') >= 0
      && visible(iAt('莫斯科骡子')).indexOf('和参考本不一样') >= 0
      && visible(iAt('曼哈顿')).indexOf('和参考配方本一致') >= 0;
  console.log('  ' + (okClass ? '✅' : '❌') + ' 名字像但东西不同的（果泥/气泡水/糖浆）算"不一样"');
    if (!okClass) bad('酒单', '"桃子果泥 → 桃子利口酒"这类被当成"只是叫法不同"了');

    /* 白鸽：参考本写"西柚气泡水"，以前库里没有这样材料、被换成西柚汁，于是它被判成"不冒气"。
       现在库里有了，就该：① 材料表直接写西柚气泡水（不带「替」）② 算有气泡 ③ 退出"别冒气"那一档 */
    B.menu.open(iAt('白鸽'));
    const doveHtml = els.menuDetail.innerHTML;
    const doveOk = doveHtml.indexOf('西柚气泡水') >= 0 && doveHtml.indexOf('class="opt swap"') < 0;
    B.have.load(iAt('白鸽'));
    const doveBubbly = B.analyze().hasFizzIng === true;
    const doveInStill = B.tonight.pool('still').indexOf(iAt('白鸽')) >= 0;
    console.log('  ' + (doveOk && doveBubbly && !doveInStill ? '✅' : '❌')
      + ' 白鸽用上库里的西柚气泡水（材料表不带「替」、算有气泡、退出"别冒气"）');
    if (!(doveOk && doveBubbly && !doveInStill)) {
      bad('酒单', '白鸽的西柚气泡水没接上：材料表 ' + doveOk + ' / 有气泡 ' + doveBubbly
        + ' / 还在别冒气里 ' + doveInStill);
    }

    /* "按参考本装杯"：装出来的量必须是参考本的，不是本站配比的；
     库里确实没有的那几样（柠檬伏特加 / 蔓越莓糖浆）要在杯子下面说清楚装的是替代品 */
  const iCosmo = iAt('大都会');
  B.menu.open(iCosmo);
  const hasRefBtn = els.menuDetail.innerHTML.indexOf('按参考本装杯') >= 0;
  fire({ menuLoadref: String(iCosmo) });    /* 真的点那个按钮 */
  const cup = B.state.cup;
  const cosmoCup = { vodka: cup.get('vodka'), cointreau: cup.get('cointreau'),
    cranberry: cup.get('cranberry'), syrup: cup.get('syrup'), lime: cup.get('lime') };
  const okRefCup = hasRefBtn
    && cosmoCup.vodka === 45 && cosmoCup.cointreau === 20 && cosmoCup.cranberry === 20
    && cosmoCup.syrup === 5 && cosmoCup.lime === 20;   /* 参考本是 45/20/20/5/20 */
  console.log('  ' + (okRefCup ? '✅' : '❌') + ' 按参考本装杯：装上参考本的量（'
    + JSON.stringify(cosmoCup) + '）');
  if (!okRefCup) bad('酒单', '按参考本装杯没装出参考本的量');
  const rnCosmo = strip(els.recipeNote.innerHTML);
  const okRefNote = rnCosmo.indexOf('柠檬伏特加') >= 0 && rnCosmo.indexOf('本库没有') >= 0;
  console.log('  ' + (okRefNote ? '✅' : '❌')
    + ' 杯子下面写清楚哪几样是替代品（参考本写了、本库没有）');
  if (!okRefNote) bad('酒单', '按参考本装杯时没说清楚哪几样是替代品');
  B.menu.reset();

  /* 删掉测试留下的东西 */
  B.menu.del(0);
  global.localStorage.removeItem('barmix.favs');
  global.localStorage.removeItem('barmix.mine');
  B.menu.reset();
})();

/* ---- 今晚喝什么：一次只问一个问题，点了出三杯 ---- */
console.log('\n--- 今晚喝什么 ---');
(function () {
  const moods = B.tonight.moods;
  const okCount = moods.length >= 5 && moods.length <= 7;
  console.log('  ' + (okCount ? '✅' : '❌') + ' 心情按钮 ' + moods.length + ' 个（一屏放得下）');
  if (!okCount) bad('今晚喝什么', '心情按钮数量不对：' + moods.length);

  /* 每一档的候选池都得够大，不然"每天换一批"换的还是那几杯 */
  const thin = [];
  moods.forEach(m => {
    const pool = B.tonight.pool(m.id);
    if (pool.length < 6) thin.push(m.label + '(' + pool.length + ')');
  });
  console.log('  ' + (thin.length ? '❌' : '✅') + ' 每一档候选至少 6 杯，轮换得起来'
    + (thin.length ? '：' + thin.join('、') : ''));
  if (thin.length) bad('今晚喝什么', '候选太少轮换不起来：' + thin.join('、'));

  /* 同一天里点几次都一样（不然用户会以为坏了） */
  const p1 = B.tonight.picks('sour').join(','), p2 = B.tonight.picks('sour').join(',');
  console.log('  ' + (p1 === p2 ? '✅' : '❌') + ' 同一天里结果稳定，不会刷一下就跳一批');
  if (p1 !== p2) bad('今晚喝什么', '同一天里结果不稳定');

  /* 换一天要换一批（种子必须真的用上日期） */
  const d1 = B.tonight.picksOnDate('any', '2026-10-13').join(',');
  const d2 = B.tonight.picksOnDate('any', '2026-10-14').join(',');
  const d3 = B.tonight.picksOnDate('any', '2026-10-15').join(',');
  const rotated = d1 !== d2 || d2 !== d3;
  console.log('  ' + (rotated ? '✅' : '❌') + ' 换一天换一批（13/14/15 号不是同一组）');
  if (!rotated) bad('今晚喝什么', '种子没用上日期，每天都是同一批');

  /* 点「换一批」：当场换出另一组，而且还在这一档的候选里 */
  const beforeAgain = B.tonight.picks('any').join(',');
  fire({ tonightAgain: '1' });
  const afterAgain = B.tonight.picks('any').join(',');
  const poolAny = B.tonight.pool('any').map(String);
  const stillInPool = B.tonight.picks('any').every(i => poolAny.indexOf(String(i)) >= 0);
  const okAgain = beforeAgain !== afterAgain && stillInPool && B.tonight.nonce() > 0;
  console.log('  ' + (okAgain ? '✅' : '❌') + ' 「换一批」当场换出另一组，而且还在这一档里');
  if (!okAgain) bad('今晚喝什么', '「换一批」没换出新的（或换出了候选之外的酒）');

  /* 换一批不能马上又端回刚看过的那几杯：连着抽三批，相邻两批不能有重复 */
  B.page.set('tonight');
  fire({ mood: 'any' });                      /* 先选心情，把上一段的 nonce/seen 重置 */
  const batches = [];
  const shotPicks = () => (els.tonightOut.innerHTML.match(/data-tonight-go="(\d+)"/g) || [])
    .map(s => +s.replace(/\D/g, ''));
  batches.push(shotPicks());
  fire({ tonightAgain: '1' }); batches.push(shotPicks());
  fire({ tonightAgain: '1' }); batches.push(shotPicks());
  const repeated = [];
  for (let k = 1; k < batches.length; k++) {
    batches[k].forEach(i => { if (batches[k - 1].indexOf(i) >= 0) repeated.push(i); });
  }
  const okFresh = repeated.length === 0 && batches.every(b => b.length === 3);
  console.log('  ' + (okFresh ? '✅' : '❌') + ' 「换一批」不会马上又端回刚看过的（'
    + batches.map(b => b.length).join('/') + ' 杯，重复 ' + repeated.length + ' 个）');
  if (!okFresh) bad('今晚喝什么', '「换一批」又端回了刚看过的酒');

  /* "清爽，别冒气"：给的三杯里一口汽水都不能有（有人明确不喝带气的） */
  const bubbly = [];
  B.tonight.picks('still').forEach(i => {
    B.have.load(i);
    if (B.analyze().hasFizzIng) bubbly.push(global.__REF[i].zh || global.__REF[i].en);
  });
  console.log('  ' + (bubbly.length ? '❌' : '✅') + ' "清爽，别冒气"给的三杯真的一口汽水都没有'
    + (bubbly.length ? '：' + bubbly.join('、') : ''));
  if (bubbly.length) bad('今晚喝什么', '别冒气那一档里出现了带气的酒：' + bubbly.join('、'));

  /* 点一下心情 → 三张卡，每张都写了"要买什么/怎么倒" */
  B.page.set('tonight');
  fire({ mood: 'sour' });
  const html = els.tonightOut.innerHTML;
  const cards = (html.match(/class="tcard"/g) || []).length;
  const okCards = cards === 3 && html.indexOf('要买什么') >= 0 && html.indexOf('怎么倒') >= 0;
  console.log('  ' + (okCards ? '✅' : '❌') + ' 点心情 → 三张卡（写了要买什么、怎么倒）：' + cards + ' 张');
  if (!okCards) bad('今晚喝什么', '点心情没出三张卡');

  /* 卡片上的星星点了要进"我的收藏" */
  const first = B.tonight.picks('sour')[0];
  const firstNm = global.__REF[first].zh;
  const before = B.menu.favs().length;
  fire({ fav: String(first) });
  const after = B.menu.favs();
  const okFav = after.length === before + 1 && after.indexOf(firstNm) >= 0;
  console.log('  ' + (okFav ? '✅' : '❌') + ' 卡片上的星星点了进「我的收藏」（' + firstNm + '）');
  if (!okFav) bad('今晚喝什么', '卡片上的星星没收藏成功');
  B.menu.fav(firstNm);   /* 收回，别影响后面的测试 */

  /* 拿去细调：装进杯子并跳到调酒台 */
  fire({ tonightGo: String(first) });
  const okGo = B.page.current() === 'bar' && B.state.cup.size > 0;
  console.log('  ' + (okGo ? '✅' : '❌') + ' 「拿去细调」装进杯子并跳到调酒台');
  if (!okGo) bad('今晚喝什么', '「拿去细调」没装杯或没跳页');
})();

/* ---- 分享卡：把一杯画成一张竖版图片 ---- */
console.log('\n--- 分享卡 ---');
(function () {
  const idxOf = n => global.__REF.findIndex(r => r.zh === n);
  const html = fs.readFileSync(path.join(dir, 'dev.html'), 'utf8');

  /* 酒单里的一杯：卡上该有的东西都得有 */
  const cosmo = B.share.specFromRef(idxOf('大都会'));
  const okSpec = cosmo && cosmo.name === '大都会' && cosmo.items.length === 4
    && cosmo.how.indexOf('摇') >= 0 && cosmo.dims.length === 8
    && cosmo.note && cosmo.keep && cosmo.glass && cosmo.abv > 0;
  console.log('  ' + (okSpec ? '✅' : '❌') + ' 一张卡的内容齐了：名字/材料/做法/风味八维/提示/保存提醒');
  if (!okSpec) bad('分享卡', '分享卡内容不全：' + JSON.stringify(cosmo && Object.keys(cosmo)));

  /* 白鸽那杯卡上写的是西柚气泡水（不是西柚汁） */
  const dove = B.share.specFromRef(idxOf('白鸽'));
  const okDove = dove.items.some(x => x.name.indexOf('西柚气泡水') >= 0);
  console.log('  ' + (okDove ? '✅' : '❌') + ' 白鸽的卡上写的是西柚气泡水');
  if (!okDove) bad('分享卡', '白鸽的卡上材料不对：' + dove.items.map(x => x.name).join('、'));

  /* 调酒台那杯：预设名和酒单名不一样，也要能找到那句话定位（生锈钉 ↔ 锈钉） */
  const pi = global.__PRESETS.findIndex(p => p.name === '锈钉');
  B.preset(pi);
  const cupSpec = B.share.specFromCup();
  const okCup = cupSpec && cupSpec.name === '锈钉' && cupSpec.items.length === 2
    && cupSpec.line && cupSpec.line.length > 4 && cupSpec.how;
  console.log('  ' + (okCup ? '✅' : '❌') + ' 调酒台那杯也能做成卡（含一句话定位）：'
    + (cupSpec ? cupSpec.name + ' · ' + (cupSpec.line || '（没找到定位）') : '（没做出来）'));
  if (!okCup) bad('分享卡', '调酒台那杯做不出分享卡');

  /* 两个入口：酒单详情里一个、调酒台杯子那一栏一个 */
  B.menu.open(idxOf('大都会'));
  const btnInMenu = els.menuDetail.innerHTML.indexOf('data-share=') >= 0;
  const btnInCup = html.indexOf('id="shareCupBtn"') >= 0 && html.indexOf('id="shareWrap"') >= 0;
  console.log('  ' + (btnInMenu && btnInCup ? '✅' : '❌')
    + ' 两个入口都在（酒单详情、调酒台杯子那一栏）');
  if (!(btnInMenu && btnInCup)) bad('分享卡', '少了入口：酒单 ' + btnInMenu + ' / 调酒台 ' + btnInCup);

  /* 这个环境里没有 canvas：不能装作生成成功，也不能炸 */
  let threw = false, opened = null;
  try { opened = B.share.open(cosmo); } catch (e) { threw = true; }
  console.log('  ' + (!threw && opened === false ? '✅' : '❌')
    + ' 没有 canvas 的环境里老实返回失败（不炸、不假装成功）');
  if (threw || opened !== false) bad('分享卡', '没 canvas 时的处理不对：threw=' + threw + ' opened=' + opened);

  /* 二维码：内容必须是那个网址，而且得是一张"真二维码"（三个角上的回字形定位图案） */
  const url = B.share.qrText();
  const qm = B.share.qrMatrix(url);
  const finderAt = (rows, r0, c0) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const edge = (r === 0 || r === 6 || c === 0 || c === 6);
        const core = (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        if (rows[r0 + r][c0 + c] !== (edge || core ? 1 : 0)) return false;
      }
    }
    return true;
  };
  const okQr = qm && qm.count >= 21 && qm.ratio > 0.3 && qm.ratio < 0.6
    && finderAt(qm.rows, 0, 0)
    && finderAt(qm.rows, 0, qm.count - 7)
    && finderAt(qm.rows, qm.count - 7, 0);
  console.log('  ' + (okQr ? '✅' : '❌') + ' 二维码是对的：' + url
    + '（' + (qm ? qm.count + '×' + qm.count + '，黑块 ' + Math.round(qm.ratio * 100) + '%' : '没生成出来') + '，三个定位图案都在）');
  if (!okQr) bad('分享卡', '二维码不对：' + JSON.stringify(qm && { n: qm.count, r: qm.ratio }));
})();

/* ---- 四个页面 + 侧边导航 ---- */
console.log('\n--- 页面与导航 ---');
(function () {
  const html = fs.readFileSync(path.join(dir, 'dev.html'), 'utf8');
  const pages = ['tonight', 'bar', 'menu', 'tips'];
  const pageHtml = pages.filter(p => new RegExp('id="page-' + p + '"').test(html));
  const navHtml = (html.match(/data-page="(\w+)"/g) || []).map(s => s.replace(/.*"(\w+)"/, '$1'));
  console.log('  ' + (pageHtml.length === 4 ? '✅' : '❌') + ' 页面：' + pageHtml.join(' / '));
  console.log('  ' + (navHtml.length === 4 ? '✅' : '❌') + ' 侧栏导航项：' + navHtml.join(' / '));
  if (pageHtml.length !== 4) bad('页面', '缺页面：' + pages.filter(p => pageHtml.indexOf(p) < 0).join('、'));
  if (navHtml.length !== 4) bad('页面', '侧栏导航项不对：' + navHtml.join('、'));

  /* 侧栏按重要性分三档（用户反馈：四项一样大，分不出主次；Tips 要压扁、沉到最下面） */
  const navButtons = html.match(/<button[^>]*class="navitem[^"]*"[^>]*data-page="\w+"[^>]*>/g) || [];
  const bigOne = navButtons.filter(b => /is-big/.test(b));
  const miniOne = navButtons.filter(b => /is-mini/.test(b) && /data-page="tips"/.test(b));
  const miniIsLast = navButtons.length > 0 && navButtons[navButtons.length - 1] === miniOne[0];
  const navCss = fs.readFileSync(path.join(dir, 'app.css'), 'utf8');
  const miniSticksBottom = /\.navitem\.is-mini\s*\{[^}]*margin-top:\s*auto/.test(navCss);
  const okNav = bigOne.length === 1 && /data-page="bar"/.test(bigOne[0]) && miniOne.length === 1
    && miniIsLast && miniSticksBottom;
  console.log('  ' + (okNav ? '✅' : '❌')
    + ' 侧栏分三档：调酒台最大、Tips 压扁并沉到最下方');
  if (!okNav) {
    bad('页面', '侧栏层级不对：大项 ' + bigOne.length + ' 个 / Tips 小项 ' + miniOne.length
      + ' 个 / 在最末 ' + miniIsLast + ' / 贴底样式 ' + miniSticksBottom);
  }

  /* 切换：一次只亮一页；选中项跟着走；选过就记住 */
  const cur = B.page.set('menu');
  const menuOn = els['page-menu'].classList.contains('on');
  const barOff = !els['page-bar'].classList.contains('on');
  const saved = global.localStorage.getItem('barmix.page');
  const ok = cur === 'menu' && menuOn && barOff && saved === 'menu';
  console.log('  ' + (ok ? '✅' : '❌') + ' 切到「酒单」：只有它在显示，且记到了本地（' + saved + '）');
  if (!ok) bad('页面', '页面切换不对：' + [cur, menuOn, barOff, saved].join(' / '));
  const back = B.page.set('bar') === 'bar' && els['page-bar'].classList.contains('on');
  console.log('  ' + (back ? '✅' : '❌') + ' 切回「调酒台」');
  if (!back) bad('页面', '切回调酒台失败');

  /* 手机上侧栏是抽屉，要有黑幕可以关 */
  const drawer = /id="navBack"/.test(html) && /navopen/.test(
    fs.readFileSync(path.join(dir, 'app.css'), 'utf8'));
  console.log('  ' + (drawer ? '✅' : '❌') + ' 手机端有抽屉和黑幕（点黑幕能关）');
  if (!drawer) bad('页面', '手机端抽屉不完整');
})();

/* ---- 浅色 / 深色主题 ---- */
console.log('\n--- 主题切换 ---');
(function () {
  const css = fs.readFileSync(path.join(dir, 'app.css'), 'utf8');
  const darkBlock = css.match(/:root\s*\{([\s\S]*?)\}/)[1];
  const lightBlock = (css.match(/:root\[data-theme="light"\]\s*\{([\s\S]*?)\}/) || [])[1] || '';
  const varsOf = (block) => {
    const out = {};
    (block.match(/--[\w-]+:\s*[^;]+;/g) || []).forEach(x => {
      const i = x.indexOf(':');
      out[x.slice(2, i).trim()] = x.slice(i + 1, -1).trim();
    });
    return out;
  };
  const dark = varsOf(darkBlock), light = varsOf(lightBlock);

  /* 关键不变量：深色里定义的每一个"颜色"变量，浅色必须也覆盖一遍，
     不然浅色主题下就会缺色（比如文字还是浅色的，白底上直接看不见） */
  const isColor = v => /^#|^rgb|^hsl/.test(v);
  const colorVars = Object.keys(dark).filter(k => isColor(dark[k]));
  const missed = colorVars.filter(k => !light[k]);
  console.log('  ' + (missed.length ? '❌' : '✅') + ' 深色里 ' + colorVars.length
    + ' 个颜色变量，浅色都覆盖了' + (missed.length ? '，漏了：' + missed.join('、') : ''));
  if (missed.length) bad('主题', '浅色主题没覆盖这些颜色变量：' + missed.join('、'));

  /* 切换：挂属性、存本地、按钮上写"点了会变成什么" */
  const t0 = B.theme.set('dark');
  const t1 = B.theme.set('light');
  const attr = global.document.documentElement.getAttribute('data-theme');
  const saved = global.localStorage.getItem('barmix.theme');
  const btn = els.themeBtn ? els.themeBtn.textContent : '';
  const ok = t0 === 'dark' && t1 === 'light' && attr === 'light' && saved === 'light' && btn === '深色';
  console.log('  ' + (ok ? '✅' : '❌') + ' 切到浅色：data-theme=' + attr
    + '、本地存了「' + saved + '」、按钮写着「' + btn + '」');
  if (!ok) bad('主题', '主题切换没有正确落盘：' + [t0, t1, attr, saved, btn].join(' / '));
  const back = B.theme.set('dark') === 'dark'
    && global.document.documentElement.getAttribute('data-theme') === null;
  console.log('  ' + (back ? '✅' : '❌') + ' 切回深色：属性被摘掉，回到默认');
  if (!back) bad('主题', '切回深色没有摘掉 data-theme');

  /* 按钮和提前设置的脚本都要在页面上 */
  const html = fs.readFileSync(path.join(dir, 'dev.html'), 'utf8');
  const wired = /id="themeBtn"/.test(html) && /barmix\.theme/.test(html)
    && /prefers-color-scheme/.test(html);
  console.log('  ' + (wired ? '✅' : '❌') + ' 页面上有切换按钮，且在画页面之前就设好主题（不会闪一下白）');
  if (!wired) bad('主题', '页面里缺切换按钮或提前设置主题的脚本');
})();

/* ---- ③ 材料库的搜索（用户要求加） ---- */
  console.log('\n--- 材料库搜索 ---');
(function () {
  const stripOne = s => String(s).replace(/\s+/g, ' ').trim();
  B.state.hideRisky = false;
  B.state.cat = 'whisky';
  B.lib.search('');
  const normal = (els.lib.innerHTML.match(/data-add="/g) || []).length;
  const normalHead = stripOne(els.lib.innerHTML.match(/class="libgroup">([^<]*)</)[1]);

  B.lib.search('柠檬');
  const hits = (els.lib.innerHTML.match(/data-add="/g) || []).length;
  const texts = els.lib.innerHTML;
  const cats = new Set((texts.match(/class="src s-cat">([^<]*)</g) || [])
    .map(x => x.replace(/.*>/, '').replace('<', '')));
  const ok1 = hits >= 4 && cats.size >= 2
    && texts.indexOf('鲜柠檬汁') >= 0 && texts.indexOf('柠檬皮') >= 0;
  console.log('  ' + (ok1 ? '✅' : '❌') + ' 搜"柠檬"：跨 ' + cats.size + ' 个分类命中 ' + hits
    + ' 样（' + Array.from(cats).join('、') + '）');
  if (!ok1) bad('材料库', '搜索没有跨分类命中：' + hits + ' 样 / ' + cats.size + ' 类');

  /* 容易混的那几对（利口酒为主），备注里必须点到对方的名字。
     用户说过"利口酒不同牌子差别还挺大的"——那卡片上就得写清楚别拿它顶它。 */
  const PAIRS = [
    ['cointreau', '柑曼怡'], ['grand_marnier', '君度'],
    ['campari', '阿佩罗'], ['aperol', '金巴利'],
    ['cassis', '香博'], ['chambord', '黑加仑'],
    ['cocoa_white', '黑可可'], ['cocoa_dark', '白可可'],
    ['menthe_white', '绿薄荷'], ['menthe_green', '白薄荷'],
    ['chartreuse', '黄查特'], ['chartreuse_jaune', '绿查特'],
    ['fernet', '阿玛罗'], ['dry_curacao', '蓝橙'], ['curacao_blue', '干库拉索'],
    ['lillet', '美国佬'], ['cherry_brandy', '黑樱桃'], ['maraschino', '樱桃白兰地'],
    ['angostura', '橙味苦精'], ['orange_bitters', '安高天娜'],
    ['apricot', '桃子'], ['peach', '果泥'],
    ['kahlua', '黑先生'], ['mrblack', '甘露'],
    ['benedictine', '查特'], ['vermouth', '干味美思'], ['dry_vermouth', '红味美思']
  ];
  const missPair = PAIRS.filter(function (pair) {
    const g = B.BY_ID[pair[0]];
    return !g || !g.note || g.note.indexOf(pair[1]) < 0;
  }).map(function (pair) {
    return B.BY_ID[pair[0]] ? B.BY_ID[pair[0]].name : pair[0];
  });
  console.log('  ' + (missPair.length ? '❌' : '✅') + ' 容易混的那几对，备注里都点了对方的名字（'
    + PAIRS.length + ' 对）'
    + (missPair.length ? '：' + missPair.slice(0, 3).join('、') : ''));
  if (missPair.length) bad('材料库', '这些材料的备注没说清跟谁容易混：' + missPair.slice(0, 3).join('、'));

  /* 搜出来的卡片要标出属于哪一类 */
  const tagged = (texts.match(/class="src s-cat"/g) || []).length;
  console.log('  ' + (tagged === hits ? '✅' : '❌') + ' 搜索结果每张卡都标了类别（' + tagged + '/' + hits + '）');
  if (tagged !== hits) bad('材料库', '搜索结果没标类别');

  /* 点分类标签 = 退出搜索 */
  fire({ cat: 'gin' });
  const back = B.lib.query() === '' && (els.lib.innerHTML.match(/data-add="/g) || []).length
    === global.__I.filter(g => g.cat === 'gin').length;
  console.log('  ' + (back ? '✅' : '❌') + ' 点分类标签会退出搜索，回到分类视图');
  if (!back) bad('材料库', '点分类标签没有退出搜索');

  /* 搜索框和清空按钮要真的画在页面上（按钮的点击在真实浏览器里试，这里只查有没有） */
  const libHtml = fs.readFileSync(path.join(dir, 'dev.html'), 'utf8');
  const hasBox = /id="libSearch"/.test(libHtml) && /id="libClear"/.test(libHtml);
  console.log('  ' + (hasBox ? '✅' : '❌') + ' ③ 材料库里有搜索框和清空按钮');
  if (!hasBox) bad('材料库', '材料库里没有搜索框或清空按钮');

  /* 退出搜索后回到分类视图，数量照旧 */
  B.lib.search('');
  B.state.cat = 'whisky';
  B.load([]);
  const restored = (els.lib.innerHTML.match(/data-add="/g) || []).length === normal;
  console.log('  ' + (restored ? '✅' : '❌') + ' 退出搜索回到「' + normalHead + '」，' + normal + ' 样照旧');
  if (!restored) bad('材料库', '退出搜索后没有回到分类视图');
})();

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

  /* 调酒台里不能出现已经不存在的面板：「经典配方」早搬去酒单了，
     可 dev.html 里还留着"从⑤经典配方点一个例子"这种指路，用户照着找会找不到。
     所以直接把调酒台那一段抠出来查。 */
  const bar = html.slice(html.indexOf('id="page-bar"'), html.indexOf('id="page-menu"'));
  const stale = /⑤|经典配方/.test(bar);
  console.log('  ' + (stale ? '❌' : '✅') + ' 调酒台不再让用户去找已经搬走的「⑤ 经典配方」');
  if (stale) bad('操作说明', '调酒台里还在指「⑤ 经典配方」——那个面板已经搬去酒单了');

  /* 用户反馈：页脚那句"风味图和评分是按配比推算的"跟内容无关。
     话本身该留着（这是我们说实话的地方），但要从页脚挪到「怎么读结果」里。 */
  const footGone = !/<footer[\s\S]{0,200}风味图/.test(html);
  const movedIn = /分数和风味图都只是参考[\s\S]{0,30}按配比推算/.test(html);
  console.log('  ' + (footGone && movedIn ? '✅' : '❌')
    + ' "分数只是参考"挪进了「怎么读结果」，页脚不再单独挂一句');
  if (!(footGone && movedIn)) {
    bad('操作说明', '页脚说明位置不对：页脚已清 ' + footGone + ' / 怎么读结果里有 ' + movedIn);
  }
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

  /* 页面上不再写统计这件事了——用户说"用户看了会不舒服"。
     但代码层面的事实要守住：只能有百度统计这一处外部请求（在 build 里检查），
     本地文件不上报（上面那条），README 里仍然写着实情。 */
  const quiet = !/看匿名访问量/.test(html);
  console.log('  ' + (quiet ? '✅' : '❌') + ' 页面上不再提"统计"这件事（用户要求删掉那句）');
  if (!quiet) bad('统计', '页面上还留着统计的说明文字');
})();

/* ---- 配方码：一串文字带走一整杯 ---- */
console.log('\n--- 配方码 ---');
(function () {
  const strip = s => String(s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  /* 装一杯有零有整的：7.5ml 这样的小数、苦精的 dash、整瓶的养乐多都要活得下来 */
  B.state.glass = 'rocks'; B.state.iceLevel = 'half'; B.state.method = 'stir';
  B.load([['bourbon', 45], ['lemon', 20], ['syrup', 7.5], ['angostura', 2], ['yakult', 1]]);
  const code = B.code.make();
  const okShape = /^BM1-rocks-half-stir-bourbon\.45-lemon\.20-syrup\.7\.5-angostura\.2-yakult\.1$/.test(code);
  console.log('  ' + (okShape ? '✅' : '❌') + ' 生成的码：' + code);
  if (!okShape) bad('配方码', '码的格式不对：' + code);

  /* 清空再粘回来：材料、分量、杯型、冰量、做法必须一模一样 */
  const before = { cup: [...B.state.cup.entries()], g: B.state.glass, i: B.state.iceLevel, m: B.state.method };
  B.load([]);
  const p = B.code.load(code);
  const after = { cup: [...B.state.cup.entries()], g: B.state.glass, i: B.state.iceLevel, m: B.state.method };
  const same = p.ok && JSON.stringify(before) === JSON.stringify(after);
  console.log('  ' + (same ? '✅' : '❌') + ' 粘回来装出同一杯：' + JSON.stringify(after.cup));
  if (!same) bad('配方码', '粘回来和原杯不一致：' + JSON.stringify(before) + ' vs ' + JSON.stringify(after));

  /* 从一坨聊天记录里也要认得出来（前后有别的话、甚至是整条链接） */
  const noisy = '你看这杯好喝 ' + code + ' 试试';
  const noisyOk = B.code.parse(noisy).ok;
  const urlOk = B.code.parse('https://saobo-shu.github.io/bar-mix/?r=' + code).ok;
  console.log('  ' + (noisyOk && urlOk ? '✅' : '❌') + ' 夹在聊天记录里、或者整条链接粘进来都认得');
  if (!noisyOk || !urlOk) bad('配方码', '从长文本里认不出配方码');

  /* 乱码要拦住，不能悄悄装出一杯似是而非的酒 */
  const junk = ['', '你好', 'BM1', 'BM1-rocks-half-stir', 'BM1-不存在的杯子-half-stir-bourbon.45',
    'BM1-rocks-half-stir-bourbon.-5', 'BM1-rocks-half-stir-nobody.45'];
  const passed = junk.filter(s => B.code.parse(s).ok);
  console.log('  ' + (passed.length ? '❌' : '✅') + ' 乱码 / 缺料 / 量不对的一律拒绝，试了 ' + junk.length + ' 种');
  if (passed.length) bad('配方码', '这些不该通过却通过了：' + JSON.stringify(passed));

  /* 本库没有的材料：跳过但要说出来，不能装作没事 */
  const pu = B.code.parse(code + '-nosuchdrink.30');
  const okMiss = pu.ok && pu.missing.length === 1 && pu.missing[0] === 'nosuchdrink' && pu.cup.length === 5;
  console.log('  ' + (okMiss ? '✅' : '❌') + ' 遇到本库没有的材料：照样装，但把少了什么报出来');
  if (!okMiss) bad('配方码', '本库没有的材料没处理好：' + JSON.stringify(pu && pu.missing));

  /* 码里不该带口味/评分——那是收件人自己的设置 */
  B.state.taste = 'strong'; B.state.scheme = 'strength';
  const c2 = B.code.make();
  B.state.taste = 'light'; B.state.scheme = 'taste';
  const c3 = B.code.make();
  const okStable = c2 === c3 && c2.indexOf('strong') < 0;
  console.log('  ' + (okStable ? '✅' : '❌') + ' 换口味 / 换评分方案，码不变（那些是你自己的设置）');
  if (!okStable) bad('配方码', '口味或评分混进码里了：' + c2 + ' vs ' + c3);
  B.state.taste = 'normal'; B.state.scheme = 'balanced';

  /* 界面：点一下按钮，弹层里就是这杯的码；空杯子时提示去粘贴 */
  B.code.open();
  const shown = els['codeOut'].value;
  console.log('  ' + (shown.indexOf('BM1-') === 0 ? '✅' : '❌') + ' 点「配方码」弹层里就有这杯的码');
  if (shown.indexOf('BM1-') !== 0) bad('配方码', '弹层里没显示码：' + shown);
  B.load([]);
  B.code.open();
  const emptyMsg = strip(els['codeMsg'].textContent || els['codeMsg'].innerHTML);
  const okEmpty = /空的/.test(emptyMsg) && els['codeOut'].value === '';
  console.log('  ' + (okEmpty ? '✅' : '❌') + ' 空杯子时提示"把别人的码粘进来"');
  if (!okEmpty) bad('配方码', '空杯子时的提示不对：' + emptyMsg);
  B.code.load(code); B.load([]);
})();

console.log('\n================ 自检结果 ================');
if (PROBLEMS.length) {
  console.log('❌ ' + PROBLEMS.length + ' 项没通过：');
  PROBLEMS.forEach(function (p) { console.log('   · ' + p); });
  process.exitCode = 1;
} else {
  console.log('✅ 全部检查通过');
}
