# 留白博客

使用 TypeScript 与 Next.js 构建的静态 Markdown 博客。文章在构建时从 `content/posts/` 读取，因此可直接部署到 GitHub Pages，不需要数据库或运行中的后端服务。

## 开发

1. 安装依赖：`npm ci`
2. 启动开发服务器：`npm run dev`
3. 打开终端显示的本地地址。

执行 `npm run build` 会在 `out/` 生成可静态托管的站点。

## 写文章

在 `content/posts/` 新建 `英文短横线文件名.md`。复制 `_TEMPLATE.md` 的 Front Matter；`title` 可省略，此时首个 `# 标题` 会作为文章标题且不会在正文重复。

正文首个段落会自动获得 `lead` 样式：首字下沉，英文首字母转为大写。以 `_` 开头的 Markdown 文件不会被发布，因此模板可以安全留在内容目录内。

## GitHub Pages 部署

推送到 `main` 会触发 `.github/workflows/pages.yml`：先构建验证，再发布 `out/` 到 GitHub Pages。首次使用时，在仓库 **Settings → Pages → Build and deployment** 中选择 **GitHub Actions**。

如需由工作流自动启用 Pages，在仓库 Secrets 中配置 `PAGES_ENABLEMENT_TOKEN`。该 token 需要 Pages 写入和仓库管理权限；未配置时，按上述设置手动启用一次即可。

工作流默认按项目站点地址 `https://<owner>.github.io/<repository>/` 生成资源路径；仓库名为 `<owner>.github.io` 时会自动使用根路径。自定义域名可在仓库 Variables 中设置 `GITHUB_PAGES_ROOT=true`；若需要其他前缀，则设置 `NEXT_PUBLIC_BASE_PATH`，例如 `/blog`。
