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
  var HOT = { hot_water: 1, coffee_hot: 1 };

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
      scheme: 'balanced'
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

    state.cup.forEach(function (amt, id) {
      var g = BY_ID[id];
      if (!g) return;
      var r = amt / g.def;
      DIMS.forEach(function (d) { f[d.k] += (g.f[d.k] || 0) * r; });

      var ml = amt * (g.mlu || 0);
      if (ml > 0) liquid += ml;
      if (ml > 0) acidLoad += ml * acidPerMl(phOf(g));
      if (g.abv) alcoholMl += ml * g.abv / 100;
      if (g.ice) hasIce = true;
      if (isBase(g)) { hasBase = true; nBase++; baseMl += ml; }
      else if (!g.ice) nOthers++;
      if (g.cat === 'juice') juiceMl += ml;
      if (DAIRY_FAT[g.id] || LACTIC[g.id]) hasDairy = true;
      if (DAIRY_FAT[g.id]) { dairyFat = true; if (!dairyName) dairyName = g.name; }
      if (ENZYMES[g.id] && ml > 0) enzymes.push(ENZYMES[g.id]);
      if (HOT[g.id]) isHot = true;
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
    var dilution = isHot ? 0 : liquid * 0.15;
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
      /* 纯饮：杯里只有一样含酒精的东西（加不加冰都算），没有任何配料。
         不限定"必须是基酒"——单喝金巴利、单喝咖啡利口酒同样是纯饮。 */
      neatPour: nItems === 1 && alcoholMl > 3
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

  function iceLevelOf(id) {
    for (var i = 0; i < ICE_LEVELS.length; i++) if (ICE_LEVELS[i].id === id) return ICE_LEVELS[i];
    return ICE_LEVELS[0];
  }

  /* 这只杯子有多少冰（chilled 的杯子天然没有冰） */
  function iceNow(g) { return g.ice === 'inglass' ? iceLevelOf(state.iceLevel) : ICE_LEVELS[2]; }
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
    if (melt <= 0) {
      return { level: '不用管', short: '冰镇后滤掉冰，不会越喝越淡',
               msg: (state.iceLevel === 'none' && g.ice === 'inglass')
                 ? '你选了不加冰，所以不会越喝越淡——代价是温度会一路升上来，尽快喝完。'
                 : '「' + g.name + '」是冰镇之后把冰滤掉的杯子——酒是冰的，但杯里没有冰，所以不会越喝越淡。' };
    }
    var afterVol = a.finalVol + melt;
    var after = afterVol > 0 ? a.alcoholMl / afterVol * 100 : 0;
    var short = a.abv.toFixed(1) + '% → 化开后 ' + after.toFixed(1) + '%';
    if (after >= band.lo) {
      return { level: '高', short: short,
               msg: '化水容忍度很高：「' + g.name + '」里的冰全化开（约 +' + melt + 'ml）之后还有 '
                 + after.toFixed(1) + '%，仍在你的「' + band.name + '」区间里，可以慢慢喝。' };
    }
    if (a.abv >= band.lo) {
      return { level: '中', short: short,
               msg: '化水容忍度一般：刚做好是 ' + a.abv.toFixed(1) + '%，冰全化开会掉到 ' + after.toFixed(1)
                 + '%，低于你的「' + band.name + '」区间（' + band.lo + '-' + band.hi + '%）。'
                 + ' 想拖久一点就换大块冰——同样一只杯子，大方冰的 melt 只有小冰的一半。' };
    }
    return { level: '低', short: short,
             msg: '化水容忍度低：现在就已经 ' + a.abv.toFixed(1) + '% 偏淡，冰再化开只会更淡。'
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
      return '<button type="button" class="chip' + (inCup ? ' on' : '') + '" data-add="' + g.id +
        '" title="' + esc(g.note + ' —— ' + st.text) + '">' +
        '<span class="cn">' + esc(g.name) + '</span>' +
        '<span class="tags">' +
          '<span class="src s-' + g.src + '">' + SRC_NAME[g.src] + '</span>' +
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
      var hint = fruitHint(g, amt);
      html += '<div class="cup-item">' +
        '<div class="ci-main">' +
          '<span class="ci-name">' + esc(g.name) +
            (hint ? ' <i class="ci-eq">' + esc(hint) + '</i>' : '') +
            (st.risk > 0 ? ' <span class="risk r' + st.risk + '">' + RISK_LABEL[st.risk] + '</span>' : '') +
          '</span>' +
          '<span class="ci-note">' + esc(g.note) + '</span>' +
        '</div>' +
        '<div class="ci-ctl">' +
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
    document.getElementById('bigScore').textContent = empty ? '--' : (neat ? '纯饮' : Math.round(total));
    document.getElementById('scoreUnit').textContent = neat ? '　不作评分' : ' / 100';
    document.getElementById('verdictTitle').textContent =
      empty ? '先把材料放进杯子' : (neat ? '纯饮 · 只描述味道' : band[1]);
    document.getElementById('verdictText').textContent = empty
      ? '从下面「材料库」随便点两样开始，风味图和评分会实时跟着变。'
      : (neat ? neatDescribe(a) + '加一点气泡水或一条柠檬皮，它才会变成一杯酒。' : band[2]);

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
    document.getElementById('subScores').innerHTML = neat ? '' :
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
      + '">容忍度 ' + dil.level + '</b>　<span class="dil-num">' + esc(dil.short) + '</span></div>'
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
  }

  function statBox(label, val) {
    return '<div class="stat"><span class="st-l">' + label + '</span><span class="st-v">' + val + '</span></div>';
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
    renderGlassPick(); renderTastePick(); renderIcePick(); renderSchemePick(); renderGlass();
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

    var over = a.liquid > g.liquidMax;
    document.getElementById('glassNote').innerHTML =
      '<b>' + esc(g.name) + '</b>　' + esc(g.note) + '<br>液体 ' + Math.round(a.liquid)
      + ' / 上限 ' + liquidMaxFor(g) + 'ml　' + esc(lv.name)
      + (lv.id === 'full' ? '（冰约占 ' + Math.round((1 - liquidFrac) * 100) + '% 体积）'
         : (lv.id === 'half' ? '（冰约占 ' + Math.round(a.liquid ? 20 : 0) + '% 体积）' : ''))
      + (over ? '　<span class="over">已经超了 ' + Math.round(a.liquid - g.liquidMax) + 'ml</span>' : '');
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
    var t = e.target.closest ? e.target.closest('button') : null;
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
      state.swapOpen = false;
      renderCup(); renderResult(); renderLib(); renderGlassPick(); renderIcePick();
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
    }
  };
})();
