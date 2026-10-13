/* =========================================================
   调酒台 · 材料库
   f 里的数值 = 「按默认份量倒入时，对那一维风味的贡献强度」
   sugar 甜 / acid 酸 / bitter 苦 / booze 酒感
   fruit 果香 / spice 香料 / fizz 气泡（只认真碳酸）/ body 醇厚
   src: near 便利店 / rt 超市 / web 网购
   mlu = 每个单位等于多少毫升（0 表示不计入液量，比如皮、叶、冰）
   ========================================================= */

var CATS = [
  { id: 'whisky',  name: '威士忌' },
  { id: 'gin',     name: '金酒' },
  { id: 'rum',     name: '朗姆' },
  { id: 'vodka',   name: '伏特加' },
  { id: 'tequila', name: '龙舌兰' },
  { id: 'brandy',  name: '白兰地' },
  { id: 'otherbase', name: '其他基酒' },
  { id: 'liqueur', name: '利口酒' },
  { id: 'wine',    name: '葡萄酒·加强酒' },
  { id: 'sour',    name: '酸味' },
  { id: 'sweet',   name: '甜味' },
  { id: 'juice',   name: '果汁·果饮' },
  { id: 'mixer',   name: '气泡·饮料' },
  { id: 'teacoffee', name: '茶·咖啡' },
  { id: 'dairy',   name: '乳饮·其他' },
  { id: 'bitter',  name: '苦精·香料' },
  /* "鲜料"和"装饰"分开：蛋清、薄荷、黄瓜是要进配方的真材料；
     柠檬皮、樱桃、树莓这些不放也能喝。以前合成一栏"点缀·口感"，
     结果把蛋清也叫成装饰了（用户指出的）。 */
  { id: 'fresh',   name: '蛋·香草' },
  { id: 'garnish', name: '装饰' }
];

