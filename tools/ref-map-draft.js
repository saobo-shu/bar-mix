/* 一次性工具：看看 191 份配方的材料名，有多少能自动对到材料库
   跑法：node tools/ref-map-draft.js
   输出：能对上的、对不上的两份清单，供人手写对照表用 */
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..');

const ref = JSON.parse(fs.readFileSync(path.join(dir, 'tools', 'reference-recipes.json'), 'utf8'));
const w = {};
new Function('window', fs.readFileSync(path.join(dir, 'data.js'), 'utf8') + '\nwindow.__I = INGREDIENTS;')(w);
const I = w.__I;

/* 关键词 → 材料 id。只写"一看就知道对哪个"的；
   有歧义的（比如"威士忌"到底是波本还是苏格兰）留给人判断。 */
const RULES = [
  [/^(金酒|干金酒|伦敦干金|琴酒)/, 'gin'],
  [/^伏特加/, 'vodka'],
  [/^(白朗姆|白朗姆酒)/, 'rum'],
  [/^(黑朗姆|深色朗姆)/, 'dark_rum'],
  [/^(朗姆酒|朗姆)/, 'rum'],
  [/^(银龙舌兰|龙舌兰)/, 'tequila'],
  [/^(梅斯卡尔|美斯卡尔)/, 'mezcal'],
  [/^(黄柠檬汁|柠檬汁|鲜柠檬汁)/, 'lemon'],
  [/^(青柠汁|青柠檬汁|莱姆汁)/, 'lime'],
  [/^(1:1糖浆|简单糖浆|单糖浆|白糖浆|基础糖浆)/, 'syrup'],
  [/^(苏打水|气泡水|苏打)/, 'soda'],
  [/^(可乐)/, 'coke'],
  [/^(橙汁)/, 'orange_juice'],
  [/^(菠萝汁)/, 'pineapple'],
  [/^(蔓越莓汁|红莓汁)/, 'cranberry'],
  [/^(西柚汁|葡萄柚汁)/, 'grapefruit'],
  [/^(苹果汁)/, 'apple_juice'],
  [/^(番茄汁)/, 'tomato'],
  [/^(安高天娜|安格斯图拉)/, 'angostura'],
  [/^(橙味苦精|橙苦精)/, 'orange_bitters'],
  [/^(佩乔)/, 'peychaud'],
  [/^(金巴利)/, 'campari'],
  [/^(阿佩罗)/, 'aperol'],
  [/^(君度)/, 'cointreau'],
  [/^(柑曼怡)/, 'grand_marnier'],
  [/^(甘露|卡鲁哇)/, 'kahlua'],
  [/^(百利甜|百利)/, 'baileys'],
  [/^(查特绿)/, 'chartreuse'],
  [/^(查特黄)/, 'chartreuse_jaune'],
  [/^(当酒|本笃会)/, 'benedictine'],
  [/^(加力安奴)/, 'galliano'],
  [/^(黑樱桃利口酒|马拉斯奇诺)/, 'maraschino'],
  [/^(樱桃白兰地)/, 'cherry_brandy'],
  [/^(黑加仑利口酒)/, 'cassis'],
  [/^(白可可利口酒|白可可)/, 'cocoa_white'],
  [/^(杏仁利口酒|迪萨罗诺)/, 'disaronno'],
  [/^(榛子利口酒)/, 'frangelico'],
  [/^(圣哲曼|接骨木花)/, 'stgermain'],
  [/^(利莱白)/, 'lillet'],
  [/^(苦艾酒)/, 'absinthe'],
  [/^(茴香酒|帕斯蒂斯)/, 'pastis'],
  [/^(甜味美思|红味美思|红味美斯)/, 'vermouth'],
  [/^(干味美思|白味美思|干味美斯)/, 'dry_vermouth'],
  [/^(菲奈特)/, 'fernet'],
  [/^(黑刺李)/, 'sloe_gin'],
  [/^(糖渍樱桃|红樱桃|马拉斯奇诺樱桃)/, 'cherry'],
  [/^(蛋清|蛋白)/, 'egg_white'],
  [/^(淡奶油|鲜奶油|奶油)/, 'cream'],
  [/^(牛奶)/, 'milk'],
  [/^(椰浆|椰奶)/, 'coconut_milk'],
  [/^(蜂蜜糖浆|3:1蜂蜜糖浆)/, 'honey_syrup'],
  [/^(蜂蜜)/, 'honey'],
  [/^(红石榴糖浆|石榴糖浆)/, 'grenadine'],
  [/^(干姜水|姜汁汽水|姜味汽水)/, 'ginger_beer'],
  [/^(姜汁啤酒)/, 'ginger_beer'],
  [/^(汤力水|通宁水)/, 'tonic'],
  [/^(雪碧)/, 'sprite'],
  [/^(雪利酒|雪莉酒)/, 'sherry'],
  [/^(香槟|气泡酒|起泡酒)/, 'sparkling_wine'],
  [/^(干白葡萄酒|白葡萄酒)/, 'white_wine'],
  [/^(柠檬皮|柠檬片)/, 'lemon_peel'],
  [/^(橙皮|橙片)/, 'orange_peel'],
  [/^(薄荷叶|薄荷)/, 'mint'],
  [/^(迷迭香)/, 'rosemary'],
  [/^(黄瓜)/, 'cucumber'],
  [/^(肉桂棒)/, 'cinnamon_stick'],
  [/^(丁香)/, 'clove'],
  [/^(肉豆蔻)/, 'nutmeg'],
  [/^(盐|盐水)/, 'salt_water'],
  [/^(冰块|冰|碎冰|方冰)/, 'ice'],
  [/^(水$|清水|纯净水)/, 'water'],
  [/^(辣椒仔|塔巴斯科)/, 'tabasco'],
  [/^(橙花水)/, 'orange_flower']
];

const names = {};
ref.forEach(r => (r.ingredients || []).forEach(i => {
  const n = String(i.n).trim();
  if (n) names[n] = (names[n] || 0) + 1;
}));
const list = Object.entries(names).sort((a, b) => b[1] - a[1]);

function propose(n) {
  const byName = I.find(g => g.name === n || g.name.replace(/（.*?）/g, '') === n);
  if (byName) return byName.id;
  for (const [re, id] of RULES) if (re.test(n)) return id;
  const part = I.find(g => g.name.includes(n) || n.includes(g.name.replace(/（.*?）/g, '')));
  return part ? part.id : '';
}

const ok = [], no = [];
list.forEach(([n, c]) => (propose(n) ? ok : no).push([n, c, propose(n)]));

console.log('材料名 ' + list.length + ' 个，出现 ' + list.reduce((s, x) => s + x[1], 0) + ' 次');
console.log('自动能对上 ' + ok.length + ' 个（占出现次数 '
  + ok.reduce((s, x) => s + x[1], 0) + '）');
console.log('对不上 ' + no.length + ' 个（占出现次数 ' + no.reduce((s, x) => s + x[1], 0) + '）\n');
console.log('===== 对不上的，按出现次数排 =====');
no.sort((a, b) => b[1] - a[1]).forEach(([n, c]) => console.log('  ' + String(c).padStart(3) + '次  ' + n));
console.log('\n===== 自动对上的（抽查前面这些对不对）=====');
ok.sort((a, b) => b[1] - a[1]).slice(0, 70)
  .forEach(([n, c, id]) => console.log('  ' + String(c).padStart(3) + '次  ' + n + '  →  ' + id));
