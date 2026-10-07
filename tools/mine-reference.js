/* 从参考网页里提取内置配方数据并做统计（一次性工具） */
const fs = require('fs');
const path = require('path');

const file = process.argv[2];
const html = fs.readFileSync(file, 'utf8');

const start = html.indexOf('[{"id":"r0');
if (start < 0) throw new Error('找不到配方数据起点');

/* 括号配平找结尾（考虑字符串内的引号） */
let depth = 0, inStr = false, esc = false, end = -1;
for (let i = start; i < html.length; i++) {
  const c = html[i];
  if (inStr) {
    if (esc) esc = false;
    else if (c === '\\') esc = true;
    else if (c === '"') inStr = false;
    continue;
  }
  if (c === '"') inStr = true;
  else if (c === '[' || c === '{') depth++;
  else if (c === ']' || c === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
}

const data = JSON.parse(html.slice(start, end));
console.log('配方总数 =', data.length);

const byCat = {};
data.forEach(r => byCat[r.cat || '?'] = (byCat[r.cat || '?'] || 0) + 1);
console.log('分类 =', JSON.stringify(byCat));

const freq = {};
data.forEach(r => (r.ingredients || []).forEach(i => freq[i.n] = (freq[i.n] || 0) + 1));
const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 60);
console.log('\n---- 出现最多的 60 种材料 ----');
top.forEach(([n, c]) => console.log(String(c).padStart(3) + '  ' + n));

console.log('\n---- 所有含威士忌的配方 ----');
data.filter(r => (r.ingredients || []).some(i => /威士忌|波本|黑麦|麦芽|Bourbon|Whisky|Whiskey/.test(i.n)))
  .forEach(r => {
    console.log('\n[' + r.zh + ' / ' + (r.en || '') + ']  ' + (r.method || '') + ' · ' + (r.glass || ''));
    (r.ingredients || []).forEach(i => console.log('     ' + i.n + '  ' + i.a));
    if (r.note) console.log('     注：' + r.note);
  });

fs.writeFileSync(path.join(__dirname, 'reference-recipes.json'), JSON.stringify(data, null, 1), 'utf8');
console.log('\n已导出 tools/reference-recipes.json');
