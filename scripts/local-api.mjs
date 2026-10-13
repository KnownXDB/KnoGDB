import { createServer } from "node:http";
import { createApplication } from "../dist/src/api/application.js";
import { localOrigin } from "./local-services.mjs";

export async function startApi(configuration) {
  const handler = createApplication(
    { ...configuration, adminOrigin: localOrigin },
    "local",
  );
  const server = createServer(async (incoming, outgoing) => {
    try {
      if (incoming.headers.host !== "127.0.0.1:8788") {
        outgoing.writeHead(403);
        outgoing.end();
        return;
      }
      const path = new URL(incoming.url ?? "/", localOrigin);
      if (path.origin !== localOrigin) {
        outgoing.writeHead(403);
        outgoing.end();
        return;
      }
      const request = new Request(path, {
        method: incoming.method,
        headers: new Headers(
          Object.entries(incoming.headers).flatMap(([key, value]) =>
            typeof value === "string" ? [[key, value]] : [],
          ),
        ),
        ...(incoming.method === "POST"
          ? { body: incoming, duplex: "half" }
          : {}),
      });
      const response = await handler(request, incoming.socket.remoteAddress);
      const headers = new Headers(response.headers);
      const gateway = new URL(configuration.fileOrigin);
      const browserUrl = (value) => {
        const url = new URL(value);
        return url.origin === gateway.origin
          ? `${localOrigin}/asset-gateway${url.pathname}${url.search}`
          : value;
      };
      const location = headers.get("Location");
      if (location) headers.set("Location", browserUrl(location));
      let bytes;
      if (headers.get("Content-Type")?.startsWith("application/json")) {
        const data = await response.json();
        for (const field of ["upload_url", "preview_url"])
          if (typeof data[field] === "string")
            data[field] = browserUrl(data[field]);
        bytes = Buffer.from(JSON.stringify(data));
      } else bytes = Buffer.from(await response.arrayBuffer());
      outgoing.writeHead(response.status, Object.fromEntries(headers));
      outgoing.end(bytes);
    } catch {
      outgoing.writeHead(503, { "Content-Type": "application/json" });
      outgoing.end(JSON.stringify({ error: "service_unavailable" }));
    }
  });
  await new Promise((done, reject) => {
    server.once("error", reject);
    server.listen(8788, "127.0.0.1", done);
  });
  return server;
}
