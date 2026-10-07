# 怎么把它发布到互联网上

## 先搞清楚它是什么

这个网站是**纯静态**的：没有后端、没有数据库、不用登录、不收集任何数据，一个 HTML 文件就是一个网站。所以：

- **任何静态托管都能跑，不需要买服务器**
- **免费额度足够用**（页面才 173 KB，一个月一万人访问也不会有压力）
- **不需要备案**——只要你用托管商提供的默认域名（`xxx.pages.dev` 这种）。想绑自己的域名，在国内才需要备案

## 要上传什么

先打包：

```bash
node tools/build.js
```

把 `dist/` 整个文件夹传上去。里面是：

| 文件 | 作用 |
| --- | --- |
| `index.html` | 网站本体，**入口必须叫这个名字**，173 KB 单文件 |
| `icon-192.png` / `icon-512.png` | 手机加到桌面时的图标 |
| `manifest.webmanifest` | 让手机能把它当 App 装（全屏、没地址栏、离线可用） |
| `.nojekyll` | GitHub Pages 需要它，别的平台用不到也不碍事 |
| `调酒台.html` | 发给别人用的单文件版，托管时可以不传 |

---

## 路线一：拖拽上传（最快，5 分钟）

不用注册、不用命令行，适合先试试。

1. 打开 [app.netlify.com/drop](https://app.netlify.com/drop)
2. 把整个 `dist` 文件夹**拖进页面**
3. 等十几秒，它给你一个 `https://xxxx.netlify.app` 的网址
4. 这个网址就能发给别人了

**Cloudflare Pages** 也有同样的拖拽入口（[pages.cloudflare.com](https://pages.cloudflare.com) → Create → Upload assets），国内访问通常比 Netlify 稳一点。

> 缺点：拖拽上传的版本，以后改了内容要**重新拖一遍**。

> Netlify / Cloudflare 都可以免费注册一个账号把拖上去的站点"认领"下来——认领之后网址是固定的，不然过一段时间会被回收。**这一步值得做**，否则你发出去的链接可能几十天后就失效了。

---

## 路线二：Git + 自动部署（推荐长期用）

一次配置好，以后改完只要 `git push`，网站自己更新。

### 1. 把文件推到 GitHub

在 GitHub 新建一个仓库（公开或私有都行），然后在项目目录：

```bash
git init
git add .
git commit -m "第一版"
git branch -M main
git remote add origin https://github.com/你的用户名/仓库名.git
git push -u origin main
```

### 2. 接一个自动部署

三选一：

| 平台 | 怎么做 | 国内速度 |
| --- | --- | --- |
| **Cloudflare Pages** | Dashboard → Workers & Pages → Create → Pages → 连 GitHub 仓库，构建命令留空，输出目录填 `dist` | 一般偏好 |
| **Vercel** | [vercel.com](https://vercel.com) → Add New → Project → 导入仓库，同样把输出目录设成 `dist` | 时快时慢 |
| **GitHub Pages** | 仓库 Settings → Pages → Source 选 `main` 分支 + `/dist` 目录 | 时快时慢 |

配好之后，每次 `git push` 它自动重新发布，一两分钟后网址就是新的。

> ⚠️ **输出目录一定填 `dist`**，不是仓库根目录——根目录里的 `index.html` 是开发用的（它引用外部的 `app.css` / `data.js` / `app.js`），必须有那三个文件才能真正跑起来。`dist/index.html` 才是自包含的成品。

---

## 路线三：国内云存储（国内访问最稳）

腾讯云 COS 或阿里云 OSS 的"静态网站托管"，用它们给的默认域名，**不用备案**：

1. 开通对象存储，新建一个存储桶（权限设为**公有读**）
2. 开启「静态网站」功能，索引文档填 `index.html`
3. 把 `dist/` 里的文件全部上传
4. 控制台会给你一个访问地址，直接用

有免费额度，超出按量计费，这种小页面基本花不了钱。

---

## 发布之后

### 手机上变成真 App

用手机浏览器打开你的网址 → 分享菜单 → **添加到主屏幕**。

因为已经配了 PWA 清单和图标，加完之后：

- 桌面图标是你自己的杯子图标，不是网页截图
- 点开是全屏的，没有浏览器地址栏
- **断网也能用**（整个页面自包含，没有任何外部请求）

### 更新流程

```bash
# 改完 index.html / app.css / data.js / app.js 里的任何一个
node tools/build.js          # 重新生成 dist
node tools/audit.js          # 顺手跑一遍复查（可选，但推荐）
```

> 这台机器上只装了 `node`，**没有装 npm**，所以下面一律用 `node xxx.js` 的写法。
> `package.json` 是给云端 CI 和装了完整 Node 的人用的（那样可以 `npm run verify`），
> 没有它也不影响任何事。

---

## 后续更新怎么同步上去

**这取决于你选了哪条路线，差别很大：**

| 路线 | 后续更新 | 要不要手动操作 |
| --- | --- | --- |
| ① 拖拽上传 | ❌ **不能同步**。每次改完都要重新拖一遍 `dist` | 每次都要 |
| ② Git + 自动部署 | ✅ **改完推一下，网站自己更新** | 三条命令 |
| ③ 云存储 | ⚠️ 要重新上传；也可以装 `coscmd` / `ossutil` 用命令行同步 | 每次都要 |

### 路线②的日常（推荐）

配好一次之后，以后每次更新就这三条：

```bash
git add -A
git commit -m "改了点什么"
git push
```

推上去之后，**云端会自己跑一遍自检、重新打包、再发布**（配置在 `.github/workflows/pages.yml`）。

**而且它带一道闸门：自检不通过就不发布。** 也就是说，万一哪天改坏了，线上会停留在上一个能用的版本，不会出现"打开是一片空白"。这是本地手动上传给不了的保障。

### 用 Cloudflare Pages / Vercel 的话

它们没有 `.github/workflows/` 这一套，而是在面板里填两个框：

| 框 | 填什么 |
| --- | --- |
| Build command | `node tools/build.js` |
| Output directory | `dist` |

填好之后，同样是 `git push` 就自动更新，行为跟 GitHub Actions 那条一样（区别是它不跑自检——想加的话把 Build command 改成 `node self-check.js && node tools/audit.js && node tools/build.js`）。

### 路线①的日常（拖拽上传的代价）

每次改完：

```bash
node tools/build.js
```

然后把整个 `dist` 文件夹重新拖到 Netlify / Cloudflare 的页面上，覆盖原来的。

麻烦，但**只有这一条路是完全不用注册账号的**——适合"我就发一次给人看"。

### 只想更新发给朋友的单个文件

不管走哪条路线，直接发人用的一直是 `dist/调酒台.html` 这一个文件。重新生成之后，把新的发过去覆盖旧的就行——**不用重新发链接，因为文件是自包含的**。

### 域名

想用自己的域名：

- **国外托管**（Netlify / Cloudflare / Vercel / GitHub Pages）：直接在面板里绑，免费，不用备案
- **国内托管**（腾讯云 / 阿里云）：绑自定义域名**需要备案**，流程大概两三周

不想折腾就先用它们给的默认域名，功能完全一样。

---

## 发布前检查清单

- [ ] `node tools/build.js` 最后一行是「跑起来：配方卡 44 张、杯型 7 个……✓」
- [ ] 上传的入口文件叫 `index.html`（不是 `调酒台.html`）
- [ ] 传的是 `dist/` 里的内容，不是项目根目录
- [ ] 手机打开看一眼：材料库有分类标签、配方卡能点、杯子预览能画出来
- [ ] 点一下「添加到主屏幕」，图标是你的杯子、点开是全屏

## 一个提醒

这个页面里**没有任何统计代码**——不埋点、不收集设备信息、不发请求。谁访问了、看了什么，你都看不到，别人也看不到。如果你以后想加访问统计（比如 Cloudflare Web Analytics，免费且不收集个人信息），那是另一个决定，加之前值得先想清楚。