/* f 的键顺序：sugar acid bitter booze fruit spice fizz body */
var INGREDIENTS = [
  /* ---------------- 基酒 ---------------- */

  /* ---- 金酒 ---- */
  { id:'gin', cat:'gin', name:'哥顿金酒', unit:'ml', mlu:1, def:45, step:5, abv:40, src:'web',
    f:{sugar:0.5,acid:0.5,bitter:2,booze:8,fruit:3,spice:6,fizz:0,body:3},
    note:'最便宜的可用伦敦干金，杜松子直接。⚠️ 这瓶各国版本度数差很多（37.5% / 40% / 47.3%），以瓶身为准——点杯子里的度数就能改。' },
  { id:'tanqueray', cat:'gin', name:'添加利金酒', unit:'ml', mlu:1, def:45, step:5, abv:47.3, src:'web',
    f:{sugar:0.5,acid:0.5,bitter:2.5,booze:9,fruit:3,spice:7,fizz:0,body:3},
    note:'伦敦干金的标准答案：杜松子强烈、柑橘干净、47 度够劲。做金汤力和干马天尼首选它。' },
  { id:'beefeater', cat:'gin', name:'必富达金酒', unit:'ml', mlu:1, def:45, step:5, abv:40, src:'web',
    f:{sugar:1,acid:0.5,bitter:2,booze:8,fruit:3.5,spice:6.5,fizz:0,body:3},
    note:'比添加利柔、柑橘皮更明显，价格友好。第一瓶金酒可以选它。' },
  { id:'bombay', cat:'gin', name:'孟买蓝宝石金酒', unit:'ml', mlu:1, def:45, step:5, abv:40, src:'web',
    f:{sugar:1.5,acid:0.5,bitter:1.5,booze:8,fruit:4,spice:7,fizz:0,body:3},
    note:'花香和草本突出，杜松子没那么冲，加气泡水特别顺。' },
  { id:'hendricks', cat:'gin', name:'亨利爵士金酒', unit:'ml', mlu:1, def:45, step:5, abv:41.4, src:'web',
    f:{sugar:1.5,acid:0.5,bitter:1,booze:8,fruit:3,spice:6,fizz:0,body:3.5},
    note:'黄瓜和玫瑰的香气，是最不"冲"的金酒。配黄瓜片和气泡水，完全不需要其他材料。' },
  { id:'old_tom', cat:'gin', name:'老汤姆金酒', unit:'ml', mlu:1, def:45, step:5, abv:40, src:'web',
    f:{sugar:3,acid:0.5,bitter:2,booze:8,fruit:3,spice:6,fizz:0,body:3.5},
    note:'老派金酒：比伦敦干金多一点甜、少一点锋利。马丁内斯、汤姆柯林斯这类老配方指定用它。' },
  { id:'plymouth', cat:'gin', name:'普利茅斯金酒', unit:'ml', mlu:1, def:45, step:5, abv:41.2, src:'web',
    f:{sugar:1,acid:0.5,bitter:2,booze:8,fruit:3.5,spice:6,fizz:0,body:3},
    note:'最老的伦敦干金品牌之一，比添加利更柔、土感更重。' },
  { id:'tanqueray10', cat:'gin', name:'添加利十号', unit:'ml', mlu:1, def:45, step:5, abv:47.3, src:'web',
    f:{sugar:1.5,acid:0.5,bitter:2,booze:9,fruit:5.5,spice:7,fizz:0,body:3},
    note:'在添加利的基础上加了葡萄柚、橙和青柠，柑橘味爆发。做金汤力明显比普通版香。' },
  { id:'roku', cat:'gin', name:'三得利六金酒 Roku', unit:'ml', mlu:1, def:45, step:5, abv:43, src:'near',
    f:{sugar:1.5,acid:0.5,bitter:1.5,booze:8,fruit:4,spice:6.5,fizz:0,body:3},
    note:'日本金酒，六种和风植物：樱花、樱叶、柚皮、煎茶、山椒、玉露。罗森、大润发经常能碰到，价格比进口金酒友好——想把金汤力升一档，从它开始最省事。' },
  { id:'botanist', cat:'gin', name:'植物学家金酒 The Botanist', unit:'ml', mlu:1, def:45, step:5, abv:46, src:'web',
    f:{sugar:1,acid:0.5,bitter:2,booze:9,fruit:3.5,spice:8,fizz:0,body:3},
    note:'艾雷岛出的干金，用了 22 种当地草本，薄荷、洋甘菊、荨麻的味道很明显。比一般伦敦干金更"绿"，配苏打水和一片黄瓜就很完整。46 度。' },
  { id:'nordes', cat:'gin', name:'诺迪斯金酒 Nordés', unit:'ml', mlu:1, def:45, step:5, abv:40, src:'web',
    f:{sugar:2,acid:0.6,bitter:1.5,booze:8,fruit:5.5,spice:6,fizz:0,body:3},
    note:'西班牙加利西亚的金酒，基酒是阿尔巴利诺葡萄做的，再加月桂、鼠尾草这些当地植物。花香和葡萄味很突出，做金汤力是它的主场，别拿它做重口味的酒。' },
  { id:'monkey47', cat:'gin', name:'猴王47黑森林干金 Monkey 47', unit:'ml', mlu:1, def:45, step:5, abv:47, src:'web',
    f:{sugar:1,acid:0.4,bitter:2.5,booze:9,fruit:4,spice:9,fizz:0,body:4},
    note:'德国黑森林，47 种植物、47 度，国内电商好买。香气极其复杂，最好加苏打水或者纯饮——做加了一堆东西的长饮会把它埋掉，可惜。' },

  /* ---- 朗姆 ---- */
  { id:'rum', cat:'rum', name:'百加得白朗姆', unit:'ml', mlu:1, def:45, step:5, abv:40, src:'web',
    f:{sugar:4,acid:0.2,bitter:0,booze:7,fruit:4,spice:2,fizz:0,body:4},
    note:'干净、中性、便宜，几乎没个性——好处是不会抢戏。配可乐和青柠就是自由古巴。' },
  { id:'havana3', cat:'rum', name:'哈瓦那俱乐部 3 年', unit:'ml', mlu:1, def:45, step:5, abv:40, src:'web',
    f:{sugar:3.5,acid:0.3,bitter:0.5,booze:8,fruit:4.5,spice:2.5,fizz:0,body:4},
    note:'古巴白朗姆，甘蔗的甜香比百加得明显，莫吉托和自由古巴用它才是原味。' },
  { id:'havana7', cat:'rum', name:'哈瓦那俱乐部 7 年', unit:'ml', mlu:1, def:45, step:5, abv:40, src:'web',
    f:{sugar:5,acid:0.3,bitter:1.5,booze:8,fruit:4,spice:5,fizz:0,body:6},
    note:'陈年朗姆，香草、焦糖和木头味。加冰纯饮就很好，也能替威士忌做古典式。' },
  { id:'captain', cat:'rum', name:'摩根船长香料朗姆', unit:'ml', mlu:1, def:45, step:5, abv:35, src:'web',
    f:{sugar:6,acid:0.2,bitter:0.5,booze:7,fruit:3,spice:8,fizz:0,body:5},
    note:'香草肉桂味、本身带甜，配可乐基本不用再加糖。度数低，很适合住处。' },
  { id:'dark_rum', cat:'rum', name:'美雅士黑朗姆', unit:'ml', mlu:1, def:45, step:5, abv:40, src:'web',
    f:{sugar:5,acid:0.2,bitter:1.5,booze:8,fruit:3.5,spice:4,fizz:0,body:7},
    note:'糖蜜和焦糖很重，颜色深。做深色朗姆可乐、或者跟白朗姆各半，层次立刻不一样。' },
  { id:'bacardi_oro', cat:'rum', name:'百加得金朗姆', unit:'ml', mlu:1, def:45, step:5, abv:37.5, src:'web',
    f:{sugar:4.5,acid:0.2,bitter:0.5,booze:7,fruit:4,spice:3,fizz:0,body:5},
    note:'比白朗姆多一层橡木和焦糖，颜色淡金。配热带果汁比白朗姆更有味道。' },
  { id:'plantation3', cat:'rum', name:'蔗园三星朗姆', unit:'ml', mlu:1, def:45, step:5, abv:41.2, src:'web',
    f:{sugar:4,acid:0.3,bitter:1,booze:8.5,fruit:5,spice:3.5,fizz:0,body:5},
    note:'古巴、牙买加、巴巴多斯三种朗姆调出来的，调酒师很爱用：比百加得有个性，又不像陈年朗姆那么重。' },
  { id:'plantation_dark', cat:'rum', name:'蔗园黑朗姆', unit:'ml', mlu:1, def:45, step:5, abv:40, src:'web',
    f:{sugar:5.5,acid:0.2,bitter:1.5,booze:8,fruit:4,spice:5,fizz:0,body:7},
    note:'牙买加风格的深色朗姆，香蕉和糖蜜味很突出。做深色朗姆可乐、热带饮料特别好。' },
  { id:'cachaca', cat:'rum', name:'卡萨莎（巴西甘蔗酒）', unit:'ml', mlu:1, def:45, step:5, abv:40, src:'web',
    f:{sugar:3,acid:0.3,bitter:0.5,booze:8,fruit:4.5,spice:4,fizz:0,body:4},
    note:'巴西的甘蔗蒸馏酒，比朗姆更"生"、带青草和泥土味。凯匹林纳必需，没它就不是那杯酒。' },
  { id:'appleton', cat:'rum', name:'阿普尔顿金标朗姆', unit:'ml', mlu:1, def:45, step:5, abv:40, src:'web',
    f:{sugar:4.5,acid:0.3,bitter:1,booze:8,fruit:4.5,spice:4,fizz:0,body:6},
    note:'牙买加朗姆的代表，比百加得有性格：熟香蕉、热带水果和一点 funk。' },

  /* ---- 伏特加 ---- */
  { id:'vodka', cat:'vodka', name:'绝对伏特加', unit:'ml', mlu:1, def:45, step:5, abv:40, src:'rt',
    f:{sugar:0.5,acid:0,bitter:0,booze:9,fruit:0,spice:0,fizz:0,body:3},
    note:'超市就有。本身几乎没味道，全靠其他材料出彩，所以很适合拿来练配方。' },
  { id:'grey_goose', cat:'vodka', name:'灰雁伏特加', unit:'ml', mlu:1, def:45, step:5, abv:40, src:'web',
    f:{sugar:1.5,acid:0,bitter:0.3,booze:8.5,fruit:0.5,spice:0.5,fizz:0,body:3.5},
    note:'比绝对更圆、更顺，贵在这里。伏特加本身没味道，差别主要在口感的顺滑度。' },
  { id:'smirnoff', cat:'vodka', name:'斯米诺伏特加', unit:'ml', mlu:1, def:45, step:5, abv:37.5, src:'rt',
    f:{sugar:0.5,acid:0,bitter:0.5,booze:8,fruit:0.5,spice:0.5,fizz:0,body:3},
    note:'最便宜、最好买的一瓶。中性直白，做莫斯科骡子、血腥玛丽都不心疼——反正伏特加本来就没味道。' },
  { id:'belvedere', cat:'vodka', name:'雪树伏特加', unit:'ml', mlu:1, def:45, step:5, abv:40, src:'web',
    f:{sugar:2,acid:0,bitter:0.3,booze:8.5,fruit:0.5,spice:0.5,fizz:0,body:4},
    note:'波兰黑麦伏特加，比绝对更圆润，带一点点奶油感。' },
  { id:'finlandia', cat:'vodka', name:'芬兰伏特加', unit:'ml', mlu:1, def:45, step:5, abv:40, src:'web',
    f:{sugar:1.5,acid:0,bitter:0.3,booze:8.5,fruit:0.5,spice:0.5,fizz:0,body:3.5},
    note:'大麦做的，干净清冽，价格中等。' },

  /* ---- 龙舌兰 ---- */
  { id:'tequila', cat:'tequila', name:'豪帅快活金标龙舌兰', unit:'ml', mlu:1, def:45, step:5, abv:38, src:'web',
    f:{sugar:2,acid:0.5,bitter:1,booze:8,fruit:3,spice:6,fizz:0,body:4},
    note:'最常见的平价龙舌兰，青草和胡椒感，配西柚汁特别顺。介意杂味就换培恩。' },
  { id:'patron', cat:'tequila', name:'培恩银龙舌兰', unit:'ml', mlu:1, def:45, step:5, abv:40, src:'web',
    f:{sugar:2.5,acid:0.5,bitter:0.5,booze:8,fruit:4,spice:5.5,fizz:0,body:4},
    note:'干净的青草和柑橘，没有杂味。玛格丽特用它和用便宜龙舌兰完全是两杯酒。' },
  { id:'mezcal', cat:'tequila', name:'美斯卡尔烟熏龙舌兰', unit:'ml', mlu:1, def:45, step:5, abv:45, src:'web',
    f:{sugar:2,acid:0.5,bitter:2,booze:9,fruit:2,spice:9,fizz:0,body:4},
    note:'有明确的烟熏味，风格强烈。少量替掉龙舌兰，整杯会多出一层烟。' },
  { id:'olmeca', cat:'tequila', name:'奥美加银龙舌兰', unit:'ml', mlu:1, def:45, step:5, abv:38, src:'web',
    f:{sugar:2.5,acid:0.5,bitter:0.5,booze:8,fruit:4,spice:5.5,fizz:0,body:4},
    note:'性价比很高的一瓶，龙舌兰本身的青草和柑橘保留得很完整。比豪帅快活干净一档。' },
  { id:'donjulio', cat:'tequila', name:'唐胡里奥银龙舌兰', unit:'ml', mlu:1, def:45, step:5, abv:38, src:'web',
    f:{sugar:3,acid:0.5,bitter:0.5,booze:8,fruit:4.5,spice:5,fizz:0,body:4.5},
    note:'比培恩更甜、更柔，纯饮都好喝。做玛格丽特基本是顶配了。' },

  /* ---- 威士忌 ---- */
  { id:'bourbon', cat:'whisky', name:'占边波本威士忌', unit:'ml', mlu:1, def:45, step:5, abv:40, src:'web',
    f:{sugar:4,acid:0,bitter:2,booze:8,fruit:3,spice:4,fizz:0,body:7},
    note:'波本的标准入门款：玉米甜感重、带香草木头味，价格便宜。古典、威士忌酸、薄荷朱丽普都用它。' },
  { id:'buffalo_trace', cat:'whisky', name:'水牛足迹波本', unit:'ml', mlu:1, def:45, step:5, abv:45, src:'web',
    f:{sugar:5,acid:0.3,bitter:1.5,booze:9,fruit:4,spice:4.5,fizz:0,body:6},
    note:'经典配方里出现最多的波本之一，比占边细腻，香草和焦糖更清楚，45 度。' },
  { id:'makers', cat:'whisky', name:'美格波本', unit:'ml', mlu:1, def:45, step:5, abv:45, src:'web',
    f:{sugar:5.5,acid:0.3,bitter:1.5,booze:9,fruit:3.5,spice:4,fizz:0,body:6},
    note:'柔和的波本，麦香和焦糖重，45 度。瓶口的红色蜡封很好认。' },
  { id:'rye', cat:'whisky', name:'瑞顿房黑麦威士忌', unit:'ml', mlu:1, def:45, step:5, abv:50, src:'web',
    f:{sugar:3.5,acid:0.4,bitter:2.5,booze:9.5,fruit:3,spice:6,fizz:0,body:6},
    note:'比波本更干、更辛辣，带黑麦的胡椒味。曼哈顿、萨泽拉克、八区这类老派配方指定用它。度数高，小心。' },
  { id:'jack', cat:'whisky', name:'杰克丹尼', unit:'ml', mlu:1, def:45, step:5, abv:40, src:'rt',
    f:{sugar:5,acid:0.3,bitter:1.5,booze:8,fruit:4,spice:4,fizz:0,body:6},
    note:'田纳西威士忌，糖枫木过滤过，香蕉和香草味明显，配可乐就是成年人的味道。' },
  { id:'monkey', cat:'whisky', name:'猴子肩膀调和麦芽', unit:'ml', mlu:1, def:45, step:5, abv:40, src:'web',
    f:{sugar:2,acid:0.4,bitter:1,booze:8,fruit:4,spice:3,fizz:0,body:7},
    note:'苏格兰调和麦芽威士忌：香草、蜂蜜、橙皮、梨，柔和好入口。因为温和不抢戏，几乎什么配方都能拿它替一替，是很称职的万能基酒。' },
  { id:'kakubin', cat:'whisky', name:'三得利角瓶', unit:'ml', mlu:1, def:45, step:5, abv:40, src:'web',
    f:{sugar:4,acid:0.5,bitter:1.5,booze:8,fruit:3.5,spice:3,fizz:0,body:5},
    note:'日本高球国民款：蜂蜜、柔和、只有一丝泥煤。它的存在意义就是做高球——配上冰和苏打水，比很多贵酒都合适。' },
  { id:'jw_black', cat:'whisky', name:'尊尼获加黑方', unit:'ml', mlu:1, def:45, step:5, abv:40, src:'rt',
    f:{sugar:3,acid:0.5,bitter:2,booze:8,fruit:2.5,spice:4.5,fizz:0,body:6},
    note:'烟熏+蜂蜜的苏格兰调和威士忌，做高球、古典、威士忌酸都稳，是最不会出错的一瓶。' },
  { id:'laphroaig', cat:'whisky', name:'拉弗格 10 年', unit:'ml', mlu:1, def:15, step:5, abv:40, src:'web',
    f:{sugar:2,acid:0.5,bitter:3,booze:8,fruit:1.5,spice:9,fizz:0,body:6},
    note:'重泥煤、烟熏、碘味。口感非常极端，但只需要 10-15ml 浮在青霉素上面，就能让整杯升一个档次。' },
  { id:'chivas12', cat:'whisky', name:'芝华士 12 年', unit:'ml', mlu:1, def:45, step:5, abv:40, src:'rt',
    f:{sugar:4.5,acid:0.5,bitter:1,booze:8,fruit:4.5,spice:3.5,fizz:0,body:5},
    note:'蜂蜜和青苹果，顺滑不呛，是"第一次喝威士忌"最不容易被劝退的一瓶。' },
  { id:'glenlivet', cat:'whisky', name:'格兰威特 12 年', unit:'ml', mlu:1, def:45, step:5, abv:40, src:'web',
    f:{sugar:4,acid:0.5,bitter:1,booze:8,fruit:4.5,spice:2.5,fizz:0,body:5},
    note:'最常见的入门单一麦芽：花香、蜂蜜、梨，几乎没有任何烟熏。想从调和升级到单一麦芽，先喝它。' },
  { id:'glenfiddich', cat:'whisky', name:'格兰菲迪 12 年', unit:'ml', mlu:1, def:45, step:5, abv:40, src:'web',
    f:{sugar:4.5,acid:0.5,bitter:1,booze:8,fruit:5,spice:2.5,fizz:0,body:5},
    note:'青苹果和梨的香气，比格兰威特更清爽、更甜一点。加一点苏打水就很好喝。' },
  { id:'ballantines', cat:'whisky', name:'百龄坛特醇', unit:'ml', mlu:1, def:45, step:5, abv:40, src:'rt',
    f:{sugar:4,acid:0.5,bitter:1.5,booze:8,fruit:3.5,spice:3.5,fizz:0,body:5},
    note:'便宜大碗的调和苏格兰：蜂蜜、香草、一丝烟熏。做高球和威士忌酸都不心疼。' },
  { id:'jw_red', cat:'whisky', name:'尊尼获加红方', unit:'ml', mlu:1, def:45, step:5, abv:40, src:'rt',
    f:{sugar:3,acid:0.5,bitter:1.5,booze:8,fruit:2.5,spice:4,fizz:0,body:4},
    note:'最便宜的红方，口感直接、带一点谷物辛辣。加可乐或苏打水才是它的主场，纯饮不必勉强。' },
  { id:'talisker', cat:'whisky', name:'泰斯卡 10 年', unit:'ml', mlu:1, def:45, step:5, abv:45.8, src:'web',
    f:{sugar:2.5,acid:0.5,bitter:2.5,booze:9,fruit:2,spice:9,fizz:0,body:6},
    note:'海岛泥煤：烟熏、海盐、黑胡椒，还带一点甜。比拉弗格好入口，是"泥煤入门"的经典选择。' },
  { id:'macallan', cat:'whisky', name:'麦卡伦 12 年', unit:'ml', mlu:1, def:45, step:5, abv:40, src:'web',
    f:{sugar:6,acid:0.5,bitter:1,booze:8,fruit:5,spice:4,fizz:0,body:6},
    note:'雪莉桶单一麦芽的代表：干果、橙皮、太妃糖，圆润厚重。很贵，适合纯饮，拿来调酒有点浪费。' },
  { id:'jameson', cat:'whisky', name:'尊美醇爱尔兰威士忌', unit:'ml', mlu:1, def:45, step:5, abv:40, src:'rt',
    f:{sugar:4.5,acid:0.5,bitter:1,booze:8,fruit:4,spice:3.5,fizz:0,body:5},
    note:'顺滑、带一点青草和蜂蜜，几乎没有烟熏。爱尔兰咖啡的正统基酒。' },
  { id:'wild_turkey', cat:'whisky', name:'威凤凰 101 波本', unit:'ml', mlu:1, def:45, step:5, abv:50.5, src:'web',
    f:{sugar:5,acid:0.3,bitter:2,booze:10,fruit:3.5,spice:5.5,fizz:0,body:7},
    note:'101 proof = 50.5 度，是同价位里最"凶"的波本：辛香、橡木、酒精感都重。做古典很有劲；纯饮建议加一两滴水把它打开。' },
  { id:'ardbeg10', cat:'whisky', name:'阿贝 10 年', unit:'ml', mlu:1, def:15, step:5, abv:46, src:'web',
    f:{sugar:2,acid:0.5,bitter:3,booze:9,fruit:1.5,spice:9.5,fizz:0,body:6},
    note:'比拉弗格更狠的重泥煤：烟熏、焦油、海风。默认给 15ml——当浮层用，别整杯都是它。' },

  /* ---- 白兰地 ---- */
  { id:'cognac', cat:'brandy', name:'轩尼诗 VSOP 干邑', unit:'ml', mlu:1, def:45, step:5, abv:40, src:'rt',
    f:{sugar:5,acid:0.5,bitter:1,booze:8,fruit:5,spice:4,fizz:0,body:5.5},
    note:'葡萄白兰地，果香和木头味。萨泽拉克的原版就是用它，也可以替威士忌做酸。' },
  { id:'calvados', cat:'brandy', name:'卡尔瓦多斯苹果白兰地', unit:'ml', mlu:1, def:45, step:5, abv:40, src:'web',
    f:{sugar:4.5,acid:0.5,bitter:1,booze:8,fruit:5.5,spice:3.5,fizz:0,body:4.5},
    note:'苹果香很讨喜，配柠檬和蜂蜜特别好喝，是威士忌之外另一个好上手的选择。' },
  { id:'remymartin', cat:'brandy', name:'人头马 VSOP', unit:'ml', mlu:1, def:45, step:5, abv:40, src:'rt',
    f:{sugar:5.5,acid:0.5,bitter:1,booze:8,fruit:5.5,spice:4.5,fizz:0,body:6},
    note:'和轩尼诗同一档的干邑，果香更突出、带一点花香。' },
  { id:'keya', cat:'brandy', name:'张裕可雅白兰地', unit:'ml', mlu:1, def:45, step:5, abv:40, src:'rt',
    f:{sugar:5,acid:0.5,bitter:1,booze:8,fruit:4.5,spice:3.5,fizz:0,body:5},
    note:'国产白兰地里最像样的一瓶，价格只有进口干邑的几分之一。调酒完全够用，纯饮也能喝。' },
  { id:'pisco', cat:'brandy', name:'皮斯科酒', unit:'ml', mlu:1, def:45, step:5, abv:40, src:'web',
    f:{sugar:4,acid:0.5,bitter:1,booze:8,fruit:6,spice:3.5,fizz:0,body:4.5},
    note:'秘鲁 / 智利的葡萄蒸馏酒，果香浓、不陈年。皮斯科酸酒的灵魂，配柠檬和蛋清极好。' },

  /* ---- 其他 ---- */
  { id:'soju', cat:'otherbase', name:'真露烧酒', unit:'ml', mlu:1, def:45, step:5, abv:17, src:'near',
    f:{sugar:2,acid:0.3,bitter:0.5,booze:4,fruit:2,spice:2,fizz:0,body:3},
    note:'便利店就有，度数低、几乎不挑搭配，配雪碧或乌龙茶就是韩式喝法。' },
  { id:'jiangxiaobai', cat:'otherbase', name:'江小白（清香型白酒）', unit:'ml', mlu:1, def:30, step:5, abv:40, src:'rt',
    f:{sugar:2,acid:0.3,bitter:1.5,booze:9,fruit:1,spice:3,fizz:0,body:4},
    note:'清香型白酒，比浓香型干净、好入口，也有不少人拿它当基酒调。配柠檬和气泡水意外地不错。' },
  { id:'aquavit', cat:'otherbase', name:'阿夸维特 Aquavit', unit:'ml', mlu:1, def:45, step:5, abv:40, src:'web',
    f:{sugar:1,acid:0.2,bitter:1.5,booze:9,fruit:0.5,spice:7,fizz:0,body:3},
    note:'北欧的葛缕子、莳萝风味烈酒，40 度。冰镇纯饮是它的主场，也能替金酒做更"草本"的鸡尾酒。网购能买到小瓶。' },

  /* ---------------- 利口酒 ---------------- */
  { id:'cointreau', cat:'liqueur', name:'君度橙酒（Cointreau）', unit:'ml', mlu:1, def:15, step:5, abv:40, src:'web',
    f:{sugar:7,acid:1,bitter:2,booze:5,fruit:9,spice:3,fizz:0,body:3},
    note:'橙味甜酒，一点点就能把整杯的果香撑开。橙味这一族有四个：君度（最干最清亮）、柑曼怡（干邑底、更圆更贵）、干库拉索（没那么甜、橙皮味直）、蓝橙（主要是颜色）。配方写"君度"就别拿别的顶，整杯的厚度会变。' },
  { id:'kahlua', cat:'liqueur', name:'甘露咖啡利口酒（Kahlúa）', unit:'ml', mlu:1, def:15, step:5, abv:16, src:'web',
    f:{sugar:9,acid:0.5,bitter:4,booze:2,fruit:2,spice:5,fizz:0,body:6},
    note:'咖啡利口酒里最甜、糖最多的那支（16 度），配威士忌和牛奶是作弊组合。和黑先生（Mr Black）别混：那个 34 度、糖少、咖啡味更真，意式浓缩马天尼指定用它。' },
  { id:'baileys', cat:'liqueur', name:'百利甜（Baileys）', unit:'ml', mlu:1, def:30, step:5, abv:17, src:'web',
    f:{sugar:8,acid:0.3,bitter:0.5,booze:2,fruit:2,spice:2,fizz:0,body:9},
    note:'本身就是威士忌基底，加冰单喝或者加咖啡都好。它是"奶油利口酒"，不是配方里那个"淡奶油"——白俄罗斯那种要的是淡奶油。' },
  { id:'malibu', cat:'liqueur', name:'马利宝椰子朗姆 Malibu', unit:'ml', mlu:1, def:30, step:5, abv:21, src:'rt',
    f:{sugar:8.5,acid:0.2,bitter:0,booze:4,fruit:4,spice:1,fizz:0,body:3},
    note:'超市和便利店常见的椰子味朗姆利口酒，21 度。做椰林飘香最省事——有它就不用兑椰浆，也不会像椰浆那样遇到菠萝汁就结块。代价是甜得很直白，配菠萝汁和青柠才压得住。' },
  { id:'drambuie', cat:'liqueur', name:'杜林标（Drambuie · 蜂蜜香草威士忌利口酒）', unit:'ml', mlu:1, def:20, step:5, abv:40, src:'web',
    f:{sugar:8,acid:0.5,bitter:2,booze:6,fruit:3,spice:7,fizz:0,body:6},
    note:'威士忌+它 = 锈钉，两样东西就能成立的一杯酒。注意它有 40 度、甜但不少酒，别当普通甜酒那样倒。' },
  { id:'disaronno', cat:'liqueur', name:'杏仁利口酒（Disaronno）', unit:'ml', mlu:1, def:20, step:5, abv:28, src:'web',
    f:{sugar:8,acid:0,bitter:1,booze:4,fruit:4,spice:8,fizz:0,body:5},
    note:'杏仁糖香，和威士忌是「教父」的配方。' },
  { id:'cherry_brandy', cat:'liqueur', name:'樱桃白兰地（Heering）', unit:'ml', mlu:1, def:15, step:5, abv:24, src:'web',
    f:{sugar:7,acid:1.5,bitter:1,booze:5,fruit:8,spice:3,fizz:0,body:5},
    note:'做血与沙必需，也是很好的甜味来源。别跟「黑樱桃利口酒」搞混：这个（Heering / 希琳）是甜的樱桃味白兰地，樱桃果香厚；那个是 Maraschino，杏仁味、干得多，两者不能互换。' },
  { id:'campari', cat:'liqueur', name:'金巴利（Campari）', unit:'ml', mlu:1, def:20, step:5, abv:25, src:'web',
    f:{sugar:3,acid:2,bitter:9,booze:5,fruit:4,spice:4,fizz:0,body:3},
    note:'苦味担当，一小份就能给甜味「刹车」。和阿佩罗是一个厂的两兄弟：金巴利 25 度、更苦更烈；阿佩罗 11 度、更甜更亮。尼格罗尼要的是金巴利。' },
  { id:'vermouth', cat:'liqueur', name:'红味美思（甜味美思 / Martini Rosso）', unit:'ml', mlu:1, def:30, step:5, abv:16, src:'rt',
    f:{sugar:6,acid:2,bitter:4,booze:2,fruit:4,spice:6,fizz:0,body:3},
    note:'⚠️ 三件事：一、开瓶后必须低温保存，没冰箱就别买大瓶，买 375ml 尽快用完。二、它叫「味美思」不叫「苦艾酒」——中文里那个是历史误译，苦艾酒是 68% 的蒸馏烈酒，和这个完全两回事。三、它和干味美思（白味美思）是一对但走两条路：这个甜、红，配黑麦威士忌（曼哈顿）；那个干、白，配金酒（马天尼），不能互换。' },
  { id:'dry_vermouth', cat:'liqueur', name:'干味美思（白味美思 / Extra Dry）', unit:'ml', mlu:1, def:15, step:5, abv:16, src:'web',
    f:{sugar:2,acid:3,bitter:4,booze:2,fruit:3,spice:6,fizz:0,body:2},
    note:'干爽带草本味，和红味美思（也叫甜味美思）是一对。同样怕氧化，买 375ml。它也是味美思（加香加强葡萄酒），不是苦艾酒。' },
  { id:'maraschino', cat:'liqueur', name:'黑樱桃利口酒（Luxardo）', unit:'ml', mlu:1, def:15, step:5, abv:32, src:'web',
    f:{sugar:6,acid:0.5,bitter:1.5,booze:4,fruit:7,spice:4,fizz:0,body:2},
    note:'Maraschino，樱桃核蒸馏出来的，不是"樱桃味的甜酒"——带杏仁和花香，比樱桃白兰地（Heering）干得多。经典威士忌配方里出现频率最高的利口酒之一，15ml 就是点睛。' },
  { id:'cassis', cat:'liqueur', name:'黑加仑利口酒（Crème de Cassis）', unit:'ml', mlu:1, def:15, step:5, abv:16, src:'web',
    f:{sugar:9,acid:1.5,bitter:0.5,booze:2,fruit:8,spice:2,fizz:0,body:3},
    note:'加进气泡酒就是皇家基尔，颜色和味道都很讨喜。最容易和香博（黑莓+覆盆子）混：黑加仑是单一果味、还带一点酸；香博更甜更圆，别只看颜色就换。' },
  { id:'benedictine', cat:'liqueur', name:'当酒（Bénédictine）', unit:'ml', mlu:1, def:10, step:5, abv:40, src:'web',
    f:{sugar:7,acid:0.5,bitter:2,booze:5,fruit:3,spice:8,fizz:0,body:4},
    note:'二十多种草本加蜂蜜，10ml 就能把一杯威士忌变得很贵气。和查特是草本利口酒的两条路：当酒甜、蜂蜜和香料重；查特辣、草味冲。B&B 就是当酒加金酒。' },
  { id:'galliano', cat:'liqueur', name:'加力安奴（香草）', unit:'ml', mlu:1, def:10, step:5, abv:30, src:'web',
    f:{sugar:8,acid:0.5,bitter:1,booze:4,fruit:3,spice:8,fizz:0,body:3},
    note:'香草味极重，10ml 就够，多了会盖掉一切。' },
  { id:'chartreuse', cat:'liqueur', name:'查特绿（Chartreuse Verte）', unit:'ml', mlu:1, def:10, step:5, abv:55, src:'web',
    f:{sugar:7,acid:0.5,bitter:4,booze:8,fruit:2,spice:9,fizz:0,body:3},
    note:'很贵，但 10ml 就能让威士忌多出一整层草本香。绿查特 55 度、辣而草；黄查特 40 度、更甜更柔。两个别随手互换。' },
  { id:'aperol', cat:'liqueur', name:'阿佩罗', unit:'ml', mlu:1, def:20, step:5, abv:11, src:'web',
    f:{sugar:7,acid:3,bitter:6,booze:1,fruit:5,spice:3,fizz:0,body:2},
    note:'橙红色、微苦低度。纸飞机要用它；兑气泡水加一片橙子就是阿佩罗气泡。和金巴利最容易混：阿佩罗甜得多、度数只有一半，换着用会明显改掉苦甜平衡。' },
  { id:'stgermain', cat:'liqueur', name:'圣哲曼（接骨木花）', unit:'ml', mlu:1, def:15, step:5, abv:20, src:'web',
    f:{sugar:8,acid:1,bitter:0.5,booze:2,fruit:6,spice:7,fizz:0,body:2},
    note:'花香味作弊器，和气泡酒、柠檬是绝配。' },
  { id:'lillet', cat:'liqueur', name:'利莱白（Lillet Blanc）', unit:'ml', mlu:1, def:30, step:5, abv:17, src:'web',
    f:{sugar:5,acid:3,bitter:3,booze:2,fruit:6,spice:4,fizz:0,body:2},
    note:'比味美思清爽，加气泡酒和橙皮就是很轻松的一杯。也怕氧化，买小瓶。和好奇美国佬（Cocchi）同属"白葡萄酒基开胃酒"，经常互相顶班：利莱更圆更甜，Cocchi 更苦、更像味美思。' },
  { id:'curacao_blue', cat:'liqueur', name:'蓝橙利口酒（Blue Curaçao）', unit:'ml', mlu:1, def:10, step:5, abv:20, src:'web',
    f:{sugar:8,acid:1,bitter:0.5,booze:2,fruit:7,spice:3,fizz:0,body:2},
    note:'主要功能是颜色，橙味其实很淡。和干库拉索不是一回事：那个是真用橙皮、没那么甜（玛格丽特的升级版用它），蓝橙只负责蓝。' },
  { id:'cocoa_white', cat:'liqueur', name:'白可可利口酒（White Crème de Cacao）', unit:'ml', mlu:1, def:15, step:5, abv:24, src:'web',
    f:{sugar:9,acid:0,bitter:1,booze:3,fruit:2,spice:4,fizz:0,body:6},
    note:'甜奶香、几乎不苦的那支可可利口酒，做甜点感的酒用它（亚历山大、蚱蜢那类）。和黑可可的差别就在巧克力苦味上，两者不能随手换。' },
  { id:'frangelico', cat:'liqueur', name:'榛子利口酒（Frangelico）', unit:'ml', mlu:1, def:30, step:5, abv:20, src:'web',
    f:{sugar:9,acid:0.2,bitter:1,booze:3,fruit:2,spice:8,fizz:0,body:5},
    note:'榛子香和威士忌是天生一对，做酸味配方特别好喝。' },
  { id:'fernet', cat:'liqueur', name:'菲奈特（Fernet · 苦味草药酒）', unit:'ml', mlu:1, def:15, step:5, abv:39, src:'web',
    f:{sugar:3,acid:0.5,bitter:10,booze:6,fruit:1,spice:8,fizz:0,body:3},
    note:'苦到极致的意大利草药酒，15ml 就够，专门给甜味踩刹车。别拿它当普通阿玛罗（阿维尔纳、蒙特内罗那种）用——它几乎不甜、苦得长得多。最有名的是 Fernet-Branca。' },
  { id:'absinthe', cat:'liqueur', name:'苦艾酒 Absinthe（绿仙子）', unit:'ml', mlu:1, def:3, step:1, abv:68, src:'web',
    f:{sugar:0,acid:0,bitter:4,booze:4,fruit:1,spice:10,fizz:0,body:1},
    note:'⚠️ 别和"味美思"搞混——那不是同一种东西。这才是真正的苦艾酒：68% 的蒸馏烈酒，茴香 + 苦艾草 + 茴香。用法是洗杯（在杯里转一圈再倒掉）或者滴几滴，千万别当酒喝。萨泽拉克、午后的死亡要用它。' },
  { id:'pastis', cat:'liqueur', name:'茴香酒 Pastis（保乐 / 里卡尔）', unit:'ml', mlu:1, def:5, step:1, abv:45, src:'web',
    f:{sugar:1,acid:0,bitter:2.5,booze:5,fruit:1,spice:8,fizz:0,body:1},
    note:'不含苦艾草、度数低一半的"苦艾酒平替"——茴香味一样冲，但好买得多，京东天猫都有。做萨泽拉克的洗杯完全够用，加冰水就是法国人夏天的喝法。' },
  { id:'sloe_gin', cat:'liqueur', name:'黑刺李金酒 Sloe Gin', unit:'ml', mlu:1, def:20, step:5, abv:26, src:'web',
    f:{sugar:8,acid:2,bitter:1.5,booze:4,fruit:9,spice:3,fizz:0,body:4},
    note:'金酒泡黑刺李做的，红色、酸甜、带浆果香。度数低又好喝，住处里很受欢迎，配气泡酒就是黑刺李皇家。' },
  { id:'grand_marnier', cat:'liqueur', name:'柑曼怡（Grand Marnier）', unit:'ml', mlu:1, def:15, step:5, abv:40, src:'web',
    f:{sugar:7,acid:1,bitter:1.5,booze:5,fruit:8,spice:4,fizz:0,body:3.5},
    note:'干邑基底的橙味利口酒，比君度更圆、更有"陈年感"，贵一档。玛格丽特和大都会拿它替君度就是"升级版"（会明显更圆更甜）；但配方写君度时，这杯就不是原来那个味道了。' },
  { id:'apricot', cat:'liqueur', name:'黄杏利口酒（杏子白兰地 / Apricot Brandy）', unit:'ml', mlu:1, def:15, step:5, abv:24, src:'web',
    f:{sugar:8,acid:1,bitter:0.5,booze:3,fruit:8,spice:3,fizz:0,body:3},
    note:'杏子香，做酸类配方很好用，也能给威士忌加一层果味。经典配方里出现频率不低。"杏子白兰地"多数其实不含白兰地，就是杏子味甜酒（24 度）；它和桃子利口酒是两种水果，不能顶来顶去。' },
  { id:'peach', cat:'liqueur', name:'桃子利口酒', unit:'ml', mlu:1, def:15, step:5, abv:20, src:'web',
    f:{sugar:9,acid:0.5,bitter:0,booze:2,fruit:8,spice:1,fizz:0,body:3},
    note:'甜、香、度数低。配气泡酒和茶都好用，但别加多——它的甜很外向。注意它和"桃子果泥"不是一回事：贝里尼原版用的是真水果打的果泥，这里这瓶是甜酒。' },
  { id:'chambord', cat:'liqueur', name:'香博（黑莓利口酒）', unit:'ml', mlu:1, def:15, step:5, abv:16, src:'web',
    f:{sugar:9,acid:1,bitter:0.5,booze:2,fruit:9,spice:2,fizz:0,body:3},
    note:'法国黑莓+覆盆子利口酒，深红色。给气泡酒滴一点就是"香博皇家"，也常用来做分层。和黑加仑利口酒是两种果子，别看颜色像就换。' },
  { id:'violette', cat:'liqueur', name:'紫罗兰利口酒（Crème de Violette）', unit:'ml', mlu:1, def:10, step:5, abv:20, src:'web',
    f:{sugar:8,acid:0.5,bitter:0.5,booze:2,fruit:5,spice:6,fizz:0,body:2.5},
    note:'淡紫色、花香浓。飞行员（Aviation）必需，几毫升就够，多了像香水。' },
  { id:'menthe_white', cat:'liqueur', name:'白薄荷利口酒（White Crème de Menthe）', unit:'ml', mlu:1, def:15, step:5, abv:24, src:'web',
    f:{sugar:9,acid:0,bitter:0.5,booze:3,fruit:0,spice:8,fizz:0,body:3},
    note:'薄荷糖味。蚱蜢、白蜘蛛必需。和绿薄荷是同一个味道、只有颜色不同——配方点名哪个就用哪个，分层类的酒看的就是颜色。' },
  { id:'menthe_green', cat:'liqueur', name:'绿薄荷利口酒（Green Crème de Menthe）', unit:'ml', mlu:1, def:15, step:5, abv:24, src:'web',
    f:{sugar:9,acid:0,bitter:0.5,booze:3,fruit:0,spice:8,fizz:0,body:3},
    note:'和白薄荷同味不同色，负责绿色——分层和蚱蜢用它。' },
  { id:'cocoa_dark', cat:'liqueur', name:'黑可可利口酒（Dark Crème de Cacao）', unit:'ml', mlu:1, def:15, step:5, abv:24, src:'web',
    f:{sugar:9,acid:0,bitter:3,booze:3,fruit:1,spice:4,fizz:0,body:6},
    note:'巧克力的苦香，比白可可更有存在感。亚历山大、薄荷可可都用它。想要纯甜奶味就换白可可——两者的差别就是这点苦。' },
  { id:'banana_liqueur', cat:'liqueur', name:'香蕉利口酒（Crème de Banane）', unit:'ml', mlu:1, def:15, step:5, abv:24, src:'web',
    f:{sugar:9,acid:0.3,bitter:0,booze:3,fruit:8,spice:2,fizz:0,body:4},
    note:'香蕉船的味道，配朗姆和椰浆就是热带饮料。' },
  { id:'chartreuse_jaune', cat:'liqueur', name:'查特黄（Chartreuse Jaune）', unit:'ml', mlu:1, def:10, step:5, abv:40, src:'web',
    f:{sugar:8,acid:0.5,bitter:3,booze:5,fruit:3,spice:8,fizz:0,body:3.5},
    note:'绿查特的温和版：更甜、草药感稍轻、颜色金黄。同一家的配方，度数低一档（40 度），能顶绿查特，但整杯会软下来。' },
  { id:'dry_curacao', cat:'liqueur', name:'干库拉索（Dry Curaçao · 橙味）', unit:'ml', mlu:1, def:15, step:5, abv:40, src:'web',
    f:{sugar:5,acid:1,bitter:2,booze:5,fruit:8,spice:5,fizz:0,body:3},
    note:'不像蓝橙那么甜，是"真的用橙皮做的"橙味利口酒。玛格丽特的升级替换，最有名的是皮埃尔费朗（Pierre Ferrand）。和君度比：它没那么甜、橙皮味更直接。' },
  { id:'suze', cat:'liqueur', name:'苏姿（龙胆苦酒）', unit:'ml', mlu:1, def:15, step:5, abv:15, src:'web',
    f:{sugar:4,acid:1,bitter:9,booze:2,fruit:2,spice:5,fizz:0,body:2.5},
    note:'黄色的龙胆根苦酒，苦得很干净、不甜。白色尼格罗尼必需。' },
  { id:'punt_e_mes', cat:'liqueur', name:'潘脱蜜（苦味美思）', unit:'ml', mlu:1, def:20, step:5, abv:16, src:'web',
    f:{sugar:6,acid:2,bitter:6,booze:2,fruit:3,spice:6,fizz:0,body:3},
    note:'加了苦精的甜味美思，比普通味美思更有骨架，做尼格罗尼的变体很好用。' },
  { id:'averna', cat:'liqueur', name:'阿玛罗（阿维尔纳）', unit:'ml', mlu:1, def:20, step:5, abv:29, src:'web',
    f:{sugar:8,acid:0.5,bitter:7,booze:4,fruit:4,spice:6,fizz:0,body:4},
    note:'意大利苦味草药酒里最甜、最好入口的一支，加冰单喝也行。' },
  { id:'cynar', cat:'liqueur', name:'希娜（洋蓟苦酒）', unit:'ml', mlu:1, def:15, step:5, abv:16, src:'web',
    f:{sugar:5,acid:0.5,bitter:9,booze:2,fruit:2,spice:6,fizz:0,body:3},
    note:'朝鲜蓟做的苦酒，带一点蔬菜似的青味，苦得很长。' },
  { id:'nonino', cat:'liqueur', name:'诺尼诺（葡萄渣阿玛罗）', unit:'ml', mlu:1, def:15, step:5, abv:35, src:'web',
    f:{sugar:5,acid:0.5,bitter:6,booze:5,fruit:5,spice:6,fizz:0,body:3},
    note:'葡萄渣做的阿玛罗，果香明显、苦得温柔。纸飞机的四分之一。' },
  { id:'pimms', cat:'liqueur', name:'飘仙一号', unit:'ml', mlu:1, def:50, step:5, abv:25, src:'web',
    f:{sugar:7,acid:1.5,bitter:3,booze:3,fruit:6,spice:3,fizz:0,body:3},
    note:'英国人夏天的酒，本身已经调好味。加干姜水和黄瓜、薄荷、草莓就是一杯皮姆杯。' },
  { id:'orange_flower', cat:'liqueur', name:'橙花水', unit:'滴', mlu:0.05, def:3, step:1, abv:0, src:'web',
    f:{sugar:0,acid:0,bitter:0,booze:0,fruit:1,spice:5,fizz:0,body:0},
    note:'几滴就够，给甜点感的酒加花香（拉莫斯金菲士必需）。加多了像肥皂。' },
  { id:'olive_brine', cat:'liqueur', name:'橄榄汁（腌橄榄的盐水）', unit:'ml', mlu:1, def:15, step:5, abv:0, src:'rt',
    f:{sugar:0,acid:1,bitter:2,booze:0,fruit:0,spice:3,fizz:0,body:1},
    note:'就是腌橄榄罐里那点盐水，脏马天尼必需。5-15ml 就够咸，别多。' },
  /* 下面这些是照着 191 份参考配方补的：都是经典鸡尾酒里点到名、但库里原来没有的 */
  { id:'cocchi', cat:'liqueur', name:'好奇美国佬（Cocchi Americano）', unit:'ml', mlu:1, def:30, step:5, abv:16.5, src:'web',
    f:{sugar:5,acid:1.2,bitter:4,booze:2,fruit:5,spice:4,fizz:0,body:3},
    note:'意大利开胃酒，白葡萄酒底、带奎宁的微苦和橙花味，16.5 度。竹子、僵尸都点它的名。买不到用利莱白顶，味道更淡一点。开瓶后冷藏，2-4 周喝完。' },
  { id:'falernum', cat:'liqueur', name:'法勒纳姆 Falernum', unit:'ml', mlu:1, def:15, step:5, abv:11, src:'web',
    f:{sugar:8,acid:1,bitter:1,booze:2,fruit:3,spice:7,fizz:0,body:3},
    note:'加勒比的糖浆酒：丁香、杏仁、青柠。僵尸、玉米油这类热带酒要用。买不到可以自己泡——丁香+杏仁+糖+青柠皮丢进朗姆里放两周。' },
  { id:'picon', cat:'liqueur', name:'Amer Picon（橙皮苦酒）', unit:'ml', mlu:1, def:15, step:5, abv:18, src:'web',
    f:{sugar:5,acid:1,bitter:7,booze:3,fruit:3,spice:4,fizz:0,body:3},
    note:'法国橙皮苦酒，苦甜、带橙酱味。布鲁克林是它的代表作。买不到就用金巴利加一条橙皮的皮油顶，会更苦更红。' },
  { id:'montenegro', cat:'liqueur', name:'蒙特内罗 Amaro Montenegro', unit:'ml', mlu:1, def:30, step:5, abv:23, src:'web',
    f:{sugar:6,acid:0.5,bitter:6,booze:4,fruit:3,spice:6,fizz:0,body:4},
    note:'意大利阿马罗里最温和的一位，橙皮、玫瑰、香草都有，23 度。加苏打水和一条橙皮就是一杯；也能替诺尼诺。' },
  { id:'aveze', cat:'liqueur', name:'雅梵娜 Avèze（龙胆草）', unit:'ml', mlu:1, def:30, step:5, abv:20, src:'web',
    f:{sugar:4,acid:0.3,bitter:6,booze:3,fruit:1,spice:5,fizz:0,body:3},
    note:'法国龙胆草利口酒，苦、草本、带一点甜，像低度版的阿马罗。做苏姿、金巴利那一类清爽苦酒时能互换。' },
  { id:'soco', cat:'liqueur', name:'金馥 Southern Comfort', unit:'ml', mlu:1, def:30, step:5, abv:35, src:'rt',
    f:{sugar:7,acid:0.8,bitter:0.5,booze:5,fruit:5,spice:3,fizz:0,body:4},
    note:'美国南方的威士忌甜酒（桃子+香料），35 度。单兑可乐或柠檬水就能喝；各国版本度数不一样，以瓶身为准。' },
  { id:'fireball', cat:'liqueur', name:'火龙肉桂 Fireball', unit:'ml', mlu:1, def:30, step:5, abv:33, src:'rt',
    f:{sugar:8,acid:0.2,bitter:0.5,booze:6,fruit:1,spice:8,fizz:0,body:3},
    note:'肉桂威士忌利口酒，甜得像糖水但有 33 度。兑苹果汁、或者加进热苹果酒里，冬天一杯就够。' },
  { id:'mrblack', cat:'liqueur', name:'黑先生咖啡利口酒 Mr Black', unit:'ml', mlu:1, def:15, step:5, abv:34, src:'web',
    f:{sugar:5,acid:0.6,bitter:5,booze:5,fruit:1,spice:5,fizz:0,body:4},
    note:'比甘露度数高、糖更少、咖啡味更真，意式浓缩马天尼指定用它。国内网购能买到。' },
  { id:'grapefruit_liqueur', cat:'liqueur', name:'西柚利口酒', unit:'ml', mlu:1, def:15, step:5, abv:20, src:'web',
    f:{sugar:7,acid:1.5,bitter:2,booze:3,fruit:8,spice:1,fizz:0,body:3},
    note:'西柚味利口酒（Giffard 那类），酸甜偏苦。用西柚汁+一点糖浆也能顶，但香气回不来。' },
  /* 加强酒和葡萄酒：酒吧常用，但都怕氧化 */
  { id:'fino', cat:'wine', name:'干雪莉酒（Fino）', unit:'ml', mlu:1, def:60, step:5, abv:15, src:'web',
    f:{sugar:1,acid:3,bitter:3,booze:2,fruit:3,spice:5,fizz:0,body:3},
    note:'极干的雪莉酒，带坚果和一点咸味。阿多尼斯、竹鹤都用它。开瓶后必须冷藏，两周内喝完。' },
  { id:'port', cat:'wine', name:'波特酒', unit:'ml', mlu:1, def:45, step:5, abv:20, src:'web',
    f:{sugar:9,acid:2,bitter:3,booze:4,fruit:6,spice:3,fizz:0,body:5},
    note:'甜的红加强酒。代替红味美思用，风味更厚更甜。开瓶后冷藏，两三个月内喝完。' },
  { id:'red_wine', cat:'wine', name:'红葡萄酒', unit:'ml', mlu:1, def:90, step:5, abv:13, src:'rt',
    f:{sugar:1.5,acid:4,bitter:3,booze:3,fruit:6,spice:2,fizz:0,body:4},
    note:'做红酒调酒用（比如纽约酸上的那层红酒浮层）。开瓶后 2-3 天内用完。' },
  { id:'white_wine', cat:'wine', name:'白葡萄酒', unit:'ml', mlu:1, def:90, step:5, abv:12, src:'rt',
    f:{sugar:1.5,acid:5,bitter:1,booze:3,fruit:5,spice:1,fizz:0,body:2.5},
    note:'干白，做柯林斯和气泡类时能替一部分气泡酒。开瓶后 2-3 天内用完。' },

  /* ---------------- 酸味 ---------------- */
  { id:'lemon', cat:'sour', name:'鲜柠檬汁（现挤）', unit:'ml', mlu:1, def:20, step:5, abv:0, src:'rt', per:40, perName:'颗',
    f:{sugar:0.5,acid:9,bitter:0,booze:0,fruit:2,spice:0,fizz:0,body:0},
    note:'一杯酒的骨架。一颗柠檬大约出 40ml 汁，够做两杯威士忌酸。别挤一半留一半——切开的柠檬会氧化发苦，剩下的要么一次挤完，要么包好放阴凉处 2-3 天。' },
  { id:'lime', cat:'sour', name:'鲜青柠汁（现挤）', unit:'ml', mlu:1, def:15, step:5, abv:0, src:'rt', per:25, perName:'颗',
    f:{sugar:0.4,acid:10,bitter:0,booze:0,fruit:3,spice:5,fizz:0,body:0},
    note:'比柠檬更锋利、更香，适合有姜/薄荷/气泡的配方。一颗青柠约 25ml，正好一杯半到两杯。' },
  { id:'lemon_bottle', cat:'sour', name:'瓶装柠檬汁（如实/宝蓝吉）', unit:'ml', mlu:1, def:20, step:5, abv:0, src:'near',
    f:{sugar:0.6,acid:8,bitter:0,booze:0,fruit:1,spice:0,fizz:0,body:0},
    note:'应急方案。常温能放，但味道比鲜挤的闷，适合半夜想喝又懒得出门的时候。' },
  { id:'passionfruit', cat:'sour', name:'百香果', unit:'个', mlu:25, def:1, step:1, abv:0, src:'rt',
    f:{sugar:3,acid:8,bitter:0,booze:0,fruit:9,spice:6,fizz:0,body:1},
    note:'一个就够，籽和汁一起倒，香气极猛。' },
  { id:'sunquick', cat:'sour', name:'新的（Sunquick）浓缩柠檬汁', unit:'ml', mlu:1, def:15, step:5, abv:0, src:'web',
    f:{sugar:9.5,acid:3,bitter:0,booze:0,fruit:4,spice:1,fizz:0,body:1},
    concentrate:'1 份兑 4 份水才是柠檬汁', doseMax:25,
    note:'⚠️ 两个坑：一、它是浓缩液，不能直接喝（瓶身写 1 份兑 4 份水，所以 15ml 就够，别按柠檬汁的量倒）。二、它稀释后是柠檬水，甜是主导、酸其实不够——想喝到酸还是得加真柠檬。用它就把糖浆减掉。优点是常温能放几个月。' },

  /* ---------------- 甜味 ---------------- */
  { id:'syrup', cat:'sweet', name:'白糖浆（1:1 自制）', unit:'ml', mlu:1, def:15, step:5, abv:0, src:'rt',
    f:{sugar:9,acid:0,bitter:0,booze:0,fruit:0,spice:0,fizz:0,body:1},
    note:'白糖+等量热水搅到化开，装瓶常温能放两三周。比直接放糖化得开。' },
  { id:'honey_syrup', cat:'sweet', name:'蜂蜜糖浆（1:1）', unit:'ml', mlu:1, def:15, step:5, abv:0, src:'rt',
    f:{sugar:9,acid:0,bitter:0,booze:0,fruit:0,spice:4,fizz:0,body:3},
    note:'做青霉素、热托蒂的灵魂。纯蜂蜜太稠，兑一半热水就好用了。' },
  { id:'honey', cat:'sweet', name:'蜂蜜（直接舀）', unit:'ml', mlu:1, def:10, step:5, abv:0, src:'rt',
    f:{sugar:9,acid:0,bitter:0,booze:0,fruit:0,spice:4,fizz:0,body:4},
    note:'热水类饮品可以直接用。' },
  { id:'demerara', cat:'sweet', name:'红糖糖浆', unit:'ml', mlu:1, def:15, step:5, abv:0, src:'rt',
    f:{sugar:9,acid:0,bitter:0,booze:0,fruit:0,spice:3,fizz:0,body:4},
    note:'比白糖浆多一层焦糖和糖蜜，配威士忌、咖啡特别好。' },
  { id:'maple', cat:'sweet', name:'枫糖浆', unit:'ml', mlu:1, def:15, step:5, abv:0, src:'rt',
    f:{sugar:9,acid:0,bitter:0,booze:0,fruit:0,spice:5,fizz:0,body:4},
    note:'超市的进口区有，木质甜香和威士忌是天生一对。' },
  { id:'grenadine', cat:'sweet', name:'红石榴糖浆', unit:'ml', mlu:1, def:15, step:5, abv:0, src:'web',
    f:{sugar:9,acid:1,bitter:0,booze:0,fruit:6,spice:1,fizz:0,body:2},
    note:'很多经典配方里的「1 把勺」就是它（约 5ml）。主要是颜色和果香，放多了整杯会腻。' },
  { id:'monin', cat:'sweet', name:'莫林风味糖浆（网购）', unit:'ml', mlu:1, def:15, step:5, abv:0, src:'web',
    f:{sugar:9,acid:0,bitter:0,booze:0,fruit:2,spice:2,fizz:0,body:1},
    note:'未开封常温 2-3 年（看瓶身）。开瓶后阴凉避光，纯糖浆放半年到一年没问题，果味型建议 3-6 个月用完。买 250ml 小瓶比 700ml 实际。' },
  { id:'lemon_sherbet', cat:'sweet', name:'柠檬糖浆（整颗柠檬挤完+等量糖）', unit:'ml', mlu:1, def:20, step:5, abv:0, src:'rt',
    f:{sugar:7,acid:5,bitter:0,booze:0,fruit:3,spice:0,fizz:0,body:1},
    note:'解决「半颗柠檬怎么办」：整颗一次挤完，汁加等量白糖搅到化开，常温能放 2-3 周。30ml 就顶掉「20ml 柠檬汁 + 15ml 糖浆」。' },
  { id:'oleo', cat:'sweet', name:'糖渍柠檬皮（皮油糖浆）', unit:'ml', mlu:1, def:15, step:5, abv:0, src:'rt',
    f:{sugar:8,acid:0.5,bitter:0.5,booze:0,fruit:5,spice:7,fizz:0,body:1},
    note:'把本来要扔的柠檬皮切条拌白糖，腌 6-12 小时，糖会把皮里的香油逼出来。滤掉皮就是香气最浓的糖浆，常温能放一个月。' },
  { id:'sugar_cube', cat:'sweet', name:'方糖 / 白砂糖', unit:'块', mlu:0, def:1, step:1, abv:0, src:'rt',
    f:{sugar:7,acid:0,bitter:0,booze:0,fruit:0,spice:0,fizz:0,body:0},
    note:'配几滴水慢慢压碎，就是古典最原始的做法。' },
  { id:'coke', cat:'mixer', name:'可乐', unit:'ml', mlu:1, def:90, step:5, abv:0, src:'near',
    f:{sugar:9,acid:2,bitter:0,booze:0,fruit:0,spice:2,fizz:5,body:1},
    note:'不要买无糖的，代糖在酒里会发苦。' },
  { id:'sprite', cat:'mixer', name:'雪碧', unit:'ml', mlu:1, def:90, step:5, abv:0, src:'near',
    f:{sugar:8,acid:2,bitter:0,booze:0,fruit:1,spice:0,fizz:7,body:0},
    note:'酸甜都有，配烧酒是韩式喝法。' },
  { id:'vitale', cat:'teacoffee', name:'维他柠檬茶', unit:'ml', mlu:1, def:90, step:5, abv:0, src:'near',
    f:{sugar:8,acid:4,bitter:0.5,booze:0,fruit:3,spice:0,fizz:0,body:2},
    note:'中国便利店调酒的万金油。它本身已经酸甜平衡，加威士忌直接成立。' },
  { id:'genki', cat:'mixer', name:'元气森林白桃气泡水', unit:'ml', mlu:1, def:90, step:5, abv:0, src:'near',
    f:{sugar:3,acid:0.5,bitter:0,booze:0,fruit:4,spice:0,fizz:7,body:0},
    note:'低糖，适合做「不甜但有味」的长饮。' },

  /* ---------------- 果汁 ---------------- */
  { id:'orange_juice', cat:'juice', name:'橙汁', unit:'ml', mlu:1, def:60, step:5, abv:0, src:'near',
    f:{sugar:5,acid:4,bitter:0,booze:0,fruit:8,spice:0,fizz:0,body:2},
    note:'冷柜里的 NFC 橙汁最好（味全每日C、农夫山泉 NFC 都稳），常温利乐包也能用。加里波利、螺丝刀这类全靠它，所以别用含糖量太高的果汁饮料。' },
  { id:'grapefruit', cat:'juice', name:'西柚汁', unit:'ml', mlu:1, def:60, step:5, abv:0, src:'rt',
    f:{sugar:3,acid:6,bitter:4,booze:0,fruit:8,spice:0,fizz:0,body:2},
    note:'自带一点苦味，是成年人会喜欢的果汁。' },
  { id:'pineapple', cat:'juice', name:'菠萝汁', unit:'ml', mlu:1, def:60, step:5, abv:0, src:'rt',
    f:{sugar:6,acid:5,bitter:0,booze:0,fruit:8,spice:0,fizz:0,body:2},
    note:'泡沫丰富，摇起来口感很好。' },
  { id:'cranberry', cat:'juice', name:'蔓越莓汁', unit:'ml', mlu:1, def:60, step:5, abv:0, src:'rt',
    f:{sugar:5,acid:6,bitter:0.5,booze:0,fruit:7,spice:0,fizz:0,body:2},
    note:'颜色好看，酸度高，适合配伏特加或朗姆。' },
  { id:'tomato', cat:'juice', name:'番茄汁', unit:'ml', mlu:1, def:90, step:5, abv:0, src:'rt',
    f:{sugar:2,acid:3,bitter:0,booze:0,fruit:4,spice:2,fizz:0,body:5},
    note:'做血腥玛丽类，需要黑胡椒和盐。' },
  { id:'coconut_water', cat:'juice', name:'椰子水', unit:'ml', mlu:1, def:90, step:5, abv:0, src:'near',
    f:{sugar:3,acid:1,bitter:0,booze:0,fruit:4,spice:0,fizz:0,body:2},
    note:'轻微咸甜，稀释烈酒很舒服。' },
  { id:'apple_juice', cat:'juice', name:'苹果汁', unit:'ml', mlu:1, def:90, step:5, abv:0, src:'near',
    f:{sugar:7,acid:3,bitter:0,booze:0,fruit:7,spice:0,fizz:0,body:2},
    note:'便利店最不缺的一种果汁（味全每日C、农夫山泉 NFC、各家自有品牌都有）。甜度温和、酸度低，是"什么酒都能配"的保险牌。' },
  { id:'grape_juice', cat:'juice', name:'葡萄汁', unit:'ml', mlu:1, def:90, step:5, abv:0, src:'near',
    f:{sugar:9,acid:3,bitter:0.5,booze:0,fruit:8,spice:0,fizz:0,body:3},
    note:'甜度高、颜色深，配白兰地或朗姆做出来很像红酒调酒。用了它就要少放甚至不放糖浆。' },
  { id:'mango_mix', cat:'juice', name:'芒果混合汁', unit:'ml', mlu:1, def:90, step:5, abv:0, src:'near',
    f:{sugar:8,acid:2.5,bitter:0,booze:0,fruit:9,spice:0,fizz:0,body:4},
    note:'农夫山泉 NFC 的芒果混合是最容易买到的热带果汁，浓稠、甜香重。配朗姆、椰浆或者一整个青柠都很搭。' },
  { id:'shuirongc', cat:'juice', name:'水溶C100（柠檬味）', unit:'ml', mlu:1, def:90, step:5, abv:0, src:'near',
    f:{sugar:7,acid:6,bitter:0.5,booze:0,fruit:4,spice:0,fizz:0,body:1},
    note:'10% 果汁的维 C 饮料，又酸又甜，是"懒得挤柠檬"时最常用的替代。四个口味里最酸、最通用的一支，不知道选哪个就选它。' },
  { id:'shuirongc_yuzu', cat:'juice', name:'水溶C100（柚子味）', unit:'ml', mlu:1, def:90, step:5, abv:0, src:'near',
    f:{sugar:7,acid:5.5,bitter:3,booze:0,fruit:5,spice:0,fizz:0,body:1},
    note:'和柠檬味最大的区别是那点微苦。配金酒、汤力水那一挂特别合，比柠檬味更"成年"——想让它更苦就更像西柚汁。' },
  { id:'shuirongc_orange', cat:'juice', name:'水溶C100（柑橘味）', unit:'ml', mlu:1, def:90, step:5, abv:0, src:'near',
    f:{sugar:8.5,acid:4,bitter:0.5,booze:0,fruit:6.5,spice:0,fizz:0,body:1},
    note:'三个口味里最甜、最不酸的，橙子香更明显。用它的时候糖浆要更少，甚至可以完全不放。' },
  { id:'shuirongc_kiwi', cat:'juice', name:'水溶C100（猕猴桃味）', unit:'ml', mlu:1, def:90, step:5, abv:0, src:'near',
    f:{sugar:6.5,acid:6.5,bitter:0.5,booze:0,fruit:5,spice:0,fizz:0,body:1.5},
    note:'最酸的一支，还带一点青草样的果香。想给金酒或伏特加加"绿色"的时候用它，比柠檬味更有个性。' },

  /* ---------------- 气泡 · 饮料 ---------------- */
  { id:'soda', cat:'mixer', name:'苏打水', unit:'ml', mlu:1, def:90, step:5, abv:0, src:'near',
    f:{sugar:0,acid:0,bitter:0,booze:0,fruit:0,spice:0,fizz:9,body:0},
    note:'高球的命根子。买含气量高的，屈臣氏、巴黎水都行。' },
{ id:'tonic', cat:'mixer', name:'汤力水', unit:'ml', mlu:1, def:90, step:5, abv:0, src:'near',
    f:{sugar:4,acid:0.5,bitter:4,booze:0,fruit:0,spice:0,fizz:8,body:0},
    note:'有奎宁的微苦，配金酒是经典，配威士忌也不错。' },
  { id:'grapefruit_soda', cat:'mixer', name:'西柚气泡水', unit:'ml', mlu:1, def:90, step:5, abv:0, src:'rt',
    f:{sugar:5,acid:4,bitter:3,booze:0,fruit:6,spice:0,fizz:7,body:0},
    note:'一瓶同时给气泡和西柚味——白鸽（Paloma）要的就是它。买不到就用西柚汁 45ml + 苏打水 45ml 自己兑（参考配方本身也是这么写的）。' },
  { id:'ginger_ale', cat:'mixer', name:'干姜汽水（屈臣氏）', unit:'ml', mlu:1, def:90, step:5, abv:0, src:'rt',
    f:{sugar:6,acid:0.5,bitter:0,booze:0,fruit:0,spice:6,fizz:7,body:0},
    note:'甜辣姜味，威士忌+它就是一杯随手可得的骡子。' },
  { id:'ginger_beer', cat:'mixer', name:'姜汁啤酒（Fever-Tree）', unit:'ml', mlu:1, def:90, step:5, abv:0, src:'web',
    f:{sugar:4,acid:0.5,bitter:0,booze:0,fruit:0,spice:7,fizz:7,body:0},
    note:'没酒精的啤酒，姜味强烈，比干姜汽水高级一档。' },
  { id:'oolong', cat:'teacoffee', name:'三得利乌龙茶', unit:'ml', mlu:1, def:90, step:5, abv:0, src:'near',
    f:{sugar:0,acid:0.5,bitter:3,booze:0,fruit:0,spice:2,fizz:0,body:3},
    note:'零糖。威士忌+乌龙是日式喝法，非常耐喝，很适合住处。' },
  { id:'jasmine_tea', cat:'teacoffee', name:'茉莉花茶', unit:'ml', mlu:1, def:90, step:5, abv:0, src:'near',
    f:{sugar:0,acid:0.5,bitter:1,booze:0,fruit:0,spice:3,fizz:0,body:2},
    note:'花香会跟威士忌的蜂蜜味接上。' },
  { id:'iced_tea', cat:'teacoffee', name:'冰红茶', unit:'ml', mlu:1, def:90, step:5, abv:0, src:'near',
    f:{sugar:7,acid:1,bitter:2,booze:0,fruit:1,spice:0,fizz:0,body:1},
    note:'甜度高，用了它就少放糖浆。' },
  { id:'coffee_hot', cat:'teacoffee', name:'挂耳咖啡（热）', unit:'ml', mlu:1, def:120, step:5, abv:0, src:'rt',
    f:{sugar:0,acid:1,bitter:7,booze:0,fruit:0,spice:6,fizz:0,body:4},
    note:'现冲的比速溶香太多，热饮不需要冰。' },
  { id:'cold_brew', cat:'teacoffee', name:'冷萃咖啡', unit:'ml', mlu:1, def:90, step:5, abv:0, src:'near',
    f:{sugar:0,acid:1,bitter:6,booze:0,fruit:0,spice:6,fizz:0,body:4},
    note:'便利店冷柜通常有，苦味柔和，配威士忌和糖浆很顺。' },
  { id:'dongfangshuye', cat:'teacoffee', name:'东方树叶（无糖茶）', unit:'ml', mlu:1, def:90, step:5, abv:0, src:'near',
    f:{sugar:0,acid:0.5,bitter:3,booze:0,fruit:0,spice:3,fizz:0,body:2.5},
    note:'国内最普及的零糖瓶装茶：乌龙、茉莉、青柑普洱都有。零糖意味着不抢味，是把酒"拉长"最干净的选择。' },
  { id:'wanglaoji', cat:'teacoffee', name:'王老吉（凉茶）', unit:'ml', mlu:1, def:90, step:5, abv:0, src:'near',
    f:{sugar:8,acid:0.5,bitter:2.5,booze:0,fruit:1,spice:4,fizz:0,body:2},
    note:'甜度很高、带草本苦味。配威士忌或朗姆会变成很"中式"的一杯，但用了它就要把糖浆减掉。' },
  { id:'milk', cat:'dairy', name:'牛奶', unit:'ml', mlu:1, def:60, step:5, abv:0, src:'near',
    f:{sugar:3,acid:0,bitter:0,booze:0,fruit:0,spice:0,fizz:0,body:8},
    note:'遇酸会翻滚结块，配方里最好别同时加柠檬。' },
  { id:'yakult', cat:'dairy', name:'养乐多（乳酸菌饮料）', unit:'瓶', mlu:100, def:1, step:1, abv:0, src:'near',
    f:{sugar:7,acid:4,bitter:0,booze:0,fruit:3,spice:0,fizz:0,body:5},
    note:'一瓶 100ml。又酸又甜，还带乳酸菌的醇厚感——加烧酒就是韩国便利店的喝法，加伏特加和苏打水也很好喝。它本身已经平衡，不用再加糖浆。' },
  { id:'calpis', cat:'dairy', name:'可尔必思（Calpis）', unit:'ml', mlu:1, def:60, step:5, abv:0, src:'near',
    f:{sugar:7,acid:4,bitter:0,booze:0,fruit:2,spice:0,fizz:0,body:4},
    note:'日式乳酸菌饮料，比养乐多更清爽、更酸一点。配烧酒和苏打水就是居酒屋里最常见的沙瓦（Sour）。' },
  { id:'yogurt', cat:'dairy', name:'原味酸奶', unit:'ml', mlu:1, def:100, step:5, abv:0, src:'near',
    f:{sugar:5,acid:3,bitter:0,booze:0,fruit:1,spice:0,fizz:0,body:8},
    note:'乳脂感最强，做奶味调酒用。加酸会分离，要先把酸奶和酒搅匀再考虑加果汁。' },
  { id:'cream', cat:'dairy', name:'淡奶油', unit:'ml', mlu:1, def:20, step:5, abv:0, src:'rt',
    f:{sugar:3,acid:0,bitter:0,booze:0,fruit:0,spice:0,fizz:0,body:10},
    note:'沿勺背浮在表层，一口奶一口酒。' },
  { id:'butter', cat:'dairy', name:'黄油（一小块）', unit:'g', mlu:1, def:15, step:5, abv:0, src:'rt',
    f:{sugar:0,acid:0,bitter:0,booze:0,fruit:0,spice:0,fizz:0,body:10},
    note:'热黄油朗姆的灵魂。切一小块丢进热酒里搅到化开，甜香立刻起来。住处买最小块、冷藏，用不完抹面包。' },
  { id:'coconut_milk', cat:'dairy', name:'椰浆', unit:'ml', mlu:1, def:30, step:5, abv:0, src:'rt',
    f:{sugar:4,acid:0,bitter:0,booze:0,fruit:3,spice:0,fizz:0,body:9},
    note:'很浓郁，容易腻，需要一点酸或盐来救。' },
  { id:'redbull', cat:'mixer', name:'红牛（金罐 · 不含气）', unit:'ml', mlu:1, def:90, step:5, abv:0, src:'near',
    f:{sugar:7,acid:1,bitter:0,booze:0,fruit:0,spice:3,fizz:0,body:1},
    note:'提神，但别空腹喝。注意版本：中国金罐（红牛维生素功能饮料）跟泰国版一样**不含气**；奥地利进口那款「红牛牌劲能饮料」是充气的。这里按金罐算，所以它不给气泡分——想要带气的那种就买进口罐，或者兑点苏打水。' },
  { id:'sparkling_wine', cat:'mixer', name:'气泡酒 / 香槟', unit:'ml', mlu:1, def:90, step:5, abv:12, src:'web',
    f:{sugar:2,acid:5,bitter:0.5,booze:1,fruit:5,spice:1,fizz:7,body:2},
    note:'便宜的气泡酒做调酒完全够用，别买贵的。开瓶后当天喝完。' },
  { id:'schweppes_c', cat:'mixer', name:'怡泉 +C（柠檬汽水）', unit:'ml', mlu:1, def:90, step:5, abv:0, src:'rt',
    f:{sugar:6,acid:5,bitter:0,booze:0,fruit:3,spice:0,fizz:6,body:0},
    note:'一瓶同时给气泡和酸味，还自带柠檬香——做长饮可以省掉一半柠檬。糖度不低，所以糖浆要减掉。' },
  { id:'fanta', cat:'mixer', name:'芬达（橙味汽水）', unit:'ml', mlu:1, def:90, step:5, abv:0, src:'near',
    f:{sugar:9,acid:3,bitter:0,booze:0,fruit:5,spice:0,fizz:5,body:1},
    note:'比鲜橙汁甜得多，颜色也假。但配伏特加、朗姆这类中性基酒很讨喜，是很多人的第一杯调酒。' },
  { id:'beibingyang', cat:'mixer', name:'北冰洋（橘子汽水）', unit:'ml', mlu:1, def:90, step:5, abv:0, src:'rt',
    f:{sugar:8,acid:3,bitter:0.5,booze:0,fruit:5,spice:0,fizz:7,body:1},
    note:'北京人的橘子汽水，气足、橘子味真。配金酒或伏特加，比芬达高级一档。' },
  { id:'sparkling_mineral', cat:'mixer', name:'气泡矿泉水（巴黎水 / 圣培露）', unit:'ml', mlu:1, def:90, step:5, abv:0, src:'rt',
    f:{sugar:0,acid:0,bitter:1,booze:0,fruit:0,spice:0,fizz:9,body:0},
    note:'无糖，气泡很细。圣培露带一点矿物咸味，配威士忌比普通苏打水更有层次。' },
  { id:'hot_water', cat:'dairy', name:'热水', unit:'ml', mlu:1, def:60, step:5, abv:0, src:'rt',
    f:{sugar:0,acid:0,bitter:0,booze:0,fruit:0,spice:0,fizz:0,body:0},
    note:'冬天不靠冰箱也能喝上酒的关键。降度数、开香气。' },
  { id:'vitasoy', cat:'dairy', name:'维他奶（豆奶）', unit:'ml', mlu:1, def:90, step:5, abv:0, src:'near',
    f:{sugar:5,acid:0,bitter:0,booze:0,fruit:0,spice:0,fizz:0,body:7},
    note:'豆香比牛奶更"中式"，和威士忌、朗姆都搭。含奶，碰到柠檬会结块。' },
  { id:'coconut_drink', cat:'dairy', name:'椰树牌椰汁', unit:'ml', mlu:1, def:90, step:5, abv:0, src:'rt',
    f:{sugar:6,acid:0,bitter:0,booze:0,fruit:3,spice:0,fizz:0,body:8},
    note:'比椰浆稀、更甜，本身已经调好味。做热带饮料比椰浆省事，不用再兑水。' },
  { id:'wangzai', cat:'dairy', name:'旺仔牛奶', unit:'ml', mlu:1, def:90, step:5, abv:0, src:'near',
    f:{sugar:9,acid:0,bitter:0,booze:0,fruit:0,spice:1,fizz:0,body:7},
    note:'炼乳风味的甜，一杯顶半杯糖浆。配咖啡或百利甜就是甜品级的酒，别再额外加糖。' },

  /* ---------------- 苦精 · 香料 ---------------- */
  { id:'angostura', cat:'bitter', name:'安高天娜苦精', unit:'滴', mlu:0.3, def:2, step:1, abv:44, src:'web',
    f:{sugar:0.5,acid:0,bitter:9,booze:0.6,fruit:0,spice:8,fizz:0,body:0},
    note:'一瓶能用三年。两滴就能让一杯普通的酒出现「层次」，性价比最高的一件东西。它是"芳香苦精"（Angostura），别和橙味苦精（Regan\'s No.6 那类）混——一个给骨架，一个给橙香。' },
  { id:'orange_bitters', cat:'bitter', name:'橙味苦精', unit:'滴', mlu:0.3, def:2, step:1, abv:28, src:'web',
    f:{sugar:0.5,acid:0,bitter:7,booze:0.3,fruit:7,spice:7,fizz:0,body:0},
    note:'橙香版苦精，配威士忌比安高天娜更柔。最常见的是 Regan\'s No.6，安高天娜橙味那支也行。它不能顶安高天娜——配方写"苦精"时默认指安高天娜。' },
  { id:'peychaud', cat:'bitter', name:'佩乔苦精（Peychaud）', unit:'滴', mlu:0.3, def:2, step:1, abv:35, src:'web',
    f:{sugar:1,acid:0,bitter:8,booze:0.4,fruit:6,spice:8,fizz:0,body:0},
    note:'红色，带茴香和樱桃香。萨泽拉克的指定苦精。' },
  { id:'cinnamon_stick', cat:'bitter', name:'肉桂棒', unit:'根', mlu:0, def:1, step:1, abv:0, src:'rt',
    f:{sugar:1,acid:0,bitter:1,booze:0,fruit:0,spice:8,fizz:0,body:0},
    note:'热饮里丢一根，香气会飘整间住处。也可以用来搅。' },
  { id:'clove', cat:'bitter', name:'丁香', unit:'粒', mlu:0, def:2, step:1, abv:0, src:'rt',
    f:{sugar:0,acid:0,bitter:3,booze:0,fruit:0,spice:9,fizz:0,body:0},
    note:'两粒就够，多了会盖住一切。可以插在柠檬皮上做装饰。' },
  { id:'star_anise', cat:'bitter', name:'八角', unit:'个', mlu:0, def:1, step:1, abv:0, src:'rt',
    f:{sugar:0,acid:0,bitter:2,booze:0,fruit:0,spice:8,fizz:0,body:0},
    note:'八角+橙皮+威士忌，是很有中国味的组合。' },
  { id:'cardamom', cat:'bitter', name:'豆蔻（1 小撮）', unit:'小撮', mlu:0, def:1, step:1, abv:0, src:'rt',
    f:{sugar:0,acid:0,bitter:1,booze:0,fruit:0,spice:7,fizz:0,body:0},
    note:'一点点就够，暖香型。' },
  { id:'ginger_fresh', cat:'bitter', name:'生姜（3 片）', unit:'片', mlu:0, def:3, step:1, abv:0, src:'rt',
    f:{sugar:0.5,acid:0,bitter:0,booze:0,fruit:0,spice:8,fizz:0,body:0},
    note:'用勺背在杯里压几下再摇，姜的辣会很明显。一块姜能用很久。' },
  { id:'black_pepper', cat:'bitter', name:'黑胡椒（1 小撮）', unit:'小撮', mlu:0, def:1, step:1, abv:0, src:'rt',
    f:{sugar:0,acid:0,bitter:2,booze:0,fruit:0,spice:7,fizz:0,body:0},
    note:'番茄汁类必备，也让姜味更立体。' },
  { id:'tabasco', cat:'bitter', name:'辣椒仔', unit:'滴', mlu:0.05, def:2, step:1, abv:0, src:'rt',
    f:{sugar:0.2,acid:2,bitter:1,booze:0,fruit:0,spice:9,fizz:0,body:0},
    note:'血腥玛丽类用，两三滴就有明显的辣。' },
  { id:'worcestershire', cat:'bitter', name:'李派林喼汁（辣酱油）', unit:'滴', mlu:0.05, def:3, step:1, abv:0, src:'rt',
    f:{sugar:1,acid:2,bitter:1.5,booze:0,fruit:0,spice:4,fizz:0,body:1},
    note:'英式辣酱油，血腥玛丽的灵魂——没有它那杯就只是番茄汁。常温能放很久，一瓶用一年，住处请放心囤。' },
  { id:'salt_water', cat:'bitter', name:'盐水（几滴）', unit:'滴', mlu:0.05, def:3, step:1, abv:0, src:'rt',
    f:{sugar:0,acid:0,bitter:1,booze:0,fruit:0,spice:2,fizz:0,body:0},
    note:'1 克盐 + 9 毫升水。三滴就能把酸和果味「顶」出来，喝的人会以为你换了配方。' },

  /* ---------------- 点缀 · 口感 ---------------- */
  { id:'lemon_peel', cat:'garnish', name:'柠檬皮 / 柠檬片', unit:'片', mlu:0, def:1, step:1, abv:0, src:'rt',
    f:{sugar:0,acid:0.3,bitter:0,booze:0,fruit:5,spice:6,fizz:0,body:0},
    note:'在杯口上方拧一下，把皮油喷出来，再丢进去。不用它等于浪费了 10 分。' },
  { id:'orange_peel', cat:'garnish', name:'橙皮 / 橙片', unit:'片', mlu:0, def:1, step:1, abv:0, src:'rt',
    f:{sugar:0,acid:0,bitter:0,booze:0,fruit:6,spice:6,fizz:0,body:0},
    note:'和威士忌最配的香气。古典的橙皮不要省。' },
  { id:'mint', cat:'fresh', name:'薄荷叶（8 片）', unit:'片', mlu:0, def:8, step:2, abv:0, src:'rt',
    f:{sugar:0,acid:0,bitter:1,booze:0,fruit:1,spice:7,fizz:0,body:0},
    note:'轻轻拍一下再放，不要捣碎，碎了会出草腥味。' },
  { id:'rosemary', cat:'garnish', name:'迷迭香', unit:'枝', mlu:0, def:1, step:1, abv:0, src:'rt',
    f:{sugar:0,acid:0,bitter:1,booze:0,fruit:0,spice:8,fizz:0,body:0},
    note:'松针香气，配酸味和威士忌很好看也很好闻。' },
  { id:'cucumber', cat:'fresh', name:'黄瓜片', unit:'片', mlu:0, def:3, step:1, abv:0, src:'rt',
    f:{sugar:0,acid:0,bitter:0,booze:0,fruit:1,spice:3,fizz:0,body:0},
    note:'清爽路线，配金酒或气泡水。' },
  { id:'cherry', cat:'garnish', name:'糖渍樱桃', unit:'颗', mlu:0, def:1, step:1, abv:0, src:'rt',
    f:{sugar:5,acid:1,bitter:0,booze:0,fruit:6,spice:0,fizz:0,body:0},
    note:'丢一颗进去，视觉和甜味都有了。' },
  { id:'egg_white', cat:'fresh', name:'蛋清', unit:'ml', mlu:1, def:15, step:5, abv:0, src:'rt',
    f:{sugar:0,acid:0,bitter:0,booze:0,fruit:0,spice:0,fizz:0,body:9},
    note:'先干摇 15 秒再加冰摇，泡沫才立得起来。鸡蛋就够用了。' },
  { id:'egg_yolk', cat:'fresh', name:'蛋黄', unit:'ml', mlu:1, def:15, step:5, abv:0, src:'rt',
    f:{sugar:0,acid:0,bitter:0,booze:0,fruit:0,spice:0,fizz:0,body:10},
    note:'蛋清给泡沫，蛋黄给厚度和奶香（Flip 类酒）。用了蛋黄那杯不用再加奶；剩下的蛋清可以做蛋白霜。' },
  { id:'raspberry', cat:'garnish', name:'树莓（鲜果）', unit:'颗', mlu:0, def:3, step:1, abv:0, src:'web',
    f:{sugar:3,acid:3,bitter:0,booze:0,fruit:7,spice:0,fizz:0,body:1},
    note:'三叶草俱乐部这类酒要几颗捣碎。鲜树莓不好买也容易坏——用现成的树莓糖浆代替更实际。' },
  { id:'green_grape', cat:'garnish', name:'青提（5 颗）', unit:'颗', mlu:0, def:5, step:1, abv:0, src:'rt',
    f:{sugar:3,acid:1,bitter:0,booze:0,fruit:6,spice:0,fizz:0,body:1},
    note:'恩佐尼里要捣碎的绿葡萄。买一小串，用不完当水果吃；捣轻一点，葡萄皮会发苦。' },

    /* 冰不再是材料：它由你选的杯子决定——
       冰杯 / 高球杯 / 古典杯 / 飓风杯自带冰，马天尼杯和一口杯没有。
       每只杯子还有一个"冰化开会加多少水"的估计值（melt）。 */
];

