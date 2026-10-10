/* =========================================================
   把 191 份参考配方「翻译」成本库能用的材料需求

   参考数据（tools/reference-recipes.json）写的是通用名和品牌名，
   本库是具体瓶——所以中间要一张对照表。这个脚本负责：
     1. 把每个材料名翻译成 { id } / { cat } / { pantry } / { garnish } / { no }
     2. 生成 ref-recipes.js（app 直接用的成品）
     3. 报告覆盖率，以及哪些名字还没对上（写表时看这个）

   跑法：node tools/build-ref-index.js
   ========================================================= */
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..');

const ref = JSON.parse(fs.readFileSync(path.join(dir, 'tools', 'reference-recipes.json'), 'utf8'));
const w = {};
new Function('window', fs.readFileSync(path.join(dir, 'data.js'), 'utf8') + '\nwindow.__I = INGREDIENTS;')(w);
const I = w.__I;
const byId = {};
I.forEach(g => { byId[g.id] = g; });

/* ---------- 需求种类 ----------
   { id }       指定某一瓶（本库有）
   { cat }      这个分类里任意一瓶都行（比如"金酒"→ 任意金酒）
   { ids:[...] } 这几瓶里任意一瓶（比如"香槟/气泡酒"）
   { pantry:1 } 冰、水、盐、糖这类本来就该有的，不算缺
   { garnish:1 } 装饰：不算缺，只在备注里提一句
   { no }       本库没有收录：算缺，并注明要自己买
   { approx }   本库只有"差不多的东西"，标注出来（例如某些风味糖浆）            */

/* ---------- 精确名字优先（有歧义的、品牌的） ---------- */
const EXACT = {
  /* 威士忌：泥煤、波本、黑麦、调和分清楚 */
  '苏格兰威士忌': { cat: 'whisky' },
  '苏格兰调和性威士忌': { id: 'jw_black' },
  '威凤凰珍藏波本': { id: 'wild_turkey' },
  '威凤凰珍藏威士忌': { id: 'wild_turkey' },
  '拉弗格精锐': { id: 'laphroaig' },
  '拉弗格1/4桶': { id: 'laphroaig' },
  '阿贝10年': { id: 'ardbeg10' },
  '艾雷迷雾烟熏威士忌': { id: 'talisker' },
  '水牛足迹波本威士忌': { id: 'buffalo_trace' },
  /* 朗姆 */
  '百加得朗姆': { id: 'rum' },
  '蔗园菠萝朗姆': { id: 'plantation3' },
  'Cubita 151 朗姆': { id: 'dark_rum', approx: 1 },
  /* 龙舌兰 */
  '唐胡里奥龙舌兰': { id: 'donjulio' },
  '奥美佳阿特兹': { id: 'olmeca' },
  '100% 龙舌兰': { cat: 'tequila' },
  'Mezcal 梅斯卡尔': { id: 'mezcal' },
  /* 金酒 / 伏特加 / 烧酒：不认识的金酒牌子统一按金酒算 */
  '季之美金酒': { cat: 'gin', approx: 1 },
  '巍城夏日花园金酒': { cat: 'gin', approx: 1 },
  '柠檬伏特加': { id: 'vodka', approx: 1 },
  '美鹤乃舞烧酒': { id: 'soju', approx: 1 },
  '烧酒（大伊雅美）': { id: 'soju', approx: 1 },
  /* 干邑 / 白兰地 */
  '干邑白兰地': { id: 'cognac' },
  '干邑（问客人要黑麦还是干邑）': { id: 'cognac' },
  /* 开胃酒 / 苦味酒 */
  'Nonino Amaro': { id: 'nonino' },
  'Nonino': { id: 'nonino' },
  '阿马罗': { id: 'averna', approx: 1 },
  '蒙特内罗': { id: 'montenegro' },
  '金馥利口酒': { id: 'soco' },
  'Amer Picon': { id: 'picon' },
  '好奇美国佬': { id: 'cocchi' },
  '雅梵娜': { id: 'aveze' },
  '阿夸维特': { id: 'aquavit' },
  '潘托密': { id: 'punt_e_mes' },
  '芳香苦精': { id: 'angostura' },
  '比特储斯黄杏': { id: 'apricot' },
  '西柚利口酒': { id: 'grapefruit_liqueur' },
  '火龙肉桂': { id: 'fireball' },
  '希灵樱桃利口酒': { id: 'cherry_brandy', approx: 1 },
  '希零樱桃利口酒': { id: 'cherry_brandy', approx: 1 },
  '樱桃利口酒（Heering）': { id: 'cherry_brandy', approx: 1 },
  /* 雪莉 / 葡萄酒 / 起泡 */
  '缇欧佩佩Fino雪莉酒': { id: 'fino' },
  'Fino雪利酒': { id: 'fino' },
  'Fino干雪利酒': { id: 'fino' },
  '1957雪利酒': { id: 'fino', approx: 1 },
  '红酒': { id: 'red_wine' },
  '干香槟': { id: 'sparkling_wine' },
  '干型起泡酒': { id: 'sparkling_wine' },
  /* 糖浆：本库没有的风味糖浆，用糖浆/对应利口酒近似 */
  '菠萝糖浆': { id: 'syrup', approx: 1 },
  '蔓越莓糖浆': { id: 'syrup', approx: 1 },
  '杏仁糖浆': { id: 'syrup', approx: 1 },
  '椰子糖浆': { id: 'syrup', approx: 1 },
  '树莓糖浆': { id: 'syrup', approx: 1 },
  '红枣糖浆': { id: 'syrup', approx: 1 },
  '香草糖浆': { id: 'monin' },
  '红糖浆': { id: 'demerara' },
  '德梅拉拉糖浆': { id: 'demerara' },
  /* 其余零碎 */
  '柠檬酸溶液': { id: 'lemon', approx: 1 },
  '青柠檬': { id: 'lime' },
  '青柠角': { id: 'lime' },
  '橙子片': { id: 'orange_peel' },
  '西柚皮': { id: 'grapefruit', approx: 1 },
  '蛋黄': { id: 'egg_yolk' },
  '黄油': { id: 'butter' },
  '桃子果泥': { id: 'peach', approx: 1 },
  '树莓（可选）': { id: 'raspberry' },
  '青提': { id: 'green_grape' },
  '意式浓缩咖啡': { id: 'coffee_hot', approx: 1 },
  '热咖啡': { id: 'coffee_hot' },
  '自制味美思': { id: 'vermouth', approx: 1 },
  '自制阿马罗': { id: 'averna', approx: 1 },
  '芳泉苦艾酒': { id: 'absinthe' },
  '法勒纳姆': { id: 'falernum' },
  '李派林喼汁': { id: 'worcestershire' },
  '酸甜（自由调整）': { pantry: 1 },
  '冰块': { pantry: 1 },
  '冰': { pantry: 1 },
  '水': { pantry: 1 }
};

