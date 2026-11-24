# Deskline

在和屏幕一样大的画布上写可拖动的文字，再换成 Mac 桌面。页面放在 Cloudflare 上；换壁纸时，浏览器把图交给这台 Mac 上的一个小助手。

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

- 顶栏用下拉框切换中文或 English。单词卡的释义会跟着变成中文或英文。
- 单击一块文字后拖动；右下角可以拉宽。双击进入编辑。
- 选中文字后可以加粗、斜体、下划线，也可以改字色、底色、对齐和卡片底。
- 左侧用一个下拉框选屏幕尺寸。「初中 1500」有 1500 个词，「高中 2000」是另外 2000 个词，不包含初中那 1500 个。文本编辑在左侧下方。
- 底部缩略图，或键盘左右键，切换 50 张背景。右侧是当前画面。
- 点「更换屏幕」把当前画面设为桌面。助手没开时会改为下载图片。
- 「下载」只保存 PNG。在访达里对图片按住 Control 点一下，选择「设定桌面图片」。

文字保存在这台浏览器里，刷新还在。

Cloudflare 上的页面改不了 macOS 桌面。一键更换需要本机助手先开着：

```bash
python3 helper.py
```

也可以双击 `start.command`。窗口要保持开着，它只监听 `127.0.0.1:47321`。第一次更换时如果系统询问授权，请允许。

## 背景图

图片和清单都在 `backgrounds/`。新增一张图时，把文件放进这个目录，并在 `backgrounds/manifest.json` 里写上文件名和中英文名称，然后重新发布。支持 jpg、png、webp、gif、avif。

单词卡数据在 `words.json`。释义和音标改编自 ECDICT（MIT），许可全文见 `words.LICENSE`。
