/* =========================================================
   把 index.html / app.css / data.js / app.js 打包成一个单文件
   产物：dist/index.html（托管用）和 dist/调酒台.html（发给别人用）
   跑法：node tools/build.js
   ========================================================= */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const dir = path.join(__dirname, '..');
const dist = path.join(dir, 'dist');

const read = f => fs.readFileSync(path.join(dir, f), 'utf8');

let html = read('index.html');
const css = read('app.css');
const dataJs = read('data.js');
const appJs = read('app.js');

/* 内联的 JS 里如果出现 </script> 会把标签提前闭合，必须拆开 */
const safe = s => s.replace(/<\/script/gi, '<\\/script');

/* 一个不用外部图片的图标：杯子里三颗颗粒 */
const favicon = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
  '<rect width="64" height="64" rx="12" fill="#efe7d8"/>' +
  '<path d="M18 14 L22 52 L42 52 L46 14" fill="none" stroke="#3b3229" stroke-width="4" stroke-linejoin="round"/>' +
  '<circle cx="28" cy="38" r="4" fill="#d9782e"/><circle cx="37" cy="32" r="4" fill="#6b4322"/>' +
  '<polygon points="33,44 38,49 33,54 28,49" fill="#ffffff" stroke="#3b3229" stroke-width="2"/>' +
  '</svg>');

html = html.replace(/<link rel="stylesheet" href="app\.css">\s*/, '');
html = html.replace(/<script src="data\.js"><\/script>\s*/, '');
html = html.replace(/<script src="app\.js"><\/script>\s*/, '');

/* 分享用的 meta + 图标 */
html = html.replace('</head>',
  '<link rel="icon" href="' + favicon + '">\n' +
  '<link rel="manifest" href="manifest.webmanifest">\n' +
  '<link rel="apple-touch-icon" href="icon-192.png">\n' +
  '<meta name="description" content="挑材料倒进杯子，实时看风味图、评分和调节建议。不用登录、不用联网、不用装东西。">\n' +
  '<meta property="og:title" content="调酒台 · 风味配比实验室">\n' +
  '<meta property="og:description" content="挑材料倒进杯子，实时看风味图、评分和调节建议。">\n' +
  '<style>\n' + css + '\n</style>\n</head>');

html = html.replace('</body>',
  '<script>\n' + safe(dataJs) + '\n</script>\n' +
  '<script>\n' + safe(appJs) + '\n</script>\n</body>');

fs.mkdirSync(dist, { recursive: true });
fs.writeFileSync(path.join(dist, 'index.html'), html, 'utf8');
fs.writeFileSync(path.join(dist, '调酒台.html'), html, 'utf8');

/* 自检：产物里不该再有任何本地文件引用 */
const leftovers = [];
['app.css', 'app.js', 'data.js'].forEach(f => {
  if (html.includes('"' + f + '"') || html.includes("'" + f + "'")) leftovers.push(f);
});
const scripts = (html.match(/<script/g) || []).length;
const closes = (html.match(/<\/script>/g) || []).length;

console.log('产物：dist/index.html 和 dist/调酒台.html');
const kb = (s) => (Buffer.byteLength(s, 'utf8') / 1024).toFixed(1);
console.log('  大小 ' + kb(html) + ' KB　（原始四个文件合计 '
  + kb(css + dataJs + appJs) + ' KB）');
