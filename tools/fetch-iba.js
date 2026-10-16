/* =========================================================
   从 IBA 官网抓官方配方规格（用料 / 用量 / 做法 / 装饰）
   跑法： node tools/fetch-iba.js
   产出： tools/iba-recipes.json  +  iba-recipes.js（生成物，不要手改）

   为什么用脚本：数据必须可复现、可重跑，不能由人手打进代码里。
   每条都记来源 URL 和抓取日期。IBA 会更新，将来重跑即可。
   ========================================================= */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT_JSON = path.join(__dirname, 'iba-recipes.json');
const OUT_JS = path.join(ROOT, 'iba-recipes.js');
const BASE = 'https://iba-world.com/';
const CATS = ['the-unforgettables', 'the-contemporary', 'the-new-era'];
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36';

/* 菜单里的非配方页，不用抓 */
const SKIP = new Set(['iba', 'about-us', 'constitution', 'board', 'academy', 'iba-wcc', 'guilds',
  'cocktails', 'all-cocktails', 'the-unforgettables', 'the-contemporary', 'the-new-era',
  'supporters', 'events', 'contact-us', 'privacy-policy', 'shopping-bag', 'user', 'guilds-2']);

function strip(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&#8211;/g, '-').replace(/&amp;/g, '&')
    .replace(/&#8217;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ').trim();
}

async function get(url) {
  const r = await fetch(url, { headers: { 'user-agent': UA } });
  if (!r.ok) throw new Error(url + ' → ' + r.status);
  return await r.text();
}

/* "60 ml White Cuban Ron 20 ml Lime 2 Bar Spoons Sugar" → [{am, unit, name}] */
function parseIngredients(t) {
  const re = /(\d+(?:[.,]\d+)?)\s*(ml|cl|bar spoons?|dash(?:es)?|drops?|pieces?|slices?|twists?|cubes?|g|grams?)\s*([^]*?)(?=(?:\d+(?:[.,]\d+)?\s*(?:ml|cl|bar spoons?|dash(?:es)?|drops?|pieces?|slices?|twists?|cubes?|g|grams?))|$)/gi;
  const out = [];
  let m;
  while ((m = re.exec(t)) !== null) {
    const name = m[3].replace(/\s+/g, ' ').trim().replace(/[.,;]$/, '');
    out.push({ am: parseFloat(m[1].replace(',', '.')), unit: m[2].toLowerCase(), name: name });
  }
  return out;
}

function parseRecipe(html, slug) {
  const t = strip(html);
  const i = t.indexOf('Ingredients');
  const j = t.indexOf('Method', i + 1);
  if (i < 0 || j < 0) return null;
  const g = t.indexOf('Garnish', j + 1);
  const ingTxt = t.slice(i + 'Ingredients'.length, j).trim();
  const method = t.slice(j + 'Method'.length, g > 0 ? g : j + 600).trim();
  const garnish = g > 0 ? t.slice(g + 'Garnish'.length, g + 200).split('MOST VIEWED')[0].trim() : '';
  const head = t.slice(0, i);
  const parts = head.split('/').map(s => s.trim()).filter(Boolean);
  const name = parts.length ? parts[parts.length - 1] : slug;
  const cat = parts.length > 1 ? parts[parts.length - 2] : '';
  const ingredients = parseIngredients(ingTxt);
  if (!ingredients.length) return null;
  return { slug: slug, en: name, cat: cat, ingredients: ingredients,
    method: method, garnish: garnish, url: BASE + slug + '/' };
}

async function main() {
  /* 分类页的配方链接是 JS 渲染的，HTML 里抓不到——改从 sitemap 拿全部页面地址。
     这是标准做法：先看 sitemap_index，再顺着子 sitemap 收集 <loc>。 */
  console.log('1/3 从 sitemap 收集配方地址…');
  const slugs = new Set();
  const maps = [];
  for (const f of ['sitemap_index.xml', 'sitemap.xml']) {
    try {
      const xml = await get(BASE + f);
      for (const m of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
        const u = m[1];
        if (/\.xml$/i.test(u)) maps.push(u);
        else {
          const s = u.match(/^https?:\/\/iba-world\.com\/([a-z0-9-]+)\/?$/i);
          if (s && !SKIP.has(s[1])) slugs.add(s[1]);
        }
      }
    } catch (e) { /* 没有就跳过 */ }
  }
  for (const m of maps.slice(0, 20)) {
    try {
      const xml = await get(m);
      for (const x of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
        const s = x[1].match(/^https?:\/\/iba-world\.com\/([a-z0-9-]+)\/?$/i);
        if (s && !SKIP.has(s[1])) slugs.add(s[1]);
      }
    } catch (e) { /* 单个子图失败不影响整体 */ }
  }
  console.log('   sitemap ' + maps.length + ' 个，候选配方 ' + slugs.size + ' 个');

  console.log('2/3 逐杯抓（这一趟要几分钟）…');
  const list = [];
  const failed = [];
  let n = 0;
  for (const s of slugs) {
    n++;
    try {
      const r = parseRecipe(await get(BASE + s + '/'), s);
      if (r) list.push(r); else failed.push(s + '（页面上没有用料表）');
    } catch (e) { failed.push(s + '（' + e.message + '）'); }
    if (n % 20 === 0) console.log('   …' + n + '/' + slugs.size);
  }

  console.log('3/3 写文件…');
  const data = { fetchedAt: new Date().toISOString().slice(0, 10), source: 'https://iba-world.com/', recipes: list };
  fs.writeFileSync(OUT_JSON, JSON.stringify(data, null, 1), 'utf8');
  fs.writeFileSync(OUT_JS, '/* 生成物，不要手改：node tools/fetch-iba.js\n'
    + '   来源 IBA 官网 ' + data.source + '，抓取日期 ' + data.fetchedAt + ' */\n'
    + 'var IBA_RECIPES = ' + JSON.stringify(list) + ';\n', 'utf8');

  /* 和我们库里的 191 条对一下英文名，看能匹配上多少 */
  const refSrc = fs.readFileSync(path.join(ROOT, 'ref-recipes.js'), 'utf8');
  const ref = JSON.parse(refSrc.slice(refSrc.indexOf('['), refSrc.lastIndexOf(']') + 1));
  const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const refMap = {};
  ref.forEach(r => { if (r.en) refMap[norm(r.en)] = r.zh || r.en; });
  const matched = [], missed = [];
  list.forEach(x => { const hit = refMap[norm(x.en)]; if (hit) matched.push(hit + ' ← ' + x.en); else missed.push(x.en); });

  console.log('');
  console.log('抓到 ' + list.length + ' 杯官方配方（失败 ' + failed.length + '）');
  console.log('和我们那 191 条对上 ' + matched.length + ' 杯');
  console.log('对不上的（' + missed.length + '）：' + missed.slice(0, 40).join('、'));
  if (failed.length) console.log('抓失败：' + failed.slice(0, 15).join('、'));
}

main().catch(e => { console.error('出错：' + e.message); process.exitCode = 1; });
