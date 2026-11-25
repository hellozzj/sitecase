# SiteCase — iPad 本地 HTML 案例库（纯 PWA）

把存放在 iPad「文件」App 里的 HTML 文件导入进来，离线浏览。纯静态实现：无构建步骤、无依赖、无后端。

## 功能

- **导入**：点「导入 HTML」→ 系统「文件」选择器 → 支持多选
- **去重**：按「文件名 + 修改时间」判断——没变的跳过，改过的更新，新文件新增
- **查看**：sandbox iframe 渲染（HTML 内的脚本可运行，但访问不到案例库数据）
- **删除**：查看界面右上角「删除」
- **离线**：Service Worker 缓存应用外壳；案例内容存 IndexedDB，断网全功能可用
- **持久化**：首次导入后自动请求 `navigator.storage.persist()`

## 目录结构

```
sitecase/
├── index.html            # 应用外壳
├── styles.css            # 深色主题 / iPad 响应式 / 安全区适配
├── app.js                # 导入、去重、列表、查看器、IndexedDB
├── sw.js                 # Service Worker（离线缓存）
├── manifest.webmanifest  # PWA 清单
├── icons/                # 占位图标（180/192/512）
└── tools/make_icons.py   # 图标生成脚本（可替换为正式设计）
```

## 本地运行（Mac 上开发调试）

```bash
cd sitecase
python3 -m http.server 8000
# 浏览器打开 http://localhost:8000
```

注意：Service Worker 只在 HTTPS 或 localhost 下注册。局域网 IP（http://192.168.x.x）打开时
应用功能正常，只是没有离线缓存。

## 部署（任选其一，均免费）

- **Cloudflare Pages**：Dashboard → Create project → Direct Upload，把 `sitecase/` 目录拖进去
- **Netlify**：app.netlify.com → Deploy manually，拖目录
- **Vercel / GitHub Pages**：常规静态站点方式

部署后得到一个 HTTPS 网址。

## iPad 上「安装」

1. 用 **Safari** 打开部署后的网址
2. 点分享按钮 → **「添加到主屏幕」** → 确定
3. 主屏幕出现 SiteCase 图标，点开全屏运行，离线可用

## 已知限制（iOS 沙箱决定）

- 只能从应用内导入；不能在「文件」App 里「用此应用打开」，也没有「分享到 PWA」
- 选文件是**复制内容**，不是引用：原文件后来改了，需重新导入更新
- 单文件 HTML 效果最好；依赖外部 CSS/图片（相对路径）的 HTML 会缺资源
  （建议用 SingleFile 之类的工具存成单文件）

## 更新应用

改完文件重新部署即可，用户下次打开时 Service Worker 自动取新版本，无需任何审核。
