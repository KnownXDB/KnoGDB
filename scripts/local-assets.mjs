import { Miniflare, Log, LogLevel } from "miniflare";
import { resolve } from "node:path";
import { localOrigin } from "./local-services.mjs";

export async function startAssets(
  publicKey,
  { persist = resolve(".local/r2"), port = 8789 } = {},
) {
  const worker = new Miniflare({
    scriptPath: resolve("dist/workers/assets/index.js"),
    modules: true,
    compatibilityDate: "2026-10-12",
    host: "127.0.0.1",
    port,
    cf: false,
    log: new Log(LogLevel.ERROR),
    r2Buckets: { ASSETS: "knowngdb-local" },
    r2Persist: persist,
    bindings: { GRANT_PUBLIC_KEY: publicKey, UPLOAD_ORIGINS: localOrigin },
  });
  await worker.ready;
  return worker;
}
