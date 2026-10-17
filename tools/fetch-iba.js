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
    /* 页面上每样材料、每个步骤都各自成行（<li> / <p> / <br>）。
       以前直接把标签压成空格，行就没了：材料里"20 ml Sugar Syrup"后面那行
       "Few Drops of Egg White (Optional)" 会被当成糖浆名字的一部分吞掉。
       所以块级标签先换成换行，让 parseIngredients 能一行一行读。 */
    .replace(/<\/?(?:li|p|div|br|tr|h[1-6])[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&#8211;/g, '-').replace(/&amp;/g, '&')
    .replace(/&#8217;/g, "'").replace(/&quot;/g, '"')
    /* 数字实体（&#8220; 这种弯引号）统一解码——不然后面渲染时会被再转义一次，
       页面上出现的是字面的 &#8220; */
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

async function get(url) {
  const r = await fetch(url, { headers: { 'user-agent': UA } });
  if (!r.ok) throw new Error(url + ' → ' + r.status);
  return await r.text();
}

/* 一行一样材料："60 ml White Cuban Ron" → {am:60, unit:'ml', name:'White Cuban Ron'}
   没写量的那行（"Few Drops of Egg White (Optional)"、"2-3 quarter size sliced fresh ginger"）
   整行当名字存下来，am 记 null——不许猜它等于几毫升。 */
function parseIngredients(t) {
  const U = 'ml|cl|bar spoons?|dash(?:es)?|drops?|pieces?|pcs|slices?|twists?|cubes?|'
    + 'tsp|teaspoons?|tbsp|tablespoons?|sprigs?|g|grams?';
  const re = new RegExp('^(\\d+(?:[.,]\\d+)?)\\s*(' + U + ')\\s*([\\s\\S]*)$', 'i');
  const out = [];
  String(t).split('\n').forEach(function (line) {
    const s = line.replace(/\s+/g, ' ').trim();
    if (!s) return;
    const m = s.match(re);
    if (m) {
      out.push({
        am: parseFloat(m[1].replace(',', '.')),
        unit: m[2].toLowerCase(),
        name: m[3].replace(/\s+/g, ' ').trim().replace(/[.,;]$/, '')
      });
    } else {
      out.push({ am: null, unit: '', name: s });   /* 没写量：整行就是它的名字 */
    }
  });
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
  /* H1 后面会粘上"186628 views""Play Video"这类杂质，得剪掉，否则和我们的名字对不上。
     注意：strip() 现在保留换行，这些杂质各自占一行，所以 `.` 系的正则跨不过去——
     必须用 [\s\S]，而且要从"views"一路吃到结尾。 */
  const name = (parts.length ? parts[parts.length - 1] : slug)
    .replace(/\s*\d[\d,]*\s*views[\s\S]*$/i, '')
    .replace(/\s*Play Video[\s\S]*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
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

  /* 拿不到 IBA 的完整清单（配方页是 JS 渲染的，也不在 sitemap 里），所以反过来：
     用我们那 191 条自带的英文名去猜地址（Daiquiri → /daiquiri/）。
     能抓到才算这一杯有官方规格；404 / 解析不出就跳过。
     ——只在页面真实存在且解析成功时才收录，绝不靠记忆往数据里补。 */
  const refTxt = fs.readFileSync(path.join(ROOT, 'ref-recipes.js'), 'utf8');
  const refAll = JSON.parse(refTxt.slice(refTxt.indexOf('['), refTxt.lastIndexOf(']') + 1));
  /* 英文名和 IBA 地址不一致的特例：只写"名字 → 地址"，不写任何配方内容 */
  const EXTRA = {
    'Whiskey Sour': ['whisky-sour'], 'Dry Martini': ['martini'],
    'Long Island Ice Tea': ['long-island-iced-tea'], 'Pina Colada': ['pina-colada'],
    'Mai Tai': ['mai-tai'], "Bee's Knees": ['bees-knees'], 'French 75': ['french-75'],
    'Corpse Reviver #2': ['corpse-reviver-no-2'], "Tommy's Margarita": ['tommys-margarita']
  };
  /* 撇号要先去掉再连字符化：Bee's Knees → bees-knees（不是 bee-s-knees） */
  const slugify = s => String(s || '').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  refAll.forEach(r => {
    const base = slugify(r.en);
    if (base) slugs.add(base);
    (EXTRA[r.en] || []).forEach(a => slugs.add(a));
  });
  console.log('   加上按名字猜的地址，候选共 ' + slugs.size + ' 个');

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