/* ---------- 常规规则：能一眼看出归哪一类的 ---------- */
const RULES = [
  [/^(金酒|干金酒|伦敦干金|琴酒)/, { cat: 'gin' }],
  [/^(伏特加|伏特加酒)/, { cat: 'vodka' }],
  [/^(白朗姆|白朗姆酒)/, { id: 'rum' }],
  [/^(黑朗姆|深色朗姆)/, { id: 'dark_rum' }],
  [/^(朗姆酒|朗姆)/, { cat: 'rum' }],
  [/^(银龙舌兰|龙舌兰)/, { cat: 'tequila' }],
  [/^(梅斯卡尔|美斯卡尔)/, { id: 'mezcal' }],
  [/^(波本威士忌|波本)/, { id: 'bourbon' }],
  [/^(黑麦威士忌|黑麦)/, { id: 'rye' }],
  [/^(苏格兰|调和威士忌)/, { cat: 'whisky' }],
  [/^(威士忌)/, { cat: 'whisky' }],
  [/^(干邑|科涅克)/, { id: 'cognac' }],
  [/^(苹果白兰地)/, { id: 'calvados' }],
  [/^(皮斯科)/, { id: 'pisco' }],
  [/^(黄柠檬汁|柠檬汁|鲜柠檬汁)/, { id: 'lemon' }],
  [/^(青柠汁|青柠檬汁|莱姆汁)/, { id: 'lime' }],
  [/^(1:1糖浆|简单糖浆|单糖浆|白糖浆|基础糖浆)/, { id: 'syrup' }],
  [/^(3:1蜂蜜糖浆|蜂蜜糖浆)/, { id: 'honey_syrup' }],
  [/^(蜂蜜)/, { id: 'honey' }],
  [/^(苏打水|气泡水|苏打)/, { id: 'soda' }],
  [/^(香槟|起泡酒|气泡酒|气泡葡萄酒)/, { id: 'sparkling_wine' }],
  [/^(可乐)/, { id: 'coke' }],
  [/^(雪碧)/, { id: 'sprite' }],
  [/^(汤力水|通宁水)/, { id: 'tonic' }],
  [/^(干姜水|姜汁汽水|姜味汽水|姜汁啤酒)/, { ids: ['ginger_beer', 'ginger_ale'] }],
  [/^(橙汁)/, { id: 'orange_juice' }],
  [/^(菠萝汁)/, { id: 'pineapple' }],
  [/^(蔓越莓汁|红莓汁)/, { id: 'cranberry' }],
  [/^(西柚汁|葡萄柚汁)/, { id: 'grapefruit' }],
  [/^(苹果汁)/, { id: 'apple_juice' }],
  [/^(番茄汁)/, { id: 'tomato' }],
  [/^(安高天娜|安格斯图拉|芳香苦精)/, { id: 'angostura' }],
  [/^(橙味苦精|橙苦精)/, { id: 'orange_bitters' }],
  [/^(佩乔)/, { id: 'peychaud' }],
  [/^(金巴利)/, { id: 'campari' }],
  [/^(阿佩罗)/, { id: 'aperol' }],
  [/^(君度)/, { id: 'cointreau' }],
  [/^(柑曼怡)/, { id: 'grand_marnier' }],
  [/^(甘露|卡鲁哇)/, { id: 'kahlua' }],
  [/^(百利甜|百利)/, { id: 'baileys' }],
  [/^(查特绿)/, { id: 'chartreuse' }],
  [/^(查特黄)/, { id: 'chartreuse_jaune' }],
  [/^(当酒|本笃会)/, { id: 'benedictine' }],
  [/^(加力安奴)/, { id: 'galliano' }],
  [/^(黑樱桃利口酒|马拉斯奇诺)/, { id: 'maraschino' }],
  [/^(樱桃白兰地)/, { id: 'cherry_brandy' }],
  [/^(黑加仑利口酒)/, { id: 'cassis' }],
  [/^(白可可利口酒|白可可)/, { id: 'cocoa_white' }],
  [/^(黑可可利口酒|黑可可)/, { id: 'cocoa_dark' }],
  [/^(杏仁利口酒|迪萨罗诺)/, { id: 'disaronno' }],
  [/^(榛子利口酒)/, { id: 'frangelico' }],
  [/^(圣哲曼|接骨木花)/, { id: 'stgermain' }],
  [/^(利莱白)/, { id: 'lillet' }],
  [/^(苦艾酒)/, { id: 'absinthe' }],
  [/^(茴香酒|帕斯蒂斯)/, { id: 'pastis' }],
  [/^(甜味美思|红味美思|红味美斯|意大利味美思)/, { id: 'vermouth' }],
  [/^(干味美思|白味美思|干味美斯|法国味美思)/, { id: 'dry_vermouth' }],
  [/^(菲奈特)/, { id: 'fernet' }],
  [/^(希娜)/, { id: 'cynar' }],
  [/^(黑刺李)/, { id: 'sloe_gin' }],
  [/^(苏姿)/, { id: 'suze' }],
  [/^(飘仙)/, { id: 'pimms' }],
  [/^(蓝橙)/, { id: 'curacao_blue' }],
  [/^(黄杏利口酒|杏子白兰地)/, { id: 'apricot' }],
  [/^(桃子利口酒)/, { id: 'peach' }],
  [/^(香蕉利口酒)/, { id: 'banana_liqueur' }],
  [/^(紫罗兰)/, { id: 'violette' }],
  [/^(白薄荷利口酒)/, { id: 'menthe_white' }],
  [/^(绿薄荷利口酒)/, { id: 'menthe_green' }],
  [/^(香博|黑莓利口酒)/, { id: 'chambord' }],
  [/^(干库拉索)/, { id: 'dry_curacao' }],
  [/^(糖渍樱桃|红樱桃|马拉斯奇诺樱桃)/, { id: 'cherry' }],
  [/^(蛋清|蛋白)$/, { id: 'egg_white' }],
  [/^(淡奶油|鲜奶油|奶油)/, { id: 'cream' }],
  [/^(牛奶)/, { id: 'milk' }],
  [/^(椰浆|椰奶)/, { id: 'coconut_milk' }],
  [/^(红石榴糖浆|石榴糖浆)/, { id: 'grenadine' }],
  [/^(柠檬皮|柠檬片|柠檬角)/, { id: 'lemon_peel' }],
  [/^(橙皮|橙片)/, { id: 'orange_peel' }],
  [/^(薄荷叶|薄荷)/, { id: 'mint' }],
  [/^(迷迭香)/, { id: 'rosemary' }],
  [/^(黄瓜)/, { id: 'cucumber' }],
  [/^(肉桂棒)/, { id: 'cinnamon_stick' }],
  [/^(丁香)/, { id: 'clove' }],
  [/^(八角)/, { id: 'star_anise' }],
  [/^(肉豆蔻)/, { no: '肉豆蔻' }],
  [/^(盐|盐水)/, { pantry: 1 }],
  [/^(冰块|冰|碎冰|方冰|大冰块)/, { pantry: 1 }],
  [/^(水|清水|纯净水)$/, { pantry: 1 }],
  [/^(辣椒仔|塔巴斯科)/, { id: 'tabasco' }],
  [/^(橙花水)/, { id: 'orange_flower' }],
  [/^(橄榄)/, { id: 'olive_brine' }]
];

