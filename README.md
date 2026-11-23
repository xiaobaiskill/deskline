# Deskline

在和屏幕一样大的画布上写可拖动的文字，再下载成壁纸。适合把正在记的英语留在桌面上。页面是静态的，用 Cloudflare Workers 或 Pages 发布，不需要自己的服务器。

## 本地预览

```bash
npx wrangler dev
```

终端里会给出本地地址。不要直接双击 `index.html`，否则读不到背景清单。

## 发布

Worker（`workers.dev` 或已绑定的域名）：

```bash
npx wrangler deploy
```

Pages：

```bash
npx wrangler pages deploy . --project-name deskline
```

也可以在 Cloudflare 控制台把这个仓库接到 Pages。构建命令留空，输出目录填 `/`。

## 使用

- 单击一块文字后拖动；右下角可以拉宽。双击进入编辑。
- 选中词语后可以加粗、斜体、下划线，也可以改字色和底色。字号作用于整块文字。
- 画面两侧的箭头，或键盘左右键，切换背景。
- 点「下载壁纸」得到和当前屏幕一样大的 PNG。在访达里对图片按住 Control 点一下，选择「设定桌面图片」。

文字保存在这台浏览器里，刷新还在。

网页不能直接改 macOS 桌面，所以没有服务端去调用系统设置。

## 背景图

图片和清单都在 `backgrounds/`。新增一张图时，把文件放进这个目录，并把它的文件名写进 `backgrounds/manifest.json`，然后重新发布。支持 jpg、png、webp、gif、avif。