/* =========================================================
   经典配方（点一下直接装杯）
   ========================================================= */
var PRESETS = [
  { name:'威士忌高球', family:'highball', glass:'highball', sub:'Whisky Highball · 最该先做的一杯', items:[['kakubin',45],['soda',120],['lemon_peel',1]],
    tip:'全世界通用的一杯：先放冰，倒威士忌，再沿杯壁慢慢倒苏打水，只用勺子提两下。这里用的是日式高球标配的角瓶，换成波本、苏格兰调和，或者任何你手上的威士忌都成立，风味各不相同。' },
  { name:'威士忌酸', family:'sour', glass:'rocks', sub:'Whisky Sour · 平衡的教科书', items:[['bourbon',45],['lemon',20],['syrup',15],['egg_white',15],['angostura',2],['salt_water',3]],
    tip:'没有摇酒器就用保温杯：先不加冰摇 15 秒，再加冰摇 15 秒，泡沫会漂亮很多。最后 3 滴盐水是专业配方里容易被忽略的一步，它会让酸和果味都往前站。' },
  { name:'古典', family:'spirit', glass:'rocks', sub:'Old Fashioned · 只放糖和苦精', items:[['bourbon',60],['syrup',7.5],['angostura',2],['orange_peel',1]],
    tip:'冰要够大，摇匀后静置一分钟再喝，前半杯和后半杯味道会不一样。' },
  { name:'维他柠檬茶微醺', family:'highball', glass:'icecup', sub:'便利店特调 · 楼下就能买齐', items:[['bourbon',30],['vitale',100],['lemon',5]],
    tip:'维他柠檬茶本身很甜，加 5ml 鲜柠檬就已经很平衡。这个比例适合边看剧边喝。' },
  { name:'威士忌乌龙', family:'highball', glass:'icecup', sub:'Mizuwari 的便利店版', items:[['kakubin',40],['oolong',110]],
    tip:'零糖、不腻、不上头，是最耐喝的组合。茶要冰镇过的，不然会散掉气泡感。' },
  { name:'姜味骡子', family:'highball', glass:'highball', sub:'Whisky Mule', items:[['bourbon',45],['ginger_ale',100],['lime',10]],
    tip:'青柠一定要现挤。姜的辣和青柠的酸是互相放大的。' },
  { name:'热托蒂', family:'hot', glass:'mug', sub:'Hot Toddy · 不用冰，冬天必备', items:[['jw_black',45],['hot_water',90],['honey',15],['lemon',15],['clove',2],['cinnamon_stick',1]],
    tip:'水温别超过 80 度，太烫会把酒精的香气蒸没。先放蜂蜜再倒热水更好化开。' },
  { name:'青霉素', family:'sour', glass:'rocks', sub:'Penicillin · 感冒时最想喝的一杯', items:[['jw_black',45],['laphroaig',10],['lemon',20],['honey_syrup',20],['ginger_fresh',2]],
    tip:'那 10ml 拉弗格不能省：这杯的灵魂就是最后浮上来的那层泥煤味，拿基底酒顶就不是青霉素了。生姜在杯里压几下。蜂蜜糖浆用 3:1 更接近原版。' },
  { name:'锈钉', family:'spirit', glass:'rocks', sub:'Rusty Nail · 两样东西就成立', items:[['jw_black',45],['drambuie',20]],
    tip:'蜂蜜香草利口酒 + 威士忌，几乎是作弊的简单。适合冬天。' },
  { name:'教父', family:'spirit', glass:'rocks', sub:'Godfather', items:[['jw_black',45],['disaronno',20]],
    tip:'杏仁香和威士忌的麦芽香会合在一起，慢慢喝。' },
  { name:'爱尔兰咖啡', family:'hot', glass:'mug', sub:'Irish Coffee · 热着喝', items:[['jameson',40],['coffee_hot',120],['demerara',15],['cream',30]],
    tip:'就得用爱尔兰威士忌——苏格兰的泥煤味会跟咖啡打架。奶油沿勺背浮在最上层，别搅；第一口穿过奶油喝到酒，是它的全部意义。' },
  { name:'罗伯罗伊', family:'spirit', glass:'coupe', sub:'Rob Roy · 苏格兰版的曼哈顿', items:[['jw_black',60],['vermouth',20],['angostura',2],['cherry',1]],
    tip:'味美思开瓶就要尽快用完，没冰箱的话这一杯要趁新鲜。' },
  { name:'血与沙', family:'sour', glass:'coupe', sub:'Blood & Sand · 四样等量好记', items:[['jw_black',25],['cherry_brandy',20],['vermouth',20],['orange_juice',20]],
    tip:'经典版本就是 20/20/20/20，威士忌可以稍多。橙汁建议现榨，瓶装的太甜。' },
  { name:'花花公子', family:'spirit', glass:'rocks', sub:'Boulevardier · 三等份，最好记', items:[['bourbon',30],['vermouth',30],['campari',30]],
    tip:'尼格罗尼的威士忌版，三样各 30ml。苦味重，适合慢慢喝。换成更清瘦的苏格兰调和，橙皮香会更突出。' },
  { name:'淘金热', family:'sour', glass:'rocks', sub:'Gold Rush · 三样材料，新手最不容易失手', items:[['bourbon',45],['lemon',15],['honey_syrup',15]],
    tip:'蜂蜜和柠檬一进一出，摇到杯子外壁起霜就行。没有蜂蜜糖浆就用 1:1 的。' },
  { name:'薄荷朱丽普', family:'spirit', glass:'rocks', sub:'Mint Julep · 冰最多的一杯', items:[['bourbon',45],['syrup',10],['mint',6]],
    tip:'冰要装到杯口再压实。薄荷只用手拍一下，别捣碎，碎了会出草腥味。' },
  { name:'纽约', family:'sour', glass:'coupe', sub:'New York · 颜色好看，适合待客', items:[['bourbon',45],['lemon',30],['syrup',10],['grenadine',15]],
    tip:'酸度偏亮，红石榴糖浆只负责颜色和一点点果香。' },
  { name:'八区', family:'sour', glass:'coupe', sub:'Ward 8 · 柠檬加橙汁的老配方', items:[['rye',60],['lemon',15],['orange_juice',15],['syrup',15],['grenadine',5]],
    tip:'红石榴糖浆只要 1 把勺（5ml）就够，多了整杯会变成糖水。' },
  { name:'榛子酸', family:'sour', glass:'coupe', sub:'Frangelico Sour · 威士忌配榛子', items:[['bourbon',30],['frangelico',30],['lemon',20],['syrup',10],['egg_white',20]],
    tip:'榛子和麦芽香几乎是天然的一对。蛋清先干摇再加冰，泡沫会立起来。' },
  { name:'萨泽拉克', family:'spirit', glass:'rocks', sub:'Sazerac · 苦艾酒只用来洗杯', items:[['cognac',60],['demerara',5],['peychaud',5],['absinthe',3]],
    tip:'冰块只用来搅拌降温，倒出来的时候滤掉，成品不加冰。苦艾酒倒进冰过的杯子里转一圈，把多余的倒掉，再倒入酒液。' },
  { name:'威士忌可乐', family:'highball', glass:'icecup', sub:'Whisky Coke · 最简单的一杯', items:[['jack',45],['coke',100],['lime',5]],
    tip:'挤 5ml 青柠，整杯会从「甜」变成「有味道」。' }
  ,{ name:'浓缩柠檬高球', family:'highball', glass:'icecup', sub:'用浓缩柠檬 · 不用洗柠檬不用挤', items:[['bourbon',45],['sunquick',30],['soda',120]],
    tip:'浓缩柠檬已经带糖，所以不用再加糖浆。它做出来更接近「柠檬味气泡饮料」，不是威士忌酸那个路子——想喝正经的酸，还是得现挤。' }
  ,{ name:'金汤力', family:'highball', glass:'highball', sub:'Gin & Tonic · 只需要会挤青柠', items:[['tanqueray',45],['tonic',120],['lime',10]],
    tip:'挤一个青柠角进去，挤完直接丢杯子里。别用柠檬替，青柠的香气才对得上奎宁的苦。' },
  { name:'干马天尼', family:'spirit', glass:'coupe', sub:'Dry Martini · 几乎全是酒', items:[['tanqueray',60],['dry_vermouth',10],['orange_bitters',1]],
    tip:'搅拌 30 秒就够，别摇。味美思只放 10ml——它开瓶后必须冷藏，没冰箱的话这杯要趁新鲜。' },
  { name:'尼格罗尼', family:'spirit', glass:'rocks', sub:'Negroni · 三等份，最不容易失手', items:[['gin',30],['campari',30],['vermouth',30]],
    tip:'有史以来最好记的比例：三样各 30ml。橙皮一定要有，它负责把苦味收干净。' },
  { name:'莫吉托', family:'highball', glass:'highball', sub:'Mojito · 薄荷只拍不捣', items:[['havana3',45],['lime',20],['syrup',15],['mint',8],['soda',60]],
    tip:'薄荷用手拍一下就好，捣碎了会出草腥味。先放薄荷、青柠、糖浆轻轻压两下，再加冰和酒。' },
  { name:'自由古巴', family:'highball', glass:'icecup', sub:'Cuba Libre · 可乐、朗姆、青柠', items:[['havana3',45],['coke',100],['lime',10]],
    tip:'关键全在那 10ml 青柠。不加就是朗姆可乐，加了才是自由古巴。' },
  { name:'玛格丽特', family:'sour', glass:'coupe', sub:'Margarita · 盐边是灵魂', items:[['patron',45],['cointreau',20],['lime',20]],
    tip:'用青柠角把杯口抹一圈，再倒扣进盐里蘸一圈。换成便宜龙舌兰会明显差一档。' },
  { name:'大都会', family:'sour', glass:'coupe', sub:'Cosmopolitan · 蔓越莓的酸甜', items:[['vodka',40],['cointreau',15],['cranberry',30],['lime',15]],
    tip:'摇到杯子外壁起霜。蔓越莓汁本身够甜，不用再加糖浆。' }

  /* ===== 极简示例：两样材料 ===== */
  ,{ name:'黑俄罗斯', family:'spirit', glass:'rocks', sub:'Black Russian · 两瓶都不用管保存', items:[['vodka',45],['kahlua',15]],
    tip:'伏特加和咖啡利口酒 3:1，就这样。这两瓶都是常温久放，是住处里最省事的一杯，也是最好的"两样材料也能叫鸡尾酒"的证明。' }
  ,{ name:'法国情怀', family:'spirit', glass:'rocks', sub:'French Connection · 教父的干邑版', items:[['cognac',45],['disaronno',20]],
    tip:'和教父只差基酒：威士忌换成干邑，杏仁香就从"麦芽"变成了"葡萄干"。两样材料就能听出区别。' }
  ,{ name:'马颈', family:'highball', glass:'highball', sub:'Horse\'s Neck · 白兰地加干姜水', items:[['cognac',40],['ginger_ale',90]],
    tip:'最老的两样配方之一。姜的辣会把白兰地的木头味抬起来，比听起来好喝很多。' }
  ,{ name:'加里波利', family:'highball', glass:'highball', sub:'Garibaldi · 金巴利的苦配橙汁的甜', items:[['campari',45],['orange_juice',90]],
    tip:'靠橙汁的果甜把金巴利的苦包住。麻烦之处在于橙汁最好是现榨的——瓶装的会变成一杯甜水，这杯就废了。' }
  ,{ name:'螺丝刀', family:'highball', glass:'highball', sub:'Screwdriver · 伏特加加橙汁', items:[['vodka',50],['orange_juice',100]],
    tip:'名字来自当年工人拿螺丝刀搅酒。想让它不无聊，挤 5ml 柠檬进去，酸度一上来整杯就活了。' }

  /* ===== 极简示例：三样材料 ===== */
  ,{ name:'黛绮莉', family:'sour', glass:'coupe', sub:'Daiquiri · 三样材料，考的全是配比', items:[['rum',60],['lime',20],['syrup',15]],
    tip:'朗姆、青柠、糖，就这三样。做不好通常是酸甜没配平——这杯最适合拿来练手，也是所有"酸"类鸡尾酒的原型。' }
  ,{ name:'蜂之膝', family:'sour', glass:'coupe', sub:'Bee\'s Knees · 金酒、蜂蜜、柠檬', items:[['gin',45],['honey_syrup',15],['lemon',15]],
    tip:'禁酒令时期的配方，当年蜂蜜是用来盖住劣质酒的杂味的。把金酒换成威士忌或苹果白兰地，同样成立。' }
  ,{ name:'吉姆雷特', family:'sour', glass:'coupe', sub:'Gimlet · 金酒和青柠的直球', items:[['gin',60],['lime',15],['syrup',10]],
    tip:'比黛绮莉更冷、更直接。青柠别超过 15ml，多了会盖掉杜松子——这杯喝的就是金酒本身。' }
  ,{ name:'神风', family:'sour', glass:'coupe', sub:'Kamikaze · 伏特加、君度、青柠', items:[['vodka',30],['cointreau',15],['lime',15]],
    tip:'君度既给甜也给橙香，所以不用再额外加糖浆——三样材料里有一个是"二合一"，这就是它的全部聪明之处。' }
  ,{ name:'美国佬', family:'highball', glass:'highball', sub:'Americano · 尼格罗尼减掉金酒', items:[['campari',30],['vermouth',30],['soda',60]],
    tip:'把尼格罗尼的金酒换成一截苏打水，度数直接砍半，适合下午慢慢喝。味美思开瓶后要尽快用完。' }
  ,{ name:'汤米家的玛格丽特', family:'sour', glass:'coupe', sub:'Tommy\'s Margarita · 用糖浆换掉君度', items:[['tequila',45],['lime',20],['syrup',10]],
    tip:'比经典玛格丽特少一样材料，龙舌兰的味道反而更清楚。糖浆用龙舌兰糖浆最正宗。' }
  ,{ name:'养乐多烧酒', family:'highball', glass:'icecup', sub:'韩国便利店喝法 · 三样材料', items:[['soju',60],['yakult',1],['sprite',60]],
    tip:'烧酒、养乐多、雪碧大概 1:1:1，搅一下就行。养乐多本身又酸又甜，所以不用糖也不用柠檬，是零门槛的一杯。' }
  ,{ name:'可尔必思沙瓦', family:'highball', glass:'icecup', sub:'Calpis Sour · 居酒屋最常见的喝法', items:[['soju',60],['calpis',60],['soda',90]],
    tip:'日本居酒屋的沙瓦就是这个结构：酒 + 乳酸菌饮料 + 气泡水。把烧酒换成金酒或伏特加也成立。' }
  ,{ name:'芒果朗姆', family:'sour', glass:'highball', sub:'Rum & Mango · 便利店热带风', items:[['rum',45],['mango_mix',90],['lime',10]],
    tip:'芒果混合汁很稠、很甜，所以那 10ml 青柠不能省——没有它整杯会腻。想更像热带，再加 15ml 椰浆。' }
  ,{ name:'椰林飘香', family:'highball', glass:'hurricane', sub:'Piña Colada · 顺便看看它为什么容易失败', items:[['rum',45],['pineapple',90],['coconut_milk',30],['lime',20]],
    tip:'青柠不能省：朗姆 + 菠萝 + 椰浆之外，就靠它把甜压住，少了它是一杯甜果昔。这一杯我特意放进来当反面教材：菠萝汁里的菠萝蛋白酶会把椰浆的乳化结构拆开，倒下去那一刻就可能起絮分层，和 pH 无关。想稳定出品，用罐装/超高温灭菌的菠萝汁，或者把鲜菠萝汁煮开一分钟灭酶再放凉。' }
];

