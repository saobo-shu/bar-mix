/* =========================================================
   调酒台 · 逻辑
   ========================================================= */
(function () {
  'use strict';

  var DIMS = [
    /* ref = 这根轴画到满格需要多少浓度。
       参照值原来是拍脑袋定的，量了 44 个经典配方之后发现定得太低——
       很多轴一到 14 就顶到 100%，于是"很酸"和"特别酸"在图上长得一模一样。
       现在的值是各维度的 95 分位再留一点余量。 */
    { k: 'sugar',  name: '甜',   ref: 26 },
    { k: 'acid',   name: '酸',   ref: 24 },
    { k: 'bitter', name: '苦',   ref: 28 },
    { k: 'booze',  name: '酒感', ref: 26 },
    { k: 'fruit',  name: '果香', ref: 28 },
    { k: 'spice',  name: '香料', ref: 32 },
    { k: 'fizz',   name: '气泡', ref: 10 },
    { k: 'body',   name: '醇厚', ref: 24 }
  ];

  var SRC_NAME = { near: '便利店', rt: '超市', web: '网购' };

  /* 六大基酒各占一个分类标签，用这个方法统一判断"这是不是基酒" */
  var BASE_CATS = {
    whisky: 1, gin: 1, rum: 1, vodka: 1, tequila: 1, brandy: 1, otherbase: 1
  };
  function isBase(g) { return !!BASE_CATS[g.cat]; }
  /* 这瓶酒实际用的度数：用户改过就用他改的 */
  function abvOf(g) {
    var v = state.abv[g.id];
    return (typeof v === 'number' && v >= 0 && v <= 80) ? v : g.abv;
  }

  /* 现实里的容器：一个便利店标准冰杯，加满冰之后能加的液体大约 200ml。
     大部分人在住处调酒都是往这样一个冰杯里加，液体很少超过这个数。 */
  var CUP_ML = 200;

  /* 每个杯型的画法：outer 是描边的外轮廓，inner 是内部区域的多边形
     （既用来裁剪、也用来铺颗粒）。画布 100 × 150，杯子站在 y≈134 的地面上。 */
  var GLASS_ART = {
    icecup: {
      outer: 'M17,20 L29,137 L71,137 L83,20',
      rim: 'M17,20 L83,20',
      inner: [[22, 27], [33, 132], [67, 132], [78, 27]],
      top: 27, bottom: 132
    },
    highball: {
      outer: 'M22,16 L26,140 L74,140 L78,16',
      rim: 'M22,16 L78,16',
      inner: [[27, 23], [31, 135], [69, 135], [73, 23]],
      top: 23, bottom: 135
    },
    rocks: {
      outer: 'M14,70 L19,141 L81,141 L86,70',
      rim: 'M14,70 L86,70',
      inner: [[20, 77], [25, 135], [75, 135], [80, 77]],
      top: 77, bottom: 135
    },
    coupe: {
      outer: 'M16,34 Q16,72 50,72 Q84,72 84,34',
      rim: 'M16,34 L84,34',
      stem: 'M50,72 L50,128',
      foot: 'M26,134 Q50,125 74,134',
      inner: [[21, 39], [22, 48], [25, 56], [31, 62], [40, 67], [50, 68],
              [60, 67], [69, 62], [75, 56], [78, 48], [79, 39]],
      top: 39, bottom: 68
    },
    hurricane: {
      outer: 'M20,18 Q16,56 32,74 Q42,86 44,96 L56,96 Q58,86 68,74 Q84,56 80,18',
      rim: 'M20,18 L80,18',
      stem: 'M50,96 L50,128',
      foot: 'M26,134 Q50,125 74,134',
      inner: [[25, 24], [23, 34], [24, 44], [28, 53], [34, 61], [41, 68], [45, 76],
              [46, 84], [46, 92], [54, 92], [54, 84], [55, 76], [59, 68], [66, 61],
              [72, 53], [76, 44], [77, 34], [75, 24]],
      top: 24, bottom: 92
    },
    shot: {
      outer: 'M32,84 L37,140 L63,140 L68,84',
      rim: 'M32,84 L68,84',
      inner: [[36, 90], [40, 135], [60, 135], [64, 90]],
      top: 90, bottom: 135
    },
    mug: {
      outer: 'M20,30 L24,138 L76,138 L80,30',
      rim: 'M20,30 L80,30',
      handle: 'M80,54 Q98,62 98,82 Q98,102 80,110',
      inner: [[25, 36], [29, 133], [71, 133], [75, 36]],
      top: 36, bottom: 133
    }
  };

  /* 材料的"粒子"样式：颜色按类别给（一眼看出是哪一类材料），
     形状按材料 id 分配（同类里也能分清谁是谁）。 */
  var CAT_STYLE = {
    /* 六种基酒用同一族深色调，跟果汁/气泡那些浅色分开——
       一眼能看出"深色的是酒，浅色的是配料"，同类之间再靠形状区分 */
    whisky:  '#6b4322',
    gin:     '#7a6a3a',
    rum:     '#8a5228',
    vodka:   '#948b80',
    tequila: '#6d7a45',
    brandy:  '#8c5a3c',
    otherbase: '#7a6a58',
    liqueur: '#a8593a',
    wine:    '#7d3a4a',
    sour:    '#e0a92c',
    sweet:   '#ecd694',
    juice:   '#d9782e',
    mixer:   '#cbb894',
    teacoffee: '#a8845a',
    dairy:   '#e8ded0',
    bitter:  '#8d3b2a',
    garnish: '#7d8f4a',
    ice:     '#ffffff'
  };
  var SHAPE_ORDER = ['circle', 'triangle', 'square', 'diamond', 'hex'];

  function hashStr(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  /* 固定种子的随机数：同样的配方每次画出同样的图，不会闪来闪去 */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function polyPath(pts) {
    return 'M' + pts.map(function (p) { return p[0] + ',' + p[1]; }).join(' L') + ' Z';
  }
  function insidePoly(pts, x, y) {
    var inside = false;
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      var xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }
  function shapeEl(kind, x, y, s, fill) {
    var h = s / 2, f = ' fill="' + fill + '"';
    var X = x.toFixed(1), Y = y.toFixed(1), H = h.toFixed(1);
    switch (kind) {
      case 'triangle':
        return '<polygon points="' + X + ',' + (y - h).toFixed(1) + ' ' + (x + h).toFixed(1) + ',' + (y + h).toFixed(1)
          + ' ' + (x - h).toFixed(1) + ',' + (y + h).toFixed(1) + '"' + f + '/>';
      case 'square':
        return '<rect x="' + (x - h).toFixed(1) + '" y="' + (y - h).toFixed(1) + '" width="' + s.toFixed(1)
          + '" height="' + s.toFixed(1) + '" rx="' + (s * 0.22).toFixed(1) + '"' + f + '/>';
      case 'diamond':
        return '<polygon points="' + X + ',' + (y - h).toFixed(1) + ' ' + (x + h).toFixed(1) + ',' + Y
          + ' ' + X + ',' + (y + h).toFixed(1) + ' ' + (x - h).toFixed(1) + ',' + Y + '"' + f + '/>';
      case 'hex':
        var p = [];
        for (var k = 0; k < 6; k++) {
          var a = Math.PI / 6 + k * Math.PI / 3;
          p.push((x + Math.cos(a) * h).toFixed(1) + ',' + (y + Math.sin(a) * h).toFixed(1));
        }
        return '<polygon points="' + p.join(' ') + '"' + f + '/>';
      default:
        return '<circle cx="' + X + '" cy="' + Y + '" r="' + h.toFixed(2) + '"' + f + '/>';
    }
  }
  /* 含乳脂的：碰到柠檬/青柠会结块，而且要避开"补酸"这类建议 */
  var DAIRY_FAT = {
    milk: 1, cream: 1, coconut_milk: 1, baileys: 1, yogurt: 1,
    vitasoy: 1, coconut_drink: 1, wangzai: 1
  };
  /* 乳酸菌饮料：虽然也是奶系，但又稀又自带酸，加柠檬完全没问题 */
  var LACTIC = { yakult: 1, calpis: 1 };
  /* "是不是热饮"不再写死在这里——每样材料自己带温度（见 data.js 的 TEMPS） */

  var BY_ID = {};
  INGREDIENTS.forEach(function (g) { BY_ID[g.id] = g; });

  var state = {
    cat: 'whisky',
    cup: new Map(),
    hideRisky: false,
      swapOpen: false,
      glass: 'icecup',
      taste: 'normal',
      iceLevel: 'full',
      scheme: 'balanced',
      /* 做法决定准备时加多少水（兑和 0 / 搅拌 20% / 摇和 25%） */
      method: 'build',
      /* 用户自己改过的材料温度（id → 温度 id）。默认值从材料分类来，
         因为同一瓶饮料有人从冰箱拿、有人从货架拿。 */
      temps: {},
      /* 用户自己改过的酒精度（id → 度数）。装瓶度数分国家版本，
         以手上那瓶为准，所以允许覆盖。 */
      abv: {},
      /* 杯子里哪几行说明展开了（点一下切换） */
      open: {}
    };

  /* ---------------------------------------------------------
     工具函数
     --------------------------------------------------------- */
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function interp(x, pts) {
    if (x <= pts[0][0]) return pts[0][1];
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i];
      if (x <= b[0]) return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
    }
    return pts[pts.length - 1][1];
  }

  function fmtAmt(g, amt) {
    var s = (Math.round(amt * 10) / 10).toString();
    return g.unit === 'ml' ? s + 'ml' : s + ' ' + g.unit;
  }

  /* 保存档案：单条材料没写就用它所在分类的默认值 */
  function storeOf(g) {
    return STORE[g.id] || STORE_DEFAULT[g.cat] || STORE_DEFAULT.sweet;
  }

  /* 近似 pH → 每毫升的"滴定酸量"（纯柠檬汁 pH 2.2 → 2.0，纯菠萝汁 3.5 → 0.1） */
  function acidPerMl(ph) {
    return ph >= 7 ? 0 : Math.pow(10, 2.5 - ph);
  }
  function phOf(g) {
    return PH[g.id] !== undefined ? PH[g.id] : PH_DEFAULT;
  }

  /* 一颗柠檬 ≈ 40ml 这种换算 */
  function fruitHint(g, amt) {
    if (!g.per) return '';
    var n = amt / g.per;
    var t = Math.abs(n - 0.5) < 0.01 ? '半' : (Math.round(n * 100) / 100);
    return '≈' + t + ' ' + g.perName;
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ---------------------------------------------------------
     核心：分析杯子里的东西
     --------------------------------------------------------- */
  function analyze() {
    var f = { sugar: 0, acid: 0, bitter: 0, booze: 0, fruit: 0, spice: 0, fizz: 0, body: 0 };
    var liquid = 0, alcoholMl = 0, hasIce = false, hasBase = false;
    var nItems = 0, nBase = 0, nNonIce = 0, hasFizzIng = false, baseMl = 0;
    var nOthers = 0;   /* 除基酒和冰以外的材料（配料） */
    var juiceMl = 0, hasDairy = false, dairyFat = false, isHot = false;
    var acidLoad = 0, enzymes = [], dairyName = '';
    /* 每样材料的温度，用来算冰化掉多少（见 meltFrom） */
    var parts = [], tempMix = { frozen: 0, cold: 0, room: 0, hot: 0 };

    state.cup.forEach(function (amt, id) {
      var g = BY_ID[id];
      if (!g) return;
      var r = amt / g.def;
      DIMS.forEach(function (d) { f[d.k] += (g.f[d.k] || 0) * r; });

      var ml = amt * (g.mlu || 0);
      if (ml > 0) liquid += ml;
      if (ml > 0) acidLoad += ml * acidPerMl(phOf(g));
      if (g.abv) alcoholMl += ml * abvOf(g) / 100;
      if (g.ice) hasIce = true;
      if (isBase(g)) { hasBase = true; nBase++; baseMl += ml; }
      else if (!g.ice) nOthers++;
      if (g.cat === 'juice') juiceMl += ml;
      if (DAIRY_FAT[g.id] || LACTIC[g.id]) hasDairy = true;
      if (DAIRY_FAT[g.id]) { dairyFat = true; if (!dairyName) dairyName = g.name; }
      if (ENZYMES[g.id] && ml > 0) enzymes.push(ENZYMES[g.id]);
      if (isHotIng(g)) isHot = true;
      if (ml > 0 && g.cat !== 'ice') parts.push({ g: g, ml: ml, abv: abvOf(g), c: tempOf(g).c });
      /* "冷藏 2 样、常温 1 样"只数真有温度的材料，装饰和苦精不算 */
      if (hasTemp(g)) tempMix[tempIdOf(g)]++;
      if (g.cat !== 'ice') nNonIce++;
      if ((g.f.fizz || 0) >= 6) hasFizzIng = true;
      nItems++;
    });

    /* 冰不是材料，是杯子自带的。两种模式：
       inglass = 冰留在杯里（冰杯/高球杯/古典杯/飓风杯），会持续稀释
       chilled = 冰镇后滤掉（马天尼杯/一口杯）——酒一定是冰的，只是杯里没冰
       两种都有"准备时化掉的水"（摇和/搅拌），所以都算 15% 稀释；
       只有 inglass 才额外加"放置期间继续化开"的那部分（见 melt）。 */
    var gsel0 = glassOf(state.glass);
    /* 热饮不放冰——冰在热酒里只会瞬间化掉、把整杯冲淡 */
    hasIce = !isHot && iceNow(gsel0).id !== 'none';

    /* 纯饮：杯里只有一样含酒精的东西（加不加冰都算），没有任何配料。
       不限定"必须是基酒"——单喝金巴利、单喝咖啡利口酒同样是纯饮。 */
    var neatPour = nItems === 1 && alcoholMl > 3;
    /* 杯里只有一样东西、而且不是酒（比如倒了一杯纯可乐）——
       这不是调酒，不该给它打分。 */
    var singleSoft = nItems === 1 && alcoholMl <= 3;
    var singleName = '';
    if (nItems === 1) state.cup.forEach(function (amt, id) {
      if (BY_ID[id]) singleName = BY_ID[id].name;
    });

    /* 倒进去那一刻化掉的水：材料降温到 0℃ 放出的热，减去把冰从 -18℃ 捂到 0℃ 要的热。
       同时算一遍"如果这些材料都是常温的"——两个数字一比，就知道把基酒放冷冻、饮料买冷藏的
       到底省下了多少水。

       摇和 / 搅拌出来的酒不算这一笔：它在摇壶里就已经和冰换过热量、滤出来接近 0℃，
       再倒进放了冰的杯子里几乎化不出水——那部分水算在摇壶那笔里（见下）。 */
    var iceMass = hasIce ? iceMassOf(gsel0) : 0;
    var qNow = 0, qRoom = 0;
    parts.forEach(function (p) {
      var cp = cpOf(p.abv);
      qNow += p.ml * cp * p.c;
      qRoom += p.ml * cp * 25;          /* 25℃ = 常温 */
    });

    /* 摇和 / 搅拌加的水，也跟材料温度有关

       摇壶里的冰是靠材料带来的热化开的：材料越凉，化出来的水越少。
       做法表里的 25% / 20% 是"材料全常温"时的基准值，这里按热量比例缩放。
       最低留 45%——摇壶本身、室温和手温还是会化掉一些冰，不会真的趋近 0。
       （以前这里用的是固定百分比，于是把基酒从冷冻改到常温，酒精度一动不动，
        看起来像温度那个按钮坏了。） */
    var dilBase = methodOf(state.method).dil;
    var qRatio = qRoom > 0 ? clamp(qNow / qRoom, 0.45, 1) : 1;
    var prepDil = (neatPour || isHot) ? 0 : liquid * dilBase * qRatio;

    var meltIce = prepDil > 0 ? 0 : meltFrom(qNow, iceMass);
    var meltRoom = prepDil > 0 ? 0 : meltFrom(qRoom, iceMass);

    /* 水从哪来——原来的写法是"所有酒一律加 15%"，这是错的，会同时犯两个毛病：
       ① 纯饮（一口杯直接倒）根本没有水，却被算成 45ml 只剩 34.8%；
       ② 在杯里加冰现调的酒（高球、尼格罗尼）被算了两次水
          ——15% 准备稀释 + 化冰。可"现调"本来就没有摇和那一步。

       现在分开算：
       · 纯饮 / 热饮 → 不加水
       · 摇和 / 搅拌 → 按做法的经验值加水（20% / 25%），这一步在摇壶里发生
       · 兑和在冰上 → 水从冰来：材料把冰化开多少，就加多少水（按温度算出来）

       最后一条是用户补的：材料不是抽象的"液体"，它们各自带着温度。
       常温材料会把冰一路化开，冷冻过的基酒几乎不化冰。 */
    var dilution = prepDil + meltIce;
    var finalVol = liquid + dilution;
    var abv = finalVol > 0 ? alcoholMl / finalVol * 100 : 0;
    /* 把总酸量摊到总液量上再反推 pH：纯柠檬汁算出 2.2，纯菠萝汁算出 3.5 */
    var avgAcid = finalVol > 0 ? acidLoad / finalVol : 0;
    var ph = avgAcid > 0 ? clamp(2.5 - Math.log10(avgAcid), 2, 7) : 7;
    /* 风味要按"浓度"算，不是"总量"。
       一杯 190ml 的高球和一杯 95ml 的同比例酒，每一口喝起来是一样的，
       但按总量算，前者的风味层次和气泡会翻倍——这就是"整体缩放会改变分数"的根源。
       所以按 120ml（一份典型酒量）折算成浓度。 */
    var den = liquid > 0 ? 120 / liquid : 1;
    var fd = {};
    DIMS.forEach(function (d) { fd[d.k] = f[d.k] * den; });
    /* 有没有酒精看实际酒精量，而不是看它是不是"基酒"分类——
       金巴利、君度这类利口酒当主角时，同样是一杯酒 */
    hasBase = alcoholMl >= 3;

    return {
      f: f, liquid: liquid, alcoholMl: alcoholMl, abv: abv, finalVol: finalVol,
      hasIce: hasIce, hasBase: hasBase, nItems: nItems, nBase: nBase,
      nNonIce: nNonIce, hasFizzIng: hasFizzIng, baseMl: baseMl,
      juiceMl: juiceMl, hasJuice: juiceMl > 5, hasDairy: hasDairy, dairyFat: dairyFat, isHot: isHot,
      ph: ph, acidLoad: acidLoad, enzymes: enzymes, dairyName: dairyName, taste: state.taste,
      fd: fd, nOthers: nOthers,
      /* 温度那条线的产物：杯里有多少克冰、倒进去就化了多少水、
         以及"如果材料全是常温的"会化多少（用来对比，不参与打分） */
      iceMass: iceMass, meltIce: meltIce, meltRoom: meltRoom, tempMix: tempMix,
      prepDil: prepDil, parts: parts,
      /* 纯饮：杯里只有一样含酒精的东西（加不加冰都算），没有任何配料。
         不限定"必须是基酒"——单喝金巴利、单喝咖啡利口酒同样是纯饮。 */
      neatPour: neatPour, singleSoft: singleSoft, singleName: singleName
    };
  }

  /* ---------------------------------------------------------
     评分
     --------------------------------------------------------- */
  /* 总分的唯一出处：界面和自检都调它，避免两处权重不一致。
     权重来自用户选的方案（数据在 data.js 的 SCORING_SCHEMES）。 */
  function totalScore(a) {
    var b = scoreBalance(a), st = scoreStrength(a),
        stru = scoreStructure(a), cx = scoreComplexity(a.fd);
    var w = schemeOf(state.scheme).w;
    return {
      balance: b, strength: st, structure: stru, complexity: cx,
      weight: w,
      total: w.balance * b + w.strength * st + w.structure * stru + w.complexity * cx
    };
  }

  /* 平衡：全部按"浓度"判断，不用绝对量。
     甜不甜、酸不酸是每口的感觉，跟杯子多大无关——用绝对量的话，
     把同一杯酒整体放大，甜度阈值就会越过去，分数跟着变。 */
  function scoreBalance(a) {
    var S = a.fd.sugar, A = a.fd.acid, B = a.fd.bitter;
    var cw = A + 0.4 * B;
    /* 纯饮单独判断。
       用"甜 : 酸"去量一杯纯威士忌是没意义的——雪莉桶天生就甜，
       却会因为"甜得没有酸来抵消"被扣分（所以早先版本里麦卡伦 12 年纯饮
       反而比占边白标低分）。纯饮该看的是香气层次和厚度。 */
    if (a.neatPour) return neatBalance(a);
    /* 先算"比例"分，再乘一个"浓度"系数。
       比例对不代表能喝：一杯 45ml 波本 + 15ml 糖浆 + 65ml 浓缩柠檬汁，
       甜酸比恰好落进理想区间，但「糖+酸」总量 45 是全部经典配方的上限（41）之外——
       喝起来又浓又齁。光看比例的版本给这种配法打了满分。 */
    var ratio = balanceRatio(S, A, cw);
    var load = S + A;
    var over = Math.max(0, load - 42);
    return ratio * clamp(1 - over / 22, 0.35, 1);
  }

  function neatBalance(a) {
    var n = 0;
    DIMS.forEach(function (d) { if (a.fd[d.k] > 2) n++; });
    var s = 82 + clamp((n - 4) * 5, 0, 15);        /* 风味层次 */
    if (a.fd.body > 8) s += 3;                      /* 有厚度 */
    if (a.fd.bitter < 1 && a.fd.sugar > 12) s -= 6; /* 只有甜、没有苦收尾 */
    return clamp(s, 60, 96);
  }

  /* 纯饮不评分，只描述味道——写成一句人话 */
  function neatDescribe(a) {
    var f = a.fd, bits = [];
    bits.push(f.sugar > 16 ? '甜度高' : (f.sugar > 8 ? '回甜明显' : '很干'));
    if (f.acid < 2) bits.push('几乎没有酸');
    else if (f.acid > 8) bits.push('酸度突出');
    if (f.bitter > 6) bits.push('苦尾明显');
    else if (f.bitter > 2) bits.push('收尾带一点苦');
    if (f.spice > 14) bits.push('香料或烟熏感很强');
    else if (f.spice > 8) bits.push('香料感明显');
    bits.push(f.body > 12 ? '口感厚' : (f.body < 6 ? '酒体轻' : '口感中等'));
    var tops = DIMS.map(function (d) { return { n: d.name, v: f[d.k] / d.ref }; })
      .sort(function (x, y) { return y.v - x.v; }).slice(0, 3)
      .map(function (x) { return x.n; }).join('、');
    return bits.join('、') + '。最突出的是「' + tops + '」这三条。';
  }

  function balanceRatio(S, A, cw) {
    /* 既不甜也基本不酸 → 干型（高球、纯饮），按中性处理 */
    if (S < 2.5 && A < 2.5) return 82;
    /* 有甜但几乎没有酸：糖浆、蜂蜜利口酒这一类，靠"能容纳多少甜"来判断 */
    if (A < 2.5) return clamp(92 - Math.max(0, S - 13) * 1.6, 32, 94);
    /* 有酸但几乎没有甜：非常冲 */
    if (S < 2.5) return clamp(90 - Math.max(0, A - 2.5) * 5, 28, 90);
    var r = S / cw;
    if (r >= 0.8 && r <= 1.9) return 100;
    if (r > 1.9) return clamp(100 - (r - 1.9) * 30, 30, 100);
    return clamp(100 - (0.8 - r) * 95, 30, 100);
  }

  /* 「该多浓」是口味问题，不是客观事实——所以由你选，不由我猜。

     ⚠️ 这里查过一个错：早先的版本用"总量"推算"理想浓度"，结果同样 5.9% 的酒，
     做成 230ml 和做成 305ml 会得到不同分数。浓度一样、喝起来一样，分数却不同，
     说明那个模型是错的。现在的判断只看酒精度本身，跟总量、杯子都没关系。 */
  function tasteBand(id) {
    for (var i = 0; i < TASTES.length; i++) if (TASTES[i].id === id) return TASTES[i];
    return TASTES[1];
  }

  function glassOf(id) {
    for (var i = 0; i < GLASSES.length; i++) if (GLASSES[i].id === id) return GLASSES[i];
    return GLASSES[0];
  }

  function schemeOf(id) {
    for (var i = 0; i < SCORING_SCHEMES.length; i++) {
      if (SCORING_SCHEMES[i].id === id) return SCORING_SCHEMES[i];
    }
    return SCORING_SCHEMES[0];
  }

  function methodOf(id) {
    for (var i = 0; i < METHODS.length; i++) if (METHODS[i].id === id) return METHODS[i];
    return METHODS[0];
  }

  /* ---------------------------------------------------------
     温度：每样材料现在是多少度
     --------------------------------------------------------- */
  function tempInfo(id) {
    for (var i = 0; i < TEMPS.length; i++) if (TEMPS[i].id === id) return TEMPS[i];
    return TEMPS[2];
  }
  function tempIdOf(g) {
    if (g.cat === 'ice') return 'frozen';
    return state.temps[g.id] || TEMP[g.id] || TEMP_DEFAULT[g.cat] || 'room';
  }
  function tempOf(g) { return tempInfo(tempIdOf(g)); }
  function isHotIng(g) { return tempIdOf(g) === 'hot'; }
  /* 哪些材料才有"温度"这回事

     只有真会倒进杯子、而且一次至少 5ml 的液体才有：酒、气泡饮料、果汁、奶、糖浆、蛋清……
     两类东西没有：
       · 装饰（柠檬皮、薄荷叶、黄瓜片、迷迭香、樱桃）——它们不占体积，也谈不上"冷藏的薄荷叶"；
       · 按滴算的（苦精、盐水、辣椒仔、橙花水）——一次不到 1ml，对热量没有影响。
     以前这两类也带着"常温"标签，点了半天化水一动不动，看起来像坏了。 */
  function hasTemp(g) {
    return g.cat !== 'ice' && (g.mlu || 0) > 0 && (g.def || 0) * (g.mlu || 0) >= 5;
  }
  /* 「冷藏 3 样、常温 2 样」这种说法 */
  function tempMixText(mix) {
    var bits = [];
    ['frozen', 'cold', 'room', 'hot'].forEach(function (id) {
      if (mix[id]) bits.push(tempInfo(id).name + ' ' + mix[id] + ' 样');
    });
    return bits.join('、') || '没有材料';
  }

  /* 比热容：纯水 4.18，纯乙醇 2.44，按质量分数加权。
     40 度的酒算出来约 3.6 —— 酒比水"不耐冷"，同样多的热量能让它升温更多。 */
  function cpOf(abv) {
    var mEth = abv / 100 * 0.789;
    var mTot = 1 - abv / 100 * (1 - 0.789);
    var x = mTot > 0 ? mEth / mTot : 0;
    return 4.18 * (1 - x) + 2.44 * x;
  }

  /* 这只杯子里有多少克冰。冰填到杯口，中间还有空隙，按 THERMO.icePack 折算。 */
  function iceMassOf(g) {
    if (g.ice !== 'inglass') return 0;
    var lv = iceOnly(g);
    if (lv.id === 'none') return 0;
    return Math.round(g.cap * (1 - lv.roomRatio) * THERMO.icePack);
  }

  /* 化水：热量平衡

       材料降温到 0℃ 放出的热 = 冰从 -18℃ 捂到 0℃ 吸的热 + 化掉的水 × 334

     化 1 克冰要 334 焦耳。把 -18℃ 的冰捂到 0℃ 还要 2.05×18 ≈ 37 焦耳/克，
     这笔"过路费"先扣掉，剩下的才真正化冰——所以冷冻过的材料化出来的水很少，
     常温材料会把冰一路化开。 */
  function meltFrom(Q, iceMass) {
    if (iceMass <= 0) return 0;
    var m = (Q - iceMass * THERMO.iceCp * (-THERMO.iceTemp)) / THERMO.iceLatent;
    return clamp(Math.round(m), 0, Math.round(iceMass));
  }

  function iceLevelOf(id) {
    for (var i = 0; i < ICE_LEVELS.length; i++) if (ICE_LEVELS[i].id === id) return ICE_LEVELS[i];
    return ICE_LEVELS[0];
  }

  /* 用户选的冰量（跟杯子无关） */
  function iceOnly(g) { return iceLevelOf(state.iceLevel); }
  /* 这只杯子有多少冰（chilled 的杯子天然没有冰） */
  function iceNow(g) { return g.ice === 'inglass' ? iceOnly(g) : ICE_LEVELS[2]; }
  /* 冰占掉空间之后，还能倒多少液体 */
  function liquidMaxFor(g) {
    var lv = iceNow(g);
    if (g.ice !== 'inglass') return g.liquidMax;
    return Math.round(g.cap * lv.roomRatio / 10) * 10;
  }
  /* 放多久之后冰会化出多少水 */
  function meltFor(g) { return Math.round((g.melt || 0) * iceNow(g).meltRatio); }

  /* 化水容忍度：冰化开会一路稀释，这杯经得起吗？
     杯子决定两件事：冰留不留（inglass 会持续化）、化开大概加多少水（melt）。 */
  function dilutionInfo(a) {
    var g = glassOf(state.glass), band = tasteBand(a.taste);
    var melt = meltFor(g);
    /* 这里有两笔来源完全不同的水，以前混在一起说，看起来自相矛盾：
       ① 倒进去那一刻化的水：材料带来的热化掉的（按材料温度算）
       ② 放着慢慢化的水：室温透过杯子把冰化掉的（这只杯型的经验值，十几分钟的量）
       ②绝不是"杯里的冰全化掉"——满冰的古典杯里有 120 多克冰，全化掉是 +120 多毫升。
       所以下面一律说"放着慢慢化出约 X ml"，并把这个杯子有冰多少克写出来。 */
    var pre = a.meltIce > 0
      ? '倒进去那一刻会化掉约 ' + a.meltIce + 'ml 冰（' + tempMixText(a.tempMix) + '，杯里按 '
        + Math.round(a.iceMass) + 'g 冰算）。'
        + (a.meltRoom - a.meltIce >= 12
            ? '同样是这些材料，全放常温的话会化掉 ' + a.meltRoom + 'ml，多出 '
              + (a.meltRoom - a.meltIce) + 'ml 水。' : '')
      : '';
    /* 这个数字是"放十几分钟、室温化出来的那部分"，不是"冰全都化掉" */
    var meltPhrase = a.iceMass > 0
      ? '杯里这 ' + Math.round(a.iceMass) + 'g 冰，放着十几分钟室温大约会化掉 ' + melt + 'ml'
      : '放着十几分钟，室温大约会化出 ' + melt + 'ml 水';
    /* 摇和 / 搅拌的酒，那笔水是在摇壶里加的；杯子里的冰是室温慢慢化的，两笔不冲突 */
    var shaken = (a.prepDil > 0 && a.iceMass > 0)
      ? '（摇和 / 搅拌加的 ' + Math.round(a.prepDil) + 'ml 水是在摇壶里进去的，材料越凉它就加得越少；'
        + '跟杯里这些冰被室温化开是两回事，不会重复算。）' : '';
    if (melt <= 0) {
      return { level: '不用管', short: '冰镇后滤掉冰，不会越喝越淡',
               msg: (state.iceLevel === 'none' && g.ice === 'inglass')
                 ? '你选了不加冰，所以不会越喝越淡——代价是温度会一路升上来，尽快喝完。'
                 : '「' + g.name + '」是冰镇之后把冰滤掉的杯子——酒是冰的，但杯里没有冰，所以不会越喝越淡。' };
    }
    var afterVol = a.finalVol + melt;
    var after = afterVol > 0 ? a.alcoholMl / afterVol * 100 : 0;
    var short = a.abv.toFixed(1) + '% → 十几分钟后 ' + after.toFixed(1) + '%';
    if (after >= band.lo) {
      return { level: '高', short: short,
               msg: pre + shaken + '化水容忍度很高：' + meltPhrase + '，到那时还有 '
                 + after.toFixed(1) + '%，仍在你的「' + band.name + '」区间里。'
                 + '按这个速度可以慢慢喝——想拖得更久就换一整块大方冰，melt 能砍一半。' };
    }
    if (a.abv >= band.lo) {
      return { level: '中', short: short,
               msg: pre + shaken + '化水容忍度一般：刚做好是 ' + a.abv.toFixed(1)
                 + '%，' + meltPhrase + '，那时会掉到 ' + after.toFixed(1)
                 + '%，低于你的「' + band.name + '」区间（' + band.lo + '-' + band.hi + '%）。'
                 + '想拖久一点就换大块冰——同样一只杯子，大方冰的 melt 只有小冰的一半。' };
    }
    return { level: '低', short: short,
             msg: pre + shaken + '化水容忍度低：现在就已经 ' + a.abv.toFixed(1) + '% 偏淡，'
               + meltPhrase + '，只会更淡。'
               + ' 要么加酒，要么尽快喝完。' };
  }

  function strengthCaption(a) {
    var t = tasteBand(a.taste);
    var pos = a.abv < t.lo ? '比你的偏淡区间还低' : (a.abv > t.hi ? '比你的浓烈区间还高' : '落在你的合适区间里');
    return '你的口味：' + t.name + '（' + t.lo + '-' + t.hi + '%）· 你这杯 ' + a.abv.toFixed(1) + '%　' + pos;
  }

  function scoreStrength(a) {
    if (!a.hasBase) return 76;
    var t = tasteBand(a.taste), abv = a.abv;
    if (abv >= t.lo && abv <= t.hi) return 100;
    if (abv < t.lo) return interp(abv / t.lo, [[0, 15], [0.35, 45], [0.6, 72], [0.82, 90], [1, 100]]);
    return interp((abv - t.hi) / (t.out - t.hi), [[0, 100], [0.35, 86], [0.7, 66], [1, 45]]);
  }

  function scoreStructure(a) {
    var g = glassOf(state.glass);
    /* 34 基础 + 40 温度 + 26 气泡 = 100。
       容量（装不装得下）不参与打分——杯子容量只是个大概值，
       你手上那只可能比标称的大，所以只在建议栏提醒。 */
    var s = 34;
    /* ① 温度（40）：冰在杯里 / 冰镇滤掉都算冰的；选了不放冰扣一点，但不清零 */
    if (a.isHot || a.hasIce) s += 40;
    else if (g.ice === 'chilled') s += 36;
    else s += 22;
    /* ② 气泡（26）：长饮该有；短饮本来就不该有，不扣分 */
    var wantsFizz = a.liquid > 130 || a.abv < 13;
    s += wantsFizz ? Math.min(26, a.fd.fizz * 3.5) : 26;
    /* ③ 杯型和这杯浓度搭不搭 */
    if (a.isHot) {
      /* 热饮：杯型和浓度那套是照冷饮标定的，对热饮不适用；
         热酒倒进冰杯里冰会瞬间化光，所以只保留这一条 */
      if (g.ice === 'inglass') s -= 18;
    } else if (!(a.abv >= g.lo && a.abv <= g.hi)) s -= 18;
    return clamp(s, 0, 100);
  }

  function scoreComplexity(f) {
    var n = 0;
    DIMS.forEach(function (d) { if (f[d.k] > 2) n++; });
    var s = 20 + n * 8;
    if (f.bitter > 2.5) s += 10;
    if (f.spice > 5) s += 6;
    if (f.fizz > 0 && f.body > 6) s += 5;
    return clamp(s, 0, 100);
  }

  var BANDS = [
    [90, '大师级', '结构、香气、稀释都到位了。这杯可以拿去卖。'],
    [82, '酒吧级', '风味立体，结构完整，端出去不会丢人。'],
    [72, '好喝',   '日常微醺完全够用，属于会想再来一杯的类型。'],
    [62, '还行',   '能喝，但有一两处明显可以调，看下面的建议。'],
    [50, '勉强',   '几个味道在打架，改一下再喝会舒服很多。'],
    [-1, '重做吧', '先照下面的建议修一修，别浪费这杯基酒。']
  ];

  function bandOf(score) {
    for (var i = 0; i < BANDS.length; i++) if (score >= BANDS[i][0]) return BANDS[i];
    return BANDS[BANDS.length - 1];
  }

  /* ---------------------------------------------------------
     建议
     --------------------------------------------------------- */
  function advise(a) {
    /* 一律用浓度（每 120ml）判断，而不是绝对量——
       不然把同一杯酒整体放大，建议也会跟着变。 */
    var f = a.fd, out = [];
    /* 只有一样非酒材料：不是调酒，别拿酸甜比去教训人 */
    if (a.singleSoft) return [{
      p: 100, tone: 'tip',
      text: '杯子里只有「' + a.singleName + '」。它本身是材料，不是调酒——加一份基酒（威士忌、朗姆、伏特加、金酒都行）、一点酸（柠檬或青柠），再加冰，就是一杯完整的酒。'
    }];
    var cw = f.acid + 0.4 * f.bitter;
    var r = cw > 0 ? f.sugar / cw : 99;
    var spiritForward = a.nNonIce <= 2 && a.abv > 24;
    var longDrink = f.fizz > 3;

    function add(p, tone, text) { out.push({ p: p, tone: tone, text: text }); }

    if (!a.hasBase && a.nItems > 0)
      add(100, 'tip', '这杯里没有基酒，是无酒精特调。烈度项按宽松标准算了，风味图照样有效。');

    if (a.nNonIce === 1 && a.nBase === 1)
      add(98, 'tip', '现在这是纯饮。同一瓶酒加 90ml 苏打水和一条柠檬皮，会变成一杯完全不同、也更适合住处的酒。');

    /* 结块看的是 pH 和蛋白酶，不是"酸味强不强" */
    if (a.dairyFat && a.enzymes.length)
      add(99, 'warn', '⚠️ ' + a.dairyName + ' 遇到' + a.enzymes.join('、') + '，会结块或分层。'
        + '这一步跟 pH 没关系——蛋白酶会把奶类蛋白和椰浆的乳化结构直接拆开，加了酒更快，菠萝汁尤其明显（这就是椰林飘香容易失败的原因）。'
        + '救法有两个：把菠萝汁煮开一分钟把酶灭活、放凉再用；或者直接买罐装 / 超高温灭菌的果汁，工厂已经灭过酶了。');
    else if (a.dairyFat && a.ph < 5.0 && !a.isHot)
      add(97, 'warn', '⚠️ ' + a.dairyName + ' 在这杯里会把蛋白析出来：酸把 pH 压到了约 '
        + a.ph.toFixed(1) + '（低于 5.0 就开始结块）。这杯要么去掉奶，要么去掉酸。'
        + '（养乐多、可尔必思这类本身很酸的乳酸菌饮料不在此列——它们的体系是稳定的，加柠檬没问题。）');

    if (!a.hasIce && !a.isHot && a.abv > 12)
      add(96, 'warn', '没有冰。同一杯酒降到 10-15℃ 之后，甜味会收、香气会打开，差别比换一瓶酒还大。便利店的冰杯加一个泡沫保温箱就能解决。');

    /* 温度这条线：材料是冰的还是常温的，冰化掉多少完全不一样 */
    if (a.iceMass > 0 && a.meltIce >= 25)
      add(95, 'warn', '这些材料会把冰化掉约 ' + a.meltIce + 'ml——你的材料大多是常温的（'
        + tempMixText(a.tempMix) + '）。' + Math.round(a.meltIce) + 'ml 水直接进了这杯酒。'
        + '把基酒整瓶放冷冻室、饮料买冷藏的，同样的配方能少掉一大半水。');
    else if (a.iceMass > 0 && a.meltRoom - a.meltIce >= 25)
      add(74, 'tip', '这杯只化掉约 ' + a.meltIce + 'ml 冰（' + tempMixText(a.tempMix)
        + '）。材料全放常温的话会化掉 ' + a.meltRoom + 'ml——基酒放冷冻、饮料买冷藏的，'
        + '就是少掉这 ' + (a.meltRoom - a.meltIce) + 'ml 水的办法。');

    /* 滤冰的杯子配兑和：这一步物理上不成立 */
    if (state.method === 'build' && glassOf(state.glass).ice === 'chilled' && !a.isHot && a.nItems >= 2)
      add(93, 'warn', '「' + glassOf(state.glass).name + '」是用来装滤冰之后的酒的杯子，'
        + '但做法选的是「兑和」——这样既没有冰也不会稀释。点上面的做法换成'
        + '「搅拌 Stir」或「摇和 Shake」，酒才会是冰的。');

    if (f.sugar >= 4.5 && cw < 2.5) {
      if (spiritForward)
        add(94, 'warn', '糖不低，又没有东西压住它。2 滴安高天娜苦精（或者一条橙皮）就能把甜味变成「有层次的甜」，比加酸更适合这杯。');
      else
        add(94, 'warn', '太甜了，缺一个「刹车」。加 15ml 鲜柠檬汁，或者 2 滴安高天娜苦精。');
    }

    if (cw >= 2.5 && f.sugar >= 3.5 && r > (a.abv > 25 ? 1.9 : 1.75)) {
      if (a.dairyFat && !a.hasJuice)
        add(92, 'warn', '甜度偏高（甜:酸大约 ' + r.toFixed(1) + ':1），但这杯里有奶，补酸会结块。直接减 5ml 糖最安全。');
      else
        add(92, 'warn', '甜酸比偏甜（大约 ' + r.toFixed(1) + ' : 1）。把糖浆减 5ml，或者补 5-10ml 柠檬 / 青柠汁。');
    }

    if (f.sugar >= 3.5 && cw >= 2.5 && r < 0.7)
      add(92, 'warn', '偏酸，有点冲。加 5ml 糖浆或蜂蜜——酸和糖一起进去，反而会显得更圆而不是更甜。');

    var band = tasteBand(a.taste);
    if (a.hasBase && a.abv > band.hi) {
      var targetAbv = (band.hi + band.lo) / 2;
      var targetBase = a.baseMl >= 5
        ? Math.max(10, Math.round(a.baseMl * targetAbv / a.abv / 5) * 5) : 0;
      add(90, 'warn', '这杯 ' + a.abv.toFixed(1) + '%，超过了你设的「' + band.name + '」区间（'
        + band.lo + '-' + band.hi + '%）。'
        + (targetBase
            ? '按这个口味，基酒从 ' + Math.round(a.baseMl) + 'ml 减到 ' + targetBase + 'ml 就对了；'
            : '把基酒减一点；')
        + '或者把口味偏好调成「浓烈」，那就不是缺陷而是你想要的。');
    }

    if (a.hasBase && a.abv < band.lo)
      add(90, 'warn', '这杯只有 ' + a.abv.toFixed(1) + '%，低于你设的「' + band.name + '」区间（'
        + band.lo + '-' + band.hi + '%），喝起来更像饮料。基酒加一点，或者去材料面板把口味改成「清淡」。');

    if (f.bitter < 2 && f.spice < 3 && a.nItems >= 2)
      add(84, 'tip', '香气还差一层。加一条橙皮（在杯口上方拧一下喷出皮油）或者 2 滴苦精——这是投入最小、提升最明显的一步。');

    if (f.body > 15 && f.acid < 3 && !a.hasFizzIng) {
      if (a.isHot)
        add(80, 'warn', '口感很厚，喝两口容易腻。奶和咖啡的比例可以再轻一点，旁边配杯苏打水清口。');
      else if (a.hasDairy)
        add(80, 'warn', '口感太厚，容易喝两口就腻（奶油、椰浆、牛奶都有这个问题）。降低奶的比例，或者补一点气泡。');
      else
        add(80, 'warn', '口感太厚，喝两口会闷。加点气泡水把它「抬」起来。');
    }

    if (f.fizz >= 10 && a.abv >= 7 && a.abv <= 14)
      add(78, 'ok', '结构很正：气泡、稀释、酒精度都在标准高球的区间里，搅的时候轻一点就行。');

    if (a.juiceMl > 5 && f.acid < 3 && a.nItems >= 2)
      add(76, 'tip', '果汁的甜很容易被误判成「好喝」。挤 5ml 柠檬汁进去，果味会立刻亮起来。');

    if (a.liquid > 0 && a.liquid < 70 && (longDrink || a.abv < 15) && a.nItems >= 2)
      add(74, 'warn', '杯子里只有 ' + Math.round(a.liquid) + 'ml，量太少了。补冰和气泡水，让总液量到 120ml 左右才够喝。');

    var gsel = glassOf(state.glass);
    if (a.liquid > liquidMaxFor(gsel))
      add(88, 'warn', '液体 ' + Math.round(a.liquid) + 'ml 装不进「' + gsel.name + '」——这只杯子能加的液体上限是 '
        + liquidMaxFor(gsel) + 'ml（总容量 ' + gsel.cap + 'ml，冰占掉一部分、还要留空间）。'
        + ' 只是个提醒：如果你手上那只杯子比这个大，直接忽略；不然就把材料按比例缩小，或者换个大杯子。');
    var dil = dilutionInfo(a);
    if (a.liquid > 0 && (dil.level === '中' || dil.level === '低'))
      add(84, 'tip', dil.msg);

    /* 浓缩液倒多了要拦一下：这类东西按"汁"的量倒会又酸又甜到发苦 */
    /* 糖 + 酸 的总量超过所有经典配方的上限：不是比例问题，是整体太浓 */
    if (a.fd.sugar + a.fd.acid > 42 && a.nItems >= 2)
      add(88, 'warn', '这杯的「糖 + 酸」总量是 ' + (a.fd.sugar + a.fd.acid).toFixed(0)
        + '，已经超过全部 44 个经典配方的上限（41）——比例可能是对的，但整体太浓，喝起来又齁又刺激。'
        + '把糖浆和果汁都减一点，或者多补些气泡水/冰把它拉开。');

    state.cup.forEach(function (amt, id) {
      var g = BY_ID[id];
      if (!g || !g.concentrate || amt <= g.doseMax) return;
      add(89, 'warn', '「' + g.name + '」是浓缩液（' + g.concentrate + '），你倒了 ' + Math.round(amt)
        + 'ml——已经超过建议上限 ' + g.doseMax + 'ml。它 1ml 顶 4ml 稀释后的柠檬水，按柠檬汁的量倒会浓得发齁。'
        + '减到 ' + Math.round(g.doseMax * 0.6) + 'ml 左右，或者先按 1:4 兑好水再当柠檬汁用。');
    });

    if (a.nItems === 2 && a.nNonIce === 2)
      add(70, 'tip', '只有两样东西。再加一条苦精或一点酸，复杂度会跳一个档。');

    if (a.abv >= 10 && a.abv <= 22 && a.hasIce && f.bitter > 2 && f.acid > 4)
      add(66, 'ok', '酸甜、苦味、稀释都有了，闻起来应该相当不错。');

    if (a.abv >= 25 && a.hasIce && f.bitter > 2 && !a.hasDairy)
      add(64, 'ok', '搅拌型的烈酒：冰越大越好，化得慢，味道才不会被水冲淡。倒好后让它在杯里静置一分钟再喝。');

    if (!out.length) {
      var top = DIMS.map(function (d) { return { name: d.name, v: f[d.k] / d.ref }; })
        .sort(function (x, y) { return y.v - x.v; })[0];
      add(10, 'ok', '这套配比没有明显短板，主导风味是「' + top.name +
        '」。想让它在舌尖更突出，就多放一点对应材料；想让它往后退，把那一样减 5ml。');
    }

    out.sort(function (x, y) { return y.p - x.p; });
    return out.slice(0, 4);
  }

  /* ---------------------------------------------------------
     渲染
     --------------------------------------------------------- */
  function renderCats() {
    var el = document.getElementById('cats');
    var keep = el.scrollLeft;
    el.innerHTML = CATS.map(function (c, i) {
      var on = c.id === state.cat ? ' on' : '';
      /* 六种基酒和后面的配料之间插一条分隔线，14 个标签太长会找不到 */
      var sep = (i > 0 && CATS[i - 1].id === 'otherbase') ? '<span class="cat-sep"></span>' : '';
      return sep + '<button type="button" class="cat' + on + '" data-cat="' + c.id + '">' + c.name + '</button>';
    }).join('');
    el.scrollLeft = keep;
    scrollCatIntoView(el);
  }

  /* 分类标签是横向滚动的。重新渲染后要把选中的那个滚回视野里，
     否则最后一个分类（冰）会被挤出屏幕，只在右边缘露出一小块琥珀色。 */
  function scrollCatIntoView(el) {
    if (!el.querySelector || !el.getBoundingClientRect) return;
    var on = el.querySelector('.cat.on');
    if (!on || !on.getBoundingClientRect) return;
    var box = el.getBoundingClientRect(), tab = on.getBoundingClientRect();
    if (tab.left < box.left) el.scrollLeft += tab.left - box.left - 8;
    else if (tab.right > box.right) el.scrollLeft += tab.right - box.right + 8;
  }

  function renderLib() {
    var list = INGREDIENTS.filter(function (g) {
      if (g.cat !== state.cat) return false;
      if (state.hideRisky && storeOf(g).risk >= 2) return false;
      return true;
    });

    function chip(g) {
      var inCup = state.cup.has(g.id);
      var st = storeOf(g);
      var tp = tempOf(g);
      return '<button type="button" class="chip' + (inCup ? ' on' : '') + '" data-add="' + g.id +
        '" title="' + esc(g.note + ' —— ' + st.text + ' —— 建议' + tp.name + '（' + tp.c + '℃）：' + tp.note) + '">' +
        '<span class="cn">' + esc(g.name) + '</span>' +
        '<span class="tags">' +
          '<span class="src s-' + g.src + '">' + SRC_NAME[g.src] + '</span>' +
          (hasTemp(g) ? '<span class="tagtemp t-' + tempIdOf(g) + '">' + esc(tp.name) + '</span>' : '') +
          '<span class="risk r' + st.risk + '">' + RISK_LABEL[st.risk] + '</span>' +
        '</span>' +
        '</button>';
    }

    document.getElementById('lib').innerHTML =
      '<div class="libgroup">' + esc(catName(state.cat)) + '<span>' + list.length + ' 种</span></div>'
      + list.map(chip).join('');
  }

  function catName(id) {
    for (var i = 0; i < CATS.length; i++) if (CATS[i].id === id) return CATS[i].name;
    return id;
  }

  function renderCup() {
    var box = document.getElementById('cupList');
    var empty = document.getElementById('cupEmpty');
    if (state.cup.size === 0) {
      box.innerHTML = '';
      empty.hidden = false;
      renderSwap(); renderGlass();     /* 空杯也要重画，不然会留着上一杯的图 */
      return;
    }
    empty.hidden = true;
    var html = '';
    state.cup.forEach(function (amt, id) {
      var g = BY_ID[id];
      if (!g) return;
      var st = storeOf(g);
      var tp = tempOf(g);
      var hint = fruitHint(g, amt);
      var open = state.open[id] ? ' open' : '';
      html += '<div class="cup-item' + open + '">' +
        /* 点这一行展开/收起完整说明——之前说明被省略号截断，却没有看全文的办法 */
        '<div class="ci-main" data-expand="' + id + '" title="点一下看完整说明">' +
          '<span class="ci-name"><span class="ci-t">' + esc(g.name) +
            (hint ? ' <i class="ci-eq">' + esc(hint) + '</i>' : '') +
            '</span>' +
            (st.risk > 0 ? ' <span class="risk r' + st.risk + '">' + RISK_LABEL[st.risk] + '</span>' : '') +
            (hasTemp(g) ?
              ' <span class="tempchip t-' + tempIdOf(g) + '" data-temp="' + id + '" role="button" tabindex="0"' +
              ' title="' + esc(tp.name + ' ' + tp.c + '℃　' + tp.note + '　点一下换一个温度') + '">'
              + esc(tp.name) + '</span>' : '') +
          '</span>' +
          '<span class="ci-note">' + esc(g.note) + '</span>' +
          '<span class="ci-fold">' + (state.open[id] ? '收起 ▴' : '看全部 ▾') + '</span>' +
        '</div>' +
        '<div class="ci-ctl">' +
          (g.abv ? '<button type="button" class="abvbtn" data-abv="' + id + '" title="改酒精度——装瓶度数分国家版本，以你手上那瓶为准">'
            + abvOf(g) + '%</button>' : '') +
          '<button type="button" class="rnd" data-act="minus" data-id="' + id + '" aria-label="减少">−</button>' +
          '<span class="ci-amt">' + fmtAmt(g, amt) + '</span>' +
          '<button type="button" class="rnd" data-act="plus" data-id="' + id + '" aria-label="增加">+</button>' +
          '<button type="button" class="rnd del" data-act="del" data-id="' + id + '" aria-label="拿掉">✕</button>' +
        '</div></div>';
    });
    box.innerHTML = html;
    renderSwap();
    renderGlass();
  }

  /* ---------------------------------------------------------
     换基酒：配方写的是"标准基酒"，但谁手上的瓶子都不一样
     --------------------------------------------------------- */
  function currentBase() {
    var best = null;
    state.cup.forEach(function (amt, id) {
      var g = BY_ID[id];
      if (!g || !isBase(g)) return;
      var ml = amt * (g.mlu || 0);
      if (!best || ml > best.ml) best = { id: id, ml: ml, amt: amt };
    });
    return best;
  }

  function swapBase(newId) {
    var cur = currentBase();
    if (cur) {
      state.cup.delete(cur.id);
      state.cup.set(newId, cur.amt);
    } else {
      state.cup.set(newId, BY_ID[newId].def);
    }
  }

  function renderSwap() {
    var box = document.getElementById('swapPanel');
    var btn = document.getElementById('swapBtn');
    var cur = currentBase();
    btn.textContent = state.swapOpen ? '收起' : '换基酒';
    btn.classList.toggle('on', state.swapOpen);
    if (!state.swapOpen) { box.hidden = true; box.innerHTML = ''; return; }
    var list = INGREDIENTS.filter(isBase);
    box.hidden = false;
    box.innerHTML = '<div class="hint swap-hint">' +
      (cur ? '现在杯子里是「' + esc(shortName(BY_ID[cur.id])) + '」。换成：'
           : '杯子里还没有基酒，点一个加进去：') +
      '</div><div class="swap-grid">' +
      list.map(function (g) {
        return '<button type="button" class="schip' + (cur && cur.id === g.id ? ' on' : '') +
          '" data-swap="' + g.id + '">' + esc(shortName(g)) + '</button>';
      }).join('') + '</div>';
  }

  function drawRadar(vals) {
    var W = 340, H = 292, cx = W / 2, cy = 148, R = 96, n = 8;
    var out = '';
    for (var ring = 1; ring <= 4; ring++) {
      var rr = R * ring / 4, pts = [];
      for (var i = 0; i < n; i++) {
        var a = -Math.PI / 2 + i * 2 * Math.PI / n;
        pts.push((cx + Math.cos(a) * rr).toFixed(1) + ',' + (cy + Math.sin(a) * rr).toFixed(1));
      }
      out += '<polygon class="ring" points="' + pts.join(' ') + '"/>';
    }
    for (var j = 0; j < n; j++) {
      var ang = -Math.PI / 2 + j * 2 * Math.PI / n;
      out += '<line class="spoke" x1="' + cx + '" y1="' + cy + '" x2="' +
        (cx + Math.cos(ang) * R).toFixed(1) + '" y2="' + (cy + Math.sin(ang) * R).toFixed(1) + '"/>';
      var lx = cx + Math.cos(ang) * (R + 24), ly = cy + Math.sin(ang) * (R + 24);
      var cosv = Math.cos(ang), anchor = Math.abs(cosv) < 0.25 ? 'middle' : (cosv > 0 ? 'start' : 'end');
      out += '<text class="axis" x="' + lx.toFixed(1) + '" y="' + (ly + 4).toFixed(1) +
        '" text-anchor="' + anchor + '">' + DIMS[j].name + '</text>';
    }
    var pp = [], nodes = '';
    for (var k = 0; k < n; k++) {
      var a2 = -Math.PI / 2 + k * 2 * Math.PI / n;
      var rad = R * clamp(vals[k], 0.03, 1);
      var px = cx + Math.cos(a2) * rad, py = cy + Math.sin(a2) * rad;
      pp.push(px.toFixed(1) + ',' + py.toFixed(1));
      nodes += '<circle class="node" cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="3"/>';
    }
    out += '<polygon class="shape" points="' + pp.join(' ') + '"/>' + nodes;

    var svg = document.getElementById('radar');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.innerHTML = '<title>风味雷达图</title>' + out;
  }

  function bar(label, val, cap) {
    return '<div class="sub">' +
      '<div class="sbar"><span class="sb-l">' + label + '</span>' +
      '<span class="sb-track"><i style="width:' + val.toFixed(0) + '%"></i></span>' +
      '<span class="sb-v">' + val.toFixed(0) + '</span></div>' +
      (cap ? '<div class="sb-cap">' + esc(cap) + '</div>' : '') +
      '</div>';
  }

  function renderResult() {
    var a = analyze();
    var v = DIMS.map(function (d) { return clamp(a.fd[d.k] / d.ref, 0, 1); });
    drawRadar(v);

    var sc = totalScore(a);
    var b = sc.balance, st = sc.strength, stru = sc.structure, cx = sc.complexity;
    var total = sc.total;

    var empty = state.cup.size === 0;
    var band = bandOf(total);

    /* 顶部小条 */
    document.getElementById('scoreNum').textContent = empty ? '--' : Math.round(total);
    document.getElementById('scoreLbl').textContent = empty ? '等待加料' : band[1];
    var mini = document.getElementById('miniBars');
    mini.innerHTML = v.map(function (x, i) {
      return '<i style="height:' + (12 + x * 88).toFixed(0) + '%" title="' + DIMS[i].name + '"></i>';
    }).join('');

    /* 参数行 */
    document.getElementById('stats').innerHTML =
      statBox('预估酒精度', empty ? '--' : a.abv.toFixed(1) + '%') +
      statBox('总液量', empty ? '--' : Math.round(a.finalVol) + 'ml') +
      statBox('预估 pH', empty ? '--' : a.ph.toFixed(1)) +
      statBox('材料', empty ? '--' : a.nItems + ' 样');

    /* 评分区 */
    /* 纯饮：只描述味道，不给分数。
       没有配料的时候，"这杯酒好不好"不是这个工具能回答的问题——
       硬给一个分数等于装懂，而且早先版本会因为"雪莉桶甜得没有酸来抵消"
       把麦卡伦 12 年判得比占边白标低。 */
    var neat = !empty && a.neatPour;
    var single = !empty && a.singleSoft;
    document.getElementById('bigScore').textContent =
      empty ? '--' : (neat ? '纯饮' : (single ? '—' : Math.round(total)));
    document.getElementById('scoreUnit').textContent =
      neat ? '　不作评分' : (single ? '　这还不是一杯酒' : ' / 100');
    document.getElementById('verdictTitle').textContent =
      empty ? '先把材料放进杯子'
        : (neat ? '纯饮 · 只描述味道'
          : (single ? '这只是材料，不是一杯酒' : band[1]));
    document.getElementById('verdictText').textContent = empty
      ? '从下面「材料库」随便点两样开始，风味图和评分会实时跟着变。'
      : (neat ? neatDescribe(a) + '加一点气泡水或一条柠檬皮，它才会变成一杯酒。'
        : (single
          ? '杯子里只有「' + a.singleName + '」。它本身是材料，不是调酒——给它加一份基酒（威士忌、朗姆、伏特加、金酒都行）和一点酸，它才变成一杯酒。'
          : band[2]));

    /* 光给一个分数看不出来为什么，所以每一项下面都标出它的依据 */
    var cwv = a.f.acid + 0.4 * a.f.bitter;
    var cwd = a.fd.acid + 0.4 * a.fd.bitter;
    var ratio = cwd > 0.5 ? a.fd.sugar / cwd : 0;
    var load = a.fd.sugar + a.fd.acid;
    var ratioCap = cwd > 0.5
      ? '甜 : 酸 ≈ ' + ratio.toFixed(1) + ' : 1　酸度 ' + a.fd.acid.toFixed(0) + '（经典 1-22）　总量 '
        + load.toFixed(0) + (load > 42 ? '　⚠ 超过经典的浓上限 41' : '')
      : '没有明显的酸甜';
    if (a.neatPour) ratioCap = '纯饮：没有配料，按香气层次和厚度判断（不套"甜 : 酸"那套）';
    var dimsOn = DIMS.filter(function (d) { return a.fd[d.k] > 2; }).length;
    /* 每一项都标出它现在的权重——换了评分方案，这些数字会一起变 */
    var w = sc.weight, pc = function (x) { return Math.round(x * 100) + '%'; };
    /* 纯饮模式一根评分条都不留——说了不评分就别再写着"权重 32%" */
    document.getElementById('subScores').innerHTML = (neat || single) ? '' :
      bar('平衡', b, '权重 ' + pc(w.balance) + '　' + ratioCap) +
      bar('复杂度', cx, '权重 ' + pc(w.complexity) + '　激活了 ' + dimsOn + ' 种风味') +
      bar('结构', stru, '权重 ' + pc(w.structure) + '　'
        + (a.hasIce ? iceLevelOf(state.iceLevel).name
           : (glassOf(state.glass).ice === 'chilled' ? '冰镇·滤掉冰' : '没放冰')) + ' · '
        + (a.hasFizzIng ? '有气泡' : '没有气泡') + ' · ' + glassOf(state.glass).name + ' 液体 '
        + Math.round(a.liquid) + '/' + liquidMaxFor(glassOf(state.glass)) + 'ml') +
      bar('浓度', st, '权重 ' + pc(w.strength) + '　' + strengthCaption(a));

    /* 主导风味 */
    var tops = DIMS.map(function (d, i) { return { name: d.name, val: v[i] }; })
      .filter(function (x) { return x.val > 0.15; })
      .sort(function (x, y) { return y.val - x.val; })
      .slice(0, 3)
      .map(function (x) { return x.name + ' ' + Math.round(x.val * 100); });
    document.getElementById('topFlavor').textContent = tops.length
      ? '主导风味：' + tops.join(' · ')
      : '还没有风味数据';

    /* 建议 */
    var list = empty ? [] : advise(a);
    document.getElementById('advice').innerHTML = list.length
      ? '<li class="adv-title">怎么再调一步</li>' + list.map(function (x) {
          return '<li class="adv ' + x.tone + '">' + esc(x.text) + '</li>';
        }).join('')
      : '';

    /* 化水容忍度：不参与打分，只告诉你会怎么变，加不加冰由你判断 */
    var dil = dilutionInfo(a);
    document.getElementById('diluteBox').innerHTML = empty ? '' :
      '<div class="dil-title">冰化开会怎么样　<b class="dil-' + (dil.level === '高' ? 'hi' : dil.level === '中' ? 'mid' : dil.level === '低' ? 'lo' : 'none')
      + '">容忍度 ' + dil.level + '</b>　<span class="dil-num">' + esc(dil.short) + '</span>'
      + (a.meltIce > 0 ? '<span class="dil-melt">倒入即化 ' + a.meltIce + 'ml</span>' : '')
      + '</div>'
      + '<p class="dil-msg">' + esc(dil.msg) + '</p>';

    /* 保存提醒：这杯里有哪些材料在住处里不好伺候 */
    var risky = [];
    state.cup.forEach(function (amt, id) {
      var g = BY_ID[id];
      if (!g) return;
      var st = storeOf(g);
      if (st.risk > 0) risky.push({ g: g, st: st });
    });
    risky.sort(function (x, y) { return y.st.risk - x.st.risk; });
    var top = risky.slice(0, 5), rest = risky.length - top.length;
    document.getElementById('storeBox').innerHTML = risky.length
      ? '<div class="store-title">放得住吗（没冰箱的话先看这里）</div><ul>' +
        top.map(function (r) {
          return '<li class="sto r' + r.st.risk + '"><b>' + esc(r.g.name) + '</b>' + esc(r.st.text) + '</li>';
        }).join('') +
        (rest > 0 ? '<li class="sto r1">还有 ' + rest + ' 样材料在材料库里能查到保存方式。</li>' : '') +
        '</ul>'
      : '';

    /* 这杯酒最后是什么构成的 */
    renderMixBar(a);
  }

  function statBox(label, val) {
    return '<div class="stat"><span class="st-l">' + label + '</span><span class="st-v">' + val + '</span></div>';
  }

  /* ---------------------------------------------------------
     这杯酒最后是什么构成的

     一条带子：倒进去的酒液 + 摇和/搅拌在摇壶里加的水 + 杯里的冰化出来的水。
     这三笔加起来就是「总液量」，跟上面那个数字是同一笔账；
     冰还会被室温慢慢化开，那部分单独写在后面（十几分钟的量，见化水那一栏）。
     --------------------------------------------------------- */
  function renderMixBar(a) {
    var box = document.getElementById('mixBar');
    if (!box) return;
    if (!a.liquid) { box.innerHTML = ''; return; }

    var later = meltFor(glassOf(state.glass));      /* 放着十几分钟还会再多这些 */
    var total = a.finalVol;
    var den = total > 0 ? total : 1;
    var segs = [
      { n: '倒进去的酒液', ml: a.liquid, cls: 'mb-liquid' },
      { n: '摇和 / 搅拌加的水', ml: a.prepDil, cls: 'mb-prep' },
      { n: '冰化出来的水', ml: a.meltIce, cls: 'mb-melt' }
    ];
    var label = segs.map(function (s) { return s.n + ' ' + Math.round(s.ml) + ' 毫升'; })
      .join('，') + '，合计 ' + Math.round(total) + ' 毫升';

    box.innerHTML =
      '<div class="mb-track" role="img" aria-label="' + esc(label) + '">' +
        segs.map(function (s) {
          var pct = s.ml / den * 100;
          if (pct <= 0) return '';
          return '<i class="mb-seg ' + s.cls + '" style="width:' + pct.toFixed(2) + '%" title="'
            + esc(s.n + ' ' + Math.round(s.ml) + 'ml') + '">'
            + (pct >= 16 ? '<b>' + Math.round(s.ml) + '</b>' : '') + '</i>';
        }).join('') +
      '</div>' +
      '<div class="mb-legend">' +
        segs.map(function (s) {
          return '<span class="mb-key"><i class="mb-dot ' + s.cls + '"></i>' + esc(s.n)
            + '<b>' + Math.round(s.ml) + 'ml</b></span>';
        }).join('') +
        '<span class="mb-key mb-total">合计<b>' + Math.round(total) + 'ml</b></span>' +
        (later > 0
          ? '<span class="mb-key mb-later">放着十几分钟还会再多<b>' + later + 'ml</b>（→ '
            + Math.round(total + later) + 'ml）</span>'
          : '') +
      '</div>';
  }

  /* 把「添加利金酒 Tanqueray」压成「添加利金酒」，卡片和按钮上才放得下 */
  function shortName(g) {
    var s = g.name.replace(/[（(][^）)]*[）)]/g, ' ').replace(/\s+/g, ' ').trim();
    if (/[\u4e00-\u9fff]/.test(s) && /[A-Za-z]/.test(s)) {
      var parts = s.split(' ').filter(function (w) { return /[\u4e00-\u9fff]/.test(w) || /^[0-9.]+$/.test(w); });
      if (parts.length) s = parts.join('');
    }
    return s || g.name;
  }

  /* 卡片上的用料一行：波本威士忌 45ml · 苏打水 120ml · 冰 */
  function compLine(p) {
    return p.items.map(function (it) {
      var g = BY_ID[it[0]];
      if (!g) return '';
      if (g.cat === 'ice') return '冰';
      return shortName(g) + ' ' + fmtAmt(g, it[1]);
    }).filter(Boolean).join(' · ');
  }

  function renderPresets() {
    var rows = PRESETS.map(function (p, i) {
      return { p: p, i: i };
    });

    function card(x) {
      return '<button type="button" class="preset" data-preset="' + x.i + '">' +
        '<span class="p-name">' + esc(x.p.name) + '</span>' +
        '<span class="p-sub">' + esc(x.p.sub) + '</span>' +
        '<span class="p-comp">' + esc(compLine(x.p)) + '</span>' +
        '<span class="p-tip">' + esc(x.p.tip) + '</span>' +
        '</button>';
    }

    document.getElementById('presets').innerHTML =
      PRESET_FAMILIES.map(function (fam) {
        var list = rows.filter(function (x) { return x.p.family === fam.id; });
        if (!list.length) return '';
        return '<div class="pgroup">' + esc(fam.name) + '<span class="pgroup-n">'
          + list.length + ' 个　' + esc(fam.note) + '</span></div>' + list.map(card).join('');
      }).join('');
  }

  function renderAll() {
    renderCats(); renderLib(); renderCup(); renderResult(); renderPresets();
    renderGlassPick(); renderTastePick(); renderIcePick(); renderSchemePick();
    renderMethodPick(); renderGlass();
  }

  /* ---------------------------------------------------------
     杯子：预览图 + 选择
     --------------------------------------------------------- */
  function renderGlassPick() {
    document.getElementById('glassPick').innerHTML = GLASSES.map(function (g) {
      return '<button type="button" class="gchip' + (g.id === state.glass ? ' on' : '') +
        '" data-glass="' + g.id + '">' + esc(g.name) + '</button>';
    }).join('');
  }

  function renderTastePick() {
    document.getElementById('tastePick').innerHTML = TASTES.map(function (t) {
      return '<button type="button" class="gchip' + (t.id === state.taste ? ' on' : '') +
        '" data-taste="' + t.id + '" title="' + esc(t.lo + '-' + t.hi + '%　' + t.note) + '">'
        + esc(t.name) + '</button>';
    }).join('');
  }

  function renderSchemePick() {
    document.getElementById('schemePick').innerHTML = SCORING_SCHEMES.map(function (s) {
      var w = s.w;
      var detail = '平衡 ' + Math.round(w.balance * 100) + '% · 复杂度 ' + Math.round(w.complexity * 100)
        + '% · 结构 ' + Math.round(w.structure * 100) + '% · 浓度 ' + Math.round(w.strength * 100) + '%';
      return '<button type="button" class="gchip' + (s.id === state.scheme ? ' on' : '') +
        '" data-scheme="' + s.id + '" title="' + esc(detail + '　' + s.note) + '">'
        + esc(s.name) + '</button>';
    }).join('');
  }

  function renderMethodPick() {
    document.getElementById('methodPick').innerHTML = METHODS.map(function (m) {
      return '<button type="button" class="gchip' + (m.id === state.method ? ' on' : '') +
        '" data-method="' + m.id + '" title="' + esc(m.note) + '">'
        + esc(m.name + ' ' + m.en) + '</button>';
    }).join('');
  }

  function renderIcePick() {
    var g = glassOf(state.glass);
    document.getElementById('icePick').innerHTML = ICE_LEVELS.map(function (lv) {
      return '<button type="button" class="gchip' + (lv.id === state.iceLevel ? ' on' : '') +
        '" data-ice="' + lv.id + '" title="' + esc(lv.note) + '">' + esc(lv.name) + '</button>';
    }).join('') + (g.ice === 'inglass' ? '' : '<span class="hint">　这只杯子一般不放冰</span>');
  }

  function renderGlass() {
    var g = glassOf(state.glass);
    var art = GLASS_ART[g.id] || GLASS_ART.icecup;
    var a = analyze();
    /* 液面高度只由液体量决定；冰的情况看你选的冰量：
       满冰 = 冰一直堆到杯口；半杯冰 = 几块冰漂在液面上；不加冰 = 没有。 */
    var lv = iceNow(g);
    var liquidFrac = clamp(a.liquid / g.cap, 0, 1);
    var y0 = art.bottom - liquidFrac * (art.bottom - art.top);

    /* 把每种材料按体积换算成颗粒数，再撒进杯子里 */
    var items = [];
    state.cup.forEach(function (amt, id) {
      var gg = BY_ID[id];
      if (!gg || id === 'ice') return;
      var ml = amt * (gg.mlu || 0);
      /* 苦精、皮这类体积接近 0 的也要看得见，给一个下限 */
      items.push({ g: gg, w: Math.max(ml, a.liquid * 0.015, 1) });
    });

    var rnd = mulberry32(hashStr(items.map(function (it) {
      return it.g.id + ':' + it.w.toFixed(1);
    }).join('|')));

    var bag = [];
    if (items.length) {
      var totalW = items.reduce(function (s, it) { return s + it.w; }, 0);
      var target = 170;
      items.forEach(function (it) {
        var n = Math.max(1, Math.round(target * it.w / totalW));
        for (var k = 0; k < n; k++) bag.push(it.g);
      });
      for (var i = bag.length - 1; i > 0; i--) {
        var j = Math.floor(rnd() * (i + 1)), t = bag[i]; bag[i] = bag[j]; bag[j] = t;
      }
    }

    /* 颗粒间距按杯子大小自动算：小杯子（马天尼杯）用更细的间距，
       不然那么小的区域里只够放十几颗，看不出组成。 */
    var area = 0;
    for (var pi = 0, pj = art.inner.length - 1; pi < art.inner.length; pj = pi++) {
      area += art.inner[pj][0] * art.inner[pi][1] - art.inner[pi][0] * art.inner[pj][1];
    }
    area = Math.abs(area / 2);
    var step = clamp(Math.sqrt(area / 150), 3.0, 5.6);

    var dots = '', idx = 0;
    for (var y = art.top; y <= art.bottom + 1; y += step) {
      for (var x = 5; x <= 95; x += step) {
        if (y < y0 || !insidePoly(art.inner, x, y)) continue;
        if (!bag.length) continue;
        var gg = bag[idx % bag.length]; idx++;
        var jx = x + (rnd() - 0.5) * 2.4, jy = y + (rnd() - 0.5) * 2.4;
        var kind = SHAPE_ORDER[hashStr(gg.id) % SHAPE_ORDER.length];
        dots += shapeEl(kind, jx, jy, 3.6, CAT_STYLE[gg.cat] || CAT_STYLE.mixer);
      }
    }

    /* 冰块画成白色菱形，从液面一直铺到杯口 */
    var ice = '';
    if (a.hasIce && a.liquid > 0) {
      var zoneTop, zoneH, n;
      if (lv.id === 'full') {
        zoneTop = art.top + 5; zoneH = Math.max(0, y0 - zoneTop);
        n = clamp(Math.round(zoneH / 15), 1, 5);
      } else {                       /* 半杯冰：只有一两块，漂在液面上 */
        zoneTop = Math.max(art.top + 6, y0 - 12); zoneH = 14; n = 2;
      }
      for (var k2 = 0; k2 < n; k2++) {
        var cy = zoneTop + 9 + (n === 1 ? zoneH / 2 : k2 * (zoneH - 14) / (n - 1));
        if (lv.id !== 'full') cy = zoneTop + 4 + k2 * 10;
        var cx = 32 + (k2 % 2) * 34;
        ice += '<polygon points="' + cx + ',' + (cy - 9) + ' ' + (cx + 9) + ',' + cy + ' '
          + cx + ',' + (cy + 9) + ' ' + (cx - 9) + ',' + cy
          + '" fill="#ffffff" stroke="#3b3229" stroke-width="0.9"/>';
      }
    }

    document.getElementById('glassPreview').innerHTML =
      '<defs><clipPath id="gclip"><path d="' + polyPath(art.inner) + '"/></clipPath></defs>' +
      '<g clip-path="url(#gclip)">' + dots + ice + '</g>' +
      '<path class="g-line" d="' + art.outer + '"/>' +
      (art.rim ? '<path class="g-line" d="' + art.rim + '"/>' : '') +
      (art.stem ? '<path class="g-line" d="' + art.stem + '"/>' : '') +
      (art.foot ? '<path class="g-line" d="' + art.foot + '"/>' : '') +
      (art.handle ? '<path class="g-line" d="' + art.handle + '"/>' : '');

    /* 上限要按"这只杯子现在的冰量"算：不加冰能倒的比满冰多得多。
       以前这里用的是 g.liquidMax（满冰的固定值），跟上面那行显示的上限对不上。 */
    var maxNow = liquidMaxFor(g);
    var over = a.liquid > maxNow;
    /* 冰按克数写出来——它直接决定化掉多少水，比"占多少体积"有用，
       而且跟下面化水那栏算的是同一个数。 */
    var iceGram = a.iceMass > 0 ? '（约 ' + a.iceMass + 'g 冰）' : '';
    document.getElementById('glassNote').innerHTML =
      '<b>' + esc(g.name) + '</b>　' + esc(g.note) + '<br>液体 ' + Math.round(a.liquid)
      + ' / 上限 ' + maxNow + 'ml　' + esc(lv.name) + iceGram
      + (over ? '　<span class="over">已经超了 ' + Math.round(a.liquid - maxNow) + 'ml</span>' : '');
  }

  /* ---------------------------------------------------------
     交互
     --------------------------------------------------------- */
  function addToCup(id) {
    var g = BY_ID[id];
    if (!g) return;
    if (state.cup.has(id)) state.cup.set(id, state.cup.get(id) + g.step);
    else state.cup.set(id, g.def);
  }

  document.addEventListener('click', function (e) {
    /* 之前这里只写 closest('button')，于是所有挂在 <div> 上的点击
       （比如"看全部"那一行）都被这一行挡掉了——点了没反应。
       现在把带自定义属性的元素也算进来。
       温度标签是 <span>（它嵌在"点一下展开"的那一行里，用 span 才不会互相打架），
       所以 [data-temp] 也必须在这个选择器里，否则点温度会变成展开说明。 */
    var t = e.target.closest ? e.target.closest('button, [data-expand], [data-temp]') : null;
    if (!t) return;

    if (t.dataset.cat) {
      state.cat = t.dataset.cat;
      renderCats(); renderLib();
      return;
    }

    if (t.dataset.add) {
      var id = t.dataset.add;
      addToCup(id);
      renderCup();
      renderResult();
      renderLib();
      return;
    }

    /* 点材料上的温度标签 → 冷冻 / 冷藏 / 常温 轮换。
       同一瓶可乐，从冰箱拿和从货架拿，化出来的水能差好几倍，所以这个由你说了算。 */
    if (t.dataset.temp) {
      var tg = BY_ID[t.dataset.temp];
      if (tg && hasTemp(tg)) {
        var cyc = TEMP_FIXED[tg.id] ? ['hot', 'room'] : TEMP_CYCLE;
        var now = tempIdOf(tg), at = cyc.indexOf(now);
        var next = cyc[(at + 1) % cyc.length];
        var fallback = TEMP[tg.id] || TEMP_DEFAULT[tg.cat] || 'room';
        if (next === fallback) delete state.temps[tg.id];
        else state.temps[tg.id] = next;
        renderCup(); renderResult();
      }
      return;
    }

    /* 点度数改度数。注意按钮上的属性是 data-abv（不是 data-act），
       之前判断写成了 data-act，所以这个分支永远进不来——点了没反应。 */
    /* 点杯子里的那一行 → 展开/收起完整说明 */
    if (t.dataset.expand) {
      var eid = t.dataset.expand;
      if (state.open[eid]) delete state.open[eid];
      else state.open[eid] = 1;
      renderCup();
      return;
    }

    if (t.dataset.abv) {
      var ga = BY_ID[t.dataset.abv];
      if (ga) {
        var curAbv = abvOf(ga);
        var input = window.prompt('「' + ga.name + '」的酒精度是多少？\n\n'
          + '看瓶身写的那行字，例如 47.3 或 50.5。\n'
          + '留空、填 0，或者填一个不像度数的数字 → 恢复默认的 ' + ga.abv + '%。', curAbv);
        if (input !== null) {
          var num = parseFloat(input);
          if (isFinite(num) && num > 0 && num <= 80) {
            if (Math.abs(num - ga.abv) < 0.05) delete state.abv[ga.id];
            else state.abv[ga.id] = num;
          } else {
            delete state.abv[ga.id];      /* 输错了就恢复默认，别把页面卡在一个坏值上 */
          }
          renderCup(); renderResult();
        }
      }
      return;
    }

    if (t.dataset.act) {
      var gid = t.dataset.id, g = BY_ID[gid];
      var cur = state.cup.get(gid) || 0;
      if (t.dataset.act === 'plus') state.cup.set(gid, cur + g.step);
      else if (t.dataset.act === 'minus') {
        var next = cur - g.step;
        if (next <= 0) state.cup.delete(gid); else state.cup.set(gid, next);
      } else if (t.dataset.act === 'del') state.cup.delete(gid);
      renderCup(); renderResult(); renderLib();
      return;
    }

    if (t.dataset.preset) {
      var p = PRESETS[+t.dataset.preset];
      state.cup.clear();
      p.items.forEach(function (it) { state.cup.set(it[0], it[1]); });
      /* 配方自带杯型：干马天尼配马天尼杯，高球配高球杯 */
      if (p.glass) state.glass = p.glass;
      state.iceLevel = glassOf(state.glass).ice === 'inglass' ? 'full' : 'none';
      /* 配方也自带做法：兑和 / 搅拌 / 摇和。这一步以前漏了，
         于是点"萨泽拉克"出来的是兑和——35 度，比实际的 31 度烈。 */
      state.method = PRESET_METHOD[p.name] || state.method;
      state.swapOpen = false;
      renderCup(); renderResult(); renderLib(); renderGlassPick(); renderIcePick(); renderMethodPick();
      document.getElementById('resultAnchor').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    if (t.dataset.swap) {
      swapBase(t.dataset.swap);
      state.swapOpen = false;
      renderCup(); renderResult(); renderLib();
      return;
    }

    if (t.dataset.glass) {
      state.glass = t.dataset.glass;
      /* 换杯型时冰量回到这只杯子的默认：马天尼杯/一口杯默认不加冰 */
      state.iceLevel = glassOf(state.glass).ice === 'inglass' ? 'full' : 'none';
      renderGlassPick(); renderIcePick(); renderGlass(); renderResult();
      return;
    }

    if (t.dataset.ice) {
      state.iceLevel = t.dataset.ice;
      renderIcePick(); renderGlass(); renderResult();
      return;
    }

    if (t.dataset.taste) {
      state.taste = t.dataset.taste;
      renderTastePick(); renderResult();
      return;
    }

    if (t.dataset.scheme) {
      state.scheme = t.dataset.scheme;
      renderSchemePick(); renderResult();
      return;
    }

    if (t.dataset.method) {
      state.method = t.dataset.method;
      renderMethodPick(); renderResult();
      return;
    }
  });

  document.getElementById('clearBtn').addEventListener('click', function () {
    state.cup.clear();
    renderCup(); renderResult(); renderLib();
  });

  document.getElementById('riskyBtn').addEventListener('click', function () {
    state.hideRisky = !state.hideRisky;
    this.setAttribute('aria-pressed', state.hideRisky ? 'true' : 'false');
    this.textContent = state.hideRisky ? '显示全部材料' : '隐藏高风险';
    this.classList.toggle('on', state.hideRisky);
    renderLib();
  });

  document.getElementById('swapBtn').addEventListener('click', function () {
    state.swapOpen = !state.swapOpen;
    renderSwap();
  });

  /* ---------------------------------------------------------
     启动
     --------------------------------------------------------- */
  /* 不预置任何基酒——谁来用都从自己手上的那瓶开始 */
  renderAll();

  /* 调试 / 二次开发用：在浏览器控制台可以访问 window.BarMix */
  window.BarMix = {
    state: state, analyze: analyze, advise: advise, BY_ID: BY_ID,
    tempIdOf: tempIdOf, tempOf: tempOf,
    hasTemp: hasTemp,
    scores: function () {
      var a = analyze(), sc = totalScore(a);
      return { balance: +sc.balance.toFixed(1), strength: +sc.strength.toFixed(1),
               structure: +sc.structure.toFixed(1), complexity: +sc.complexity.toFixed(1),
               total: +sc.total.toFixed(1),
               abv: +a.abv.toFixed(1), liquid: Math.round(a.liquid) };
    },
    load: function (items) {
      state.cup.clear();
      (items || []).forEach(function (it) { state.cup.set(it[0], it[1]); });
      renderCup(); renderResult(); renderLib();
      return this.scores();
    },
    /* 跟界面上点一张经典配方卡片走同一条路：杯型、冰量、做法一起设定。
       自检和审计都该用它，不然测出来的不是用户真正看到的那杯。 */
    preset: function (i) {
      var p = PRESETS[i];
      if (!p) return null;
      state.cup.clear();
      p.items.forEach(function (it) { state.cup.set(it[0], it[1]); });
      if (p.glass) state.glass = p.glass;
      state.iceLevel = glassOf(state.glass).ice === 'inglass' ? 'full' : 'none';
      state.method = PRESET_METHOD[p.name] || 'build';
      renderCup(); renderResult(); renderLib();
      return this.scores();
    },
    /* 温度 / 化水这条线的调试点：在控制台就能看到每一步怎么算的 */
    melt: function () {
      var a = analyze();
      return { 杯里的冰: a.iceMass + 'g', 倒入即化: a.meltIce + 'ml',
               全常温会化: a.meltRoom + 'ml', 材料温度: tempMixText(a.tempMix) };
    }
  };
})();
