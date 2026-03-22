# assets-store-mcp

## 项目说明

Vercel Blob 存储的 MCP server，供 AI 管理个人媒体文件（图片、音视频等）。

绑定的 Vercel 项目：`stringzhao-assets-store`（`daniel21436-9089s-projects` team）

## 开发

```bash
npm run dev     # 开发模式（tsx，无需构建）
npm run build   # 编译 TypeScript → dist/
```

## 发布

打 tag 自动触发 GitHub Actions 发布到 npm（OIDC，无需 NPM_TOKEN secret）：

```bash
npm version patch   # 或 minor / major
git push --follow-tags
```

## MCP Tools

| Tool | 说明 |
|------|------|
| `assets_upload` | 上传本地文件，返回公开 URL |
| `assets_list` | 列出文件，支持 prefix 过滤和分页 |
| `assets_head` | 获取文件元信息（大小、类型、上传时间） |
| `assets_delete` | 批量删除文件（传 URL 数组） |
| `assets_copy` | 复制文件到新路径 |

## 类型注意

- `PutBlobResult`（`put()` 返回值）：有 `url`, `pathname`, `contentType`，**无 `size`**
- `ListBlobResultBlob`（`list()` 返回值）：有 `url`, `pathname`, `size`, `uploadedAt`，**无 `contentType`**
- `HeadBlobResult`（`head()` 返回值）：有 `url`, `pathname`, `size`, `contentType`, `uploadedAt`