/* =========================================================
   保存档案：能不能在没冰箱的住处里活下来

   risk 0 = 放心买，常温放着就行
   risk 1 = 注意，开封后有时间压力
   risk 2 = 高风险，一买下来就得马上安排用完（或者干脆别买）

   text 写清楚：怎么放、能放多久、住处里该怎么办
   ========================================================= */
var STORE_DEFAULT = {
  /* 六大基酒各是一个分类，但保存条件一样 */
  whisky:  { lv: 'ok',  risk: 0, text: '未开封常温。开封后盖紧避光，40 度左右的烈酒放 1-2 年没问题。' },
  gin:     { lv: 'ok',  risk: 0, text: '未开封常温。开封后盖紧避光，能放很久；金酒的香气会慢慢变淡，一年内喝完最好。' },
  rum:     { lv: 'ok',  risk: 0, text: '未开封常温。开封后盖紧避光，烈性朗姆放 1-2 年没问题。' },
  vodka:   { lv: 'ok',  risk: 0, text: '未开封常温。开封后盖紧避光，几乎不会坏——伏特加本来就是最"稳定"的一种酒。' },
  tequila: { lv: 'ok',  risk: 0, text: '未开封常温。开封后盖紧避光，1-2 年内喝完风味最完整。' },
  brandy:  { lv: 'ok',  risk: 0, text: '未开封常温。开封后盖紧避光，放 1-2 年没问题。' },
  otherbase: { lv: 'ok', risk: 0, text: '未开封常温。开封后盖紧避光。烧酒度数低，尽量半年内喝完；白酒不怕放。' },
  liqueur: { lv: 'ok',  risk: 1, text: '未开封常温。开封后避光盖紧，3-6 个月；度数低于 20% 的要更快喝完。' },
  wine:    { lv: 'bad', risk: 2, text: '开瓶后必须冷藏，3-5 天内喝完（雪莉和波特能多放几天）。没冰箱就买最小瓶，开瓶当天叫上人喝完。' },
  bitter:  { lv: 'ok',  risk: 0, text: '常温阴凉处就行，苦精和干香料基本不会坏。' },
  fresh:   { lv: 'bad', risk: 2, text: '现切现用：薄荷插水里能撑 3-5 天，黄瓜切开当天用完，蛋清蛋黄当天用完。' },
  sweet:   { lv: 'ok',  risk: 0, text: '常温干燥处，几乎不坏。' },
  mixer:   { lv: 'ok',  risk: 0, text: '未开封常温。开封后气会跑，当天喝口感最好。' },
  teacoffee: { lv: 'ok', risk: 0, text: '未开封常温。开封后当天喝完最好；冷萃咖啡要冷藏，2-3 天内喝完。' },
  dairy:   { lv: 'bad', risk: 2, text: '奶类开封后必须冷藏、2-3 天内用完。这一栏里只有热水没有保存问题。' },
  sour:    { lv: 'bad', risk: 2, text: '现挤的当天用完。' },
  juice:   { lv: 'bad', risk: 2, text: '开封后必须冷藏，2-3 天内喝完。' },
  garnish: { lv: 'bad', risk: 2, text: '新鲜材料，当天用完。' },
  ice:     { lv: 'bad', risk: 1, text: '当天用完；存的话放泡沫箱加冰袋，能撑一晚。' }
};

