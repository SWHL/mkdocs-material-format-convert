# MkDocs Material Markdown Converter

一个可部署到 GitHub Pages 的纯前端小工具，用于把 Material for MkDocs 扩展 Markdown 语法降级为更通用的 Markdown。转换在浏览器本地完成，不上传文档内容。

页面内置 Markdown 预览视图，可在转换结果和渲染预览之间切换检查。

## 支持范围

当前转换规则主要覆盖 Material for MkDocs 官方参考中最常见、最影响迁移的语法：

- YAML front matter：`title` 转为 H1，`description/summary` 转为引用摘要，日期、标签、作者等转为元信息列表。
- `<!--more-->`：移除博客摘要分隔符。
- Admonitions / details：`!!! note`、`??? warning` 转为 blockquote。
- Content tabs：`=== "Tab"` 转为普通 Markdown 标题。
- Attribute lists / buttons：保留链接、图片和正文，移除 `{ .md-button }`、`{ width="..." }` 等属性。
- Annotations：正文 `(1)` 标记转为 `[1]`，代码行末 `(1)!` 注释标记移除。
- Icons / emojis：默认移除 `:material-*:`、`:fontawesome-*:`、`:octicons-*:`、`:simpleicons-*:`，可选移除所有 shortcode。
- Grid / cards / figure / captions：展开包装，保留内部 Markdown 和说明文字。
- Pymdownx formatting / keys：高亮、critic markup、键盘组合等降级为常见 Markdown 表达。
- Snippets：`--8<-- "file.md"` 无法在浏览器读取本地文件，会转为注释占位。

参考：

- [Material for MkDocs Reference](https://squidfunk.github.io/mkdocs-material/reference/)
- [Admonitions](https://squidfunk.github.io/mkdocs-material/reference/admonitions/)
- [Content tabs](https://squidfunk.github.io/mkdocs-material/reference/content-tabs/)
- [Annotations](https://squidfunk.github.io/mkdocs-material/reference/annotations/)
- [Buttons](https://squidfunk.github.io/mkdocs-material/reference/buttons/)
- [Formatting](https://squidfunk.github.io/mkdocs-material/reference/formatting/)
- [Icons, Emojis](https://squidfunk.github.io/mkdocs-material/reference/icons-emojis/)

## 本地使用

直接打开 `index.html` 即可使用。也可以用任意静态服务器打开仓库根目录。

运行测试：

```bash
npm test
```

## GitHub Pages 部署

仓库已经包含 `.github/workflows/pages.yml`。推送到 `main` 或 `master` 后，在 GitHub 仓库设置中把 Pages 的 Source 设为 `GitHub Actions`，workflow 会自动发布静态页面。

## 文件结构

- `index.html`：静态页面入口。
- `styles.css`：页面样式。
- `converter.js`：转换器核心，浏览器和 Node 测试共用。
- `app.js`：页面交互。
- `tests/converter.test.js`：无依赖 Node 测试。
