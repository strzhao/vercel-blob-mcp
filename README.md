# vercel-blob-mcp

MCP server for managing personal media files (images, audio, video, etc.) in [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) storage.

## Tools

| Tool | Description |
|------|-------------|
| `blob_upload` | Upload a local file to Vercel Blob, returns public URL |
| `blob_list` | List files with optional prefix filter and pagination |
| `blob_head` | Get metadata of a blob (size, content type, upload time) |
| `blob_delete` | Delete one or more blobs by URL |
| `blob_copy` | Copy a blob to a new path |

## Setup

### 1. Get your Blob token

Go to your Vercel dashboard → Storage → your Blob store → `.env.local` tab, and copy the `BLOB_READ_WRITE_TOKEN`.

### 2. Configure in Claude Code

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "vercel-blob": {
      "command": "npx",
      "args": ["-y", "vercel-blob-mcp"],
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

Tag a release to trigger automatic npm publish via GitHub Actions:

```bash
npm version patch   # or minor / major
git push --follow-tags
```

> **Note:** Add `NPM_TOKEN` to GitHub repo Settings → Secrets and variables → Actions before the first publish.