var STORE = {
  /* ---- 酸味 ---- */
  lemon: { lv: 'bad', risk: 2, text: '整颗柠檬放阴凉处能撑 3-5 天；挤出来的汁当天用完，隔夜会发苦。一颗约 40ml，够两杯。' },
  lime: { lv: 'bad', risk: 2, text: '青柠比柠檬更不耐放，整颗 3-5 天，汁当天用完。一颗约 25ml。' },
  lemon_bottle: { lv: 'mid', risk: 1, text: '未开封常温。开封后冷藏最好；住处就买小瓶，1 个月内用完。' },
  sunquick: { lv: 'mid', risk: 1, text: '浓缩糖浆：未开封常温 1-2 年，开瓶后阴凉避光能放 3-6 个月（糖度高），冷藏更久。住处里最省心的柠檬来源。' },
  passionfruit: { lv: 'bad', risk: 2, text: '切开就必须当天用完，没有中间选项。' },

  /* ---- 甜味 ---- */
  syrup: { lv: 'mid', risk: 1, text: '自制 1:1 糖浆常温阴凉能放 2-3 周；做成 2:1（糖多水少）能放半年以上，是住处更该选的做法。' },
  honey_syrup: { lv: 'mid', risk: 1, text: '常温阴凉 3-4 周，蜂蜜本身抑菌，比白糖浆耐放。' },
  honey: { lv: 'ok', risk: 0, text: '常温放着就行，几乎不坏。结晶了隔温水泡一下就行。' },
  demerara: { lv: 'mid', risk: 1, text: '和白糖浆一样，常温阴凉 2-3 周。' },
  maple: { lv: 'mid', risk: 1, text: '未开封常温。开封后冷藏最稳，住处建议 1-2 个月内用完。' },
  grenadine: { lv: 'mid', risk: 1, text: '糖度高，常温阴凉能放 3-6 个月。' },
  monin: { lv: 'mid', risk: 1, text: '未开封常温 2-3 年（看瓶身）。开瓶后阴凉避光：纯糖浆（香草、焦糖）半年到一年，果味型 3-6 个月。买 250ml 小瓶更实际。' },
  lemon_sherbet: { lv: 'mid', risk: 1, text: '常温阴凉 2-3 周。出现起泡、胀瓶或异味就丢掉。' },
  oleo: { lv: 'mid', risk: 1, text: '常温阴凉 1 个月左右，糖度很高，不容易坏。' },

  /* ---- 利口酒：住处最容易翻车的都在这里 ---- */
  vermouth: { lv: 'bad', risk: 2, text: '开瓶后必须冷藏，2-4 周内用完。没冰箱的话这是最容易翻车的一样，建议直接跳过或买 375ml 一次喝完。' },
  dry_vermouth: { lv: 'bad', risk: 2, text: '同红味美思：开瓶后必须冷藏，4 周内用完。没冰箱别买大瓶。' },
  lillet: { lv: 'bad', risk: 2, text: '开瓶后冷藏，1-2 个月内用完。住处建议不买。' },
  absinthe: { lv: 'ok', risk: 0, text: '68 度，常温放很多年都不会坏——比味美思省心得多。' },
  pastis: { lv: 'ok', risk: 0, text: '45 度，常温阴凉处不用担心保存。' },
  baileys: { lv: 'bad', risk: 2, text: '含奶油，开瓶后必须冷藏，2-3 周内喝完。住处别买大瓶。' },
  malibu: { lv: 'mid', risk: 1, text: '21 度含糖，未开封常温。开封后阴凉避光能放 3-6 个月（比百利甜耐放，它没有奶油）。瓶口别沾水。' },
  aperol: { lv: 'mid', risk: 1, text: '只有 11 度，开瓶后避光常温 1-2 个月，冷藏更久。室友分着喝最合适。' },
  cocoa_white: { lv: 'mid', risk: 1, text: '未开封常温；开瓶后避光能放 3-6 个月。' },

  /* ---- 果汁 / 饮料 ---- */
  coconut_water: { lv: 'bad', risk: 1, text: '开封后冷藏，当天喝完。' },
  hot_water: { lv: 'ok', risk: 0, text: '现烧现用，没有保存问题——它正是"没冰箱也能调酒"的关键。' },
  vitasoy: { lv: 'bad', risk: 2, text: '开封后冷藏，2 天内喝完。' },
  coconut_drink: { lv: 'bad', risk: 2, text: '开封后冷藏，2-3 天内喝完。' },
  wangzai: { lv: 'bad', risk: 2, text: '开封后冷藏，2 天内喝完。' },
  shuirongc: { lv: 'bad', risk: 2, text: '开封后冷藏，2-3 天内喝完；买小瓶一次喝完最省事。' },
  apple_juice: { lv: 'bad', risk: 2, text: '开封后冷藏，2-3 天内喝完。买 300ml 小瓶、一次喝完就完全不用操心保存。' },
  grape_juice: { lv: 'bad', risk: 2, text: '开封后冷藏，2-3 天内喝完。糖度高，常温放一天就会开始发酸。' },
  mango_mix: { lv: 'bad', risk: 2, text: '开封后冷藏，2 天内喝完（含果肉更容易坏）。优先买小瓶装。' },
  yakult: { lv: 'mid', risk: 1, text: '100ml 小瓶一次喝完最省事。未开封按瓶身保质期，开瓶当天喝完。' },
  calpis: { lv: 'mid', risk: 1, text: '开封后冷藏，2-3 天内喝完；买最小瓶。' },
  yogurt: { lv: 'bad', risk: 2, text: '开封后冷藏，2 天内喝完，不能常温过夜。' },
  cold_brew: { lv: 'bad', risk: 1, text: '开封后冷藏，2-3 天内喝完。' },
  milk: { lv: 'bad', risk: 2, text: '开封后必须冷藏，2-3 天内喝完。住处建议用多少买多少。' },
  cream: { lv: 'bad', risk: 2, text: '开封后必须冷藏，3 天内用完。住处不建议常备。' },
  coconut_milk: { lv: 'bad', risk: 2, text: '开封后冷藏，2-3 天内用完；椰浆很容易坏。' },
  sparkling_wine: { lv: 'bad', risk: 2, text: '开瓶后当天喝完——气泡跑掉就只剩酸水了。买最小瓶。' },

  /* ---- 香料 / 点缀 ---- */
  ginger_fresh: { lv: 'mid', risk: 1, text: '整块姜放阴凉通风处能放 1-2 周，切开的那块当天用完。' },
  lemon_peel: { lv: 'bad', risk: 2, text: '皮是从整颗柠檬上切下来的——切完当天用完，剩下的果实阴凉处放 3-5 天。' },
  orange_peel: { lv: 'bad', risk: 2, text: '同上：橙皮当天用完，剩下的橙子阴凉处放 3-5 天。' },
  mint: { lv: 'bad', risk: 2, text: '买回来插在水杯里、套个塑料袋，阴凉处能撑 3-5 天。叶子发黑就别用了。' },
  rosemary: { lv: 'mid', risk: 1, text: '比薄荷耐放，插水里或晾干都能放很久。' },
  cucumber: { lv: 'bad', risk: 2, text: '切开的黄瓜当天用完。' },
  cherry: { lv: 'mid', risk: 1, text: '糖渍樱桃开罐后冷藏最好；住处买小罐，2-3 周内用完。' },
  egg_white: { lv: 'bad', risk: 2, text: '蛋清当天用完，别留。剩下的蛋黄正好拿去炒个蛋。' }
  , egg_yolk: { lv: 'bad', risk: 2, text: '蛋黄当天用完。剩下的蛋清可以打成蛋白霜，或者第二天做蛋白饼。' }
  , raspberry: { lv: 'bad', risk: 2, text: '鲜树莓买回来 1-2 天内用完，压坏了就发霉。用它不如用树莓糖浆实在。' }
  , green_grape: { lv: 'bad', risk: 2, text: '一小串放阴凉处能撑 3-5 天，洗过的一定要当天吃完。' }
  , butter: { lv: 'bad', risk: 2, text: '开封后必须冷藏，一周内用完。住处买最小块，剩下的抹面包。' }
  , worcestershire: { lv: 'ok', risk: 0, text: '常温阴凉处放一两年都不会坏——血腥玛丽住户最省心的一样。' }
  , cocchi: { lv: 'bad', risk: 2, text: '开瓶后必须冷藏，2-4 周内喝完（和味美思一样怕氧化）。没冰箱就买 375ml，一次用完。' }
  , falernum: { lv: 'mid', risk: 1, text: '11 度含糖，未开封常温；开封后阴凉避光 3-6 个月，冷藏更久。' }
  , mrblack: { lv: 'ok', risk: 1, text: '34 度、糖少，开封后避光能放 1 年以上（比甘露耐放）。' }
  , soco: { lv: 'ok', risk: 0, text: '35 度，未开封常温；开封后盖紧避光，一年内味道最完整。' }
  , fireball: { lv: 'ok', risk: 0, text: '33 度，常温放着就行，不怕坏。' }
  , picon: { lv: 'mid', risk: 1, text: '18 度，开封后避光 2-3 个月，冷藏更久。' }
  , montenegro: { lv: 'mid', risk: 1, text: '23 度，开封后常温避光 3-6 个月，冷藏更久。' }
  , aveze: { lv: 'mid', risk: 1, text: '20 度，开封后避光 3-6 个月。' }
  , grapefruit_liqueur: { lv: 'mid', risk: 1, text: '20 度含糖，开封后避光 3-6 个月。' }
};

