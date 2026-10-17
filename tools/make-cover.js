/* =========================================================
   做小红书封面：先无头浏览器截真实网页，再排版成 1080×1440 的图
   跑法：
     $env:NODE_PATH='<运行时的 node_modules>'
     node tools/make-cover.js
   产物：assets/xhs-cover-a.png / -b.png / -c.png
   ========================================================= */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'assets');
const APP = pathToFileURL(path.join(ROOT, 'dist', 'index.html')).href;
const CHROME = process.env.COVER_CHROME ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const W = 1080, H = 1440;      /* 小红书 3:4 */

/* 封面用的那杯酒：莫吉托（绿色点缀 + 气泡，截图好看） */
const DRINK = [['havana3', 45], ['lime', 20], ['syrup', 15], ['mint', 8], ['soda', 60]];
/* 反差那张封面要用"一整杯冰 + 45ml 纯饮威士忌"，数字才和上面那行对得上 */
const NEAT = {
  glass: 'icecup', ice: 'full', items: [['glenlivet', 45]]
};

function px(n) { return n + 'px'; }

async function shots() {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage({
    viewport: { width: 430, height: 1600 },
    deviceScaleFactor: 2
  });
  await page.goto(APP, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  /* 顶部那条 header 是 sticky 的，截图会压在面板上；截图期间先把它藏掉 */
  await page.addStyleTag({ content: '.topbar { display: none !important; }' });
  /* 用页面自己的接口装一杯，保证和真实使用完全一样 */
  const load = async (glass, ice, items) => {
    await page.evaluate((o) => {
      BarMix.state.glass = o.glass;
      BarMix.state.iceLevel = o.ice;
      BarMix.state.method = 'build';
      BarMix.state.taste = 'normal';
      BarMix.load(o.items);
    }, { glass, ice, items });
    await page.waitForTimeout(260);
  };

  await load('highball', 'full', DRINK);
  const cup = await page.locator('.p-cup').screenshot();
  const result = await page.locator('.p-result').screenshot();

  await load(NEAT.glass, NEAT.ice, NEAT.items);
  const neat = await page.locator('.p-cup').screenshot();

  await browser.close();
  return { cup: cup.toString('base64'), result: result.toString('base64'), neat: neat.toString('base64') };
}

const CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${px(W)}; height: ${px(H)}; overflow: hidden; }
  body {
    font-family: "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", sans-serif;
    background: #12100f; color: #f3ebe3; position: relative;
  }
  .glow1 { position: absolute; left: -160px; top: -120px; width: 900px; height: 760px;
    background: radial-gradient(closest-side, rgba(224,163,92,.34), rgba(224,163,92,0) 70%); }
  .glow2 { position: absolute; right: -220px; top: 120px; width: 860px; height: 700px;
    background: radial-gradient(closest-side, rgba(201,111,58,.30), rgba(201,111,58,0) 70%); }
  .glow3 { position: absolute; left: 200px; bottom: -260px; width: 900px; height: 700px;
    background: radial-gradient(closest-side, rgba(106,168,216,.16), rgba(106,168,216,0) 70%); }
  .wrap { position: relative; width: 100%; height: 100%; }
  .brand { display: flex; align-items: center; gap: 16px; font-size: 30px; color: #cbbdb0;
    letter-spacing: .04em; }
  .brand i { width: 18px; height: 18px; border-radius: 50%; background: #e0a35c;
    box-shadow: 0 0 26px 6px rgba(224,163,92,.55); }
  h1 { font-size: 108px; line-height: 1.14; font-weight: 800; letter-spacing: -.01em; }
  h1 em { font-style: normal; color: #e0a35c; }
  .sub { font-size: 40px; line-height: 1.5; color: #d8ccbf; margin-top: 24px; font-weight: 500; }
  .note { font-size: 32px; color: #a3978c; margin-top: 16px; }
  .head { position: absolute; left: 84px; right: 84px; top: 88px; }
  .shot { position: absolute; left: 92px; right: 92px; bottom: -30px;
    border-radius: 30px 30px 0 0; overflow: hidden; background: #1e1a18;
    border: 1px solid rgba(255,255,255,.14);
    box-shadow: 0 -18px 70px rgba(0,0,0,.55), 0 0 0 10px rgba(255,255,255,.03); }
  .shot img { width: 100%; display: block; }
  .chip { position: absolute; left: 84px; display: inline-flex; align-items: center;
    gap: 14px; padding: 16px 28px; border-radius: 999px; font-size: 32px; font-weight: 700;
    color: #1c1409; background: #e0a35c; box-shadow: 0 10px 30px rgba(224,163,92,.35); }
  .chip.plain { background: rgba(255,255,255,.10); color: #f3ebe3;
    border: 1px solid rgba(255,255,255,.18); box-shadow: none; }
`;

function page(head, chip, shotB64, opts) {
  const o = opts || {};
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head>
  <body>
    <div class="glow1"></div><div class="glow2"></div><div class="glow3"></div>
    <div class="wrap">
      <div class="head">
        <div class="brand"><i></i>调酒台 · 风味配比实验室</div>
        <h1>${head}</h1>
        <p class="sub">${o.sub || ''}</p>
        ${o.note ? `<p class="note">${o.note}</p>` : ''}
      </div>
      ${chip ? `<div class="chip${o.plainChip ? ' plain' : ''}" style="top:${px(o.chipTop)}">${chip}</div>` : ''}
      <div class="shot" style="top:${px(o.shotTop)}"><img src="data:image/png;base64,${shotB64}"></div>
    </div>
  </body></html>`;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const s = await shots();

  const covers = [
    ['xhs-cover-a.png', page('冰越多，<br>酒<em>反而越浓</em>？',
      '40.0% → 18.0%', s.neat, {
        sub: '我做了个网页，把这杯算给你看',
        note: '45ml 威士忌倒进一整杯冰，放二十分钟',
        chipTop: 600, shotTop: 720 })],
    ['xhs-cover-b.png', page('调酒<br>不用猜比例',
      '', s.result, {
        sub: '输进去材料，实时出风味图和分数',
        note: '网页工具 · 不用下载 · 手机也能开',
        shotTop: 560 })],
    ['xhs-cover-c.png', page('我做了个<br>调酒网页',
      '🙏 缺人来挑毛病', s.cup, {
        sub: '挑材料 → 出风味图 → 下一步加什么',
        plainChip: true, chipTop: 570, shotTop: 690 })],
    ['xhs-cover-d.png', page('一杯酒<br>好不好喝<br><em>先算一遍</em>',
      '', s.cup, {
        shotTop: 620,
        note: '风味图 · 分数 · 化水预测 · 调整建议' })],
    ['xhs-cover-e.png', page('把便利店<br>买的东西<em>调成酒</em>',
      '178 样材料 · 44 个配方', s.cup, {
        sub: '点材料 → 实时风味图 → 打分和改法',
        plainChip: true, chipTop: 600, shotTop: 720 })]
  ];

  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const p = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  for (const [name, html] of covers) {
    await p.setContent(html, { waitUntil: 'load' });
    await p.waitForTimeout(220);
    const buf = await p.screenshot({ clip: { x: 0, y: 0, width: W, height: H } });
    const file = path.join(OUT, name);
    fs.writeFileSync(file, buf);
    console.log('写好 ' + file + '　' + Math.round(buf.length / 1024) + ' KB');
  }
  await browser.close();
})();
