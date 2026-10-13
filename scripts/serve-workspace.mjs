import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { randomUUID, createHash } from "node:crypto";
import {
  validateAsset,
  assetMetadata,
  maxAssetBytes,
} from "../dist/src/domain/asset-policy.js";

const origin = "http://127.0.0.1:5173",
  root = resolve("public");
const games = [
  {
    id: randomUUID(),
    status: "draft",
    updated_at: new Date().toISOString(),
    localizations: [
      {
        language: "en",
        title: "Local sample title",
        is_primary: true,
        source_reference: "Local fixture",
        confidence: 1,
      },
    ],
  },
];
const assets = [],
  uploads = new Map();
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
};
async function body(request, limit) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw Error("invalid_request");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
function json(response, value, status = 200) {
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(value));
}

// Explicit loopback-only fixture mode: no credentials, remote adapters or persistence.
export async function startWorkspace() {
  const server = createServer(async (request, response) => {
    try {
      if (request.headers.host !== "127.0.0.1:8788") {
        json(response, { error: "invalid_origin" }, 403);
        return;
      }
      if (request.method !== "GET" && request.headers.origin !== origin) {
        json(response, { error: "invalid_origin" }, 403);
        return;
      }
      const url = new URL(request.url, origin),
        path = url.pathname;
      if (path.startsWith("/local-files/")) {
        const upload = uploads.get(path.split("/").pop());
        if (!upload) throw Error("upload_not_found");
        if (request.method === "PUT") {
          const bytes = await body(request, maxAssetBytes);
          if (
            bytes.length !== upload.metadata.byte_size ||
            createHash("sha256").update(bytes).digest("hex") !==
              upload.metadata.checksum_sha256
          )
            throw Error("invalid_asset");
          upload.bytes = bytes;
          json(response, { uploaded: true }, 201);
          return;
        }
        if (request.method !== "GET" || !upload.bytes)
          throw Error("upload_not_found");
        response.writeHead(200, {
          "Content-Type": upload.metadata.mime_type,
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        });
        response.end(upload.bytes);
        return;
      }
      if (path.startsWith("/admin/api/v1/admin/")) {
        const action = path.slice("/admin/api/v1/admin/".length),
          input =
            request.method === "POST"
              ? JSON.parse(await body(request, 32768))
              : {};
        if (["session", "login", "logout"].includes(action)) {
          json(response, { authenticated: true, local_fixture: true });
          return;
        }
        if (action === "games") {
          if (request.method === "GET") {
            json(response, { data: games });
            return;
          }
          let game = games.find((value) => value.id === input.id);
          if (!game) {
            game = { id: randomUUID(), localizations: [] };
            games.push(game);
          }
          game.status = input.status;
          game.updated_at = new Date().toISOString();
          const localization = {
            ...input,
            moderation_status: input.approved ? "approved" : "in_review",
          };
          const index = game.localizations.findIndex(
            (value) => value.language === input.language,
          );
          if (index < 0) game.localizations.push(localization);
          else game.localizations[index] = localization;
          json(response, game);
          return;
        }
        if (action === "assets") {
          json(response, {
            data: assets.filter(
              (value) => value.game_id === url.searchParams.get("game_id"),
            ),
          });
          return;
        }
        if (action === "assets/prepare") {
          const metadata = assetMetadata(input),
            id = randomUUID();
          uploads.set(id, { metadata });
          json(response, {
            id,
            upload_url: `/local-files/${id}`,
            upload_grant: "local-fixture",
          });
          return;
        }
        if (action === "assets/complete") {
          const upload = uploads.get(input.id);
          if (!upload?.bytes) throw Error("upload_not_found");
          const dimensions = await validateAsset(
            upload.bytes,
            upload.metadata.role,
            upload.metadata.mime_type,
          );
          if (!assets.some((value) => value.id === input.id))
            assets.push({
              ...upload.metadata,
              ...dimensions,
              id: input.id,
              moderation_status: "in_review",
              publication_status: "private",
            });
          json(response, { id: input.id });
          return;
        }
        if (action === "assets/preview") {
          json(response, {
            preview_url: `/local-files/${input.id}`,
            preview_grant: "local-fixture",
          });
          return;
        }
        if (action === "assets/review-batch") {
          if (input.publish && !input.rights_reference?.trim())
            throw Error("rights_required");
          for (const asset of assets)
            if (
              input.ids.includes(asset.id) &&
              asset.game_id === input.game_id
            ) {
              asset.moderation_status = input.decision;
              asset.publication_status = input.publish
                ? "published"
                : "private";
            }
          json(response, { ids: input.ids });
          return;
        }
        json(response, { error: "not_found" }, 404);
        return;
      }
      if (request.method !== "GET") {
        json(response, { error: "not_found" }, 404);
        return;
      }
      const target = resolve(
        root,
        `.${decodeURIComponent(path.endsWith("/") ? `${path}index.html` : path)}`,
      );
      if (!target.startsWith(root + sep)) {
        json(response, { error: "not_found" }, 404);
        return;
      }
      let content = await readFile(target);
      if (path === "/admin/" || path === "/admin/index.html")
        content = Buffer.from(
          content
            .toString()
            .replace(
              /<body[^>]*>/,
              '$&<div style="padding:12px;background:#6b4800;color:white;text-align:center">LOCAL WORKSPACE · Temporary data · No connection to hosted services · Reload after editing</div>',
            ),
        );
      response.writeHead(200, {
        "Content-Type": mime[extname(target)] ?? "application/octet-stream",
        "Cache-Control": "no-store",
      });
      response.end(content);
    } catch (error) {
      json(
        response,
        {
          error: [
            "invalid_asset",
            "invalid_request",
            "rights_required",
            "upload_not_found",
          ].includes(error.message)
            ? error.message
            : "local_error",
        },
        400,
      );
    }
  });
  await new Promise((done, reject) => {
    server.once("error", reject);
    server.listen(8788, "127.0.0.1", done);
  });
  return server;
}