var RISK_LABEL = { 0: '放心买', 1: '注意', 2: '高风险' };

/* =========================================================
   近似 pH（室温）

   用来判断"这杯会不会结块 / 分层"，跟"喝起来酸不酸"是两回事：
   养乐多、可尔必思喝起来很酸，但它们本身就是稳定发酵体系，不会把奶弄坏；
   菠萝汁 pH 只有 3.5 左右，却是最容易出事的那个——因为它含蛋白酶。

   没列到的（烈酒、干香料、冰、热水）按 pH 6 算，酸度贡献可以忽略。
   ========================================================= */
var PH = {
  /* 酸味 */
  lemon: 2.2, lime: 2.0, lemon_bottle: 2.3, passionfruit: 3.0, sunquick: 2.5,
  /* 果汁 */
  orange_juice: 3.7, grapefruit: 3.2, pineapple: 3.5, cranberry: 2.6, tomato: 4.2,
  coconut_water: 5.0, apple_juice: 3.5, grape_juice: 3.4, mango_mix: 3.6,
  /* 甜味 */
  syrup: 5.0, honey_syrup: 4.8, honey: 4.0, demerara: 4.5, maple: 5.5,
  grenadine: 2.8, monin: 3.5, lemon_sherbet: 2.4, oleo: 3.0,
  /* 气泡与饮料 */
  soda: 5.0, tonic: 3.0, ginger_ale: 3.2, ginger_beer: 3.4, coke: 2.5, sprite: 3.2,
  vitale: 3.0, genki: 3.3, grapefruit_soda: 3.3, oolong: 6.0, jasmine_tea: 6.0, iced_tea: 3.2,
  coffee_hot: 5.0, cold_brew: 5.0, milk: 6.7, cream: 6.6, coconut_milk: 6.2,
  yakult: 3.6, calpis: 3.6, yogurt: 4.3, redbull: 3.4, sparkling_wine: 3.2, hot_water: 7.0,
  /* 利口酒 */
  campari: 4.2, aperol: 4.0, cassis: 3.2, sloe_gin: 3.6, cointreau: 4.0,
  cherry_brandy: 4.0, vermouth: 3.6, dry_vermouth: 3.6, lillet: 3.6, maraschino: 5.0
  /* 软饮 */
  , schweppes_c: 2.9, fanta: 3.0, beibingyang: 3.0, sparkling_mineral: 5.0
  , dongfangshuye: 6.0, wanglaoji: 5.0, vitasoy: 6.5, coconut_drink: 6.3, wangzai: 6.5
  , shuirongc: 3.0
  , shuirongc_yuzu: 3.1, shuirongc_orange: 3.3, shuirongc_kiwi: 2.9
  , egg_white: 7.6
  /* 加强酒和葡萄酒 */
  , fino: 3.2, port: 3.6, red_wine: 3.4, white_wine: 3.2
  /* 橄榄汁是咸的，pH 接近中性偏酸 */
  , olive_brine: 5.0
  , orange_flower: 6.5
};
var PH_DEFAULT = 6.0;

/* =========================================================
   蛋白酶：会把奶类蛋白和椰浆的乳化结构拆开，跟 pH 无关
   菠萝汁是最常见的那个（这就是椰林飘香容易分层的原因）
   ========================================================= */
var ENZYMES = {
  pineapple: '菠萝汁里的菠萝蛋白酶',
  ginger_fresh: '生姜里的生姜蛋白酶',
  papaya: '木瓜蛋白酶',
  kiwi: '猕猴桃蛋白酶',
  fig: '无花果蛋白酶'
};

/* =========================================================
   杯子（真实存在、由你选）
   cap      = 总容量 ml
   liquidMax = 实际能倒进去的液体上限（要塞冰、要留空间）
   ice      = inglass 冰留在杯里（会持续稀释）/ chilled 冰镇后滤掉（不会越喝越淡）
   ========================================================= */
var GLASSES = [
  { id: 'icecup', name: '便利店冰杯', cap: 400, liquidMax: 200, ice: 'inglass', melt: 55, lo: 4, hi: 14,
    note: '买来就是一整杯冰。冰填到杯口，剩下的空间才是液体——所以液体通常还不到冰的一半。' },
  { id: 'highball', name: '高球杯', cap: 380, liquidMax: 190, ice: 'inglass', melt: 50, lo: 4, hi: 14,
    note: '细长直身杯，冰也要填满。高球、金汤力、莫吉托这类气泡长饮都用它。' },
  { id: 'rocks', name: '古典杯', cap: 300, liquidMax: 140, ice: 'inglass', melt: 25, lo: 14, hi: 42,
    note: '矮胖厚底，一般也是加满冰。想让它化得慢就换一整块大方冰，melt 能砍一半。' },
  { id: 'coupe', name: '马天尼杯 / 酸酒杯', cap: 180, liquidMax: 130, ice: 'chilled', melt: 0, lo: 12, hi: 42,
    note: '带脚的浅口杯。摇好滤进去，不加冰——马天尼、黛绮莉、酸都归它。' },
  { id: 'flute', name: '香槟杯', cap: 220, liquidMax: 180, ice: 'chilled', melt: 0, lo: 5, hi: 20,
    note: '细长笛形，专给气泡酒类：含羞草、贝利尼、皇家基尔、香槟鸡尾酒、法兰西 75。杯身细长就是为了让气泡少跑；不加冰。' },
  { id: 'hurricane', name: '飓风杯', cap: 500, liquidMax: 260, ice: 'inglass', melt: 60, lo: 3, hi: 12,
    note: '大肚高脚杯，热带长饮专用，装得下也喝得久。' },
  { id: 'shot', name: '一口杯', cap: 60, liquidMax: 55, ice: 'chilled', melt: 0, lo: 28, hi: 60,
    note: '纯饮和分层用。' },
  { id: 'mug', name: '马克杯（热饮）', cap: 350, liquidMax: 300, ice: 'chilled', melt: 0, lo: 3, hi: 30,
    note: '热饮用。热托蒂、爱尔兰咖啡这类热酒只能用它——热酒倒进放冰的杯子里，冰会瞬间化光。' }
];

/* 冰量：加多少冰由你决定，因为你有多少冰、想喝多浓，只有你清楚。
   冰越多 → 占掉的空间越多 → 能加的液体越少，但化开的水也越多。 */
var ICE_LEVELS = [
  { id: 'full', name: '满冰', meltRatio: 1, roomRatio: 0.5,
    note: '冰填到杯口再倒酒，最凉、化得最慢的那一口在上面' },
  { id: 'half', name: '半杯冰', meltRatio: 0.5, roomRatio: 0.7,
    note: '放几块冰，杯子里还有一半空间' },
  { id: 'none', name: '不加冰', meltRatio: 0, roomRatio: 1,
    note: '常温直饮，不会越喝越淡' }
];

/* =========================================================
   做法——决定"准备时加多少水"

   这一点我一开始搞错了：把稀释绑在杯子上（"古典杯=现调、马天尼杯=摇和"）。
   但真正决定加水多少的是做法，不是杯子。萨泽拉克用古典杯，却是搅拌出来的，
   有整整 20% 的水——按杯子判断会算出 38%，而实际只有 31%。
   ========================================================= */
var METHODS = [
  { id: 'build', name: '兑和', en: 'Build', dil: 0,
    note: '直接在杯里兑，不摇不搅——只靠冰化开慢慢稀释' },
  { id: 'stir',  name: '搅拌', en: 'Stir', dil: 0.20,
    note: '加冰搅拌后滤出，约 20% 稀释。马天尼、古典、萨泽拉克都是' },
  { id: 'shake', name: '摇和', en: 'Shake', dil: 0.25,
    note: '加冰摇匀后滤出，约 25% 稀释。带果汁、蛋清、奶的都要摇' }
];

/* 每个经典配方用哪种做法（配方名 → 做法）。
   存在这里而不是写进每条配方，是为了加配方时不用改结构。 */
