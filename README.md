# 拼豆像素编辑器

一个可部署到 GitHub Pages 的静态拼豆工程编辑器 MVP。

## 当前能力

- 导入 JPG、PNG、WebP 图片。
- 按目标格数生成拼豆像素网格。
- 使用国内玩家常用色卡样例：MARD、COCO、漫漫、盼盼、咪小窝。
- 支持画笔、橡皮、吸管、填充、撤销、重做。
- 支持色卡禁用、全局替换颜色、材料清单。
- 支持像素、蓝图、分板、制作步骤、原图视图。
- 支持保存和打开 `.pindou` 工程文件。
- 支持导出 PNG 蓝图和制作步骤 JSON。
- 提供 WebDAV 单文件同步入口。
- 桌面和手机响应式布局。

## 本地使用

推荐通过静态服务器打开：

```bash
python -m http.server 8000
```

然后访问 `http://localhost:8000/`。

## 验证

```bash
npm run check
npm test
```

## GitHub Pages 发布

仓库包含 `.github/workflows/pages.yml`。推送到 `main` 或 `master` 后，GitHub Actions 会：

1. 检查 JavaScript 语法。
2. 运行核心测试。
3. 打包静态文件到 Pages artifact。
4. 部署到 GitHub Pages。

首次发布前，在 GitHub 仓库的 `Settings -> Pages` 中将构建来源设为 `GitHub Actions`。

## 说明

当前 `.pindou` 是 JSON 格式 MVP，扩展名和数据结构已为后续 ZIP 容器版本预留。色卡数据是可运行样例，不应视为厂商官方完整色卡。
