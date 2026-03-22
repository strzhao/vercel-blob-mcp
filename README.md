# assets-store-mcp

MCP server for managing personal assets (images for blog posts, articles, etc.) in [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) storage.

## Tools

| Tool | Description |
|------|-------------|
| `assets_upload` | Upload a local file to your personal assets store, returns public URL |
| `assets_list` | List files with optional prefix filter and pagination |
| `assets_head` | Get metadata of an asset (size, content type, upload time) |
| `assets_delete` | Delete one or more assets by URL |
| `assets_copy` | Copy an asset to a new path |

## Setup

### 1. Get your Blob token

Go to your Vercel dashboard → Storage → your Blob store → `.env.local` tab, and copy the `BLOB_READ_WRITE_TOKEN`.

### 2. Configure in Claude Code

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "assets-store": {
      "command": "npx",
      "args": ["-y", "assets-store-mcp"],
      "env": {
        "BLOB_READ_WRITE_TOKEN": "your_token_here"
      }
    }
  }
}
```

## Development

```bash
npm install
npm run dev      # Run with tsx (no build needed)
npm run build    # Compile TypeScript
```

## Publishing

Tag a release to trigger automatic npm publish via GitHub Actions (OIDC, no token secret needed):

```bash
npm version patch   # or minor / major
git push --follow-tags
```