var PRESET_METHOD = {
  '威士忌高球': 'build', '维他柠檬茶微醺': 'build', '威士忌乌龙': 'build',
  '姜味骡子': 'build', '威士忌可乐': 'build', '浓缩柠檬高球': 'build',
  '金汤力': 'build', '莫吉托': 'build', '自由古巴': 'build',
  '马颈': 'build', '加里波利': 'build', '螺丝刀': 'build',
  '美国佬': 'build', '可尔必思沙瓦': 'build', '养乐多烧酒': 'build',
  '椰林飘香': 'shake',
  '威士忌酸': 'shake', '黛绮莉': 'shake', '蜂之膝': 'shake', '吉姆雷特': 'shake',
  '玛格丽特': 'shake', '汤米家的玛格丽特': 'shake', '淘金热': 'shake', '神风': 'shake',
  '大都会': 'shake', '榛子酸': 'shake', '纽约': 'shake', '八区': 'shake',
  '芒果朗姆': 'shake', '青霉素': 'shake', '血与沙': 'shake',
  '古典': 'stir', '干马天尼': 'stir', '尼格罗尼': 'stir', '罗伯罗伊': 'stir',
  '花花公子': 'stir', '萨泽拉克': 'stir',
  '锈钉': 'build', '教父': 'build', '黑俄罗斯': 'build',
  '法国情怀': 'build', '薄荷朱丽普': 'build',
  '热托蒂': 'build', '爱尔兰咖啡': 'build'
};

/* =========================================================
   温度——同样一杯酒，材料是冰的还是常温的，化出来的水能差好几倍

   这一点是用户提醒我的：材料不是抽象的"液体"，它们各自带着温度。
   冷材料能动用的热量少，冰就化得慢；常温材料会把冰一路化开。

   四个值取生活里真实的数字：
     常温 25℃（放桌上）· 冷藏 5℃（冰箱 3-8℃）· 冷冻 -18℃（冷冻室）
     热 80℃（现烧的水、现冲的咖啡）

   40 度的烈酒放冷冻室不会结冰，很多酒吧本来就这么存酒。
   ========================================================= */
var TEMPS = [
  { id: 'frozen', name: '冷冻', c: -18, short: '冷冻',
    note: '基酒放在冷冻室（40 度不会冻上，酒吧本来就这么存）。倒出来几乎不化冰。' },
  { id: 'cold',   name: '冷藏', c: 5,   short: '冷藏',
    note: '冰箱冷藏室 3-8℃。便利店买回来的饮料本来就是冷的，拎回来就是这个温度。' },
  { id: 'room',   name: '常温', c: 25,  short: '常温',
    note: '放在桌上的室温。没有冰箱的话，大多数材料就是这个状态。' },
  { id: 'hot',    name: '热',   c: 80,  short: '热',
    note: '现烧的热水、现冲的咖啡。热饮不放冰。' }
];

/* 点材料上的温度标签时按这个顺序轮换 */
var TEMP_CYCLE = ['frozen', 'cold', 'room'];
/* 冰镇材料（气泡饮料、奶、果汁）默认按"从冰箱拿出来"算；烈酒、糖浆默认常温 */
var TEMP_DEFAULT = {
  whisky: 'room', gin: 'room', rum: 'room', vodka: 'room', tequila: 'room', brandy: 'room',
  otherbase: 'room', liqueur: 'room', bitter: 'room', sweet: 'room', sour: 'room',
  garnish: 'room', fresh: 'room', teacoffee: 'room',
  wine: 'cold',
  mixer: 'cold',
  juice: 'cold',
  dairy: 'cold',
  ice: 'frozen'
};
var TEMP = {
  hot_water: 'hot', coffee_hot: 'hot', cold_brew: 'cold'
};
/* 只能热的材料：不给它们"冷冻"这个选项 */
var TEMP_FIXED = { hot_water: 1, coffee_hot: 1 };

/* 热量常数（初中物理）：冰化开要从液体里吸热，材料越凉，冰化得越少 */
var THERMO = {
  iceLatent: 334,   /* J/g　冰 → 水（融化热） */
  iceCp: 2.05,      /* J/(g·K)　冰升温：-18℃ 的冰先要捂到 0℃ 才开始化 */
  iceTemp: -18,     /* 冷冻室拿出来的冰 */
  icePack: 0.85     /* 冰填到杯口，中间有空隙，折算成质量 */
};

/* =========================================================
   "可省"清单：缺了不算缺，有就更好

   这是**人工维护**的一张表（用户的判断），不是算出来的——
   "盐水可以省、苦精不能省"属于酒的门道，数据里推不出来。
   好处是：按材料定一次，191 份配方、44 个预设全都通用，
   不用一条条配方去筛。

   进这张表的理由大致三类：
     · 用量极小、属于提味：盐水；
     · 口感类，看个人喜好：蛋清、蛋黄；
     · 装饰：柠檬皮、橙皮、樱桃、树莓、青提、迷迭香、橄榄汁。
     · 干香料（丁香、肉桂、八角、豆蔻、黑胡椒）：热托蒂少一粒丁香照样成立；
     · 黄瓜片：Gin-Gin Mule 里是特色，没它也能喝。
   苦精不进这张表——它是骨架（古典、曼哈顿、萨泽拉克没了它就不成立）。
   薄荷、生姜也不进——莫吉托没薄荷、青霉素没姜就不是那杯酒了。
   ========================================================= */
/* =========================================================
   替换说明：参考配方本写的东西，家里/住处办不到时我换成了什么

   用户的要求：**用户有权知道原方长什么样**，换了什么也要说清楚，
   而且要解释为什么换。所以酒单的详情里会同时显示"原方"和下面这些话。

  只写**真的换了东西**的那些；纯粹的名字写法差异（园林干味美思 → 干味美思、
  添加利 → 添加利金酒）不用写，那不是替换。
   ========================================================= */
/* 反面的一小张表：这几样**看着**像"同一件事换了个说法"，其实是两样东西，
   别被名字骗了（"柠檬伏特加"和普通伏特加查一下名字就互相包含，但它不是）。
   判定逻辑在 app.js 的 justSpelling。 */
var SWAP_REAL = {
  '柠檬伏特加': 1,     /* 加味伏特加，不是普通伏特加换了个叫法 */
  '百香果果茸': 1,     /* 带果肉的半成品，不是新鲜百香果 */
  '百香果糖浆': 1,     /* 糖浆 ≠ 水果 */
  '生姜糖浆': 1        /* 糖浆里有糖，和现磨姜片不是一回事 */
};
/* =========================================================
   下面开始是换掉东西的理由
   ========================================================= */
var SWAP_NOTE = {
  '柠檬酸溶液': '柠檬酸溶液是酒吧用来精确控酸的（柠檬酸粉兑水）。住处没必要为这一杯备一套，用现挤柠檬汁——酸度不如它稳定，但更像真柠檬。',
  /* 风味糖浆这条要说清楚：莫林什么口味都有，网购就能买到，
     真正的问题是"买一瓶用不完"——不是买不到。 */
  '菠萝糖浆': '莫林真有菠萝味糖浆，网购就有。问题是买一瓶用不完（开封后 3-6 个月），住处做一两杯不值当——用白糖浆 + 一点菠萝汁替。',
  '蔓越莓糖浆': '莫林有，但一整瓶用不完。用白糖浆 + 蔓越莓汁替，甜酸差不多。',
  '杏仁糖浆': '莫林有杏仁味糖浆，同样是用不完。用白糖浆 + 一小滴杏仁利口酒替。',
  '椰子糖浆': '莫林有椰子味糖浆，还是用不完。用白糖浆 + 一点椰浆替。',
  '树莓糖浆': '莫林有树莓味糖浆，买一瓶用不完。用白糖浆顶，想更像就压两颗树莓进去。',
  '红枣糖浆': '现成的红枣糖浆不多见，自己煮一点最实在（也能用白糖浆凑）。',
  '糖': '配方写的是砂糖，这里用糖浆——冷饮里糖化不开，糖浆才好用。',
  '红糖': '参考写红糖，这里用红糖糖浆（1:1），化得开。',
  '2:1红糖糖浆': '参考用 2:1（糖更多、更稠），这里用 1:1；想更浓就少放点水。',
  '生姜糖浆': '买不到生姜糖浆，用两片鲜姜在杯里压几下。',
  '生姜片': '和生姜糖浆是一个东西的两种写法，用鲜姜片压出味。',
  '百香果糖浆': '买不到，直接用百香果果肉（酸和香都更足）。',
  '百香果果茸': '果茸不好买，用百香果果肉。',
  '柠檬伏特加': '库里没有柠檬味伏特加。用普通伏特加 + 一条柠檬皮，效果差不多。',
  '意式浓缩咖啡': '住处没有意式咖啡机，用浓一点的挂耳咖啡。',
  '桃子果泥': '现打果泥太麻烦，用桃子利口酒替（味道更像甜酒）。',
  '西柚气泡水（可替代西柚汁 45ml + 苏打水 45ml）': '这种西柚味气泡水不是每家便利店都有。参考配方自己也写了替代办法：西柚汁 + 苏打水。',
  '西柚皮': '整颗西柚不好买，用橙皮当点缀（都是柑橘皮）。',
  '苦精': '泛指苦精，用最常见那瓶安高天娜。',
  '樱桃利口酒（Heering）': 'Heering 要网购。用樱桃白兰地替（更甜、更像糖浆）。',
  '希灵樱桃利口酒': '这个牌子要网购，用樱桃白兰地替。',
  '希零樱桃利口酒': '同一个牌子的另一种写法，用樱桃白兰地替。',
  '樱桃利口酒': '指樱桃味的利口酒，用樱桃白兰地替。',
    '自制味美思': '自制太费事，用现成的红味美思。',
  '自制阿马罗': '自制太费事，用现成的阿玛罗（阿维尔纳）。',
  '季之美金酒': '季之美网购能买到，只是不便宜。这杯用任一干金都成立。',
  '巍城夏日花园金酒': '这个牌子网购能买到，也不便宜。用任一干金替。',
  '美鹤乃舞烧酒': '这款日本烧酒要网购。用真露替，效果接近。',
  '烧酒（大伊雅美）': '同上，用真露替。',
  'Cubita 151 朗姆': '151 度的高强度朗姆要网购。用黑朗姆替——度数低一些，那就少放一点。',
  '蔗园菠萝朗姆': '菠萝味朗姆少见，用白朗姆 + 一点菠萝汁。',
  '白兰地': '只写"白兰地"没指定哪一种，用干邑最稳。',
  '金朗姆': '没指定牌子，用百加得金朗姆。'
  , '1957雪利酒': '"1957" 是一个西班牙雪莉酒的牌子，用干雪莉（Fino）替最接近。'
  , '阿马罗': '泛指的阿马罗（意大利苦味草药酒），用最常见那瓶阿维尔纳。'
};

/* =========================================================
   51 款推荐酒的来历（酒单详情里显示）

   用户定的规矩：**要来历时必须查证，不编**；查不到就写查不到，
   说法有分歧就写"说法不一"。这一批查的是英文维基百科的条目正文
   （Cosmopolitan / Negroni / Margarita / Sidecar 这些），
   凡是各家说法打架的，都在句子末尾标了"说法不一 / 存疑"。
   只写推荐的 51 款；其余 140 条显示"来历暂缺"。
   ========================================================= */
/* 推荐款的一句话定位：酒名下面那一行小字，一句话说清"这杯是什么、为什么值得做"。
   只有推荐的 51 款有；和 preset 的 sub（调酒台里那份）是一回事，但这里不带英文名。 */
var PICK_LINE = {
  '大都会': '粉红色、酸甜好入口，最出名的那杯「第一杯鸡尾酒」',
  '椰林飘香': '一杯热带果昔，也是「菠萝遇椰浆会分层」的活教材',
  '尼格罗尼': '三样各 30ml，苦味里最体面的一杯',
  '蜂之膝': '禁酒令年代的金酒酸，三样就成',
  '意式浓缩马天尼': '有咖啡的香、没咖啡的温度，睡前和醒酒之间点它',
  '马天尼': '几乎全是酒，最考验搅拌和温度的一杯',
  '曼哈顿': '威士忌版的马天尼，冬天的深色标配',
  '莫吉托': '薄荷 + 青柠 + 气泡，夏天最不容易出错的一杯',
  '威士忌酸': '酸甜平衡的教科书，学会它就懂了所有「酸」',
  '古典鸡尾酒': '只放糖和苦精，威士忌好不好喝一口就知道',
  '黛绮莉': '朗姆、青柠、糖，三样，考的全是配比',
  '玛格丽特': '盐边是灵魂，龙舌兰最出圈的一杯',
  '莫斯科骡子': '铜杯 + 姜汁啤酒，辣得清爽',
  '凯匹林纳': '巴西国酒，青柠要捣出皮油才够味',
  '汤米家的玛格丽特': '用龙舌兰糖浆替掉君度，龙舌兰的味道反而更清楚',
  '美国佬': '尼格罗尼减掉金酒，度数砍半，适合下午慢慢喝',
  '黑俄罗斯': '两瓶都不用管保存，住处里最省事的一杯',
  '白俄罗斯': '黑俄罗斯加一层奶油，甜点感的一杯',
  '马颈': '干姜水加一整条柠檬皮，比听起来好喝得多',
  '白鸽': '龙舌兰兑西柚气泡水，最随手的墨西哥喝法',
  '薄荷朱丽普': '冰最多的一杯，适合一杯慢慢喝一晚上',
  '金菲士': '气泡版的柠檬金酒，清爽到像汽水',
  '边车': '干邑 + 橙 + 柠檬，酸甜里的老钱风',
  '血腥玛丽': '咸鲜加辣，宿醉和早午餐的那一杯',
  '蓝色夏威夷': '蓝色的热带朗姆，拍照最好看',
  '法国情怀': '教父的干邑版，两样材料就成',
  '生锈钉': '蜂蜜香草利口酒 + 威士忌，几乎是作弊的简单',
  '加里波利': '金巴利的苦被橙汁包住，最容易接受的苦酒',
  '哈维撞墙': '螺丝刀上浮一层香草味，1970 年代的美国记忆',
  '绿蚱蜢': '薄荷色的甜点酒，饭后一杯',
  '性感沙滩': '桃子 + 蔓越莓 + 橙，甜得直白的派对酒',
  '贝里尼': '白桃泥加起泡酒，早午餐的粉红色',
  '汤姆柯林斯': '金酒版柠檬汽水，长饮里最解渴的',
  '阿佩罗橙光': '苦甜加气泡，度数和果汁差不多，最不容易醉的一杯',
  '杏仁酸': '杏仁的甜香配柠檬，加一滴波本会更立体',
  '金Ricky': '不加糖的金酒青柠，比金汤力更干净',
  '神风': '伏特加、君度、青柠，等量三样',
  '自由古巴': '可乐、朗姆、青柠——关键全在那 10ml 青柠',
  '螺丝刀': '伏特加加橙汁，最没门槛的一杯',
  '灰狗': '伏特加对西柚汁，比橙汁更清爽',
  '咸狗': '灰狗加盐边，咸味把西柚的酸推得更远',
  '教父': '杏仁香和威士忌的麦芽香，两样材料慢慢喝',
  '教母': '教父的伏特加版，更干净也更直接',
  '香槟鸡尾酒': '方糖 + 苦精 + 香槟，气泡里最讲究的一杯',
  '含羞草': '香槟兑橙汁，早午餐的标准配置',
  'B-52': '三层不混的分层酒，一口闷或小口抿都行',
  '蓝色泻湖': '蓝橙加伏特加和柠檬水，颜色先赢一半',
  '天使之吻': '咖啡利口酒上浮一层奶油，甜点里的甜点',
  '皮姆杯': '黄瓜 + 干姜水 + 水果，英国人夏天的味道',
  '基尔': '黑加仑利口酒兑白葡萄酒，饭前最省事的一杯',
  '皇家基尔': '基尔的香槟版，贵气一点的饭前酒'
};