console.log('  <script> ' + scripts + ' 个，</script> ' + closes + ' 个' + (scripts === closes ? '　配平 ✓' : '　⚠ 不配平'));
console.log('  残留的本地文件引用：' + (leftovers.length ? leftovers.join('、') + ' ⚠' : '无 ✓'));
console.log('  外部网络请求：' + (/https?:\/\//.test(html.replace(/og:|w3\.org/g, '')) ? '有 ⚠' : '无 ✓（双击就能用，完全离线）'));

/* ---------------- 真的跑一遍：把内联脚本抽出来执行 ---------------- */
const blocks = Array.from(html.matchAll(/<script>([\s\S]*?)<\/script>/g)).map(m => m[1]);
const els = {};
global.window = global;
/* 页面里那段"启动自检"用了这两个 API，校验环境里给个空实现就行 */
global.addEventListener = function () {};
const realSetTimeout = global.setTimeout;
global.setTimeout = function () {};
global.document = {
  getElementById(id) {
    if (!els[id]) els[id] = { innerHTML: '', textContent: '', hidden: false, dataset: {},
      setAttribute() {}, addEventListener() {}, scrollIntoView() {}, closest() { return null; },
      classList: { toggle() {}, add() {}, remove() {} } };
    return els[id];
  },
  addEventListener() {}
};
try {
  eval(blocks.join('\n'));
  const presetCards = (els.presets.innerHTML.match(/class="preset"/g) || []).length;
  const glassChips = (els.glassPick.innerHTML.match(/class="gchip/g) || []).length;
  const libChips = (els.lib.innerHTML.match(/class="chip/g) || []).length;
  const glassDrawn = els.glassPreview.innerHTML.length > 200;
  const ok = presetCards > 0 && glassChips > 0 && libChips > 0 && glassDrawn;
console.log('  跑起来：配方卡 ' + presetCards + ' 张、杯型 ' + glassChips + ' 个、材料 ' + libChips
    + ' 个、杯子预览 ' + (glassDrawn ? '画出来了' : '没画出来') + '　' + (ok ? '✓' : '⚠'));
  if (!ok) process.exitCode = 1;
} catch (e) {
  console.log('  ⚠ 内联脚本跑不起来：' + e.message);
  process.exitCode = 1;
} finally {
  global.setTimeout = realSetTimeout;
}

/* =========================================================
   发布用的附属文件：图标（PNG）+ PWA 清单 + .nojekyll
   图标用纯 JS 画：一个小杯子 + 三颗颗粒 + 一块冰，跟页面里的预览图同款
   ========================================================= */
var crcTable = (function () {
  var t = [];
  for (var n = 0; n < 256; n++) {
    var c = n;
    for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  var c = 0xFFFFFFFF;
  for (var i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function png(w, h, rgba) {
  var raw = Buffer.alloc((w * 4 + 1) * h);
  for (var y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  function chunk(type, data) {
    var len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    var t = Buffer.from(type, 'ascii');
    var crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
    return Buffer.concat([len, t, data, crc]);
  }
  var ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))]);
}

function drawIcon(size) {
  var buf = Buffer.alloc(size * size * 4);
  var S = size / 512;
  function put(x, y, r, g, b, a) {
    var i = (y * size + x) * 4;
    var A = (a === undefined ? 255 : a) / 255;
    buf[i] = Math.round(buf[i] * (1 - A) + r * A);
    buf[i + 1] = Math.round(buf[i + 1] * (1 - A) + g * A);
    buf[i + 2] = Math.round(buf[i + 2] * (1 - A) + b * A);
    buf[i + 3] = 255;
  }
  /* 杯身：外梯形减内梯形 = 一圈描边，跟页面里预览图的画法一致 */
  var TOP = 108, BOT = 412, TOPHW = 142, BOTHW = 80, CX = 256;
  function inTrap(X, Y, inset) {
    if (Y < TOP + inset || Y > BOT - inset) return false;
    var t = (Y - (TOP + inset)) / ((BOT - inset) - (TOP + inset));
    var hw = (TOPHW - inset) + ((BOTHW - inset) - (TOPHW - inset)) * t;
    return Math.abs(X - CX) <= hw;
  }
  for (var y = 0; y < size; y++) {
    for (var x = 0; x < size; x++) {
      var X = x / S, Y = y / S;
      put(x, y, 239, 231, 216);                       /* 米白纸 */
      if (inTrap(X, Y, 0) && !inTrap(X, Y, 13)) {
        put(x, y, 59, 50, 41);                        /* 杯子描边 */
      }
      /* 三颗颗粒：酸（黄）/ 酒（深棕）/ 果汁（橙） */
      [[206, 312, 26, 224, 169, 44], [256, 276, 24, 107, 67, 34],
       [232, 372, 25, 217, 120, 46]].forEach(function (c) {
        var dx = X - c[0], dy = Y - c[1];
        if (dx * dx + dy * dy <= c[2] * c[2]) put(x, y, c[3], c[4], c[5]);
      });
      /* 一块冰（白色菱形），放在颗粒上面、杯子里面 */
      var dd = Math.abs(X - 292) + Math.abs(Y - 336);
      if (dd <= 36) {
        put(x, y, 255, 255, 255);
        if (dd > 33.5) put(x, y, 59, 50, 41);
      }
    }
  }
  return png(size, size, buf);
}

fs.writeFileSync(path.join(dist, 'icon-192.png'), drawIcon(192));
fs.writeFileSync(path.join(dist, 'icon-512.png'), drawIcon(512));
fs.writeFileSync(path.join(dist, '.nojekyll'), '', 'utf8');   /* GitHub Pages 需要它 */
fs.writeFileSync(path.join(dist, 'manifest.webmanifest'), JSON.stringify({
  name: '调酒台 · 风味配比实验室',
  short_name: '调酒台',
  description: '挑材料倒进杯子，实时看风味图、评分和调节建议。不用登录、不用联网。',
  start_url: '.',
  display: 'standalone',
  background_color: '#12100f',
  theme_color: '#12100f',
  lang: 'zh-CN',
  icons: [
    { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
  ]
}, null, 1) + '\n', 'utf8');

console.log('  附属文件：icon-192.png、icon-512.png、manifest.webmanifest、.nojekyll');