/* 参考数据里写了"（可选）"的：不算缺，只在结果里提一句。
   装饰不在此列——莫吉托没薄荷就是做不了，那是真缺。 */
const OPTIONAL = /(可选|随意|装饰用|非必需)/;

function needOf(raw) {
  const n = String(raw).trim().replace(/^[*·\s]+/, '');
  if (!n) return { pantry: 1 };
  /* 1. 名字在库里一模一样 */
  const exact = I.find(g => g.name === n || g.name.replace(/（.*?）/g, '').trim() === n);
  if (exact) return { id: exact.id };
  /* 2. 手写的对照表 */
  if (EXACT[n]) return Object.assign({}, EXACT[n]);
  /* 3. 常规规则 */
  for (const [re, need] of RULES) if (re.test(n)) {
    const r = Object.assign({}, need);
    if (OPTIONAL.test(n)) r.optional = 1;
    return r;
  }
  /* 4. 库里的名字被包含在这串里（或反过来） */
  for (const g of I) {
    const short = g.name.replace(/（.*?）/g, '').trim();
    if (short.length >= 2 && (n.includes(short) || short.includes(n))) return { id: g.id, approx: 1 };
  }
  return { no: n };
}

/* ---------------- 生成 ----------------
   只保留"能真做"的配方：本库没有的材料（no）照样留着，
   但标出来，让用户在结果里能看到"还缺一瓶 XX，库里没收录"。 */
