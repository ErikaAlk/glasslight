# Glasslight 洱海改版

面向一加平板 2 Pro、Arch Linux ARM 与 GNOME Shell 51 的应用启动台，基于 [eliotBenitez/glasslight](https://github.com/eliotBenitez/glasslight) `0c3515ef2ed956c765b5ab14832a0df596445dbc`，改版版本为 `22-erhai.3`。

## 操作

- `Super+A` 或 Dock 的应用按钮打开应用目录，`Ctrl+Alt+Space` 打开搜索。
- 长按应用约 200 毫秒后拖动，创建文件夹或移动到已有文件夹。
- 使用“整理”、`F2`、移动、全选与保存名称操作管理应用；文件夹保存在本机 GSettings 中。
- `Esc` 逐层取消移动、清除搜索、退出整理、返回主页和关闭启动台。支持键盘焦点与中文输入法。
- 上游文件搜索、计算、系统操作与剪贴板功能保留；剪贴板历史默认关闭。输入搜索文字不会发送网络请求，选择网页搜索结果才会打开浏览器。

## 加载玻璃外观

依赖 [Lintel 洱海改版](https://github.com/ErikaAlk/lintel)、Blur my Shell 77 和 `erhai-motion@erhai.local`。完整安装、启用与停用命令见 [Arch 可选外观](https://github.com/ErikaAlk/onepluspad-2pro-Arch/blob/main/docs/APPEARANCE.zh-CN.md)。

精调材质随 Arch 仓库 `arch/appearance/` 一起保存：饱和度 `1.05`、折射模糊半径 `14`、色散 `0.03`、高光强度 `0.10`、噪点 `0.025`、圆角平滑度 `0.6`，并保留完整着色器和动态明暗采样实现。启动台沿用实时 GPU 背景捕获、折射、模糊与连续圆角；文字和图标独立绘制。屏幕键盘、可用显示区域与 GNOME 减少动态设置继续生效。

加载顺序为 Blur my Shell → Lintel → erhai-motion → Glasslight。新装和更新 JavaScript 后需要退出 GNOME 并重新登录。

## 打包与检查

需要 Bash、Python、gettext、glib2、zip 与 unzip。

```sh
bash package-erhai.sh "$PWD/dist"
gjs -m tests/folders.test.js
```

输出 `dist/glasslight-erhai.shell-extension.zip`，脚本严格编译 schema 与翻译，并核对 ZIP 中的模块和资源。

本机此前已验证 1280×720 交互、日常 GNOME 会话、文件夹持久保存、真实中文输入法候选与触控提交。屏幕阅读器、系统字体缩放和全部主题组合尚未验证。本次源码发布保持既有界面和材质实现，未重新操作平板。

保留上游版权与 [GPL-3.0 许可证](LICENSE)。`kimpanel-shell-entry.patch` 与 `kimpanel-candidate-touch.patch` 用于本项目的 kimpanel 输入法配置；使用该输入法时按配套说明应用。
