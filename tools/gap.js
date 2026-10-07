/* =========================================================
   缺口分析：拿参考配方字典（191 条经典配方）对一遍，
   找出"实际配方里用得最多、但材料库里还没有"的东西。
   跑法：node tools/gap.js
   ========================================================= */
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..');

const recipes = JSON.parse(fs.readFileSync(path.join(__dirname, 'reference-recipes.json'), 'utf8'));

/* 材料库里的名字（用 data.js 的文本粗读，避免起一个 node 沙箱） */
const dataSrc = fs.readFileSync(path.join(dir, 'data.js'), 'utf8');
const have = [];
const re = /\{ id:'[a-z_0-9]+', cat:'[a-z]+'(?:, sub:'[a-z]+')?, name:'([^']+)'/g;
let m;
while ((m = re.exec(dataSrc))) have.push(m[1]);

const haveText = have.join(' ');

/* 同一个东西的不同叫法：字典里叫 X，库里叫 Y */
const ALIAS = {
  '黄柠檬汁': '柠檬', '柠檬酸溶液': '柠檬', '青柠汁': '青柠', '酸橙': '青柠',
  '瑞顿房黑麦威士忌': '黑麦', '水牛足迹波本': '波本', '波本威士忌': '波本',
  '苏格兰威士忌': '苏格兰', '苏格兰调和性威士忌': '苏格兰',
  '干金酒': '金酒', '老汤姆金酒': '老汤姆', '哥顿金酒（南非）': '哥顿',
  '白朗姆酒': '白朗姆', '白朗姆': '白朗姆', '黑朗姆': '黑朗姆',
  '加力安奴': '加力安奴', '法国当酒': '当酒', '帝萨诺杏仁利口酒': '杏仁',
  '比特储斯紫罗兰利口酒': '紫罗兰', '比特储斯黄杏利口酒': '杏',
  '比特储斯黄杏': '杏', '飘仙一号': '皮姆',
  '龙舌兰': '龙舌兰', '梅斯卡尔': '美斯卡尔', 'Mezcal': '美斯卡尔',
  '黄柠檬': '柠檬', '鲜奶油': '淡奶油', '鲜奶': '牛奶',
  '干姜水': '干姜', '姜汁啤酒': '姜汁啤酒', '汤力水': '汤力',
  '苏打水': '苏打', '香槟': '气泡酒', '起泡酒': '气泡酒', '红葡萄酒': '红酒',
  '热水': '热水', '热咖啡': '咖啡', '意式浓缩咖啡': '咖啡',
  '砂糖': '糖', '糖': '糖浆', '方糖': '方糖', '红糖': '红糖', '红糖浆': '红糖',
  '1:10盐水': '盐水', '柠檬片': '柠檬皮', '橙子片': '橙皮', '黄瓜条': '黄瓜',
  '生姜片': '生姜', '桃子果泥': '桃', '百香果果茸': '百香果',
  '水妈妈椰浆': '椰浆', 'Nonino Amaro': 'Nonino', 'Aperol 阿佩罗': '阿佩罗',
  'Yellow Chartreuse 查特黄': '查特', '添加利': '添加利', '牛奶': '牛奶'
};

function covered(name) {
  /* ① 同义名 */
  for (const k in ALIAS) if (name.indexOf(k) >= 0 && haveText.indexOf(ALIAS[k]) >= 0) return true;
  /* ② 名字本身或去掉后缀后出现在库里 */
  const cands = [name, name.replace(/(利口酒|酒|汁|糖浆|片|条|块|个|粒)$/,'')];
  for (const c of cands) if (c.length >= 2 && haveText.indexOf(c) >= 0) return true;
  /* ③ 去掉产地/品牌前缀后的核心词 */
  const core = name.replace(/^(比特储斯|皮埃尔费朗|水妈妈|缇欧佩佩)/, '').replace(/(利口酒|酒|汁|糖浆)$/,'');
  if (core.length >= 2 && core !== name && haveText.indexOf(core) >= 0) return true;
  return false;
}

const freq = {};
recipes.forEach(r => (r.ingredients || []).forEach(i => {
  const n = (i.n || '').trim();
  if (n) freq[n] = (freq[n] || 0) + 1;
}));

const missing = Object.entries(freq)
  .filter(([n]) => !covered(n))
  .sort((a, b) => b[1] - a[1]);

console.log('材料库里有 ' + have.length + ' 条。');
console.log('参考字典里出现、但库里没覆盖的材料（按出现次数排）：\n');
missing.forEach(([n, c]) => console.log('  ' + String(c).padStart(2) + ' 次  ' + n));
console.log('\n共 ' + missing.length + ' 条待补。');
