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
  /* 这一维现在只认真碳酸：不冒气的材料（薄荷叶、黄瓜、冰红茶、中国版红牛…）一律 0，
     所以图上的名字还是叫「气泡」最直白——数值就是"碳酸带来的刺激有多强"。
     "杯里到底有没有气"这个事实判断看 hasFizzIng，跟这个数值分开。 */
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
    fresh:   '#5f8a4f',
    garnish: '#9aa86a',
    ice:     '#ffffff'
  };
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
  /* 说明：以前每种材料用不同形状（圆/三角/方/菱形/六边形）来区分"是哪一瓶"。
     现在改成《萨沙的调酒哲学》那套点阵画法——统一圆点、颜色分材料、层高分比例，
     所以形状那套连同 shapeEl 一起删了。 */
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
      open: {},
      /* ④ 手边有什么：勾了的材料（id → 1）、以及这杯是从哪条配方来的（备注显示在杯子下面） */
      have: {},
      haveCat: 'gin',
      recipeName: '',
      recipeSub: '',
      recipeTip: '',
      refMiss: [],
      /* 参考本写了、本库确实没有的那几样（按参考本装杯时只能拿替代品顶） */
      refNotStocked: []
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
    /* 谁是这杯的"主心骨"（贡献酒精最多的那样）——用来判断"基酒是不是冷冻的" */
    var baseG = null, baseAlc = 0;

    state.cup.forEach(function (amt, id) {
      var g = BY_ID[id];
      if (!g) return;
      var r = amt / g.def;
      DIMS.forEach(function (d) { f[d.k] += (g.f[d.k] || 0) * r; });

      var ml = amt * (g.mlu || 0);
      if (ml > 0) liquid += ml;
      if (ml > 0) acidLoad += ml * acidPerMl(phOf(g));
      if (g.abv) alcoholMl += ml * abvOf(g) / 100;
      if (g.abv && ml * abvOf(g) > baseAlc) { baseAlc = ml * abvOf(g); baseG = g; }
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
    /* 5 以上才算"带气的材料"：可乐、芬达、红牛都是 5，之前的门槛 6
       把它们漏掉了，于是"自由古巴"会被说成没有气泡 */
    if ((g.f.fizz || 0) >= 5) hasFizzIng = true;
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
    /* 材料全是常温时摇壶要加多少水——用来对比"换成冷冻基酒能少加多少" */
    var prepDilRoom = (neatPour || isHot) ? 0 : liquid * dilBase;

    /* 材料平均"冷量"：0 = 全是常温 25℃，1 = 全都冻透了 -18℃。
       冷藏 5℃ 大约是 0.47。这是百分比，不是温度——
       它用来给结构分里"这杯端出来够不够冰"那一点打分（见 scoreStructure）。 */
    var coldSum = 0, coldVol = 0;
    parts.forEach(function (p) { coldSum += p.ml * (25 - p.c); coldVol += p.ml; });
    var cold = coldVol > 0 ? clamp(coldSum / (coldVol * 43), 0, 1) : 0;

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
      prepDil: prepDil, prepDilRoom: prepDilRoom, parts: parts,
      cold: cold, baseTemp: baseG ? tempIdOf(baseG) : '', baseName: baseG ? baseG.name : '',
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

  /* 这杯多少度，就配哪一档口味

     点开一杯干马天尼，如果带着默认的「标准（7-26%）」，一进来就被判"太烈了"——
     不是这杯酒的问题，是口味选错了。所以点配方时按它实际的度数挑最贴的区间：
     马天尼（35%）→ 浓烈，金汤力（12%）→ 标准，养乐多烧酒（4.5%）→ 清淡。
     这样"冷冻基酒让酒更浓"才不会被"太烈"这条反过来罚。 */
  function tasteForAbv(abv) {
    var best = TASTES[1], bestD = Infinity;
    TASTES.forEach(function (t) {
      var d = abv < t.lo ? t.lo - abv : (abv > t.hi ? abv - t.hi : 0);
      if (d < bestD) { bestD = d; best = t; }
    });
    return best.id;
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

  /* 给结构那一栏用的一句话：材料到底够不够冰 */
  function coldLabel(a) {
    if (!a.hasBase) return '没有酒';
    var t = a.baseTemp === 'frozen' ? '基酒冷冻'
      : (a.baseTemp === 'cold' ? '基酒冷藏' : '基酒常温');
    if (a.cold >= 0.55) return '材料够冰（' + t + '）';
    if (a.cold >= 0.2) return '材料偏凉（' + t + '）';
    return t + ' · 冰得不够';
  }

  function scoreStrength(a) {
    if (!a.hasBase) return 76;
    var t = tasteBand(a.taste), abv = a.abv;
    if (abv >= t.lo && abv <= t.hi) return 100;
    if (abv < t.lo) return interp(abv / t.lo, [[0, 15], [0.35, 45], [0.6, 72], [0.82, 90], [1, 100]]);
    /* 超出你选的区间，只轻轻扣——烈度本来就该是"浮动"，不该盖过平衡和工艺。
       原来最多扣到 45 分，一杯马天尼光这一项就能吃掉 4 分多；
       现在最多掉到 68。警告文字照常说，只是不再一棍子打死。
       （太淡那条曲线没动：喝起来像饮料是真的缺陷。） */
    return interp((abv - t.hi) / (t.out - t.hi), [[0, 100], [0.35, 90], [0.7, 80], [1, 68]]);
  }

  function scoreStructure(a) {
    var g = glassOf(state.glass);
    /* 34 基础 + 40 温度 + 26 气泡 = 100。
       容量（装不装得下）不参与打分——杯子容量只是个大概值，
       你手上那只可能比标称的大，所以只在建议栏提醒。 */
    var s = 34;
    /* ① 温度（40）：34 分打底（有冰就算数），剩下 6 分看"材料够不够冰"。

       为什么要管材料温度：马天尼、古典这类酒，酒吧会把基酒整瓶放冷冻室。
       同样搅二十秒，冷冻的基酒化出来的水少一大截，入口更利落、香气更收得住。
       这件事分值故意给得小（最多 6 分 × 结构权重 22% ≈ 总分 1.3 分）——
       平衡永远是最大权重，温度不该盖过它。真正让用户看懂的是化水那栏的数字和建议里那句话。 */
    if (a.isHot) s += 40;
    else if (a.hasIce || g.ice === 'chilled') s += 34 + 6 * (a.cold || 0);
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

    /* "这杯没经过冰"——注意不能说成"没有冰"：
       马天尼是马天尼杯里没有冰，但它是搅拌出来的，做过冰了。
       只有"兑和、又没放冰"才是真的从头到尾没碰过冰。 */
    if (!a.hasIce && !a.isHot && a.abv > 12 && a.prepDil <= 0)
      add(96, 'warn', '这杯从头到尾没碰过冰（兑和 + 不放冰），现在就是常温的。'
        + '同一杯酒降到 10-15℃ 之后，甜味会收、香气会打开，差别比换一瓶酒还大。'
        + '便利店的冰杯加一个泡沫保温箱就能解决；或者换成「搅拌 Stir」再倒进来。');

    /* 温度这条线：材料是冰的还是常温的，冰化掉多少完全不一样 */
    if (a.iceMass > 0 && a.meltIce >= 25)
      add(95, 'warn', '这些材料会把冰化掉约 ' + a.meltIce + 'ml——你的材料大多是常温的（'
        + tempMixText(a.tempMix) + '）。' + Math.round(a.meltIce) + 'ml 水直接进了这杯酒。'
        + '把基酒整瓶放冷冻室、饮料买冷藏的，同样的配方能少掉一大半水。');
    else if (a.iceMass > 0 && a.meltRoom - a.meltIce >= 25)
      add(74, 'tip', '这杯只化掉约 ' + a.meltIce + 'ml 冰（' + tempMixText(a.tempMix)
        + '）。材料全放常温的话会化掉 ' + a.meltRoom + 'ml——基酒放冷冻、饮料买冷藏的，'
        + '就是少掉这 ' + (a.meltRoom - a.meltIce) + 'ml 水的办法。');

    /* 基酒的温度：马天尼、古典这类烈酒向的酒，酒吧会把基酒整瓶放冷冻 */
    if (!a.isHot && !a.neatPour && a.hasBase && a.abv >= 20 && a.baseTemp === 'room'
        && (a.hasIce || glassOf(state.glass).ice === 'chilled'))
      add(90, 'tip', '「' + a.baseName + '」现在是常温的。马天尼、古典这类烈酒向的酒，'
        + '酒吧会把基酒整瓶放冷冻室：同样搅二十秒，冷冻基酒化出来的水少一大截，'
        + '入口更利落、香气也更收得住。把这一行的温度标签点到「冷冻」就能看到差别'
        + '（结构分里也算这一条）。');
    else if (!a.neatPour && a.baseTemp === 'frozen' && a.abv >= 20 && a.prepDilRoom > 0)
      add(60, 'ok', '基酒是冷冻的：这杯摇壶里只加了约 ' + Math.round(a.prepDil)
        + 'ml 水，而常温基酒要加约 ' + Math.round(a.prepDilRoom)
        + 'ml。少掉的这些水就是酒吧把基酒放冷冻的原因——更烈、但不呛。');

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
    var q = libQuery.trim().toLowerCase();
    var searching = !!q;
    var list = INGREDIENTS.filter(function (g) {
      if (searching) {
        /* 搜索时跨分类找——找"柠檬"要能一次看到柠檬汁、柠檬皮、柠檬糖浆 */
        return (g.name + ' ' + g.id).toLowerCase().indexOf(q) >= 0
          && !(state.hideRisky && storeOf(g).risk >= 2);
      }
      if (g.cat !== state.cat) return false;
      if (state.hideRisky && storeOf(g).risk >= 2) return false;
      return true;
    });

    document.getElementById('lib').innerHTML =
      '<div class="libgroup">' + esc(searching ? '搜到 ' + list.length + ' 样' : catName(state.cat))
      + '<span>' + list.length + ' 种</span></div>'
      + (list.length
          ? list.map(function (g) {
              /* 跨分类的结果里标出它属于哪一类，不然一堆不同栏的材料混在一起会懵 */
              return libChip(g, 'data-add', state.cup.has(g.id), searching);
            }).join('')
          : '<p class="hint">没找到这个材料。</p>');
  }

  /* 材料库和"手边有什么"共用同一张卡片——两处样式必须一样，
     所以只有 data 属性和"选中"来源不同，其余都从这里出 */
  function libChip(g, attr, on, showCat) {
    var st = storeOf(g);
    var tp = tempOf(g);
    return '<button type="button" class="chip' + (on ? ' on' : '') + '" ' + attr + '="' + g.id +
      '" title="' + esc(g.note + ' —— ' + st.text + ' —— 建议' + tp.name + '（' + tp.c + '℃）：' + tp.note) + '">' +
      '<span class="cn">' + esc(g.name) + '</span>' +
      '<span class="tags">' +
        (showCat ? '<span class="src s-cat">' + esc(catName(g.cat)) + '</span>' : '') +
        '<span class="src s-' + g.src + '">' + SRC_NAME[g.src] + '</span>' +
        (hasTemp(g) ? '<span class="tagtemp t-' + tempIdOf(g) + '">' + esc(tp.name) + '</span>' : '') +
        '<span class="risk r' + st.risk + '">' + RISK_LABEL[st.risk] + '</span>' +
      '</span>' +
      '</button>';
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
        + Math.round(a.liquid) + '/' + liquidMaxFor(glassOf(state.glass)) + 'ml'
        + (a.isHot ? '' : ' · ' + coldLabel(a))) +
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

    /* 这杯是哪条配方、这条配方的备注——原来备注挤在配方卡片里，
       现在卡片只留名字用料，备注挪到杯子下面（用户要求的） */
    var noteBox = document.getElementById('recipeNote');
    if (noteBox) {
      if (!state.recipeName) noteBox.innerHTML = '';
      else {
        noteBox.innerHTML =
          '<div class="rn-head"><b>' + esc(state.recipeName) + '</b>'
          + (state.recipeSub ? '<span>' + esc(state.recipeSub) + '</span>' : '') + '</div>'
          + (state.recipeTip ? '<p class="rn-tip">' + esc(state.recipeTip) + '</p>' : '')
          + (state.refMiss.length
              ? '<p class="rn-miss">还缺：<b>' + state.refMiss.map(esc).join('、')
                + '</b>　杯子里的量按标准配方装好了，缺的那几样记得补。</p>'
              : '')
          + (state.refNotStocked.length
              ? '<p class="rn-miss">参考本写的是 <b>' + state.refNotStocked.map(esc).join('、')
                + '</b>，本库没有一样的，杯子里装的是替代品（上面材料表里能看到实际放的量）。'
                + '想原样复刻，这几样得自己买。</p>'
              : '');
      }
    }
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
      /* "可省"的材料标出来——比如威士忌酸里的盐水，
         不然用户会以为少了它就做不成（清单在 data.js 的 OPTIONAL_ING） */
      return shortName(g) + ' ' + fmtAmt(g, it[1]) + (OPTIONAL_ING[g.id] ? '（可省）' : '');
    }).filter(Boolean).join(' · ');
  }

  /* 预设卡片。原来挂在调酒台的「经典配方」面板上，
     现在面板搬去了酒单的「住处特调」栏，这里只负责把卡片画出来。 */
  function presetCardHtml(i) {
    var p = PRESETS[i];
    if (!p) return '';
    return '<button type="button" class="preset" data-preset="' + i + '">' +
      '<span class="p-name">' + esc(p.name) + '</span>' +
      '<span class="p-sub">' + esc(p.sub) + '</span>' +
      '<span class="p-comp">' + esc(compLine(p)) + '</span>' +
      '</button>';
  }
  /* 按名字找预设的下标（酒单要用我们的调法时） */
  function presetIndexByName(name) {
    for (var i = 0; i < PRESETS.length; i++) if (PRESETS[i].name === name) return i;
    return -1;
  }

  /* =========================================================
     ④ 手边有什么 → 现在能做什么

     反向查：勾上你手上有的酒和材料，算出 191 份参考配方里
     哪些现在就能做、哪些还差一两样。
     材料名到本库的对照表在 tools/build-ref-index.js，生成 ref-recipes.js。
     ========================================================= */
  var HAVE_KEY = 'barmix.have.v1';
  var haveQuery = '';
  var libQuery = '';          /* ③ 材料库的搜索词 */
  var haveOpen = {};          /* 哪一组展开了（默认每组只画前 8 条） */
  var HAVE_SHOW = 8;

  /* 参考数据里写的杯型 → 本库的杯子 */
  var REF_GLASS = [
    [/香槟杯|笛形|flute/i, 'flute'],
    [/马天尼杯|coupe|玛格丽特杯|尼克诺拉|红酒杯|葡萄酒杯/i, 'coupe'],
    [/^(酒杯)$/, 'coupe'],           /* 参考本写"酒杯"的（基尔）就是葡萄酒杯 */
    [/古典杯|rock|白兰地杯|铜杯|朱丽普/i, 'rocks'],
    [/柯林杯|高球杯|莫吉托杯/i, 'highball'],
    [/TIKI|飓风/i, 'hurricane'],
    [/利口酒杯|一口杯|子弹/i, 'shot'],
    [/马克杯|爱尔兰咖啡|陶杯/i, 'mug'],
    [/冰杯/i, 'icecup']
  ];
  function glassFromRef(r) {
    var s = String(r.glass || '');
    for (var i = 0; i < REF_GLASS.length; i++) if (REF_GLASS[i][0].test(s)) return REF_GLASS[i][1];
    /* 没写杯型就按"要不要滤冰"猜一个 */
    if (/无冰/.test(r.ice || '') && (r.method === 'stir' || r.method === 'shake')) return 'coupe';
    return 'highball';
  }
  function methodFromRef(m) {
    if (m === 'shake' || m === 'blended') return 'shake';
    if (m === 'stir' || m === 'rolling') return 'stir';
    return 'build';        /* build / smash / 没写 */
  }
  /* "45ml / 2dash / 3片 / 一个 / 15g" → 数字。单位对不上就用材料的默认量 */
  function parseAmount(txt, g) {
    var s = String(txt || '');
    var m = s.match(/(\d+(?:\.\d+)?)/);
    var n = m ? parseFloat(m[1]) : NaN;
    var u = g.unit;
    if (u === 'ml') {
      if (n && /cl\b/.test(s)) return n * 10;
      if (n && /(oz|盎司)/.test(s)) return n * 30;
      if (n && /(ml|毫升)/.test(s)) return n;
      return g.def;
    }
    if (u === '滴') return (n && /(dash|滴)/i.test(s)) ? n : g.def;
    if (u === '片') return (n && /(片|条)/.test(s)) ? n : g.def;
    if (u === '颗') return (n && /(颗|粒|个)/.test(s)) ? n : g.def;
    if (u === 'g') return (n && /(g|克)/.test(s)) ? n : g.def;
    return g.def;
  }
  /* ---------------------------------------------------------
     类型：谁跟谁能替（表在 data.js，规则见那里的注释）
     --------------------------------------------------------- */
  function typeOf(id) { return DRINK_TYPE[id] || id; }      /* 没登记的：自己是自己一类 */
  /* 能替这条类型的全部类型（含自己）：威士忌七类互相能替，其余只认自己 */
  var SWAP_CACHE = {};
  function swapTypesOf(t) {
    if (SWAP_CACHE[t]) return SWAP_CACHE[t];
    var out = [t];
    var g = TYPE_SWAP[t];
    if (g) Object.keys(TYPE_SWAP).forEach(function (k) { if (TYPE_SWAP[k] === g) out.push(k); });
    SWAP_CACHE[t] = out;
    return out;
  }
  /* 这条类型属于哪个"家族"（用来给买酒建议去重、写"你不在这类"） */
  function familyOfType(t) {
    var hit = '';
    Object.keys(FAMILY_TYPES).forEach(function (f) {
      if (FAMILY_TYPES[f].indexOf(t) >= 0) hit = f;
    });
    return hit || t;
  }
  function typeName(t) {
    if (TYPE_NAME[t]) return TYPE_NAME[t];
    if (BY_ID[t]) return BY_ID[t].name.replace(/（.*?）/g, '');
    return t;
  }
  /* 这个类型属于哪个材料分类（用来判断"你手上有同大类、但不能替的那瓶"） */
  function catOfType(t) {
    if (BY_ID[t]) return BY_ID[t].cat;
    for (var i = 0; i < INGREDIENTS.length; i++) {
      if (typeOf(INGREDIENTS[i].id) === t) return INGREDIENTS[i].cat;
    }
    return '';
  }
  function isSpiritCat(c) {
    return c === 'gin' || c === 'whisky' || c === 'rum' || c === 'vodka'
      || c === 'tequila' || c === 'brandy' || c === 'otherbase';
  }

  /* 这条需求，勾了的材料能不能满足；是"完全一样"还是"同组能替" */
  function needStatus(need, mine) {
    return needStatusWith(need, mine || Object.keys(state.have));
  }
  function needStatusWith(need, mine) {
    var hits = [];
    if (need.pantry) return { ok: true, exact: true, hits: [] };
    if (need.id) {
      hits = mine.filter(function (id) { return id === need.id; });
      return { ok: hits.length > 0, exact: hits.length > 0, hits: hits };
    }
    if (need.ids) {
      hits = mine.filter(function (id) { return need.ids.indexOf(id) >= 0; });
      return { ok: hits.length > 0, exact: hits.length > 0, hits: hits };
    }
    if (need.cat) {
      hits = mine.filter(function (id) { return BY_ID[id] && BY_ID[id].cat === need.cat; });
      return { ok: hits.length > 0, exact: hits.length > 0, hits: hits };
    }
    if (need.type) {
      hits = mine.filter(function (id) { return typeOf(id) === need.type; });
      if (hits.length) return { ok: true, exact: true, hits: hits };
      var allow = swapTypesOf(need.type);
      hits = mine.filter(function (id) { return allow.indexOf(typeOf(id)) >= 0; });
      if (hits.length) return { ok: true, exact: false, hits: hits, wantType: need.type };
      return { ok: false, exact: false, hits: [] };
    }
    if (need.family) {
      var fam = FAMILY_TYPES[need.family] || [];
      hits = mine.filter(function (id) { return fam.indexOf(typeOf(id)) >= 0; });
      return { ok: hits.length > 0, exact: hits.length > 0, hits: hits };
    }
    return { ok: false, exact: false, hits: [] };
  }

  /* 缺的那一样，界面上叫什么 */
  function needLabel(nd) {
    var n = nd.need;
    if (n.type) return typeName(n.type);
    if (n.family) return FAMILY_NAME[n.family] || n.n;
    if (n.id && BY_ID[n.id]) return BY_ID[n.id].name.replace(/（.*?）/g, '');
    if (n.ids && BY_ID[n.ids[0]]) return BY_ID[n.ids[0]].name.replace(/（.*?）/g, '');
    if (n.cat) return catName(n.cat);
    return n.n;
  }
  /* 勾的东西里，哪几瓶满足这条需求（用来写"用上你的：……"） */
  function needHits(nd) { return needStatus(nd.need).hits; }

  /* 勾选状态存在本地，下次打开还在 */
  function loadHave() {
    try {
      var s = window.localStorage && window.localStorage.getItem(HAVE_KEY);
      if (s) JSON.parse(s).forEach(function (id) { if (BY_ID[id]) state.have[id] = 1; });
    } catch (e) { /* 无痕模式 / 本地文件用不了存储，不勾也一样能玩 */ }
  }
  function saveHave() {
    try {
      if (window.localStorage) window.localStorage.setItem(HAVE_KEY, JSON.stringify(Object.keys(state.have)));
    } catch (e) {}
  }

  function needOk(need, mine) { return needStatus(need, mine).ok; }

  /* 硬缺口：真缺的东西（点缀和"可选"不算） */
  function missingOf(r, mine) {
    return (r.needs || []).filter(function (nd) {
      return !nd.need.optional && !needOk(nd.need, mine);
    });
  }
  /* 用上了你几样（只数非"可选"的） */
  function usedOf(r, mine) {
    return (r.needs || []).filter(function (nd) {
      return !nd.need.optional && needOk(nd.need, mine);
    });
  }
  /* 替用提醒：同组不同类型 → "配方一般是 X，你的 Y 也能做，风味会不一样" */
  function swapNotes(r, mine) {
    var out = [];
    (r.needs || []).forEach(function (nd) {
      if (nd.need.optional) return;
      var st = needStatus(nd.need, mine);
      if (!st.ok || st.exact || !st.wantType || !st.hits.length) return;
      out.push('配方一般是' + typeName(st.wantType) + '，你的'
        + BY_ID[st.hits[0]].name.replace(/（.*?）/g, '') + '也能做，风味会不一样');
    });
    return out;
  }
  /* 缺的是酒、而你手上有同大类但不能替的那瓶 → 说明一句，免得你困惑 */
  function familyNote(r, mine) {
    mine = mine || Object.keys(state.have);
    var out = [];
    missingOf(r, mine).forEach(function (nd) {
      var n = nd.need, allow = [], cat = '';
      if (n.type) { allow = swapTypesOf(n.type); cat = catOfType(n.type); }
      else if (n.family) { allow = FAMILY_TYPES[n.family] || []; cat = FAMILY_CAT[n.family] || ''; }
      else return;
      if (!isSpiritCat(cat)) return;
      var sameCat = mine.filter(function (id) {
        return BY_ID[id] && BY_ID[id].cat === cat && allow.indexOf(typeOf(id)) < 0;
      });
      if (sameCat.length) out.push(BY_ID[sameCat[0]].name.replace(/（.*?）/g, '') + '不在这一类');
    });
    return out;
  }

  function renderHaveList() {
    var box = document.getElementById('haveList');
    if (!box) return;
    var q = haveQuery.trim().toLowerCase();
    var list, head;
    if (q) {
      /* 搜索的时候跨分类找，省得一个个翻 */
      list = INGREDIENTS.filter(function (g) {
        return (g.name + ' ' + g.id).toLowerCase().indexOf(q) >= 0;
      });
      head = '搜到 ' + list.length + ' 样';
    } else {
      list = INGREDIENTS.filter(function (g) { return g.cat === state.haveCat; });
      head = catName(state.haveCat);
    }
    box.innerHTML =
      '<div class="libgroup">' + esc(head) + '<span>' + list.length + ' 样</span></div>'
      + (list.length ? list.map(function (g) {
          return libChip(g, 'data-have', !!state.have[g.id]);
        }).join('') : '<p class="hint">没找到这个材料。</p>');
    var n = Object.keys(state.have).length;
    document.getElementById('haveCount').textContent = n
      ? '勾了 ' + n + ' 样' : '一样都没勾——点卡片就是"我有这个"';
  }

  /* ④ 的分类标签：跟材料库同一套样式，只是换成"我有哪一类" */
  function renderHaveCats() {
    var box = document.getElementById('haveCats');
    if (!box) return;
    var keep = box.scrollLeft;
    box.innerHTML = CATS.map(function (c, i) {
      var on = c.id === state.haveCat ? ' on' : '';
      var sep = (i > 0 && CATS[i - 1].id === 'otherbase') ? '<span class="cat-sep"></span>' : '';
      return sep + '<button type="button" class="cat' + on + '" data-havecat="' + c.id + '">'
        + c.name + '</button>';
    }).join('');
    box.scrollLeft = keep;
    scrollCatIntoView(box);
  }

  function refCard(x) {
    var miss = x.miss;
    var missText = miss.length
      ? '还缺 ' + miss.length + ' 种：' + miss.map(function (nd) {
          var lab = needLabel(nd);
          /* 库里只有近似物时才说明，而且写"配方写的是……"——写"用XX代替XX"是废话 */
          var raw = String(nd.n).replace(/（.*?）/g, '').trim();
          return esc(lab) + (nd.need.approx && raw && raw !== lab ? '（配方写的是' + esc(raw) + '）' : '');
        }).join('、')
      : '材料齐了，现在就能做 ✓';
    /* 用上你哪些东西：写类型名或瓶子名，让人一眼看出"这杯跟我的材料有关系" */
    var usedNames = [];
    x.used.forEach(function (nd) {
      needHits(nd).forEach(function (id) {
        var nm = BY_ID[id].name.replace(/（.*?）/g, '');
        if (usedNames.indexOf(nm) < 0) usedNames.push(nm);
      });
    });
    var usedText = usedNames.length
      ? '用上你的：' + usedNames.slice(0, 3).join('、') + (usedNames.length > 3 ? ' 等 ' + usedNames.length + ' 样' : '')
      : '';
    /* 排版照材料库那张卡片来（用户说别自己发明） */
    return '<button type="button" class="refcard' + (miss.length ? '' : ' done') + '" data-ref="' + x.i + '">'
      + '<span class="rc-head"><b>' + esc(x.r.zh) + '</b>'
        + (x.pick ? '<i class="rc-pick">推荐</i>' : '')
        + '<i class="rc-en">' + esc(x.r.en || '') + '</i></span>'
      + (usedText ? '<span class="rc-used">' + esc(usedText) + '</span>' : '')
      + '<span class="rc-miss">' + missText + '</span>'
      + (x.swap.length ? '<span class="rc-swap">' + esc(x.swap.join('；')) + '</span>' : '')
      + (x.fam.length ? '<span class="rc-swap">' + esc(x.fam.join('；')) + '</span>' : '')
      + (x.opt.length ? '<span class="rc-opt">可选：' + x.opt.map(esc).join('、') + '</span>' : '')
      + '</button>';
  }

  function renderHaveResult() {
    var out = document.getElementById('haveOut');
    if (!out) return;
    var n = Object.keys(state.have).length;
    if (!n) {
      out.innerHTML = '<p class="hint haveempty">左边勾上你手边有的酒和材料，这里就会按顺序列出：'
        + '<b>现在就能做</b>的、<b>还缺 1 种</b>的、<b>还缺 2 种</b>的，缺的那几样会直接写在名字下面。<br>'
        + '手上只有一瓶基酒也先勾上——至少能告诉你差什么。</p>';
      return;
    }
    var rows = [];
    /* 勾了哪些只取一次，别在每次判断需求时都重建一遍数组（191 份配方 × 5 条需求） */
    var mine = Object.keys(state.have);
    REF_RECIPES.forEach(function (r, i) {
      /* 每条需求只判断一次：以前是 miss、used、替用提醒、大类提醒各算一遍，
         191 份配方 × 5 条需求被反复判断三四次——这才是那 47ms 的来源。 */
      var miss = [], used = [], opt = [], swap = [], fam = [];
      (r.needs || []).forEach(function (nd) {
        var st = needStatus(nd.need, mine);
        if (nd.need.optional) {
          if (!st.ok) opt.push(String(nd.n).replace(/[（(]可选[)）]/g, '').trim());
          return;
        }
        if (st.ok) {
          used.push(nd);
          /* 同组不同类型 → 记一句"风味会不一样" */
          if (!st.exact && st.wantType && st.hits.length) {
            swap.push('配方一般是' + typeName(st.wantType) + '，你的'
              + BY_ID[st.hits[0]].name.replace(/（.*?）/g, '') + '也能做，风味会不一样');
          }
          return;
        }
        miss.push(nd);
        /* 缺的是酒、而你手上有同大类但不能替的那瓶 → 说明一句 */
        var allow = [], cat = '';
        if (nd.need.type) { allow = swapTypesOf(nd.need.type); cat = catOfType(nd.need.type); }
        else if (nd.need.family) { allow = FAMILY_TYPES[nd.need.family] || []; cat = FAMILY_CAT[nd.need.family] || ''; }
        if (isSpiritCat(cat)) {
          var sameCat = mine.filter(function (id) {
            return BY_ID[id] && BY_ID[id].cat === cat && allow.indexOf(typeOf(id)) < 0;
          });
          if (sameCat.length) fam.push(BY_ID[sameCat[0]].name.replace(/（.*?）/g, '') + '不在这一类');
        }
      });
      if (miss.length > 2) return;
      /* 核心：这杯必须用得上你勾的东西，否则勾了等于白勾（原来会推荐教父这种毫无关系的） */
      if (!used.length) return;
      rows.push({
        r: r, i: i, miss: miss, opt: opt, used: used,
        swap: swap, fam: fam,
        pick: !!r.pick, n: r.needs.length
      });
    });
    /* 排序：用上你最多的 → 缺得最少的 → 材料少的 → 推荐款（推荐只做平手规则） */
    rows.sort(function (a, b) {
      if (a.used.length !== b.used.length) return b.used.length - a.used.length;
      if (a.miss.length !== b.miss.length) return a.miss.length - b.miss.length;
      if (a.n !== b.n) return a.n - b.n;
      if (a.pick !== b.pick) return a.pick ? -1 : 1;
      return 0;
    });

    /* 手上有没有"酒"（abv≥15 的算酒）——没有的话要专门指一条路 */
    var noBooze = !mine.some(function (id) { return BY_ID[id] && BY_ID[id].abv >= 15; });

    var groups = [
      { k: 0, title: '现在就能做', note: '材料都齐了' },
      { k: 1, title: '还缺 1 种', note: '多半是饮料或柠檬' },
      { k: 2, title: '还缺 2 种', note: noBooze ? '含一瓶酒，顺手一起买' : '顺手一起买' }
    ];
    var html = '';
    /* 没有酒、或者一条都凑不出 → 把"先买哪类酒最划算"放最上面 */
    if (noBooze || !rows.length) html += buyBox(noBooze);
    groups.forEach(function (g) {
      var list = rows.filter(function (x) { return x.miss.length === g.k; });
      if (!list.length) return;
      var open = !!haveOpen[g.k];
      var show = open ? list : list.slice(0, HAVE_SHOW);
      html += '<div class="refgroup"><b>' + g.title + '</b><span>' + list.length + ' 款　'
        + esc(g.note) + '</span></div>';
      html += '<div class="refgrid">' + show.map(refCard).join('') + '</div>';
      /* 展开之后要能收回去（用户提的） */
      if (!open && list.length > HAVE_SHOW)
        html += '<button type="button" class="ghost refmore" data-havemore="' + g.k + '">'
          + '展开剩下的 ' + (list.length - HAVE_SHOW) + ' 款</button>';
      else if (open && list.length > HAVE_SHOW)
        html += '<button type="button" class="ghost refmore" data-havemore="' + g.k + '">收起</button>';
    });
    out.innerHTML = html || '<p class="hint haveempty">勾了的材料还凑不出经典配方——再勾几样试试。</p>';
  }

  function renderHave() { renderHaveCats(); renderHaveList(); renderHaveResult(); }
  /* 连点材料时，结果列表等手停下来再算（90ms）——省掉中间那几次重算 */
  var haveTimer = 0;
  function scheduleHaveResult() {
    if (haveTimer) return;
    haveTimer = setTimeout(function () {
      haveTimer = 0;
      renderHaveResult();
    }, 90);
  }

  /* 杯子那张图的图例：色点 + 类别名
     六种基酒颜色太接近，合成一条「基酒」；其余各占一条。
     颜色直接从 CAT_STYLE 取，改配色时图例跟着变，不会走样。 */
  function renderGlassLegend() {
    var box = document.getElementById('glassLegend');
    if (!box) return;
    var baseCats = { whisky: 1, gin: 1, rum: 1, vodka: 1, tequila: 1, brandy: 1, otherbase: 1 };
    var items = [{ name: '基酒', color: CAT_STYLE.whisky }];
    CATS.forEach(function (c) {
      if (baseCats[c.id]) return;
      items.push({ name: c.name, color: CAT_STYLE[c.id] || CAT_STYLE.mixer });
    });
    items.push({ name: '冰', color: '#ffffff', ice: 1 });
    box.innerHTML = items.map(function (it) {
      return '<span class="lg-item"><i class="' + (it.ice ? 'lg-ice' : 'lg-dot') + '" style="background:'
        + it.color + '"></i>' + esc(it.name) + '</span>';
    }).join('');
  }

  /* ---------------------------------------------------------
     先买哪一类酒最划算

     用户的要求：只报类型（金酒、伏特加、白朗姆），不报牌子——
     有人不喜欢蓝宝石、有人不喜欢添加利，出现牌子只会添乱。
     排序按"最简单解锁"：先看买了立刻能做的款数，再看"再补一样能做几款"。
     --------------------------------------------------------- */
  var TYPE_REP = {};
  /* 每一类挑一个代表瓶，优先"超市/便利店买得到"的（只用来算数，不显示给人看） */
  function typeRep(t) {
    if (TYPE_REP[t] !== undefined) return TYPE_REP[t];
    var best = '', score = -1;
    INGREDIENTS.forEach(function (g) {
      if (typeOf(g.id) !== t) return;
      var s = g.src === 'rt' ? 3 : (g.src === 'near' ? 2 : 1);
      if (s > score) { score = s; best = g.id; }
    });
    TYPE_REP[t] = best;
    return best;
  }
  /* 手上再加这一类的酒，能多做几款 */
  function buyGain(t) {
    var rep = typeRep(t);
    if (!rep) return null;
    var mine = Object.keys(state.have).concat([rep]);
    var m0 = [], m1 = 0;
    REF_RECIPES.forEach(function (r) {
      var miss = 0, used = 0;
      (r.needs || []).forEach(function (nd) {
        if (nd.need.optional) return;
        if (needStatusWith(nd.need, mine).ok) used++;
        else miss++;
      });
      if (!used) return;
      if (!miss) m0.push(r);
      else if (miss === 1) m1++;
    });
    return { type: t, m0: m0, m1: m1 };
  }
  /* 同一组只报一次（金酒报一条，不要伦敦干金、现代干金各来一条） */
  function buySuggest(limit) {
    var best = {};
    Object.keys(TYPE_NAME).forEach(function (t) {
      var g = buyGain(t);
      if (!g || (!g.m0.length && !g.m1)) return;
      var grp = familyOfType(t), score = g.m0.length * 100 + g.m1;
      if (!best[grp] || best[grp].score < score) best[grp] = { score: score, g: g };
    });
    var out = Object.keys(best).map(function (k) { return best[k].g; });
    out.sort(function (a, b) {
      if (b.m0.length !== a.m0.length) return b.m0.length - a.m0.length;
      return b.m1 - a.m1;
    });
    return out.slice(0, limit || 3);
  }
  function buyBox(noBooze) {
    var list = buySuggest(3);
    if (!list.length) return '';
    var lines = list.map(function (g) {
      if (g.m0.length) {
        var names = g.m0.slice(0, 2).map(function (r) { return '「' + r.zh + '」'; }).join('');
        return '<b>' + esc(typeName(g.type)) + '</b>：买了立刻能做' + esc(names)
          + (g.m1 ? '；再补一样还能做 ' + g.m1 + ' 款' : '');
      }
      return '<b>' + esc(typeName(g.type)) + '</b>：再补一样就能做 ' + g.m1 + ' 款';
    });
    return '<div class="buybox">'
      + '<div class="buy-title">先买哪一类酒最划算</div>'
      + '<p class="buy-lead">' + (noBooze
          ? '你勾的都是饮料——经典鸡尾酒至少要有一样酒。按"买哪一类最简单解锁"排：'
          : '你勾的这些，经典配方里还没凑成一杯。试试先加一样：')
      + '</p><ul>' + lines.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ul></div>';
  }

  /* 需求 → 具体用哪一瓶：优先用你勾了的那瓶 */
  function resolveNeedId(need) {
    if (need.id) return BY_ID[need.id] ? need.id : '';
    if (need.ids) {
      var mine = need.ids.filter(function (id) { return state.have[id]; })[0];
      return mine || (BY_ID[need.ids[0]] ? need.ids[0] : '');
    }
    if (need.cat) {
      var ticked = Object.keys(state.have).filter(function (id) {
        return BY_ID[id] && BY_ID[id].cat === need.cat;
      })[0];
      if (ticked) return ticked;
      var def = INGREDIENTS.filter(function (g) { return g.cat === need.cat; })[0];
      return def ? def.id : '';
    }
    /* 按类型要的：优先用你勾了的那瓶（同类型最好，同组也行），否则拿代表瓶 */
    if (need.type) {
      var exact = Object.keys(state.have).filter(function (id) { return typeOf(id) === need.type; })[0];
      if (exact) return exact;
      var allowT = swapTypesOf(need.type);
      var same = Object.keys(state.have).filter(function (id) {
        return allowT.indexOf(typeOf(id)) >= 0;
      })[0];
      if (same) return same;
      return typeRep(need.type);
    }
    if (need.family) {
      var famT = FAMILY_TYPES[need.family] || [];
      var ing = Object.keys(state.have).filter(function (id) {
        return famT.indexOf(typeOf(id)) >= 0;
      })[0];
      if (ing) return ing;
      var first = INGREDIENTS.filter(function (g) {
        return famT.indexOf(typeOf(g.id)) >= 0;
      })[0];
      return first ? first.id : '';
    }
    return '';
  }

  /* 点一条配方：按标准配方整杯装好（缺的那几样也装，好让你看到差什么） */
  function loadRefRecipe(i) {
    var r = REF_RECIPES[i];
    if (!r) return;
    state.cup.clear();
    r.needs.forEach(function (nd) {
      var id = resolveNeedId(nd.need);
      if (!id || !BY_ID[id]) return;
      var g = BY_ID[id];
      var amt = parseAmount(nd.a, g) || g.def;
      state.cup.set(id, Math.round(amt * 10) / 10);
    });
    var gid = glassFromRef(r);
    if (gid) state.glass = gid;
    state.iceLevel = glassOf(state.glass).ice === 'inglass'
      ? (/无冰/.test(r.ice || '') ? 'none' : 'full') : 'none';
    state.method = methodFromRef(r.method);
    state.taste = tasteForAbv(analyze().abv);
    forgetRecipe();
    state.recipeName = r.zh;
    state.recipeSub = r.en || '';
    state.recipeTip = r.note || '';
    state.refMiss = missingOf(r).map(needLabel);
    /* 参考本里本库确实没有的那几样——杯子下面要说清楚，装进去的是替代品 */
    state.refNotStocked = r.needs.map(notStockedName).filter(function (x) { return !!x; });
    state.swapOpen = false;
    renderCup(); renderResult(); renderLib(); renderGlassPick(); renderIcePick();
    renderMethodPick(); renderTastePick();
    var anchor = document.getElementById('resultAnchor');
    if (anchor && anchor.scrollIntoView) anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* =========================================================
     酒单：经典 191 / 我的收藏 / 我的特调

     三个栏目共用一套卡片，只有数据来源不同：
       · 经典 —— ref-recipes.js 里的 191 款
       · 我的收藏 —— 你在酒单或"今晚喝什么"点过 ★ 的（存本地）
       · 我的特调 —— 你在调酒台保存过的整杯（存本地）
     ========================================================= */
  var FAV_KEY = 'barmix.favs', MINE_KEY = 'barmix.mine';
  var favs = storeGet(FAV_KEY), myRecipes = storeGet(MINE_KEY);
  var menuTab = 'classic', menuFam = '', menuTaste = '', menuStr = '', menuQuery = '';
  var MENU_PAGE = 12, menuShow = MENU_PAGE;
  var openRecipe = -1;                 /* 详情面板里正在看的那一杯 */

  function storeGet(key) {
    try { var s = localStorage.getItem(key); return s ? JSON.parse(s) : []; } catch (e) { return []; }
  }
  function storeSet(key, v) {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* 无痕模式存不了 */ }
  }
  function isFav(name) { return favs.indexOf(name) >= 0; }
  function toggleFav(name) {
    var i = favs.indexOf(name);
    if (i < 0) favs.push(name); else favs.splice(i, 1);
    storeSet(FAV_KEY, favs);
    renderMenu();
    if (currentPage() === 'tonight') renderTonight();   /* 「今晚喝什么」上的星星也要跟着变 */
    return i < 0;
  }

  /* 每条参考配方算一遍浓度和风味（用来筛选），算完缓存 */
  var REF_STAT = {};

  /* 「清爽」不是风味图上的一个维度，而是一个看法：不厚重 + 有酸或有香气（果香/香料）。
     气泡单独看——有人明确不喜欢气泡，所以要能只看"清爽但不冒气"的。 */
  function isFresh(st) {
    /* 数定成"醇厚 ≤7、糖 ≤12、度数 ≤22"：再往上就是厚重或甜腻的酒
       （僵尸、长岛冰茶那类），把它们叫清爽就是骗人。 */
    return st.body <= 7 && st.sugar <= 12 && st.abv <= 22
      && (st.acid >= 2 || st.fruit >= 4 || st.spice >= 4);
  }

  function refStat(i) {
    if (REF_STAT[i]) return REF_STAT[i];
    var r = REF_RECIPES[i];
    var keep = { cup: state.cup, glass: state.glass, ice: state.iceLevel, method: state.method };
    var cup = new Map();
    r.needs.forEach(function (nd) {
      if (nd.need.optional) return;
      var id = resolveNeedId(nd.need);
      if (!id || !BY_ID[id]) return;
      var g = BY_ID[id];
      cup.set(id, Math.round((parseAmount(nd.a, g) || g.def) * 10) / 10);
    });
    state.cup = cup;
    state.glass = glassFromRef(r);
    state.iceLevel = glassOf(state.glass).ice === 'inglass'
      ? (/无冰/.test(r.ice || '') ? 'none' : 'full') : 'none';
    state.method = methodFromRef(r.method);
    var a = analyze();
    state.cup = keep.cup; state.glass = keep.glass;
    state.iceLevel = keep.ice; state.method = keep.method;
    var fams = {};
    r.needs.forEach(function (nd) {
      var cat = nd.need.type ? catOfType(nd.need.type)
        : (nd.need.family ? FAMILY_CAT[nd.need.family] : '');
      if (cat) fams[cat] = 1;
    });
    REF_STAT[i] = {
      abv: a.abv, sugar: a.fd.sugar, acid: a.fd.acid, fizz: a.fd.fizz, bitter: a.fd.bitter,
      body: a.fd.body, fruit: a.fd.fruit, spice: a.fd.spice,
      bubbly: a.hasFizzIng,        /* 杯里到底有没有带气的材料（跟气泡分是两回事） */
      fams: Object.keys(fams)
    };
    return REF_STAT[i];
  }

  /* 酒单的一杯：只写名字、用到什么、怎么做——点开才看细节 */
  /* 参考数据里有两条没有中文名（B&B、XYZ），退回用英文名——不然卡片是空标题，
     而且收藏会互相顶掉（两条都叫空字符串） */
  function recipeName(r) { return (r && (r.zh || r.en)) || '（未命名）'; }

  function menuCard(i) {
    var r = REF_RECIPES[i], st = refStat(i);
    var d = presetDiffOf(r);
    var use = d
      ? d.pre.items.filter(function (it) { return BY_ID[it[0]]; })
          .map(function (it) { return shortName(BY_ID[it[0]]); })
      : r.needs.filter(function (nd) { return !nd.need.optional; })
          .map(function (nd) { return needLabel(nd); });
    var on = isFav(recipeName(r));
    return '<button type="button" class="menucard" data-menu="' + i + '">'
      + '<span class="mc-top"><b>' + esc(recipeName(r)) + '</b><i>' + esc(r.zh ? (r.en || '') : '') + '</i>'
        + '<span class="mc-star' + (on ? ' on' : '') + '" data-fav="' + i + '" role="button" tabindex="0"'
        + ' title="' + (on ? '取消收藏' : '收藏') + '">' + (on ? '★' : '☆') + '</span></span>'
      + '<span class="mc-line">' + esc(use.slice(0, 4).join(' · ')) + (use.length > 4 ? ' 等' : '') + '</span>'
      + '<span class="mc-meta">' + ({ shake: '摇和', stir: '搅拌', build: '兑和' }[methodFromRef(r.method)] || '兑和')
        + ' · ' + Math.round(st.abv) + '% · ' + r.needs.length + ' 样'
        + (d && d.hasDiff ? ' · <i class="mc-pick">本站配比</i>' : '')
        + (r.pick ? ' · <i class="mc-pick">推荐</i>' : '') + '</span>'
      + '</button>';
  }

  function renderMenuTabs() {
    var box = document.getElementById('menuTabs');
    if (!box) return;
    var tabs = [
      { id: 'classic', name: '经典 191', n: REF_RECIPES.length },
      { id: 'house', name: '住处特调', n: HOUSE_PRESETS.length },
      { id: 'favs', name: '我的收藏', n: favs.length },
      { id: 'mine', name: '我的特调', n: myRecipes.length }
    ];
    box.innerHTML = tabs.map(function (t) {
      return '<button type="button" class="gchip' + (t.id === menuTab ? ' on' : '')
        + '" data-menu-tab="' + t.id + '">' + t.name + '　' + t.n + '</button>';
    }).join('');
  }

  function renderMenuFilters() {
    var box = document.getElementById('menuFilters');
    if (!box) return;
    /* 住处特调和我的特调不走这套筛选（一个是 11 款小集合，一个是自己的配方） */
    if (menuTab === 'mine' || menuTab === 'house') { box.innerHTML = ''; return; }
    var fams = [
      ['', '全部基酒'], ['gin', '金酒'], ['whisky', '威士忌'], ['rum', '朗姆'],
      ['vodka', '伏特加'], ['tequila', '龙舌兰'], ['brandy', '白兰地']
    ];
    var tastes = [['', '全部味道'], ['sweet', '甜'], ['sour', '酸'],
      ['fresh', '清爽'], ['fizz', '带气泡'], ['bitter', '苦']];
    var strs = [['', '全部浓淡'], ['light', '清淡'], ['mid', '标准'], ['strong', '浓烈']];
    function row(list, cur, attr) {
      return list.map(function (x) {
        return '<button type="button" class="ghost' + (x[0] === cur ? ' on' : '') + '" '
          + attr + '="' + x[0] + '">' + x[1] + '</button>';
      }).join('');
    }
    box.innerHTML = '<span class="mf-row">' + row(fams, menuFam, 'data-menu-fam') + '</span>'
      + '<span class="mf-row">' + row(tastes, menuTaste, 'data-menu-taste') + '</span>'
      + '<span class="mf-row">' + row(strs, menuStr, 'data-menu-str') + '</span>';
  }

  function menuList() {
    var q = menuQuery.trim().toLowerCase();
    var out = [];
    /* "住处特调"栏用的是预设数据，不走这里 */
    if (menuTab === 'house') return out;
    if (menuTab === 'mine') {
      out = myRecipes.map(function (m, i) { return { mine: i, m: m }; });
      if (q) out = out.filter(function (x) { return x.m.name.toLowerCase().indexOf(q) >= 0; });
      return out;
    }
    REF_RECIPES.forEach(function (r, i) {
      if (menuTab === 'favs' && !isFav(recipeName(r))) return;
      if (q) {
        var hay = (r.zh + ' ' + (r.en || '') + ' ' + r.needs.map(function (nd) { return nd.n; }).join(' ')).toLowerCase();
        if (hay.indexOf(q) < 0) return;
      }
      var st = refStat(i);
      if (menuFam && st.fams.indexOf(menuFam) < 0) return;
      if (menuTaste === 'sweet' && st.sugar < 8) return;
      if (menuTaste === 'sour' && st.acid < 5) return;
      if (menuTaste === 'fresh' && !isFresh(st)) return;
      if (menuTaste === 'fizz' && !st.bubbly) return;
      if (menuTaste === 'bitter' && st.bitter < 4) return;
      if (menuStr === 'light' && st.abv >= 10) return;
      if (menuStr === 'mid' && (st.abv < 10 || st.abv > 22)) return;
      if (menuStr === 'strong' && st.abv <= 22) return;
      out.push({ i: i, r: r, st: st });
    });
    /* 推荐排前面，然后材料少的在前（好做） */
    out.sort(function (a, b) {
      if (!!b.r.pick !== !!a.r.pick) return b.r.pick ? 1 : -1;
      return a.r.needs.length - b.r.needs.length;
    });
    return out;
  }

  function renderMenuList() {
    var box = document.getElementById('menuList');
    var cnt = document.getElementById('menuCount');
    var more = document.getElementById('menuMore');
    if (!box) return;
    var list = menuList();
    if (cnt) {
      cnt.textContent = menuTab === 'mine'
        ? (myRecipes.length ? '你保存了 ' + myRecipes.length + ' 杯' : '')
        : '共 ' + list.length + ' 款' + (menuTab === 'favs' ? '（收藏）' : '');
    }
    /* 住处特调：只有我们这儿有的 11 款（便利店路线为主），用预设卡片的样子画 */
    if (menuTab === 'house') {
      var q2 = menuQuery.trim().toLowerCase();
      var hits = [];
      HOUSE_PRESETS.forEach(function (name) {
        var i = presetIndexByName(name);
        if (i < 0) return;
        if (q2 && (name + ' ' + compLine(PRESETS[i])).toLowerCase().indexOf(q2) < 0) return;
        hits.push(i);
      });
      box.className = 'presets';
      box.innerHTML = hits.length
        ? hits.map(presetCardHtml).join('')
        : '<p class="hint">没找到。换个词试试。</p>';
      if (cnt) cnt.textContent = '共 ' + hits.length + ' 款　这些是便利店/住处能做的；经典 191 款在「经典」那一栏';
      if (more) more.hidden = true;
      return;
    }
    if (menuTab === 'mine') {
      box.className = 'grid';
      box.innerHTML = list.length ? list.map(function (x) {
        var m = x.m;
        var names = m.items.map(function (it) {
          var g = BY_ID[it[0]];
          return g ? shortName(g) + ' ' + fmtAmt(g, it[1]) : '';
        }).filter(Boolean).join(' · ');
        return '<div class="minecard">'
          + '<div class="mc-top"><b>' + esc(m.name) + '</b></div>'
          + '<span class="mc-line">' + esc(names) + '</span>'
          + '<div class="mineacts">'
          + '<button type="button" class="ghost" data-mine-load="' + x.mine + '">装进杯子</button>'
          + '<button type="button" class="ghost" data-mine-del="' + x.mine + '">删除</button>'
          + '</div></div>';
      }).join('') : '<p class="hint">还没有保存过配方。在「调酒台」调好一杯，点右上角<b>「保存这杯」</b>，它就出现在这里。</p>';
    } else {
      box.className = 'menugrid';
      box.innerHTML = list.length ? list.slice(0, menuShow).map(function (x) { return menuCard(x.i); }).join('')
        : '<p class="hint">' + (menuTab === 'favs' && !favs.length
            ? '还没有收藏。在酒单里点卡片右上角的 <b>☆</b> 收藏，或在「今晚喝什么」里点收藏。'
            : '没有符合条件的酒，换个筛选试试。') + '</p>';
    }
    if (more) {
      var left = menuTab === 'mine' ? 0 : list.length - menuShow;
      more.hidden = left <= 0;
      more.textContent = left > 0 ? '再看 ' + Math.min(left, MENU_PAGE) + ' 款（还有 ' + left + ' 款）' : '';
    }
  }

  /* 详情：材料表 + 做法 + 备注，以及"装进杯子 / 收藏" */
  function renderMenuDetail() {
    var box = document.getElementById('menuDetail');
    if (!box) return;
    var page = document.getElementById('page-menu');
    if (openRecipe < 0 || !REF_RECIPES[openRecipe]) {
      box.hidden = true; box.innerHTML = '';
      if (page) page.classList.remove('hasdetail');   /* 没打开详情时别空着一整列 */
      return;
    }
    if (page) page.classList.add('hasdetail');
    var i = openRecipe, r = REF_RECIPES[i], st = refStat(i);
    /* 有我们调好的版本就用我们的：材料表、备注都换成那份 */
    var d = presetDiffOf(r);
    var pre = d ? d.pre : null;
    var rows = pre
      ? pre.items.filter(function (it) { return BY_ID[it[0]] && BY_ID[it[0]].cat !== 'ice'; })
          .map(function (it) {
            var g = BY_ID[it[0]];
            return '<li><span>' + esc(shortName(g))
              + (OPTIONAL_ING[g.id] ? ' <i class="opt">可省</i>' : '') + '</span>'
              + '<b>' + esc(fmtAmt(g, it[1])) + '</b></li>';
          }).join('')
      : r.needs.map(function (nd) {
          /* 材料表是"你要买、要用的东西"：换过的就直接写换之后的名字 + 一个「替」字，
             参考原文放到下面的「原方」里——两边内容不一样，才各自有意义。
             只是叫法不同的（园林干味美思 / 干味美思）不挂「替」，不然后面那句
             "和参考本一致"就跟「替」字打架了 */
          var swapped = nd.need.approx && !justSpelling(nd);
          return '<li><span>' + esc(swapped ? needLabel(nd) : nd.n)
            + (swapped ? ' <i class="opt swap">替</i>' : '')
            + (nd.need.optional ? ' <i class="opt">可省</i>' : '') + '</span>'
            + '<b>' + esc(String(nd.a || '')) + '</b></li>';
        }).join('');
    box.hidden = false;
    box.innerHTML = '<div class="panel-head"><h2>' + esc(recipeName(r)) + '　'
      + '<span class="hint">' + esc(r.en || '') + '</span></h2>'
      + '<button type="button" class="ghost" data-menu-close="1">关闭</button></div>'
      + '<p class="hint">' + esc(pre ? (PRESET_METHOD[pre.name] ? methodName({ method: PRESET_METHOD[pre.name] }) : methodName(r)) : methodName(r))
        + ' · ' + esc(pre ? glassOf(pre.glass).name : glassOf(glassFromRef(r)).name)
        + ' · ' + Math.round(st.abv) + '% · ' + (pre ? pre.items.length : r.needs.length) + ' 样材料'
        + (d && d.hasDiff ? '　<b class="mc-pick">本站配比</b>' : '') + '</p>'
      /* 一句话定位：只有推荐的 51 款有（data.js 的 PICK_LINE） */
      + (PICK_LINE[recipeName(r)] ? '<p class="hint pickline">' + esc(PICK_LINE[recipeName(r)]) + '</p>' : '')
      + '<ul class="menulist">' + rows + '</ul>'
      /* 参考数据里写了装饰（92 条有），一起显示出来——以前漏了这一栏 */
      + (r.garnish ? '<p class="hint">装饰：' + esc(r.garnish) + (r.ice ? '　冰：' + esc(r.ice) : '') + '</p>'
          : (r.ice ? '<p class="hint">冰：' + esc(r.ice) + '</p>' : ''))
      + swapBox(r)
      + ((pre && pre.tip) ? '<p class="hint">' + esc(pre.tip) + '</p>'
          : (r.note ? '<p class="hint">' + esc(r.note) + '</p>' : ''))
      + originLine(r)
      + '<div class="mineacts">'
      + '<button type="button" class="ghost on" data-menu-load="' + i + '">装进杯子</button>'
      /* 跟参考本不一样的（16 款）：多给一个"照书上来"的按钮。
         库里确实没有的那几样没法凭空装进去，杯子里会写清楚哪几样是替代品 */
      + (d && d.hasDiff
          ? '<button type="button" class="ghost" data-menu-loadref="' + i
            + '" title="按参考配方本的量装杯；本库没有的材料会用替代品，杯子下面会写出来">按参考本装杯</button>'
          : '')
      + '<button type="button" class="ghost" data-menu-favbtn="' + i + '">'
        + (isFav(recipeName(r)) ? '★ 已收藏' : '☆ 收藏') + '</button>'
      + '</div>';
  }
  function methodName(r) {
    return ({ shake: '摇和', stir: '搅拌', build: '兑和' }[methodFromRef(r.method)] || '兑和')
      + (methodFromRef(r.method) === 'shake' ? '后滤出' : (methodFromRef(r.method) === 'stir' ? '后滤出' : ''));
  }

  /* 来历：只在 data.js 的 ORIGIN 里查证过推荐的 51 款。
     没查证过的就照实说"暂缺 / 查不到"——用户的要求是"不确定就说不确定"。 */
  function originLine(r) {
    var t = ORIGIN[recipeName(r)];
    if (t) return '<p class="hint">来历：' + esc(t) + '</p>';
    return '<p class="hint">来历：' + (r.pick
      ? '查不到能核实的出处，不编。'
      : '暂缺（只查证了推荐的 51 款）。') + '</p>';
  }

  /* 原方 + 替换说明

     用户说得很清楚："用户有权知道原本的配方是什么样子"。
     分两种情况写：
     · 没有本站配比的（158 款）：材料表写的就是"库里怎么替"，这里列参考原文 + 换的理由
       （理由在 data.js 的 SWAP_NOTE 里）。
     · 有本站配比的（33 款）：材料表是我们调好的那一份，这时候不能再念库里那套通用理由，
       要拿预设的材料跟参考本比一遍，按这杯实际放了什么写。否则会出现
       "蔓越莓糖浆 → 白糖浆"和这杯备注里"不用再加糖浆"同时显示这种自相矛盾。 */
  function swapBox(r) {
    if (presetDiffOf(r)) return presetSwapBox(r);
    var notes = [], notStocked = [], real = [], nameOnly = [];
    r.needs.forEach(function (nd) {
      if (!nd.need.approx) return;
      /* 名字只是写法不同（园林干味美思 / 干味美思）不算"和参考本不一样"，
         不然每杯都要挂一句"不一样"，用户会麻木 */
      if (justSpelling(nd)) { nameOnly.push(nd.n); return; }
      real.push(nd);
      /* 库里"没有这一样"的：直接告诉用户装杯装的是替换版，想按原方做要自己买 */
      var miss = notStockedName(nd);
      if (miss) notStocked.push(miss);
      var why = SWAP_NOTE[nd.n];
      if (why) notes.push('<li>' + esc(nd.n) + ' → <b>' + esc(needLabel(nd)) + '</b>：' + esc(why) + '</li>');
    });
    /* 没换材料、也不是本站配比——那材料表本身就是参考原文 */
    if (!real.length) {
      if (nameOnly.length) {
        return '<p class="hint origbox-plain">这份和参考配方本一致：材料、用量、做法都照它，'
          + '只是个别叫法按本库的写法来（' + esc(nameOnly.join('、')) + '）。</p>';
      }
      return '<p class="hint origbox-plain">这份和参考配方本一致：材料、用量、做法都照它，没改动。</p>';
    }
    var orig = r.needs.map(function (nd) {
      return esc(nd.n) + (nd.a ? ' ' + esc(String(nd.a)) : '');
    }).join(' · ');
    /* 换了东西这件事必须一眼看到，不能藏在折叠里——用户说过"按人家的酒单挑出来的
       一定比咱们配的好喝"，那就得让人知道我们哪儿没照人家的来 */
    return '<p class="hint warnline">⚠️ 这杯和参考本不一样。参考本写的是 '
      + real.map(function (nd) { return esc(nd.n); }).join('、')
      + '；这杯用的是材料表里带「替」的那几样。点开下面看原文和理由。</p>'
      + '<details class="origbox"><summary>原方长什么样（参考配方本原文）</summary>'
      + '<p class="hint">' + orig + '</p>'
      + (notStocked.length
          ? '<p class="hint">本库没有收录：<b>' + esc(notStocked.join('、'))
            + '</b>。点「装进杯子」装的是下面的替换版；想按原方做，这几样要另外买。' + '</p>'
          : '')
      + (notes.length ? '<p class="hint"><b>我改过的地方：</b></p><ul class="menulist swapnote">'
        + notes.join('') + '</ul>' : '')
      + '</details>';
  }

  /* 参考本写了这个名字，本库到底有没有这样东西？
     有就返回空字符串；确实没有就返回它的名字（"柠檬酸溶液"），用来提示用户。 */
  function notStockedName(nd) {
    var raw = String(nd.n).replace(/[（(].*?[）)]/g, '').trim();
    if (!raw) return '';
    var inLib = INGREDIENTS.some(function (g) {
      var gn = g.name.replace(/[（(].*?[）)]/g, '').trim();
      return gn.indexOf(raw) >= 0 || raw.indexOf(gn) >= 0;
    });
    return inLib ? '' : raw;
  }

  /* 参考本里"45ml"这种能直接读成数字的写法；"up / 加满 / 3 把勺"读不出来就返回 null */
  function refMl(txt) {
    var m = String(txt || '').replace(/[（(].*?[）)]/g, '')
      .match(/^\s*(\d+(?:\.\d+)?)\s*(ml|毫升|cl|oz)\s*$/i);
    if (!m) return null;
    var n = parseFloat(m[1]);
    if (/cl/i.test(m[2])) return n * 10;
    if (/oz/i.test(m[2])) return n * 30;
    return n;
  }
  /* "生姜片"跟库里的"生姜"、"水妈妈椰浆"跟"椰浆"——只是叫法不同，不算换东西 */
  function justSpelling(nd) {
    if (SWAP_REAL[nd.n]) return false;   /* 名字像，东西不一样（见 data.js 的 SWAP_REAL） */
    var a = String(nd.n).replace(/[（(].*?[）)]/g, '').trim();
    var b = needLabel(nd).replace(/[（(].*?[）)]/g, '').trim();
    if (!a || !b) return false;
    /* 一个名字整段被另一个包住（生姜片 / 生姜、园林干味美思 / 干味美思、
       水妈妈椰浆 / 椰浆）才算"就是它，只是写法不同"。
       只对前两个字相同不算——"桃子利口酒 / 桃子果泥""西柚汁 / 西柚气泡水"是两样东西。 */
    return a.indexOf(b) >= 0 || b.indexOf(a) >= 0;
  }

  /* 有本站配比的这 33 款：拿预设的材料和参考本比一遍，看这杯到底差在哪。
     菜单卡片角标、详情角标、差别栏三处都要用，算一次就缓存住。
     凡是写出来的材料名，都必须是这份预设真有的东西——自检会盯着这一条。 */
  var PRESET_DIFF_CACHE = {};
  function presetDiffOf(r) {
    var key = recipeName(r);
    if (key in PRESET_DIFF_CACHE) return PRESET_DIFF_CACHE[key];
    var pi = presetIndexByName(REF_PRESET_MAP[key] || '');
    if (pi < 0) return (PRESET_DIFF_CACHE[key] = null);
    var pre = PRESETS[pi];
    var items = pre.items.filter(function (it) {
      return BY_ID[it[0]] && BY_ID[it[0]].cat !== 'ice';
    });
    var ids = items.map(function (it) { return it[0]; });
    var swapped = [], loose = [], missing = [], matched = {}, hitCount = {}, stat = [];
    r.needs.forEach(function (nd) {
      var st = needStatusWith(nd.need, ids);
      stat.push(st);
      if (!st.ok) { missing.push(nd); return; }
      st.hits.forEach(function (id) {
        matched[id] = 1; hitCount[id] = (hitCount[id] || 0) + 1;
      });
      var lab = needLabel(nd);
      if (!st.exact) {
        /* 参考本要的是泥煤威士忌 / 爱尔兰威士忌这种，杯里是同一大类的另一瓶 */
        loose.push(nd.n + (nd.a ? ' ' + nd.a : '') + '｜'
          + st.hits.map(function (id) { return shortName(BY_ID[id]); }).join(' / '));
      } else if (nd.need.approx && SWAP_NOTE[nd.n] && lab !== nd.n && !justSpelling(nd)) {
        /* 换过、而且换来的东西真在这杯里——这条理由才站得住 */
        swapped.push(nd);
      }
    });
    var added = items.filter(function (it) { return !matched[it[0]]; });
    /* 材料都一样时还得看量：量也一样，就不能再挂"本站配比"的牌子 */
    var amountDiff = false;
    r.needs.forEach(function (nd, k) {
      var st = stat[k];
      if (!st.ok || st.hits.length !== 1) return;
      var id = st.hits[0];
      if (hitCount[id] !== 1 || BY_ID[id].unit !== 'ml') return;
      var want = refMl(nd.a);
      if (want === null) return;
      var mine = items.filter(function (it) { return it[0] === id; })[0];
      if (mine && Math.abs(mine[1] - want) >= 0.5) amountDiff = true;
    });
    return (PRESET_DIFF_CACHE[key] = {
      pre: pre, swapped: swapped, loose: loose, missing: missing, added: added,
      amountDiff: amountDiff,
      hasDiff: !!(swapped.length || loose.length || missing.length || added.length || amountDiff)
    });
  }

  function presetSwapBox(r) {
    var d = presetDiffOf(r);
    /* 跟参考本一模一样（材料、用量都照它）：那就别把同样的内容再抄一遍 */
    if (!d.hasDiff) {
      return '<p class="hint origbox-plain">这份和参考配方本一致：材料、用量都照它（名字按本库的叫法写）。</p>';
    }
    var lines = '';
    d.swapped.forEach(function (nd) {
      lines += '<li>' + esc(nd.n) + ' → <b>' + esc(needLabel(nd)) + '</b>：'
        + esc(SWAP_NOTE[nd.n]) + '</li>';
    });
    d.loose.forEach(function (s) {
      var parts = s.split('｜');
      lines += '<li>参考本写的是 ' + esc(parts[0]) + '，这杯用的是同类，'
        + '也就是材料表里那瓶（' + esc(parts[1]) + '）。</li>';
    });
    if (d.missing.length) {
      lines += '<li>参考本写了、这杯没放：' + d.missing.map(function (nd) {
        return esc(nd.n) + (nd.a ? ' ' + esc(String(nd.a)) : '');
      }).join('、') + '</li>';
    }
    if (d.added.length) {
      lines += '<li>这杯另外加了：' + d.added.map(function (it) {
        var g = BY_ID[it[0]];
        return '<b>' + esc(shortName(g)) + ' ' + esc(fmtAmt(g, it[1])) + '</b>';
      }).join('、') + '</li>';
    }
    var orig = r.needs.map(function (nd) {
      return esc(nd.n) + (nd.a ? ' ' + esc(String(nd.a)) : '');
    }).join(' · ');
    /* 差别常驻显示，折叠里只留参考原文——用户明确要求"和他的不一致的要确保用户知道" */
    return (lines
        ? '<p class="hint warnline">⚠️ 这杯和参考本不一样：</p><ul class="menulist swapnote">' + lines + '</ul>'
          + (d.amountDiff ? '<p class="hint">量也不一样：上面是本站的量，这里是参考本的量。</p>' : '')
        : '<p class="hint warnline">⚠️ 材料跟参考本一样，但量不一样（上面是本站的，这里是参考本的量）。</p>')
      + '<details class="origbox"><summary>原方长什么样（参考配方本原文）</summary>'
      + '<p class="hint">' + orig + '</p>'
      + '</details>';
  }

  function renderMenu() {
    renderMenuTabs(); renderMenuFilters(); renderMenuList(); renderMenuDetail();
  }

  /* 把酒单里的配方装进杯子，并跳到调酒台 */
  function loadRefFromMenu(i) {
    var r = REF_RECIPES[i];
    /* 有我们调好的版本就装那一份（量、杯型、冰量、做法、口味、备注一起） */
    var p = r ? presetIndexByName(REF_PRESET_MAP[r.zh] || '') : -1;
    if (p >= 0) presetLoad(p);
    else loadRefRecipe(i);
    setPage('bar', true);
    var anchor = document.getElementById('resultAnchor');
    if (anchor && anchor.scrollIntoView) anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  /* 和用户点预设卡片走同一条路（BarMix.preset 就是它） */
  function presetLoad(i) {
    var p = PRESETS[i];
    if (!p) return;
    state.cup.clear();
    p.items.forEach(function (it) { state.cup.set(it[0], it[1]); });
    if (p.glass) state.glass = p.glass;
    state.iceLevel = glassOf(state.glass).ice === 'inglass' ? 'full' : 'none';
    state.method = PRESET_METHOD[p.name] || 'build';
    state.taste = tasteForAbv(analyze().abv);
    state.refMiss = [];
    state.refNotStocked = [];
    state.recipeName = p.name; state.recipeSub = p.sub; state.recipeTip = p.tip || '';
    state.swapOpen = false;
    renderCup(); renderResult(); renderLib(); renderGlassPick(); renderIcePick();
    renderMethodPick(); renderTastePick();
  }

  /* 「我的特调」：把这杯重新装进杯子 */
  function loadMyRecipe(i) {
    var m = myRecipes[i];
    if (!m) return;
    state.cup.clear();
    (m.items || []).forEach(function (it) {
      if (BY_ID[it[0]]) state.cup.set(it[0], it[1]);
    });
    if (m.glass) state.glass = m.glass;
    if (m.ice) state.iceLevel = m.ice;
    if (m.method) state.method = m.method;
    if (m.taste) state.taste = m.taste;
    forgetRecipe();
    state.recipeName = m.name; state.recipeSub = '我的特调';
    renderCup(); renderResult(); renderLib(); renderGlassPick(); renderIcePick();
    renderMethodPick(); renderTastePick();
    setPage('bar', true);
    var anchor = document.getElementById('resultAnchor');
    if (anchor && anchor.scrollIntoView) anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* 调酒台右上角：把当前这杯存进「我的特调」 */
  function saveCurrent() {
    if (!state.cup.size) { alert('杯子还是空的——先往里放点东西，再存。'); return; }
    var guess = state.recipeName || ('我的特调 ' + (myRecipes.length + 1));
    var name = window.prompt('给这杯起个名字：', guess);
    if (name === null) return;
    name = String(name).trim() || guess;
    myRecipes.push({
      name: name,
      items: Array.from(state.cup),
      glass: state.glass, ice: state.iceLevel, method: state.method, taste: state.taste
    });
    storeSet(MINE_KEY, myRecipes);
    var btn = document.getElementById('saveBtn');
    if (btn) {
      var old = btn.textContent;
      btn.textContent = '已保存 ✓';
      setTimeout(function () { btn.textContent = old; }, 1600);
    }
    renderMenu();
  }

  function renderAll() {
    renderCats(); renderLib(); renderCup(); renderResult();
    renderGlassPick(); renderTastePick(); renderIcePick(); renderSchemePick();
    renderMethodPick(); renderGlass(); renderHave(); renderGlassLegend();
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

    /* 这杯是什么组成的：每样材料占的高度比例（从下往上，先倒的在下面） */
    var items = [];
    state.cup.forEach(function (amt, id) {
      var gg = BY_ID[id];
      if (!gg || id === 'ice') return;
      var ml = amt * (gg.mlu || 0);
      /* 苦精、柠檬皮这类体积接近 0 的也要看得见，给一个下限 */
      items.push({ g: gg, w: Math.max(ml, a.liquid * 0.012, 1) });
    });
    var totalW = items.reduce(function (s, it) { return s + it.w; }, 0);
    var acc = 0;
    var bands = items.map(function (it) {
      var b = { g: it.g, lo: acc / totalW, hi: (acc + it.w) / totalW };
      acc += it.w;
      return b;
    });

    /* 点阵间距按杯子大小自动算：小杯子（马天尼杯）用更细的间距 */
    var area = 0;
    for (var pi = 0, pj = art.inner.length - 1; pi < art.inner.length; pj = pi++) {
      area += art.inner[pj][0] * art.inner[pi][1] - art.inner[pi][0] * art.inner[pj][1];
    }
    area = Math.abs(area / 2);
    var step = clamp(Math.sqrt(area / 210), 2.6, 4.4);
    var dotR = step * 0.36;

    /* 点阵：行归行、列归列，从下到上按比例一层一层填满整只杯子。

       这是用户定的画法（参考《萨沙的调酒哲学》）：不要随机撒点那种"沙子感"，
       要规整的点阵；每样材料占一层，层高就是它在酒里的比例。
       代价是这张图不再显示"倒了多满"——只看组成比例，液面的数字在下面那行文字里。 */
    var fillTop = art.top + 2;
    var span = (art.bottom - 1) - fillTop;
    var dots = '';
    for (var y = art.bottom - 1; y >= fillTop; y -= step) {
      for (var x = 6; x <= 94; x += step) {
        if (!insidePoly(art.inner, x, y)) continue;
        var t = span > 0 ? ((art.bottom - 1) - y) / span : 0;
        var band = bands.length ? bands[bands.length - 1] : null;
        for (var bi = 0; bi < bands.length; bi++) {
          if (t <= bands[bi].hi + 1e-9) { band = bands[bi]; break; }
        }
        if (!band) continue;
        dots += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + dotR.toFixed(2)
          + '" fill="' + (CAT_STYLE[band.g.cat] || CAT_STYLE.mixer) + '"/>';
      }
    }

    /* 冰：画在点阵后面（从点与点之间的缝里透出来），规规矩矩的正方形。
       冰是沉在杯里的——满冰整杯塞到杯口，半杯冰只有杯底那一段。 */
    var ice = '';
    if (a.hasIce && a.liquid > 0) {
      var iceStep = step * 4, iceSize = iceStep - 4;
      var half = step / 2;                 /* 错开半个点距：方格边落在点的缝里才看得见 */
      var zoneTop = lv.id === 'half'
        ? art.bottom - (art.bottom - art.top) * 0.46 : art.top + 2 + half;
      var zoneBot = art.bottom - 1;
      for (var iy = zoneTop; iy + iceSize <= zoneBot; iy += iceStep) {
        for (var ix = 6 + half; ix + iceSize <= 94; ix += iceStep) {
          if (!insidePoly(art.inner, ix + iceSize / 2, iy + iceSize / 2)) continue;
          ice += '<rect x="' + ix.toFixed(1) + '" y="' + iy.toFixed(1) + '" width="' + iceSize.toFixed(1)
            + '" height="' + iceSize.toFixed(1) + '" rx="1" fill="#ffffff" fill-opacity="0.5"'
            + ' stroke="#3b3229" stroke-opacity="0.55" stroke-width="0.9"/>';
        }
      }
    }

    document.getElementById('glassPreview').innerHTML =
      '<defs><clipPath id="gclip"><path d="' + polyPath(art.inner) + '"/></clipPath></defs>' +
      '<g clip-path="url(#gclip)">' + ice + dots + '</g>' +
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
    forgetRecipe();                             /* 自己动手加了东西，就不再是那条配方的了 */
    if (state.cup.has(id)) state.cup.set(id, state.cup.get(id) + g.step);
    else state.cup.set(id, g.def);
  }

  /* 忘掉"这杯是哪条配方"——用户自己动过杯子之后就不该再挂着某条配方的备注 */
  function forgetRecipe() {
    state.recipeName = ''; state.recipeSub = ''; state.recipeTip = '';
    state.refMiss = []; state.refNotStocked = [];
  }

  document.addEventListener('click', function (e) {
    /* 之前这里只写 closest('button')，于是所有挂在 <div> 上的点击
       （比如"看全部"那一行）都被这一行挡掉了——点了没反应。
       现在把带自定义属性的元素也算进来。
       温度标签是 <span>（它嵌在"点一下展开"的那一行里，用 span 才不会互相打架），
       所以 [data-temp] 也必须在这个选择器里，否则点温度会变成展开说明。 */
    var t = e.target.closest ? e.target.closest('button, [data-expand], [data-temp], [data-fav]') : null;
    if (!t) return;

    /* 侧栏导航 */
    if (t.dataset.page) { setPage(t.dataset.page, true); return; }
    /* 酒单：切栏目 / 筛选 / 翻更多 / 开关详情 / 收藏 */
    if (t.dataset.menuTab) { menuTab = t.dataset.menuTab; menuShow = MENU_PAGE; renderMenu(); return; }
    if (t.dataset.menuFam !== undefined) { menuFam = t.dataset.menuFam; menuShow = MENU_PAGE; renderMenu(); return; }
    if (t.dataset.menuTaste !== undefined) { menuTaste = t.dataset.menuTaste; menuShow = MENU_PAGE; renderMenu(); return; }
    if (t.dataset.menuStr !== undefined) { menuStr = t.dataset.menuStr; menuShow = MENU_PAGE; renderMenu(); return; }
    if (t.dataset.menuMore) { menuShow += MENU_PAGE; renderMenuList(); return; }
    if (t.dataset.menuClose) { openRecipe = -1; renderMenuDetail(); return; }
    if (t.dataset.menu !== undefined && t.dataset.menu !== null && t.dataset.menu !== '') {
      openRecipe = +t.dataset.menu; renderMenuDetail();
      var d = document.getElementById('menuDetail');
      if (d && d.scrollIntoView) d.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (t.dataset.fav !== undefined && t.dataset.fav !== null && t.dataset.fav !== '') {
      /* 星星在卡片里，别让它顺带打开详情 */
      var fr = REF_RECIPES[+t.dataset.fav];
      if (fr) toggleFav(fr.zh);
      return;
    }
    if (t.dataset.menuLoad !== undefined) { loadRefFromMenu(+t.dataset.menuLoad); return; }
    if (t.dataset.mood) { tonightMood = t.dataset.mood; renderTonight(); return; }
    if (t.dataset.tonightGo !== undefined) { loadRefFromMenu(+t.dataset.tonightGo); return; }
    if (t.dataset.menuLoadref !== undefined) {
      /* 照参考本是量装，不用"本站配比"那份 */
      loadRefRecipe(+t.dataset.menuLoadref);
      setPage('bar', true);
      return;
    }
    if (t.dataset.menuFavbtn !== undefined) {
      var fr2 = REF_RECIPES[+t.dataset.menuFavbtn];
      if (fr2) toggleFav(fr2.zh);
      renderMenuDetail();
      return;
    }
    if (t.dataset.mineLoad !== undefined) {
      loadMyRecipe(+t.dataset.mineLoad);
      return;
    }
    if (t.dataset.mineDel !== undefined) {
      myRecipes.splice(+t.dataset.mineDel, 1);
      storeSet(MINE_KEY, myRecipes);
      renderMenu();
      return;
    }

    if (t.dataset.cat) {
      state.cat = t.dataset.cat;
      /* 点分类标签 = 想按分类看，把搜索词清掉 */
      libQuery = '';
      var libBox = document.getElementById('libSearch');
      if (libBox) libBox.value = '';
      renderCats(); renderLib();
      return;
    }

    /* ④ 手边有什么：切分类标签 */
    if (t.dataset.havecat) {
      state.haveCat = t.dataset.havecat;
      haveQuery = '';
      var hq = document.getElementById('haveSearch');
      if (hq) hq.value = '';
      renderHaveCats(); renderHaveList();
      return;
    }
    /* ④ 手边有什么：勾 / 取消一样材料 */
    if (t.dataset.have) {
      var hid = t.dataset.have;
      if (state.have[hid]) delete state.have[hid];
      else state.have[hid] = 1;
      saveHave();
      /* 卡片立刻亮起来，结果列表稍后再算——连点好几样时不用每点一次都重算 191 份配方 */
      renderHaveCats(); renderHaveList();
      scheduleHaveResult();
      return;
    }
    /* 结果里"展开剩下的 N 款" */
    if (t.dataset.havemore !== undefined && t.dataset.havemore !== null && t.dataset.havemore !== '') {
      haveOpen[t.dataset.havemore] = haveOpen[t.dataset.havemore] ? 0 : 1;
      renderHaveResult();
      return;
    }
    /* 点一条参考配方：装进杯子 */
    if (t.dataset.ref !== undefined && t.dataset.ref !== null && t.dataset.ref !== '') {
      loadRefRecipe(+t.dataset.ref);
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
      forgetRecipe();
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
      forgetRecipe();
      state.cup.clear();
      p.items.forEach(function (it) { state.cup.set(it[0], it[1]); });
      /* 配方自带杯型：干马天尼配马天尼杯，高球配高球杯 */
      if (p.glass) state.glass = p.glass;
      state.iceLevel = glassOf(state.glass).ice === 'inglass' ? 'full' : 'none';
      /* 配方也自带做法：兑和 / 搅拌 / 摇和。这一步以前漏了，
         于是点"萨泽拉克"出来的是兑和——35 度，比实际的 31 度烈。 */
      state.method = PRESET_METHOD[p.name] || state.method;
      /* 口味也跟着这杯的度数走（见 tasteForAbv），不然点马天尼一进来就被判"太烈" */
      state.taste = tasteForAbv(analyze().abv);
      /* 备注挪到杯子下面显示（用户说挤在卡片里太乱） */
      state.recipeName = p.name; state.recipeSub = p.sub; state.recipeTip = p.tip || '';
      state.swapOpen = false;
      renderCup(); renderResult(); renderLib(); renderGlassPick(); renderIcePick();
      renderMethodPick(); renderTastePick();
      setPage('bar', true);
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

  /* ④ 手边有什么：搜索框 + 清空 */
  (function () {
    var box = document.getElementById('haveSearch');
    if (box) box.addEventListener('input', function () { haveQuery = this.value; renderHaveList(); });
    var clr = document.getElementById('haveClear');
    if (clr) clr.addEventListener('click', function () { state.have = {}; saveHave(); renderHave(); });
  })();

  /* ---------------------------------------------------------
     页面：今晚喝什么 / 调酒台 / 酒单 / Tips

     四页在同一个 HTML 里，靠 .page.on 切显示——不跳转、不重新加载，
     所以切页是瞬间的。选过哪一页记在本地，下次打开还在那儿。
     手机上侧栏是抽屉（点 ☰ 滑出，点黑幕关掉）。
     --------------------------------------------------------- */
  var PAGE_KEY = 'barmix.page';
  var PAGES = ['tonight', 'bar', 'menu', 'tips'];
  var menuRendered = false;
  var PAGE_SUB = {
    tonight: '挑一个心情，来三杯',
    bar: '挑材料 → 实时风味图 → 评分与调整建议',
    menu: '191 款经典 · 我的收藏 · 我的特调',
    tips: '没冰箱也能调：保存、替换、避坑'
  };
  function currentPage() {
    for (var i = 0; i < PAGES.length; i++) {
      var el = document.getElementById('page-' + PAGES[i]);
      if (el && el.classList.contains('on')) return PAGES[i];
    }
    return 'bar';
  }
  function setPage(p, save) {
    if (PAGES.indexOf(p) < 0) p = 'bar';
    /* 酒单第一次露面时才画（191 张卡片，没必要开屏就建） */
    if (p === 'menu' && !menuRendered) { renderMenu(); menuRendered = true; }
    if (p === 'tonight') renderTonight();
    PAGES.forEach(function (id) {
      var el = document.getElementById('page-' + id);
      if (el) el.classList.toggle('on', id === p);
    });
    var items = document.querySelectorAll('.navitem');
    for (var i = 0; i < items.length; i++) {
      items[i].classList.toggle('on', items[i].dataset.page === p);
    }
    var sub = document.getElementById('topSub');
    if (sub && PAGE_SUB[p]) sub.textContent = PAGE_SUB[p];
    closeNav();
    if (save) { try { localStorage.setItem(PAGE_KEY, p); } catch (e) {} }
    if (window.scrollTo) window.scrollTo(0, 0);
  }
  function openNav() { document.body.classList.add('navopen'); }
  function closeNav() { document.body.classList.remove('navopen'); }

  (function () {
    var btn = document.getElementById('navBtn');
    if (btn) btn.addEventListener('click', function () {
      /* 手机上抽屉开合；桌面上把收起的侧栏放出来 */
      if (window.matchMedia && matchMedia('(max-width: 979px)').matches) {
        document.body.classList.contains('navopen') ? closeNav() : openNav();
      } else {
        var shell = document.querySelector('.shell');
        if (shell) shell.classList.toggle('folded');
      }
    });
    var fold = document.getElementById('navFold');
    if (fold) fold.addEventListener('click', function () {
      var shell = document.querySelector('.shell');
      if (shell) shell.classList.add('folded');
    });
    var back = document.getElementById('navBack');
    if (back) back.addEventListener('click', closeNav);
    /* 打开时恢复上次那一页（存不了就默认"调酒台"） */
    var saved = 'bar';
    try { saved = localStorage.getItem(PAGE_KEY) || 'bar'; } catch (e) {}
    setPage(saved, false);
  })();

  /* ---------------------------------------------------------
     主题：深色 / 浅色

     只做一件事——在 <html> 上挂 data-theme="light"，
     颜色全在 CSS 变量里（见 app.css 的两套值）。
     选择存在本地，下次打开还是它。
     --------------------------------------------------------- */
  var THEME_KEY = 'barmix.theme';
  function currentTheme() {
    var root = document.documentElement;
    return root && root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }
  function applyTheme(t, save) {
    var root = document.documentElement;
    if (root) {
      if (t === 'light') root.setAttribute('data-theme', 'light');
      else root.removeAttribute('data-theme');
    }
    var btn = document.getElementById('themeBtn');
    if (btn) {
      /* 按钮上写的是"点了会变成什么" */
      btn.textContent = t === 'light' ? '深色' : '浅色';
      btn.setAttribute('aria-pressed', t === 'light' ? 'true' : 'false');
    }
    var meta = document.querySelector ? document.querySelector('meta[name="theme-color"]') : null;
    if (meta) meta.setAttribute('content', t === 'light' ? '#f7f4ef' : '#12100f');
    if (save) {
      try { localStorage.setItem(THEME_KEY, t); } catch (e) { /* 无痕模式存不了，不影响用 */ }
    }
  }

  (function () {
    var btn = document.getElementById('themeBtn');
    applyTheme(currentTheme(), false);
    if (btn) btn.addEventListener('click', function () {
      applyTheme(currentTheme() === 'light' ? 'dark' : 'light', true);
    });
  })();

  /* 酒单：搜索框、清空、翻更多、保存这杯 */
  (function () {
    var box = document.getElementById('menuSearch');
    if (box) box.addEventListener('input', function () { menuQuery = this.value; menuShow = MENU_PAGE; renderMenuList(); });
    var clr = document.getElementById('menuClear');
    if (clr) clr.addEventListener('click', function () {
      menuQuery = ''; menuShow = MENU_PAGE;
      var b = document.getElementById('menuSearch');
      if (b) b.value = '';
      renderMenuList();
    });
    var more = document.getElementById('menuMore');
    if (more) more.addEventListener('click', function () { menuShow += MENU_PAGE; renderMenuList(); });
    var save = document.getElementById('saveBtn');
    if (save) save.addEventListener('click', saveCurrent);
  })();

  /* ③ 材料库：搜索框 + 清空 */
  (function () {
    var box = document.getElementById('libSearch');
    if (box) box.addEventListener('input', function () { libQuery = this.value; renderLib(); });
    var clr = document.getElementById('libClear');
    if (clr) clr.addEventListener('click', function () {
      libQuery = '';
      var b = document.getElementById('libSearch');
      if (b) b.value = '';
      renderLib();
    });
  })();

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
  loadHave();       /* 上次勾的"手边有什么"还在 */
  renderAll();

  /* 调试 / 二次开发用：在浏览器控制台可以访问 window.BarMix */
  /* =========================================================
     今晚喝什么：给"随手想喝一杯"的人

     界面上的约定（用户定的）：一屏只问一个问题、按钮不超过 6 个；
     点了给三杯，每杯只说三件事——叫什么、要买什么、怎么倒。
     想细看风味和评分，点「拿去细调」跳到调酒台。
     ========================================================= */
  var MOODS = [
    /* val = 这一档拿什么排序（"想喝酸的"就得把最酸的那几杯排前面，
       不然按"材料少"排会跳出螺丝刀这种只有橙汁带一点酸的酒） */
    { id: 'sweet', label: '想喝甜的', hit: function (st) { return st.sugar >= 8; },
      val: function (st) { return st.sugar; }, desc: true },
    { id: 'fizz', label: '清爽带气泡', hit: function (st) { return st.bubbly; },
      val: function (st) { return st.fizz; }, desc: true },
    { id: 'sour', label: '想喝酸的', hit: function (st) { return st.acid >= 6; },
      val: function (st) { return st.acid; }, desc: true },
    /* 有人明确不喝带气的，所以"清爽"和"带气泡"分开两档 */
    /* "别冒气"就是杯里一样带气的材料都没有——不是"气泡分低就不算" */
    { id: 'still', label: '清爽，别冒气', hit: function (st) { return isFresh(st) && !st.bubbly; },
      val: function (st) { return st.body === 0 ? 0 : 1 / st.body; }, desc: true },
    { id: 'strong', label: '来点浓的', hit: function (st) { return st.abv > 22; },
      val: function (st) { return st.abv; }, desc: true },
    { id: 'light', label: '不想醉', hit: function (st) { return st.abv <= 12; },
      val: function (st) { return st.abv; } },
    { id: 'any', label: '没主意，随便来三杯', hit: function () { return true; }, random: true }
  ];
  var tonightMood = '';

  function moodById(id) {
    for (var i = 0; i < MOODS.length; i++) if (MOODS[i].id === id) return MOODS[i];
    return null;
  }

  /* 每天换一批，但同一天里刷新多少次都一样：
     用"日期 + 这一档"当种子，用户不会每天都看到同样三杯，也不会点一下就跳。 */
  function daySeed(extra) {
    var d = new Date();
    var s = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate() + '|' + extra;
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function seededShuffle(list, seed) {
    var pool = list.slice();
    var st = seed >>> 0;
    for (var i = pool.length - 1; i > 0; i--) {
      st = (st * 1664525 + 1013904223) >>> 0;
      var j = st % (i + 1);
      var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
    }
    return pool;
  }

  /* 这一档的候选（先推荐款、再按这档的强度、最后好做的在前）。
     取前 POOL 个当"今天从这里面挑"，保证每天有得换、又不会挑到太离谱的。 */
  var TONIGHT_POOL = 12;
  function tonightPool(m) {
    var out = [];
    REF_RECIPES.forEach(function (r, i) {
      var st = refStat(i);
      if (!m.hit(st, r)) return;
      out.push({ i: i, v: m.val ? m.val(st) : 0 });
    });
    out.sort(function (a, b) {
      var ra = REF_RECIPES[a.i], rb = REF_RECIPES[b.i];
      if (!!rb.pick !== !!ra.pick) return rb.pick ? 1 : -1;      /* 先推荐的 */
      if (a.v !== b.v) return m.desc ? b.v - a.v : a.v - b.v;    /* 再按这一档的强度 */
      return ra.needs.length - rb.needs.length;                  /* 最后好做的在前 */
    });
    var pickNames = out.filter(function (x) { return REF_RECIPES[x.i].pick; });
    var pool = (m.random ? pickNames : out).map(function (x) { return x.i; });
    var k = Math.max(6, Math.min(TONIGHT_POOL, pool.length));
    return pool.slice(0, k);
  }

  /* 这一档要拿出来哪三杯：从候选池里按"今天"的种子挑三个 */
  function tonightPicks(m) {
    var pool = tonightPool(m);
    if (!pool.length) return [];
    return seededShuffle(pool, daySeed(m.id)).slice(0, 3);
  }

  /* 这杯要买什么：有本站配比的按配比，否则按参考配方；勾过「手边有什么」的标"有了" */
  function tonightItems(r) {
    var d = presetDiffOf(r);
    if (d) {
      return d.pre.items.filter(function (it) {
        return BY_ID[it[0]] && BY_ID[it[0]].cat !== 'ice';
      }).map(function (it) {
        return { name: shortName(BY_ID[it[0]]), amt: fmtAmt(BY_ID[it[0]], it[1]), have: !!state.have[it[0]] };
      });
    }
    var mine = Object.keys(state.have);
    return r.needs.filter(function (nd) { return !nd.need.optional; }).map(function (nd) {
      return { name: needLabel(nd), amt: String(nd.a || ''), have: needStatusWith(nd.need, mine).ok };
    });
  }

  /* 怎么倒：一句话，够用就行（细节去调酒台看） */
  function tonightHow(r) {
    var m = methodFromRef(r.method);
    var gl = glassOf(glassFromRef(r));
    var glass = gl.name;
    /* 只有"冰留在杯里"那种杯型才提加冰；马天尼杯/香槟杯是冰镇后滤进去的 */
    var ice = gl.ice === 'inglass' ? '（杯里先放冰）' : '';
    if (m === 'shake') return '材料加冰摇 15 秒，滤进' + glass + ice;
    if (m === 'stir') return '材料加冰搅 20 秒，滤进' + glass + ice;
    if (r.method === 'blended' || r.method === 'blend') return '连冰一起打成冰沙，倒进' + glass;
    return '材料直接倒进' + glass + '搅两下' + ice;
  }

  function tonightCard(i) {
    var r = REF_RECIPES[i];
    var nm = recipeName(r);
    var items = tonightItems(r);
    var need = items.filter(function (x) { return !x.have; });
    var line = items.map(function (x) {
      return '<span class="' + (x.have ? 'ti-have' : '') + '">' + esc(x.name)
        + ' ' + esc(x.amt) + (x.have ? ' ✓' : '') + '</span>';
    }).join(' · ');
    var miss = need.length
      ? '要买：' + need.map(function (x) { return esc(x.name); }).join('、')
      : '材料你都有 ✓';
    /* 什么都没勾的时候，"要买什么"那行已经把东西列全了，不用再重复一遍 */
    var missLine = items.some(function (x) { return x.have; })
      ? '<p class="tc-miss">' + miss + '</p>' : '';
    return '<article class="tcard">'
      + '<div class="tc-head"><b>' + esc(nm) + '</b><i>' + esc(r.en || '') + '</i>'
        + '<span class="tc-star' + (isFav(nm) ? ' on' : '') + '" data-fav="' + i + '" role="button" tabindex="0"'
        + ' title="' + (isFav(nm) ? '取消收藏' : '收藏') + '">' + (isFav(nm) ? '★' : '☆') + '</span></div>'
      + (PICK_LINE[nm] ? '<p class="hint pickline">' + esc(PICK_LINE[nm]) + '</p>' : '')
      + '<p class="tc-line"><b>要买什么</b>：' + line + '</p>'
      + '<p class="tc-line"><b>怎么倒</b>：' + esc(tonightHow(r)) + '</p>'
      + missLine
      + '<div class="tc-acts"><button type="button" class="ghost on" data-tonight-go="' + i
        + '">拿去细调</button></div>'
      + '</article>';
  }

  function renderTonight() {
    var row = document.getElementById('moodRow');
    if (!row) return;
    row.innerHTML = MOODS.map(function (m) {
      return '<button type="button" class="moodbtn' + (m.id === tonightMood ? ' on' : '')
        + '" data-mood="' + m.id + '">' + m.label + '</button>';
    }).join('');
    var out = document.getElementById('tonightOut');
    if (!out) return;
    var m = moodById(tonightMood);
    if (!m) {
      out.innerHTML = '<p class="hint">上面点一个，下面出三杯。</p>';
      return;
    }
    var picks = tonightPicks(m);
    if (!picks.length) {
      out.innerHTML = '<p class="hint">这一档暂时没挑出合适的，换个心情试试。</p>';
      return;
    }
    out.innerHTML = '<div class="tcards">' + picks.map(tonightCard).join('') + '</div>'
      + '<p class="hint tonightfoot">就这三杯。想要更多选择、想看风味和评分，去「酒单」或「调酒台」。</p>';
  }

  window.BarMix = {
    state: state, analyze: analyze, advise: advise, BY_ID: BY_ID,
    dims: DIMS,                       /* 风味图的八个维度（调试/自检用） */
    /* 「今晚喝什么」：给自检和调试用 */
    tonight: {
      moods: MOODS,
      pool: function (id) { var m = moodById(id); return m ? tonightPool(m) : []; },
      picks: function (id) { var m = moodById(id); return m ? tonightPicks(m) : []; },
      render: renderTonight,
      seed: daySeed,
      fresh: isFresh
    },
    tempIdOf: tempIdOf, tempOf: tempOf,
    hasTemp: hasTemp,
    /* ④ 手边有什么：给自检和调试用 */
    have: {
      recipes: REF_RECIPES,
      reset: function () { state.have = {}; renderHave(); },
      toggle: function (id) {
        if (state.have[id]) delete state.have[id]; else state.have[id] = 1;
        renderHave();
      },
      count: function () { return Object.keys(state.have).length; },
      render: renderHave,
      setCat: function (id) { state.haveCat = id; haveQuery = ''; renderHave(); },
      missing: function (i) {
        return missingOf(REF_RECIPES[i]).map(function (nd) { return nd.n; });
      },
      missingLabel: function (i) { return missingOf(REF_RECIPES[i]).map(needLabel); },
      used: function (i) { return usedOf(REF_RECIPES[i]).length; },
      buy: buySuggest,
      load: loadRefRecipe,
      parse: parseAmount
    },
    /* ③ 材料库的搜索：给自检和调试用 */
    lib: {
      search: function (q) {
        libQuery = q || '';
        var b = document.getElementById('libSearch');
        if (b) b.value = libQuery;
        renderLib();
      },
      query: function () { return libQuery; }
    },
    /* 主题：给自检和调试用 */
    theme: {
      current: currentTheme,
      set: function (t) { applyTheme(t, true); return currentTheme(); }
    },
    /* 页面切换：给自检和调试用 */
    page: {
      current: currentPage,
      set: function (p) { setPage(p, true); return currentPage(); }
    },
    /* 酒单：给自检和调试用 */
    menu: {
      render: renderMenu,
      list: function () { return menuList().length; },
      setTab: function (t) { menuTab = t; menuShow = MENU_PAGE; renderMenu(); },
      setFam: function (f) { menuFam = f; menuShow = MENU_PAGE; renderMenu(); },
      setTaste: function (t) { menuTaste = t; menuShow = MENU_PAGE; renderMenu(); },
      setStr: function (s) { menuStr = s; menuShow = MENU_PAGE; renderMenu(); },
      reset: function () {
        menuTab = 'classic'; menuFam = ''; menuTaste = ''; menuStr = '';
        openRecipe = -1; renderMenu();
      },
      open: function (i) { openRecipe = i; renderMenuDetail(); },
      fav: function (name) { return toggleFav(name); },
      favs: function () { return favs.slice(); },
      save: saveCurrent,
      mine: function () { return myRecipes.map(function (m) { return m.name; }); },
      del: function (i) { myRecipes.splice(i, 1); storeSet(MINE_KEY, myRecipes); renderMenu(); }
    },
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
      if (!PRESETS[i]) return null;
      presetLoad(i);                 /* 和界面上点卡片走同一条路 */
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