const out = [];
const stat = { uses: 0, resolved: 0, no: 0, pantry: 0, garnish: 0, approx: 0 };
const unresolved = {};

ref.forEach(r => {
  const needs = [];
  (r.ingredients || []).forEach(ing => {
    const need = needOf(ing.n);
    if (OPTIONAL.test(ing.n)) need.optional = 1;
    if (need.pantry) { stat.pantry++; return; }
    if (need.no) { stat.no++; unresolved[need.no] = (unresolved[need.no] || 0) + 1; }
    if (need.approx) stat.approx++;
    if (need.id || need.cat || need.ids) stat.resolved++;
    stat.uses++;
    needs.push({ n: ing.n, a: String(ing.a || ''), need: need });
  });
  if (!needs.length) return;
  out.push({
    zh: r.zh, en: r.en, cat: r.cat, method: r.method, glass: r.glass,
    ice: r.ice || '', garnish: r.garnish || '', note: r.note || '',
    needs: needs
  });
});

const js = '/* 由 tools/build-ref-index.js 从 tools/reference-recipes.json 生成，不要手改 */\n'
  + 'var REF_RECIPES = ' + JSON.stringify(out) + ';\n';
fs.writeFileSync(path.join(dir, 'ref-recipes.js'), js, 'utf8');

console.log('配方 ' + ref.length + ' 份 → 生成 ' + out.length + ' 份');
console.log('材料项 ' + stat.uses + ' 个：指到具体瓶 ' + stat.resolved + '，本来就有 ' + stat.pantry
  + '，库里没收录 ' + stat.no + '，用近似物 ' + stat.approx);
const left = Object.entries(unresolved).sort((a, b) => b[1] - a[1]);
console.log('还没对上的名字 ' + left.length + ' 个：');
left.forEach(([n, c]) => console.log('  ' + c + '次  ' + n));
const clean = out.filter(x => x.needs.every(n => !n.need.no)).length;
console.log('完全不需要"库里没有的东西"的配方：' + clean + ' / ' + out.length);
