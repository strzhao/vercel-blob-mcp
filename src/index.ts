#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { put, list, head, del, copy } from "@vercel/blob";
import { readFile } from "fs/promises";
import { basename } from "path";

function getToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN environment variable is not set");
  }
  return token;
}

const server = new Server(
  {
    name: "vercel-blob-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const tools = [
  {
    name: "blob_upload",
    description: "Upload a local file to Vercel Blob storage and return the public URL",
    inputSchema: {
      type: "object",
      properties: {
        localPath: {
          type: "string",
          description: "Absolute path to the local file to upload",
        },
        pathname: {
          type: "string",
          description: "Optional storage path/filename in the blob store (e.g. 'images/photo.jpg'). Defaults to the original filename.",
        },
      },
      required: ["localPath"],
    },
  },
  {
    name: "blob_list",
    description: "List files in Vercel Blob storage with optional prefix filtering and pagination",
    inputSchema: {
      type: "object",
      properties: {
        prefix: {
          type: "string",
          description: "Optional path prefix to filter results (e.g. 'images/', 'videos/2024/')",
        },
        cursor: {
          type: "string",
          description: "Pagination cursor from a previous list call to get the next page",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 1000, max: 1000)",
        },
      },
      required: [],
    },
  },
  {
    name: "blob_head",
    description: "Get metadata of a specific blob by its URL (size, content type, upload time, etc.)",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The Vercel Blob URL of the file",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "blob_delete",
    description: "Delete one or more blobs from Vercel Blob storage",
    inputSchema: {
      type: "object",
      properties: {
        urls: {
          type: "array",
          items: { type: "string" },
          description: "Array of Vercel Blob URLs to delete",
        },
      },
      required: ["urls"],
    },
  },
  {
    name: "blob_copy",
    description: "Copy a blob to a new path in Vercel Blob storage",
    inputSchema: {
      type: "object",
      properties: {
        fromUrl: {
          type: "string",
          description: "Source Vercel Blob URL to copy from",
        },
        toPathname: {
          type: "string",
          description: "Destination path/filename in the blob store (e.g. 'images/copy.jpg')",
        },
      },
      required: ["fromUrl", "toPathname"],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const token = getToken();

    switch (name) {
      case "blob_upload": {
        if (!args || typeof args.localPath !== "string") {
          throw new Error("localPath is required and must be a string");
        }

        const fileBuffer = await readFile(args.localPath);
        const filename = typeof args.pathname === "string" && args.pathname
          ? args.pathname
          : basename(args.localPath);

        const blob = await put(filename, fileBuffer, {
          access: "public",
          token,
        });

        return {
          content: [
            {
              type: "text",
              text: [
                "File uploaded successfully!",
                `URL: ${blob.url}`,
                `Pathname: ${blob.pathname}`,
                `Content Type: ${blob.contentType}`,
              ].join("\n"),
            },
          ],
        };
      }

      case "blob_list": {
        const options: Record<string, unknown> = { token };
        if (typeof args?.prefix === "string") options.prefix = args.prefix;
        if (typeof args?.cursor === "string") options.cursor = args.cursor;
        if (typeof args?.limit === "number") options.limit = args.limit;

        const result = await list(options as Parameters<typeof list>[0]);

        const lines = [
          `Found ${result.blobs.length} file(s)${result.hasMore ? " (more available)" : ""}:`,
          "",
          ...result.blobs.map((b) =>
            `• ${b.pathname} (${b.size} bytes)\n  URL: ${b.url}\n  Uploaded: ${b.uploadedAt}`
          ),
        ];

        if (result.hasMore && result.cursor) {
          lines.push("", `Next cursor: ${result.cursor}`);
        }

        return {
          content: [{ type: "text", text: lines.join("\n") }],
        };
      }

      case "blob_head": {
        if (!args || typeof args.url !== "string") {
          throw new Error("url is required and must be a string");
        }

        const result = await head(args.url, { token });

        return {
          content: [
            {
              type: "text",
              text: [
                `Pathname: ${result.pathname}`,
                `URL: ${result.url}`,
                `Size: ${result.size} bytes`,
                `Content Type: ${result.contentType}`,
                `Uploaded At: ${result.uploadedAt}`,
              ].join("\n"),
            },
          ],
        };
      }

      case "blob_delete": {
        if (!args || !Array.isArray(args.urls) || args.urls.length === 0) {
          throw new Error("urls is required and must be a non-empty array of strings");
        }

        await del(args.urls as string[], { token });

        return {
          content: [
            {
              type: "text",
              text: `Successfully deleted ${args.urls.length} file(s).`,
            },
          ],
        };
      }

      case "blob_copy": {
        if (!args || typeof args.fromUrl !== "string" || typeof args.toPathname !== "string") {
          throw new Error("fromUrl and toPathname are required strings");
        }

        const result = await copy(args.fromUrl, args.toPathname, {
          access: "public",
          token,
        });

        return {
          content: [
            {
              type: "text",
              text: [
                "File copied successfully!",
                `New URL: ${result.url}`,
                `New Pathname: ${result.pathname}`,
              ].join("\n"),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("vercel-blob-mcp running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