var ORIGIN = {
  '大都会': '来历一直有争议：几种说法分别指向 1970 年代的普罗温斯敦、俄亥俄和明尼阿波利斯，1980 年代传到旧金山，现在这份配方是 1989 年在纽约定下来的；更早的 1934 年酒谱里还有个「Cosmopolitan Daisy」。说法不一。',
  '椰林飘香': '波多黎各的国饮，也是它最有名的说法：1954 年波多黎各大学教授 Ramón López Irizarry 改良出罐装椰浆 Coco López，圣胡安 Caribe Hilton 说他们的调酒师 Ramón「Monchito」Marrero 就是用它调出这一杯的（这是酒店自己的说法）。',
  '尼格罗尼': '常说 1919 年佛罗伦萨的调酒师 Fosco Scarselli 把「美国佬」里的苏打水换成金酒，做给常客 Camillo Negroni 伯爵——这个说法流传最广。但史料上这杯酒在意大利要到 1940 年代末才有记录（1950 年代流行起来），1920 年代末的法国酒谱里已经有等量三样的做法，所以「1919 佛罗伦萨」这个出处是存疑的。',
  '蜂之膝': '禁酒令年代的金酒酸类。来历没有定论：一种说是 1921 年巴黎 Ritz 的首席调酒师 Frank Meier 做的，1929 年一篇报纸则把它记在社交名媛 Molly Brown 名下。名字来自当时的俚语 the bee\'s knees（顶好的东西）。',
  '意式浓缩马天尼': '1980 年代伦敦 Soho Brasserie，调酒师 Dick Bradsell 给一位开口就要「先把我叫醒、再把我放倒」的客人做的——他本人在视频里认过这件事。2020 年代初又翻红了一次。',
  '马天尼': '出身说不清。流传较广的一种是 1860 年代旧金山 Occidental Hotel 的 Martinez 变来的（客人要坐渡轮去附近的 Martinez 镇）；1922 年定型成伦敦干金 2 : 干味美思 1，1930 年代 3:1、1940 年代 4:1，越喝越干。',
  '曼哈顿': '流传最广的故事是 1870 年代纽约曼哈顿俱乐部：Iain Marshall 为 Jennie Jerome（丘吉尔的母亲）办的宴会调出这一杯，客人从此就说「来杯曼哈顿俱乐部的酒」。另一种说法是 1860 年代百老汇一位姓 Black 的调酒师。禁酒令期间多用加拿大威士忌。',
  '莫吉托': '生于哈瓦那，但确切来历有争议（还有一种说法是德雷克爵士带过去的）。名字的一种解释来自古巴的 mojo 酱（青柠调的）。2016 年的一项市场调查里，它是英法两国最流行的鸡尾酒。',
  '威士忌酸': '最早的书面记录是 1870 年威斯康星一家报纸；另一种说法是 1872 年智利伊基克的 Elliott Stubb 用当地柠檬做的（秘鲁报纸的记载）。加蛋清那一版又叫 Boston Sour。',
  '古典鸡尾酒': '配方本身是 1800 年代初的事，那时候还没这个名字。1880 年起有人管它叫「old-fashioned cocktail」——因为当时流行往酒里加各种利口酒和糖浆，客人就说「照老规矩来一杯」。最早用这个名字的酒谱是 1888 年芝加哥 Proulx 那本。',
  '黛绮莉': '名字来自古巴圣地亚哥附近的 Daiquirí 海滩和铁矿。历史学界比较一致的说法是：1898 年美西战争前后，美国采矿工程师 Jennings Cox 在古巴调出来的。',
  '玛格丽特': '来历没有定论。鸡尾酒史家 David Wondrich 认为它是把白兰地 Daisy 换成龙舌兰做的（margarita 在西班牙语里就是「雏菊」），1936 年就有记者在蒂华纳喝到过同样的东西；流传最广的说法是 1938 年 Carlos「Danny」Herrera 在蒂华纳为对很多烈酒过敏的 Marjorie King 做的。说法不一。',
  '莫斯科骡子': '流传最广的版本是 1941 年洛杉矶 Cock \'n\' Bull 酒吧老板 Jack Morgan 用自家姜汁啤酒 + 伏特加在铜杯里做的营销；2007 年又出现另一种说法，说是酒吧主调 Wes Price 为了清掉地下室积压的货想出来的。名字里有「莫斯科」，其实跟俄罗斯没关系。',
  '凯匹林纳': '学界比较一致的说法是 1918 年前后诞生在巴西圣保罗州内陆，如今是巴西的国酒，2003 年被认定为巴西文化遗产。',
  '汤米家的玛格丽特': '1990 年旧金山 Tommy\'s Mexican Restaurant 的 Julio Bermejo 做的：用龙舌兰糖浆替掉君度，为的是突出龙舌兰本身的味道。2008 年它成了 IBA 手册里第一款以某家店命名的鸡尾酒。',
  '美国佬': '1860 年代米兰 Caffè Campari（金巴利老板 Gaspare Campari 的店）。一个美国客人以为金巴利是长饮，点了之后嫌难喝，说加冰、加气泡水会好得多——这杯就这么来了。',
  '黑俄罗斯': '1949 年布鲁塞尔 Metropole 酒店，比利时调酒师 Gustave Tops 为当时的美国驻卢森堡大使 Perle Mesta 做的。',
  '白俄罗斯': '黑俄罗斯加淡奶油。两个名字里都有「俄罗斯」，其实都跟俄罗斯没关系（只因为基酒是伏特加）；「white Russian」这个词最早出现在 1965 年加州一家报纸上，1998 年电影《谋杀绿脚趾》之后又火了一波。',
  '马颈': '1900 年代本来是姜汁汽水 + 冰块 + 一整条柠檬皮的**无酒精**饮料；1910 年代起加白兰地或波本，叫「with a kick」。罗斯福总统在需要长时间应酬的场合就会点它。',
  '白鸽': 'Paloma 在西班牙语里是「鸽子」。这一条我查不到能核实的出处——维基百科的条目里没写来历，流传的说法（先有西柚气泡水再配龙舌兰之类）也都核不到硬证据，所以先空着，不编。',
  '薄荷朱丽普': '18 世纪起源于美国南方。1803 年伦敦出版的一本书里把它写成「弗吉尼亚人早上喝的一口泡了薄荷的酒」；20 年后它已经是弗吉尼亚的地方身份。现在是肯塔基赛马会的门面酒。',
  '金菲士': 'Fizz 这一族在 1900–1940 年代的美国很流行。它最有名的亲戚 Ramos Gin Fizz 是 1888 年新奥尔良的 Henry Ramos 做的，1915 年狂欢节期间为了摇它同时上了 32 个人。',
  '边车': '大概在第一次世界大战结束时出现在伦敦或巴黎，名字直接来自当时满街的摩托车边斗。巴黎 Ritz 说是他们发明的；1922 年两本酒书（Vermeire 和 MacElhone）同时收录了配方，MacElhone 早期写是同在伦敦 Buck\'s Club 的 Pat MacGarry，后来改口说是自己；还有一种说法是巴黎一位美国上尉。说法不一。',
  '血腥玛丽': '1920 或 1930 年代。最早的说法是 1921 年巴黎 New York Bar（后来叫 Harry\'s New York Bar）的 Fernand Petiot 随手用伏特加加番茄汁调的，当时叫「一桶血」；纽约 21 Club 也有自己的一套说法。名字和做法的说法都很多。',
  '蓝色夏威夷': '1957 年夏威夷 Waikiki 的 Hilton Hawaiian Village 主调 Harry Yee 做的：Bols 的业务员请他做一杯能展示自家蓝橙利口酒的。名字和 1961 年那部同名电影只有间接关系，其实是取自 1937 年一部电影里的插曲。',
  '法国情怀': '维基百科没有这一条的条目，我也查不到能核实的来历——按规矩不编，空着。',
  '生锈钉': '这一对组合最早出现在 1937 年英国工业博览会（配方记在一个叫 F. Benniman 的人名下），1950 年代被纽约 21 Club 带火，再后来成了 Rat Pack 那帮人的常点酒。',
  '加里波利': '大约 1960 年代流行起来，1986 年进 IBA 官方名单。名字来自意大利统一运动的加里波第将军：北边米兰的金巴利代表北方（也说红衫军），南边西西里的橙子代表南方，据说是在象征意大利的统一。',
  '哈维撞墙': '1969 年 Galliano 进口商 McKesson 做的一次营销推广，「Harvey 那个冲浪手」是广告里的角色；另一种说法是把一杯旧酒改了名字。1970 年代在美国非常流行。',
  '绿蚱蜢': '新奥尔良法国区 Tujague\'s 酒吧说 1918 年由老板 Philip Guichet 发明，1950–60 年代在美国南方流行起来。名字来自薄荷利口酒的绿色。',
  '性感沙滩': '这一条我也查不到可靠出处：维基百科的条目里没写来历，流传的说法互相矛盾（其中一种是 1987 年佛罗里达的一次调酒比赛），所以先空着，不编。',
  '贝里尼': '1934–1948 年之间，威尼斯 Harry\'s Bar 的创始人 Giuseppe Cipriani 做的，用白桃泥和 Prosecco。名字来自画家 Giovanni Bellini——酒的颜色让他想起他画里的粉色。',
  '汤姆柯林斯': '最早印出来的 Collins 配方是 1882 年 Harry Johnson 的酒书。1891 年英国一位医生写文章说这酒是英国人创的、还说是「John Collins」，同时代的杂志马上拆穿他引错了歌名——「到底谁是 Collins」这笔糊涂账从那时起就有了。',
  '阿佩罗橙光': 'spritz 这种做法来自 1800 年代哈布斯堡治下的威尼托：士兵嫌当地酒太烈，让店家「喷」一点水进去。阿佩罗 1919 年生于帕多瓦，1930 年代 spritz 开始配当地苦酒；现在这份配方（用 Prosecco 替掉静酒）是 1970 年代才定下来的。2019 年它是全球销量第九的鸡尾酒。',
  '杏仁酸': '1974 年由杏仁利口酒 Amaretto di Saronno 的进口商推出来，原版就是 2 份杏仁酒对 1 份柠檬汁；1980 年代流行，当时多数酒吧改用现成的 sour mix。2012 年 Jeffrey Morgenthaler 的版本（加波本和蛋清）又把它救回来一次。',
  '金Ricky': '1883 年华盛顿 Shoomaker\'s 酒吧，调酒师 George A. Williamson 给常客 Joe Rickey 上校的波本里挤了青柠；换成金酒的版本十年后流行起来，才成了金 Ricky。这杯几乎不加糖。',
  '神风': '等量伏特加、橙味利口酒和青柠汁。名字大概来自二战时日本那批「神风」自杀式攻击机。',
  '自由古巴': '20 世纪初的古巴。瓶装可口可乐 1900 年才进古巴，所以「美西战争时就有这杯」的说法站不住。名字是古巴独立运动的口号「自由的古巴」；百加得的广告人 Fausto Rodriguez 1965 年还出具过公证声明，说自己当年在场。',
  '螺丝刀': '二战期间在中国和土耳其的美国人把烈酒兑橙汁，就这么来的；「screwdriver」这个名字 1943–44 年出现在安卡拉。1950 年代伏特加在美国起飞，它跟着一起火。',
  '灰狗': '1930 年 Harry Craddock 的《Savoy Cocktail Book》里有一杯金酒配西柚的「grapefruit cocktail」；「Greyhound」这个名字最早见于 1945 年《Harper\'s》杂志（金酒 + 罐头西柚汁）。',
  '咸狗': '就是灰狗，杯口蘸了盐。传统上指金酒版，一般认为能追到 1920 年代。',
  '教父': '名字的来源没有定论。杏仁利口酒品牌 Disaronno 说这是马龙·白兰度（《教父》的主演）最喜欢的酒——这是品牌自己的说法，听听就好。',
  '教母': '教父的伏特加版。名字来源同样没有定论，流传的说法也来自 Disaronno 的品牌宣传。',
  '香槟鸡尾酒': '1862 年 Jerry Thomas 那本《The Bon Vivant\'s Companion》里已经有配方（他那版不放白兰地），被认为是美式经典版。',
  '含羞草': '来历不明，最早叫「champagne orange」。有人把它归给巴黎 Ritz 的调酒师 Frank Meier，但他 1934 年那本书里给自己的发明都标了记号，这杯偏偏没有；另一种说法指向 1940 年代的旧金山（把希区柯克扯了进来）。它和 1921 年出现的 Buck\'s Fizz 基本是同一杯。',
  'B-52': '来历没有可靠记载。一种说法是加拿大班夫泉酒店的调酒师 Peter Fich 做的，另一种说是纽约 Maxwell\'s Plum 的 Adam Honigman。名字来自那款轰炸机。',
  '蓝色泻湖': '巴黎 Harry\'s New York Bar 声称是他们发明的——一杯法国鸡尾酒：伏特加 + 蓝橙 + 柠檬水。',
  '天使之吻': '维基百科没有这一条的条目，我也查不到能核实的来历——按规矩不编，空着。',
  '皮姆杯': '皮姆这个牌子 1823 年由 James Pimm 开始做，本来想当餐后消化酒，结果大家都是当鸡尾酒喝。皮姆杯是它最出名的用法：加干姜水、黄瓜和薄荷。',
  '基尔': '原来叫 blanc-cassis，后来以第戎市长 Félix Kir（1876–1968）命名——战后当地的红酒被德军征用光了，就拿黑加仑利口酒兑白葡萄酒顶上。',
  '皇家基尔': '基尔的香槟版（黑加仑利口酒 + 香槟），同样得名于第戎市长 Félix Kir。'
};


var OPTIONAL_ING = {
  salt_water: 1,
  egg_white: 1,
  egg_yolk: 1,
  lemon_peel: 1,
  orange_peel: 1,
  cherry: 1,
  raspberry: 1,
  green_grape: 1,
  olive_brine: 1,
  rosemary: 1,
  cucumber: 1,
  clove: 1,
  cinnamon_stick: 1,
  star_anise: 1,
  cardamom: 1,
  black_pepper: 1
};

/* =========================================================
   调酒类型：谁跟谁能互相替

   配方写"干金酒"，你手上是植物学家——算不算"有"？分两层看：

     DRINK_TYPE   准确类型：伦敦干金 / 现代干金 / 老汤姆金酒……（给人看的名字也是它）
     TYPE_GROUP   可替换组：干金组 = 伦敦干金 + 现代干金（判断"算不算有"）

   规则（用户定的）：
     · 类型完全相同 → 有
     · 类型不同、同一组 → 有，但界面要标注"风味会不一样"
     · 不同组 → 缺

   几个关键决定（都是用户拍板的）：
     · 老汤姆、普利茅斯不进干金组——它们做金汤力不能算替；
     · 现代干金（植物学家、诺迪斯、猴王47、六、亨利爵士、添加利十号）
       进干金组，因为多数干金配方可以替，只是风味不同；
     · 金朗姆不能替白朗姆；卡莎莎单列（库里的分类挂在朗姆下，但配方写"朗姆酒"时不算它）；
     · 威士忌七类互相能替：波本 / 田纳西 / 黑麦 / 泥煤苏格兰 / 苏格兰 / 爱尔兰 / 日本；
     · 没列到的材料（利口酒、味美思、果汁、糖浆……）默认"自己是自己一类"，不跟别人换。
   ========================================================= */
var DRINK_TYPE = {
  /* 金酒 */
  gin: 'london_dry', tanqueray: 'london_dry', beefeater: 'london_dry', bombay: 'london_dry',
  hendricks: 'contemporary_dry', tanqueray10: 'contemporary_dry', roku: 'contemporary_dry',
  botanist: 'contemporary_dry', nordes: 'contemporary_dry', monkey47: 'contemporary_dry',
  old_tom: 'old_tom_gin', plymouth: 'plymouth_gin',
  /* 威士忌 */
  bourbon: 'bourbon', makers: 'bourbon', buffalo_trace: 'bourbon', wild_turkey: 'bourbon',
  jack: 'tennessee', rye: 'rye',
  laphroaig: 'peated_scotch', ardbeg10: 'peated_scotch', talisker: 'peated_scotch',
  jw_black: 'scotch', chivas12: 'scotch', glenlivet: 'scotch', glenfiddich: 'scotch',
  macallan: 'scotch', ballantines: 'scotch', jw_red: 'scotch', monkey: 'scotch',
  jameson: 'irish', kakubin: 'japanese_whisky',
  /* 朗姆 */
  rum: 'white_rum', havana3: 'white_rum', plantation3: 'white_rum',
  bacardi_oro: 'gold_rum', havana7: 'gold_rum', appleton: 'gold_rum',
  dark_rum: 'dark_rum', plantation_dark: 'dark_rum',
  captain: 'spiced_rum', cachaca: 'cachaca',
  /* 其他基酒 */
  vodka: 'vodka', grey_goose: 'vodka', smirnoff: 'vodka', belvedere: 'vodka', finlandia: 'vodka',
  tequila: 'tequila', patron: 'tequila', olmeca: 'tequila', donjulio: 'tequila',
  mezcal: 'mezcal',
  cognac: 'cognac', remymartin: 'cognac', keya: 'cognac',
  calvados: 'calvados', pisco: 'pisco', soju: 'soju', jiangxiaobai: 'baijiu', aquavit: 'aquavit'
};

var TYPE_NAME = {
  london_dry: '伦敦干金', contemporary_dry: '现代干金',
  old_tom_gin: '老汤姆金酒', plymouth_gin: '普利茅斯金酒',
  bourbon: '波本威士忌', tennessee: '田纳西威士忌', rye: '黑麦威士忌',
  peated_scotch: '泥煤苏格兰威士忌', scotch: '苏格兰威士忌',
  irish: '爱尔兰威士忌', japanese_whisky: '日本威士忌',
  white_rum: '白朗姆', gold_rum: '金朗姆', dark_rum: '黑朗姆',
  spiced_rum: '香料朗姆', cachaca: '卡莎莎',
  vodka: '伏特加', tequila: '龙舌兰', mezcal: '梅斯卡尔',
  cognac: '干邑', calvados: '苹果白兰地', pisco: '皮斯科',
  soju: '烧酒', baijiu: '白酒', aquavit: '阿夸维特'
};

/* 配方只写"金酒""朗姆酒""威士忌"（没指定品种）时，认哪些类型。
   注意几件用户定下的事：
     · 干金 = 伦敦干金 + 现代干金（植物学家、诺迪斯、猴王47、六、亨利爵士、添加利十号）；
     · 老汤姆、普利茅斯谁都不替，所以不在干金里；
     · 朗姆这里不含卡莎莎（配方写"朗姆酒"时不算它）；
     · 白朗姆和金朗姆虽然都算"朗姆酒"，但谁也不替谁——所以"能替"和"算同一类"是两回事。 */
var FAMILY_TYPES = {
  gin_dry: ['london_dry', 'contemporary_dry'],
  rum: ['white_rum', 'gold_rum', 'dark_rum', 'spiced_rum'],
  whisky: ['bourbon', 'tennessee', 'rye', 'peated_scotch', 'scotch', 'irish', 'japanese_whisky']
};
var FAMILY_NAME = { gin_dry: '干金酒', rum: '朗姆酒', whisky: '威士忌' };
var FAMILY_CAT = { gin_dry: 'gin', rum: 'rum', whisky: 'whisky' };

/* 同大类里"能互相替、但风味会不一样"的类型——界面会标注。
   目前只有威士忌七类：用户原话是"威士忌酸用波本还是苏格兰都能做，但要标注一下"。
   其他类型只认自己：金朗姆替不了白朗姆，老汤姆替不了干金。 */
var TYPE_SWAP = {
  bourbon: 'whisky', tennessee: 'whisky', rye: 'whisky', peated_scotch: 'whisky',
  scotch: 'whisky', irish: 'whisky', japanese_whisky: 'whisky'
};

/* 口味偏好：该多浓是口味问题，不是客观事实，所以由你来定 */
var TASTES = [
  { id: 'light', name: '清淡', lo: 3.5, hi: 8, out: 14, note: '沙瓦、养乐多烧酒那种，喝着像饮料' },
  { id: 'normal', name: '标准', lo: 7, hi: 26, out: 42, note: '正经一杯鸡尾酒的浓度，古典、酸、高球都算' },
  { id: 'strong', name: '浓烈', lo: 15, hi: 45, out: 62, note: '重酒感，马天尼、锈钉、纯饮' }
];

/* 评分权重方案——交给用户选。

   这四个分项是：平衡 / 复杂度 / 结构 / 浓度。
   "口味（清淡 / 标准 / 浓烈）"只管【浓度】这一项，
   所以浓度的权重一变，口味对总分的影响力就跟着变——
   选「只看度数」时口味影响最大，选「只看味道」时几乎没有影响。

   权重不是拍脑袋定的：每一版都量过各分项在实际配方上的波动范围，
   再看它们各自对总分的最大影响，尽量让每一项都有存在感。 */
var SCORING_SCHEMES = [
  { id: 'balanced', name: '均衡',
    w: { balance: 0.38, complexity: 0.32, structure: 0.22, strength: 0.08 },
    note: '默认：味道为主，做法次之，度数只是浮动' },
  { id: 'taste', name: '只看味道',
    w: { balance: 0.56, complexity: 0.34, structure: 0.06, strength: 0.04 },
    note: '不在乎杯子、冰和气泡，只问好不好喝——平衡和香气占 90%' },
  { id: 'aroma', name: '香气优先',
    w: { balance: 0.40, complexity: 0.38, structure: 0.14, strength: 0.08 },
    note: '香气的分量几乎和平衡一样重，做法让位' },
  { id: 'craft', name: '做法优先',
    w: { balance: 0.38, complexity: 0.20, structure: 0.34, strength: 0.08 },
    note: '在意冰、杯子、气泡和稀释——按吧台的标准挑毛病（平衡仍然第一）' },
  { id: 'strength', name: '度数优先',
    w: { balance: 0.42, complexity: 0.20, structure: 0.12, strength: 0.26 },
    note: '关心浓淡对不对口——"口味"的影响比默认方案大 3 倍（平衡仍然第一）' }
];

/* 经典配方按"家族"分组——这是调酒师组织配方的方式。
   原来的分法（两样材料 / 三样材料 / 四样以上）是给新手看的进度，
   现在这个工具是给要动手调酒的人用的，按家族分更有用：
   想知道"再加点酸会怎样"，就直接看酸类那一组。 */
/* =========================================================
   预设和酒单的关系

   原来调酒台里挂着 44 个经典配方，酒单里又有 191 款——重复了 33 款。
   现在分工：调酒台只管工具，配方全在酒单。

   · HOUSE_PRESETS  —— 只有我们这儿有的 11 款，进酒单的「住处特调」栏。
     为什么是这 11 款：9 款是便利店/住处路线（维他柠檬茶、养乐多烧酒、可尔必思沙瓦…），
     另外金汤力和热托蒂正好是那 191 款里没有的两杯经典。
   · REF_PRESET_MAP —— 两边都有的 33 款。key 是酒单里的名字，value 是我们预设的名字。
     有了这张表，酒单点开这些酒时用的是我们**调好的量和备注**，
     而不是参考数据里那份生料（水牛足迹波本 + 柠檬酸溶液 + 1:1糖浆…）。
   ========================================================= */
var HOUSE_PRESETS = ['威士忌高球', '维他柠檬茶微醺', '威士忌乌龙', '姜味骡子', '热托蒂',
  '威士忌可乐', '浓缩柠檬高球', '金汤力', '养乐多烧酒', '可尔必思沙瓦', '芒果朗姆'];

var REF_PRESET_MAP = {
  '威士忌酸': '威士忌酸', '古典鸡尾酒': '古典', '盘尼西林': '青霉素', '生锈钉': '锈钉',
  '教父': '教父', '爱尔兰咖啡': '爱尔兰咖啡', '罗布罗伊': '罗伯罗伊', '血与沙': '血与沙',
  '花花公子': '花花公子', '淘金热': '淘金热', '薄荷朱丽普': '薄荷朱丽普', '纽约': '纽约',
  '8区': '八区', '榛子酸': '榛子酸', '萨泽拉克': '萨泽拉克', '马天尼': '干马天尼',
  '尼格罗尼': '尼格罗尼', '莫吉托': '莫吉托', '自由古巴': '自由古巴', '玛格丽特': '玛格丽特',
  '大都会': '大都会', '黑俄罗斯': '黑俄罗斯', '法国情怀': '法国情怀', '马颈': '马颈',
  '加里波利': '加里波利', '螺丝刀': '螺丝刀', '黛绮莉': '黛绮莉', '蜂之膝': '蜂之膝',
  '吉姆雷特': '吉姆雷特', '神风': '神风', '美国佬': '美国佬',
  '汤米家的玛格丽特': '汤米家的玛格丽特', '椰林飘香': '椰林飘香'
};

var PRESET_FAMILIES = [
  { id: 'highball', name: '高球 · 长饮', note: '气泡撑起来的，度数低、喝得久' },
  { id: 'sour',     name: '酸类',       note: '酒 + 酸 + 甜，摇匀就成' },
  { id: 'spirit',   name: '烈酒向',     note: '搅拌、几乎全是酒，慢慢喝' },
  { id: 'hot',      name: '热饮',       note: '不用冰，冬天喝' }
];

/* 基酒内部的分组（六大基酒 + 其他）。
   材料库在「基酒」分类下按这个顺序显示小标题，就不用在一长串里找了。 */
var BASE_GROUPS = [
  { id: 'whisky', name: '威士忌' },
  { id: 'gin', name: '金酒' },
  { id: 'rum', name: '朗姆' },
  { id: 'vodka', name: '伏特加' },
  { id: 'tequila', name: '龙舌兰' },
  { id: 'brandy', name: '白兰地' },
  { id: 'other', name: '其他' }
];
